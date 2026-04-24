import { Controller, Get, Injectable, Module, Query } from "@nestjs/common";
import { OrderStatus } from "@prisma/client";

import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(branchId?: string) {
    const where = branchId ? { branchId } : {};
    const [totalOrders, readyOrders, paidOrders, awaitingPayment, revenueResult] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.READY_FOR_PICKUP } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.PAID } }),
      this.prisma.order.count({ where: { ...where, status: OrderStatus.AWAITING_PAYMENT } }),
      this.prisma.order.aggregate({
        where,
        _sum: { grandTotal: true },
      }),
    ]);

    return {
      totalOrders,
      readyOrders,
      paidOrders,
      awaitingPayment,
      revenueAed: Number(revenueResult._sum.grandTotal ?? 0),
    };
  }
}

@Controller("reports")
class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Roles("super_admin", "ops_manager", "branch_manager", "support_readonly")
  @Get("summary")
  summary(@Query("branchId") branchId?: string) {
    return this.reportsService.summary(branchId);
  }
}

@Module({
  controllers: [ReportsController],
  providers: [ReportsService],
  exports: [ReportsService],
})
export class ReportsModule {}
