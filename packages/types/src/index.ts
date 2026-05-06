export type LanguageCode = "ar" | "en";

export type SearchSuggestion = {
  productId: string;
  nameAr: string;
  nameEn: string;
  variations: Array<{ type: string }>;
};

export type SearchResultItem = {
  id: string;
  code: string;
  barcode: string;
  nameAr: string;
  nameEn: string;
  category: string;
  categoryName: string;
  categoryNameEn: string;
  price: number;
  stock: number;
  inStock: boolean;
  imageUrl?: string;
};

export type AdaptiveCollection = {
  id: string;
  title: string;
  strategy: "query_match" | "behavioral" | "history" | "nearby_popular";
  productIds: string[];
};

export type CatalogFacet = {
  id: string;
  label: string;
  count: number;
};

export type SearchEnvelope = {
  query: string;
  suggestions: SearchSuggestion[];
  results: SearchResultItem[];
  collections: AdaptiveCollection[];
  facets: CatalogFacet[];
  updatedAt: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};

export type EtaBand = {
  minMinutes: number;
  maxMinutes: number;
};

export type PharmacyBranch = {
  id: string;
  nameAr: string;
  nameEn: string;
  lat: number;
  lng: number;
  loadFactor?: number;
};

export type PharmacyAssignment = {
  pharmacyId: string;
  pharmacyName: string;
  distanceKm: number;
  etaBand: EtaBand;
  assignmentToken: string;
  reason: "nearest_available";
};

export type DeliveryQuote = {
  assignment: PharmacyAssignment;
  quoteToken: string;
  fee: number;
  currency: string;
  etaBand: EtaBand;
  updatedAt: string;
};

export type ProductMedicalInfo = {
  usageInstructions: string[];
  dosageGuidance: string[];
  safetyWarnings: string[];
  activeIngredients: string[];
  generalDisclaimer: string;
};

export type AlternativeProduct = {
  productId: string;
  nameAr: string;
  nameEn: string;
  price: number;
  activeIngredients: string[];
  matchType: "same_active_ingredient" | "same_category";
  inStock: boolean;
};

export type CartSnapshotItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
  code?: string;
  name?: string;
};

export type CartSnapshot = {
  items: CartSnapshotItem[];
  itemCount: number;
  subtotal: number;
};

export type CheckoutDraft = {
  customerName: string;
  customerPhone: string;
  address: string;
  coordinates?: Coordinates | null;
  note?: string;
};

export type CheckoutSubmission = {
  draft: CheckoutDraft;
  cart: CartSnapshot;
  quoteToken: string;
  assignmentToken: string;
  paymentMethod: string;
};

export type PrescriptionReviewStatus =
  | "uploaded"
  | "under_review"
  | "approved"
  | "rejected"
  | "processed";

export type PrescriptionUpload = {
  id: string;
  imageUrl?: string;
  imageName?: string;
  status: PrescriptionReviewStatus;
  notes?: string;
  createdAt: string;
};

export type PrescriptionDecision = {
  prescriptionId: string;
  status: Extract<PrescriptionReviewStatus, "approved" | "rejected">;
  reviewerId?: string;
  reviewerNote?: string;
};

export type TrackingStatus =
  | "pending"
  | "verified"
  | "packed"
  | "ready_for_dispatch"
  | "out_for_delivery"
  | "delivered"
  | "failed_delivery"
  | "returned"
  | "cancelled";

export type OrderTrackingSnapshot = {
  orderId: string;
  status: TrackingStatus;
  assignment?: PharmacyAssignment | null;
  etaBand?: EtaBand | null;
  driverName?: string | null;
  driverPhone?: string | null;
  lastKnownLocation?: Coordinates | null;
  updatedAt: string;
};

export type CourierManifestItem = {
  orderId: string;
  customerName: string;
  customerPhone: string;
  status: TrackingStatus;
  qrToken: string;
};

export type CourierEarningsSummary = {
  pendingDeliveries: number;
  completedDeliveries: number;
  earningsAmount: number;
  currency: string;
};
