export interface CreateSessionDTO {
  storeName: string;
  storeId?: string | null;
}

export interface JoinSessionDTO {
  customerName: string;
  customerEmail?: string;
  customerId?: string;
}

export interface SessionResponseData {
  id: string;
  databaseId: string;
  storeName: string;
  workerId: string;
  storeId?: string | null;
  status: string;
  joinedCustomerName: string | null;
  joinedCustomerEmail?: string | null;
  joinedAt: Date | string | null;
  createdAt: Date | string;
}
