import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import type { NextFunction, Request, Response } from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";

import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    cors: true,
  });

  const publicAssetsPath =
    [
      join(process.cwd(), "public"),
      join(process.cwd(), "apps/api/public"),
      join(__dirname, "..", "public"),
      join(__dirname, "..", "..", "public"),
    ].find((candidate) => existsSync(candidate)) ?? join(process.cwd(), "public");

  const menuAssetsPath = join(publicAssetsPath, "assets", "menu");
  const localMenuPattern = /^abo-menu-local-(\d{3})\.jpg$/;

  app.use("/assets/menu", (request: Request, response: Response, next: NextFunction) => {
    const requestedFile = request.path.replace(/^\/+/, "");
    const match = localMenuPattern.exec(requestedFile);

    if (!match) {
      return next();
    }

    const requestedPath = join(menuAssetsPath, requestedFile);
    if (existsSync(requestedPath)) {
      return response.sendFile(requestedPath);
    }

    const requestedIndex = Number.parseInt(match[1], 10);
    const fallbackIndex = ((requestedIndex - 1) % 4) + 1;
    const fallbackPath = join(menuAssetsPath, `abo-menu-${fallbackIndex}.jpg`);

    if (existsSync(fallbackPath)) {
      return response.sendFile(fallbackPath);
    }

    return next();
  });

  app.useStaticAssets(publicAssetsPath, {
    prefix: "/",
    maxAge: "7d",
  });

  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const config = new DocumentBuilder()
    .setTitle("Abo Al-Abed API")
    .setDescription("Self-pickup ordering platform for Abo Al-Abed UAE")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(process.env.PORT ?? 4000);
}

bootstrap();
