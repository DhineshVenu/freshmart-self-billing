import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { Product } from "../models/Product.js";
import { ProductService } from "../services/ProductService.js";

describe("ProductService — extended fields", () => {
  let mongoServer: MongoMemoryServer;
  let service: ProductService;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    service = new ProductService();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  beforeEach(async () => {
    await Product.deleteMany({});
  });

  it("creates a product with all extended fields persisted", async () => {
    const expiryDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000); // 3 days
    const product = await service.createProduct({
      barcode: "9901",
      name: "Test Product",
      category: "Snacks",
      price: 100,
      stockQty: 20,
      nutriScore: "C",
      allergens: ["Gluten", "Milk"],
      dietaryFlags: ["Vegetarian"],
      calories: 250,
      aisle: "Aisle 3",
      shelf: "Shelf B",
      bay: 2,
      expiryDate,
      clearanceDiscountPercent: 15,
    });

    expect(product.nutriScore).toBe("C");
    expect(product.allergens).toEqual(["Gluten", "Milk"]);
    expect(product.dietaryFlags).toEqual(["Vegetarian"]);
    expect(product.calories).toBe(250);
    expect(product.aisle).toBe("Aisle 3");
    expect(product.shelf).toBe("Shelf B");
    expect(product.bay).toBe(2);
    expect(product.clearanceDiscountPercent).toBe(15);
    expect(product.expiryDate).toBeInstanceOf(Date);
  });

  it("throws when clearanceDiscountPercent > 100", async () => {
    await expect(
      service.createProduct({
        barcode: "9902",
        name: "Bad Discount",
        price: 50,
        clearanceDiscountPercent: 110,
      })
    ).rejects.toThrow("Clearance discount must be between 0 and 100");
  });

  it("throws when clearanceDiscountPercent < 0", async () => {
    await expect(
      service.createProduct({
        barcode: "9903",
        name: "Negative Discount",
        price: 50,
        clearanceDiscountPercent: -5,
      })
    ).rejects.toThrow("Clearance discount must be between 0 and 100");
  });

  it("updateProduct validates clearanceDiscountPercent range", async () => {
    const product = await service.createProduct({
      barcode: "9904",
      name: "Update Test",
      price: 80,
    });

    await expect(
      service.updateProduct(String(product._id), { clearanceDiscountPercent: 85 })
    ).resolves.not.toBeNull();

    await expect(
      service.updateProduct(String(product._id), { clearanceDiscountPercent: 110 })
    ).rejects.toThrow("Clearance discount must be between 0 and 100");
  });

  it("getProductWithFullDetail returns all extended fields", async () => {
    const created = await service.createProduct({
      barcode: "9905",
      name: "Detail Product",
      price: 60,
      nutriScore: "A",
      allergens: ["Nuts"],
      aisle: "Aisle 1",
    });

    const detail = await service.getProductWithFullDetail(String(created._id));
    expect(detail.nutriScore).toBe("A");
    expect(detail.allergens).toContain("Nuts");
    expect(detail.aisle).toBe("Aisle 1");
  });

  it("getProductDetailByBarcode returns product including extended fields", async () => {
    await service.createProduct({
      barcode: "9906",
      name: "Barcode Detail",
      price: 45,
      nutriScore: "B",
      calories: 180,
    });

    const detail = await service.getProductDetailByBarcode("9906");
    expect(detail.barcode).toBe("9906");
    expect(detail.nutriScore).toBe("B");
    expect(detail.calories).toBe(180);
  });
});
