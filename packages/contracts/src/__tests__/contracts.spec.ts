import { describe, expect, it } from "vitest";

import { createOrderPayloadSchema, registerPayloadSchema } from "../index";

describe("contracts", () => {
  it("accepts valid register payloads", () => {
    const payload = registerPayloadSchema.parse({
      firstName: "Demo",
      lastName: "Customer",
      email: "customer@aboalabed.ae",
      password: "ChangeMe123!",
    });

    expect(payload.email).toBe("customer@aboalabed.ae");
  });

  it("rejects invalid create order payloads", () => {
    expect(() =>
      createOrderPayloadSchema.parse({
        addressId: "bad-id",
        branchId: "bad-id",
        cartId: "bad-id",
        idempotencyKey: "123",
      }),
    ).toThrow();
  });
});
