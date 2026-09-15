import {
  collection, doc, getDocs, getDoc, setDoc, updateDoc,
  onSnapshot, query, orderBy, where, serverTimestamp, Unsubscribe
} from 'firebase/firestore';
import {
  signInWithEmailAndPassword, signOut as fbSignOut,
  onAuthStateChanged, User as FirebaseUser
} from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { Inquiry, UserProfile, BusinessSettings, PartItem, InquiryStatus, StatusHistoryItem, SparePart } from '../types';

const INQUIRIES_COL = 'inquiries';
const USERS_COL = 'users';
const SETTINGS_COL = 'settings';
const BUSINESS_DOC = 'business';

// ADMIN email whitelist
const ADMIN_EMAILS = ['admin@gmail.com'];
export const isAdminEmail = (email: string | null) => ADMIN_EMAILS.includes(email?.toLowerCase() || '');

// ── Auth ────────────────────────────────────────────────────────────────────

export async function adminSignIn(email: string, password: string): Promise<FirebaseUser> {
  if (!isAdminEmail(email)) throw new Error('Access denied. Not an admin account.');
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function adminSignOut(): Promise<void> {
  await fbSignOut(auth);
}

export function subscribeToAuth(cb: (user: FirebaseUser | null) => void): Unsubscribe {
  return onAuthStateChanged(auth, cb);
}

// ── Inquiries ────────────────────────────────────────────────────────────────

export function subscribeToAllInquiries(
  onData: (inquiries: Inquiry[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, INQUIRIES_COL));
  return onSnapshot(q,
    (snap) => {
      const items: Inquiry[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as Inquiry));
      items.sort((a, b) => (b.id > a.id ? 1 : -1));
      onData(items);
    },
    (err) => { console.warn('Admin inquiry subscription error:', err); onError?.(err); }
  );
}

// Firestore rejects `undefined` values — strip them from any object before writing.
function stripUndefined<T extends Record<string, any>>(obj: T): T {
  const cleaned = {} as any;
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined) continue;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      cleaned[key] = stripUndefined(value);
    } else if (Array.isArray(value)) {
      cleaned[key] = value.map(v =>
        v !== null && typeof v === 'object' && !Array.isArray(v) ? stripUndefined(v) : v
      );
    } else {
      cleaned[key] = value;
    }
  }
  return cleaned;
}

export async function updateInquiryStatus(
  inquiryId: string,
  newStatus: InquiryStatus,
  currentHistory: StatusHistoryItem[]
): Promise<void> {
  const docRef = doc(db, INQUIRIES_COL, inquiryId);
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: true
  });

  const updatedHistory = currentHistory.map(h => stripUndefined({
    status: h.status,
    label: h.label,
    description: h.description,
    active: h.status === newStatus,
    completed: h.completed || (
      ['New','Reviewing','Price Sent','Customer Contacted','Completed'].indexOf(h.status) <=
      ['New','Reviewing','Price Sent','Customer Contacted','Completed'].indexOf(newStatus)
    ),
    date: (h.status === newStatus && !h.date) ? now : (h.date || null),
  }));

  await updateDoc(docRef, {
    status: newStatus,
    statusHistory: updatedHistory,
    updatedAt: serverTimestamp()
  });
}

export async function updateInquiryParts(inquiryId: string, parts: PartItem[]): Promise<void> {
  const docRef = doc(db, INQUIRIES_COL, inquiryId);
  const cleanParts = parts.map(p => stripUndefined(p as any));
  await updateDoc(docRef, { parts: cleanParts, updatedAt: serverTimestamp() });
}

// ── Customers ────────────────────────────────────────────────────────────────

export async function getAllCustomers(): Promise<UserProfile[]> {
  const snap = await getDocs(collection(db, USERS_COL));
  return snap.docs.map(d => d.data() as UserProfile);
}

export async function getCustomerInquiries(userId: string): Promise<Inquiry[]> {
  const q = query(collection(db, INQUIRIES_COL), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data() as Inquiry).sort((a, b) => b.id > a.id ? 1 : -1);
}

// ── Business Settings ─────────────────────────────────────────────────────────

export async function getBusinessSettings(): Promise<BusinessSettings> {
  const docRef = doc(db, SETTINGS_COL, BUSINESS_DOC);
  const snap = await getDoc(docRef);
  if (snap.exists()) return snap.data() as BusinessSettings;
  return {
    businessName: 'Spare Will',
    businessEmail: '17shihab@gmail.com',
    callingNumber: '+91 98765 43210',
    whatsappNumber: '+91 98765 43210',
    defaultGreeting: 'Hello {name},\nRegarding your Spare Will inquiry {id}:'
  };
}

export async function saveBusinessSettings(settings: BusinessSettings): Promise<void> {
  await setDoc(doc(db, SETTINGS_COL, BUSINESS_DOC), settings, { merge: true });
}

// ── Inventory ────────────────────────────────────────────────────────────────

const INVENTORY_COL = 'inventory';

export function subscribeToInventory(
  onData: (parts: SparePart[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(collection(db, INVENTORY_COL), orderBy('createdAt', 'desc'));
  return onSnapshot(q,
    (snap) => {
      const items: SparePart[] = snap.docs.map(d => ({ ...d.data(), id: d.id } as SparePart));
      onData(items);
    },
    (err) => { console.warn('Inventory subscription error:', err); onError?.(err); }
  );
}

export async function addSparePart(part: Omit<SparePart, 'id' | 'createdAt'>): Promise<void> {
  const docRef = doc(collection(db, INVENTORY_COL));
  await setDoc(docRef, {
    ...part,
    createdAt: serverTimestamp()
  });
}

export async function updateSparePart(id: string, part: Partial<Omit<SparePart, 'id' | 'createdAt'>>): Promise<void> {
  const docRef = doc(db, INVENTORY_COL, id);
  await updateDoc(docRef, {
    ...part,
    updatedAt: serverTimestamp()
  });
}

import { writeBatch } from 'firebase/firestore';

export async function batchAddSpareParts(parts: Omit<SparePart, 'id' | 'createdAt'>[]): Promise<void> {
  const batch = writeBatch(db);
  parts.forEach(part => {
    const docRef = doc(collection(db, INVENTORY_COL));
    batch.set(docRef, {
      ...part,
      createdAt: serverTimestamp()
    });
  });
  await batch.commit();
}

import { deleteDoc } from 'firebase/firestore';

export async function deleteSparePart(id: string): Promise<void> {
  await deleteDoc(doc(db, INVENTORY_COL, id));
}
