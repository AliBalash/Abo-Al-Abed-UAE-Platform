import { Controller, Get, Injectable, Module } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async profile(userId: string) {
    const [user, addresses, favorites, recentOrders] = await Promise.all([
      this.prisma.user.findUniqueOrThrow({
        where: { id: userId },
        include: { customerProfile: true },
      }),
      this.prisma.userAddress.findMany({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      }),
      this.prisma.favorite.count({ where: { customerId: userId } }),
      this.prisma.recentOrder.count({ where: { customerId: userId } }),
    ]);

    return {
      id: user.id,
      email: user.email,
      firstName: user.customerProfile?.firstName,
      lastName: user.customerProfile?.lastName,
      phoneE164: user.customerProfile?.phoneE164,
      addressCount: addresses.length,
      favoriteCount: favorites,
      recentOrderCount: recentOrders,
    };
  }
}

@Controller("customers")
class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get("profile")
  profile(@CurrentUser() user: AuthenticatedUser) {
    return this.customersService.profile(user.id);
  }
}

@Module({
  controllers: [CustomersController],
  providers: [CustomersService],
})
export class CustomersModule {}
