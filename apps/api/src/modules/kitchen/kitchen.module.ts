import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Query } from "@nestjs/common";
import { AvailabilityStatus, OrderStatus, ProductStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { assertOrderTransition } from "../../common/order-status";
import { Roles } from "../../common/roles.decorator";
import { AuditService } from "../audit/audit.module";
import { buildMoney } from "../../common/mappers";
import { NotificationsService } from "../notifications/notifications.module";
import { OrdersService } from "../orders/orders.module";
import { PrismaService } from "../../database/prisma.service";
import { OrdersGateway } from "../../realtime/orders.gateway";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { OrdersModule } from "../orders/orders.module";

class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

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

@Injectable()
class KitchenService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly ordersGateway: OrdersGateway,
    private readonly ordersService: OrdersService,
  ) {}

  async queue(user: AuthenticatedUser, branchId?: string) {
    const resolvedBranchId = this.resolveBranchContext(user, branchId);

    const [branch, orders] = await Promise.all([
      this.prisma.branch.findUnique({ where: { id: resolvedBranchId } }),
      this.prisma.order.findMany({
      where: {
        branchId: resolvedBranchId,
        status: {
          in: [
            OrderStatus.AWAITING_PAYMENT,
            OrderStatus.PAID,
            OrderStatus.IN_PREPARATION,
            OrderStatus.READY_FOR_PICKUP,
            OrderStatus.PICKED_UP,
          ],
        },
      },
      include: {
        branch: true,
        customer: { include: { customerProfile: true } },
        address: true,
        items: { include: { modifiers: true } },
        pickupCode: true,
      },
      orderBy: { createdAt: "asc" },
      }),
    ]);

    const mappedOrders = orders.map((order) => this.mapQueueOrder(order));

    return {
      branch: {
        id: branch?.id ?? resolvedBranchId,
        code: branch?.code,
        nameEn: branch?.nameEn,
      },
      awaitingPayment: mappedOrders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT),
      paid: mappedOrders.filter((order) => order.status === OrderStatus.PAID),
      inPreparation: mappedOrders.filter((order) => order.status === OrderStatus.IN_PREPARATION),
      ready: mappedOrders.filter((order) => order.status === OrderStatus.READY_FOR_PICKUP),
      pickedUp: mappedOrders.filter((order) => order.status === OrderStatus.PICKED_UP).slice(-10),
    };
  }

  async lookup(user: AuthenticatedUser, orderCode: string) {
    return this.ordersService.findByCodeForKitchen(orderCode, user.branchIds);
  }

  async updateStatus(user: AuthenticatedUser, orderId: string, dto: UpdateOrderStatusDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    assertOrderTransition(order.status, dto.status);

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: dto.status,
          readyAt: dto.status === OrderStatus.READY_FOR_PICKUP ? new Date() : undefined,
          pickedUpAt: dto.status === OrderStatus.PICKED_UP ? new Date() : undefined,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          status: dto.status,
          actorUserId: user.id,
          note: dto.note,
        },
      });
    });

    const notificationEvent =
      dto.status === OrderStatus.IN_PREPARATION
        ? "order.in_preparation"
        : dto.status === OrderStatus.READY_FOR_PICKUP
          ? "order.ready"
          : dto.status === OrderStatus.CANCELLED || dto.status === OrderStatus.EXPIRED
            ? "order.cancelled"
            : null;

    if (notificationEvent) {
      await this.notificationsService.createFromTemplate(order.customerId, notificationEvent, order.id, {
        status: dto.status.toLowerCase(),
      });
    }

    await this.auditService.log(user.id, "order.status.updated", "order", orderId, {
      nextStatus: dto.status,
    });

    const eventName =
      dto.status === OrderStatus.IN_PREPARATION
        ? "order.prep_started"
        : dto.status === OrderStatus.READY_FOR_PICKUP
          ? "order.ready"
          : dto.status === OrderStatus.PICKED_UP
            ? "order.picked_up"
            : "order.cancelled";

    this.ordersGateway.emitEvent(eventName, { orderId, status: dto.status.toLowerCase() });

    return { ok: true };
  }

  async availability(user: AuthenticatedUser, branchId?: string) {
    const resolvedBranchId = this.resolveBranchContext(user, branchId);

    const products = await this.prisma.product.findMany({
      where: { status: ProductStatus.ACTIVE },
      include: {
        category: true,
        variants: { orderBy: [{ isDefault: "desc" }, { price: "asc" }] },
        branchAvailability: {
          where: { branchId: resolvedBranchId },
          take: 1,
        },
      },
      orderBy: [{ category: { displayOrder: "asc" } }, { nameEn: "asc" }],
    });

    return products.map((product) => {
      const entry = product.branchAvailability[0];
      return {
        productId: product.id,
        productName: product.nameEn,
        categoryName: product.category?.titleEn ?? "Uncategorized",
        status: entry?.status ?? AvailabilityStatus.AVAILABLE,
        note: entry?.note ?? null,
        basePrice: product.variants[0] ? buildMoney(product.variants[0].price) : null,
      };
    });
  }

  async updateAvailability(user: AuthenticatedUser, dto: UpdateAvailabilityDto) {
    this.resolveBranchContext(user, dto.branchId);

    const availability = await this.prisma.branchProductAvailability.upsert({
      where: { branchId_productId: { branchId: dto.branchId, productId: dto.productId } },
      update: { status: dto.status, note: dto.note },
      create: { branchId: dto.branchId, productId: dto.productId, status: dto.status, note: dto.note },
    });

    await this.auditService.log(user.id, "kitchen.availability.updated", "branch_product_availability", availability.id, {
      branchId: dto.branchId,
      productId: dto.productId,
      status: dto.status,
    });

    return availability;
  }

  private mapQueueOrder(order: any) {
    const customerName = [order.customer?.customerProfile?.firstName, order.customer?.customerProfile?.lastName].filter(Boolean).join(" ");

    return {
      id: order.id,
      orderCode: order.orderCode,
      pickupToken: order.pickupCode?.token,
      status: order.status,
      paymentStatus: order.paymentStatus,
      customer: customerName || order.customer?.email || "Guest",
      branchName: order.branch.nameEn,
      placedAt: order.placedAt,
      paidAt: order.paidAt,
      readyAt: order.readyAt,
      expiresAt: order.expiresAt,
      total: buildMoney(order.grandTotal, order.currency),
      grandTotal: buildMoney(order.grandTotal, order.currency),
      itemCount: order.items.reduce((sum: number, item: any) => sum + item.quantity, 0),
      address: {
        label: order.address.customLabel || order.address.label?.toLowerCase(),
        line1: order.address.line1,
        line2: order.address.line2,
        city: order.address.city,
        emirate: order.address.emirate,
        notes: order.address.notes,
      },
      items: order.items.map((item: any) => ({
        id: item.id,
        name: item.productNameEn,
        variantName: item.variantNameEn,
        quantity: item.quantity,
        notes: item.notes,
        unitPrice: buildMoney(item.unitPrice, order.currency),
        totalPrice: buildMoney(item.totalPrice, order.currency),
        modifiers: item.modifiers.map((modifier: any) => ({
          group: modifier.modifierGroupNameEn,
          option: modifier.optionNameEn,
          priceDelta: buildMoney(modifier.priceDelta, order.currency),
        })),
      })),
    };
  }

  private resolveBranchContext(user: AuthenticatedUser, requestedBranchId?: string) {
    const privileged = user.roles.includes("super_admin") || user.roles.includes("kitchen_manager");

    if (requestedBranchId) {
      if (privileged || user.branchIds.includes(requestedBranchId)) {
        return requestedBranchId;
      }
      throw new BadRequestException("You do not have access to this branch");
    }

    if (user.branchIds[0]) {
      return user.branchIds[0];
    }

    throw new BadRequestException("Branch context is required");
  }
}

@Controller("kitchen")
class KitchenController {
  constructor(private readonly kitchenService: KitchenService) {}

  @Roles("cashier", "branch_manager", "kitchen_staff", "kitchen_manager", "super_admin")
  @Get("queue")
  queue(@CurrentUser() user: AuthenticatedUser, @Query("branchId") branchId?: string) {
    return this.kitchenService.queue(user, branchId);
  }

  @Roles("cashier", "branch_manager", "kitchen_manager", "super_admin")
  @Get("lookup")
  lookup(@CurrentUser() user: AuthenticatedUser, @Query("orderCode") orderCode: string) {
    return this.kitchenService.lookup(user, orderCode);
  }

  @Roles("kitchen_staff", "branch_manager", "kitchen_manager", "super_admin")
  @Patch("orders/:orderId/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.kitchenService.updateStatus(user, orderId, dto);
  }

  @Roles("cashier", "kitchen_staff", "branch_manager", "kitchen_manager", "super_admin")
  @Get("availability")
  availability(@CurrentUser() user: AuthenticatedUser, @Query("branchId") branchId?: string) {
    return this.kitchenService.availability(user, branchId);
  }

  @Roles("kitchen_staff", "branch_manager", "kitchen_manager", "super_admin")
  @Patch("availability")
  updateAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvailabilityDto) {
    return this.kitchenService.updateAvailability(user, dto);
  }
}

@Module({
  imports: [NotificationsModule, AuditModule, OrdersModule],
  controllers: [KitchenController],
  providers: [KitchenService],
})
export class KitchenModule {}
