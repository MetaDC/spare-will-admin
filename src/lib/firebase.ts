import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Same Firebase project as the customer app
const firebaseConfig = {
  apiKey: "AIzaSyC1gXWhRXNnmN9y-XwyAWGNcLFkPZCqq7E",
  authDomain: "sparewill-856c7.firebaseapp.com",
  projectId: "sparewill-856c7",
  storageBucket: "sparewill-856c7.firebasestorage.app",
  messagingSenderId: "787017464641",
  appId: "1:787017464641:web:e99a8afd9b4da9461abfc0"
};
const FIRESTORE_DB_ID: string = "ai-studio-sparewill-897aae60-71c4-41ed-beb5-8e4db40ed4c1";
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

export const db = FIRESTORE_DB_ID && FIRESTORE_DB_ID !== '(default)'
  ? getFirestore(app, FIRESTORE_DB_ID)
  : getFirestore(app);

export const auth = getAuth(app);
export default app;
