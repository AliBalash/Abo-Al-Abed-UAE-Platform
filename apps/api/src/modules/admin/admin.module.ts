import { BadRequestException, Body, Controller, Get, Injectable, Module, Patch, Query } from "@nestjs/common";
import { AvailabilityStatus } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { Roles } from "../../common/roles.decorator";
import { AuditService } from "../audit/audit.module";
import { buildMoney } from "../../common/mappers";
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

@Injectable()
class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async overview() {
    const [branches, products, orders, users, banners] = await Promise.all([
      this.prisma.branch.count(),
      this.prisma.product.count(),
      this.prisma.order.count(),
      this.prisma.user.count(),
      this.prisma.homeBanner.count(),
    ]);

    return {
      branches,
      products,
      orders,
      users,
      banners,
    };
  }

  async branches() {
    return this.prisma.branch.findMany({
      include: {
        settings: true,
        _count: {
          select: { orders: true, productAvailability: true, staffAssignments: true },
        },
      },
      orderBy: { displayOrder: "asc" },
    });
  }

  async catalog() {
    const products = await this.prisma.product.findMany({
      include: {
        category: true,
        variants: true,
        branchAvailability: true,
      },
      orderBy: { nameEn: "asc" },
    });

    return products.map((product) => ({
      id: product.id,
      name: product.nameEn,
      category: product.category.titleEn,
      variantCount: product.variants.length,
      basePrice: product.variants[0] ? buildMoney(product.variants[0].price) : null,
      pausedBranches: product.branchAvailability.filter((availability) => availability.status !== AvailabilityStatus.AVAILABLE).length,
    }));
  }

  async orders(branchId?: string, status?: string) {
    return this.prisma.order.findMany({
      where: {
        branchId: branchId || undefined,
        status: status ? (status.toUpperCase() as any) : undefined,
      },
      include: {
        branch: true,
      },
      take: 100,
      orderBy: { createdAt: "desc" },
    });
  }

  async updateAvailability(actor: AuthenticatedUser, dto: UpdateAvailabilityDto) {
    const availability = await this.prisma.branchProductAvailability.upsert({
      where: {
        branchId_productId: {
          branchId: dto.branchId,
          productId: dto.productId,
        },
      },
      update: {
        status: dto.status,
        note: dto.note,
      },
      create: {
        branchId: dto.branchId,
        productId: dto.productId,
        status: dto.status,
        note: dto.note,
      },
    });

    await this.auditService.log(actor.id, "branch.availability.updated", "branch_product_availability", availability.id, {
      branchId: dto.branchId,
      productId: dto.productId,
      status: dto.status,
    });

    return availability;
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

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Get("catalog")
  catalog() {
    return this.adminService.catalog();
  }

  @Roles("super_admin", "ops_manager", "branch_manager", "support_readonly")
  @Get("orders")
  orders(@Query("branchId") branchId?: string, @Query("status") status?: string) {
    return this.adminService.orders(branchId, status);
  }

  @Roles("super_admin", "ops_manager", "branch_manager")
  @Patch("availability")
  updateAvailability(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateAvailabilityDto) {
    return this.adminService.updateAvailability(user, dto);
  }
}

@Module({
  imports: [AuditModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
