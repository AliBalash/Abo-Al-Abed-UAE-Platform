import { AvailabilityStatus, OrderStatus, PaymentStatus, Prisma } from "@prisma/client";

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  return Number(value);
}

export function buildMoney(amount: Prisma.Decimal | number | string, currency = "AED") {
  return {
    amount: decimalToNumber(amount),
    currency,
  };
}

export function normalizeAvailability(status: AvailabilityStatus) {
  if (status === AvailabilityStatus.UNAVAILABLE) return "unavailable";
  if (status === AvailabilityStatus.PAUSED) return "paused";
  return "available";
}

export function normalizeOrderStatus(status: OrderStatus) {
  return status.toLowerCase();
}

export function normalizePaymentStatus(status: PaymentStatus) {
  return status.toLowerCase();
}
