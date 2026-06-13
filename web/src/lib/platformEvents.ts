export type PlatformEventType = "direct_number_payment" | "subscription_payment" | "boost_payment" | "booking_payment" | "search_request";

export type PlatformEvent = {
  id: string;
  type: PlatformEventType;
  title: string;
  detail: string;
  amount?: number;
  status: "pending" | "approved" | "done";
  createdAt: string;
};

export const PLATFORM_EVENTS_KEY = "okkaz_platform_events";

export const seedPlatformEvents: PlatformEvent[] = [
  {
    id: "EVT-DIR-2401",
    type: "direct_number_payment",
    title: "Option numéro direct payée",
    detail: "Jean Dupont a payé l'option numéro direct pour Mercedes-Benz Classe G.",
    amount: 2500,
    status: "done",
    createdAt: "Aujourd'hui",
  },
  {
    id: "EVT-SUB-2401",
    type: "subscription_payment",
    title: "Paiement abonnement Premium mois",
    detail: "Immo Benin SARL attend l'activation de son abonnement.",
    amount: 10000,
    status: "pending",
    createdAt: "Il y a 18 min",
  },
];

export function readPlatformEvents() {
  if (typeof window === "undefined") return seedPlatformEvents;

  const raw = window.localStorage.getItem(PLATFORM_EVENTS_KEY);
  if (!raw) {
    window.localStorage.setItem(PLATFORM_EVENTS_KEY, JSON.stringify(seedPlatformEvents));
    return seedPlatformEvents;
  }

  try {
    return JSON.parse(raw) as PlatformEvent[];
  } catch {
    window.localStorage.setItem(PLATFORM_EVENTS_KEY, JSON.stringify(seedPlatformEvents));
    return seedPlatformEvents;
  }
}

export function writePlatformEvents(events: PlatformEvent[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(PLATFORM_EVENTS_KEY, JSON.stringify(events));
}

export function pushPlatformEvent(event: Omit<PlatformEvent, "id" | "createdAt">) {
  const nextEvent: PlatformEvent = {
    ...event,
    id: `EVT-${Date.now()}`,
    createdAt: "A l'instant",
  };

  writePlatformEvents([nextEvent, ...readPlatformEvents()]);
  window.dispatchEvent(new Event("okkaz-events-updated"));
  return nextEvent;
}
