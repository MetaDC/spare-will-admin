import {
  collection,
  doc,
  writeBatch,
  setDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from "firebase/firestore";
import { db } from "../lib/firebase";
import { COLS } from "./catalogService";

export const HF_API_BASE =
  "https://datasets-server.huggingface.co/rows?dataset=bhavabhuthi/tco-india";
export const DATASET_PAGE_URL =
  "https://huggingface.co/datasets/bhavabhuthi/tco-india";

export const DEFAULT_CATEGORY_NAME = "CAR";

export interface VehicleImportProgress {
  stage:
    | "idle"
    | "downloading"
    | "parsing"
    | "saving_brands"
    | "saving_models"
    | "saving_variants"
    | "completed"
    | "error";
  message: string;
  percent: number;
  brandsCount: number;
  modelsCount: number;
  variantsCount: number;
}

export interface VehicleImportResult {
  success: boolean;
  categoryId: string;
  categoryName: string;
  brandsCount: number;
  modelsCount: number;
  variantsCount: number;
  error?: string;
}

/**
 * Transforms any string into all lowercase, alphanumeric-only characters without spaces.
 * e.g. "Maruti Suzuki" -> "marutisuzuki", "S-Presso" -> "spresso", "STD (O)" -> "stdo"
 * Allows direct searching in Firestore regardless of spaces, hyphens, or mixed case.
 */
export function toSearchName(text?: string | null): string {
  return (text || "").toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 180);
}

export function mapFuel(
  value?: string | null,
): "Petrol" | "Diesel" | "CNG" | "Electric" | "Hybrid" | "Other" {
  const v = (value || "").toLowerCase().trim();
  if (v.includes("petrol") || v.includes("gasoline")) return "Petrol";
  if (v.includes("diesel")) return "Diesel";
  if (v.includes("cng")) return "CNG";
  if (v.includes("electric") || v === "ev") return "Electric";
  if (v.includes("hybrid")) return "Hybrid";
  return "Other";
}

export function mapTransmission(
  value?: string | null,
): "Manual" | "Automatic" | "AMT" | "CVT" | "DCT" | "Other" {
  const v = (value || "").toLowerCase().trim();
  if (!v) return "Other";
  if (v.includes("dct") || v.includes("dualclutch")) return "DCT";
  if (v.includes("cvt")) return "CVT";
  if (v.includes("amt") || v.includes("automatedmanual")) return "AMT";
  if (v.includes("manual") || v === "mt") return "Manual";
  if (v.includes("automatic") || v === "at" || v.includes("torqueconverter"))
    return "Automatic";
  return "Other";
}

function parseYear(launchedAt?: string | null): number {
  if (launchedAt) {
    const match = String(launchedAt).match(/\b(19|20)\d{2}\b/);
    if (match) return parseInt(match[0], 10);
  }
  return new Date().getFullYear();
}

function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned = {} as any;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    // Do not recurse into Date, Timestamp, or FieldValue objects
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !(value instanceof Date) &&
      typeof (value as any).toDate !== "function" &&
      typeof (value as any).toMillis !== "function" &&
      !(value as any)._methodName
    ) {
      cleaned[key] = stripUndefined(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map((v) =>
        v !== null &&
        typeof v === "object" &&
        !Array.isArray(v) &&
        !(v instanceof Date) &&
        typeof (v as any).toDate !== "function" &&
        typeof (v as any).toMillis !== "function" &&
        !(v as any)._methodName
          ? stripUndefined(v)
          : v,
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

async function commitInChunks<T extends { id: string }>(
  collectionName: string,
  records: T[],
  _label: string,
  onBatchProgress?: (current: number, total: number) => void,
): Promise<void> {
  const CHUNK_SIZE = 400;

  for (let i = 0; i < records.length; i += CHUNK_SIZE) {
    const chunk = records.slice(i, i + CHUNK_SIZE);
    const batch = writeBatch(db);

    for (const record of chunk) {
      const ref = doc(db, collectionName, String(record.id));
      const sanitizedData = stripUndefined(record);
      batch.set(ref, sanitizedData, { merge: true });
    }

    await batch.commit();
    onBatchProgress?.(
      Math.min(i + chunk.length, records.length),
      records.length,
    );
  }
}

export async function importVehicleDataset(options?: {
  categoryId?: string;
  categoryName?: string;
  limit?: number;
  onProgress?: (progress: VehicleImportProgress) => void;
}): Promise<VehicleImportResult> {
  const categoryName = options?.categoryName || DEFAULT_CATEGORY_NAME;
  const limit = options?.limit ?? 0; // 0 = unlimited, import all data
  const onProgress = options?.onProgress;

  try {
    onProgress?.({
      stage: "downloading",
      message: "Checking existing vehicle categories to prevent duplicates...",
      percent: 10,
      brandsCount: 0,
      modelsCount: 0,
      variantsCount: 0,
    });

    const now = Timestamp.now();

    // 0. Resolve or Auto-Generate Category ID for "CAR" (Deduplication)
    let categoryId = options?.categoryId;
    let existingCategoryData: any = null;

    try {
      const existingCategoriesSnap = await getDocs(
        collection(db, COLS.VEHICLE_CATEGORIES),
      );
      const existingCar = existingCategoriesSnap.docs.find((d) => {
        const data = d.data();
        const n = (data.name || "").trim().toUpperCase();
        const s = (data.slug || "").trim().toLowerCase();
        const sn = toSearchName(data.searchName || data.name);
        return n === "CAR" || s === "car" || sn === "car";
      });
      if (existingCar) {
        categoryId = existingCar.id;
        existingCategoryData = existingCar.data();
      }
    } catch (err) {
      console.warn("Could not query existing categories:", err);
    }

    if (!categoryId) {
      const catDocRef = doc(collection(db, COLS.VEHICLE_CATEGORIES));
      categoryId = catDocRef.id;
    }

    // Pre-fetch existing brands, models, and variants under this category for deduplication
    onProgress?.({
      stage: "downloading",
      message: "Loading existing masters to prevent duplicates...",
      percent: 18,
      brandsCount: 0,
      modelsCount: 0,
      variantsCount: 0,
    });

    const existingBrandsMap = new Map<string, any>(); // searchName -> existing Brand Doc
    const existingModelsMap = new Map<string, any>(); // brandId__modelSearchName -> existing Model Doc
    const existingVariantsMap = new Map<string, any>(); // modelId__variantSearchName -> existing Variant Doc

    try {
      const [existingBrandsSnap, existingModelsSnap, existingVariantsSnap] =
        await Promise.all([
          getDocs(
            query(
              collection(db, COLS.VEHICLE_BRANDS),
              where("vehicleCategoryId", "==", categoryId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.VEHICLE_MODELS),
              where("vehicleCategoryId", "==", categoryId),
            ),
          ),
          getDocs(
            query(
              collection(db, COLS.VEHICLE_VARIANTS),
              where("vehicleCategoryId", "==", categoryId),
            ),
          ),
        ]);

      for (const d of existingBrandsSnap.docs) {
        const data = d.data();
        const sn = toSearchName(data.searchName || data.name);
        if (sn) existingBrandsMap.set(sn, { ...data, id: d.id });
      }

      for (const d of existingModelsSnap.docs) {
        const data = d.data();
        const sn = toSearchName(data.searchName || data.name);
        if (sn && data.vehicleBrandId) {
          existingModelsMap.set(`${data.vehicleBrandId}__${sn}`, {
            ...data,
            id: d.id,
          });
        }
      }

      for (const d of existingVariantsSnap.docs) {
        const data = d.data();
        const sn = toSearchName(data.searchName || data.name);
        if (sn && data.vehicleModelId) {
          existingVariantsMap.set(`${data.vehicleModelId}__${sn}`, {
            ...data,
            id: d.id,
          });
        }
      }
    } catch (err) {
      console.warn(
        "Could not prefetch existing masters for deduplication:",
        err,
      );
    }

    // 1. Fetch Master Dataset (87 brands, 363 models, 4,104 variants)
    onProgress?.({
      stage: "downloading",
      message:
        "Loading full Indian car master dataset (87 brands, 363 models, 4,104 variants)...",
      percent: 35,
      brandsCount: 0,
      modelsCount: 0,
      variantsCount: 0,
    });

    let rawBrandRows: any[] = [];
    let rawModelRows: any[] = [];
    let rawVariantRows: any[] = [];
    let loadedFromBundle = false;

    try {
      const bundleUrl =
        typeof window !== "undefined"
          ? "/data/indian_cars.json"
          : "http://localhost:3100/data/indian_cars.json";
      const bundleRes = await fetch(bundleUrl);
      if (bundleRes.ok) {
        const bundleData = await bundleRes.json();
        rawBrandRows = bundleData.brands || [];
        rawModelRows = bundleData.models || [];
        rawVariantRows = bundleData.variants || [];
        loadedFromBundle = true;
      }
    } catch (e) {
      console.warn(
        "Could not load local dataset bundle, falling back to HuggingFace API:",
        e,
      );
    }

    if (!loadedFromBundle) {
      const brandsRes = await fetch(
        `${HF_API_BASE}&config=car_brands&split=train&offset=0&limit=100`,
      );
      if (brandsRes.ok) {
        const brandsData = await brandsRes.json();
        rawBrandRows = (brandsData.rows || []).map((r: any) => r.row || r);
      }

      const modelFetchOffsets = [0, 100, 200, 300];
      const modelResponses = await Promise.all(
        modelFetchOffsets.map((offset) =>
          fetch(
            `${HF_API_BASE}&config=car_models&split=train&offset=${offset}&limit=100`,
          )
            .then((r) => r.json())
            .catch(() => ({ rows: [] })),
        ),
      );
      rawModelRows = modelResponses.flatMap((res) =>
        (res.rows || []).map((r: any) => r.row || r),
      );

      const variantsRes = await fetch(
        `${HF_API_BASE}&config=car_variants&split=train&offset=0&limit=100`,
      );
      if (variantsRes.ok) {
        const variantsData = await variantsRes.json();
        rawVariantRows = (variantsData.rows || []).map((r: any) => r.row || r);
      }
    }

    onProgress?.({
      stage: "parsing",
      message: `Parsed ${rawBrandRows.length} brands, ${rawModelRows.length} models, and ${rawVariantRows.length} variants. Linking and generating searchName...`,
      percent: 65,
      brandsCount: rawBrandRows.length,
      modelsCount: rawModelRows.length,
      variantsCount: rawVariantRows.length,
    });

    // Map source brand records by source_id, slug, and name
    const sourceBrandBySlug = new Map<string, any>();
    const sourceBrandById = new Map<string, any>();
    for (const item of rawBrandRows) {
      const b = item.row || item;
      if (b.slug) sourceBrandBySlug.set(b.slug.toLowerCase().trim(), b);
      if (b.source_id) sourceBrandById.set(b.source_id.toLowerCase().trim(), b);
      if (b.name) sourceBrandBySlug.set(b.name.toLowerCase().trim(), b);
    }

    // Map source model records by source_id
    const sourceModelById = new Map<string, any>();
    for (const item of rawModelRows) {
      const m = item.row || item;
      if (m.source_id) sourceModelById.set(m.source_id.toLowerCase().trim(), m);
    }

    // Working document maps (key -> document)
    const brandsMap = new Map<string, any>(); // brandSearchName -> Brand Doc
    const modelsMap = new Map<string, any>(); // modelKey -> Model Doc
    const variantsMap = new Map<string, any>(); // variantKey -> Variant Doc

    // 1. Ensure all 87 Indian car brands are registered
    for (const item of rawBrandRows) {
      const b = item.row || item;
      const brandName = b.name || b.display_name || b.slug || "";
      if (!brandName) continue;
      const brandSearchName = toSearchName(brandName);
      if (!brandsMap.has(brandSearchName)) {
        const existingBrand = existingBrandsMap.get(brandSearchName);
        const brandId = existingBrand
          ? existingBrand.id
          : doc(collection(db, COLS.VEHICLE_BRANDS)).id;

        const brandDoc = {
          id: brandId,
          vehicleCategoryId: categoryId,
          vehicleCategoryName: categoryName,
          name: brandName,
          slug: slugify(brandName),
          searchName: brandSearchName,
          isActive: true,
          createdAt: existingBrand?.createdAt || now,
          updatedAt: now,
        };
        brandsMap.set(brandSearchName, brandDoc);
        existingBrandsMap.set(brandSearchName, brandDoc);
      }
    }

    // 2. Ensure all 363 Indian car models are registered
    for (const item of rawModelRows) {
      const m = item.row || item;
      const modelName = m.name || "";
      if (!modelName) continue;

      const brandIdentifier = (m.brand_slug || m.brand_source_id || "")
        .toLowerCase()
        .trim();
      const rawBrand =
        sourceBrandBySlug.get(brandIdentifier) ||
        sourceBrandById.get(brandIdentifier);
      const brandName = rawBrand?.name || m.brand_slug || "Unknown Brand";
      const brandSearchName = toSearchName(brandName);
      const brandDoc = brandsMap.get(brandSearchName);
      if (!brandDoc) continue;

      const modelSearchName = toSearchName(modelName);
      const modelKey = `${brandDoc.id}__${modelSearchName}`;

      if (!modelsMap.has(modelKey)) {
        const existingModel = existingModelsMap.get(modelKey);
        const modelId = existingModel
          ? existingModel.id
          : doc(collection(db, COLS.VEHICLE_MODELS)).id;

        const modelDoc = {
          id: modelId,
          vehicleCategoryId: categoryId,
          vehicleCategoryName: categoryName,
          vehicleBrandId: brandDoc.id,
          vehicleBrandName: brandDoc.name,
          name: modelName,
          slug: slugify(modelName),
          searchName: modelSearchName,
          isActive: true,
          createdAt: existingModel?.createdAt || now,
          updatedAt: now,
        };
        modelsMap.set(modelKey, modelDoc);
        existingModelsMap.set(modelKey, modelDoc);
      }
    }

    // 3. Process all car variants
    for (const item of rawVariantRows) {
      const v = item.row || item;
      const modelSourceId = (v.model_source_id || "").toLowerCase().trim();
      const rawModel = sourceModelById.get(modelSourceId);

      if (!rawModel) continue;

      const brandIdentifier = (
        rawModel.brand_slug ||
        rawModel.brand_source_id ||
        ""
      )
        .toLowerCase()
        .trim();
      const rawBrand =
        sourceBrandBySlug.get(brandIdentifier) ||
        sourceBrandById.get(brandIdentifier);

      const brandName =
        rawBrand?.name || rawModel.brand_slug || "Unknown Brand";
      const brandSearchName = toSearchName(brandName);
      const brandDoc = brandsMap.get(brandSearchName);
      if (!brandDoc) continue;

      const modelName = rawModel.name || "Unknown Model";
      const modelSearchName = toSearchName(modelName);
      const modelKey = `${brandDoc.id}__${modelSearchName}`;
      const modelDoc = modelsMap.get(modelKey);
      if (!modelDoc) continue;

      const variantName = v.name || v.display_name || "Standard";
      const variantSearchName = toSearchName(variantName);
      const variantKey = `${modelDoc.id}__${variantSearchName}`;

      if (variantsMap.has(variantKey)) continue;

      const existingVariant = existingVariantsMap.get(variantKey);
      const variantId = existingVariant
        ? existingVariant.id
        : doc(collection(db, COLS.VEHICLE_VARIANTS)).id;

      const year = parseYear(v.launched_at);
      const engineText = v.engine_cc ? `${v.engine_cc} cc` : "";

      const variantDoc = {
        id: variantId,
        vehicleCategoryId: categoryId,
        vehicleCategoryName: categoryName,
        vehicleBrandId: brandDoc.id,
        vehicleBrandName: brandDoc.name,
        vehicleModelId: modelDoc.id,
        vehicleModelName: modelDoc.name,
        name: variantName,
        searchName: variantSearchName,
        yearFrom: year,
        yearTo: year,
        fuelType: mapFuel(v.fuel_type_name),
        engine: engineText,
        transmission: mapTransmission(v.transmission_name),
        isActive: true,
        createdAt: existingVariant?.createdAt || now,
        updatedAt: now,
      };

      variantsMap.set(variantKey, variantDoc);
      existingVariantsMap.set(variantKey, variantDoc);

      if (limit > 0 && variantsMap.size >= limit) {
        break;
      }
    }

    const finalBrands = [...brandsMap.values()];
    const finalModels = [...modelsMap.values()];
    const finalVariants = [...variantsMap.values()];

    // 1. Ensure Vehicle Category "CAR" exists / updates with auto-generated ID & searchName
    onProgress?.({
      stage: "saving_brands",
      message: `Saving vehicle category '${categoryName}' with searchName...`,
      percent: 82,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    });

    const categoryRef = doc(db, COLS.VEHICLE_CATEGORIES, categoryId);
    await setDoc(
      categoryRef,
      stripUndefined({
        id: categoryId,
        name: "CAR",
        slug: "car",
        searchName: toSearchName("CAR"),
        isActive: true,
        sortOrder: 1,
        createdAt: existingCategoryData?.createdAt || now,
        updatedAt: now,
      }),
      { merge: true },
    );

    // 2. Commit Brands (Updates existing, inserts new)
    onProgress?.({
      stage: "saving_brands",
      message: `Writing ${finalBrands.length} brands (deduplicated)...`,
      percent: 88,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    });
    await commitInChunks(COLS.VEHICLE_BRANDS, finalBrands, "Brands");

    // 3. Commit Models (Updates existing, inserts new)
    onProgress?.({
      stage: "saving_models",
      message: `Writing ${finalModels.length} models (deduplicated)...`,
      percent: 94,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    });
    await commitInChunks(COLS.VEHICLE_MODELS, finalModels, "Models");

    // 4. Commit Variants (Updates existing, inserts new)
    onProgress?.({
      stage: "saving_variants",
      message: `Writing ${finalVariants.length} variants (deduplicated)...`,
      percent: 98,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    });
    await commitInChunks(COLS.VEHICLE_VARIANTS, finalVariants, "Variants");

    onProgress?.({
      stage: "completed",
      message: `Import complete! Successfully saved category '${categoryName}', ${finalBrands.length} brands, ${finalModels.length} models, and ${finalVariants.length} variants without duplicates.`,
      percent: 100,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    });

    return {
      success: true,
      categoryId,
      categoryName,
      brandsCount: finalBrands.length,
      modelsCount: finalModels.length,
      variantsCount: finalVariants.length,
    };
  } catch (error: any) {
    console.error("Indian car import failed:", error);
    onProgress?.({
      stage: "error",
      message: error?.message || "Indian car dataset import failed.",
      percent: 0,
      brandsCount: 0,
      modelsCount: 0,
      variantsCount: 0,
    });
    return {
      success: false,
      categoryId: "",
      categoryName,
      brandsCount: 0,
      modelsCount: 0,
      variantsCount: 0,
      error: error?.message || "Indian car dataset import failed.",
    };
  }
}
