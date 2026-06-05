/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Aapki asli keys jo aapne nikaali thin
const firebaseConfig = {
  apiKey: "AIzaSyBCcgdsOIn3EBH6yPvRsRTh2EPLKa8G5hI",
  authDomain: "mk-smm-panal.firebaseapp.com",
  databaseURL: "https://mk-smm-panal-default-rtdb.firebaseio.com",
  projectId: "mk-smm-panal",
  storageBucket: "mk-smm-panal.firebasestorage.app",
  messagingSenderId: "756666155930",
  appId: "1:756666155930:web:412ad3365bf75602a6f023"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Database connection strictly mapped to your data source
export const db = getFirestore(app, {
  databaseId: "ai-studio-a1cbaf53-22bd-4d29-9d9a-e58e4203d4ff"
});

export const auth = getAuth(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword };