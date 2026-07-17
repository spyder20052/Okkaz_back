// Types alignés sur les modèles du backend OKKAZ (prisma/schema.prisma).

export type UserRole = "BUYER" | "SELLER" | "SELLER_PRO" | "ADMIN";
export type UserStatus = "ACTIVE" | "SUSPENDED" | "BLOCKED" | "PENDING_KYC";
export type KycStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";
export type KycDocumentType = "ID_CARD" | "PASSPORT" | "DRIVER_LICENSE";
export type RentalPeriod = "DAY" | "WEEK" | "MONTH";
export type ListingCondition = "NEW" | "GOOD" | "FAIR";
export type ListingStatus = "PENDING" | "ACTIVE" | "REJECTED" | "PAUSED" | "DELETED";
export type SubscriptionPlan = "WEEKLY" | "MONTHLY";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "REFUNDED";
export type PaymentMethod = "MOBILE_MONEY" | "CARD";
export type ReportReason = "FRAUD" | "WRONG_INFO" | "INAPPROPRIATE" | "NO_RESPONSE" | "OTHER";
export type DemandType = "STANDARD" | "EXPRESS";
export type DemandStatus = "ACTIVE" | "CLOSED" | "EXPIRED";

export interface ApiUser {
  id: string;
  email: string;
  phone: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  status: UserStatus;
  kycStatus: KycStatus;
  isEmailVerified: boolean;
  profilePhotoUrl?: string | null;
  city?: string | null;
  address?: string | null;
  reportsCount?: number;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  iconUrl?: string | null;
  parentId?: string | null;
  isActive: boolean;
  sortOrder: number;
  children?: Category[];
}

export interface ListingPhoto {
  id: string;
  url: string;
  sortOrder: number;
  isCover: boolean;
}

export interface Listing {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  slug: string;
  description: string;
  rentalPrice: string | number;
  rentalPeriod: RentalPeriod;
  purchasePrice?: string | number | null;
  isLoa: boolean;
  loaDurationMonths?: number | null;
  condition: ListingCondition;
  locationCity: string;
  locationAddress?: string | null;
  contactPhoneDisplayed?: string;
  status: ListingStatus;
  isFeatured: boolean;
  isUrgent: boolean;
  viewsCount: number;
  contactsCount: number;
  rejectionReason?: string | null;
  createdAt: string;
  updatedAt?: string;
  photos?: ListingPhoto[];
  category?: Pick<Category, "id" | "name" | "slug">;
  owner?: Pick<ApiUser, "id" | "firstName" | "lastName" | "role" | "profilePhotoUrl" | "city">;
}

export interface Review {
  id: string;
  reviewerId: string;
  listingId: string;
  rating: number;
  comment?: string | null;
  isModerated: boolean;
  createdAt: string;
  reviewer?: Pick<ApiUser, "id" | "firstName" | "lastName" | "profilePhotoUrl">;
}

export interface KycDocument {
  id: string;
  userId: string;
  documentType: KycDocumentType;
  frontUrl: string;
  backUrl?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdAt: string;
  user?: ApiUser;
}

export interface Payment {
  id: string;
  type: "SUBSCRIPTION" | "DEMAND_LISTING" | "EXPRESS_DEMAND";
  amount: string | number;
  currency: string;
  method: PaymentMethod;
  provider?: string | null;
  providerRef?: string | null;
  status: PaymentStatus;
  createdAt: string;
  updatedAt?: string;
  user?: Pick<ApiUser, "id" | "firstName" | "lastName" | "email">;
}

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  amount: string | number;
  status: "ACTIVE" | "EXPIRED" | "CANCELLED";
  startsAt: string;
  endsAt: string;
  autoRenew: boolean;
  payment?: Payment;
}

export interface SubscriptionPlanInfo {
  plan: SubscriptionPlan;
  price: number;
  currency: string;
  durationDays: number;
}

export interface Demand {
  id: string;
  userId: string;
  categoryId: string;
  title: string;
  description: string;
  maxBudget?: string | number | null;
  city: string;
  type: DemandType;
  isUrgent: boolean;
  status: DemandStatus;
  expiresAt?: string | null;
  createdAt: string;
  category?: Pick<Category, "id" | "name" | "slug">;
  user?: Pick<ApiUser, "id" | "firstName" | "lastName">;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId?: string | null;
  listingId?: string | null;
  reason: ReportReason;
  description?: string | null;
  status: "OPEN" | "REVIEWED" | "CLOSED";
  adminNote?: string | null;
  createdAt: string;
  reporter?: Pick<ApiUser, "id" | "firstName" | "lastName" | "email">;
  reportedUser?: Pick<ApiUser, "id" | "firstName" | "lastName" | "email">;
  listing?: Pick<Listing, "id" | "title" | "slug">;
}

export interface SystemSetting {
  key: string;
  value: string;
  description?: string | null;
}

export interface DashboardStats {
  totalUsers: number;
  totalListings: number;
  totalActiveListings: number;
  totalTransactions: number;
  totalRevenue: number;
  pendingKycCount: number;
  pendingListingsCount: number;
  openReportsCount: number;
}

// Helpers d'affichage partagés
export function formatPrice(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (Number.isNaN(num)) return "—";
  return `${num.toLocaleString("fr-FR")} FCFA`;
}

export const RENTAL_PERIOD_LABELS: Record<RentalPeriod, string> = {
  DAY: "jour",
  WEEK: "semaine",
  MONTH: "mois",
};

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  NEW: "Neuf",
  GOOD: "Bon état",
  FAIR: "État correct",
};

export const LISTING_STATUS_LABELS: Record<ListingStatus, string> = {
  PENDING: "En attente de validation",
  ACTIVE: "Active",
  REJECTED: "Refusée",
  PAUSED: "En pause",
  DELETED: "Supprimée",
};
