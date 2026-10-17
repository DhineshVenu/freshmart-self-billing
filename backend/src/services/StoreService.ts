import mongoose from "mongoose";
import { Store, IStore } from "../models/Store.js";
import { User } from "../models/User.js";
import { Order } from "../models/Order.js";
import { ShoppingSession } from "../models/ShoppingSession.js";
import { Product } from "../models/Product.js";
import { InventoryAlert } from "../models/InventoryAlert.js";
import { AuditLog } from "../models/AuditLog.js";
import { LogExecution, ValidateInput, Singleton } from "../utils/index.js";

export interface CreateStoreDto {
  name: string;
  address?: string;
  city?: string;
  gstNumber?: string;
}

export interface StoreKpiDto {
  todayRevenue: number;
  totalOrders: number;
  activeSessionCount: number;
  lowStockCount: number;
}

export interface StoreResponseDto {
  _id: string;
  name: string;
  address: string;
  city: string;
  gstNumber: string;
  managerId?: string | null;
  managerName?: string | null;
  active: boolean;
  createdAt: Date;
}

@Singleton
export class StoreService {
  private format(store: IStore, managerName?: string | null): StoreResponseDto {
    return {
      _id: store._id.toString(),
      name: store.name,
      address: store.address,
      city: store.city,
      gstNumber: store.gstNumber,
      managerId: store.managerId ? store.managerId.toString() : null,
      managerName: managerName ?? null,
      active: store.active,
      createdAt: store.createdAt,
    };
  }

  @LogExecution
  async getAllStores(): Promise<StoreResponseDto[]> {
    const stores = await Store.find().sort({ createdAt: -1 }).lean();
    const managerIds = stores
      .filter((s) => s.managerId)
      .map((s) => s.managerId!);

    const managers = await User.find({ _id: { $in: managerIds } })
      .select("_id name")
      .lean();
    const managerMap = new Map(managers.map((m) => [m._id.toString(), m.name]));

    return stores.map((s) =>
      this.format(
        s as unknown as IStore,
        s.managerId ? (managerMap.get(s.managerId.toString()) ?? null) : null
      )
    );
  }

  @LogExecution
  @ValidateInput
  async createStore(dto: CreateStoreDto): Promise<StoreResponseDto> {
    if (!dto.name?.trim()) throw new Error("Store name is required");
    const store = await Store.create({
      name: dto.name.trim(),
      address: dto.address?.trim() ?? "",
      city: dto.city?.trim() ?? "",
      gstNumber: dto.gstNumber?.trim() ?? "",
    });
    return this.format(store);
  }

  @LogExecution
  @ValidateInput
  async getStoreById(storeId: string): Promise<StoreResponseDto> {
    const store = await Store.findById(storeId);
    if (!store) throw new Error("Store not found");
    let managerName: string | null = null;
    if (store.managerId) {
      const mgr = await User.findById(store.managerId).select("name").lean();
      managerName = mgr?.name ?? null;
    }
    return this.format(store, managerName);
  }

  @LogExecution
  @ValidateInput
  async updateStore(storeId: string, dto: Partial<CreateStoreDto> & { active?: boolean }): Promise<StoreResponseDto> {
    const store = await Store.findByIdAndUpdate(
      storeId,
      { $set: dto },
      { new: true, runValidators: true }
    );
    if (!store) throw new Error("Store not found");

    await AuditLog.create({
      actorId: "admin",
      actorRole: "admin",
      action: "UPDATE_STORE",
      targetType: "Store",
      targetId: storeId,
      details: `Store updated: ${store.name}`,
    });

    return this.format(store);
  }

  @LogExecution
  @ValidateInput
  async assignManager(storeId: string, managerId: string): Promise<StoreResponseDto> {
    const manager = await User.findById(managerId);
    if (!manager) throw new Error("Manager user not found");

    // Promote to store_manager if not already
    if (manager.role === "worker" || manager.role === "customer") {
      manager.role = "store_manager";
    }
    manager.assignedStoreId = new mongoose.Types.ObjectId(storeId);
    await manager.save();

    const store = await Store.findByIdAndUpdate(
      storeId,
      { managerId: new mongoose.Types.ObjectId(managerId) },
      { new: true }
    );
    if (!store) throw new Error("Store not found");

    await AuditLog.create({
      actorId: "admin",
      actorRole: "admin",
      action: "ASSIGN_MANAGER",
      targetType: "Store",
      targetId: storeId,
      details: `Manager ${manager.name} assigned to store ${store.name}`,
    });

    return this.format(store, manager.name);
  }

  @LogExecution
  @ValidateInput
  async getStoreKPIs(storeId: string): Promise<StoreKpiDto> {
    const storeOid = new mongoose.Types.ObjectId(storeId);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayRevAgg, totalOrders, activeSessionCount, lowStockAlerts] =
      await Promise.all([
        Order.aggregate([
          {
            $match: {
              storeId: storeOid,
              status: "PAID",
              paidAt: { $gte: todayStart },
            },
          },
          { $group: { _id: null, total: { $sum: "$totalAmount" } } },
        ]),
        Order.countDocuments({ storeId: storeOid, status: "PAID" }),
        ShoppingSession.countDocuments({ storeId: storeOid, status: "ACTIVE" }),
        InventoryAlert.countDocuments({
          storeId: storeOid,
          alertEnabled: true,
          acknowledgedAt: null,
        }),
      ]);

    return {
      todayRevenue: todayRevAgg[0]?.total ?? 0,
      totalOrders,
      activeSessionCount,
      lowStockCount: lowStockAlerts,
    };
  }

  /**
   * Seed the default store from .env vars if no stores exist.
   */
  async seedDefaultStore(): Promise<IStore> {
    const existing = await Store.findOne();
    if (existing) return existing;

    const store = await Store.create({
      name: process.env.DEFAULT_STORE_NAME ?? "Fresh Mart Main Branch",
      city: process.env.DEFAULT_STORE_CITY ?? "Chennai",
      address: "",
      gstNumber: "",
    });
    console.log(`✓ Default store seeded: ${store.name}`);
    return store;
  }
}

export const storeService = new StoreService();
