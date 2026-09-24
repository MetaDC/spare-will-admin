export interface ProductSpecification {
  id?: string;
  name: string;
  value: string;
}

export interface ProductNumber {
  id?: string;
  number: string;
  type: 'OEM' | 'Part Number' | 'Cross Reference';
  brand?: string;
  notes?: string;
}

export interface ProductFitment {
  id?: string;
  vehicleCategoryId: string;
  vehicleCategoryName?: string;
  vehicleBrandId: string;
  vehicleBrandName?: string;
  vehicleModelId: string;
  vehicleModelName?: string;
  vehicleVariantId?: string;
  vehicleVariantName?: string;
  yearFrom: number;
  yearTo: number;
  fuelType?: string;
  engine?: string;
  transmission?: string;
  notes?: string;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  partBrandId: string;
  partBrandName?: string;
  description: string;
  shortDescription?: string;
  images: string[];
  price: number; // MRP / Regular Price
  salePrice: number; // Selling Price / Discounted
  taxPercentage: number;
  stock: number;
  condition: 'New' | 'Refurbished' | 'Used';
  warranty?: string;
  position?: 'Front' | 'Rear' | 'Left' | 'Right' | 'Universal' | 'Both' | string;
  side?: 'Left' | 'Right' | 'Both' | 'N/A' | string;
  weight?: string;
  dimensions?: string;
  isActive: boolean;
  isFeatured?: boolean;
  isDeleted: boolean;
  createdAt?: any;
  updatedAt?: any;

  // Embedded or relational details
  fitments?: ProductFitment[];
  specifications?: ProductSpecification[];
  numbers?: ProductNumber[];
}

export interface ProductFilters {
  search?: string;
  categoryId?: string;
  partBrandId?: string;
  vehicleCategoryId?: string;
  vehicleBrandId?: string;
  status?: string; // 'all' | 'active' | 'inactive'
}
