// Helper KKiaPay (sandbox) : chargement du script CDN, ouverture du widget
// et polling du statut de paiement côté backend.
//
// NOTE dev local : le webhook KKiaPay ne peut pas joindre localhost, donc le
// statut backend reste généralement PENDING après un paiement sandbox réussi.

import { api } from "./api";
import type { Payment, PaymentStatus } from "./types";

declare global {
  interface Window {
    openKkiapayWidget?: (o: object) => void;
    addKkiapayListener?: (e: string, cb: (r: unknown) => void) => void;
  }
}

const KKIAPAY_SCRIPT_SRC = "https://cdn.kkiapay.me/k.js";

let scriptPromise: Promise<void> | null = null;

// Injecte le script k.js une seule fois.
export function loadKkiapayScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("KKiaPay ne peut être chargé que côté client"));
  }
  if (window.openKkiapayWidget) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(
        `script[src="${KKIAPAY_SCRIPT_SRC}"]`,
      );
      if (existing) {
        existing.addEventListener("load", () => resolve());
        existing.addEventListener("error", () => reject(new Error("Chargement KKiaPay échoué")));
        return;
      }
      const script = document.createElement("script");
      script.src = KKIAPAY_SCRIPT_SRC;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Impossible de charger le widget KKiaPay"));
      };
      document.body.appendChild(script);
    });
  }
  return scriptPromise;
}

export interface OpenKkiapayOptions {
  amount: number;
  providerRef: string;
  onSuccess: (result: unknown) => void;
  onFailed?: (result: unknown) => void;
}

// Ouvre le widget KKiaPay pour un paiement initié côté backend (providerRef).
// Le mode simulé doit être activé explicitement et reste interdit en production.
export async function openKkiapay({ amount, providerRef, onSuccess, onFailed }: OpenKkiapayOptions): Promise<void> {
  if (!process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY) {
    const mockEnabled =
      process.env.NODE_ENV !== "production" &&
      process.env.NEXT_PUBLIC_ENABLE_PAYMENT_MOCK === "true";
    if (mockEnabled) {
      console.warn("[kkiapay] Paiement simulé explicitement en développement.");
      setTimeout(() => onSuccess({ transactionId: `mock_${providerRef}` }), 300);
      return;
    }
    throw new Error("La clé publique KKiaPay n'est pas configurée.");
  }
  await loadKkiapayScript();
  if (!window.openKkiapayWidget) {
    throw new Error("Widget KKiaPay indisponible");
  }
  // Les listeners KKiaPay sont globaux : on garde une seule paire active,
  // remplacée à chaque ouverture du widget.
  activeSuccessHandler = onSuccess;
  activeFailedHandler = onFailed ?? null;
  registerGlobalListeners();
  window.openKkiapayWidget({
    amount,
    key: process.env.NEXT_PUBLIC_KKIAPAY_PUBLIC_KEY,
    sandbox: process.env.NEXT_PUBLIC_KKIAPAY_SANDBOX === "true",
    data: JSON.stringify({ providerRef }),
  });
}

let listenersRegistered = false;
let activeSuccessHandler: ((r: unknown) => void) | null = null;
let activeFailedHandler: ((r: unknown) => void) | null = null;

function registerGlobalListeners() {
  if (listenersRegistered || !window.addKkiapayListener) return;
  listenersRegistered = true;
  window.addKkiapayListener("success", (r) => activeSuccessHandler?.(r));
  window.addKkiapayListener("failed", (r) => activeFailedHandler?.(r));
}

export interface PollResult {
  status: PaymentStatus;
  payment: Payment | null;
}

// Poll GET /payments/:id/status toutes les `intervalMs` ms (max `maxAttempts`).
// S'arrête dès que le statut n'est plus PENDING. En dev local, le webhook
// KKiaPay ne joint pas localhost → le statut reste souvent PENDING.
export async function pollPaymentStatus(
  paymentId: string,
  { intervalMs = 3000, maxAttempts = 10 }: { intervalMs?: number; maxAttempts?: number } = {},
): Promise<PollResult> {
  let last: Payment | null = null;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const res = await api.get<{ payment: Payment }>(`/payments/${paymentId}/status`);
      last = res.data.payment;
      if (last.status !== "PENDING") {
        return { status: last.status, payment: last };
      }
    } catch {
      // Erreur réseau ponctuelle : on retente au tick suivant.
    }
    if (attempt < maxAttempts - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return { status: last?.status ?? "PENDING", payment: last };
}
