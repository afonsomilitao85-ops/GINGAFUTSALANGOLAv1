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
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
  useFetchStreams: false,
  ignoreUndefinedProperties: true,
} as any, firebaseConfig.firestoreDatabaseId);

// Initialize Storage
export const storage = getStorage(app);

try {
  (storage as any).maxUploadRetryTime = 600000;
  (storage as any).maxOperationRetryTime = 600000;
} catch (e) {
  console.warn("Could not set storage retry limits:", e);
}

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

// Delay the connection test even more to give the SDK time to warm up
async function testConnection(retries = 3) {
  try {
    const delay = retries === 3 ? 20000 : 10000;
    await new Promise(r => setTimeout(r, delay));
    
    console.log(`Firestore connectivity check (Attempt ${4 - retries})...`);
    await getDocFromServer(doc(db, 'system', 'ping'));
    console.log('Firestore: Connection successful.');
  } catch (error: any) {
    if (error && (error.code === 'permission-denied' || error.code === 'not-found')) {
      console.log('Firestore: Connection verified.');
      return;
    }

    if (retries > 0) {
      console.log(`Firestore: Retrying connection...`);
      return testConnection(retries - 1);
    }
    
    console.warn("Firestore: Final connection check failed.", error?.message);
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
