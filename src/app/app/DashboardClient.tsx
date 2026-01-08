"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PlusCircle, Settings } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchMyBusiness,
  fetchEntriesLastDays,
  fetchBusinessSettings,
  type DailyEntry,
} from "@/lib/db";
import { computeDashboard } from "@/lib/insights";

function formatBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value);
}

function formatPct(value: number) {
  return `${value.toFixed(0)}%`;
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

type Variant = "accent" | "success" | "warning" | "danger" | undefined;
type Status = "success" | "warning" | "danger";

export default function DashboardClient() {
  const router = useRouter();

  const [businessName, setBusinessName] = useState("");
  const [businessId, setBusinessId] = useState("");
  const [entries, setEntries] = useState<DailyEntry[]>([]);
  const [targetMonthlyRevenue, setTargetMonthlyRevenue] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/auth");

      const biz = await fetchMyBusiness();
      if (!biz) return router.replace("/setup");

      setBusinessName(biz.name);
      setBusinessId(biz.id);

      const [list, settings] = await Promise.all([
        fetchEntriesLastDays(biz.id, 40),
        fetchBusinessSettings(biz.id),
      ]);

      setEntries(list);
      setTargetMonthlyRevenue(settings?.target_monthly_revenue ?? null);
      setLoading(false);
    })();
  }, [router]);

  const metrics = useMemo(() => computeDashboard(entries), [entries]);

  // Progresso REAL (acumulado/meta)
  const goalPct = useMemo(() => {
    if (!targetMonthlyRevenue || targetMonthlyRevenue <= 0) return null;
    return clamp((metrics.monthTotal / targetMonthlyRevenue) * 100, 0, 999);
  }, [metrics.monthTotal, targetMonthlyRevenue]);

  // ===== Ritmo do mês (projeção) — usa a meta real =====
  const monthAnchorDate = useMemo(() => {
    const iso = metrics.lastEntry?.entry_date;
    return iso ? new Date(`${iso}T12:00:00`) : new Date();
  }, [metrics.lastEntry?.entry_date]);

  const daysInMonth = useMemo(() => {
    const y = monthAnchorDate.getFullYear();
    const m = monthAnchorDate.getMonth();
    return new Date(y, m + 1, 0).getDate();
  }, [monthAnchorDate]);

  const dayOfMonth = useMemo(() => monthAnchorDate.getDate(), [monthAnchorDate]);

  const projectedMonthTotal = useMemo(() => {
    if (!targetMonthlyRevenue || targetMonthlyRevenue <= 0) return null;
    const elapsedDays = Math.max(1, dayOfMonth);
    const avgPerDaySoFar = metrics.monthTotal / elapsedDays;
    return avgPerDaySoFar * daysInMonth;
  }, [metrics.monthTotal, dayOfMonth, daysInMonth, targetMonthlyRevenue]);

  const pacePct = useMemo(() => {
    if (!targetMonthlyRevenue || targetMonthlyRevenue <= 0) return null;
    if (projectedMonthTotal === null) return null;
    return clamp((projectedMonthTotal / targetMonthlyRevenue) * 100, 0, 999);
  }, [projectedMonthTotal, targetMonthlyRevenue]);

  const paceStatus = useMemo<Status | null>(() => {
    if (pacePct === null) return null;
    if (pacePct >= 100) return "success";
    if (pacePct >= 90) return "warning";
    return "danger";
  }, [pacePct]);

  // Banner executivo (topo) — cor baseada na projeção vs meta
  const executiveBanner = useMemo(() => {
    if (!targetMonthlyRevenue || targetMonthlyRevenue <= 0) return null;
    if (!metrics.lastEntry) return null;
    if (projectedMonthTotal === null || pacePct === null || paceStatus === null) return null;

    const daysElapsed = Math.max(1, dayOfMonth);

    let suffix = "";
    if (daysElapsed < 3) suffix = " (estimativa inicial)";
    else if (daysElapsed < 7) suffix = " (estimativa preliminar)";

    return {
      level: paceStatus,
      title: "Ritmo do mês",
      message: `Mantendo esse ritmo, você fecha o mês em ${formatBRL(projectedMonthTotal)}${suffix}.`,
    };
  }, [targetMonthlyRevenue, metrics.lastEntry, projectedMonthTotal, pacePct, paceStatus, dayOfMonth]);

  async function logout() {
    await supabase.auth.signOut();
    router.replace("/auth");
  }

  if (loading) return <main className="container">Carregando...</main>;

  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">
          <h2>{businessName}</h2>
          <small>Dashboard</small>
        </div>

        <div className="actions">
          <Link href="/app/entry" className="btn btn-ghost btn-icon">
            <PlusCircle size={18} />
            <span>Lançar dia</span>
          </Link>

          <Link href="/app/settings" className="btn btn-ghost btn-icon">
            <Settings size={18} />
            <span>Configurações</span>
          </Link>
        </div>
      </header>

      {/* BANNER EXECUTIVO NO TOPO */}
      {executiveBanner && (
        <section className="section" style={{ marginTop: 10 }}>
          <div className={`insight ${executiveBanner.level}`} style={{ fontSize: 14 }}>
            <strong>{executiveBanner.title}:</strong>{" "}
            <span className="muted">{executiveBanner.message}</span>
          </div>
        </section>
      )}

      {/* FATURAMENTO */}
      <section className="section">
        <h3>Faturamento</h3>

        <div className="grid cards">
          <Kpi
            label="Último lançamento"
            value={metrics.lastEntry ? formatBRL(Number(metrics.lastEntry.revenue)) : "Sem lançamentos"}
            variant="accent"
          />

          <Kpi
            label="Média da última semana"
            value={metrics.last7RevenueAvg !== null ? formatBRL(metrics.last7RevenueAvg) : "Construindo..."}
          />

          <Kpi
            label="Média das últimas 4 semanas"
            value={metrics.last28RevenueAvg !== null ? formatBRL(metrics.last28RevenueAvg) : "Construindo..."}
          />

          <Kpi
            label="Último vs últimas 4 semanas"
            value={metrics.lastVs28Pct === null ? "-" : formatPct(metrics.lastVs28Pct)}
            variant={metrics.lastVs28Pct === null ? undefined : metrics.lastVs28Pct < 0 ? "danger" : "success"}
          />
        </div>
      </section>

      {/* TICKET */}
      <section className="section">
        <h3>Ticket médio</h3>

        <div className="grid cards">
          <Kpi label="Ticket do último dia" value={metrics.lastTicketAvg === null ? "-" : formatBRL(metrics.lastTicketAvg)} />

          <Kpi
            label="Ticket médio da última semana"
            value={metrics.last7TicketAvg === null ? "Construindo..." : formatBRL(metrics.last7TicketAvg)}
          />

          <Kpi
            label="Ticket médio das últimas 4 semanas"
            value={metrics.last28TicketAvg === null ? "Construindo..." : formatBRL(metrics.last28TicketAvg)}
          />

          <Kpi
            label="Ticket último vs última semana"
            value={metrics.lastTicketVs7Pct === null ? "-" : formatPct(metrics.lastTicketVs7Pct)}
            variant={metrics.lastTicketVs7Pct === null ? undefined : metrics.lastTicketVs7Pct < 0 ? "danger" : "success"}
          />
        </div>
      </section>

      {/* META */}
      <section className="section">
        <h3>Meta do mês</h3>

        <div className="grid cards">
          <Kpi label="Faturamento do mês" value={formatBRL(metrics.monthTotal)} variant="accent" />
          <Kpi label="Meta mensal" value={targetMonthlyRevenue ? formatBRL(targetMonthlyRevenue) : "Sem meta"} />

          <div className={`card ${paceStatus ?? ""}`}>
            <div className="label">Progresso da meta</div>

            {goalPct === null ? (
              <div className="muted">Defina uma meta em Configurações.</div>
            ) : (
              <>
                <div className="value">{formatPct(goalPct)}</div>

                <div className={`progress ${paceStatus ?? ""}`}>
                  <div style={{ width: `${clamp(goalPct, 0, 100)}%` }} />
                </div>

                {pacePct !== null && projectedMonthTotal !== null && (
                  <div className="muted" style={{ marginTop: 10 }}>
                    Ritmo do mês: <strong>{formatPct(pacePct)}</strong> da meta (projeção:{" "}
                    <strong>{formatBRL(projectedMonthTotal)}</strong>).
                  </div>
                )}

                <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                  A cor reflete o <strong>ritmo</strong> (projeção) — verde (&gt;=100%), amarelo (90–99%), vermelho (&lt;90%).
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* INSIGHTS (automáticos) */}
      <section className="section">
        <h3>Insights</h3>

        {metrics.insights.length === 0 ? (
          <div className="muted">Nenhum insight agora.</div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {metrics.insights.map((i, idx) => (
              <div key={idx} className={`insight ${i.level}`}>
                <strong>{i.title}:</strong> <span className="muted">{i.message}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* LANÇAMENTOS */}
      <section className="section">
        <h3>Últimos lançamentos</h3>

        {entries.length === 0 ? (
          <div className="muted">Nenhum lançamento ainda.</div>
        ) : (
          entries
            .slice(-10)
            .reverse()
            .map((e) => (
              <div key={e.id} className="row">
                <span className="muted">{formatDateBR(e.entry_date)}</span>
                <span>{formatBRL(Number(e.revenue))}</span>
                <span className="muted">{e.orders} pedidos</span>
              </div>
            ))
        )}
      </section>

      {/* CONTA */}
      <section className="section">
        <h3>Conta</h3>

        <div className="grid" style={{ gap: 10 }}>
          <div className="badge">
            <span>Business ID:</span>
            <span className="muted">{businessId}</span>
          </div>

          <button onClick={logout} className="btn btn-danger">
            Sair da conta
          </button>
        </div>
      </section>
    </main>
  );
}

function Kpi({
  label,
  value,
  variant,
}: {
  label: string;
  value: string;
  variant?: Variant;
}) {
  return (
    <div className={`card ${variant ?? ""}`}>
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}