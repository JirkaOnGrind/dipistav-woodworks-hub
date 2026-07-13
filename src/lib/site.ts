export type SiteNavigationItem = {
  href: string;
  label: string;
  route: string;
};

export const COMPANY_NAME = "DIPISTAV";
export const COMPANY_PHONE = "+420 736 697 480";
export const COMPANY_PHONE_HREF = "tel:+420736697480";
export const COMPANY_EMAIL = "info@dipistav.cz";
export const COMPANY_EMAIL_HREF = "mailto:info@dipistav.cz";
export const COMPANY_ADDRESS_LINES = ["Všesulov 4", "270 34 Všesulov"];
export const COMPANY_ADDRESS = COMPANY_ADDRESS_LINES.join(", ");
export const COMPANY_MAPS_URL =
  "https://www.google.com/maps/search/?api=1&query=V%C5%A1esulov+4%2C+270+34+V%C5%A1esulov";

export const OPENING_HOURS = ["Po–Pá: 7:00 – 16:00", "Nakládka vysokozdvižným vozíkem zdarma"];

export const SITE_NAVIGATION: SiteNavigationItem[] = [
  { label: "Kategorie", href: "/#kategorie", route: "/" },
  { label: "Doprava", href: "/doprava", route: "/doprava" },
  { label: "O nás", href: "/o-nas", route: "/o-nas" },
  { label: "Kontakt", href: "/#kontakt", route: "/" },
];

export function formatCurrency(value: number) {
  return `${new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 2 }).format(value)} Kč`;
}

export function formatDecimal(value: number, maximumFractionDigits = 3) {
  return new Intl.NumberFormat("cs-CZ", {
    minimumFractionDigits: maximumFractionDigits,
    maximumFractionDigits,
  }).format(value);
}

export function sanitizePostcode(value: string) {
  return value.replace(/\s/g, "");
}

export function getShippingQuote(postcode: string) {
  const cleanPostcode = sanitizePostcode(postcode);

  if (!/^\d{5}$/.test(cleanPostcode)) {
    return null;
  }

  const firstDigit = Number(cleanPostcode[0]);
  const lastDigit = Number(cleanPostcode[4]);
  const price = 890 + firstDigit * 170 + (lastDigit >= 5 ? 90 : 0);

  const leadTime =
    firstDigit <= 2
      ? "1–2 pracovní dny"
      : firstDigit <= 5
        ? "2–3 pracovní dny"
        : "2–4 pracovní dny";

  return {
    cleanPostcode,
    price,
    leadTime,
    note: "Orientační cena zahrnuje složení hydraulickou rukou přímo na stavbě.",
  };
}
