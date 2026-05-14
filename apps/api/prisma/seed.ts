import bcrypt from "bcryptjs";
import { PrismaClient, Prisma, AddressLabel, AvailabilityStatus, BranchDeviceType, NotificationChannel, ProductStatus, StaffStatus, UserStatus } from "@prisma/client";

const prisma = new PrismaClient();

const branchSeeds = [
  {
    code: "DXB-BVV",
    nameEn: "Dubai Business Village",
    nameAr: "دبي بزنس فيليج",
    addressEn: "601, Business Village Building, Port Saeed, Dubai",
    addressAr: "601، مبنى بزنس فيليج، بور سعيد، دبي",
    latitude: 25.2647,
    longitude: 55.3356,
    phone: "04 211 8222",
    displayOrder: 1,
    estimatedPrepMinutes: 18,
  },
  {
    code: "SHJ-MAJAZ",
    nameEn: "Sharjah Al Majaz",
    nameAr: "الشارقة المجاز",
    addressEn: "Al Majaz Waterfront, Sharjah",
    addressAr: "واجهة المجاز المائية، الشارقة",
    latitude: 25.3364,
    longitude: 55.3773,
    phone: "04 211 8222",
    displayOrder: 2,
    estimatedPrepMinutes: 20,
  },
  {
    code: "AJM-CORNICHE",
    nameEn: "Ajman Corniche",
    nameAr: "عجمان كورنيش",
    addressEn: "Corniche Road, Ajman",
    addressAr: "شارع الكورنيش، عجمان",
    latitude: 25.4164,
    longitude: 55.4411,
    phone: "04 211 8222",
    displayOrder: 3,
    estimatedPrepMinutes: 22,
  },
  {
    code: "AUH-KHALIDIYA",
    nameEn: "Abu Dhabi Khalidiya",
    nameAr: "أبوظبي الخالدية",
    addressEn: "Khalidiya District, Abu Dhabi",
    addressAr: "منطقة الخالدية، أبوظبي",
    latitude: 24.4698,
    longitude: 54.3507,
    phone: "04 211 8222",
    displayOrder: 4,
    estimatedPrepMinutes: 24,
  },
  {
    code: "FUJ-HAMAD",
    nameEn: "Fujairah Hamad Bin Abdulla",
    nameAr: "الفجيرة شارع حمد بن عبدالله",
    addressEn: "Hamad Bin Abdulla Road, Fujairah",
    addressAr: "شارع حمد بن عبدالله، الفجيرة",
    latitude: 25.1247,
    longitude: 56.3265,
    phone: "04 211 8222",
    displayOrder: 5,
    estimatedPrepMinutes: 26,
  },
];

const categorySeeds = [
  ["golden-sandwich", "Golden Sandwich", "الساندوتش الذهبي"],
  ["new-items", "New Items", "الأصناف الجديدة"],
  ["baby-size", "Baby Size", "بيبي سايز"],
  ["meals", "Meals", "الوجبات"],
  ["el-abodi", "El-Abodi", "العبودي"],
  ["sandwiches", "Sandwiches", "السندويشات"],
  ["appetizers", "Appetizers", "المقبلات"],
  ["drinks", "Drinks", "المشروبات"],
].map(([slug, titleEn, titleAr], index) => ({
  slug,
  titleEn,
  titleAr,
  displayOrder: index + 1,
}));

const modifierGroups = [
  {
    code: "spice-level",
    nameEn: "Spice Level",
    nameAr: "درجة الحدة",
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { code: "normal", nameEn: "Normal", nameAr: "عادي", isDefault: true, priceDelta: 0 },
      { code: "spicy", nameEn: "Spicy", nameAr: "سبايسي", isDefault: false, priceDelta: 0 },
    ],
  },
  {
    code: "bread-type",
    nameEn: "Bread Type",
    nameAr: "نوع الخبز",
    minSelections: 1,
    maxSelections: 1,
    isRequired: true,
    options: [
      { code: "protein", nameEn: "Protein Bread", nameAr: "خبز بروتين", isDefault: true, priceDelta: 0 },
      { code: "classic", nameEn: "Classic Bread", nameAr: "خبز كلاسيك", isDefault: false, priceDelta: 0 },
    ],
  },
  {
    code: "meal-upgrade",
    nameEn: "Meal Upgrade",
    nameAr: "ترقية الوجبة",
    minSelections: 0,
    maxSelections: 1,
    isRequired: false,
    options: [
      { code: "sandwich-only", nameEn: "Sandwich Only", nameAr: "سندويش فقط", isDefault: true, priceDelta: 0 },
      { code: "combo", nameEn: "Combo Meal", nameAr: "وجبة كاملة", isDefault: false, priceDelta: 8 },
    ],
  },
  {
    code: "sauce-choice",
    nameEn: "Sauce Choice",
    nameAr: "اختيار الصوص",
    minSelections: 1,
    maxSelections: 2,
    isRequired: true,
    options: [
      { code: "garlic", nameEn: "Garlic", nameAr: "ثوم", isDefault: true, priceDelta: 0 },
      { code: "pink", nameEn: "Pink Sauce", nameAr: "وردي", isDefault: false, priceDelta: 0 },
      { code: "tahini", nameEn: "Tahini", nameAr: "طحينة", isDefault: false, priceDelta: 0 },
    ],
  },
];

const fallbackMenuImageUrls = [
  "/assets/menu/abo-menu-1.jpg",
  "/assets/menu/abo-menu-2.jpg",
  "/assets/menu/abo-menu-3.jpg",
  "/assets/menu/abo-menu-4.jpg",
];

const localMenuImageUrls = Array.from({ length: 48 }, (_, index) => `/assets/menu/abo-menu-local-${String(index + 1).padStart(3, "0")}.jpg`);

const productSeeds = [
  {
    slug: "golden-chicken-sandwich",
    nameEn: "Golden Chicken Sandwich",
    nameAr: "ساندويش الدجاج الذهبي",
    descriptionEn: "A crispy Abu Al-Abed style sandwich with signature sauces and fresh bread.",
    descriptionAr: "ساندويش مقرمش على طريقة أبو العبد مع الصوصات المميزة والخبز الطازج.",
    categorySlug: "golden-sandwich",
    featured: true,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [
      { sku: "GOLDEN-SANDWICH", nameEn: "Regular", nameAr: "عادي", price: 19 },
      { sku: "GOLDEN-SANDWICH-MEAL", nameEn: "Meal", nameAr: "وجبة", price: 27 },
    ],
    modifiers: ["spice-level", "bread-type", "meal-upgrade", "sauce-choice"],
    tags: ["featured", "best-seller"],
  },
  {
    slug: "baby-crispy-wrap",
    nameEn: "Baby Crispy Wrap",
    nameAr: "بيبي راب كريسبي",
    descriptionEn: "Compact wrap for quick self-pickup orders.",
    descriptionAr: "راب صغير وسريع للاستلام الذاتي.",
    categorySlug: "baby-size",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [
      { sku: "BABY-WRAP", nameEn: "Single", nameAr: "واحد", price: 12 },
    ],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "el-abodi-meal",
    nameEn: "El-Abodi Meal",
    nameAr: "وجبة العبودي",
    descriptionEn: "Loaded sandwich meal with fries and drink.",
    descriptionAr: "وجبة ساندويش محشية مع بطاطا ومشروب.",
    categorySlug: "el-abodi",
    featured: true,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [
      { sku: "ABODI-MEAL", nameEn: "Regular", nameAr: "عادي", price: 29 },
    ],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["featured", "meal"],
  },
  {
    slug: "broasted-family-meal",
    nameEn: "Broasted Family Meal",
    nameAr: "وجبة بروست عائلية",
    descriptionEn: "Family-sized broasted chicken bundle for pickup.",
    descriptionAr: "باقة بروست عائلية كبيرة للاستلام.",
    categorySlug: "meals",
    featured: true,
    imageUrl: fallbackMenuImageUrls[3],
    variants: [
      { sku: "BROASTED-FAMILY", nameEn: "Family Meal", nameAr: "وجبة عائلية", price: 58 },
    ],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["family"],
  },
  {
    slug: "loaded-fries",
    nameEn: "Loaded Fries",
    nameAr: "بطاطا لودد",
    descriptionEn: "Signature fries with sauce drizzle.",
    descriptionAr: "بطاطا مميزة مع صوص.",
    categorySlug: "appetizers",
    featured: false,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [
      { sku: "LOADED-FRIES", nameEn: "Regular", nameAr: "عادي", price: 10 },
    ],
    modifiers: ["sauce-choice"],
    tags: ["sides"],
  },
  {
    slug: "ayran-abu-al-abed",
    nameEn: "Ayran Abu Al-Abed",
    nameAr: "لبن عيران أبو العبد",
    descriptionEn: "Chilled ayran to pair with every pickup order.",
    descriptionAr: "لبن عيران بارد مع كل طلب.",
    categorySlug: "drinks",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [
      { sku: "AYRAN-REG", nameEn: "Bottle", nameAr: "عبوة", price: 7 },
    ],
    modifiers: [],
    tags: ["drink"],
  },
];

productSeeds.push(
  {
    slug: "golden-meat-tikka",
    nameEn: "Golden Meat Tikka Sandwich",
    nameAr: "تكة لحم",
    descriptionEn: "Charcoal grilled meat with chickpeas, salad, grilled tomatoes and zaatar in toasted saj bread.",
    descriptionAr: "قطع من اللحم المشوي على الفحم مع الحمص والسلطة والطماطم المشوية داخل الخبز الصاج.",
    categorySlug: "golden-sandwich",
    featured: true,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [{ sku: "GOLDEN-MEAT-TIKKA", nameEn: "Regular", nameAr: "عادي", price: 28 }],
    modifiers: ["spice-level", "bread-type", "sauce-choice"],
    tags: ["featured", "best-seller"],
  },
  {
    slug: "golden-meat-kebab",
    nameEn: "Golden Meat Kebab Sandwich",
    nameAr: "كباب لحم",
    descriptionEn: "Charcoal grilled kebab with onion, parsley, sumac, tomato, pickles, tahini and hummus.",
    descriptionAr: "سيخ كباب مشوي على الفحم مع البصل والبقدونس والسماق والطماطم والمخلل وصوص الطحينة والحمص.",
    categorySlug: "golden-sandwich",
    featured: true,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [{ sku: "GOLDEN-MEAT-KEBAB", nameEn: "Regular", nameAr: "عادي", price: 25 }],
    modifiers: ["spice-level", "bread-type", "sauce-choice"],
    tags: ["featured"],
  },
  {
    slug: "golden-shish-tawook",
    nameEn: "Golden Shish Tawook Sandwich",
    nameAr: "شيش طاووق",
    descriptionEn: "Skewered shish tawook with Abu Al-Abed sauce, garlic, pickles and potatoes in toasted saj.",
    descriptionAr: "قطع من الشيش طاووق مع صوص أبو العبد والثوم والمخلل والبطاط داخل خبز الصاج المحمص.",
    categorySlug: "golden-sandwich",
    featured: true,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "GOLDEN-TAWOOK", nameEn: "Regular", nameAr: "عادي", price: 23 }],
    modifiers: ["spice-level", "bread-type", "sauce-choice"],
    tags: ["featured"],
  },
  {
    slug: "golden-musahab",
    nameEn: "Golden Musahab Sandwich",
    nameAr: "مسحب",
    descriptionEn: "Boneless charcoal grilled chicken with Abu Al-Abed sauce, garlic and pickles.",
    descriptionAr: "قطع من الدجاج المسحب المشوي على الفحم مع صوص أبو العبد والثوم والمخلل.",
    categorySlug: "golden-sandwich",
    featured: true,
    imageUrl: fallbackMenuImageUrls[3],
    variants: [{ sku: "GOLDEN-MUSAHAB", nameEn: "Regular", nameAr: "عادي", price: 23 }],
    modifiers: ["spice-level", "bread-type", "sauce-choice"],
    tags: ["featured"],
  },
  {
    slug: "meat-tikka-meal",
    nameEn: "Meat Tikka Meal",
    nameAr: "وجبة تكة لحم",
    descriptionEn: "Three skewers of meat tikka with hummus, pickles, biwaz salad, bread and grilled tomatoes.",
    descriptionAr: "ثلاث أسياخ تكة لحم مع حمص ومخلل وسلطة بيواز وخبز وطماطم مشوية.",
    categorySlug: "new-items",
    featured: true,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [{ sku: "MEAT-TIKKA-MEAL", nameEn: "Meal", nameAr: "وجبة", price: 68 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["featured", "meal"],
  },
  {
    slug: "makanek-protein-sandwich",
    nameEn: "Makanek Protein Sandwich",
    nameAr: "ساندوتش مقانق بروتين",
    descriptionEn: "Makanek in protein bread with garlic, mayonnaise mustard, tomato, pickles, lettuce and pomegranate molasses.",
    descriptionAr: "مقانق بخبز البروتين مع الثوم والمايوسترد والطماطم والمخلل والخس ودبس الرمان.",
    categorySlug: "new-items",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [{ sku: "MAKANEK-PROTEIN", nameEn: "Regular", nameAr: "عادي", price: 29 }],
    modifiers: ["bread-type", "sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "diwaniya-quarter-box",
    nameEn: "Diwaniya Quarter Box",
    nameAr: "وجبة ديوانية الربع",
    descriptionEn: "Box of musahab, shish tawook and meat kebab sandwiches with fries and assorted sauces.",
    descriptionAr: "بوكس سندوتشات مسحب وطاووق وكباب لحم مع بطاط وصوصات منوعة.",
    categorySlug: "new-items",
    featured: true,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "DIWANIYA-QUARTER", nameEn: "Box", nameAr: "بوكس", price: 155 }],
    modifiers: ["sauce-choice"],
    tags: ["family", "featured"],
  },
  {
    slug: "boneless-half-chicken",
    nameEn: "Half Boneless Farooj",
    nameAr: "نصف فروج بدون عظم",
    descriptionEn: "Half boneless chicken with roasted potatoes, garlic sauce and pink sauce.",
    descriptionAr: "نصف دجاجة بدون عظم مع بطاطا مشوية وصوص ثوم وصوص وردي.",
    categorySlug: "new-items",
    featured: false,
    imageUrl: fallbackMenuImageUrls[3],
    variants: [{ sku: "BONELESS-HALF", nameEn: "Half", nameAr: "نصف", price: 39 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["meal"],
  },
  {
    slug: "baby-bucket-sandwich",
    nameEn: "Baby Sandwich Bucket",
    nameAr: "سطل بيبي ساندوتش",
    descriptionEn: "Three baby musahab, three baby tawook and three baby kebab with fries, sauces and pickles.",
    descriptionAr: "٣ بيبي مسحب، ٣ بيبي طاووق، ٣ بيبي كباب مع بطاط وصوصات ومخلل.",
    categorySlug: "baby-size",
    featured: true,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [{ sku: "BABY-BUCKET", nameEn: "Bucket", nameAr: "سطل", price: 109 }],
    modifiers: ["sauce-choice"],
    tags: ["family", "featured"],
  },
  {
    slug: "baby-musahab",
    nameEn: "Baby Musahab",
    nameAr: "بيبي مسحب",
    descriptionEn: "Boneless charcoal grilled chicken with Abu Al-Abed sauce, garlic and pickles in toasted tortilla.",
    descriptionAr: "دجاج مسحب مشوي على الفحم مع صوص أبو العبد والثوم والمخلل داخل خبز التورتيلا.",
    categorySlug: "baby-size",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [{ sku: "BABY-MUSAHAB", nameEn: "Single", nameAr: "واحد", price: 14 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "abo-burger-meal",
    nameEn: "Abu Al-Abed Burger Meal",
    nameAr: "وجبة برغر أبو العبد",
    descriptionEn: "Abu Al-Abed burger with spiced fries, signature sauce and a drink.",
    descriptionAr: "برجر أبو العبد مع بطاطس متبلة وصوص أبو العبد ومشروب.",
    categorySlug: "meals",
    featured: true,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "ABO-BURGER-MEAL", nameEn: "Meal", nameAr: "وجبة", price: 35 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["featured", "meal"],
  },
  {
    slug: "mixed-grill-meal",
    nameEn: "Mixed Grill Meal",
    nameAr: "وجبة مشويات مشكل",
    descriptionEn: "Meat kebab, chicken kebab and tawook skewers with potatoes, garlic sauce, pickles and biwaz salad.",
    descriptionAr: "سيخ كباب لحم وسيخ كباب دجاج وسيخ طاووق مع البطاطا والثوم والمخلل وسلطة البيواز.",
    categorySlug: "meals",
    featured: true,
    imageUrl: fallbackMenuImageUrls[3],
    variants: [{ sku: "MIXED-GRILL-MEAL", nameEn: "Meal", nameAr: "وجبة", price: 45 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["featured", "meal"],
  },
  {
    slug: "small-abo-bucket",
    nameEn: "Small Abu Al-Abed Bucket",
    nameAr: "سطل أبو العبد صغير",
    descriptionEn: "Half chicken pieces with Egyptian rice, corn, boiled potatoes and a choice of house seasoning.",
    descriptionAr: "نصف فروج مقطع مع رز مصري وذرة وبطاطا مسلوقة مع اختيار خلطة أبو العبد.",
    categorySlug: "meals",
    featured: false,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [{ sku: "SMALL-ABO-BUCKET", nameEn: "Small", nameAr: "صغير", price: 50 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["meal"],
  },
  {
    slug: "large-abo-bucket",
    nameEn: "Large Abu Al-Abed Bucket",
    nameAr: "سطل أبو العبد كبير",
    descriptionEn: "Whole chicken pieces with Egyptian rice, corn, boiled potatoes and signature seasoning.",
    descriptionAr: "فروج كامل مقطع مع رز مصري وذرة وبطاطا مسلوقة وخلطة أبو العبد.",
    categorySlug: "meals",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [{ sku: "LARGE-ABO-BUCKET", nameEn: "Large", nameAr: "كبير", price: 80 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["family", "meal"],
  },
  {
    slug: "abodi-makanek",
    nameEn: "Abodi Makanek",
    nameAr: "عبودي مقانق",
    descriptionEn: "Potatoes and makanek with mayonnaise mustard sauce, pomegranate molasses and lemon.",
    descriptionAr: "بطاط ومقانق مع صوص المايوماسترد ودبس الرمان وحبة ليمون.",
    categorySlug: "el-abodi",
    featured: false,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "ABODI-MAKANEK", nameEn: "Regular", nameAr: "عادي", price: 22 }],
    modifiers: ["sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "abodi-musahab",
    nameEn: "Abodi Musahab",
    nameAr: "عبودي مسحب",
    descriptionEn: "Charcoal grilled musahab chicken pieces with spiced potatoes and Abu Al-Abed sauce.",
    descriptionAr: "قطع مسحب مشوية على الفحم مع البطاط المبهر وصوص أبو العبد.",
    categorySlug: "el-abodi",
    featured: false,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "ABODI-MUSAHAB", nameEn: "Regular", nameAr: "عادي", price: 15 }],
    modifiers: ["sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "potato-sandwich",
    nameEn: "Potato Sandwich",
    nameAr: "ساندوتش بطاط",
    descriptionEn: "Spiced potato fingers with cabbage salad, ketchup, garlic, pickles and Abu Al-Abed sauce.",
    descriptionAr: "أصابع بطاط مبهر مع سلطة ملفوف وكاتشب وثوم ومخلل وصوص أبو العبد.",
    categorySlug: "sandwiches",
    featured: false,
    imageUrl: fallbackMenuImageUrls[0],
    variants: [{ sku: "POTATO-SANDWICH", nameEn: "Regular", nameAr: "عادي", price: 10 }],
    modifiers: ["spice-level", "sauce-choice"],
    tags: ["quick"],
  },
  {
    slug: "hummus",
    nameEn: "Hummus",
    nameAr: "حمص",
    descriptionEn: "Classic hummus side for grilled chicken and sandwiches.",
    descriptionAr: "حمص كلاسيكي مع المشويات والسندويشات.",
    categorySlug: "appetizers",
    featured: false,
    imageUrl: fallbackMenuImageUrls[1],
    variants: [{ sku: "HUMMUS", nameEn: "Regular", nameAr: "عادي", price: 15 }],
    modifiers: [],
    tags: ["sides"],
  },
  {
    slug: "spiced-fries-box",
    nameEn: "Spiced Fries Box",
    nameAr: "علبة بطاط",
    descriptionEn: "Abo Al-Abed spiced fries.",
    descriptionAr: "بطاط أبو العبد المتبل.",
    categorySlug: "appetizers",
    featured: false,
    imageUrl: fallbackMenuImageUrls[2],
    variants: [{ sku: "FRIES-BOX", nameEn: "Regular", nameAr: "عادي", price: 8 }],
    modifiers: ["sauce-choice"],
    tags: ["sides"],
  },
  {
    slug: "soft-drinks",
    nameEn: "Soft Drinks",
    nameAr: "المشروبات الغازية",
    descriptionEn: "Cold canned soft drink.",
    descriptionAr: "مشروب غازي بارد.",
    categorySlug: "drinks",
    featured: false,
    imageUrl: fallbackMenuImageUrls[3],
    variants: [{ sku: "SOFT-DRINK", nameEn: "Can", nameAr: "علبة", price: 5 }],
    modifiers: [],
    tags: ["drink"],
  },
);

const extraMenuSeeds = ([
    ["baby-tawook", "Baby Tawook", "بيبي طاووق", "baby-size", 14],
    ["baby-meat-kebab", "Baby Meat Kebab", "بيبي كباب لحم", "baby-size", 14],
    ["kebab-sandwich-meal", "Meat Kebab Sandwich Meal", "وجبة ساندوتش كباب لحم", "meals", 31],
    ["tawook-sandwich-meal", "Tawook Sandwich Meal", "وجبة ساندوتش طاووق", "meals", 30],
    ["musahab-sandwich-meal", "Musahab Sandwich Meal", "وجبة ساندوتش مسحب", "meals", 30],
    ["makanek-sandwich", "Makanek Sandwich", "مقانق أبو العبد", "meals", 22],
    ["tawook-grill-meal", "Tawook Grill Meal", "وجبة مشويات طاووق", "meals", 45],
    ["meat-kebab-grill-meal", "Meat Kebab Grill Meal", "وجبة مشويات كباب", "meals", 50],
    ["abo-farooj", "Abu Al-Abed Farooj", "فروج أبو العبد", "meals", 60],
    ["abodi-meat-kebab", "Abodi Meat Kebab", "عبودي كباب لحم", "el-abodi", 20],
    ["abodi-tawook", "Abodi Tawook", "عبودي طاووق", "el-abodi", 15],
    ["spicy-chicken-kebab-sandwich", "Spicy Chicken Kebab Sandwich", "ساندوتش كباب دجاج سبايسي", "sandwiches", 18],
    ["spicy-tawook-sandwich", "Spicy Tawook Sandwich", "ساندوتش طاووق سبايسي", "sandwiches", 18],
    ["spicy-musahab-sandwich", "Spicy Musahab Sandwich", "ساندوتش مسحب سبايسي", "sandwiches", 18],
    ["meat-kebab-sandwich", "Meat Kebab Sandwich", "ساندوتش كباب لحم", "sandwiches", 20],
    ["protein-tawook-sandwich", "Protein Tawook Sandwich", "بروتين طاووق", "sandwiches", 25],
    ["protein-musahab-sandwich", "Protein Musahab Sandwich", "بروتين مسحب", "sandwiches", 25],
    ["abo-wings", "Abu Al-Abed Wings", "جوانح أبو العبد", "sandwiches", 23],
    ["fattoush", "Fattoush", "فتوش", "appetizers", 15],
    ["tabbouleh", "Tabbouleh", "تبولة", "appetizers", 15],
    ["moutabal", "Moutabal", "متبل", "appetizers", 15],
    ["large-sauce", "Large Sauce", "صوص كبير", "appetizers", 7],
  ] as const).map(([slug, nameEn, nameAr, categorySlug, price], index) => ({
    slug,
    nameEn,
    nameAr,
    descriptionEn: `${nameEn} from the Farooj Abu Al-Abed UAE menu.`,
    descriptionAr: `${nameAr} من منيو فروج أبو العبد الإمارات.`,
    categorySlug,
    featured: index < 4,
    imageUrl: fallbackMenuImageUrls[index % fallbackMenuImageUrls.length],
    variants: [{ sku: String(slug).toUpperCase().replace(/-/g, "-"), nameEn: "Regular", nameAr: "عادي", price: Number(price) }],
    modifiers: categorySlug === "appetizers" ? [] : ["spice-level", "sauce-choice"],
    tags: categorySlug === "appetizers" ? ["sides"] : ["quick"],
  }));

productSeeds.push(...extraMenuSeeds);

for (const [index, productSeed] of productSeeds.entries()) {
  productSeed.imageUrl = localMenuImageUrls[index % localMenuImageUrls.length];
}

async function main() {
  const passwordHash = await bcrypt.hash("ChangeMe123!", 10);

  await prisma.$transaction([
    prisma.adminAction.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.notificationTemplate.deleteMany(),
    prisma.favorite.deleteMany(),
    prisma.recentOrder.deleteMany(),
    prisma.paymentRecord.deleteMany(),
    prisma.pickupCode.deleteMany(),
    prisma.orderStatusHistory.deleteMany(),
    prisma.orderItemModifier.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.homeBanner.deleteMany(),
    prisma.branchProductAvailability.deleteMany(),
    prisma.productTagLink.deleteMany(),
    prisma.productTag.deleteMany(),
    prisma.featuredCollectionProduct.deleteMany(),
    prisma.featuredCollection.deleteMany(),
    prisma.productModifierLink.deleteMany(),
    prisma.modifierOption.deleteMany(),
    prisma.modifierGroup.deleteMany(),
    prisma.productVariant.deleteMany(),
    prisma.productImage.deleteMany(),
    prisma.product.deleteMany(),
    prisma.menuCategory.deleteMany(),
    prisma.branchDevice.deleteMany(),
    prisma.branchStaffAssignment.deleteMany(),
    prisma.branchSetting.deleteMany(),
    prisma.branchException.deleteMany(),
    prisma.branchHour.deleteMany(),
    prisma.branch.deleteMany(),
    prisma.roleAssignment.deleteMany(),
    prisma.rolePermission.deleteMany(),
    prisma.permission.deleteMany(),
    prisma.role.deleteMany(),
    prisma.deviceToken.deleteMany(),
    prisma.userAddress.deleteMany(),
    prisma.userSession.deleteMany(),
    prisma.staffProfile.deleteMany(),
    prisma.customerProfile.deleteMany(),
    prisma.inAppAnnouncement.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const permissions = [
    "orders.read",
    "orders.manage",
    "catalog.manage",
    "branches.manage",
    "users.manage",
    "reports.read",
    "audit.read",
    "payments.confirm",
  ];

  for (const code of permissions) {
    await prisma.permission.create({
      data: {
        code,
        description: code.replace(".", " "),
      },
    });
  }

  const roleMap = {
    super_admin: permissions,
    ops_manager: ["orders.read", "orders.manage", "catalog.manage", "branches.manage", "reports.read", "audit.read"],
    branch_manager: ["orders.read", "orders.manage", "payments.confirm"],
    cashier: ["orders.read", "payments.confirm"],
    kitchen_staff: ["orders.read", "orders.manage"],
    support_readonly: ["orders.read", "reports.read"],
  } satisfies Record<string, string[]>;

  for (const [name, granted] of Object.entries(roleMap)) {
    const role = await prisma.role.create({
      data: {
        name,
        description: `${name} role`,
      },
    });

    for (const permissionCode of granted) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { code: permissionCode },
      });

      await prisma.rolePermission.create({
        data: {
          roleId: role.id,
          permissionId: permission.id,
        },
      });
    }
  }

  const branches = [];

  for (const branchSeed of branchSeeds) {
    const branch = await prisma.branch.create({
      data: {
        ...branchSeed,
        settings: {
          create: {
            unpaidExpiryMinutes: 60,
            queueSlackMinutes: 10,
          },
        },
        hours: {
          createMany: {
            data: Array.from({ length: 7 }, (_, weekday) => ({
              weekday,
              opensAt: "10:00",
              closesAt: "23:59",
              isClosed: false,
            })),
          },
        },
        devices: {
          create: [
            { code: `${branchSeed.code}-C1`, type: BranchDeviceType.CASHIER_TERMINAL, description: "Primary cashier desk" },
            { code: `${branchSeed.code}-K1`, type: BranchDeviceType.KITCHEN_DISPLAY, description: "Kitchen display" },
          ],
        },
      },
    });

    branches.push(branch);
  }

  const categoryMap = new Map<string, string>();

  for (const categorySeed of categorySeeds) {
    const category = await prisma.menuCategory.create({ data: categorySeed });
    categoryMap.set(category.slug, category.id);
  }

  const tagMap = new Map<string, string>();
  for (const tag of ["featured", "best-seller", "quick", "meal", "family", "sides", "drink"]) {
    const created = await prisma.productTag.create({
      data: {
        code: tag,
        labelEn: tag.replace("-", " "),
        labelAr: tag,
      },
    });
    tagMap.set(tag, created.id);
  }

  const modifierMap = new Map<string, string>();
  for (const [index, group] of modifierGroups.entries()) {
    const created = await prisma.modifierGroup.create({
      data: {
        code: group.code,
        nameEn: group.nameEn,
        nameAr: group.nameAr,
        minSelections: group.minSelections,
        maxSelections: group.maxSelections,
        isRequired: group.isRequired,
        displayOrder: index + 1,
        options: {
          create: group.options.map((option, optionIndex) => ({
            code: option.code,
            nameEn: option.nameEn,
            nameAr: option.nameAr,
            isDefault: option.isDefault,
            displayOrder: optionIndex + 1,
            priceDelta: new Prisma.Decimal(option.priceDelta),
          })),
        },
      },
    });

    modifierMap.set(group.code, created.id);
  }

  const featuredCollection = await prisma.featuredCollection.create({
    data: {
      slug: "pickup-favorites",
      titleEn: "Pickup Favorites",
      titleAr: "مفضلات الاستلام",
      subtitleEn: "Fast-moving items inspired by the KFC-style home journey.",
      subtitleAr: "أصناف سريعة ومميزة لرحلة الطلب الرئيسية.",
      theme: "warm",
      displayOrder: 1,
    },
  });

  for (const productSeed of productSeeds) {
    const product = await prisma.product.create({
      data: {
        slug: productSeed.slug,
        nameEn: productSeed.nameEn,
        nameAr: productSeed.nameAr,
        descriptionEn: productSeed.descriptionEn,
        descriptionAr: productSeed.descriptionAr,
        categoryId: categoryMap.get(productSeed.categorySlug)!,
        isFeatured: productSeed.featured,
        status: ProductStatus.ACTIVE,
        images: {
          create: [
            {
              url: productSeed.imageUrl,
              altEn: productSeed.nameEn,
              altAr: productSeed.nameAr,
              displayOrder: 1,
              isPrimary: true,
            },
          ],
        },
        variants: {
          create: productSeed.variants.map((variant, index) => ({
            sku: variant.sku,
            nameEn: variant.nameEn,
            nameAr: variant.nameAr,
            price: new Prisma.Decimal(variant.price),
            isDefault: index === 0,
          })),
        },
      },
    });

    for (const tag of productSeed.tags) {
      await prisma.productTagLink.create({
        data: {
          productId: product.id,
          tagId: tagMap.get(tag)!,
        },
      });
    }

    for (const [index, code] of productSeed.modifiers.entries()) {
      await prisma.productModifierLink.create({
        data: {
          productId: product.id,
          modifierGroupId: modifierMap.get(code)!,
          displayOrder: index + 1,
        },
      });
    }

    if (productSeed.featured) {
      await prisma.featuredCollectionProduct.create({
        data: {
          collectionId: featuredCollection.id,
          productId: product.id,
          displayOrder: productSeed.tags.includes("featured") ? 1 : 2,
        },
      });
    }

    for (const branch of branches) {
      await prisma.branchProductAvailability.create({
        data: {
          branchId: branch.id,
          productId: product.id,
          status: AvailabilityStatus.AVAILABLE,
        },
      });
    }
  }

  await prisma.homeBanner.createMany({
    data: [
      {
        titleEn: "Self Pickup, Zero Waiting",
        titleAr: "استلام ذاتي بدون انتظار",
        subtitleEn: "Order ahead, pay at the branch, and collect with your pickup code.",
        subtitleAr: "اطلب مسبقاً وادفع في الفرع واستلم باستخدام كود الطلب.",
        imageUrl: localMenuImageUrls[0],
        ctaLabelEn: "Order Now",
        ctaLabelAr: "اطلب الآن",
        ctaTarget: "/menu",
        theme: "promo",
        displayOrder: 1,
      },
      {
        titleEn: "Golden Sandwich Collection",
        titleAr: "مجموعة الساندوتش الذهبي",
        subtitleEn: "Warm, bold, and built for repeat orders.",
        subtitleAr: "نَكهات دافئة وجريئة لطلبات متكررة.",
        imageUrl: localMenuImageUrls[1],
        ctaLabelEn: "Explore Menu",
        ctaLabelAr: "استكشف المنيو",
        ctaTarget: "/menu?category=golden-sandwich",
        theme: "warm",
        displayOrder: 2,
      },
    ],
  });

  await prisma.notificationTemplate.createMany({
    data: [
      { eventKey: "order.created", channel: NotificationChannel.PUSH, title: "Order Received", body: "Your order is waiting for in-branch payment." },
      { eventKey: "order.payment_confirmed", channel: NotificationChannel.PUSH, title: "Payment Confirmed", body: "Your order is now in preparation." },
      { eventKey: "order.in_preparation", channel: NotificationChannel.PUSH, title: "Preparing Order", body: "Your pickup order is being prepared." },
      { eventKey: "order.ready", channel: NotificationChannel.PUSH, title: "Ready for Pickup", body: "Your order is ready at the selected branch." },
      { eventKey: "order.cancelled", channel: NotificationChannel.PUSH, title: "Order Updated", body: "Your order status has changed." },
    ],
  });

  await prisma.inAppAnnouncement.create({
    data: {
      titleEn: "Fresh launch collection",
      titleAr: "إطلاق المجموعة الجديدة",
      bodyEn: "Try the new pickup flow and reorder your favorites in seconds.",
      bodyAr: "جرّب تجربة الاستلام الجديدة وأعد طلب مفضلاتك خلال ثوانٍ.",
      startsAt: new Date(),
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      email: "customer@aboalabed.ae",
      passwordHash,
      status: UserStatus.ACTIVE,
      customerProfile: {
        create: {
          firstName: "Demo",
          lastName: "Customer",
          phoneE164: "+971500000001",
        },
      },
      addresses: {
        create: [
          {
            label: AddressLabel.HOME,
            line1: "Port Saeed Residential Tower",
            city: "Dubai",
            emirate: "Dubai",
            latitude: 25.2665,
            longitude: 55.3334,
            isDefault: true,
          },
          {
            label: AddressLabel.OFFICE,
            line1: "Business Bay Bay Square",
            city: "Dubai",
            emirate: "Dubai",
            latitude: 25.1865,
            longitude: 55.2787,
            isDefault: false,
          },
        ],
      },
    },
  });

  const staffSeeds = [
    { email: "admin@aboalabed.ae", firstName: "Sara", lastName: "Admin", role: "super_admin", branchCode: "DXB-BVV" },
    { email: "cashier@aboalabed.ae", firstName: "Omar", lastName: "Cashier", role: "cashier", branchCode: "DXB-BVV" },
    { email: "kitchen@aboalabed.ae", firstName: "Lina", lastName: "Kitchen", role: "kitchen_staff", branchCode: "DXB-BVV" },
  ];

  for (const staff of staffSeeds) {
    const branch = branches.find((entry) => entry.code === staff.branchCode)!;
    const user = await prisma.user.create({
      data: {
        email: staff.email,
        passwordHash,
        status: UserStatus.ACTIVE,
        staffProfile: {
          create: {
            firstName: staff.firstName,
            lastName: staff.lastName,
            status: StaffStatus.ACTIVE,
            primaryBranchId: branch.id,
          },
        },
      },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { name: staff.role } });

    await prisma.roleAssignment.create({
      data: {
        userId: user.id,
        roleId: role.id,
        branchId: branch.id,
      },
    });

    await prisma.branchStaffAssignment.create({
      data: {
        branchId: branch.id,
        userId: user.id,
        title: staff.role,
        isPrimary: true,
      },
    });
  }

  await prisma.favorite.createMany({
    data: (await prisma.product.findMany({ take: 2 })).map((product) => ({
      customerId: customerUser.id,
      productId: product.id,
    })),
  });

  console.log("Seed completed");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
