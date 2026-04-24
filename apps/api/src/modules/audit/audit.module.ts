import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { Roles } from "../../common/roles.decorator";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(actorUserId: string | undefined, action: string, entityType: string, entityId?: string, metadata?: Prisma.InputJsonValue) {
    return this.prisma.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType,
        entityId,
        metadata,
      },
    });
  }

  async recent() {
    return this.prisma.auditLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }
}

@Controller("audit")
class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Roles("super_admin", "ops_manager", "support_readonly")
  @Get()
  recent() {
    return this.auditService.recent();
  }
}

@Module({
  controllers: [AuditController],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
