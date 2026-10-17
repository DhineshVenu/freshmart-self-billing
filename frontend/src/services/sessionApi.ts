import type {
  CreateSessionApiResponse,
  GetSessionApiResponse,
  JoinSessionApiResponse,
} from "../types/session";

const API_URL = "http://localhost:5000/api";

export const createShoppingSession = async (
  storeName: string
): Promise<CreateSessionApiResponse> => {
  const response = await fetch(`${API_URL}/sessions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      storeName,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to create the shopping session"
    );
  }

  return result;
};

export const getSessionByCode = async (
  code: string
): Promise<GetSessionApiResponse> => {
  const response = await fetch(`${API_URL}/sessions/${code}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to retrieve shopping session details"
    );
  }

  return result;
};

export const joinShoppingSession = async (
  code: string,
  customerName: string,
  customerEmail?: string
): Promise<JoinSessionApiResponse> => {
  const response = await fetch(`${API_URL}/sessions/${code}/join`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      customerName,
      customerEmail: customerEmail && customerEmail.trim() ? customerEmail.trim() : undefined,
    }),
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(
      result.message || "Unable to join the shopping session"
    );
  }

  return result;
};
