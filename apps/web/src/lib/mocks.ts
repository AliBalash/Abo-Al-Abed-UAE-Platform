export const mockOpsData = {
  awaitingPayment: [
    { id: "1", orderCode: "AA1483", branchName: "Dubai Business Village", itemCount: 3, total: 58, expiresAt: "12:45", customer: "Demo Customer" },
    { id: "2", orderCode: "AA9315", branchName: "Dubai Business Village", itemCount: 2, total: 27, expiresAt: "12:59", customer: "Walk-in Queue" },
  ],
  paid: [{ id: "3", orderCode: "AA7712", itemCount: 4, total: 64, customer: "Office Pickup" }],
  inPreparation: [{ id: "4", orderCode: "AA6610", itemCount: 1, total: 19, customer: "Evening Repeat" }],
  ready: [{ id: "5", orderCode: "AA2008", itemCount: 2, total: 34, customer: "Ready at Shelf" }],
  pickedUp: [],
};

export const mockAdminOverview = {
  branches: 5,
  products: 6,
  orders: 128,
  users: 34,
  banners: 2,
};

export const mockBranches = [
  { code: "DXB-BVV", nameEn: "Dubai Business Village", estimatedPrepMinutes: 18, _count: { orders: 48, productAvailability: 6, staffAssignments: 3 } },
  { code: "SHJ-MAJAZ", nameEn: "Sharjah Al Majaz", estimatedPrepMinutes: 20, _count: { orders: 22, productAvailability: 6, staffAssignments: 2 } },
  { code: "AJM-CORNICHE", nameEn: "Ajman Corniche", estimatedPrepMinutes: 22, _count: { orders: 17, productAvailability: 6, staffAssignments: 2 } },
];

export const mockCatalog = [
  { id: "1", name: "Golden Chicken Sandwich", category: "Golden Sandwich", variantCount: 2, basePrice: { amount: 19 }, pausedBranches: 0 },
  { id: "2", name: "El-Abodi Meal", category: "El-Abodi", variantCount: 1, basePrice: { amount: 29 }, pausedBranches: 1 },
  { id: "3", name: "Ayran Abu Al-Abed", category: "Drinks", variantCount: 1, basePrice: { amount: 7 }, pausedBranches: 0 },
];
