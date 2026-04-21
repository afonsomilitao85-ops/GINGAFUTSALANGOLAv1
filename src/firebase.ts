import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  setPersistence,
  indexedDBLocalPersistence,
  initializeAuth,
  browserLocalPersistence
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  increment,
  where,
  getDocs,
  getDocFromServer,
  terminate,
  clearIndexedDbPersistence,
  enableIndexedDbPersistence
} from 'firebase/firestore';
import { 
  getStorage, 
  ref, 
  uploadBytesResumable, 
  uploadBytes,
  getDownloadURL
} from 'firebase/storage';

import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with standard getAuth for better compatibility
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence);

// Stabilize Firestore for environments with proxies/restricted networks
// We use long polling and disable streams to bypass potential gRPC-web issues in iframes
export const db = initializeFirestore(app as any, {
  experimentalForceLongPolling: true,
  experimentalAutoDetectLongPolling: false,
  useFetchStreams: false,
} as any, firebaseConfig.firestoreDatabaseId);

// Note: Persistence is disabled for now to prevent stale cache issues 
// that can happen when switching Firebase projects in a preview environment.

// Initialize Storage - simplified to use default config which is usually more robust
export const storage = getStorage(app);

// Configure Storage retry limits to prevent infinite hanging in restricted networks
// Increased to 10 minutes (600,000ms) to support larger files on slow connections
try {
  (storage as any).maxUploadRetryTime = 600000;
  (storage as any).maxOperationRetryTime = 600000;
} catch (e) {
  console.warn("Could not set storage retry limits:", e);
}

console.log('Firebase Storage initialized with bucket:', firebaseConfig.storageBucket);

// Auth Providers (Not exported, handled in components for direct SDK reference)
// Error Handling Helper
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection with retries and increased initial delay
async function testConnection(retries = 3) {
  try {
    // Give more time for the environment to stabilize
    const delay = retries === 3 ? 10000 : 5000;
    await new Promise(r => setTimeout(r, delay));
    
    console.log(`Testing Firestore connection... (Attempt ${4 - retries})`);
    
    // We try to fetch from a non-existent doc to test connectivity without needing data
    console.log('Fetching system/ping...');
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log('Firestore connection successful (backend reached).');
  } catch (error: any) {
    if (error && (error.code === 'permission-denied' || error.code === 'not-found')) {
      console.log('Firestore connection verified (backend reached, expected code):', error.code);
      return;
    }

    if (retries > 0) {
      console.log(`Retrying Firestore connection... Error: ${error?.message || 'Unknown'}`);
      return testConnection(retries - 1);
    }
    
    console.warn("Firestore connection test failed finally:", error);
    if(error && (error.message?.includes('the client is offline') || error.message?.includes('unavailable') || error.code === 'unavailable')) {
      console.error("CRITICAL: Firestore is unreachable after multiple attempts. This typically indicates a network/proxy issue or incorrect configuration.");
    }
  }
}
testConnection();

export { 
  signOut, 
  onAuthStateChanged, 
  RecaptchaVerifier, 
  signInWithPhoneNumber,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  doc, 
  setDoc, 
  getDoc, 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  serverTimestamp,
  increment,
  where,
  getDocs,
  ref,
  uploadBytesResumable,
  uploadBytes,
  getDownloadURL
};
