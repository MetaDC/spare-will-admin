import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  getCountFromServer,
  startAfter,
  endBefore,
  limit,
  limitToLast,
  DocumentSnapshot,
  QueryConstraint,
} from "firebase/firestore";
import { db } from "../lib/firebase";

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  firstDoc: DocumentSnapshot | null;
  lastDoc: DocumentSnapshot | null;
}
import {
  VehicleCategory,
  VehicleBrand,
  VehicleModel,
  VehicleVariant,
  PartCategory,
  PartSubcategory,
  PartBrand,
  Product,
  ProductFitment,
  ProductSpecification,
  ProductNumber,
  ProductFilters,
} from "../models";

// Firestore collection names matching inventory.md specifications
export const COLS = {
  VEHICLE_CATEGORIES: "vehicle_categories",
  VEHICLE_BRANDS: "vehicle_brands",
  VEHICLE_MODELS: "vehicle_models",
  VEHICLE_VARIANTS: "vehicle_variants",
  PART_CATEGORIES: "part_categories",
  PART_SUBCATEGORIES: "part_subcategories",
  PART_BRANDS: "part_brands",
  PRODUCTS: "products",
  PRODUCT_FITMENTS: "product_fitments",
  PRODUCT_ATTRIBUTES: "product_attributes",
  OEM_NUMBERS: "oem_numbers",
  CROSS_REF_NUMBERS: "cross_reference_numbers",
};

// Utility to remove undefined values before Firestore writes
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned = {} as any;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      cleaned[key] = stripUndefined(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((v) =>
        v !== null && typeof v === "object" && !Array.isArray(v)
          ? stripUndefined(v)
          : v,
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE MASTERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getVehicleCategories(): Promise<VehicleCategory[]> {
  try {
    const q = query(collection(db, COLS.VEHICLE_CATEGORIES));
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleCategory,
    );
    return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    console.error("Failed to get vehicle categories:", error);
    throw new Error("Could not fetch vehicle categories from database.");
  }
}

export async function saveVehicleCategory(
  cat: Partial<VehicleCategory>,
): Promise<string> {
  try {
    const id = cat.id || doc(collection(db, COLS.VEHICLE_CATEGORIES)).id;
    const docRef = doc(db, COLS.VEHICLE_CATEGORIES, id);
    const data = stripUndefined({
      name: cat.name || "",
      slug:
        cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
      searchName:
        cat.searchName ||
        (cat.name || "").toLowerCase().replace(/[^a-z0-9]+/g, ""),
      image: cat.image || "",
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      sortOrder: Number(cat.sortOrder) || 0,
      updatedAt: serverTimestamp(),
      ...(cat.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save vehicle category:", error);
    throw new Error("Could not save vehicle category to database.");
  }
}

export async function deleteVehicleCategory(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.VEHICLE_CATEGORIES, id));
  } catch (error) {
    console.error("Failed to delete vehicle category:", error);
    throw new Error("Could not delete vehicle category from database.");
  }
}

// Vehicle Brands
export async function getVehicleBrands(
  categoryId?: string,
): Promise<VehicleBrand[]> {
  try {
    let q = query(collection(db, COLS.VEHICLE_BRANDS));
    if (categoryId) {
      q = query(
        collection(db, COLS.VEHICLE_BRANDS),
        where("vehicleCategoryId", "==", categoryId),
      );
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleBrand,
    );
    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get vehicle brands:", error);
    throw new Error("Could not fetch vehicle brands from database.");
  }
}

export async function saveVehicleBrand(
  brand: Partial<VehicleBrand>,
): Promise<string> {
  try {
    const id = brand.id || doc(collection(db, COLS.VEHICLE_BRANDS)).id;
    const docRef = doc(db, COLS.VEHICLE_BRANDS, id);
    const data = stripUndefined({
      vehicleCategoryId: brand.vehicleCategoryId || "",
      vehicleCategoryName: brand.vehicleCategoryName || "",
      name: brand.name || "",
      slug:
        brand.slug ||
        brand.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "",
      searchName:
        brand.searchName ||
        brand.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      logo: brand.logo || "",
      isActive: brand.isActive !== undefined ? brand.isActive : true,
      updatedAt: serverTimestamp(),
      ...(brand.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save vehicle brand:", error);
    throw new Error("Could not save vehicle brand to database.");
  }
}

export async function deleteVehicleBrand(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.VEHICLE_BRANDS, id));
  } catch (error) {
    console.error("Failed to delete vehicle brand:", error);
    throw new Error("Could not delete vehicle brand from database.");
  }
}

// Vehicle Models
export async function getVehicleModels(
  brandId?: string,
  categoryId?: string,
): Promise<VehicleModel[]> {
  try {
    let q = query(collection(db, COLS.VEHICLE_MODELS));
    if (brandId) {
      q = query(
        collection(db, COLS.VEHICLE_MODELS),
        where("vehicleBrandId", "==", brandId),
      );
    } else if (categoryId) {
      q = query(
        collection(db, COLS.VEHICLE_MODELS),
        where("vehicleCategoryId", "==", categoryId),
      );
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleModel,
    );
    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get vehicle models:", error);
    throw new Error("Could not fetch vehicle models from database.");
  }
}

export async function saveVehicleModel(
  model: Partial<VehicleModel>,
): Promise<string> {
  try {
    const id = model.id || doc(collection(db, COLS.VEHICLE_MODELS)).id;
    const docRef = doc(db, COLS.VEHICLE_MODELS, id);
    const data = stripUndefined({
      vehicleCategoryId: model.vehicleCategoryId || "",
      vehicleCategoryName: model.vehicleCategoryName || "",
      vehicleBrandId: model.vehicleBrandId || "",
      vehicleBrandName: model.vehicleBrandName || "",
      name: model.name || "",
      slug:
        model.slug ||
        model.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "",
      searchName:
        model.searchName ||
        model.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      image: model.image || "",
      isActive: model.isActive !== undefined ? model.isActive : true,
      updatedAt: serverTimestamp(),
      ...(model.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save vehicle model:", error);
    throw new Error("Could not save vehicle model to database.");
  }
}

export async function deleteVehicleModel(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.VEHICLE_MODELS, id));
  } catch (error) {
    console.error("Failed to delete vehicle model:", error);
    throw new Error("Could not delete vehicle model from database.");
  }
}

// Vehicle Variants
export async function getVehicleVariants(
  modelId?: string,
): Promise<VehicleVariant[]> {
  try {
    let q = query(collection(db, COLS.VEHICLE_VARIANTS));
    if (modelId) {
      q = query(
        collection(db, COLS.VEHICLE_VARIANTS),
        where("vehicleModelId", "==", modelId),
      );
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleVariant,
    );
    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get vehicle variants:", error);
    throw new Error("Could not fetch vehicle variants from database.");
  }
}

export async function saveVehicleVariant(
  variant: Partial<VehicleVariant>,
): Promise<string> {
  try {
    const id = variant.id || doc(collection(db, COLS.VEHICLE_VARIANTS)).id;
    const docRef = doc(db, COLS.VEHICLE_VARIANTS, id);
    const data = stripUndefined({
      vehicleCategoryId: variant.vehicleCategoryId || "",
      vehicleCategoryName: variant.vehicleCategoryName || "",
      vehicleBrandId: variant.vehicleBrandId || "",
      vehicleBrandName: variant.vehicleBrandName || "",
      vehicleModelId: variant.vehicleModelId || "",
      vehicleModelName: variant.vehicleModelName || "",
      name: variant.name || "",
      searchName:
        variant.searchName ||
        variant.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      yearFrom: Number(variant.yearFrom) || 2000,
      yearTo: Number(variant.yearTo) || new Date().getFullYear(),
      fuelType: variant.fuelType || "Petrol",
      engine: variant.engine || "",
      engineCode: variant.engineCode || "",
      transmission: variant.transmission || "Manual",
      isActive: variant.isActive !== undefined ? variant.isActive : true,
      updatedAt: serverTimestamp(),
      ...(variant.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save vehicle variant:", error);
    throw new Error("Could not save vehicle variant to database.");
  }
}

export async function deleteVehicleVariant(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.VEHICLE_VARIANTS, id));
  } catch (error) {
    console.error("Failed to delete vehicle variant:", error);
    throw new Error("Could not delete vehicle variant from database.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGINATED VEHICLE MASTERS (10 per page, server-side count & search)
// ─────────────────────────────────────────────────────────────────────────────

export async function getPaginatedVehicleBrands(options: {
  categoryId?: string;
  search?: string;
  pageSize?: number;
  cursorDoc?: DocumentSnapshot | null;
  direction?: "first" | "next" | "prev";
}): Promise<PaginatedResult<VehicleBrand>> {
  try {
    const pageSize = options.pageSize || 10;
    const cleanSearch = (options.search || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "");

    const baseConstraints: QueryConstraint[] = [];
    if (options.categoryId && options.categoryId !== "all") {
      baseConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }

    if (cleanSearch) {
      baseConstraints.push(where("searchName", ">=", cleanSearch));
      baseConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
      baseConstraints.push(orderBy("searchName", "asc"));
    } else {
      baseConstraints.push(orderBy("name", "asc"));
    }

    // Aggregation Count Query
    const countConstraints: QueryConstraint[] = [];
    if (options.categoryId && options.categoryId !== "all") {
      countConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }
    if (cleanSearch) {
      countConstraints.push(where("searchName", ">=", cleanSearch));
      countConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
    }
    const countQ = query(
      collection(db, COLS.VEHICLE_BRANDS),
      ...countConstraints,
    );
    const countSnap = await getCountFromServer(countQ);
    const totalCount = countSnap.data().count;

    // Data Query
    const dataConstraints: QueryConstraint[] = [...baseConstraints];
    if (options.direction === "next" && options.cursorDoc) {
      dataConstraints.push(startAfter(options.cursorDoc), limit(pageSize));
    } else if (options.direction === "prev" && options.cursorDoc) {
      dataConstraints.push(endBefore(options.cursorDoc), limitToLast(pageSize));
    } else {
      dataConstraints.push(limit(pageSize));
    }

    const dataQ = query(
      collection(db, COLS.VEHICLE_BRANDS),
      ...dataConstraints,
    );
    const snap = await getDocs(dataQ);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleBrand,
    );

    return {
      items,
      totalCount,
      firstDoc: snap.docs[0] || null,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  } catch (error) {
    console.error("Failed to get paginated vehicle brands:", error);
    throw new Error("Could not fetch vehicle brands from database.");
  }
}

export async function getPaginatedVehicleModels(options: {
  categoryId?: string;
  brandId?: string;
  search?: string;
  pageSize?: number;
  cursorDoc?: DocumentSnapshot | null;
  direction?: "first" | "next" | "prev";
}): Promise<PaginatedResult<VehicleModel>> {
  try {
    const pageSize = options.pageSize || 10;
    const cleanSearch = (options.search || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "");

    const baseConstraints: QueryConstraint[] = [];
    if (options.brandId && options.brandId !== "all") {
      baseConstraints.push(where("vehicleBrandId", "==", options.brandId));
    } else if (options.categoryId && options.categoryId !== "all") {
      baseConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }

    if (cleanSearch) {
      baseConstraints.push(where("searchName", ">=", cleanSearch));
      baseConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
      baseConstraints.push(orderBy("searchName", "asc"));
    } else {
      baseConstraints.push(orderBy("name", "asc"));
    }

    // Count Query
    const countConstraints: QueryConstraint[] = [];
    if (options.brandId && options.brandId !== "all") {
      countConstraints.push(where("vehicleBrandId", "==", options.brandId));
    } else if (options.categoryId && options.categoryId !== "all") {
      countConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }
    if (cleanSearch) {
      countConstraints.push(where("searchName", ">=", cleanSearch));
      countConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
    }
    const countQ = query(
      collection(db, COLS.VEHICLE_MODELS),
      ...countConstraints,
    );
    const countSnap = await getCountFromServer(countQ);
    const totalCount = countSnap.data().count;

    // Data Query
    const dataConstraints: QueryConstraint[] = [...baseConstraints];
    if (options.direction === "next" && options.cursorDoc) {
      dataConstraints.push(startAfter(options.cursorDoc), limit(pageSize));
    } else if (options.direction === "prev" && options.cursorDoc) {
      dataConstraints.push(endBefore(options.cursorDoc), limitToLast(pageSize));
    } else {
      dataConstraints.push(limit(pageSize));
    }

    const dataQ = query(
      collection(db, COLS.VEHICLE_MODELS),
      ...dataConstraints,
    );
    const snap = await getDocs(dataQ);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleModel,
    );

    return {
      items,
      totalCount,
      firstDoc: snap.docs[0] || null,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  } catch (error) {
    console.error("Failed to get paginated vehicle models:", error);
    throw new Error("Could not fetch vehicle models from database.");
  }
}

export async function getPaginatedVehicleVariants(options: {
  categoryId?: string;
  brandId?: string;
  modelId?: string;
  search?: string;
  pageSize?: number;
  cursorDoc?: DocumentSnapshot | null;
  direction?: "first" | "next" | "prev";
}): Promise<PaginatedResult<VehicleVariant>> {
  try {
    const pageSize = options.pageSize || 10;
    const cleanSearch = (options.search || "")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "");

    const baseConstraints: QueryConstraint[] = [];
    if (options.modelId && options.modelId !== "all") {
      baseConstraints.push(where("vehicleModelId", "==", options.modelId));
    } else if (options.brandId && options.brandId !== "all") {
      baseConstraints.push(where("vehicleBrandId", "==", options.brandId));
    } else if (options.categoryId && options.categoryId !== "all") {
      baseConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }

    if (cleanSearch) {
      baseConstraints.push(where("searchName", ">=", cleanSearch));
      baseConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
      baseConstraints.push(orderBy("searchName", "asc"));
    } else {
      baseConstraints.push(orderBy("name", "asc"));
    }

    // Count Query
    const countConstraints: QueryConstraint[] = [];
    if (options.modelId && options.modelId !== "all") {
      countConstraints.push(where("vehicleModelId", "==", options.modelId));
    } else if (options.brandId && options.brandId !== "all") {
      countConstraints.push(where("vehicleBrandId", "==", options.brandId));
    } else if (options.categoryId && options.categoryId !== "all") {
      countConstraints.push(
        where("vehicleCategoryId", "==", options.categoryId),
      );
    }
    if (cleanSearch) {
      countConstraints.push(where("searchName", ">=", cleanSearch));
      countConstraints.push(where("searchName", "<=", cleanSearch + "\uf8ff"));
    }
    const countQ = query(
      collection(db, COLS.VEHICLE_VARIANTS),
      ...countConstraints,
    );
    const countSnap = await getCountFromServer(countQ);
    const totalCount = countSnap.data().count;

    // Data Query
    const dataConstraints: QueryConstraint[] = [...baseConstraints];
    if (options.direction === "next" && options.cursorDoc) {
      dataConstraints.push(startAfter(options.cursorDoc), limit(pageSize));
    } else if (options.direction === "prev" && options.cursorDoc) {
      dataConstraints.push(endBefore(options.cursorDoc), limitToLast(pageSize));
    } else {
      dataConstraints.push(limit(pageSize));
    }

    const dataQ = query(
      collection(db, COLS.VEHICLE_VARIANTS),
      ...dataConstraints,
    );
    const snap = await getDocs(dataQ);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as VehicleVariant,
    );

    return {
      items,
      totalCount,
      firstDoc: snap.docs[0] || null,
      lastDoc: snap.docs[snap.docs.length - 1] || null,
    };
  } catch (error) {
    console.error("Failed to get paginated vehicle variants:", error);
    throw new Error("Could not fetch vehicle variants from database.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PART MASTERS
// ─────────────────────────────────────────────────────────────────────────────

export async function getPartCategories(): Promise<PartCategory[]> {
  try {
    const q = query(collection(db, COLS.PART_CATEGORIES));
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as PartCategory,
    );
    return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    console.error("Failed to get part categories:", error);
    throw new Error("Could not fetch part categories from database.");
  }
}

export async function savePartCategory(
  cat: Partial<PartCategory>,
): Promise<string> {
  try {
    const id = cat.id || doc(collection(db, COLS.PART_CATEGORIES)).id;
    const docRef = doc(db, COLS.PART_CATEGORIES, id);
    const data = stripUndefined({
      name: cat.name || "",
      slug:
        cat.slug || cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "",
      searchName:
        cat.searchName ||
        cat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      image: cat.image || "",
      description: cat.description || "",
      isActive: cat.isActive !== undefined ? cat.isActive : true,
      sortOrder: Number(cat.sortOrder) || 0,
      updatedAt: serverTimestamp(),
      ...(cat.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save part category:", error);
    throw new Error("Could not save part category to database.");
  }
}

export async function deletePartCategory(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.PART_CATEGORIES, id));
  } catch (error) {
    console.error("Failed to delete part category:", error);
    throw new Error("Could not delete part category from database.");
  }
}

// Part Subcategories
export async function getPartSubcategories(
  categoryId?: string,
): Promise<PartSubcategory[]> {
  try {
    let q;
    if (categoryId && categoryId !== "all") {
      q = query(
        collection(db, COLS.PART_SUBCATEGORIES),
        where("categoryId", "==", categoryId),
      );
    } else {
      q = query(collection(db, COLS.PART_SUBCATEGORIES));
    }
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as PartSubcategory,
    );
    return items.sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  } catch (error) {
    console.error("Failed to get part subcategories:", error);
    throw new Error("Could not fetch part subcategories from database.");
  }
}

export async function savePartSubcategory(
  subcat: Partial<PartSubcategory>,
): Promise<string> {
  try {
    const id = subcat.id || doc(collection(db, COLS.PART_SUBCATEGORIES)).id;
    const docRef = doc(db, COLS.PART_SUBCATEGORIES, id);
    const data = stripUndefined({
      categoryId: subcat.categoryId || "",
      categoryName: subcat.categoryName || "",
      name: subcat.name || "",
      slug:
        subcat.slug ||
        subcat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "",
      searchName:
        subcat.searchName ||
        subcat.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      image: subcat.image || "",
      description: subcat.description || "",
      isActive: subcat.isActive !== undefined ? subcat.isActive : true,
      sortOrder: Number(subcat.sortOrder) || 0,
      updatedAt: serverTimestamp(),
      ...(subcat.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save part subcategory:", error);
    throw new Error("Could not save part subcategory to database.");
  }
}

export async function deletePartSubcategory(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.PART_SUBCATEGORIES, id));
  } catch (error) {
    console.error("Failed to delete part subcategory:", error);
    throw new Error("Could not delete part subcategory from database.");
  }
}

// Part Brands
export async function getPartBrands(): Promise<PartBrand[]> {
  try {
    const q = query(collection(db, COLS.PART_BRANDS));
    const snap = await getDocs(q);
    const items = snap.docs.map(
      (d) => ({ ...d.data(), id: d.id }) as PartBrand,
    );
    return items.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error("Failed to get part brands:", error);
    throw new Error("Could not fetch part brands from database.");
  }
}

export async function savePartBrand(
  brand: Partial<PartBrand>,
): Promise<string> {
  try {
    const id = brand.id || doc(collection(db, COLS.PART_BRANDS)).id;
    const docRef = doc(db, COLS.PART_BRANDS, id);
    const data = stripUndefined({
      name: brand.name || "",
      slug:
        brand.slug ||
        brand.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "",
      searchName:
        brand.searchName ||
        brand.name?.toLowerCase().replace(/[^a-z0-9]+/g, "") ||
        "",
      logo: brand.logo || "",
      description: brand.description || "",
      isActive: brand.isActive !== undefined ? brand.isActive : true,
      updatedAt: serverTimestamp(),
      ...(brand.id ? {} : { createdAt: serverTimestamp() }),
    });
    await setDoc(docRef, data, { merge: true });
    return id;
  } catch (error) {
    console.error("Failed to save part brand:", error);
    throw new Error("Could not save part brand to database.");
  }
}

export async function deletePartBrand(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, COLS.PART_BRANDS, id));
  } catch (error) {
    console.error("Failed to delete part brand:", error);
    throw new Error("Could not delete part brand from database.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PRODUCTS & RELATIONS
// ─────────────────────────────────────────────────────────────────────────────

export async function getAllProducts(): Promise<Product[]> {
  try {
    const q = query(collection(db, COLS.PRODUCTS));
    const snap = await getDocs(q);
    const items = snap.docs
      .map((d) => ({ ...d.data(), id: d.id }) as Product)
      .filter((p) => !p.isDeleted);
    return items.sort(
      (a, b) =>
        (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0),
    );
  } catch (error) {
    console.error("Failed to get all products:", error);
    throw new Error("Could not fetch products from database.");
  }
}

export async function getProductById(
  productId: string,
): Promise<Product | null> {
  try {
    const docRef = doc(db, COLS.PRODUCTS, productId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;
    const product = { ...snap.data(), id: snap.id } as Product;

    // Load fitments if not already embedded
    if (!product.fitments || product.fitments.length === 0) {
      try {
        const fitSnap = await getDocs(
          query(
            collection(db, COLS.PRODUCT_FITMENTS),
            where("productId", "==", productId),
          ),
        );
        product.fitments = fitSnap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as ProductFitment,
        );
      } catch (e) {
        console.warn("Could not load separate product fitments", e);
      }
    }

    // Load specs
    if (!product.specifications || product.specifications.length === 0) {
      try {
        const specSnap = await getDocs(
          query(
            collection(db, COLS.PRODUCT_ATTRIBUTES),
            where("productId", "==", productId),
          ),
        );
        product.specifications = specSnap.docs.map(
          (d) => ({ ...d.data(), id: d.id }) as ProductSpecification,
        );
      } catch (e) {
        console.warn("Could not load separate product specifications", e);
      }
    }

    // Load numbers (OEM / cross ref)
    if (!product.numbers || product.numbers.length === 0) {
      try {
        const [oemSnap, crossSnap] = await Promise.all([
          getDocs(
            query(
              collection(db, COLS.OEM_NUMBERS),
              where("productId", "==", productId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.CROSS_REF_NUMBERS),
              where("productId", "==", productId),
            ),
          ),
        ]);
        product.numbers = [
          ...oemSnap.docs.map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
                type: "OEM" as const,
              }) as ProductNumber,
          ),
          ...crossSnap.docs.map(
            (d) =>
              ({
                ...d.data(),
                id: d.id,
                type: "Cross Reference" as const,
              }) as ProductNumber,
          ),
        ];
      } catch (e) {
        console.warn("Could not load separate product numbers", e);
      }
    }

    return product;
  } catch (error) {
    console.error("Failed to get product by id:", error);
    throw new Error(
      `Could not fetch product with ID ${productId} from database.`,
    );
  }
}

export async function saveProductWithRelations(
  productData: Partial<Product>,
  fitments: ProductFitment[],
  specifications: ProductSpecification[],
  numbers: ProductNumber[],
): Promise<string> {
  try {
    const batch = writeBatch(db);
    const isNew = !productData.id;
    const productId = productData.id || doc(collection(db, COLS.PRODUCTS)).id;
    const productDocRef = doc(db, COLS.PRODUCTS, productId);

    // Clean and prepare product doc
    const cleanedProduct = stripUndefined({
      name: productData.name || "",
      slug:
        productData.slug ||
        productData.name?.toLowerCase().replace(/[^a-z0-9]+/g, "-") ||
        "",
      sku: productData.sku || "",
      categoryId: productData.categoryId || "",
      categoryName: productData.categoryName || "",
      subCategoryId: productData.subCategoryId || "",
      subCategoryName: productData.subCategoryName || "",
      partBrandId: productData.partBrandId || "",
      partBrandName: productData.partBrandName || "",
      description: productData.description || "",
      shortDescription: productData.shortDescription || "",
      images: productData.images || [],
      price: Number(productData.price) || 0,
      salePrice: Number(productData.salePrice) || 0,
      taxPercentage: Number(productData.taxPercentage) || 0,
      stock: Number(productData.stock) || 0,
      condition: productData.condition || "New",
      warranty: productData.warranty || "",
      position: productData.position || "Front",
      side: productData.side || "Both",
      weight: productData.weight || "",
      dimensions: productData.dimensions || "",
      isActive:
        productData.isActive !== undefined ? productData.isActive : true,
      isFeatured: productData.isFeatured || false,
      isDeleted: false,
      // Embedded relations for fast listing/view without N+1 query overhead
      fitments: fitments.map((f) => stripUndefined(f)),
      specifications: specifications.map((s) => stripUndefined(s)),
      numbers: numbers.map((n) => stripUndefined(n)),
      updatedAt: serverTimestamp(),
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
    });

    batch.set(productDocRef, cleanedProduct, { merge: true });

    // If editing, clear existing relational subcollection entries first
    if (!isNew) {
      try {
        const [oldFitments, oldSpecs, oldOems, oldCross] = await Promise.all([
          getDocs(
            query(
              collection(db, COLS.PRODUCT_FITMENTS),
              where("productId", "==", productId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.PRODUCT_ATTRIBUTES),
              where("productId", "==", productId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.OEM_NUMBERS),
              where("productId", "==", productId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.CROSS_REF_NUMBERS),
              where("productId", "==", productId),
            ),
          ),
        ]);
        oldFitments.docs.forEach((d) => batch.delete(d.ref));
        oldSpecs.docs.forEach((d) => batch.delete(d.ref));
        oldOems.docs.forEach((d) => batch.delete(d.ref));
        oldCross.docs.forEach((d) => batch.delete(d.ref));
      } catch (e) {
        console.warn("Error clearing old relations during product update", e);
      }
    }

    // Populate separate collections per inventory.md
    fitments.forEach((f) => {
      const fRef = doc(collection(db, COLS.PRODUCT_FITMENTS));
      batch.set(
        fRef,
        stripUndefined({
          ...f,
          productId,
          createdAt: serverTimestamp(),
        }),
      );
    });

    specifications.forEach((s) => {
      const sRef = doc(collection(db, COLS.PRODUCT_ATTRIBUTES));
      batch.set(
        sRef,
        stripUndefined({
          productId,
          name: s.name,
          value: s.value,
          createdAt: serverTimestamp(),
        }),
      );
    });

    numbers.forEach((n) => {
      if (n.type === "OEM") {
        const oRef = doc(collection(db, COLS.OEM_NUMBERS));
        batch.set(
          oRef,
          stripUndefined({
            productId,
            number: n.number,
            manufacturer: n.brand || "",
            notes: n.notes || "",
            createdAt: serverTimestamp(),
          }),
        );
      } else {
        const cRef = doc(collection(db, COLS.CROSS_REF_NUMBERS));
        batch.set(
          cRef,
          stripUndefined({
            productId,
            partNumber: n.number,
            brand: n.brand || "",
            notes: n.notes || "",
            createdAt: serverTimestamp(),
          }),
        );
      }
    });

    await batch.commit();
    return productId;
  } catch (error) {
    console.error("Failed to save product with relations:", error);
    throw new Error("Could not save product and its relations to database.");
  }
}

export async function softDeleteProduct(productId: string): Promise<void> {
  try {
    const docRef = doc(db, COLS.PRODUCTS, productId);
    await updateDoc(docRef, {
      isDeleted: true,
      isActive: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to soft delete product:", error);
    throw new Error("Could not soft delete product from database.");
  }
}

export async function restoreProduct(productId: string): Promise<void> {
  try {
    const docRef = doc(db, COLS.PRODUCTS, productId);
    await updateDoc(docRef, {
      isDeleted: false,
      isActive: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to restore product:", error);
    throw new Error("Could not restore product in database.");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EXCEL IMPORT / EXPORT UTILITIES
// ─────────────────────────────────────────────────────────────────────────────

export interface ExcelImportRow {
  productName: string;
  sku: string;
  partBrand: string;
  partCategory: string;
  partSubCategory: string;
  shortDescription: string;
  description: string;
  price: number;
  salePrice: number;
  taxPercentage: number;
  stock: number;
  condition: "New" | "Refurbished" | "Used";
  warranty: string;
  position: string;
  side: string;
  weight: string;
  dimensions: string;
  vehicleCategory: string;
  vehicleBrand: string;
  vehicleModel: string;
  vehicleVariant: string;
  yearFrom: number;
  yearTo: number;
  fuelType: string;
  engine: string;
  transmission: string;
  oemNumber: string;
  oemBrand: string;
  spec1Name: string;
  spec1Value: string;
  spec2Name: string;
  spec2Value: string;
  imageUrl: string;
  isActive: boolean;
  isFeatured: boolean;
}

export interface ImportProgress {
  total: number;
  current: number;
  currentItem: string;
  mastersCreated: number;
  mastersSkipped: number;
  productsCreated: number;
  errors: { row: number; message: string }[];
  done: boolean;
}

/** Download a pre-filled sample Excel file demonstrating the import format */
export function downloadSampleExcel(): void {
  // Dynamically import xlsx to avoid top-level side effects
  import("xlsx").then((XLSX) => {
    const headers = [
      "Product Name*",
      "SKU",
      "Part Brand*",
      "Part Category*",
      "Part SubCategory",
      "Short Description",
      "Description",
      "MRP Price (₹)*",
      "Sale Price (₹)",
      "Tax %",
      "Stock Qty",
      "Condition",
      "Warranty",
      "Position",
      "Side",
      "Weight",
      "Dimensions",
      "Vehicle Category",
      "Vehicle Brand",
      "Vehicle Model",
      "Vehicle Variant",
      "Year From",
      "Year To",
      "Fuel Type",
      "Engine",
      "Transmission",
      "OEM Number",
      "OEM Brand",
      "Spec 1 Name",
      "Spec 1 Value",
      "Spec 2 Name",
      "Spec 2 Value",
      "Image URL",
      "Is Active",
      "Is Featured",
    ];

    const sampleRows = [
      [
        "Bosch Front Brake Pad Set",
        "BOS-BP-001",
        "Bosch",
        "Brake System",
        "Brake Pads",
        "High-performance ceramic front brake pads",
        "Premium ceramic compound brake pads for superior stopping power and low dust.",
        2499,
        1999,
        18,
        50,
        "New",
        "1 Year",
        "Front",
        "Both",
        "0.8 kg",
        "110x45x15mm",
        "Car",
        "Maruti Suzuki",
        "Swift",
        "VXi",
        2018,
        2024,
        "Petrol",
        "1.2L K-Series",
        "Manual",
        "0986424748",
        "Bosch",
        "Material",
        "Ceramic",
        "Thickness",
        "15 mm",
        "https://example.com/brake-pad.jpg",
        "TRUE",
        "FALSE",
      ],
      [
        "Bosch Front Brake Pad Set",
        "BOS-BP-001",
        "Bosch",
        "Brake System",
        "Brake Pads",
        "",
        "",
        2499,
        1999,
        18,
        50,
        "New",
        "1 Year",
        "Front",
        "Both",
        "",
        "",
        "Car",
        "Maruti Suzuki",
        "Swift",
        "ZXi",
        2020,
        2024,
        "Petrol",
        "1.2L K-Series",
        "Automatic",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        "TRUE",
        "FALSE",
      ],
      [
        "Denso Ignition Coil",
        "DNS-IC-002",
        "Denso",
        "Ignition System",
        "Ignition Coils",
        "OEM quality ignition coil for smooth engine start",
        "Direct fit ignition coil compatible with multiple Honda models.",
        3200,
        2800,
        18,
        30,
        "New",
        "6 Months",
        "Universal",
        "N/A",
        "0.4 kg",
        "80x60x50mm",
        "Car",
        "Honda",
        "City",
        "SV CVT",
        2017,
        2023,
        "Petrol",
        "1.5L i-VTEC",
        "CVT",
        "30520-RNA-A01",
        "Honda",
        "Material",
        "Copper Alloy",
        "Resistance",
        "0.8-1.2 Ω",
        "https://example.com/ignition-coil.jpg",
        "TRUE",
        "TRUE",
      ],
    ];

    const wsData = [headers, ...sampleRows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Set column widths
    ws["!cols"] = headers.map((h, i) => ({
      wch:
        [
          30, 15, 15, 20, 20, 35, 50, 15, 15, 8, 10, 12, 12, 12, 8, 12, 15, 15,
          18, 15, 12, 10, 10, 10, 15, 12, 20, 15, 15, 15, 15, 15, 40, 10, 10,
        ][i] || 15,
    }));

    // Style headers (bold)
    const headerRange = XLSX.utils.decode_range(ws["!ref"] || "A1");
    for (let c = headerRange.s.c; c <= headerRange.e.c; c++) {
      const cellAddr = XLSX.utils.encode_cell({ r: 0, c });
      if (!ws[cellAddr]) continue;
      ws[cellAddr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "EA580C" } },
        alignment: { horizontal: "center" },
      };
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");

    // Instructions sheet
    const instrData = [
      ["SPARE WILL – Product Import Instructions"],
      [""],
      ["REQUIRED COLUMNS (marked with *)"],
      ["• Product Name* – Unique name for the product"],
      [
        "• Part Brand* – Brand/manufacturer of the spare part (e.g. Bosch, Denso)",
      ],
      ["• Part Category* – Main category (e.g. Brake System, Ignition System)"],
      ["• MRP Price (₹)* – Base retail price in rupees"],
      [""],
      ["MASTER DATA AUTO-CREATION"],
      [
        "Vehicle Category/Brand/Model/Variant will be created automatically if they don't exist.",
      ],
      [
        "Part Category/SubCategory/Brand will be created automatically if they don't exist.",
      ],
      [
        "Matching is done by name (case-insensitive). Existing records are NOT duplicated.",
      ],
      [""],
      ["MULTIPLE FITMENTS PER PRODUCT"],
      [
        "To add multiple vehicle fitments to one product, repeat the Product Name in multiple rows.",
      ],
      [
        "Pricing, specs, and OEM numbers from the FIRST row of that product are used.",
      ],
      [""],
      ["VALID VALUES"],
      ["Condition: New | Refurbished | Used"],
      ["Position: Front | Rear | Universal | Front & Rear"],
      ["Side: Both | Left | Right | N/A"],
      ["Fuel Type: Petrol | Diesel | CNG | Electric | Hybrid | Other"],
      ["Transmission: Manual | Automatic | AMT | CVT | DCT | Other"],
      ["Is Active / Is Featured: TRUE or FALSE"],
    ];
    const wsInstr = XLSX.utils.aoa_to_sheet(instrData);
    wsInstr["!cols"] = [{ wch: 80 }];
    XLSX.utils.book_append_sheet(wb, wsInstr, "Instructions");

    XLSX.writeFile(wb, "spare_will_product_import_sample.xlsx");
  });
}

/** Parse rows from uploaded Excel file into ExcelImportRow[] */
export async function parseExcelFile(file: File): Promise<ExcelImportRow[]> {
  const XLSX = await import("xlsx");
  const data = await file.arrayBuffer();
  const wb = XLSX.read(data, { type: "array" });

  // Use first sheet
  const ws = wb.Sheets[wb.SheetNames[0]];
  const raw: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  if (raw.length < 2)
    throw new Error("Excel file is empty or has no data rows.");

  // Map headers (row 0) to column indices
  const headers: string[] = (raw[0] as string[]).map((h) =>
    String(h || "").trim(),
  );
  const col = (name: string) =>
    headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

  const rows: ExcelImportRow[] = [];
  for (let i = 1; i < raw.length; i++) {
    const r: any[] = raw[i];
    const get = (idx: number) => (idx >= 0 ? String(r[idx] ?? "").trim() : "");
    const getNum = (idx: number, def = 0) => {
      const v = Number(r[idx]);
      return isNaN(v) ? def : v;
    };
    const getBool = (idx: number, def = true) => {
      const v = get(idx).toLowerCase();
      if (v === "false" || v === "0" || v === "no") return false;
      if (v === "true" || v === "1" || v === "yes") return true;
      return def;
    };

    const productName = get(col("product name"));
    if (!productName) continue; // skip empty rows

    rows.push({
      productName,
      sku: get(col("sku")),
      partBrand: get(col("part brand")),
      partCategory: get(col("part category")),
      partSubCategory: get(col("part sub")),
      shortDescription: get(col("short desc")),
      description: get(col("description")),
      price: getNum(col("mrp"), 0),
      salePrice: getNum(col("sale price"), 0),
      taxPercentage: getNum(col("tax"), 18),
      stock: getNum(col("stock"), 0),
      condition: (get(col("condition")) as any) || "New",
      warranty: get(col("warranty")),
      position: get(col("position")) || "Front",
      side: get(col("side")) || "Both",
      weight: get(col("weight")),
      dimensions: get(col("dimensions")),
      vehicleCategory: get(col("vehicle category")),
      vehicleBrand: get(col("vehicle brand")),
      vehicleModel: get(col("vehicle model")),
      vehicleVariant: get(col("vehicle variant")),
      yearFrom: getNum(col("year from"), 2018),
      yearTo: getNum(col("year to"), new Date().getFullYear()),
      fuelType: get(col("fuel type")) || "Petrol",
      engine: get(col("engine")),
      transmission: get(col("transmission")) || "Manual",
      oemNumber: get(col("oem number")),
      oemBrand: get(col("oem brand")),
      spec1Name: get(col("spec 1 name")),
      spec1Value: get(col("spec 1 value")),
      spec2Name: get(col("spec 2 name")),
      spec2Value: get(col("spec 2 value")),
      imageUrl: get(col("image url")),
      isActive: getBool(col("is active"), true),
      isFeatured: getBool(col("is featured"), false),
    });
  }

  return rows;
}

/**
 * Import products from parsed Excel rows.
 * Creates all masters (vehicle/part) if not existing, then upserts products.
 * Reports progress via onProgress callback.
 */
export async function importProductsFromExcel(
  rows: ExcelImportRow[],
  onProgress: (p: ImportProgress) => void,
): Promise<void> {
  const progress: ImportProgress = {
    total: rows.length,
    current: 0,
    currentItem: "Loading existing master data...",
    mastersCreated: 0,
    mastersSkipped: 0,
    productsCreated: 0,
    errors: [],
    done: false,
  };
  onProgress({ ...progress });

  // ── 1. Load all existing master data into memory for fast lookup ──
  const [
    existingVehCats,
    existingVehBrands,
    existingVehModels,
    existingVehVariants,
    existingPartCats,
    existingPartSubs,
    existingPartBrands,
  ] = await Promise.all([
    getVehicleCategories(),
    getVehicleBrands(),
    getVehicleModels(),
    getVehicleVariants(),
    getPartCategories(),
    getPartSubcategories(),
    getPartBrands(),
  ]);

  // Working caches (mutable, updated as we create new records)
  const vehCatCache = new Map(
    existingVehCats.map((c) => [c.name.toLowerCase().trim(), c]),
  );
  const vehBrandCache = new Map(
    existingVehBrands.map((b) => [
      `${b.vehicleCategoryId}|${b.name.toLowerCase().trim()}`,
      b,
    ]),
  );
  const vehModelCache = new Map(
    existingVehModels.map((m) => [
      `${m.vehicleBrandId}|${m.name.toLowerCase().trim()}`,
      m,
    ]),
  );
  const vehVariantCache = new Map(
    existingVehVariants.map((v) => [
      `${v.vehicleModelId}|${v.name.toLowerCase().trim()}`,
      v,
    ]),
  );
  const partCatCache = new Map(
    existingPartCats.map((c) => [c.name.toLowerCase().trim(), c]),
  );
  const partSubCatCache = new Map(
    existingPartSubs.map((s) => [
      `${s.categoryId}|${s.name.toLowerCase().trim()}`,
      s,
    ]),
  );
  const partBrandCache = new Map(
    existingPartBrands.map((b) => [b.name.toLowerCase().trim(), b]),
  );

  // ── 2. Helper: get-or-create each master type ──
  const getOrCreateVehCat = async (name: string) => {
    const key = name.toLowerCase().trim();
    if (vehCatCache.has(key)) {
      progress.mastersSkipped++;
      return vehCatCache.get(key)!;
    }
    const id = await saveVehicleCategory({
      name,
      isActive: true,
      sortOrder: 0,
    });
    const rec = {
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
      sortOrder: 0,
    };
    vehCatCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreateVehBrand = async (
    catId: string,
    catName: string,
    name: string,
  ) => {
    const key = `${catId}|${name.toLowerCase().trim()}`;
    if (vehBrandCache.has(key)) {
      progress.mastersSkipped++;
      return vehBrandCache.get(key)!;
    }
    const id = await saveVehicleBrand({
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      name,
      isActive: true,
    });
    const rec = {
      id,
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
    };
    vehBrandCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreateVehModel = async (
    catId: string,
    catName: string,
    brandId: string,
    brandName: string,
    name: string,
  ) => {
    const key = `${brandId}|${name.toLowerCase().trim()}`;
    if (vehModelCache.has(key)) {
      progress.mastersSkipped++;
      return vehModelCache.get(key)!;
    }
    const id = await saveVehicleModel({
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      vehicleBrandId: brandId,
      vehicleBrandName: brandName,
      name,
      isActive: true,
    });
    const rec = {
      id,
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      vehicleBrandId: brandId,
      vehicleBrandName: brandName,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
    };
    vehModelCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreateVehVariant = async (
    catId: string,
    catName: string,
    brandId: string,
    brandName: string,
    modelId: string,
    modelName: string,
    row: ExcelImportRow,
  ) => {
    const variantName = row.vehicleVariant || "Standard";
    const key = `${modelId}|${variantName.toLowerCase().trim()}`;
    if (vehVariantCache.has(key)) {
      progress.mastersSkipped++;
      return vehVariantCache.get(key)!;
    }
    const id = await saveVehicleVariant({
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      vehicleBrandId: brandId,
      vehicleBrandName: brandName,
      vehicleModelId: modelId,
      vehicleModelName: modelName,
      name: variantName,
      yearFrom: row.yearFrom || 2018,
      yearTo: row.yearTo || new Date().getFullYear(),
      fuelType: (row.fuelType as any) || "Petrol",
      engine: row.engine || "",
      transmission: (row.transmission as any) || "Manual",
      isActive: true,
    });
    const rec = {
      id,
      vehicleCategoryId: catId,
      vehicleCategoryName: catName,
      vehicleBrandId: brandId,
      vehicleBrandName: brandName,
      vehicleModelId: modelId,
      vehicleModelName: modelName,
      name: variantName,
      yearFrom: row.yearFrom,
      yearTo: row.yearTo,
      fuelType: row.fuelType as any,
      engine: row.engine,
      transmission: row.transmission as any,
      isActive: true,
    };
    vehVariantCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreatePartCat = async (name: string) => {
    const key = name.toLowerCase().trim();
    if (partCatCache.has(key)) {
      progress.mastersSkipped++;
      return partCatCache.get(key)!;
    }
    const id = await savePartCategory({
      name,
      isActive: true,
      sortOrder: 0,
    });
    const rec = {
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
      sortOrder: 0,
    };
    partCatCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreatePartSubCat = async (
    categoryId: string,
    categoryName: string,
    name: string,
  ) => {
    const key = `${categoryId}|${name.toLowerCase().trim()}`;
    if (partSubCatCache.has(key)) {
      progress.mastersSkipped++;
      return partSubCatCache.get(key)!;
    }
    const id = await savePartSubcategory({
      categoryId,
      categoryName,
      name,
      isActive: true,
      sortOrder: 0,
    });
    const rec = {
      id,
      categoryId,
      categoryName,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
      sortOrder: 0,
    };
    partSubCatCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  const getOrCreatePartBrand = async (name: string) => {
    const key = name.toLowerCase().trim();
    if (partBrandCache.has(key)) {
      progress.mastersSkipped++;
      return partBrandCache.get(key)!;
    }
    const id = await savePartBrand({ name, isActive: true });
    const rec = {
      id,
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      isActive: true,
    };
    partBrandCache.set(key, rec);
    progress.mastersCreated++;
    return rec;
  };

  // ── 3. Group rows by product name (first occurrence wins for product fields) ──
  interface ProductGroup {
    firstRow: ExcelImportRow;
    rowIndices: number[];
    fitments: ProductFitment[];
    specs: ProductSpecification[];
    numbers: ProductNumber[];
    images: string[];
  }

  const productMap = new Map<string, ProductGroup>();
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const key = row.productName.toLowerCase().trim();
    if (!productMap.has(key)) {
      productMap.set(key, {
        firstRow: row,
        rowIndices: [i],
        fitments: [],
        specs: [],
        numbers: [],
        images: [],
      });
    } else {
      productMap.get(key)!.rowIndices.push(i);
    }
  }

  // ── 4. Process each product group ──
  const productGroups = Array.from(productMap.values());
  for (let gi = 0; gi < productGroups.length; gi++) {
    const group = productGroups[gi];
    const firstRow = group.firstRow;
    progress.current = gi + 1;
    progress.currentItem = `Processing: ${firstRow.productName}`;
    onProgress({ ...progress });

    try {
      // ── 4a. Part masters ──
      let partCatRec: PartCategory | undefined;
      let partSubCatRec: PartSubcategory | undefined;

      if (firstRow.partCategory) {
        partCatRec = await getOrCreatePartCat(firstRow.partCategory);
        if (firstRow.partSubCategory && partCatRec) {
          partSubCatRec = await getOrCreatePartSubCat(
            partCatRec.id,
            partCatRec.name,
            firstRow.partSubCategory,
          );
        }
      }
      if (firstRow.partBrand) {
        await getOrCreatePartBrand(firstRow.partBrand);
      }

      // ── 4b. Specs (from first row only) ──
      const specs: ProductSpecification[] = [];
      if (firstRow.spec1Name && firstRow.spec1Value)
        specs.push({ name: firstRow.spec1Name, value: firstRow.spec1Value });
      if (firstRow.spec2Name && firstRow.spec2Value)
        specs.push({ name: firstRow.spec2Name, value: firstRow.spec2Value });

      // ── 4c. OEM number (from first row only) ──
      const numbers: ProductNumber[] = [];
      if (firstRow.oemNumber)
        numbers.push({
          number: firstRow.oemNumber,
          type: "OEM",
          brand: firstRow.oemBrand,
          notes: "",
        });

      // ── 4d. Images ──
      const images = firstRow.imageUrl ? [firstRow.imageUrl] : [];

      // ── 4e. Fitments — iterate all rows in group ──
      const fitments: ProductFitment[] = [];
      for (const ri of group.rowIndices) {
        const row = rows[ri];
        if (!row.vehicleCategory || !row.vehicleBrand || !row.vehicleModel)
          continue;

        try {
          const vCat = await getOrCreateVehCat(row.vehicleCategory);
          const vBrand = await getOrCreateVehBrand(
            vCat.id,
            vCat.name,
            row.vehicleBrand,
          );
          const vModel = await getOrCreateVehModel(
            vCat.id,
            vCat.name,
            vBrand.id,
            vBrand.name,
            row.vehicleModel,
          );
          const vVariant = await getOrCreateVehVariant(
            vCat.id,
            vCat.name,
            vBrand.id,
            vBrand.name,
            vModel.id,
            vModel.name,
            row,
          );

          // Duplicate fitment check
          const isDup = fitments.some(
            (f) =>
              f.vehicleModelId === vModel.id &&
              (!row.vehicleVariant || f.vehicleVariantId === vVariant.id),
          );
          if (!isDup) {
            fitments.push({
              vehicleCategoryId: vCat.id,
              vehicleCategoryName: vCat.name,
              vehicleBrandId: vBrand.id,
              vehicleBrandName: vBrand.name,
              vehicleModelId: vModel.id,
              vehicleModelName: vModel.name,
              vehicleVariantId: vVariant.id,
              vehicleVariantName: vVariant.name,
              yearFrom: row.yearFrom || 2018,
              yearTo: row.yearTo || new Date().getFullYear(),
              fuelType: (row.fuelType as any) || "Any",
              engine: row.engine || "Standard",
              transmission: (row.transmission as any) || "Standard",
            });
          }
        } catch (err: any) {
          progress.errors.push({
            row: ri + 2,
            message: `Vehicle master error on row ${ri + 2}: ${err.message}`,
          });
        }
      }

      // ── 4f. Resolve Part Brand + Category IDs for product ──
      const partBrandRec = firstRow.partBrand
        ? partBrandCache.get(firstRow.partBrand.toLowerCase().trim())
        : undefined;
      if (!partCatRec && firstRow.partCategory) {
        partCatRec = partCatCache.get(firstRow.partCategory.toLowerCase().trim());
      }
      if (!partSubCatRec && firstRow.partSubCategory && partCatRec) {
        partSubCatRec = partSubCatCache.get(
          `${partCatRec.id}|${firstRow.partSubCategory.toLowerCase().trim()}`,
        );
      }

      // ── 4g. Save product ──
      const productData: Partial<Product> = {
        name: firstRow.productName,
        sku: firstRow.sku || `SKU-${Date.now()}`,
        slug: firstRow.productName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        partBrandId: partBrandRec?.id || "",
        partBrandName: partBrandRec?.name || firstRow.partBrand || "",
        categoryId: partCatRec?.id || "",
        categoryName: partCatRec?.name || firstRow.partCategory || "",
        subCategoryId: partSubCatRec?.id || "",
        subCategoryName: partSubCatRec?.name || firstRow.partSubCategory || "",
        shortDescription: firstRow.shortDescription,
        description: firstRow.description,
        images,
        price: firstRow.price || 0,
        salePrice: firstRow.salePrice || firstRow.price || 0,
        taxPercentage: firstRow.taxPercentage || 18,
        stock: firstRow.stock || 0,
        condition: firstRow.condition || "New",
        warranty: firstRow.warranty || "",
        position: firstRow.position || "Front",
        side: firstRow.side || "Both",
        weight: firstRow.weight || "",
        dimensions: firstRow.dimensions || "",
        isActive: firstRow.isActive,
        isFeatured: firstRow.isFeatured,
      };

      await saveProductWithRelations(productData, fitments, specs, numbers);
      progress.productsCreated++;
    } catch (err: any) {
      progress.errors.push({
        row: group.rowIndices[0] + 2,
        message: `Product "${firstRow.productName}": ${err.message}`,
      });
    }

    onProgress({ ...progress });
  }

  progress.done = true;
  progress.currentItem = "Import complete!";
  onProgress({ ...progress });
}
