import { BadRequestException, Controller, Get, Injectable, Module, Query } from "@nestjs/common";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { haversineDistanceKm } from "../../common/geo";
import { Public } from "../../common/public.decorator";
import { PrismaService } from "../../database/prisma.service";

@Injectable()
class BranchesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(lat?: number, lng?: number) {
    const branches = await this.prisma.branch.findMany({
      where: { isActive: true },
      include: { settings: true },
      orderBy: { displayOrder: "asc" },
    });

    return branches.map((branch) => this.mapBranch(branch, lat, lng));
  }

  async recommendation(userId: string, addressId?: string, lat?: number, lng?: number) {
    let coordinates = lat && lng ? { lat, lng } : null;

    if (!coordinates && addressId) {
      const address = await this.prisma.userAddress.findFirst({
        where: { id: addressId, userId },
      });

      if (!address) {
        throw new BadRequestException("Address not found");
      }

      coordinates = { lat: address.latitude, lng: address.longitude };
    }

    if (!coordinates) {
      const defaultAddress = await this.prisma.userAddress.findFirst({
        where: { userId },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });

      if (!defaultAddress) {
        throw new BadRequestException("No address available for recommendation");
      }

      coordinates = { lat: defaultAddress.latitude, lng: defaultAddress.longitude };
    }

    const branches = await this.prisma.branch.findMany({
      where: {
        isActive: true,
        isAcceptingOrders: true,
      },
      include: { settings: true },
    });

    const ranked = branches
      .map((branch) => this.mapBranch(branch, coordinates.lat, coordinates.lng))
      .sort((left, right) => (left.distanceKm ?? Number.MAX_SAFE_INTEGER) - (right.distanceKm ?? Number.MAX_SAFE_INTEGER));

    return {
      primary: ranked[0],
      alternatives: ranked.slice(1, 3),
      strategy: "nearest_open_branch",
    };
  }

  private mapBranch(branch: any, lat?: number, lng?: number) {
    return {
      id: branch.id,
      code: branch.code,
      name: { en: branch.nameEn, ar: branch.nameAr },
      address: { en: branch.addressEn, ar: branch.addressAr },
      phone: branch.phone,
      timezone: branch.timezone,
      coordinates: { lat: branch.latitude, lng: branch.longitude },
      isActive: branch.isActive,
      isAcceptingOrders: branch.isAcceptingOrders,
      estimatedPrepMinutes: branch.estimatedPrepMinutes,
      distanceKm:
        lat && lng
          ? Number(haversineDistanceKm(lat, lng, branch.latitude, branch.longitude).toFixed(2))
          : undefined,
    };
  }
}

@Controller("branches")
class BranchesController {
  constructor(private readonly branchesService: BranchesService) {}

  @Public()
  @Get()
  list(
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
  ) {
    return this.branchesService.list(lat ? Number(lat) : undefined, lng ? Number(lng) : undefined);
  }

  @Get("recommendation")
  recommendation(
    @CurrentUser() user: AuthenticatedUser,
    @Query("addressId") addressId?: string,
    @Query("lat") lat?: string,
    @Query("lng") lng?: string,
  ) {
    return this.branchesService.recommendation(
      user.id,
      addressId,
      lat ? Number(lat) : undefined,
      lng ? Number(lng) : undefined,
    );
  }
}

@Module({
  controllers: [BranchesController],
  providers: [BranchesService],
  exports: [BranchesService],
})
export class BranchesModule {}
