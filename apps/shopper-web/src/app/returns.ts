import type { StoredOrder } from "./orders";

export type ReturnRequestStatus = "Requested" | "Approved" | "Rejected" | "Processed";

export type ReturnReason =
  | "damaged"
  | "wrong-item"
  | "expired"
  | "quality-issue"
  | "missing-item"
  | "other";

export type StoredReturnRequest = {
  id: string;
  createdAt: string;
  phone: string;
  orderId: string;
  orderDate: string;
  orderTotal: number;
  itemId: string | null;
  itemName: string | null;
  reason: ReturnReason;
  details: string;
  status: ReturnRequestStatus;
};

type ReturnRequestDraft = {
  phone: string;
  order: StoredOrder;
  itemId: string | null;
  itemName: string | null;
  reason: ReturnReason;
  details: string;
};

const RETURN_REQUESTS_KEY = "united-pharmacies-return-requests-v1";

function isReturnReason(value: string): value is ReturnReason {
  return [
    "damaged",
    "wrong-item",
    "expired",
    "quality-issue",
    "missing-item",
    "other",
  ].includes(value);
}

function isReturnStatus(value: string): value is ReturnRequestStatus {
  return ["Requested", "Approved", "Rejected", "Processed"].includes(value);
}

function isStoredReturnRequest(value: unknown): value is StoredReturnRequest {
  if (!value || typeof value !== "object") {
    return false;
  }

  const candidate = value as Partial<StoredReturnRequest>;

  return Boolean(
    typeof candidate.id === "string" &&
      typeof candidate.createdAt === "string" &&
      typeof candidate.phone === "string" &&
      typeof candidate.orderId === "string" &&
      typeof candidate.orderDate === "string" &&
      typeof candidate.orderTotal === "number" &&
      (candidate.itemId === null || typeof candidate.itemId === "string") &&
      (candidate.itemName === null || typeof candidate.itemName === "string") &&
      typeof candidate.reason === "string" &&
      isReturnReason(candidate.reason) &&
      typeof candidate.details === "string" &&
      typeof candidate.status === "string" &&
      isReturnStatus(candidate.status),
  );
}

function readFromStorage() {
  if (typeof window === "undefined") {
    return [] as StoredReturnRequest[];
  }

  try {
    const rawValue = window.localStorage.getItem(RETURN_REQUESTS_KEY);

    if (!rawValue) {
      return [] as StoredReturnRequest[];
    }

    const parsed = JSON.parse(rawValue) as unknown[];
    return parsed
      .filter(isStoredReturnRequest)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  } catch {
    return [] as StoredReturnRequest[];
  }
}

function writeToStorage(requests: StoredReturnRequest[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(RETURN_REQUESTS_KEY, JSON.stringify(requests));
}

function createReturnRequestId(createdAt: Date) {
  return `RET-${createdAt.getFullYear()}${String(createdAt.getMonth() + 1).padStart(2, "0")}${String(createdAt.getDate()).padStart(2, "0")}-${String(createdAt.getHours()).padStart(2, "0")}${String(createdAt.getMinutes()).padStart(2, "0")}${String(createdAt.getSeconds()).padStart(2, "0")}`;
}

export function readReturnRequests(phone?: string) {
  const requests = readFromStorage();
  const normalizedPhone = phone?.trim();

  if (!normalizedPhone) {
    return requests;
  }

  return requests.filter((request) => request.phone.trim() === normalizedPhone);
}

export function appendReturnRequest(draft: ReturnRequestDraft) {
  const createdAt = new Date();
  const nextRequest: StoredReturnRequest = {
    id: createReturnRequestId(createdAt),
    createdAt: createdAt.toISOString(),
    phone: draft.phone.trim(),
    orderId: draft.order.id,
    orderDate: draft.order.createdAt,
    orderTotal: draft.order.total,
    itemId: draft.itemId,
    itemName: draft.itemName,
    reason: draft.reason,
    details: draft.details.trim(),
    status: "Requested",
  };

  const nextRequests = [nextRequest, ...readFromStorage()].slice(0, 50);
  writeToStorage(nextRequests);
  return nextRequest;
}
