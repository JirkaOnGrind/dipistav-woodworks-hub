import { useState, type ReactNode } from "react";
import { Menu, ShoppingCart, X } from "lucide-react";
import { useRouterState } from "@tanstack/react-router";
import { useCart } from "@/lib/cart";
import {
  COMPANY_ADDRESS,
  COMPANY_EMAIL,
  COMPANY_EMAIL_HREF,
  COMPANY_PHONE,
  COMPANY_PHONE_HREF,
  OPENING_HOURS,
  SITE_NAVIGATION,
} from "@/lib/site";

function SiteNavLink({
  href,
  label,
  currentPath,
  currentHash,
  route,
  onClick,
  mobile = false,
}: {
  href: string;
  label: string;
  currentPath: string;
  currentHash: string;
  route: string;
  onClick?: () => void;
  mobile?: boolean;
}) {
  const targetHash = href.includes("#") ? (href.split("#")[1] ?? "") : "";
  const isActive = href.includes("#")
    ? currentPath === route && currentHash === targetHash
    : route === currentPath;

  return (
    <a
      href={href}
      onClick={onClick}
      className={
        mobile
          ? `block rounded-2xl px-4 py-3 text-base font-semibold transition ${
              isActive
                ? "bg-[#F5F2E9] text-[#234A33]"
                : "text-[#1E293B] hover:bg-[#F5F2E9] hover:text-[#234A33]"
            }`
          : `text-sm font-semibold transition ${
              isActive ? "text-[#234A33]" : "text-[#1E293B]/80 hover:text-[#A86D38]"
            }`
      }
    >
      {label}
    </a>
  );
}

function CartButton() {
  const { itemCount, openCart } = useCart();

  return (
    <button
      aria-label="Otevřít košík"
      onClick={openCart}
      className="relative inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#A86D38] text-white shadow-sm transition hover:bg-[#8a5528]"
    >
      <ShoppingCart className="h-5 w-5" />
      {itemCount > 0 && (
        <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#234A33] px-1 text-[10px] font-black text-white">
          {itemCount}
        </span>
      )}
    </button>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  const currentLocation = useRouterState({ select: (state) => state.location });
  const [menuOpen, setMenuOpen] = useState(false);
  const logoSrc = "/images/logo-dipi.png";
  const currentPath = currentLocation.pathname;
  const currentHash = currentLocation.hash;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-2">
          <a href="/" className="flex min-w-0 items-center gap-2">
            <img
              src={logoSrc}
              alt="DIPISTAV"
              className="h-12 w-auto shrink-0 object-contain sm:h-14 md:h-16"
            />
          </a>

          <nav className="hidden items-center gap-6 xl:flex">
            {SITE_NAVIGATION.map((item) => (
              <SiteNavLink
                key={item.href}
                currentPath={currentPath}
                currentHash={currentHash}
                {...item}
              />
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <CartButton />
            <button
              aria-label="Otevřít menu"
              onClick={() => setMenuOpen(true)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-white text-foreground xl:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </div>
      </header>

      {menuOpen && (
        <div className="fixed inset-0 z-50 xl:hidden" role="dialog" aria-modal="true">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[86%] max-w-sm flex-col bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <img src={logoSrc} alt="DIPISTAV" className="h-10 w-auto object-contain" />
              <button
                aria-label="Zavřít menu"
                onClick={() => setMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <nav className="flex-1 overflow-y-auto px-3 py-4">
              {SITE_NAVIGATION.map((item) => (
                <SiteNavLink
                  key={item.href}
                  currentPath={currentPath}
                  currentHash={currentHash}
                  mobile
                  onClick={() => setMenuOpen(false)}
                  {...item}
                />
              ))}
            </nav>

            <div className="border-t border-border p-5">
              <a
                href={COMPANY_PHONE_HREF}
                className="flex w-full items-center justify-center rounded-2xl bg-[#234A33] px-4 py-3 text-sm font-bold text-white"
              >
                Volejte {COMPANY_PHONE}
              </a>
              <a
                href={COMPANY_EMAIL_HREF}
                className="mt-2 block text-center text-sm font-semibold text-[#234A33]"
              >
                {COMPANY_EMAIL}
              </a>
            </div>
          </aside>
        </div>
      )}

      <main>{children}</main>

      <footer className="bg-[#1E293B] text-white/80">
        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <img src={logoSrc} alt="DIPISTAV" className="h-12 w-auto object-contain" />
            <p className="mt-3 text-sm text-white/70">
              Poctivá česká pila a prodej dřeva. Standardní skladové profily i řezivo na míru do 8
              metrů.
            </p>
          </div>

          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Kontakt
            </div>
            <ul className="space-y-1.5 text-sm">
              <li>{COMPANY_PHONE}</li>
              <li>{COMPANY_EMAIL}</li>
              <li>{COMPANY_ADDRESS}</li>
            </ul>
          </div>

          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Otevírací doba
            </div>
            <ul className="space-y-1.5 text-sm">
              {OPENING_HOURS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>

          <div>
            <div className="mb-3 text-sm font-black uppercase tracking-wide text-white">
              Rychlá navigace
            </div>
            <ul className="space-y-1.5 text-sm">
              {SITE_NAVIGATION.map((item) => (
                <li key={item.href}>
                  <a href={item.href} className="hover:text-[#D9B48A]">
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto max-w-7xl px-4 py-4 text-xs text-white/50">
            © {new Date().getFullYear()} DIPISTAV – Pila a prodej dřeva. Všechna práva vyhrazena.
          </div>
        </div>
      </footer>
    </div>
  );
}
