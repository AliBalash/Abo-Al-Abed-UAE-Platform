import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Module,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { AddressLabel } from "@prisma/client";
import { IsBoolean, IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { PrismaService } from "../../database/prisma.service";

class SaveAddressDto {
  @IsString()
  label!: string;

  @IsString()
  line1!: string;

  @IsOptional()
  @IsString()
  line2?: string;

  @IsString()
  city!: string;

  @IsString()
  emirate!: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsLatitude()
  lat!: number;

  @IsLongitude()
  lng!: number;

  @IsOptional()
  @IsString()
  googlePlaceId?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}

@Injectable()
class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const addresses = await this.prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    return addresses.map((address) => ({
      id: address.id,
      label: address.customLabel || address.label.toLowerCase(),
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      emirate: address.emirate,
      notes: address.notes,
      coordinates: {
        lat: address.latitude,
        lng: address.longitude,
      },
      isDefault: address.isDefault,
    }));
  }

  async create(userId: string, dto: SaveAddressDto) {
    return this.save(userId, dto);
  }

  async update(userId: string, addressId: string, dto: SaveAddressDto) {
    const address = await this.prisma.userAddress.findFirst({
      where: { id: addressId, userId },
    });

    if (!address) {
      throw new BadRequestException("Address not found");
    }

    return this.save(userId, dto, addressId);
  }

  async delete(userId: string, addressId: string) {
    await this.prisma.userAddress.deleteMany({
      where: { id: addressId, userId },
    });

    return { ok: true };
  }

  async setDefault(userId: string, addressId: string) {
    await this.prisma.$transaction([
      this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      }),
      this.prisma.userAddress.update({
        where: { id: addressId },
        data: { isDefault: true },
      }),
    ]);

    return { ok: true };
  }

  private async save(userId: string, dto: SaveAddressDto, addressId?: string) {
    const normalizedLabel = dto.label.toLowerCase();
    const label =
      normalizedLabel === "home"
        ? AddressLabel.HOME
        : normalizedLabel === "office"
          ? AddressLabel.OFFICE
          : AddressLabel.CUSTOM;

    if (dto.isDefault) {
      await this.prisma.userAddress.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = addressId
      ? await this.prisma.userAddress.update({
          where: { id: addressId },
          data: {
            label,
            customLabel: label === AddressLabel.CUSTOM ? dto.label : null,
            line1: dto.line1,
            line2: dto.line2,
            city: dto.city,
            emirate: dto.emirate,
            notes: dto.notes,
            latitude: dto.lat,
            longitude: dto.lng,
            googlePlaceId: dto.googlePlaceId,
            isDefault: dto.isDefault ?? false,
          },
        })
      : await this.prisma.userAddress.create({
          data: {
            userId,
            label,
            customLabel: label === AddressLabel.CUSTOM ? dto.label : null,
            line1: dto.line1,
            line2: dto.line2,
            city: dto.city,
            emirate: dto.emirate,
            notes: dto.notes,
            latitude: dto.lat,
            longitude: dto.lng,
            googlePlaceId: dto.googlePlaceId,
            isDefault: dto.isDefault ?? false,
          },
        });

    return {
      id: address.id,
    };
  }
}

@Controller("addresses")
class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.addressesService.list(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: SaveAddressDto) {
    return this.addressesService.create(user.id, dto);
  }

  @Patch(":addressId")
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param("addressId") addressId: string,
    @Body() dto: SaveAddressDto,
  ) {
    return this.addressesService.update(user.id, addressId, dto);
  }

  @Delete(":addressId")
  delete(@CurrentUser() user: AuthenticatedUser, @Param("addressId") addressId: string) {
    return this.addressesService.delete(user.id, addressId);
  }

  @Post(":addressId/default")
  setDefault(@CurrentUser() user: AuthenticatedUser, @Param("addressId") addressId: string) {
    return this.addressesService.setDefault(user.id, addressId);
  }
}

@Module({
  controllers: [AddressesController],
  providers: [AddressesService],
  exports: [AddressesService],
})
export class AddressesModule {}
