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
  public async seedDefaultProducts(): Promise<void> {
    const count = await Product.countDocuments();
    if (count === 0) {
      console.log("🌱 Seeding realistic supermarket product inventory in INR (₹)...");
      await Product.insertMany([
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
        },
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
        },
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
        },
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
        },
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
        },
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
        },
      ]);
      console.log("✅ 10 sample categorized supermarket products seeded successfully.");
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
   * Create new product (Admin)
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

    return Product.create({
      barcode: data.barcode.trim(),
      name: data.name.trim(),
      category: data.category || "General",
      unit: data.unit || "",
      description: data.description || "",
      price: Number(data.price),
      stockQty: Number(data.stockQty || 0),
      active: data.active !== undefined ? data.active : true,
    });
  }

  /**
   * Update existing product or stock (Admin)
   */
  @LogExecution
  @ValidateInput
  public async updateProduct(id: string, data: Partial<IProduct>): Promise<IProduct | null> {
    const updated = await Product.findByIdAndUpdate(id, data, { new: true });
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
