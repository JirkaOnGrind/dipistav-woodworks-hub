import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  CreditCard,
  FileText,
  LockKeyhole,
  LogOut,
  MapPinned,
  Package,
  Search,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  MOCK_ADMIN_ENTRIES,
  type AdminEntry,
  type EntryStatus,
  type FlowType,
} from "@/lib/order-system";
import { formatCurrency } from "@/lib/site";

export const Route = createFileRoute("/administrace")({
  head: () => ({
    meta: [{ title: "Administrace | DIPISTAV" }, { name: "robots", content: "noindex,nofollow" }],
  }),
  component: AdministrationRoute,
});

const STATUS_LABEL: Record<EntryStatus, string> = {
  new: "Nové",
  in_progress: "V řešení",
  done: "Hotovo",
};

const STATUS_ORDER: EntryStatus[] = ["new", "in_progress", "done"];

function StatusBadge({ status }: { status: EntryStatus }) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2.5 py-1 text-xs font-black",
        status === "new" && "bg-[color:var(--timber)]/12 text-[color:var(--timber)]",
        status === "in_progress" && "bg-sky-100 text-sky-800",
        status === "done" && "bg-emerald-100 text-emerald-800",
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

function AdminLogin({ onPreview }: { onPreview: () => void }) {
  const mockEnabled = import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCKS === "true";
  return (
    <main className="grid min-h-screen place-items-center bg-muted/45 px-4 py-10">
      <section className="w-full max-w-md rounded-3xl border border-border bg-white p-7 shadow-lg">
        <img src="/images/logo-dipi.webp" alt="DIPISTAV" className="h-16 w-auto object-contain" />
        <h1 className="mt-6 text-3xl font-black tracking-tight">Administrace</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Přihlášení je v ostrém režimu ověřováno službou Supabase Auth.
        </p>
        <form className="mt-6 flex flex-col gap-4" onSubmit={(event) => event.preventDefault()}>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            E-mail
            <Input type="email" autoComplete="username" />
          </label>
          <label className="flex flex-col gap-1.5 text-sm font-bold">
            Heslo
            <Input type="password" autoComplete="current-password" />
          </label>
          <Button type="submit" disabled>
            <LockKeyhole data-icon="inline-start" /> Přihlásit se
          </Button>
        </form>
        {mockEnabled ? (
          <div className="mt-6 rounded-2xl bg-muted p-4">
            <p className="text-sm font-bold">Vývojový náhled bez přihlašovacích údajů</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Tlačítko existuje pouze v lokálním mock režimu a nebude produkční autentizací.
            </p>
            <Button type="button" variant="outline" className="mt-4 w-full" onClick={onPreview}>
              <ShieldCheck data-icon="inline-start" /> Otevřít náhled dashboardu
            </Button>
          </div>
        ) : null}
      </section>
    </main>
  );
}

function AdministrationRoute() {
  const [previewSession, setPreviewSession] = useState(false);
  const [entries, setEntries] = useState(MOCK_ADMIN_ENTRIES);
  const [selectedId, setSelectedId] = useState(MOCK_ADMIN_ENTRIES[0]?.id ?? "");
  const [flowFilter, setFlowFilter] = useState<"all" | FlowType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | EntryStatus>("all");
  const [query, setQuery] = useState("");

  const filteredEntries = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("cs-CZ");
    return entries.filter((entry) => {
      const matchesFlow = flowFilter === "all" || entry.flow === flowFilter;
      const matchesStatus = statusFilter === "all" || entry.status === statusFilter;
      const matchesQuery =
        !needle ||
        [entry.id, entry.customerName, entry.email, entry.title]
          .join(" ")
          .toLocaleLowerCase("cs-CZ")
          .includes(needle);
      return matchesFlow && matchesStatus && matchesQuery;
    });
  }, [entries, flowFilter, query, statusFilter]);

  const selected = entries.find((entry) => entry.id === selectedId) ?? entries[0];
  if (!previewSession) return <AdminLogin onPreview={() => setPreviewSession(true)} />;
  if (!selected) return null;

  function advanceStatus(entry: AdminEntry) {
    const index = STATUS_ORDER.indexOf(entry.status);
    const nextStatus = STATUS_ORDER[Math.min(index + 1, STATUS_ORDER.length - 1)];
    setEntries((current) =>
      current.map((item) => (item.id === entry.id ? { ...item, status: nextStatus } : item)),
    );
  }

  return (
    <div className="min-h-screen bg-muted/45 text-foreground">
      <header className="border-b border-border bg-[color:var(--forest)] text-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img
              src="/images/logo-dipimobil.webp"
              alt="DIPISTAV"
              className="size-10 object-contain"
            />
            <div>
              <div className="font-black">DIPISTAV</div>
              <div className="text-xs text-white/65">Administrace</div>
            </div>
          </div>
          <Button variant="outline" onClick={() => setPreviewSession(false)}>
            <LogOut data-icon="inline-start" /> Odhlásit náhled
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-4 py-5 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Objednávky a poptávky</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Jednotný přehled dvou striktně oddělených zákaznických toků.
            </p>
          </div>
          <div className="rounded-xl border border-[color:var(--timber)]/25 bg-[color:var(--timber)]/10 px-4 py-2 text-sm">
            <strong>Vývojový režim</strong>
            <span className="ml-2 text-muted-foreground">mock data</span>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {STATUS_ORDER.map((status) => {
            const Icon =
              status === "new" ? ShoppingCart : status === "in_progress" ? Clock3 : CheckCircle2;
            return (
              <button
                key={status}
                type="button"
                onClick={() => setStatusFilter(status)}
                className="flex items-center gap-4 rounded-2xl border border-border bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <span className="grid size-11 place-items-center rounded-xl bg-muted">
                  <Icon className="size-5" />
                </span>
                <span>
                  <span className="block text-sm text-muted-foreground">
                    {STATUS_LABEL[status]}
                  </span>
                  <strong className="text-2xl">
                    {entries.filter((entry) => entry.status === status).length}
                  </strong>
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-5 grid min-h-[560px] gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(430px,.8fr)]">
          <section className="overflow-hidden rounded-2xl border border-border bg-white shadow-sm">
            <div className="grid gap-3 border-b border-border p-4 md:grid-cols-[180px_180px_1fr]">
              <select
                value={flowFilter}
                onChange={(event) => setFlowFilter(event.target.value as typeof flowFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-bold"
              >
                <option value="all">Všechny záznamy</option>
                <option value="order">Objednávky</option>
                <option value="pergola_inquiry">Poptávky pergol</option>
              </select>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                className="h-10 rounded-md border border-input bg-background px-3 text-sm font-bold"
              >
                <option value="all">Všechny stavy</option>
                {STATUS_ORDER.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABEL[status]}
                  </option>
                ))}
              </select>
              <label className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Hledat podle jména, e-mailu nebo čísla…"
                  className="pl-9"
                />
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-muted/60 text-xs uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3">Typ</th>
                    <th className="px-4 py-3">Číslo / předmět</th>
                    <th className="px-4 py-3">Zákazník</th>
                    <th className="px-4 py-3">Datum</th>
                    <th className="px-4 py-3">Stav</th>
                    <th className="px-4 py-3 text-right">Cena</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map((entry) => (
                    <tr
                      key={entry.id}
                      onClick={() => setSelectedId(entry.id)}
                      className={cn(
                        "cursor-pointer border-t border-border transition hover:bg-muted/50",
                        entry.id === selected.id && "bg-[color:var(--forest)]/7",
                      )}
                    >
                      <td className="px-4 py-4">
                        <span className="flex items-center gap-2 font-bold">
                          {entry.flow === "order" ? (
                            <ShoppingCart className="size-4 text-[color:var(--forest)]" />
                          ) : (
                            <FileText className="size-4 text-sky-700" />
                          )}
                          {entry.flow === "order" ? "Objednávka" : "Poptávka"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block">{entry.id}</strong>
                        <span className="text-muted-foreground">{entry.title}</span>
                      </td>
                      <td className="px-4 py-4">
                        <strong className="block">{entry.customerName}</strong>
                        <span className="text-muted-foreground">{entry.email}</span>
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">{entry.createdAt}</td>
                      <td className="px-4 py-4">
                        <StatusBadge status={entry.status} />
                      </td>
                      <td className="px-4 py-4 text-right font-black">
                        {entry.total == null ? "—" : formatCurrency(entry.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filteredEntries.length === 0 ? (
              <div className="p-10 text-center text-muted-foreground">
                Filtrům neodpovídá žádný záznam.
              </div>
            ) : null}
          </section>

          <aside className="rounded-2xl border border-border bg-white p-5 shadow-sm xl:sticky xl:top-5 xl:max-h-[calc(100vh-2.5rem)] xl:overflow-y-auto">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  {selected.flow === "order" ? "Objednávka" : "Poptávka pergoly"}
                </div>
                <h2 className="mt-1 text-2xl font-black">{selected.id}</h2>
                <p className="mt-1 text-sm text-muted-foreground">Vytvořeno {selected.createdAt}</p>
              </div>
              <StatusBadge status={selected.status} />
            </div>

            <section className="mt-5 border-t border-border pt-5">
              <h3 className="flex items-center gap-2 font-black">
                <UserRound className="size-4" /> Detail zákazníka
              </h3>
              <dl className="mt-3 grid grid-cols-[110px_1fr] gap-2 text-sm">
                <dt className="text-muted-foreground">Jméno</dt>
                <dd className="font-bold">{selected.customerName}</dd>
                <dt className="text-muted-foreground">E-mail</dt>
                <dd>{selected.email}</dd>
                <dt className="text-muted-foreground">Telefon</dt>
                <dd>{selected.phone}</dd>
                <dt className="text-muted-foreground">Adresa</dt>
                <dd>{selected.address}</dd>
              </dl>
            </section>

            {selected.company ? (
              <section className="mt-5 border-t border-border pt-5">
                <h3 className="flex items-center gap-2 font-black">
                  <Building2 className="size-4" /> Firemní údaje
                </h3>
                <dl className="mt-3 grid grid-cols-[110px_1fr] gap-2 text-sm">
                  <dt className="text-muted-foreground">Firma</dt>
                  <dd className="font-bold">{selected.company.companyName}</dd>
                  <dt className="text-muted-foreground">IČO / DIČ</dt>
                  <dd>
                    {selected.company.ico} / {selected.company.dic}
                  </dd>
                  <dt className="text-muted-foreground">Fakturace</dt>
                  <dd>{selected.company.billingAddress}</dd>
                </dl>
              </section>
            ) : null}

            <section className="mt-5 border-t border-border pt-5">
              <h3 className="flex items-center gap-2 font-black">
                <Package className="size-4" />{" "}
                {selected.flow === "order" ? "Objednané zboží" : "Konfigurace pergoly"}
              </h3>
              <ul className="mt-3 flex flex-col gap-2 text-sm">
                {selected.items.map((item) => (
                  <li key={item} className="rounded-xl bg-muted/60 px-3 py-2">
                    {item}
                  </li>
                ))}
              </ul>
            </section>

            <section className="mt-5 border-t border-border pt-5">
              <h3 className="flex items-center gap-2 font-black">
                <CreditCard className="size-4" /> Doprava a platba
              </h3>
              {selected.shipping ? (
                <div className="mt-3 rounded-2xl bg-[color:var(--forest)] p-4 text-white">
                  <div className="flex items-center gap-2 font-black">
                    <MapPinned className="size-4" /> Výpočet dopravy
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <div className="text-white/60">Trasa</div>
                      <strong>{selected.shipping.roundTripKm} km</strong>
                    </div>
                    <div>
                      <div className="text-white/60">Vzorec</div>
                      <strong>2 × {selected.shipping.oneWayKm} × 35 Kč</strong>
                    </div>
                    <div>
                      <div className="text-white/60">Cena</div>
                      <strong>{formatCurrency(selected.shipping.price)}</strong>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="mt-3 rounded-xl bg-muted p-3 text-sm">Osobní odběr · doprava 0 Kč</p>
              )}
              <p className="mt-3 text-sm text-muted-foreground">
                Platba:{" "}
                {selected.payment === "card"
                  ? "kartou u řidiče"
                  : selected.payment === "cash"
                    ? "hotově u řidiče"
                    : "bude dohodnuta v nabídce"}
              </p>
            </section>

            <section className="mt-5 border-t border-border pt-5">
              <h3 className="font-black">Změnit stav</h3>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {STATUS_ORDER.map((status, index) => (
                  <span
                    key={status}
                    className={cn(
                      "rounded-lg border border-border px-3 py-2 text-xs font-black",
                      status === selected.status &&
                        "border-[color:var(--forest)] bg-[color:var(--forest)] text-white",
                    )}
                  >
                    {STATUS_LABEL[status]}
                    {index < STATUS_ORDER.length - 1 ? (
                      <ArrowRight className="ml-2 inline size-3" />
                    ) : null}
                  </span>
                ))}
              </div>
              <Button
                className="mt-4 w-full"
                disabled={selected.status === "done"}
                onClick={() => advanceStatus(selected)}
              >
                {selected.status === "done"
                  ? "Záznam je dokončen"
                  : `Posunout na „${STATUS_LABEL[STATUS_ORDER[STATUS_ORDER.indexOf(selected.status) + 1] ?? "done"]}“`}
              </Button>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
