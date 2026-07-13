// lib/firebase.ts
// Inicialização do Firebase no CLIENTE (roda no navegador — usado pelo quiz em /criar).
// Usa as variáveis NEXT_PUBLIC_* porque o navegador precisa enxergá-las.
// A segurança real não vem de esconder essas chaves (o apiKey do Firebase não é secreto),
// e sim das regras do Firestore/Storage configuradas no console.

import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Evita inicializar o app mais de uma vez (Next.js recarrega módulos em dev)
export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const db = getFirestore(firebaseApp);
export const storage = getStorage(firebaseApp);
