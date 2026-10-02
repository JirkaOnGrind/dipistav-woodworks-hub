import type { CartItem } from "@/lib/cart";
import type { PergolaConfig } from "@/lib/pergola";

export const FREE_SHIPPING_THRESHOLD = 100_000;
export const SHIPPING_RATE_CZK_PER_KM = 35;
export const SHIPPING_ORIGIN = "Všesulov 4, 270 34 Všesulov";
export const PERGOLA_INQUIRY_STORAGE_KEY = "dipistav-pergola-inquiry-v1";

export type FlowType = "order" | "pergola_inquiry";
export type EntryStatus = "new" | "in_progress" | "done";

export type CompanyDetails = {
  ico: string;
  dic: string;
  companyName: string;
  billingAddress: string;
};

export type ShippingQuote = {
  provider: "mock" | "mapy";
  origin: string;
  destinationPostcode: string;
  oneWayKm: number;
  roundTripKm: number;
  ratePerKm: number;
  price: number;
};

export const MORAVIAN_POSTCODE_PATTERNS = [
  /^56[89]\d{2}$/,
  /^5[89]\d{3}$/,
  /^6\d{4}$/,
  /^7\d{4}$/,
] as const;

export function normalizePostcode(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function isValidPostcode(value: string) {
  return /^\d{5}$/.test(normalizePostcode(value));
}

export function isMoravianPostcode(value: string) {
  const postcode = normalizePostcode(value);
  return MORAVIAN_POSTCODE_PATTERNS.some((pattern) => pattern.test(postcode));
}

export function freeShippingRemaining(cartValue: number) {
  return Math.max(0, FREE_SHIPPING_THRESHOLD + 0.01 - cartValue);
}

export function calculateShippingPrice(oneWayKm: number) {
  return oneWayKm * 2 * SHIPPING_RATE_CZK_PER_KM;
}

export async function lookupCompanyByIco(ico: string): Promise<CompanyDetails> {
  await new Promise((resolve) => window.setTimeout(resolve, 520));
  if (!/^\d{8}$/.test(ico)) throw new Error("Zadejte platné osmimístné IČO.");
  if (ico === "00000000") throw new Error("IČO nebylo v registru ARES nalezeno.");

  return {
    ico,
    dic: `CZ${ico}`,
    companyName: ico === "27082440" ? "WOODTRADE s.r.o." : "Ukázková firma s.r.o.",
    billingAddress:
      ico === "27082440" ? "Průmyslová 124, 270 34 Všesulov" : "Dlouhá 12, 110 00 Praha 1",
  };
}

export async function calculateMockShipping(postcode: string): Promise<ShippingQuote> {
  const clean = normalizePostcode(postcode);
  if (!isValidPostcode(clean)) throw new Error("Zadejte platné PSČ ve formátu 123 45.");
  await new Promise((resolve) => window.setTimeout(resolve, 440));
  const digits = clean.split("").reduce((sum, digit) => sum + Number(digit), 0);
  const oneWayKm = 18 + digits * 2;
  const roundTripKm = oneWayKm * 2;
  return {
    provider: "mock",
    origin: SHIPPING_ORIGIN,
    destinationPostcode: clean,
    oneWayKm,
    roundTripKm,
    ratePerKm: SHIPPING_RATE_CZK_PER_KM,
    price: calculateShippingPrice(oneWayKm),
  };
}

export function savePergolaInquiry(config: PergolaConfig) {
  window.sessionStorage.setItem(
    PERGOLA_INQUIRY_STORAGE_KEY,
    JSON.stringify({ version: 1, config }),
  );
}

export function readPergolaInquiry(): PergolaConfig | null {
  try {
    const parsed = JSON.parse(
      window.sessionStorage.getItem(PERGOLA_INQUIRY_STORAGE_KEY) ?? "null",
    ) as { version?: unknown; config?: PergolaConfig } | null;
    return parsed?.version === 1 && parsed.config ? parsed.config : null;
  } catch {
    return null;
  }
}

export type AdminEntry = {
  id: string;
  flow: FlowType;
  status: EntryStatus;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  postcode: string;
  company?: CompanyDetails;
  payment?: "cash" | "card";
  title: string;
  total: number | null;
  items: string[];
  shipping: ShippingQuote | null;
};

export const MOCK_ADMIN_ENTRIES: AdminEntry[] = [
  {
    id: "OBJ-2026-0158",
    flow: "order",
    status: "new",
    createdAt: "29. 9. 2026, 10:24",
    customerName: "Jan Novák",
    email: "novak@email.cz",
    phone: "+420 777 123 456",
    address: "U Lesa 123, 252 10 Mníšek pod Brdy",
    postcode: "25210",
    payment: "cash",
    title: "Stavební řezivo a palivo",
    total: 27_860,
    items: ["Trámy 50 × 100 mm · 10 ks", "Palivové dřevo tvrdé · 2 PRMS"],
    shipping: {
      provider: "mock",
      origin: SHIPPING_ORIGIN,
      destinationPostcode: "25210",
      oneWayKm: 38,
      roundTripKm: 76,
      ratePerKm: 35,
      price: 2_660,
    },
  },
  {
    id: "PP-2026-0043",
    flow: "pergola_inquiry",
    status: "in_progress",
    createdAt: "28. 9. 2026, 16:18",
    customerName: "Petra Svobodová",
    email: "svobodova@seznam.cz",
    phone: "+420 602 445 981",
    address: "Nad Rybníkem 14, 301 00 Plzeň",
    postcode: "30100",
    title: "Pergola ke zdi 4 × 3 m",
    total: null,
    items: ["Smrk KVH", "Pultová střecha", "Montáž: ano", "Nátěr: Teak RC-545"],
    shipping: {
      provider: "mock",
      origin: SHIPPING_ORIGIN,
      destinationPostcode: "30100",
      oneWayKm: 54,
      roundTripKm: 108,
      ratePerKm: 35,
      price: 3_780,
    },
  },
  {
    id: "OBJ-2026-0157",
    flow: "order",
    status: "done",
    createdAt: "27. 9. 2026, 11:03",
    customerName: "Stavby Karásek s.r.o.",
    email: "info@karasekstavby.cz",
    phone: "+420 728 304 220",
    address: "Pod Hájem 8, 266 01 Beroun",
    postcode: "26601",
    company: {
      ico: "27082440",
      dic: "CZ27082440",
      companyName: "Stavby Karásek s.r.o.",
      billingAddress: "Pod Hájem 8, 266 01 Beroun",
    },
    payment: "card",
    title: "KVH hranoly",
    total: 46_320,
    items: ["KVH hranol 100 × 100 mm · 42 bm"],
    shipping: null,
  },
];

export function cartItemsForOrder(items: CartItem[]) {
  return items.filter((item) => item.kind !== "catalog" || item.productId !== "pergoly");
}
