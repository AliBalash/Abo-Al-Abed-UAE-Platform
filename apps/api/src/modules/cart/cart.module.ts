import { BadRequestException, Body, Controller, Delete, Get, Injectable, Module, Param, Patch, Post } from "@nestjs/common";
import { CartStatus, Prisma } from "@prisma/client";
import { IsArray, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { buildMoney, decimalToNumber } from "../../common/mappers";
import { PrismaService } from "../../database/prisma.service";

class CartSelectionDto {
  @IsUUID()
  modifierGroupId!: string;

  @IsArray()
  optionIds!: string[];
}

class UpsertCartItemDto {
  @IsUUID()
  productId!: string;

  @IsUUID()
  variantId!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  notes?: string;

  @IsArray()
  selections!: CartSelectionDto[];
}

class SetBranchDto {
  @IsUUID()
  branchId!: string;
}

function serializeSelections(selections: CartSelectionDto[]): Prisma.InputJsonValue {
  return selections.map((selection) => ({
    modifierGroupId: selection.modifierGroupId,
    optionIds: selection.optionIds,
  })) as unknown as Prisma.InputJsonValue;
}

@Injectable()
class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async getActiveCart(userId: string) {
    const cart = await this.ensureActiveCart(userId);
    return this.buildCart(cart.id);
  }

  async addItem(userId: string, dto: UpsertCartItemDto) {
    const cart = await this.ensureActiveCart(userId);
    const pricing = await this.calculatePricing(dto.variantId, dto.quantity, dto.selections);

    await this.prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        notes: dto.notes,
        selections: serializeSelections(dto.selections),
        unitPrice: new Prisma.Decimal(pricing.unitPrice),
        totalPrice: new Prisma.Decimal(pricing.totalPrice),
      },
    });

    await this.refreshCartTotals(cart.id);
    return this.buildCart(cart.id);
  }

  async updateItem(userId: string, itemId: string, dto: UpsertCartItemDto) {
    const cart = await this.ensureActiveCart(userId);
    const item = await this.prisma.cartItem.findFirst({
      where: {
        id: itemId,
        cartId: cart.id,
      },
    });

    if (!item) {
      throw new BadRequestException("Cart item not found");
    }

    const pricing = await this.calculatePricing(dto.variantId, dto.quantity, dto.selections);

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: {
        productId: dto.productId,
        variantId: dto.variantId,
        quantity: dto.quantity,
        notes: dto.notes,
        selections: serializeSelections(dto.selections),
        unitPrice: new Prisma.Decimal(pricing.unitPrice),
        totalPrice: new Prisma.Decimal(pricing.totalPrice),
      },
    });

    await this.refreshCartTotals(cart.id);
    return this.buildCart(cart.id);
  }

  async removeItem(userId: string, itemId: string) {
    const cart = await this.ensureActiveCart(userId);

    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });

    await this.refreshCartTotals(cart.id);
    return this.buildCart(cart.id);
  }

  async setBranch(userId: string, branchId: string) {
    const cart = await this.ensureActiveCart(userId);
    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { branchId },
    });
    return this.buildCart(cart.id);
  }

  private async ensureActiveCart(userId: string) {
    const existing = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: CartStatus.ACTIVE,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (existing) {
      return existing;
    }

    return this.prisma.cart.create({
      data: {
        userId,
        currency: "AED",
      },
    });
  }

  private async calculatePricing(variantId: string, quantity: number, selections: CartSelectionDto[]) {
    const variant = await this.prisma.productVariant.findUnique({
      where: { id: variantId },
    });

    if (!variant) {
      throw new BadRequestException("Variant not found");
    }

    const optionIds = selections.flatMap((selection) => selection.optionIds);
    const options = optionIds.length
      ? await this.prisma.modifierOption.findMany({
          where: { id: { in: optionIds } },
        })
      : [];

    const unitPrice =
      decimalToNumber(variant.price) + options.reduce((sum, option) => sum + decimalToNumber(option.priceDelta), 0);

    return {
      unitPrice,
      totalPrice: unitPrice * quantity,
    };
  }

  private async refreshCartTotals(cartId: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { cartId },
    });

    const subtotal = items.reduce((sum, item) => sum + decimalToNumber(item.totalPrice), 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: {
        subtotal: new Prisma.Decimal(subtotal),
        discountTotal: new Prisma.Decimal(0),
        grandTotal: new Prisma.Decimal(subtotal),
      },
    });
  }

  private async buildCart(cartId: string) {
    const cart = await this.prisma.cart.findUniqueOrThrow({
      where: { id: cartId },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return {
      id: cart.id,
      branchId: cart.branchId,
      items: cart.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        notes: item.notes,
        selections: item.selections,
        unitPrice: buildMoney(item.unitPrice, cart.currency),
        totalPrice: buildMoney(item.totalPrice, cart.currency),
        name: item.product.nameEn,
        variantName: item.variant.nameEn,
      })),
      subtotal: buildMoney(cart.subtotal, cart.currency),
      discountTotal: buildMoney(cart.discountTotal, cart.currency),
      grandTotal: buildMoney(cart.grandTotal, cart.currency),
    };
  }
}

@Controller("cart")
class CartController {
  constructor(private readonly cartService: CartService) {}

  @Get("active")
  active(@CurrentUser() user: AuthenticatedUser) {
    return this.cartService.getActiveCart(user.id);
  }

  @Post("items")
  addItem(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpsertCartItemDto) {
    return this.cartService.addItem(user.id, dto);
  }

  @Patch("items/:itemId")
  updateItem(@CurrentUser() user: AuthenticatedUser, @Param("itemId") itemId: string, @Body() dto: UpsertCartItemDto) {
    return this.cartService.updateItem(user.id, itemId, dto);
  }

  @Delete("items/:itemId")
  removeItem(@CurrentUser() user: AuthenticatedUser, @Param("itemId") itemId: string) {
    return this.cartService.removeItem(user.id, itemId);
  }

  @Post("branch")
  setBranch(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetBranchDto) {
    return this.cartService.setBranch(user.id, dto.branchId);
  }
}

@Module({
  controllers: [CartController],
  providers: [CartService],
  exports: [CartService],
})
export class CartModule {}
