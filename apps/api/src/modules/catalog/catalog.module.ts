import { Controller, Delete, Get, Injectable, Module, Param, Post, Query, Req } from "@nestjs/common";
import { ProductStatus } from "@prisma/client";
import type { Request } from "express";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { buildMoney, decimalToNumber } from "../../common/mappers";
import { Public } from "../../common/public.decorator";
import { publicAssetBaseUrlFromRequest, resolvePublicAssetUrl } from "../../common/public-asset-url";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async home(userId?: string, assetBaseUrl?: string) {
    const [banners, categories, featuredProducts, announcement] = await Promise.all([
      this.prisma.homeBanner.findMany({
        where: {
          isActive: true,
          theme: { in: ["top_strip", "bottom_feature"] },
        },
        orderBy: { displayOrder: "asc" },
      }),
      this.prisma.menuCategory.findMany({
        where: { isActive: true },
        orderBy: { displayOrder: "asc" },
      }),
      this.prisma.product.findMany({
        where: { isFeatured: true, status: ProductStatus.ACTIVE },
        include: this.productInclude(),
        take: 6,
      }),
      this.prisma.inAppAnnouncement.findFirst({
        where: { isActive: true },
        orderBy: { startsAt: "desc" },
      }),
    ]);

    const favorites = userId ? await this.listFavorites(userId, assetBaseUrl) : [];

    return {
      banners: banners.map((banner) => ({
        id: banner.id,
        title: { en: banner.titleEn, ar: banner.titleAr },
        subtitle: { en: banner.subtitleEn, ar: banner.subtitleAr },
        imageUrl: resolvePublicAssetUrl(banner.imageUrl, assetBaseUrl),
        ctaLabel: { en: banner.ctaLabelEn, ar: banner.ctaLabelAr },
        ctaTarget: banner.ctaTarget,
        theme: banner.theme,
        displayOrder: banner.displayOrder,
      })),
      categories: categories.map((category) => ({
        id: category.id,
        slug: category.slug,
        title: { en: category.titleEn, ar: category.titleAr },
        description: {
          en: category.descriptionEn ?? "",
          ar: category.descriptionAr ?? "",
        },
        displayOrder: category.displayOrder,
      })),
      featuredProducts: featuredProducts.map((product) => this.mapProduct(product, assetBaseUrl)),
      favorites,
      announcement: announcement
        ? {
            title: { en: announcement.titleEn, ar: announcement.titleAr },
            body: { en: announcement.bodyEn, ar: announcement.bodyAr },
          }
        : null,
    };
  }

  async categories() {
    return this.prisma.menuCategory.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  async products(search?: string, category?: string, assetBaseUrl?: string) {
    const products = await this.prisma.product.findMany({
      where: {
        status: ProductStatus.ACTIVE,
        category: category ? { slug: category } : undefined,
        OR: search
          ? [
              { nameEn: { contains: search, mode: "insensitive" } },
              { descriptionEn: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      include: this.productInclude(),
      orderBy: { nameEn: "asc" },
    });

    return products.map((product) => this.mapProduct(product, assetBaseUrl));
  }

  async product(slug: string, assetBaseUrl?: string) {
    const product = await this.prisma.product.findUniqueOrThrow({
      where: { slug },
      include: this.productInclude(),
    });

    return this.mapProduct(product, assetBaseUrl);
  }

  async listFavorites(userId: string, assetBaseUrl?: string) {
    const favorites = await this.prisma.favorite.findMany({
      where: { customerId: userId },
      include: {
        product: {
          include: this.productInclude(),
        },
      },
    });

    return favorites.map((favorite) => this.mapProduct(favorite.product, assetBaseUrl));
  }

  async favorite(userId: string, productId: string) {
    await this.prisma.favorite.upsert({
      where: {
        customerId_productId: {
          customerId: userId,
          productId,
        },
      },
      update: {},
      create: {
        customerId: userId,
        productId,
      },
    });

    return { ok: true };
  }

  async unfavorite(userId: string, productId: string) {
    await this.prisma.favorite.deleteMany({
      where: {
        customerId: userId,
        productId,
      },
    });

    return { ok: true };
  }

  async reorderSuggestions(userId: string) {
    const recent = await this.prisma.recentOrder.findMany({
      where: { customerId: userId },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    if (!recent.length) {
      return [];
    }

    const orders = await this.prisma.order.findMany({
      where: {
        id: { in: recent.map((entry) => entry.orderId) },
      },
      include: {
        items: true,
        branch: true,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      status: order.status.toLowerCase(),
      branchName: order.branch.nameEn,
      total: buildMoney(order.grandTotal, order.currency),
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
    }));
  }

  private productInclude() {
    return {
      category: true,
      images: {
        orderBy: { displayOrder: "asc" as const },
      },
      variants: {
        where: { isActive: true },
        orderBy: { price: "asc" as const },
      },
      modifierLinks: {
        orderBy: { displayOrder: "asc" as const },
        include: {
          modifierGroup: {
            include: {
              options: {
                where: { isActive: true },
                orderBy: { displayOrder: "asc" as const },
              },
            },
          },
        },
      },
      productTags: {
        include: { tag: true },
      },
    };
  }

  private mapProduct(product: any, assetBaseUrl?: string) {
    return {
      id: product.id,
      slug: product.slug,
      name: { en: product.nameEn, ar: product.nameAr },
      description: { en: product.descriptionEn, ar: product.descriptionAr },
      categorySlug: product.category.slug,
      heroImageUrl: resolvePublicAssetUrl(product.images[0]?.url ?? "", assetBaseUrl),
      tags: product.productTags.map((tagLink: any) => tagLink.tag.code),
      isFeatured: product.isFeatured,
      variants: product.variants.map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        name: { en: variant.nameEn, ar: variant.nameAr },
        price: buildMoney(variant.price),
        compareAtPrice: variant.compareAtPrice ? buildMoney(variant.compareAtPrice) : undefined,
      })),
      modifierGroups: product.modifierLinks.map((link: any) => ({
        id: link.modifierGroup.id,
        name: { en: link.modifierGroup.nameEn, ar: link.modifierGroup.nameAr },
        minSelections: link.modifierGroup.minSelections,
        maxSelections: link.modifierGroup.maxSelections,
        options: link.modifierGroup.options.map((option: any) => ({
          id: option.id,
          name: { en: option.nameEn, ar: option.nameAr },
          priceDelta: decimalToNumber(option.priceDelta),
          isDefault: option.isDefault,
        })),
      })),
    };
  }

}

@Controller("catalog")
class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Public()
  @Get("home")
  home(@CurrentUser() user: AuthenticatedUser | undefined, @Req() request: Request) {
    return this.catalogService.home(user?.id, publicAssetBaseUrlFromRequest(request));
  }

  @Public()
  @Get("categories")
  categories() {
    return this.catalogService.categories();
  }

  @Public()
  @Get("products")
  products(@Query("search") search: string | undefined, @Query("category") category: string | undefined, @Req() request: Request) {
    return this.catalogService.products(search, category, publicAssetBaseUrlFromRequest(request));
  }

  @Public()
  @Get("products/:slug")
  product(@Param("slug") slug: string, @Req() request: Request) {
    return this.catalogService.product(slug, publicAssetBaseUrlFromRequest(request));
  }

  @Get("favorites")
  favorites(@CurrentUser() user: AuthenticatedUser, @Req() request: Request) {
    return this.catalogService.listFavorites(user.id, publicAssetBaseUrlFromRequest(request));
  }

  @Post("favorites/:productId")
  favorite(@CurrentUser() user: AuthenticatedUser, @Param("productId") productId: string) {
    return this.catalogService.favorite(user.id, productId);
  }

  @Delete("favorites/:productId")
  unfavorite(@CurrentUser() user: AuthenticatedUser, @Param("productId") productId: string) {
    return this.catalogService.unfavorite(user.id, productId);
  }

  @Get("reorder")
  reorder(@CurrentUser() user: AuthenticatedUser) {
    return this.catalogService.reorderSuggestions(user.id);
  }
}

@Module({
  controllers: [CatalogController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
