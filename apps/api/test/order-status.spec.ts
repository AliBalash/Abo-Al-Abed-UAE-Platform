import { describe, expect, it } from "vitest";
import { OrderStatus } from "@prisma/client";

import { assertOrderTransition } from "../src/common/order-status";

describe("assertOrderTransition", () => {
  it("allows expected forward transitions", () => {
    expect(() => assertOrderTransition(OrderStatus.PAID, OrderStatus.IN_PREPARATION)).not.toThrow();
    expect(() => assertOrderTransition(OrderStatus.IN_PREPARATION, OrderStatus.READY_FOR_PICKUP)).not.toThrow();
  });

  it("rejects invalid jumps", () => {
    expect(() => assertOrderTransition(OrderStatus.AWAITING_PAYMENT, OrderStatus.READY_FOR_PICKUP)).toThrow();
    expect(() => assertOrderTransition(OrderStatus.PICKED_UP, OrderStatus.PAID)).toThrow();
  });
});
