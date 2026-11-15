/* =========================
   FIREBASE (módulo compartido)
   Misma configuración del proyecto original: invitacion-8aabc
   ========================= */

import {
  initializeApp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-app.js";

import {
  getFirestore,
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-firestore.js";

import {
  getAuth,
  signInAnonymously
} from "https://www.gstatic.com/firebasejs/12.18.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCyCDHZU4aybUQ715wR7TUr9EZSGXI7GIU",
  authDomain: "invitacion-8aabc.firebaseapp.com",
  projectId: "invitacion-8aabc",
  storageBucket: "invitacion-8aabc.firebasestorage.app",
  messagingSenderId: "227896735643",
  appId: "1:227896735643:web:42eee6643da0160a1f533e",
  measurementId: "G-L6MNRT6PG8"
};

const app = initializeApp(firebaseConfig);

export const db = getFirestore(app);
export const auth = getAuth(app);

export {
  collection,
  addDoc,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
  signInAnonymously
};
