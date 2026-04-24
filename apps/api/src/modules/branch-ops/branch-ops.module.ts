import { BadRequestException, Body, Controller, Get, Injectable, Module, Param, Patch, Query } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { assertOrderTransition } from "../../common/order-status";
import { Roles } from "../../common/roles.decorator";
import { AuditService } from "../audit/audit.module";
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

@Injectable()
class BranchOpsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly ordersGateway: OrdersGateway,
    private readonly ordersService: OrdersService,
  ) {}

  async queue(user: AuthenticatedUser, branchId?: string) {
    const resolvedBranchId = branchId ?? user.branchIds[0];

    if (!resolvedBranchId) {
      throw new BadRequestException("Branch context is required");
    }

    const orders = await this.prisma.order.findMany({
      where: { branchId: resolvedBranchId },
      include: {
        branch: true,
        items: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      awaitingPayment: orders.filter((order) => order.status === OrderStatus.AWAITING_PAYMENT),
      paid: orders.filter((order) => order.status === OrderStatus.PAID),
      inPreparation: orders.filter((order) => order.status === OrderStatus.IN_PREPARATION),
      ready: orders.filter((order) => order.status === OrderStatus.READY_FOR_PICKUP),
      pickedUp: orders.filter((order) => order.status === OrderStatus.PICKED_UP).slice(-10),
    };
  }

  async lookup(user: AuthenticatedUser, orderCode: string) {
    return this.ordersService.findByCodeForOps(orderCode, user.branchIds);
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
}

@Controller("branch-ops")
class BranchOpsController {
  constructor(private readonly branchOpsService: BranchOpsService) {}

  @Roles("cashier", "branch_manager", "kitchen_staff", "ops_manager", "super_admin")
  @Get("queue")
  queue(@CurrentUser() user: AuthenticatedUser, @Query("branchId") branchId?: string) {
    return this.branchOpsService.queue(user, branchId);
  }

  @Roles("cashier", "branch_manager", "ops_manager", "super_admin")
  @Get("lookup")
  lookup(@CurrentUser() user: AuthenticatedUser, @Query("orderCode") orderCode: string) {
    return this.branchOpsService.lookup(user, orderCode);
  }

  @Roles("kitchen_staff", "branch_manager", "ops_manager", "super_admin")
  @Patch("orders/:orderId/status")
  updateStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("orderId") orderId: string,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.branchOpsService.updateStatus(user, orderId, dto);
  }
}

@Module({
  imports: [NotificationsModule, AuditModule, OrdersModule],
  controllers: [BranchOpsController],
  providers: [BranchOpsService],
})
export class BranchOpsModule {}
