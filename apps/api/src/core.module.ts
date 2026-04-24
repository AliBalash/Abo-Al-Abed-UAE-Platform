import { Global, Module } from "@nestjs/common";

import { PrismaService } from "./database/prisma.service";
import { OrdersGateway } from "./realtime/orders.gateway";

@Global()
@Module({
  providers: [PrismaService, OrdersGateway],
  exports: [PrismaService, OrdersGateway],
})
export class CoreModule {}
