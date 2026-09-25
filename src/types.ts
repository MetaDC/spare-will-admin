export type InquiryStatus = 'New' | 'Reviewing' | 'Price Sent' | 'Completed' | 'Cancelled';

export type PartAvailability =
  | 'Available'
  | 'Not Available'
  | 'Alternative Available'
  | 'Need Confirmation';

export interface InquiryPartBrandOption {
  brandId?: string;
  brandName: string;
  price: number;
  costPrice?: number;
  availability?: PartAvailability;
  warranty?: string;
  partNumber?: string;
  note?: string;
}

export type PartType = 'Aftermarket' | 'Genuine' | 'New' | 'OEM';

export interface PartItem {
  id: string;
  name: string;
  subcategoryId?: string;
  categoryId?: string;
  categoryName?: string;
  spec?: string;
  quantity: number;
  customerNote?: string;
  note?: string;

  // Admin quotation fields
  availability?: PartAvailability;
  partTypes?: string[];
  partTypePrices?: Record<string, number>;
  brandId?: string;
  brandName?: string;
  partNumber?: string;
  price?: number;
  costPrice?: number;
  adminNote?: string;
  brandOptions?: InquiryPartBrandOption[];
}

export interface VehicleInfo {
  vehicleCategoryId?: string;
  vehicleCategoryName?: string;
  brandId?: string;
  brandName?: string;
  make: string;
  modelId?: string;
  modelName?: string;
  model: string;
  variantId?: string;
  variantName?: string;
  fuelType?: string;
  engine?: string;
  engineCode?: string;
  transmission: string;
  year?: number;
  engineTrim?: string;
  vin?: string;
  image?: string;
}

export interface ContactInfo {
  fullName: string;
  mobileNumber: string;
  whatsappAvailable: boolean;
  email: string;
}

export interface StatusHistoryItem {
  createdAt: any;
  description: string;
  status: InquiryStatus;
  createdByName: string;
  createdById: string;
}

export interface Inquiry {
  id: string;
  inquireId?: string;
  InquireID?: string;
  userId?: string;
  status: InquiryStatus;
  vehicle: VehicleInfo;
  parts: PartItem[];
  contact: ContactInfo;
  additionalNotes?: string;
  statusHistory: StatusHistoryItem[];
  createdAt: any; // Firestore serverTimestamp
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface Setting {
  id: string; // Document ID: "sets"
  businessName: string;
  businessEmail: string;
  businessCallingNumber: string;
  callingNumber?: string;
  whatsappNumber: string;
  defaultGreetingMsg: string;
  defaultGreeting?: string;
  inquiryCount?: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  callingNumber: string;
  businessCallingNumber?: string;
  whatsappNumber: string;
  defaultGreeting: string;
  defaultGreetingMsg?: string;
  inquiryCount?: number;
}



export interface SparePart {
  id: string;
  name: string;
  partNumber: string;
  brand?: string;
  price?: number;
  stock?: number;
  category?: string;
  compatibleVehicles?: string;
  oemPartNumber?: string;
  costPrice?: number;
  subcategory?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  yearFrom?: number;
  yearTo?: number;
  position?: string;
  partType?: string;
  hsnCode?: string;
  gstRate?: number;
  unit?: string;
  supplier?: string;
  rackBin?: string;
  reorderLevel?: number;
  warranty?: string;
  condition?: string;
  description?: string;
  imageUrl?: string;
  status?: string;
  createdAt?: unknown;
}
