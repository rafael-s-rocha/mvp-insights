"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMyBusiness, upsertDailyEntry } from "@/lib/db";

function isoYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function addDaysIso(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  return dt.toISOString().slice(0, 10);
}

function parseNumberPtBR(value: string) {
  const v = value.trim();
  if (!v) return NaN;

  const s = v.replace(/\s/g, "");
  const normalized =
    s.includes(".") && s.includes(",")
      ? s.replace(/\./g, "").replace(",", ".")
      : s.replace(",", ".");
  return Number(normalized);
}

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export default function EntryPage() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState<string | null>(null);

  const [entryDate, setEntryDate] = useState(isoYesterday());
  const [revenue, setRevenue] = useState("");
  const [orders, setOrders] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/auth");

      const biz = await fetchMyBusiness();
      if (!biz) return router.replace("/setup");

      setBusinessId(biz.id);
      setBusinessName(biz.name);
    })();
  }, [router]);

  const revenueParsed = useMemo(() => parseNumberPtBR(revenue), [revenue]);
  const ordersParsed = useMemo(() => Number(orders), [orders]);

  function validate(): string | null {
    if (!businessId) return "Negócio não carregado.";
    if (!entryDate) return "Selecione uma data.";

    if (Number.isNaN(revenueParsed) || revenueParsed < 0) {
      return "Faturamento inválido (ex: 3300 ou 3300,50).";
    }

    if (!Number.isInteger(ordersParsed) || ordersParsed < 0) {
      return "Pedidos deve ser um número inteiro.";
    }

    return null;
  }

  async function save(next: "DASHBOARD" | "ANOTHER") {
    setErrorMsg(null);
    setSuccessMsg(null);

    const v = validate();
    if (v) return setErrorMsg(v);

    setBusy(true);
    try {
      await upsertDailyEntry({
        businessId: businessId!,
        entryDate,
        revenue: revenueParsed,
        orders: ordersParsed,
        notes: notes.trim() || undefined,
      });

      if (next === "DASHBOARD") {
        router.replace("/app");
        return;
      }

      setSuccessMsg(`Salvo ${formatBRL(revenueParsed)} em ${entryDate}`);
      setEntryDate(addDaysIso(entryDate, 1));
      setRevenue("");
      setOrders("");
      setNotes("");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao salvar lançamento.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">
          <h2>Lançar dia</h2>
          <small>{businessName}</small>
        </div>

        <div className="actions">
          <button onClick={() => router.push("/app")} className="btn btn-ghost">
            Voltar
          </button>
        </div>
      </header>

      <section className="section">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save("DASHBOARD");
          }}
          className="grid"
          style={{ maxWidth: 520 }}
        >
          <label className="muted">
            Data
            <input
              type="date"
              value={entryDate}
              onChange={(e) => setEntryDate(e.target.value)}
            />
          </label>

          <label className="muted">
            Faturamento (R$)
            <input
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              inputMode="decimal"
              placeholder="ex: 3300 ou 3300,50"
            />
          </label>

          <label className="muted">
            Pedidos
            <input
              value={orders}
              onChange={(e) => setOrders(e.target.value)}
              inputMode="numeric"
              placeholder="ex: 39"
            />
          </label>

          <label className="muted">
            Observações (opcional)
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ex: campanha, feriado, promoção"
            />
          </label>

          {errorMsg && <div className="alert danger">{errorMsg}</div>}
          {successMsg && <div className="alert success">{successMsg}</div>}

          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <button type="submit" disabled={busy} className="btn btn-primary">
              {busy ? "Salvando..." : "Salvar e ir ao dashboard"}
            </button>

            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost"
              onClick={() => save("ANOTHER")}
            >
              {busy ? "Salvando..." : "Salvar e lançar outro dia"}
            </button>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Dica: use “Salvar e lançar outro dia” para lançar histórico rapidamente.
          </div>
        </form>
      </section>
    </main>
  );
}