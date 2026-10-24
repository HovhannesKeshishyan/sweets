/**
 * DEVELOPMENT SAMPLE DATA ONLY. Used by `npm run seed`, which refuses to run
 * with NODE_ENV=production. Prices are in minor units (cents).
 */

const img = (name: string, alt: string) => ({
  url: `/images/seed/${name}.svg`,
  alt,
  provider: "external" as const,
  width: 800,
  height: 1000,
});
const catImg = (name: string, alt: string) => ({
  url: `/images/seed/${name}.svg`,
  alt,
  provider: "external" as const,
  width: 800,
  height: 600,
});

export const seedCategories = [
  {
    name: "Truffles",
    slug: "truffles",
    sortOrder: 1,
    description: "Hand-rolled ganache, dusted, dipped and finished by hand.",
    image: catImg("cat-truffles", "Three cocoa-dusted truffles"),
  },
  {
    name: "Bars",
    slug: "bars",
    sortOrder: 2,
    description: "Single-origin and inclusion bars, tempered for a clean snap.",
    image: catImg("cat-bars", "A dark chocolate bar in gold foil"),
  },
  {
    name: "Bonbons",
    slug: "bonbons",
    sortOrder: 3,
    description: "Glossy shells with layered, seasonal fillings.",
    image: catImg("cat-bonbons", "Glossy chocolate bonbons"),
  },
  {
    name: "Caramels & Toffee",
    slug: "caramels",
    sortOrder: 4,
    description: "Slow-cooked caramels, cut and wrapped by hand.",
    image: catImg("cat-caramels", "Wrapped soft caramels"),
  },
  {
    name: "Gift Boxes",
    slug: "gift-boxes",
    sortOrder: 5,
    description: "Curated assortments, boxed and ribboned.",
    image: catImg("cat-gifts", "A ribboned chocolate gift box"),
  },
] as const;

type CategorySlug = (typeof seedCategories)[number]["slug"];

export interface SeedProduct {
  name: string;
  slug: string;
  sku: string;
  category: CategorySlug;
  price: number;
  compareAtPrice?: number;
  stock: number;
  isFeatured?: boolean;
  tags: string[];
  shortDescription: string;
  description: string;
  ingredients: string;
  allergens: string[];
  weightGrams: number;
  images: ReturnType<typeof img>[];
}

export const seedProducts: SeedProduct[] = [
  {
    name: "Grand Cru Dark Truffles",
    slug: "grand-cru-dark-truffles",
    sku: "TRF-DARK-12",
    category: "truffles",
    price: 2800,
    stock: 40,
    isFeatured: true,
    tags: ["bestseller", "gift"],
    shortDescription:
      "Twelve 70% Ecuadorian ganache truffles rolled in raw cocoa.",
    description:
      "Our signature truffle: a slow-set ganache of 70% Ecuadorian cacao and cultured cream, hand-rolled and finished in raw cocoa powder. Deep, fruity and long on the palate.",
    ingredients:
      "Dark chocolate (cocoa mass, cane sugar, cocoa butter), cream, butter, cocoa powder.",
    allergens: ["milk", "soy"],
    weightGrams: 180,
    images: [img("truffles-dark", "Three dark cocoa-dusted truffles")],
  },
  {
    name: "Champagne Truffles",
    slug: "champagne-truffles",
    sku: "TRF-CHAMP-9",
    category: "truffles",
    price: 3200,
    stock: 18,
    isFeatured: true,
    tags: ["celebration", "gift"],
    shortDescription:
      "White ganache with Marc de Champagne, dusted in icing sugar.",
    description:
      "A celebratory truffle of white chocolate ganache infused with Marc de Champagne, enrobed in white chocolate and rolled in icing sugar.",
    ingredients:
      "White chocolate (sugar, cocoa butter, milk powder, vanilla), cream, Marc de Champagne, icing sugar.",
    allergens: ["milk"],
    weightGrams: 135,
    images: [
      img("truffles-champagne", "Pale champagne truffles on a dark background"),
    ],
  },
  {
    name: "Raspberry Rose Truffles",
    slug: "raspberry-rose-truffles",
    sku: "TRF-RASP-9",
    category: "truffles",
    price: 2600,
    compareAtPrice: 3000,
    stock: 4,
    tags: ["seasonal", "fruit"],
    shortDescription: "Tart raspberry ganache with a whisper of rose.",
    description:
      "Raspberry purée and milk chocolate, lifted with rose water and dusted in freeze-dried raspberry. Bright, floral and a little indulgent.",
    ingredients:
      "Milk chocolate (sugar, cocoa butter, milk powder, cocoa mass), raspberry purée, cream, rose water, freeze-dried raspberry.",
    allergens: ["milk", "soy"],
    weightGrams: 135,
    images: [img("truffles-raspberry", "Raspberry pink truffles")],
  },
  {
    name: "Matcha Truffles",
    slug: "matcha-truffles",
    sku: "TRF-MATCHA-9",
    category: "truffles",
    price: 2600,
    stock: 0,
    tags: ["tea"],
    shortDescription: "Ceremonial-grade matcha in white chocolate ganache.",
    description:
      "Grassy, sweet and gently bitter — Uji ceremonial matcha whisked into white chocolate ganache, rolled in more matcha.",
    ingredients: "White chocolate, cream, matcha green tea.",
    allergens: ["milk"],
    weightGrams: 135,
    images: [img("truffles-matcha", "Green matcha truffles")],
  },
  {
    name: "Madagascar 72% Bar",
    slug: "madagascar-72-bar",
    sku: "BAR-MAD-72",
    category: "bars",
    price: 1100,
    stock: 60,
    isFeatured: true,
    tags: ["single-origin", "vegan"],
    shortDescription: "Bright red-fruit notes from the Sambirano valley.",
    description:
      "A two-ingredient-forward bar from Sambirano valley cacao, conched for 48 hours. Expect raspberry, citrus and a clean, lingering finish.",
    ingredients: "Cocoa beans, cane sugar, cocoa butter.",
    allergens: [],
    weightGrams: 70,
    images: [img("bar-dark", "A dark chocolate bar half wrapped in gold foil")],
  },
  {
    name: "Hazelnut Milk Bar",
    slug: "hazelnut-milk-bar",
    sku: "BAR-HAZ-45",
    category: "bars",
    price: 1000,
    stock: 45,
    tags: ["nuts"],
    shortDescription: "45% milk chocolate with roasted Piedmont hazelnuts.",
    description:
      "Creamy 45% milk chocolate studded with whole roasted Piedmont hazelnuts. Caramel, toasted nut and a soft melt.",
    ingredients:
      "Milk chocolate (cocoa butter, sugar, milk powder, cocoa mass), hazelnuts.",
    allergens: ["milk", "hazelnut"],
    weightGrams: 80,
    images: [img("bar-milk", "A milk chocolate bar in a dark wrapper")],
  },
  {
    name: "Sea Salt & Cacao Nib Bar",
    slug: "sea-salt-cacao-nib-bar",
    sku: "BAR-SALT-68",
    category: "bars",
    price: 1050,
    stock: 3,
    tags: ["vegan", "bestseller"],
    shortDescription: "Crunchy nibs and Maldon flakes in 68% dark.",
    description:
      "Our 68% house blend scattered with roasted cacao nibs and Maldon sea salt for a savoury crunch.",
    ingredients: "Cocoa beans, cane sugar, cocoa butter, cacao nibs, sea salt.",
    allergens: [],
    weightGrams: 70,
    images: [img("bar-sea-salt", "A dark bar with a white wrapper")],
  },
  {
    name: "Caramelised White Bar",
    slug: "caramelised-white-bar",
    sku: "BAR-BLOND",
    category: "bars",
    price: 1050,
    stock: 30,
    tags: ["new"],
    shortDescription:
      "Slow-roasted white chocolate with biscuit and butterscotch notes.",
    description:
      "White chocolate roasted low and slow until golden. Tastes of shortbread, dulce de leche and a pinch of salt.",
    ingredients: "Cocoa butter, sugar, milk powder, vanilla, salt.",
    allergens: ["milk"],
    weightGrams: 70,
    images: [img("bar-white", "A golden white chocolate bar")],
  },
  {
    name: "Jewel Bonbon Collection",
    slug: "jewel-bonbon-collection",
    sku: "BON-JEWEL-16",
    category: "bonbons",
    price: 4200,
    stock: 20,
    isFeatured: true,
    tags: ["gift", "bestseller"],
    shortDescription: "Sixteen hand-painted bonbons with seasonal fillings.",
    description:
      "Our most beautiful box: sixteen bonbons with hand-painted cocoa-butter shells. Fillings change with the seasons — passion fruit, salted praline, black-currant and more.",
    ingredients:
      "Dark and milk chocolate, cream, fruit purées, hazelnuts, almonds, butter, natural colourings.",
    allergens: ["milk", "hazelnut", "almond", "soy"],
    weightGrams: 200,
    images: [img("bonbons-jewel", "Glossy jewel-coloured bonbons")],
  },
  {
    name: "Praline Bonbons",
    slug: "praline-bonbons",
    sku: "BON-PRAL-9",
    category: "bonbons",
    price: 2400,
    compareAtPrice: 2800,
    stock: 25,
    tags: ["nuts"],
    shortDescription: "Nine crisp hazelnut and almond pralinés.",
    description:
      "Caramelised hazelnuts and almonds ground into a silky praliné with feuilletine crunch, set in a thin dark shell.",
    ingredients:
      "Dark chocolate, hazelnuts, almonds, sugar, feuilletine (wheat flour, butter).",
    allergens: ["hazelnut", "almond", "gluten", "milk"],
    weightGrams: 110,
    images: [img("bonbons-praline", "Praline bonbons on a dark background")],
  },
  {
    name: "Salted Butter Caramels",
    slug: "salted-butter-caramels",
    sku: "CAR-SALT-20",
    category: "caramels",
    price: 1600,
    stock: 50,
    isFeatured: true,
    tags: ["bestseller"],
    shortDescription: "Twenty soft Breton-style caramels with fleur de sel.",
    description:
      "Cooked in copper with cultured Breton butter and finished with fleur de sel from Guérande. Soft, chewy and deeply buttery.",
    ingredients: "Cream, sugar, glucose, butter, fleur de sel, vanilla.",
    allergens: ["milk"],
    weightGrams: 200,
    images: [img("caramels-salted", "Hand-wrapped caramels")],
  },
  {
    name: "Wildflower Honey Toffee",
    slug: "wildflower-honey-toffee",
    sku: "CAR-HONEY-20",
    category: "caramels",
    price: 1500,
    stock: 35,
    tags: ["new"],
    shortDescription:
      "Golden, chewy toffee sweetened with local wildflower honey.",
    description:
      "A slightly firmer toffee made with wildflower honey from a neighbouring apiary and a touch of brown butter.",
    ingredients: "Cream, sugar, honey, butter, salt.",
    allergens: ["milk"],
    weightGrams: 200,
    images: [img("caramels-honey", "Golden toffees in white wrappers")],
  },
  {
    name: "The Signature Box",
    slug: "the-signature-box",
    sku: "GFT-SIG-24",
    category: "gift-boxes",
    price: 6800,
    stock: 15,
    isFeatured: true,
    tags: ["gift", "bestseller"],
    shortDescription:
      "Twenty-four of our favourites in a gold-ribboned keepsake box.",
    description:
      "A tour of the house: truffles, bonbons, pralinés and caramels, arranged in a cocoa-brown keepsake box with a gold silk ribbon. Includes a tasting card.",
    ingredients: "Assorted chocolates. See tasting card for details.",
    allergens: ["milk", "hazelnut", "almond", "soy", "gluten"],
    weightGrams: 320,
    images: [img("gift-signature", "A dark gift box with a gold ribbon")],
  },
  {
    name: "Ivory Celebration Box",
    slug: "ivory-celebration-box",
    sku: "GFT-IVORY-16",
    category: "gift-boxes",
    price: 5200,
    stock: 12,
    tags: ["gift", "celebration"],
    shortDescription: "Champagne truffles and white bonbons in an ivory box.",
    description:
      "Made for weddings and milestones: champagne truffles, caramelised-white bonbons and raspberry rose truffles in an ivory box with a burgundy ribbon.",
    ingredients: "Assorted chocolates. See tasting card for details.",
    allergens: ["milk", "soy"],
    weightGrams: 220,
    images: [img("gift-ivory", "An ivory gift box with a burgundy ribbon")],
  },
  {
    name: "Discovery Tasting Box",
    slug: "discovery-tasting-box",
    sku: "GFT-DISC-6",
    category: "gift-boxes",
    price: 3600,
    compareAtPrice: 4200,
    stock: 22,
    tags: ["gift", "single-origin"],
    shortDescription: "Six single-origin squares with tasting notes.",
    description:
      "Six origins, side by side — Madagascar, Ecuador, Peru, Vietnam, Tanzania and Belize — with a card to guide you through each.",
    ingredients: "Cocoa beans, cane sugar, cocoa butter.",
    allergens: [],
    weightGrams: 120,
    images: [img("gift-discovery", "A brown gift box with a pale gold ribbon")],
  },
  {
    name: "Drinking Chocolate",
    slug: "drinking-chocolate",
    sku: "DRK-70",
    category: "bars",
    price: 1800,
    stock: 28,
    tags: ["gift"],
    shortDescription: "Shaved 70% chocolate for a thick, Parisian-style cup.",
    description:
      "Not a powder — real 70% chocolate shaved into flakes. Whisk into hot milk for a thick, velvety cup. Makes about ten servings.",
    ingredients: "Cocoa mass, cane sugar, cocoa butter.",
    allergens: [],
    weightGrams: 250,
    images: [img("hot-chocolate", "A cup of hot chocolate")],
  },
];

export const seedCoupons = [
  {
    code: "WELCOME10",
    type: "percentage" as const,
    value: 10,
    description: "Sample: 10% off everything",
    minOrderAmount: 0,
  },
  {
    code: "GIFT15",
    type: "percentage" as const,
    value: 15,
    description: "Sample: 15% off gift boxes",
    minOrderAmount: 5000,
    categories: ["gift-boxes"] as CategorySlug[],
  },
  {
    code: "SWEET5",
    type: "fixed" as const,
    value: 500,
    description: "Sample: $5 off, first 100 uses",
    minOrderAmount: 3000,
    usageLimit: 100,
  },
];

export const seedSettings = {
  storeName: "Veloura Sweets",
  contactEmail: "hello@example.com",
  currency: "USD",
  shipping: {
    flatRate: 700,
    freeShippingThreshold: 7500,
    allowedCountries: [] as string[],
  },
};
