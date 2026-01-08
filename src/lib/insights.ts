import type { DailyEntry } from "./db";

export type InsightLevel = "success" | "warning" | "danger";

export type Insight = {
  title: string;
  message: string;
  level: InsightLevel;
};

export type DashboardMetrics = {
  lastEntry: DailyEntry | null;
  monthTotal: number;

  last7RevenueAvg: number | null;
  last28RevenueAvg: number | null;
  lastVs28Pct: number | null;

  lastTicketAvg: number | null;
  last7TicketAvg: number | null;
  last28TicketAvg: number | null;
  lastTicketVs7Pct: number | null;

  // novos “cruzados”
  last7Vs28RevenuePct: number | null;
  last7Vs28TicketPct: number | null;

  insights: Insight[];
};

function toNumber(v: any) {
  return Number(v ?? 0);
}

function pct(current: number | null, base: number | null) {
  if (current === null || base === null || base === 0) return null;
  return ((current - base) / base) * 100;
}

function avgRevenue(list: DailyEntry[]) {
  if (list.length === 0) return null;
  return list.reduce((s, e) => s + toNumber(e.revenue), 0) / list.length;
}

function avgTicket(list: DailyEntry[]) {
  if (list.length === 0) return null;
  const sum = list.reduce((s, e) => s + (e.orders ? toNumber(e.revenue) / e.orders : 0), 0);
  return sum / list.length;
}

function monthTotalFrom(entries: DailyEntry[]) {
  if (entries.length === 0) return 0;
  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const last = sorted[sorted.length - 1];
  const anchor = new Date(`${last.entry_date}T12:00:00`);
  const m = anchor.getMonth();
  const y = anchor.getFullYear();

  const monthEntries = sorted.filter((e) => {
    const d = new Date(`${e.entry_date}T12:00:00`);
    return d.getMonth() === m && d.getFullYear() === y;
  });

  return monthEntries.reduce((s, e) => s + toNumber(e.revenue), 0);
}

export function computeDashboard(entries: DailyEntry[]): DashboardMetrics {
  if (entries.length === 0) {
    return {
      lastEntry: null,
      monthTotal: 0,

      last7RevenueAvg: null,
      last28RevenueAvg: null,
      lastVs28Pct: null,

      lastTicketAvg: null,
      last7TicketAvg: null,
      last28TicketAvg: null,
      lastTicketVs7Pct: null,

      last7Vs28RevenuePct: null,
      last7Vs28TicketPct: null,

      insights: [],
    };
  }

  const sorted = [...entries].sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  const last = sorted[sorted.length - 1];

  const last7 = sorted.slice(-7);
  const last28 = sorted.slice(-28);

  const last7RevenueAvg = avgRevenue(last7);
  const last28RevenueAvg = avgRevenue(last28);

  const lastTicketAvg = last.orders ? toNumber(last.revenue) / last.orders : null;
  const last7TicketAvg = avgTicket(last7);
  const last28TicketAvg = avgTicket(last28);

  const lastVs28Pct = pct(toNumber(last.revenue), last28RevenueAvg);
  const lastTicketVs7Pct = pct(lastTicketAvg, last7TicketAvg);

  const last7Vs28RevenuePct = pct(last7RevenueAvg, last28RevenueAvg);
  const last7Vs28TicketPct = pct(last7TicketAvg, last28TicketAvg);

  const monthTotal = monthTotalFrom(sorted);

  const insights: Insight[] = [];

  // === INSIGHT: Queda/subida do último dia vs 4 semanas (faturamento) ===
  if (lastVs28Pct !== null) {
    if (lastVs28Pct <= -20) {
      insights.push({
        title: "Queda fora do normal",
        message: `Seu último lançamento está ${Math.abs(lastVs28Pct).toFixed(
          0
        )}% abaixo da média das últimas 4 semanas.`,
        level: "danger",
      });
    } else if (lastVs28Pct >= 20) {
      insights.push({
        title: "Dia acima do normal",
        message: `Seu último lançamento está ${lastVs28Pct.toFixed(
          0
        )}% acima da média das últimas 4 semanas.`,
        level: "success",
      });
    }
  }

  // === INSIGHT: Ticket do último dia vs última semana ===
  if (lastTicketVs7Pct !== null) {
    if (lastTicketVs7Pct <= -15) {
      insights.push({
        title: "Ticket caiu",
        message: `O ticket do último dia ficou ${Math.abs(lastTicketVs7Pct).toFixed(
          0
        )}% abaixo do ticket médio da última semana.`,
        level: "warning",
      });
    } else if (lastTicketVs7Pct >= 15) {
      insights.push({
        title: "Ticket subiu",
        message: `O ticket do último dia ficou ${lastTicketVs7Pct.toFixed(
          0
        )}% acima do ticket médio da última semana.`,
        level: "success",
      });
    }
  }

  // === INSIGHT CRUZADO: Última semana vs últimas 4 semanas (faturamento) ===
  if (last7Vs28RevenuePct !== null) {
    if (last7Vs28RevenuePct <= -12) {
      insights.push({
        title: "Semana mais fraca",
        message: `A média da última semana está ${Math.abs(last7Vs28RevenuePct).toFixed(
          0
        )}% abaixo da média das últimas 4 semanas.`,
        level: "warning",
      });
    } else if (last7Vs28RevenuePct >= 12) {
      insights.push({
        title: "Semana mais forte",
        message: `A média da última semana está ${last7Vs28RevenuePct.toFixed(
          0
        )}% acima da média das últimas 4 semanas.`,
        level: "success",
      });
    }
  }

  // === INSIGHT CRUZADO: Última semana vs últimas 4 semanas (ticket) ===
  if (last7Vs28TicketPct !== null) {
    if (last7Vs28TicketPct <= -12) {
      insights.push({
        title: "Ticket da semana caiu",
        message: `O ticket médio da última semana está ${Math.abs(last7Vs28TicketPct).toFixed(
          0
        )}% abaixo da média das últimas 4 semanas.`,
        level: "warning",
      });
    } else if (last7Vs28TicketPct >= 12) {
      insights.push({
        title: "Ticket da semana subiu",
        message: `O ticket médio da última semana está ${last7Vs28TicketPct.toFixed(
          0
        )}% acima da média das últimas 4 semanas.`,
        level: "success",
      });
    }
  }

  // === Insight “educativo” quando ainda há poucos dados ===
  if (sorted.length < 7) {
    insights.unshift({
      title: "Construindo referência",
      message: "Com ~7 dias de lançamentos, as comparações ficam mais úteis.",
      level: "warning",
    });
  } else if (sorted.length < 14) {
    insights.unshift({
      title: "Aprimorando referência",
      message: "Com ~14 dias de lançamentos, as comparações ficam mais confiáveis.",
      level: "success",
    });
  }

  return {
    lastEntry: last,
    monthTotal,

    last7RevenueAvg,
    last28RevenueAvg,
    lastVs28Pct,

    lastTicketAvg,
    last7TicketAvg,
    last28TicketAvg,
    lastTicketVs7Pct,

    last7Vs28RevenuePct,
    last7Vs28TicketPct,

    insights,
  };
}