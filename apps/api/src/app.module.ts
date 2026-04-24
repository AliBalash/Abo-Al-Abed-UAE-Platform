import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD } from "@nestjs/core";

import { AdminModule } from "./modules/admin/admin.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { AuditModule } from "./modules/audit/audit.module";
import { AuthModule } from "./modules/auth/auth.module";
import { BranchOpsModule } from "./modules/branch-ops/branch-ops.module";
import { BranchesModule } from "./modules/branches/branches.module";
import { CartModule } from "./modules/cart/cart.module";
import { CatalogModule } from "./modules/catalog/catalog.module";
import { CustomersModule } from "./modules/customers/customers.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { ReportsModule } from "./modules/reports/reports.module";
import { CurrentUserGuard } from "./common/jwt-auth.guard";
import { RolesGuard } from "./common/roles.guard";
import { CoreModule } from "./core.module";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env", "../../.env"],
    }),
    CoreModule,
    AuthModule,
    CustomersModule,
    AddressesModule,
    CatalogModule,
    BranchesModule,
    CartModule,
    OrdersModule,
    PaymentsModule,
    BranchOpsModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
    AdminModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: CurrentUserGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule {}
