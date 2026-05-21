import { BadRequestException, Body, Controller, Injectable, Module, Post } from "@nestjs/common";
import { OrderStatus, PaymentStatus, Prisma } from "@prisma/client";
import { IsNumber, IsString, IsUUID, Min } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { Roles } from "../../common/roles.decorator";
import { AuditService } from "../audit/audit.module";
import { NotificationsService } from "../notifications/notifications.module";
import { PrismaService } from "../../database/prisma.service";
import { OrdersGateway } from "../../realtime/orders.gateway";
import { AuditModule } from "../audit/audit.module";
import { NotificationsModule } from "../notifications/notifications.module";

class ConfirmPaymentDto {
  @IsUUID()
  orderId!: string;

  @IsNumber()
  @Min(0)
  amount!: number;

  @IsString()
  providerReference!: string;
}

@Injectable()
class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
    private readonly auditService: AuditService,
    private readonly ordersGateway: OrdersGateway,
  ) {}

  async confirmPayment(staff: AuthenticatedUser, dto: ConfirmPaymentDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });

    if (!order) {
      throw new BadRequestException("Order not found");
    }

    if (order.paymentStatus === PaymentStatus.CONFIRMED) {
      return { ok: true, status: "already_confirmed" };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.paymentRecord.create({
        data: {
          orderId: dto.orderId,
          providerType: "manual_in_branch",
          providerReference: dto.providerReference,
          amount: new Prisma.Decimal(dto.amount),
          status: PaymentStatus.CONFIRMED,
          confirmedByStaffId: staff.id,
          confirmedAt: new Date(),
        },
      });

      await tx.order.update({
        where: { id: dto.orderId },
        data: {
          paymentStatus: PaymentStatus.CONFIRMED,
          status: OrderStatus.PAID,
          paidAt: new Date(),
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: dto.orderId,
          status: OrderStatus.PAID,
          actorUserId: staff.id,
          note: "Payment confirmed at branch",
        },
      });
    });

    await this.notificationsService.createFromTemplate(order.customerId, "order.payment_confirmed", order.id, {
      amount: dto.amount,
    });
    await this.auditService.log(staff.id, "payment.confirmed", "order", order.id, {
      providerReference: dto.providerReference,
      amount: dto.amount,
    });
    this.ordersGateway.emitEvent("order.payment_confirmed", {
      orderId: order.id,
      status: "paid",
    });

    return { ok: true, status: "confirmed" };
  }
}

@Controller("payments")
class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Roles("cashier", "branch_manager", "kitchen_manager", "super_admin")
  @Post("confirm")
  confirm(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmPaymentDto) {
    return this.paymentsService.confirmPayment(user, dto);
  }
}

@Module({
  imports: [NotificationsModule, AuditModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}
