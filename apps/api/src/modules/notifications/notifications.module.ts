import { Controller, Get, Injectable, Module } from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createFromTemplate(userId: string, eventKey: string, orderId?: string, payload?: Prisma.InputJsonValue) {
    const template = await this.prisma.notificationTemplate.findUnique({
      where: { eventKey },
    });

    if (!template || !template.isActive) {
      return null;
    }

    return this.prisma.notification.create({
      data: {
        userId,
        orderId,
        channel: template.channel,
        title: template.title,
        body: template.body,
        payload,
      },
    });
  }

  async list(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 30,
    });
  }
}

@Controller("notifications")
class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.notificationsService.list(user.id);
  }
}

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  exports: [NotificationsService],
})
export class NotificationsModule {}
