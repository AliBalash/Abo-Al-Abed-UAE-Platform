import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  Module,
  Post,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import bcrypt from "bcryptjs";

import { CurrentUser } from "../../common/current-user.decorator";
import type { AuthenticatedUser } from "../../common/authenticated-user.interface";
import { Public } from "../../common/public.decorator";
import { PrismaService } from "../../database/prisma.service";

class RegisterDto {
  @IsString()
  @MinLength(2)
  firstName!: string;

  @IsString()
  @MinLength(2)
  lastName!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsOptional()
  @IsString()
  phoneE164?: string;
}

class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
    });

    if (existing) {
      throw new BadRequestException("Email is already registered");
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        customerProfile: {
          create: {
            firstName: dto.firstName,
            lastName: dto.lastName,
            phoneE164: dto.phoneE164,
          },
        },
      },
      include: {
        customerProfile: true,
        roleAssignments: {
          include: {
            role: true,
          },
        },
      },
    });

    const accessToken = await this.signUser(user.id);

    return {
      accessToken,
      user: await this.getMe(user.id),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email.toLowerCase() },
      include: {
        customerProfile: true,
        staffProfile: true,
      },
    });

    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException("Invalid email or password");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        lastLoginAt: new Date(),
      },
    });

    const accessToken = await this.signUser(user.id);

    return {
      accessToken,
      user: await this.getMe(user.id),
    };
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        customerProfile: true,
        staffProfile: {
          include: {
            primaryBranch: true,
          },
        },
        roleAssignments: {
          include: {
            role: true,
            branch: true,
          },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      roles: user.roleAssignments.map((assignment) => assignment.role.name),
      customerProfile: user.customerProfile
        ? {
            firstName: user.customerProfile.firstName,
            lastName: user.customerProfile.lastName,
            phoneE164: user.customerProfile.phoneE164,
          }
        : null,
      staffProfile: user.staffProfile
        ? {
            firstName: user.staffProfile.firstName,
            lastName: user.staffProfile.lastName,
            phoneE164: user.staffProfile.phoneE164,
            primaryBranch: user.staffProfile.primaryBranch
              ? {
                  id: user.staffProfile.primaryBranch.id,
                  code: user.staffProfile.primaryBranch.code,
                  nameEn: user.staffProfile.primaryBranch.nameEn,
                }
              : null,
          }
        : null,
    };
  }

  private async signUser(userId: string) {
    const payload = await this.buildPayload(userId);
    return this.jwtService.signAsync(payload);
  }

  private async buildPayload(userId: string): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        roleAssignments: true,
      },
    });

    const roles = await this.prisma.roleAssignment.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });

    return {
      id: user.id,
      email: user.email,
      roles: roles.map((assignment) => assignment.role.name),
      branchIds: roles.map((assignment) => assignment.branchId).filter(Boolean) as string[],
    };
  }
}

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register")
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post("login")
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get("me")
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.getMe(user.id);
  }
}

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>("JWT_SECRET", "change-me"),
        signOptions: {
          expiresIn: "7d",
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService],
  exports: [AuthService, JwtModule],
})
export class AuthModule {}
