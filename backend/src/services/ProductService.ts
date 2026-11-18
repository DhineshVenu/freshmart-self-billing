import Product, { IProduct } from "../models/Product.js";
import { SupermarketDomain } from "../utils/SupermarketDomain.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";

/**
 * Service class for Product inventory management and lookup.
 * Demonstrates OOP Encapsulation and Automatic Database Seeding.
 */
@Singleton
export class ProductService {
  /**
   * Seed default supermarket inventory if database is empty.
   */
  /**
   * Seed 30 realistic supermarket products across 6 core categories with full
   * extended fields (wayfinding, nutrition, clearance pricing, and stock).
   */
  public async seedDefaultProducts(force: boolean = false): Promise<void> {
    const count = await Product.countDocuments();
    if (count === 0 || force) {
      if (force) {
        await Product.deleteMany({});
      }
      console.log("🌱 Seeding 30 realistic supermarket products with full metadata...");
      
      const twoDaysFromNow = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
      const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
      const oneDayFromNow = new Date(Date.now() + 1 * 24 * 60 * 60 * 1000);

      await Product.insertMany([
        // ─── DAIRY ────────────────────────────────────────────────────────
        {
          barcode: "8901",
          name: "Amul Taaza Homogenised Toned Milk",
          category: "Dairy",
          unit: "1 Litre",
          description: "Fresh premium toned milk, calcium rich",
          price: 65.0,
          stockQty: 45,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1563636619-e9143da7973b?w=200",
          aisle: "Aisle 3 - Dairy",
          shelf: "Shelf A",
          bay: 1,
          mapCoordinates: { x: 45, y: 30 },
          nutriScore: "A",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 58,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8907",
          name: "Amul Salted Butter Block",
          category: "Dairy",
          unit: "500 g",
          description: "Pasteurised table butter made from fresh cream",
          price: 275.0,
          stockQty: 35,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?w=200",
          aisle: "Aisle 3 - Dairy",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 45, y: 55 },
          nutriScore: "D",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 717,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8911",
          name: "Epigamia Greek Yogurt Natural",
          category: "Dairy",
          unit: "200 g",
          description: "Thick and creamy high-protein Greek yogurt",
          price: 90.0,
          stockQty: 20,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=200",
          aisle: "Aisle 3 - Dairy",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 45, y: 40 },
          nutriScore: "A",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian", "High-Protein"],
          calories: 130,
          expiryDate: twoDaysFromNow,
          clearanceDiscountPercent: 25,
        },
        {
          barcode: "8912",
          name: "Amul Malai Fresh Paneer",
          category: "Dairy",
          unit: "200 g",
          description: "Soft and fresh cottage cheese block",
          price: 95.0,
          stockQty: 15,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=200",
          aisle: "Aisle 3 - Dairy",
          shelf: "Shelf C",
          bay: 1,
          mapCoordinates: { x: 45, y: 70 },
          nutriScore: "B",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 265,
          expiryDate: threeDaysFromNow,
          clearanceDiscountPercent: 20,
        },
        {
          barcode: "8913",
          name: "English Cheddar Cheese Slices",
          category: "Dairy",
          unit: "200 g",
          description: "Aged creamy processed cheddar cheese slices",
          price: 185.0,
          stockQty: 25,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1618160702438-9b02ab6515c9?w=200",
          aisle: "Aisle 3 - Dairy",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 45, y: 45 },
          nutriScore: "D",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 390,
          clearanceDiscountPercent: 0,
        },

        // ─── BAKERY ───────────────────────────────────────────────────────
        {
          barcode: "8902",
          name: "Britannia 100% Whole Wheat Bread",
          category: "Bakery",
          unit: "400 g",
          description: "Freshly baked whole wheat sandwich bread",
          price: 45.0,
          stockQty: 30,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=200",
          aisle: "Aisle 2 - Bakery",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 30, y: 40 },
          nutriScore: "B",
          allergens: ["Gluten"],
          dietaryFlags: ["Vegetarian"],
          calories: 240,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8914",
          name: "Multigrain Artisan Sourdough Bread",
          category: "Bakery",
          unit: "350 g",
          description: "Slow-fermented crusty rustic sourdough loaf",
          price: 75.0,
          stockQty: 12,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1589367920969-ab8e050bbb04?w=200",
          aisle: "Aisle 2 - Bakery",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 30, y: 25 },
          nutriScore: "A",
          allergens: ["Gluten"],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 210,
          expiryDate: oneDayFromNow,
          clearanceDiscountPercent: 30,
        },
        {
          barcode: "8915",
          name: "Fresh Blueberry Muffins (Pack of 4)",
          category: "Bakery",
          unit: "240 g",
          description: "Moist bakery muffins bursting with wild blueberries",
          price: 140.0,
          stockQty: 18,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1607958996333-41aef7caefaa?w=200",
          aisle: "Aisle 2 - Bakery",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 30, y: 55 },
          nutriScore: "D",
          allergens: ["Gluten", "Milk", "Eggs"],
          dietaryFlags: ["Vegetarian"],
          calories: 380,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8916",
          name: "Butter French Croissants (Pack of 2)",
          category: "Bakery",
          unit: "150 g",
          description: "Flaky golden Viennoiserie all-butter croissants",
          price: 120.0,
          stockQty: 16,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=200",
          aisle: "Aisle 2 - Bakery",
          shelf: "Shelf C",
          bay: 1,
          mapCoordinates: { x: 30, y: 70 },
          nutriScore: "D",
          allergens: ["Gluten", "Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 410,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8931",
          name: "Oatmeal Raisin Soft Cookies",
          category: "Bakery",
          unit: "200 g",
          description: "Chewy whole rolled oat cookies with sweet raisins",
          price: 95.0,
          stockQty: 25,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=200",
          aisle: "Aisle 2 - Bakery",
          shelf: "Shelf C",
          bay: 2,
          mapCoordinates: { x: 30, y: 80 },
          nutriScore: "C",
          allergens: ["Gluten"],
          dietaryFlags: ["Vegetarian"],
          calories: 320,
          clearanceDiscountPercent: 0,
        },

        // ─── PRODUCE ──────────────────────────────────────────────────────
        {
          barcode: "8903",
          name: "Fresh Shimla Royal Apples",
          category: "Produce",
          unit: "1 kg",
          description: "Sweet and crunchy handpicked orchard apples",
          price: 180.0,
          stockQty: 25,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=200",
          aisle: "Aisle 1 - Produce",
          shelf: "Shelf A",
          bay: 1,
          mapCoordinates: { x: 15, y: 20 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 52,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8917",
          name: "Organic Robusta Bananas",
          category: "Produce",
          unit: "1 kg",
          description: "Naturally ripened sweet potassium-rich bananas",
          price: 60.0,
          stockQty: 40,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=200",
          aisle: "Aisle 1 - Produce",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 15, y: 40 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan", "Organic"],
          calories: 89,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8918",
          name: "Fresh Hydroponic Baby Spinach",
          category: "Produce",
          unit: "250 g",
          description: "Crisp pesticide-free tender baby spinach leaves",
          price: 55.0,
          stockQty: 20,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1576045057995-568f588f82fb?w=200",
          aisle: "Aisle 1 - Produce",
          shelf: "Shelf C",
          bay: 2,
          mapCoordinates: { x: 15, y: 70 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan", "Organic"],
          calories: 23,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8919",
          name: "Vine-Ripened Red Tomatoes",
          category: "Produce",
          unit: "1 kg",
          description: "Juicy farm-fresh salad and cooking tomatoes",
          price: 45.0,
          stockQty: 50,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=200",
          aisle: "Aisle 1 - Produce",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 15, y: 30 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 18,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8920",
          name: "Baby Gold Potatoes",
          category: "Produce",
          unit: "1 kg",
          description: "Thin-skinned tender baby roasting potatoes",
          price: 50.0,
          stockQty: 45,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?w=200",
          aisle: "Aisle 1 - Produce",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 15, y: 55 },
          nutriScore: "B",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 77,
          clearanceDiscountPercent: 0,
        },

        // ─── BEVERAGES ────────────────────────────────────────────────────
        {
          barcode: "8904",
          name: "Nescafé Classic 100% Pure Coffee",
          category: "Beverages",
          unit: "100 g Jar",
          description: "Rich and aromatic instant coffee powder",
          price: 320.0,
          stockQty: 18,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=200",
          aisle: "Aisle 4 - Beverages",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 60, y: 35 },
          nutriScore: "B",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 2,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8906",
          name: "Real 100% Orange Fruit Juice",
          category: "Beverages",
          unit: "1 Litre",
          description: "Natural orange juice packed with Vitamin C",
          price: 125.0,
          stockQty: 22,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1613478223719-2ab802602423?w=200",
          aisle: "Aisle 4 - Beverages",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 60, y: 50 },
          nutriScore: "C",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 110,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8921",
          name: "Twinings Pure Green Tea",
          category: "Beverages",
          unit: "25 Tea Bags",
          description: "Delicate and refreshing steamed green tea leaves",
          price: 210.0,
          stockQty: 30,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=200",
          aisle: "Aisle 4 - Beverages",
          shelf: "Shelf A",
          bay: 1,
          mapCoordinates: { x: 60, y: 20 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan", "Sugar-Free"],
          calories: 1,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8922",
          name: "Raw Pressery Cold Pressed Almond Milk",
          category: "Beverages",
          unit: "1 Litre",
          description: "Unsweetened plant-based milk enriched with calcium",
          price: 240.0,
          stockQty: 15,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1568651318492-0b4455f69c73?w=200",
          aisle: "Aisle 4 - Beverages",
          shelf: "Shelf C",
          bay: 1,
          mapCoordinates: { x: 60, y: 70 },
          nutriScore: "B",
          allergens: ["Tree Nuts"],
          dietaryFlags: ["Vegetarian", "Vegan", "Dairy-Free"],
          calories: 45,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8923",
          name: "Perrier Sparkling Natural Mineral Water",
          category: "Beverages",
          unit: "330 ml Glass Bottle",
          description: "Zero calorie natural sparkling spring water",
          price: 160.0,
          stockQty: 24,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1559839914-ba2ae647c0a9?w=200",
          aisle: "Aisle 4 - Beverages",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 60, y: 40 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan", "Sugar-Free"],
          calories: 0,
          clearanceDiscountPercent: 0,
        },

        // ─── SNACKS ───────────────────────────────────────────────────────
        {
          barcode: "8905",
          name: "Cadbury Bournville Dark Chocolate",
          category: "Snacks",
          unit: "80 g Bar",
          description: "50% Cocoa rich dark chocolate with intense taste",
          price: 110.0,
          stockQty: 50,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1549007994-cb92caebd54b?w=200",
          aisle: "Aisle 5 - Snacks",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 75, y: 45 },
          nutriScore: "D",
          allergens: ["Milk", "Soy"],
          dietaryFlags: ["Vegetarian"],
          calories: 480,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8910",
          name: "Lay's Classic Salted Potato Chips",
          category: "Snacks",
          unit: "90 g",
          description: "Crispy fried golden potatoes with light seasoning",
          price: 40.0,
          stockQty: 60,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200",
          aisle: "Aisle 5 - Snacks",
          shelf: "Shelf A",
          bay: 1,
          mapCoordinates: { x: 75, y: 25 },
          nutriScore: "D",
          allergens: [],
          dietaryFlags: ["Vegetarian"],
          calories: 540,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8924",
          name: "California Roasted & Salted Almonds",
          category: "Snacks",
          unit: "200 g",
          description: "Premium jumbo dry-roasted sea salt almonds",
          price: 299.0,
          stockQty: 35,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1508061253366-f7da158b6d46?w=200",
          aisle: "Aisle 5 - Snacks",
          shelf: "Shelf C",
          bay: 1,
          mapCoordinates: { x: 75, y: 70 },
          nutriScore: "A",
          allergens: ["Tree Nuts"],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 575,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8925",
          name: "Doritos Cheese Supreme Nacho Chips",
          category: "Snacks",
          unit: "140 g",
          description: "Crunchy corn tortilla chips with bold cheese seasoning",
          price: 70.0,
          stockQty: 45,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?w=200",
          aisle: "Aisle 5 - Snacks",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 75, y: 35 },
          nutriScore: "D",
          allergens: ["Milk"],
          dietaryFlags: ["Vegetarian"],
          calories: 510,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8926",
          name: "Kellogg's Dark Chocolate Granola Bar",
          category: "Snacks",
          unit: "6x30 g Pack",
          description: "Whole grain roasted oat snack bar with dark chocolate chips",
          price: 175.0,
          stockQty: 28,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1622484216850-25256e6d1e57?w=200",
          aisle: "Aisle 5 - Snacks",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 75, y: 55 },
          nutriScore: "C",
          allergens: ["Gluten", "Soy"],
          dietaryFlags: ["Vegetarian"],
          calories: 140,
          clearanceDiscountPercent: 0,
        },

        // ─── PANTRY ───────────────────────────────────────────────────────
        {
          barcode: "8908",
          name: "Fortune Sunlite Refined Sunflower Oil",
          category: "Pantry",
          unit: "1 Litre Pouch",
          description: "Light and healthy cooking oil rich in vitamins",
          price: 145.0,
          stockQty: 40,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf A",
          bay: 1,
          mapCoordinates: { x: 85, y: 25 },
          nutriScore: "C",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 884,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8909",
          name: "Tata Salt Vacuum Evaporated Iodized",
          category: "Pantry",
          unit: "1 kg",
          description: "Desh ka namak - pure vacuum evaporated iodized salt",
          price: 28.0,
          stockQty: 100,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1518110925495-5fe2fda0442c?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf C",
          bay: 1,
          mapCoordinates: { x: 85, y: 65 },
          nutriScore: "B",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 0,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8927",
          name: "Daawat Rozana Super Basmati Rice",
          category: "Pantry",
          unit: "5 kg Bag",
          description: "Aromatic long-grain aged traditional basmati rice",
          price: 490.0,
          stockQty: 40,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf A",
          bay: 2,
          mapCoordinates: { x: 85, y: 35 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan", "Gluten-Free"],
          calories: 350,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8928",
          name: "Barilla Penne Rigate Italian Pasta",
          category: "Pantry",
          unit: "500 g",
          description: "100% Italian durum wheat semolina non-GMO pasta",
          price: 180.0,
          stockQty: 30,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1621996346565-e3d5d6281699?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf B",
          bay: 1,
          mapCoordinates: { x: 85, y: 45 },
          nutriScore: "B",
          allergens: ["Gluten"],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 360,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8929",
          name: "Everest Garam Masala Blend",
          category: "Pantry",
          unit: "100 g Box",
          description: "Traditional blend of 13 aromatic authentic Indian spices",
          price: 85.0,
          stockQty: 50,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf C",
          bay: 2,
          mapCoordinates: { x: 85, y: 75 },
          nutriScore: "A",
          allergens: [],
          dietaryFlags: ["Vegetarian", "Vegan"],
          calories: 380,
          clearanceDiscountPercent: 0,
        },
        {
          barcode: "8930",
          name: "Nutella Hazelnut Cocoa Spread",
          category: "Pantry",
          unit: "350 g Jar",
          description: "Iconic creamy roasted hazelnut and cocoa breakfast spread",
          price: 360.0,
          stockQty: 25,
          active: true,
          imageUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=200",
          aisle: "Aisle 6 - Pantry",
          shelf: "Shelf B",
          bay: 2,
          mapCoordinates: { x: 85, y: 55 },
          nutriScore: "E",
          allergens: ["Milk", "Tree Nuts", "Soy"],
          dietaryFlags: ["Vegetarian"],
          calories: 546,
          clearanceDiscountPercent: 0,
        },
      ]);
      console.log("✅ 30 sample categorized supermarket products seeded successfully.");
    }
  }

  /**
   * Get all active inventory products.
   */
  public async getAllProducts(category?: string): Promise<IProduct[]> {
    await this.seedDefaultProducts();
    const query: Record<string, any> = { active: true };
    if (category && category !== "All") {
      query.category = category;
    }
    return Product.find(query).sort({ category: 1, name: 1 });
  }

  /**
   * Admin view: get all products including inactive ones.
   */
  public async getAllProductsAdmin(): Promise<IProduct[]> {
    await this.seedDefaultProducts();
    return Product.find().sort({ active: -1, createdAt: -1 });
  }

  /**
   * Look up an active product by its barcode.
   */
  @LogExecution
  @ValidateInput
  public async getProductByBarcode(barcode: string): Promise<IProduct> {
    await this.seedDefaultProducts();

    if (!SupermarketDomain.BarcodeEngine.isValidBarcode(barcode)) {
      throw new Error("Invalid or missing product barcode");
    }

    const normalizedBarcode = SupermarketDomain.BarcodeEngine.normalize(barcode);
    const product = await Product.findOne({
      barcode: normalizedBarcode,
      active: true,
    });

    if (!product) {
      throw new Error(`Product with barcode '${barcode}' not found in supermarket database`);
    }

    return product;
  }

  /**
   * Get a single product by ID with all extended fields (admin + public detail view).
   */
  @LogExecution
  @ValidateInput
  public async getProductWithFullDetail(id: string): Promise<IProduct> {
    const product = await Product.findById(id);
    if (!product) {
      throw new Error("Product not found.");
    }
    return product;
  }

  /**
   * Get a single product by barcode with all extended fields (shopping page detail panel).
   */
  @LogExecution
  @ValidateInput
  public async getProductDetailByBarcode(barcode: string): Promise<IProduct> {
    const normalizedBarcode = SupermarketDomain.BarcodeEngine.normalize(barcode);
    const product = await Product.findOne({ barcode: normalizedBarcode, active: true });
    if (!product) {
      // Prefix fallback
      const all = await Product.find({ active: true });
      const match = all.find((p) => normalizedBarcode.startsWith(p.barcode)) ?? null;
      if (!match) throw new Error(`Product with barcode '${barcode}' not found.`);
      return match;
    }
    return product;
  }

  /**
   * Create new product (Admin) — includes all extended fields.
   */
  @LogExecution
  public async createProduct(data: Partial<IProduct>): Promise<IProduct> {
    if (!data.barcode || !data.name || !data.price) {
      throw new Error("Barcode, product name, and price are required.");
    }

    const existing = await Product.findOne({ barcode: data.barcode.trim() });
    if (existing) {
      throw new Error(`Product with barcode '${data.barcode}' already exists.`);
    }

    if (
      data.clearanceDiscountPercent !== undefined &&
      (data.clearanceDiscountPercent < 0 || data.clearanceDiscountPercent > 100)
    ) {
      throw new Error("Clearance discount must be between 0 and 100.");
    }

    return Product.create({
      // Core fields
      barcode: data.barcode.trim(),
      name: data.name.trim(),
      category: data.category || "General",
      unit: data.unit || "",
      description: data.description || "",
      price: Number(data.price),
      stockQty: Number(data.stockQty ?? 0),
      active: data.active !== undefined ? data.active : true,
      imageUrl: data.imageUrl || "",
      storeId: data.storeId ?? null,
      // Wayfinding
      aisle: data.aisle,
      shelf: data.shelf,
      bay: data.bay,
      mapCoordinates: data.mapCoordinates,
      // Nutrition
      nutriScore: data.nutriScore,
      allergens: data.allergens ?? [],
      dietaryFlags: data.dietaryFlags ?? [],
      calories: data.calories,
      // Clearance / expiry
      expiryDate: data.expiryDate || undefined,
      clearanceDiscountPercent: data.clearanceDiscountPercent ?? 0,
    });
  }

  /**
   * Update existing product or stock (Admin) — includes all extended fields.
   */
  @LogExecution
  @ValidateInput
  public async updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    if (
      data.clearanceDiscountPercent !== undefined &&
      (data.clearanceDiscountPercent < 0 || data.clearanceDiscountPercent > 100)
    ) {
      throw new Error("Clearance discount must be between 0 and 100.");
    }
    const updated = await Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
    if (!updated) {
      throw new Error("Product not found.");
    }
    return updated;
  }

  /**
   * Soft-delete / deactivate product (Admin)
   */
  @LogExecution
  @ValidateInput
  public async deleteProduct(id: string): Promise<IProduct | null> {
    const updated = await Product.findByIdAndUpdate(id, { active: false }, { new: true });
    if (!updated) {
      throw new Error("Product not found.");
    }
    return updated;
  }
}

export const productService = new ProductService();
export default ProductService;
