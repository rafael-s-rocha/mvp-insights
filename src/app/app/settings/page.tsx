"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  fetchMyBusiness,
  fetchBusinessSettings,
  upsertBusinessSettings,
  updateBusinessName,
} from "@/lib/db";

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

export default function SettingsPage() {
  const router = useRouter();

  const [businessId, setBusinessId] = useState<string | null>(null);

  const [businessName, setBusinessName] = useState("");
  const [targetInput, setTargetInput] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErrorMsg(null);

      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/auth");

      const biz = await fetchMyBusiness();
      if (!biz) return router.replace("/setup");

      setBusinessId(biz.id);
      setBusinessName(biz.name);

      try {
        const settings = await fetchBusinessSettings(biz.id);
        const t = settings?.target_monthly_revenue ?? null;
        setTargetInput(t === null ? "" : String(t));
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Falha ao carregar configurações.");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  const parsedTarget = useMemo(() => parseNumberPtBR(targetInput), [targetInput]);

  function validate(): string | null {
    if (!businessId) return "Negócio não carregado.";
    if (!businessName.trim()) return "Nome da empresa é obrigatório.";

    if (targetInput.trim() !== "") {
      if (Number.isNaN(parsedTarget) || parsedTarget < 0) {
        return "Meta inválida (ex: 50000 ou 50000,50).";
      }
    }
    return null;
  }

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const v = validate();
    if (v) return setErrorMsg(v);

    setBusy(true);
    try {
      // 1️⃣ Atualiza nome do negócio
      await updateBusinessName({
        businessId: businessId!,
        name: businessName.trim(),
      });

      // 2️⃣ Atualiza meta
      const target =
        targetInput.trim() === "" ? null : parsedTarget;

      await upsertBusinessSettings({
        businessId: businessId!,
        targetMonthlyRevenue: target,
      });

      setSuccessMsg(
        target === null
          ? "Configurações salvas. Meta removida."
          : `Configurações salvas. Meta: ${formatBRL(target)}`
      );
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao salvar configurações.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="container">Carregando...</main>;

  return (
    <main className="container">
      <header className="topbar">
        <div className="brand">
          <h2>Configurações</h2>
          <small>Negócio</small>
        </div>

        <div className="actions">
          <button onClick={() => router.push("/app")} className="btn btn-ghost">
            Voltar
          </button>
        </div>
      </header>

      <section className="section">
        <h3>Dados do negócio</h3>

        <form onSubmit={onSave} className="grid" style={{ maxWidth: 520 }}>
          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Nome da empresa
            <input
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="Ex: Empresa ABC"
            />
          </label>

          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Meta mensal (R$)
            <input
              value={targetInput}
              onChange={(e) => setTargetInput(e.target.value)}
              inputMode="decimal"
              placeholder="ex: 50000"
            />
          </label>

          <div className="muted" style={{ fontSize: 12 }}>
            Dica: deixe a meta em branco para <strong>remover</strong>.
          </div>

          {errorMsg && <div className="alert danger">{errorMsg}</div>}
          {successMsg && <div className="alert success">{successMsg}</div>}

          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <button disabled={busy} className="btn btn-primary" type="submit">
              {busy ? "Salvando..." : "Salvar alterações"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => router.push("/app")}
              disabled={busy}
            >
              Voltar ao dashboard
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}