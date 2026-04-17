import { 
  initializeTestEnvironment, 
  RulesTestEnvironment, 
  assertFails, 
  assertSucceeds 
} from '@firebase/rules-unit-testing';
import { doc, setDoc, updateDoc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'fs';

// Mocking some of the logic for the test runner in this environment
// In a real environment, you'd run this with firebase emulators:start

describe('GingaFutsal Security Rules', () => {
  let testEnv: RulesTestEnvironment;

  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: 'gingafutsal-test',
      firestore: {
        rules: readFileSync('firestore.rules', 'utf8'),
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  test('ATK-01: Creating a profile for another user (mismatched UID) should fail', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'users', 'bob');
    await assertFails(setDoc(docRef, { uid: 'bob', nome: 'Bob', email: 'bob@example.com' }));
  });

  test('ATK-02: User cannot elevate their own role to admin', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'users', 'alice');
    // Assume document exists with role: 'user'
    await assertFails(updateDoc(docRef, { role: 'admin' }));
  });

  test('ATK-03: User cannot update another user\'s post', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'posts', 'bob-post-1');
    await assertFails(updateDoc(docRef, { likes: 1000 }));
  });

  test('ATK-04: Creating a post with fake authorUid should fail', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'posts', 'new-post');
    await assertFails(setDoc(docRef, { authorUid: 'bob', nome: 'fake', createdAt: Date.now() }));
  });

  test('ATK-06: Non-admin trying to create a match should fail', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'matches', 'match-1');
    await assertFails(setDoc(docRef, { equipaA: 'A', equipaB: 'B', status: 'AO VIVO' }));
  });

  test('ATK-07: Deleting someone else\'s marketplace ad should fail', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'ads', 'bob-ad-1');
    await assertFails(deleteDoc(docRef));
  });

  test('ATK-09: Creating a post with a huge string for nome should fail', async () => {
    const alice = testEnv.authenticatedContext('alice');
    const docRef = doc(alice.firestore(), 'posts', 'atk-09');
    const hugeName = 'a'.repeat(2000); // Exceeds size limits
    await assertFails(setDoc(docRef, { authorUid: 'alice', nome: hugeName, createdAt: Date.now() }));
  });

  test('ATK-10: Creating a post while unauthenticated should fail', async () => {
    const unauth = testEnv.unauthenticatedContext();
    const docRef = doc(unauth.firestore(), 'posts', 'atk-10');
    await assertFails(setDoc(docRef, { authorUid: 'someone', nome: 'test', createdAt: Date.now() }));
  });
});
