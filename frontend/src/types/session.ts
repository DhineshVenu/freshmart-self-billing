export type SessionStatus = "ACTIVE" | "COMPLETED" | "CANCELLED";

export interface ShoppingSessionData {
  id: string;
  databaseId?: string;
  storeName: string;
  workerId: string;
  status: SessionStatus;
  joinedCustomerName?: string | null;
  joinedCustomerEmail?: string | null;
  joinedAt?: string | Date | null;
  createdAt: string | Date;
}

export interface CreateSessionApiResponse {
  success: boolean;
  data: {
    session: ShoppingSessionData;
    joinUrl: string;
  };
  message?: string;
}

export interface GetSessionApiResponse {
  success: boolean;
  data: {
    session: ShoppingSessionData;
  };
  message?: string;
}

export interface JoinSessionApiResponse {
  success: boolean;
  message?: string;
  data: {
    session: ShoppingSessionData;
  };
}
