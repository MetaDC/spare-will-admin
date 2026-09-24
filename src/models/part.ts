export interface PartCategory {
  id: string;
  name: string;
  slug: string;
  searchName?: string;
  image?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface PartSubcategory {
  id: string;
  categoryId: string; // ID of PartCategory (e.g., Brake ID)
  categoryName?: string; // Name of PartCategory (e.g., "Brake")
  name: string; // Name of subcategory (e.g., "Brake Pad")
  slug: string;
  searchName?: string;
  image?: string;
  description?: string;
  isActive: boolean;
  sortOrder: number;
  createdAt?: any;
  updatedAt?: any;
}

export interface PartBrand {
  id: string;
  name: string;
  slug: string;
  searchName?: string;
  logo?: string;
  description?: string;
  isActive: boolean;
  createdAt?: any;
  updatedAt?: any;
}
