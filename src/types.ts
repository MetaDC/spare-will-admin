export type InquiryStatus = 'New' | 'Reviewing' | 'Price Sent' | 'Customer Contacted' | 'Completed' | 'Cancelled' | 'Closed';

export interface PartItem {
  id: string;
  name: string;
  spec?: string;
  quantity: number;
  note?: string;
  // Admin fields
  availability?: 'Available' | 'Not Available' | 'Alternative Available' | 'Need Confirmation';
  price?: number;
  costPrice?: number;
  adminNote?: string;
}

export interface VehicleInfo {
  make: string;
  model: string;
  year: number;
  engineTrim: string;
  transmission: string;
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
  status: InquiryStatus;
  label: string;
  description: string;
  date?: string;
  completed: boolean;
  active: boolean;
}

export interface Inquiry {
  id: string;
  userId?: string;
  date: string;
  status: InquiryStatus;
  vehicle: VehicleInfo;
  parts: PartItem[];
  contact: ContactInfo;
  additionalNotes?: string;
  statusHistory: StatusHistoryItem[];
  createdAt?: string;
  serverTime?: unknown;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar: string;
}

export interface BusinessSettings {
  businessName: string;
  businessEmail: string;
  callingNumber: string;
  whatsappNumber: string;
  defaultGreeting: string;
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
