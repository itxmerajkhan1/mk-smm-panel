/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);

// 🛠️ TypeScript Fix for Custom Database ID
export const db = getFirestore(app, {
  databaseId: "ai-studio-a1cbaf53-22bd-4d29-9d9a-e58e4203d4ff"
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Export Firebase methods
export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword };