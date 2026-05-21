import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Post } from "@nestjs/common";
import { OrderStatus, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { IsString, IsUUID, MinLength } from "class-validator";
import { randomBytes } from "crypto";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { buildMoney, decimalToNumber } from "../../common/mappers";
import { AuditService } from "../audit/audit.module";
import { NotificationsService } from "../notifications/notifications.module";
import { PrismaService } from "../../database/prisma.service";
import { OrdersGateway } from "../../realtime/orders.gateway";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";

class CreateOrderDto {
  @IsUUID()
  addressId!: string;

  @IsUUID()
  branchId!: string;

  @IsUUID()
  cartId!: string;

  @IsString()
  @MinLength(8)
  idempotencyKey!: string;
}

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async create(userId: string, dto: CreateOrderDto) {
    const existing = await this.prisma.order.findFirst({
      where: {
        customerId: userId,
        clientRequestKey: dto.idempotencyKey,
      },
    });

    if (existing) {
      return this.findById(userId, existing.id);
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        id: dto.cartId,
        userId,
        status: "ACTIVE",
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException("Active cart with items is required");
    }

    const address = await this.prisma.userAddress.findFirst({
      where: { id: dto.addressId, userId },
    });

    if (!address) {
      throw new BadRequestException("Address not found");
    }

    const branch = await this.prisma.branch.findFirst({
      where: {
        id: dto.branchId,
        isActive: true,
        isAcceptingOrders: true,
      },
      include: { settings: true },
    });

    if (!branch) {
      throw new BadRequestException("Branch is unavailable");
    }

    const orderCode = this.generateOrderCode();
    const pickupToken = this.generatePickupToken();
    const expiryMinutes = branch.settings?.unpaidExpiryMinutes ?? 60;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60_000);

    const order = await this.prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          orderCode,
          clientRequestKey: dto.idempotencyKey,
          customerId: userId,
          addressId: address.id,
          branchId: branch.id,
          cartId: cart.id,
          status: OrderStatus.AWAITING_PAYMENT,
          subtotal: cart.subtotal,
          discountTotal: cart.discountTotal,
          grandTotal: cart.grandTotal,
          currency: cart.currency,
          paymentMethod: PaymentMethod.MANUAL_IN_BRANCH,
          paymentStatus: PaymentStatus.PENDING,
          expiresAt,
          statusHistory: {
            create: {
              status: OrderStatus.AWAITING_PAYMENT,
              note: "Order created and awaiting payment at branch",
            },
          },
          pickupCode: {
            create: {
              code: orderCode,
              token: pickupToken,
            },
          },
        },
        include: {
          branch: true,
          address: true,
          pickupCode: true,
          statusHistory: true,
        },
      });

      const modifierOptionIds = cart.items.flatMap((item) => {
        const selections = Array.isArray(item.selections) ? (item.selections as any[]) : [];
        return selections.flatMap((selection) => selection.optionIds ?? []);
      });

      const modifierOptions = modifierOptionIds.length
        ? await tx.modifierOption.findMany({
            where: { id: { in: modifierOptionIds } },
            include: { group: true },
          })
        : [];

      const optionMap = new Map(modifierOptions.map((option) => [option.id, option]));

      for (const item of cart.items) {
        const orderItem = await tx.orderItem.create({
          data: {
            orderId: created.id,
            productId: item.productId,
            variantId: item.variantId,
            productNameEn: item.product.nameEn,
            productNameAr: item.product.nameAr,
            variantNameEn: item.variant.nameEn,
            variantNameAr: item.variant.nameAr,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            notes: item.notes,
          },
        });

        const selections = Array.isArray(item.selections) ? (item.selections as any[]) : [];
        for (const selection of selections) {
          for (const optionId of selection.optionIds ?? []) {
            const option = optionMap.get(optionId);
            if (!option) continue;
            await tx.orderItemModifier.create({
              data: {
                orderItemId: orderItem.id,
                modifierGroupNameEn: option.group.nameEn,
                modifierGroupNameAr: option.group.nameAr,
                optionNameEn: option.nameEn,
                optionNameAr: option.nameAr,
                priceDelta: option.priceDelta,
              },
            });
          }
        }
      }

      await tx.cart.update({
        where: { id: cart.id },
        data: {
          status: "CONVERTED",
          branchId: branch.id,
        },
      });

      await tx.recentOrder.create({
        data: {
          customerId: userId,
          orderId: created.id,
        },
      });

      return created;
    });

    await this.notificationsService.createFromTemplate(userId, "order.created", order.id, {
      orderCode,
      status: "awaiting_payment",
    });
    await this.auditService.log(userId, "order.created", "order", order.id, { orderCode });
    this.ordersGateway.emitEvent("order.created", { orderId: order.id, orderCode });

    return this.findById(userId, order.id);
  }

  async list(userId: string) {
    const orders = await this.prisma.order.findMany({
      where: { customerId: userId },
      include: {
        branch: true,
        items: true,
        pickupCode: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return orders.map((order) => ({
      id: order.id,
      orderCode: order.orderCode,
      pickupToken: order.pickupCode?.token,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      total: buildMoney(order.grandTotal, order.currency),
      branchName: order.branch.nameEn,
      itemCount: order.items.reduce((sum, item) => sum + item.quantity, 0),
      expiresAt: order.expiresAt,
    }));
  }

  async findById(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        customerId: userId,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    return this.mapOrder(order);
  }

  async findByCodeForKitchen(orderCode: string, branchIds: string[]) {
    const order = await this.prisma.order.findFirst({
      where: {
        orderCode,
        branchId: branchIds.length ? { in: branchIds } : undefined,
      },
      include: this.orderInclude(),
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    return this.mapOrder(order);
  }

  private orderInclude() {
    return {
      branch: true,
      address: true,
      items: {
        include: {
          modifiers: true,
        },
      },
      pickupCode: true,
      statusHistory: {
        orderBy: { createdAt: "asc" as const },
      },
    };
  }

  private mapOrder(order: any) {
    return {
      id: order.id,
      orderCode: order.orderCode,
      pickupToken: order.pickupCode?.token,
      status: order.status.toLowerCase(),
      paymentStatus: order.paymentStatus.toLowerCase(),
      branch: {
        id: order.branch.id,
        code: order.branch.code,
        name: { en: order.branch.nameEn, ar: order.branch.nameAr },
        address: { en: order.branch.addressEn, ar: order.branch.addressAr },
        phone: order.branch.phone,
        timezone: order.branch.timezone,
        coordinates: { lat: order.branch.latitude, lng: order.branch.longitude },
        isActive: order.branch.isActive,
        isAcceptingOrders: order.branch.isAcceptingOrders,
        estimatedPrepMinutes: order.branch.estimatedPrepMinutes,
      },
      address: {
        id: order.address.id,
        label: order.address.customLabel || order.address.label.toLowerCase(),
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        emirate: order.address.emirate,
        notes: order.address.notes,
        coordinates: { lat: order.address.latitude, lng: order.address.longitude },
        isDefault: order.address.isDefault,
      },
      items: order.items.map((item: any) => ({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        notes: item.notes,
        selections: item.modifiers,
        unitPrice: buildMoney(item.unitPrice, order.currency),
        totalPrice: buildMoney(item.totalPrice, order.currency),
        name: item.productNameEn,
        variantName: item.variantNameEn,
      })),
      subtotal: buildMoney(order.subtotal, order.currency),
      discountTotal: buildMoney(order.discountTotal, order.currency),
      grandTotal: buildMoney(order.grandTotal, order.currency),
      expiresAt: order.expiresAt,
      timeline: order.statusHistory.map((event: any) => ({
        status: event.status.toLowerCase(),
        at: event.createdAt.toISOString(),
        note: event.note,
      })),
    };
  }

  private generateOrderCode() {
    return `AA${Math.floor(1000 + Math.random() * 9000)}`;
  }

  private generatePickupToken() {
    return randomBytes(8).toString("hex");
  }
}

@Controller("orders")
class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateOrderDto) {
    return this.ordersService.create(user.id, dto);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.ordersService.list(user.id);
  }

  @Get(":orderId")
  findById(@CurrentUser() user: AuthenticatedUser, @Param("orderId") orderId: string) {
    return this.ordersService.findById(user.id, orderId);
  }
}

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
