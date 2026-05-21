import { z } from "zod";

export const localeSchema = z.enum(["en", "ar"]);
export type Locale = z.infer<typeof localeSchema>;

export const roleSchema = z.enum([
  "super_admin",
  "kitchen_manager",
  "branch_manager",
  "cashier",
  "kitchen_staff",
  "support_readonly",
]);
export type Role = z.infer<typeof roleSchema>;

export const orderStatusSchema = z.enum([
  "awaiting_payment",
  "paid",
  "in_preparation",
  "ready_for_pickup",
  "picked_up",
  "cancelled",
  "expired",
]);
export type OrderStatus = z.infer<typeof orderStatusSchema>;

export const paymentStatusSchema = z.enum([
  "pending",
  "confirmed",
  "cancelled",
  "expired",
]);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

export const availabilitySchema = z.enum(["available", "unavailable", "paused"]);
export type Availability = z.infer<typeof availabilitySchema>;

export const moneySchema = z.object({
  amount: z.number().nonnegative(),
  currency: z.string().default("AED"),
});
export type Money = z.infer<typeof moneySchema>;

export const coordinatesSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});
export type Coordinates = z.infer<typeof coordinatesSchema>;

export const localizedTextSchema = z.object({
  en: z.string(),
  ar: z.string().optional().default(""),
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

export const branchSchema = z.object({
  id: z.string().uuid(),
  code: z.string(),
  name: localizedTextSchema,
  address: localizedTextSchema,
  phone: z.string(),
  timezone: z.string(),
  coordinates: coordinatesSchema,
  isActive: z.boolean(),
  isAcceptingOrders: z.boolean(),
  estimatedPrepMinutes: z.number().int().nonnegative(),
  distanceKm: z.number().nonnegative().optional(),
});
export type Branch = z.infer<typeof branchSchema>;

export const addressSchema = z.object({
  id: z.string().uuid(),
  label: z.string(),
  line1: z.string(),
  line2: z.string().optional(),
  city: z.string(),
  emirate: z.string(),
  notes: z.string().optional(),
  coordinates: coordinatesSchema,
  isDefault: z.boolean().default(false),
});
export type Address = z.infer<typeof addressSchema>;

export const modifierOptionSchema = z.object({
  id: z.string().uuid(),
  name: localizedTextSchema,
  priceDelta: z.number().default(0),
  isDefault: z.boolean().default(false),
});
export type ModifierOption = z.infer<typeof modifierOptionSchema>;

export const modifierGroupSchema = z.object({
  id: z.string().uuid(),
  name: localizedTextSchema,
  minSelections: z.number().int().nonnegative().default(0),
  maxSelections: z.number().int().positive().default(1),
  options: z.array(modifierOptionSchema),
});
export type ModifierGroup = z.infer<typeof modifierGroupSchema>;

export const productVariantSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: localizedTextSchema,
  price: moneySchema,
  compareAtPrice: moneySchema.optional(),
});
export type ProductVariant = z.infer<typeof productVariantSchema>;

export const productSchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  name: localizedTextSchema,
  description: localizedTextSchema,
  categorySlug: z.string(),
  heroImageUrl: z.string().url(),
  tags: z.array(z.string()),
  variants: z.array(productVariantSchema),
  modifierGroups: z.array(modifierGroupSchema),
  isFeatured: z.boolean().default(false),
});
export type Product = z.infer<typeof productSchema>;

export const menuCategorySchema = z.object({
  id: z.string().uuid(),
  slug: z.string(),
  title: localizedTextSchema,
  description: localizedTextSchema.optional(),
  displayOrder: z.number().int().nonnegative(),
});
export type MenuCategory = z.infer<typeof menuCategorySchema>;

export const homeBannerSchema = z.object({
  id: z.string().uuid(),
  title: localizedTextSchema,
  subtitle: localizedTextSchema,
  imageUrl: z.string().url(),
  ctaLabel: localizedTextSchema,
  ctaTarget: z.string(),
  theme: z.enum(["warm", "dark", "promo"]),
});
export type HomeBanner = z.infer<typeof homeBannerSchema>;

export const cartItemSelectionSchema = z.object({
  modifierGroupId: z.string().uuid(),
  optionIds: z.array(z.string().uuid()),
});
export type CartItemSelection = z.infer<typeof cartItemSelectionSchema>;

export const cartItemSchema = z.object({
  id: z.string().uuid(),
  productId: z.string().uuid(),
  variantId: z.string().uuid(),
  quantity: z.number().int().positive(),
  notes: z.string().optional(),
  selections: z.array(cartItemSelectionSchema),
  unitPrice: moneySchema,
  totalPrice: moneySchema,
});
export type CartItem = z.infer<typeof cartItemSchema>;

export const cartSchema = z.object({
  id: z.string().uuid(),
  branchId: z.string().uuid().optional(),
  items: z.array(cartItemSchema),
  subtotal: moneySchema,
  discountTotal: moneySchema,
  grandTotal: moneySchema,
});
export type Cart = z.infer<typeof cartSchema>;

export const orderTimelineEventSchema = z.object({
  status: orderStatusSchema,
  at: z.string().datetime(),
  actorName: z.string().optional(),
  note: z.string().optional(),
});
export type OrderTimelineEvent = z.infer<typeof orderTimelineEventSchema>;

export const orderSchema = z.object({
  id: z.string().uuid(),
  orderCode: z.string(),
  pickupToken: z.string(),
  status: orderStatusSchema,
  paymentStatus: paymentStatusSchema,
  branch: branchSchema,
  address: addressSchema,
  items: z.array(cartItemSchema),
  subtotal: moneySchema,
  discountTotal: moneySchema,
  grandTotal: moneySchema,
  expiresAt: z.string().datetime(),
  timeline: z.array(orderTimelineEventSchema),
});
export type Order = z.infer<typeof orderSchema>;

export const branchRecommendationSchema = z.object({
  primary: branchSchema,
  alternatives: z.array(branchSchema),
  strategy: z.literal("nearest_open_branch"),
});
export type BranchRecommendation = z.infer<typeof branchRecommendationSchema>;

export const loginPayloadSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});
export type LoginPayload = z.infer<typeof loginPayloadSchema>;

export const registerPayloadSchema = loginPayloadSchema.extend({
  firstName: z.string().min(2),
  lastName: z.string().min(2),
  phoneE164: z.string().optional(),
});
export type RegisterPayload = z.infer<typeof registerPayloadSchema>;

export const createOrderPayloadSchema = z.object({
  addressId: z.string().uuid(),
  branchId: z.string().uuid(),
  cartId: z.string().uuid(),
  idempotencyKey: z.string().min(8),
});
export type CreateOrderPayload = z.infer<typeof createOrderPayloadSchema>;

export const confirmPaymentPayloadSchema = z.object({
  orderId: z.string().uuid(),
  amount: z.number().nonnegative(),
  providerReference: z.string().min(3),
});
export type ConfirmPaymentPayload = z.infer<typeof confirmPaymentPayloadSchema>;
