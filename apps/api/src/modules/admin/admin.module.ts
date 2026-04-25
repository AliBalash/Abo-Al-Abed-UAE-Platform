import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { AvailabilityStatus, OrderStatus, Prisma, ProductStatus, UserStatus } from "@prisma/client";
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
  MinLength,
} from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { Roles } from "../../common/roles.decorator";
import { AuditService } from "../audit/audit.module";
import { buildMoney, decimalToNumber } from "../../common/mappers";
import { PrismaService } from "../../database/prisma.service";
import { AuditModule } from "../audit/audit.module";

class UpdateAvailabilityDto {
  @IsUUID()
  branchId!: string;

  @IsUUID()
  productId!: string;

  @IsEnum(AvailabilityStatus)
  status!: AvailabilityStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

class SaveCategoryDto {
  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(2)
  titleEn!: string;

  @IsOptional()
  @IsString()
  titleAr?: string;

  @IsOptional()
  @IsString()
  descriptionEn?: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsInt()
  displayOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class SaveProductDto {
  @IsUUID()
  categoryId!: string;

  @IsOptional()
  @IsString()
  slug?: string;

  @IsString()
  @MinLength(2)
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsString()
  descriptionEn!: string;

  @IsOptional()
  @IsString()
  descriptionAr?: string;

  @IsOptional()
  @IsEnum(ProductStatus)
  status?: ProductStatus;

  @IsOptional()
  @IsBoolean()
  isFeatured?: boolean;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  tagsCsv?: string;
}

class SaveVariantDto {
  @IsOptional()
  @IsString()
  sku?: string;

  @IsString()
  @MinLength(1)
  nameEn!: string;

  @IsOptional()
  @IsString()
  nameAr?: string;

  @IsNumber()
  @Min(0)
  price!: number;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class UpdateBranchDto {
  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsString()
  addressEn?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isAcceptingOrders?: boolean;

  @IsOptional()
  @IsInt()
  estimatedPrepMinutes?: number;
}

class UpdateBannerDto {
  @IsOptional()
  @IsString()
  titleEn?: string;

  @IsOptional()
  @IsString()
  subtitleEn?: string;

  @IsOptional()
  @IsString()
  imageUrl?: string;

  @IsOptional()
  @IsString()
  ctaLabelEn?: string;

  @IsOptional()
  @IsString()
  ctaTarget?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@Injectable()
class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async overview() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [branches, products, categories, orders, users, banners, activeOrders, todayOrders] = await Promise.all([
      this.prisma.branch.count(),
      this.prisma.product.count({ where: { status: ProductStatus.ACTIVE } }),
      this.prisma.menuCategory.count({ where: { isActive: true } }),
      this.prisma.order.count(),
      this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      this.prisma.homeBanner.count({ where: { isActive: true } }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.AWAITING_PAYMENT, OrderStatus.PAID, OrderStatus.IN_PREPARATION, OrderStatus.READY_FOR_PICKUP] } },
      }),
      this.prisma.order.findMany({
        where: { createdAt: { gte: today } },
        select: { grandTotal: true },
      }),
    ]);

    return {
      branches,
      products,
      categories,
      orders,
      users,
      banners,
      activeOrders,
      todayRevenue: todayOrders.reduce((sum, order) => sum + decimalToNumber(order.grandTotal), 0),
      todayOrders: todayOrders.length,
    };
  }

  async branches() {
    return this.prisma.branch.findMany({
      include: {
        settings: true,
        _count: { select: { orders: true, productAvailability: true, staffAssignments: true } },
      },
      orderBy: { displayOrder: "asc" },
    });
  }

  async updateBranch(actor: AuthenticatedUser, branchId: string, dto: UpdateBranchDto) {
    const branch = await this.prisma.branch.update({
      where: { id: branchId },
      data: {
        nameEn: dto.nameEn,
        addressEn: dto.addressEn,
        phone: dto.phone,
        isActive: dto.isActive,
        isAcceptingOrders: dto.isAcceptingOrders,
        estimatedPrepMinutes: dto.estimatedPrepMinutes,
      },
    });
    await this.audit(actor, "branch.updated", "branch", branch.id, dto);
    return branch;
  }

  async categories() {
    return this.prisma.menuCategory.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: [{ displayOrder: "asc" }, { titleEn: "asc" }],
    });
  }

  async createCategory(actor: AuthenticatedUser, dto: SaveCategoryDto) {
    const category = await this.prisma.menuCategory.create({
      data: {
        slug: dto.slug || slugify(dto.titleEn),
        titleEn: dto.titleEn,
        titleAr: dto.titleAr || dto.titleEn,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr || dto.descriptionEn,
        displayOrder: dto.displayOrder ?? 0,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit(actor, "category.created", "menu_category", category.id, { slug: category.slug });
    return category;
  }

  async updateCategory(actor: AuthenticatedUser, categoryId: string, dto: Partial<SaveCategoryDto>) {
    const category = await this.prisma.menuCategory.update({
      where: { id: categoryId },
      data: {
        slug: dto.slug,
        titleEn: dto.titleEn,
        titleAr: dto.titleAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        displayOrder: dto.displayOrder,
        isActive: dto.isActive,
      },
    });
    await this.audit(actor, "category.updated", "menu_category", category.id, dto);
    return category;
  }

  async catalog(categoryId?: string, status?: ProductStatus | "ALL") {
    const products = await this.prisma.product.findMany({
      where: {
        categoryId: categoryId || undefined,
        status: status && status !== "ALL" ? status : undefined,
      },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        variants: { orderBy: [{ isDefault: "desc" }, { price: "asc" }] },
        branchAvailability: { include: { branch: true } },
        productTags: { include: { tag: true } },
        modifierLinks: { include: { modifierGroup: { include: { options: true } } } },
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { nameEn: "asc" }],
    });

    return products.map((product) => this.mapProduct(product));
  }

  async createProduct(actor: AuthenticatedUser, dto: SaveProductDto) {
    const product = await this.prisma.product.create({
      data: {
        categoryId: dto.categoryId,
        slug: dto.slug || slugify(dto.nameEn),
        nameEn: dto.nameEn,
        nameAr: dto.nameAr || dto.nameEn,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr || dto.descriptionEn,
        status: dto.status ?? ProductStatus.ACTIVE,
        isFeatured: dto.isFeatured ?? false,
        images: dto.imageUrl
          ? {
              create: {
                url: dto.imageUrl,
                altEn: dto.nameEn,
                altAr: dto.nameAr || dto.nameEn,
                isPrimary: true,
              },
            }
          : undefined,
        variants: {
          create: {
            sku: `${slugify(dto.nameEn).toUpperCase()}-REG-${Date.now()}`,
            nameEn: "Regular",
            nameAr: "Regular",
            price: new Prisma.Decimal(0),
            isDefault: true,
          },
        },
      },
      include: { category: true, images: true, variants: true, branchAvailability: true, productTags: { include: { tag: true } }, modifierLinks: true },
    });
    await this.syncTags(product.id, dto.tagsCsv);
    await this.audit(actor, "product.created", "product", product.id, { slug: product.slug });
    return this.productById(product.id);
  }

  async updateProduct(actor: AuthenticatedUser, productId: string, dto: Partial<SaveProductDto>) {
    await this.prisma.product.update({
      where: { id: productId },
      data: {
        categoryId: dto.categoryId,
        slug: dto.slug,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        descriptionEn: dto.descriptionEn,
        descriptionAr: dto.descriptionAr,
        status: dto.status,
        isFeatured: dto.isFeatured,
      },
    });

    if (dto.imageUrl !== undefined) {
      const image = await this.prisma.productImage.findFirst({ where: { productId, isPrimary: true } });
      if (image) {
        await this.prisma.productImage.update({ where: { id: image.id }, data: { url: dto.imageUrl } });
      } else if (dto.imageUrl) {
        await this.prisma.productImage.create({ data: { productId, url: dto.imageUrl, isPrimary: true } });
      }
    }

    if (dto.tagsCsv !== undefined) {
      await this.syncTags(productId, dto.tagsCsv);
    }

    await this.audit(actor, "product.updated", "product", productId, dto);
    return this.productById(productId);
  }

  async createVariant(actor: AuthenticatedUser, productId: string, dto: SaveVariantDto) {
    const variant = await this.prisma.productVariant.create({
      data: {
        productId,
        sku: dto.sku || `${productId.slice(0, 8).toUpperCase()}-${slugify(dto.nameEn).toUpperCase()}-${Date.now()}`,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr || dto.nameEn,
        price: new Prisma.Decimal(dto.price),
        isDefault: dto.isDefault ?? false,
        isActive: dto.isActive ?? true,
      },
    });
    await this.audit(actor, "product.variant.created", "product_variant", variant.id, { productId });
    return variant;
  }

  async updateVariant(actor: AuthenticatedUser, variantId: string, dto: Partial<SaveVariantDto>) {
    const variant = await this.prisma.productVariant.update({
      where: { id: variantId },
      data: {
        sku: dto.sku,
        nameEn: dto.nameEn,
        nameAr: dto.nameAr,
        price: dto.price === undefined ? undefined : new Prisma.Decimal(dto.price),
        isDefault: dto.isDefault,
        isActive: dto.isActive,
      },
    });
    await this.audit(actor, "product.variant.updated", "product_variant", variant.id, dto);
    return variant;
  }

  async banners() {
    return this.prisma.homeBanner.findMany({ orderBy: { displayOrder: "asc" } });
  }

  async updateBanner(actor: AuthenticatedUser, bannerId: string, dto: UpdateBannerDto) {
    const banner = await this.prisma.homeBanner.update({
      where: { id: bannerId },
      data: {
        titleEn: dto.titleEn,
        subtitleEn: dto.subtitleEn,
        imageUrl: dto.imageUrl,
        ctaLabelEn: dto.ctaLabelEn,
        ctaTarget: dto.ctaTarget,
        isActive: dto.isActive,
      },
    });
    await this.audit(actor, "banner.updated", "home_banner", banner.id, dto);
    return banner;
  }

  async orders(branchId?: string, status?: string) {
    const orders = await this.prisma.order.findMany({
      where: {
        branchId: branchId || undefined,
        status: status ? (status.toUpperCase() as OrderStatus) : undefined,
      },
      include: {
        branch: true,
        customer: { include: { customerProfile: true } },
        items: { include: { modifiers: true } },
        pickupCode: true,
        payments: true,
      },
      take: 150,
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      pickupToken: order.pickupCode?.token,
      status: order.status,
      paymentStatus: order.paymentStatus,
      branch: { id: order.branch.id, code: order.branch.code, nameEn: order.branch.nameEn },
      customer: {
        email: order.customer.email,
        name: [order.customer.customerProfile?.firstName, order.customer.customerProfile?.lastName].filter(Boolean).join(" "),
      },
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      items: order.items.map((item) => ({
        id: item.id,
        name: item.productNameEn,
        variantName: item.variantNameEn,
        quantity: item.quantity,
        notes: item.notes,
        modifiers: item.modifiers,
      })),
      grandTotal: buildMoney(order.grandTotal, order.currency),
      placedAt: order.placedAt,
      paidAt: order.paidAt,
      readyAt: order.readyAt,
      pickedUpAt: order.pickedUpAt,
      payments: order.payments,
    }));
  }

  async users() {
    return this.prisma.user.findMany({
      include: {
        customerProfile: true,
        staffProfile: { include: { primaryBranch: true } },
        roleAssignments: { include: { role: true, branch: true } },
        _count: { select: { orders: true, addresses: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
  }

  async auditLog() {
    return this.prisma.auditLog.findMany({
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 80,
    });
  }

  async updateAvailability(actor: AuthenticatedUser, dto: UpdateAvailabilityDto) {
    const availability = await this.prisma.branchProductAvailability.upsert({
      where: { branchId_productId: { branchId: dto.branchId, productId: dto.productId } },
      update: { status: dto.status, note: dto.note },
      create: { branchId: dto.branchId, productId: dto.productId, status: dto.status, note: dto.note },
    });

    await this.audit(actor, "branch.availability.updated", "branch_product_availability", availability.id, {
      branchId: dto.branchId,
      productId: dto.productId,
      status: dto.status,
    });

    return availability;
  }

  private async productById(productId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
        images: { orderBy: { displayOrder: "asc" } },
        variants: { orderBy: [{ isDefault: "desc" }, { price: "asc" }] },
        branchAvailability: { include: { branch: true } },
        productTags: { include: { tag: true } },
        modifierLinks: { include: { modifierGroup: { include: { options: true } } } },
      },
    });
    return product ? this.mapProduct(product) : null;
  }

  private mapProduct(product: any) {
    const primaryImage = product.images?.find((image: any) => image.isPrimary) ?? product.images?.[0];
    return {
      id: product.id,
      slug: product.slug,
      name: product.nameEn,
      nameAr: product.nameAr,
      description: product.descriptionEn,
      descriptionAr: product.descriptionAr,
      status: product.status,
      isFeatured: product.isFeatured,
      categoryId: product.categoryId,
      category: product.category?.titleEn,
      categorySlug: product.category?.slug,
      imageUrl: primaryImage?.url ? this.resolveAssetUrl(primaryImage.url) : null,
      tags: product.productTags?.map((link: any) => link.tag.labelEn) ?? [],
      variants: (product.variants ?? []).map((variant: any) => ({
        id: variant.id,
        sku: variant.sku,
        name: variant.nameEn,
        price: buildMoney(variant.price),
        isDefault: variant.isDefault,
        isActive: variant.isActive,
      })),
      variantCount: product.variants?.length ?? 0,
      basePrice: product.variants?.[0] ? buildMoney(product.variants[0].price) : null,
      pausedBranches: (product.branchAvailability ?? []).filter((availability: any) => availability.status !== AvailabilityStatus.AVAILABLE).length,
      availability: (product.branchAvailability ?? []).map((availability: any) => ({
        id: availability.id,
        branchId: availability.branchId,
        branchCode: availability.branch?.code,
        branchName: availability.branch?.nameEn,
        status: availability.status,
        note: availability.note,
      })),
      modifiers: (product.modifierLinks ?? []).map((link: any) => ({
        id: link.modifierGroup.id,
        name: link.modifierGroup.nameEn,
        minSelections: link.modifierGroup.minSelections,
        maxSelections: link.modifierGroup.maxSelections,
        options: link.modifierGroup.options?.map((option: any) => ({
          id: option.id,
          name: option.nameEn,
          priceDelta: buildMoney(option.priceDelta),
          isActive: option.isActive,
        })),
      })),
    };
  }

  private async syncTags(productId: string, tagsCsv?: string) {
    await this.prisma.productTagLink.deleteMany({ where: { productId } });
    const tags = (tagsCsv ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    for (const tag of tags) {
      const record = await this.prisma.productTag.upsert({
        where: { code: slugify(tag) },
        update: { labelEn: tag, labelAr: tag },
        create: { code: slugify(tag), labelEn: tag, labelAr: tag },
      });
      await this.prisma.productTagLink.create({ data: { productId, tagId: record.id } });
    }
  }

  private async audit(actor: AuthenticatedUser, action: string, entityType: string, entityId: string, metadata?: unknown) {
    await this.auditService.log(actor.id, action, entityType, entityId, metadata as any);
  }

  private resolveAssetUrl(url: string) {
    if (!url.startsWith("/")) {
      return url;
    }

    const baseURL = process.env.PUBLIC_ASSET_BASE_URL ?? `http://127.0.0.1:${process.env.PORT ?? 4000}`;
    return `${baseURL.replace(/\/$/, "")}${url}`;
  }
}

@Controller("admin")
class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Roles("super_admin", "ops_manager")
  @Get("overview")
  overview() {
    return this.adminService.overview();
  }

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Get("branches")
  branches() {
    return this.adminService.branches();
  }

  @Roles("super_admin", "ops_manager")
  @Patch("branches/:branchId")
  updateBranch(@CurrentUser() user: AuthenticatedUser, @Param("branchId") branchId: string, @Body() dto: UpdateBranchDto) {
    return this.adminService.updateBranch(user, branchId, dto);
  }

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Get("categories")
  categories() {
    return this.adminService.categories();
  }

  @Roles("super_admin", "ops_manager")
  @Post("categories")
  createCategory(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveCategoryDto) {
    return this.adminService.createCategory(user, dto);
  }

  @Roles("super_admin", "ops_manager")
  @Patch("categories/:categoryId")
  updateCategory(@CurrentUser() user: AuthenticatedUser, @Param("categoryId") categoryId: string, @Body() dto: SaveCategoryDto) {
    return this.adminService.updateCategory(user, categoryId, dto);
  }

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Get("catalog")
  catalog(@Query("categoryId") categoryId?: string, @Query("status") status?: ProductStatus | "ALL") {
    return this.adminService.catalog(categoryId, status);
  }

  @Roles("super_admin", "ops_manager")
  @Post("products")
  createProduct(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveProductDto) {
    return this.adminService.createProduct(user, dto);
  }

  @Roles("super_admin", "ops_manager")
  @Patch("products/:productId")
  updateProduct(@CurrentUser() user: AuthenticatedUser, @Param("productId") productId: string, @Body() dto: SaveProductDto) {
    return this.adminService.updateProduct(user, productId, dto);
  }

  @Roles("super_admin", "ops_manager")
  @Post("products/:productId/variants")
  createVariant(@CurrentUser() user: AuthenticatedUser, @Param("productId") productId: string, @Body() dto: SaveVariantDto) {
    return this.adminService.createVariant(user, productId, dto);
  }

  @Roles("super_admin", "ops_manager")
  @Patch("variants/:variantId")
  updateVariant(@CurrentUser() user: AuthenticatedUser, @Param("variantId") variantId: string, @Body() dto: SaveVariantDto) {
    return this.adminService.updateVariant(user, variantId, dto);
  }

  @Roles("super_admin", "ops_manager")
  @Get("banners")
  banners() {
    return this.adminService.banners();
  }

  @Roles("super_admin", "ops_manager")
  @Patch("banners/:bannerId")
  updateBanner(@CurrentUser() user: AuthenticatedUser, @Param("bannerId") bannerId: string, @Body() dto: UpdateBannerDto) {
    return this.adminService.updateBanner(user, bannerId, dto);
  }

  @Roles("super_admin", "ops_manager", "branch_manager", "support_readonly")
  @Get("orders")
  orders(@Query("branchId") branchId?: string, @Query("status") status?: string) {
    return this.adminService.orders(branchId, status);
  }

  @Roles("super_admin", "ops_manager")
  @Get("users")
  users() {
    return this.adminService.users();
  }

  @Roles("super_admin", "ops_manager")
  @Get("audit")
  auditLog() {
    return this.adminService.auditLog();
  }

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Patch("availability")
  updateAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvailabilityDto) {
    return this.adminService.updateAvailability(user, dto);
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
