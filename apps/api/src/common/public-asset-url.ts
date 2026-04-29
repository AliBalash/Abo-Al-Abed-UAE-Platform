import type { Request } from "express";

type RequestWithHeaders = Pick<Request, "protocol" | "headers" | "get">;

function firstHeaderValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}

export function publicAssetBaseUrlFromRequest(request?: RequestWithHeaders) {
  if (process.env.PUBLIC_ASSET_BASE_URL) {
    return process.env.PUBLIC_ASSET_BASE_URL;
  }

  if (!request) {
    return `http://127.0.0.1:${process.env.PORT ?? 4000}`;
  }

  const forwardedProto = firstHeaderValue(request.headers["x-forwarded-proto"])
    ?.split(",")[0]
    ?.trim();
  const forwardedHost = firstHeaderValue(request.headers["x-forwarded-host"])
    ?.split(",")[0]
    ?.trim();
  const host = forwardedHost || request.get("host");
  const protocol = forwardedProto || request.protocol || "http";

  if (!host) {
    return `http://127.0.0.1:${process.env.PORT ?? 4000}`;
  }

  return `${protocol}://${host}`;
}

export function resolvePublicAssetUrl(url: string, assetBaseUrl?: string) {
  if (!url || !url.startsWith("/")) {
    return url;
  }

  const baseURL = assetBaseUrl || `http://127.0.0.1:${process.env.PORT ?? 4000}`;
  return `${baseURL.replace(/\/$/, "")}${url}`;
}
