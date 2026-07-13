// lib/firebase-admin.ts
// Inicialização do Firebase ADMIN — roda SÓ NO SERVIDOR (webhook, rota /[slug]).
// O Admin SDK ignora as regras de segurança do Firestore (por isso nunca deve
// rodar no navegador). Usa uma "service account key" gerada no console:
//   Configurações do Projeto > Contas de serviço > Gerar nova chave privada
// Cole o JSON gerado, inteiro, na variável FIREBASE_SERVICE_ACCOUNT_KEY (.env.local)

import { initializeApp, getApps, cert, App } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

function getAdminApp(): App {
  if (getApps().length) return getApps()[0];

  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!raw) {
    throw new Error(
      "FIREBASE_SERVICE_ACCOUNT_KEY não configurada. Veja .env.local.example."
    );
  }

  const serviceAccount = JSON.parse(raw);

  return initializeApp({
    credential: cert(serviceAccount),
  });
}

// Inicialização PREGUIÇOSA: só roda quando alguém de fato chama getAdminDb(),
// nunca no momento do build. Se inicializássemos no topo do módulo (uma
// constante `export const adminDb = ...`), o Next.js tentaria rodar isso
// durante "next build" (coleta de dados de página) mesmo sem nenhuma
// requisição real acontecer — e quebraria o build sem as credenciais certas.
let _db: Firestore | null = null;
export function getAdminDb(): Firestore {
  if (!_db) _db = getFirestore(getAdminApp());
  return _db;
}
