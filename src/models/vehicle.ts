export interface VehicleCategory {
  id: string;
  name: string;
  slug: string;
  searchName?: string;
  image?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface VehicleBrand {
  id: string;
  vehicleCategoryId: string;
  vehicleCategoryName?: string;
  name: string;
  slug: string;
  searchName?: string;
  logo?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export interface VehicleModel {
  id: string;
  vehicleCategoryId: string;
  vehicleCategoryName?: string;
  vehicleBrandId: string;
  vehicleBrandName?: string;
  name: string;
  slug: string;
  searchName?: string;
  image?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}

export type FuelType =
  | "Petrol"
  | "Diesel"
  | "CNG"
  | "Electric"
  | "Hybrid"
  | "Other";
export type TransmissionType =
  | "Manual"
  | "Automatic"
  | "AMT"
  | "CVT"
  | "DCT"
  | "Other";

export interface VehicleVariant {
  id: string;
  vehicleCategoryId: string;
  vehicleCategoryName?: string;
  vehicleBrandId: string;
  vehicleBrandName?: string;
  vehicleModelId: string;
  vehicleModelName?: string;
  name: string;
  searchName?: string;
  yearFrom: number;
  yearTo: number;
  fuelType: FuelType;
  engine: string;
  engineCode?: string;
  transmission: TransmissionType;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}
