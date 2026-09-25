import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  where,
  serverTimestamp,
  Unsubscribe,
  getCountFromServer,
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut as fbSignOut,
  onAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { db, auth } from "../lib/firebase";
import {
  Inquiry,
  UserProfile,
  BusinessSettings,
  Setting,
  PartItem,
  InquiryStatus,
  StatusHistoryItem,
  SparePart,
} from "../types";

const INQUIRIES_COL = "inquiries";
const USERS_COL = "users";
const SETTINGS_COL = "settings";
const BUSINESS_DOC = "business";

export const SETTING_COL = "Setting";
export const SETTING_DOC_ID = "sets";

// ADMIN email whitelist
const ADMIN_EMAILS = ["admin@gmail.com"];
export const isAdminEmail = (email: string | null) =>
  ADMIN_EMAILS.includes(email?.toLowerCase() || "");

// ── Auth ────────────────────────────────────────────────────────────────────

export async function adminSignIn(
  email: string,
  password: string,
): Promise<FirebaseUser> {
  if (!isAdminEmail(email))
    throw new Error("Access denied. Not an admin account.");
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function adminSignOut(): Promise<void> {
  await fbSignOut(auth);
}

export function subscribeToAuth(
  cb: (user: FirebaseUser | null) => void,
): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export function getTimestampMs(val: any): number {
  if (!val) return 0;
  if (typeof val.toMillis === "function") return val.toMillis();
  if (typeof val.toDate === "function") return val.toDate().getTime();
  if (val.seconds) return val.seconds * 1000;
  if (val instanceof Date) return val.getTime();
  if (typeof val === "string" || typeof val === "number") {
    const ms = new Date(val).getTime();
    return isNaN(ms) ? 0 : ms;
  }
  return 0;
}

export function formatInquiryDate(createdAt: any): string {
  if (!createdAt) return "Recently";

  let d: Date | null = null;
  if (typeof createdAt?.toDate === "function") {
    d = createdAt.toDate();
  } else if (createdAt?.seconds) {
    d = new Date(createdAt.seconds * 1000);
  } else if (createdAt instanceof Date) {
    d = createdAt;
  } else if (typeof createdAt === "string" || typeof createdAt === "number") {
    const parsed = new Date(createdAt);
    if (!isNaN(parsed.getTime())) d = parsed;
  }

  if (d) {
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  return "Recently";
}

export function subscribeToAllInquiries(
  onData: (inquiries: Inquiry[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, INQUIRIES_COL));
  return onSnapshot(
    q,
    (snap) => {
      const items: Inquiry[] = snap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Inquiry,
      );
      items.sort(
        (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt),
      );
      onData(items);
    },
    (err) => {
      console.warn("Admin inquiry subscription error:", err);
      onError?.(err);
    },
  );
}

/**
 * 1. Count query for "New" inquiries used in sidebar badge
 */
export function subscribeToNewInquiriesCount(
  onCount: (count: number) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, INQUIRIES_COL), where("status", "==", "New"));
  return onSnapshot(
    q,
    (snap) => {
      onCount(snap.size);
    },
    (err) => {
      console.warn("New inquiries count subscription error:", err);
      onError?.(err);
    },
  );
}

export async function getNewInquiriesCountServer(): Promise<number> {
  try {
    const q = query(
      collection(db, INQUIRIES_COL),
      where("status", "==", "New"),
    );
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch (err) {
    console.warn("Failed to fetch new inquiries count from server:", err);
    return 0;
  }
}

/**
 * 2. Status-filtered query for inquiries page.
 * Fetches only the selected status (default 'New'), avoiding fetching all documents initially.
 */
export function subscribeToInquiriesByStatus(
  status: InquiryStatus | "All",
  onData: (inquiries: Inquiry[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const coll = collection(db, INQUIRIES_COL);
  const q =
    status === "All" ? query(coll) : query(coll, where("status", "==", status));

  return onSnapshot(
    q,
    (snap) => {
      const items: Inquiry[] = snap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as Inquiry,
      );
      items.sort(
        (a, b) => getTimestampMs(b.createdAt) - getTimestampMs(a.createdAt),
      );
      onData(items);
    },
    (err) => {
      console.warn(
        `Admin inquiry subscription error for status "${status}":`,
        err,
      );
      onError?.(err);
    },
  );
}

/**
 * 3. Single inquiry subscription for detail page
 */
export function subscribeToInquiryById(
  id: string,
  onData: (inquiry: Inquiry | null) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const ref = doc(db, INQUIRIES_COL, id);
  return onSnapshot(
    ref,
    (snap) => {
      if (snap.exists()) {
        onData({ ...snap.data(), id: snap.id } as Inquiry);
      } else {
        onData(null);
      }
    },
    (err) => {
      console.warn(`Inquiry subscription error for ID "${id}":`, err);
      onError?.(err);
    },
  );
}

// Firestore rejects `undefined` values — strip them from any object before writing.
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned = {} as any;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      // Preserve Firestore FieldValue sentinels, Dates, and special objects
      if (
        value instanceof Date ||
        "_methodName" in value ||
        "_delegate" in value ||
        value.constructor?.name === "FieldValueImpl"
      ) {
        cleaned[key] = value;
      } else {
        cleaned[key] = stripUndefined(value);
      }
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

export function getDefaultStatusDescription(status: InquiryStatus): string {
  switch (status) {
    case "New":
      return "Inquiry received";
    case "Reviewing":
      return "Admin is reviewing parts and finding availability";
    case "Price Sent":
      return "Price quote prepared and sent";
    case "Completed":
      return "Inquiry marked as completed";
    case "Cancelled":
      return "Inquiry has been cancelled";
    default:
      return `Status updated to ${status}`;
  }
}

export async function updateInquiryStatus(
  inquiryId: string,
  newStatus: InquiryStatus,
  currentHistory: StatusHistoryItem[] = [],
  actor?: { uid?: string; displayName?: string; email?: string } | null,
  customDescription?: string,
): Promise<void> {
  try {
    const docRef = doc(db, INQUIRIES_COL, inquiryId);

    const newEntry: StatusHistoryItem = {
      createdAt: new Date().toISOString(),
      status: newStatus,
      description: customDescription || getDefaultStatusDescription(newStatus),
      createdByName: actor?.displayName || actor?.email || "Admin",
      createdById: actor?.uid || "admin",
    };

    const updatedHistory = [...(currentHistory || []), newEntry];

    await updateDoc(docRef, {
      status: newStatus,
      statusHistory: updatedHistory,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to update inquiry status for ${inquiryId}:`, error);
    throw new Error("Could not update inquiry status in database.");
  }
}

export async function updateInquiryParts(
  inquiryId: string,
  parts: PartItem[],
): Promise<void> {
  try {
    const docRef = doc(db, INQUIRIES_COL, inquiryId);
    const cleanParts = parts.map((p) => stripUndefined(p as any));
    await updateDoc(docRef, {
      parts: cleanParts,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to update inquiry parts for ${inquiryId}:`, error);
    throw new Error("Could not update inquiry parts in database.");
  }
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getCustomerById(
  userId: string,
): Promise<UserProfile | null> {
  try {
    const snap = await getDoc(doc(db, USERS_COL, userId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as UserProfile;
  } catch (error) {
    console.error(`Failed to get customer ${userId}:`, error);
    throw new Error("Could not fetch customer from database.");
  }
}

export interface PaginatedCustomersResult {
  customers: UserProfile[];
  firstDoc: QueryDocumentSnapshot | null;
  lastDoc: QueryDocumentSnapshot | null;
  totalCount: number;
}

export async function fetchCustomersPaginated({
  pageSize = 10,
  cursor = null,
}: {
  pageSize?: number;
  cursor?: QueryDocumentSnapshot | null;
}): Promise<PaginatedCustomersResult> {
  try {
    const countSnap = await getCountFromServer(collection(db, USERS_COL));
    const totalCount = countSnap.data().count;

    let q;
    if (cursor) {
      q = query(
        collection(db, USERS_COL),
        orderBy("createdAt", "desc"),
        startAfter(cursor),
        limit(pageSize),
      );
    } else {
      q = query(
        collection(db, USERS_COL),
        orderBy("createdAt", "desc"),
        limit(pageSize),
      );
    }

    let snap = await getDocs(q);

    // Fallback if some documents lack createdAt index
    if (snap.empty && !cursor && totalCount > 0) {
      const fallbackQ = query(collection(db, USERS_COL), limit(pageSize));
      snap = await getDocs(fallbackQ);
    }

    const customers: UserProfile[] = snap.docs.map(
      (d) => ({ id: d.id, ...d.data() }) as UserProfile,
    );
    const firstDoc = snap.docs.length > 0 ? snap.docs[0] : null;
    const lastDoc =
      snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null;

    return {
      customers,
      firstDoc,
      lastDoc,
      totalCount,
    };
  } catch (error) {
    console.error("Failed to fetch paginated customers:", error);
    throw error;
  }
}

export async function searchCustomersInDb(
  searchTerm: string,
  pageSize = 10,
): Promise<{
  customers: UserProfile[];
  totalCount: number;
}> {
  const term = searchTerm.trim();
  if (!term) {
    const res = await fetchCustomersPaginated({ pageSize });
    return {
      customers: res.customers,
      totalCount: res.totalCount,
    };
  }

  try {
    const resultsMap = new Map<string, UserProfile>();

    // 1. Direct doc ID lookup if term looks like a UID
    if (term.length >= 10 && !term.includes(" ") && !term.includes("@")) {
      try {
        const directDoc = await getDoc(doc(db, USERS_COL, term));
        if (directDoc.exists()) {
          resultsMap.set(directDoc.id, {
            id: directDoc.id,
            ...directDoc.data(),
          } as UserProfile);
        }
      } catch (_) {}
    }

    const queries: any[] = [];

    // 2. Phone query if digits or +
    if (/\d/.test(term) || term.startsWith("+")) {
      queries.push(
        query(
          collection(db, USERS_COL),
          where("phone", ">=", term),
          where("phone", "<=", term + "\uf8ff"),
          limit(pageSize),
        ),
      );
    }

    // 3. Email query if contains @
    if (term.includes("@")) {
      queries.push(
        query(
          collection(db, USERS_COL),
          where("email", ">=", term.toLowerCase()),
          where("email", "<=", term.toLowerCase() + "\uf8ff"),
          limit(pageSize),
        ),
      );
    } else {
      // 4. Name prefix variants
      const variants = Array.from(
        new Set([
          term,
          term.charAt(0).toUpperCase() + term.slice(1),
          term.toLowerCase(),
        ]),
      );

      for (const v of variants) {
        queries.push(
          query(
            collection(db, USERS_COL),
            where("name", ">=", v),
            where("name", "<=", v + "\uf8ff"),
            limit(pageSize),
          ),
        );
      }

      // Also search email prefix
      queries.push(
        query(
          collection(db, USERS_COL),
          where("email", ">=", term.toLowerCase()),
          where("email", "<=", term.toLowerCase() + "\uf8ff"),
          limit(pageSize),
        ),
      );
    }

    const snaps = await Promise.all(
      queries.map((q) => getDocs(q).catch(() => null)),
    );
    snaps.forEach((snap) => {
      if (snap) {
        snap.docs.forEach((d) => {
          const data = d.data() as Record<string, any>;
          resultsMap.set(d.id, { id: d.id, ...data } as UserProfile);
        });
      }
    });

    const customers = Array.from(resultsMap.values()).slice(0, pageSize);
    return {
      customers,
      totalCount: customers.length,
    };
  } catch (error) {
    console.error("Failed to search customers directly on database:", error);
    return {
      customers: [],
      totalCount: 0,
    };
  }
}

export async function getCustomerInquiries(userId: string): Promise<Inquiry[]> {
  try {
    const q = query(
      collection(db, INQUIRIES_COL),
      where("userId", "==", userId),
    );
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => d.data() as Inquiry)
      .sort((a, b) => (b.id > a.id ? 1 : -1));
  } catch (error) {
    console.error(`Failed to get inquiries for customer ${userId}:`, error);
    throw new Error("Could not fetch customer inquiries from database.");
  }
}

// ── Setting / Business Settings ──────────────────────────────────────────────

export async function getSetting(): Promise<Setting> {
  try {
    // 1. Try Collection: Setting, Doc: sets
    let snap = await getDoc(doc(db, SETTING_COL, SETTING_DOC_ID));

    // 2. Fallback to legacy settings, Doc: business
    if (!snap.exists()) {
      snap = await getDoc(doc(db, SETTINGS_COL, BUSINESS_DOC));
    }

    if (snap.exists()) {
      const data = snap.data();
      return {
        id: SETTING_DOC_ID,
        businessName: data.businessName || "Spare Will",
        businessEmail: data.businessEmail || "17shihab@gmail.com",
        businessCallingNumber:
          data.businessCallingNumber || data.callingNumber || "+91 98765 43210",
        callingNumber:
          data.callingNumber || data.businessCallingNumber || "+91 98765 43210",
        whatsappNumber: data.whatsappNumber || "+91 98765 43210",
        defaultGreetingMsg:
          data.defaultGreetingMsg ||
          data.defaultGreeting ||
          "Hello {name},\nRegarding your inquiry {id}:",
        defaultGreeting:
          data.defaultGreeting ||
          data.defaultGreetingMsg ||
          "Hello {name},\nRegarding your inquiry {id}:",
        inquiryCount:
          typeof data.inquiryCount === "number" ? data.inquiryCount : 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      };
    }

    return {
      id: SETTING_DOC_ID,
      businessName: "Spare Will",
      businessEmail: "17shihab@gmail.com",
      businessCallingNumber: "+91 98765 43210",
      callingNumber: "+91 98765 43210",
      whatsappNumber: "+91 98765 43210",
      defaultGreetingMsg: "Hello {name},\nRegarding your inquiry {id}:",
      defaultGreeting: "Hello {name},\nRegarding your inquiry {id}:",
      inquiryCount: 0,
    };
  } catch (error) {
    console.error("Failed to get setting:", error);
    throw new Error("Could not fetch setting from database.");
  }
}

export async function saveSetting(setting: Partial<Setting>): Promise<void> {
  try {
    const payload = {
      ...stripUndefined({
        id: SETTING_DOC_ID,
        businessName: setting.businessName || "",
        businessEmail: setting.businessEmail || "",
        businessCallingNumber:
          setting.businessCallingNumber || setting.callingNumber || "",
        callingNumber:
          setting.businessCallingNumber || setting.callingNumber || "",
        whatsappNumber: setting.whatsappNumber || "",
        defaultGreetingMsg:
          setting.defaultGreetingMsg || setting.defaultGreeting || "",
        defaultGreeting:
          setting.defaultGreetingMsg || setting.defaultGreeting || "",
        inquiryCount:
          typeof setting.inquiryCount === "number"
            ? setting.inquiryCount
            : undefined,
      }),
      updatedAt: serverTimestamp(),
    };

    // Save only to Collection: Setting, Doc: sets
    await setDoc(doc(db, SETTING_COL, SETTING_DOC_ID), payload, {
      merge: true,
    });

    // Also sync to legacy settings/business for customer app compatibility
    await setDoc(doc(db, SETTINGS_COL, BUSINESS_DOC), payload, { merge: true });

    // Clean up Settign collection if it exists
    try {
      await deleteDoc(doc(db, "Settign", SETTING_DOC_ID));
    } catch {
      // ignore if already deleted or doesn't exist
    }
  } catch (error) {
    console.error("Failed to save setting:", error);
    throw new Error("Could not save setting in database.");
  }
}

export function subscribeToSetting(
  onData: (setting: Setting) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const docRef = doc(db, SETTING_COL, SETTING_DOC_ID);
  return onSnapshot(
    docRef,
    (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        onData({
          id: SETTING_DOC_ID,
          businessName: data.businessName || "Spare Will",
          businessEmail: data.businessEmail || "",
          businessCallingNumber:
            data.businessCallingNumber || data.callingNumber || "",
          callingNumber: data.callingNumber || data.businessCallingNumber || "",
          whatsappNumber: data.whatsappNumber || "",
          defaultGreetingMsg:
            data.defaultGreetingMsg || data.defaultGreeting || "",
          defaultGreeting:
            data.defaultGreeting || data.defaultGreetingMsg || "",
          inquiryCount:
            typeof data.inquiryCount === "number" ? data.inquiryCount : 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        });
      } else {
        // Fallback to initial fetch
        getSetting().then(onData).catch(onError);
      }
    },
    (err) => {
      console.warn("Setting subscription error:", err);
      onError?.(err);
    },
  );
}

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const s = await getSetting();
  return {
    businessName: s.businessName,
    businessEmail: s.businessEmail,
    callingNumber: s.businessCallingNumber,
    businessCallingNumber: s.businessCallingNumber,
    whatsappNumber: s.whatsappNumber,
    defaultGreeting: s.defaultGreetingMsg,
    defaultGreetingMsg: s.defaultGreetingMsg,
    inquiryCount: s.inquiryCount,
  };
}

export async function saveBusinessSettings(
  settings: BusinessSettings,
): Promise<void> {
  await saveSetting({
    businessName: settings.businessName,
    businessEmail: settings.businessEmail,
    businessCallingNumber:
      settings.businessCallingNumber || settings.callingNumber,
    callingNumber: settings.callingNumber || settings.businessCallingNumber,
    whatsappNumber: settings.whatsappNumber,
    defaultGreetingMsg: settings.defaultGreetingMsg || settings.defaultGreeting,
    defaultGreeting: settings.defaultGreeting || settings.defaultGreetingMsg,
    inquiryCount: settings.inquiryCount,
  });
}

// ── Inventory ────────────────────────────────────────────────────────────────

const INVENTORY_COL = "inventory";

export function subscribeToInventory(
  onData: (parts: SparePart[]) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  const q = query(collection(db, INVENTORY_COL), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: SparePart[] = snap.docs.map(
        (d) => ({ ...d.data(), id: d.id }) as SparePart,
      );
      onData(items);
    },
    (err) => {
      console.warn("Inventory subscription error:", err);
      onError?.(err);
    },
  );
}

export async function addSparePart(
  part: Omit<SparePart, "id" | "createdAt">,
): Promise<void> {
  try {
    const docRef = doc(collection(db, INVENTORY_COL));
    await setDoc(docRef, {
      ...part,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed to add spare part:", error);
    throw new Error("Could not add spare part to database.");
  }
}

export async function updateSparePart(
  id: string,
  part: Partial<Omit<SparePart, "id" | "createdAt">>,
): Promise<void> {
  try {
    const docRef = doc(db, INVENTORY_COL, id);
    await updateDoc(docRef, {
      ...part,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error(`Failed to update spare part ${id}:`, error);
    throw new Error("Could not update spare part in database.");
  }
}

export async function batchAddSpareParts(
  parts: Omit<SparePart, "id" | "createdAt">[],
): Promise<void> {
  try {
    const batch = writeBatch(db);
    parts.forEach((part) => {
      const docRef = doc(collection(db, INVENTORY_COL));
      batch.set(docRef, {
        ...part,
        createdAt: serverTimestamp(),
      });
    });
    await batch.commit();
  } catch (error) {
    console.error("Failed to batch add spare parts:", error);
    throw new Error("Could not batch add spare parts to database.");
  }
}

export async function deleteSparePart(id: string): Promise<void> {
  try {
    await deleteDoc(doc(db, INVENTORY_COL, id));
  } catch (error) {
    console.error(`Failed to delete spare part ${id}:`, error);
    throw new Error("Could not delete spare part from database.");
  }
}
