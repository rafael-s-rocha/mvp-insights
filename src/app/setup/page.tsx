"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function parseNumberPtBR(value: string) {
  const v = value.trim();
  if (!v) return NaN;

  const s = v.replace(/\s/g, "");
  const normalized =
    s.includes(".") && s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s.replace(",", ".");
  return Number(normalized);
}

export default function SetupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [target, setTarget] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const targetParsed = useMemo(() => parseNumberPtBR(target), [target]);

  useEffect(() => {
    // If not logged in, go to /auth
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return router.replace("/auth");
      setLoading(false);
    })();
  }, [router]);

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setBusy(true);

    try {
      const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) throw sessionErr;

      const userId = sessionData.session?.user.id;
      if (!userId) throw new Error("Not authenticated.");

      const bizName = name.trim();
      if (!bizName) throw new Error("Informe o nome do negócio.");

      const { data: biz, error: bizErr } = await supabase
        .from("businesses")
        .insert({ owner_user_id: userId, name: bizName })
        .select("id")
        .single();

      if (bizErr) throw bizErr;

      let targetNum: number | null = null;
      if (target.trim() !== "") {
        if (Number.isNaN(targetParsed) || targetParsed < 0) {
          throw new Error("Meta mensal inválida (ex: 50000 ou 50000,50).");
        }
        targetNum = targetParsed;
      }

      const { error: settingsErr } = await supabase
        .from("business_settings")
        .insert({ business_id: biz.id, target_monthly_revenue: targetNum });

      if (settingsErr) throw settingsErr;

      router.replace("/app");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha ao criar negócio.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <main className="container">Carregando...</main>;

  return (
    <main className="container" style={{ maxWidth: 620 }}>
      <header className="topbar">
        <div className="brand">
          <h2>Criar negócio</h2>
          <small className="muted">Primeira configuração</small>
        </div>
      </header>

      <section className="section">
        <h3>Dados iniciais</h3>

        <form onSubmit={onCreate} className="grid" style={{ maxWidth: 520 }}>
          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Nome do negócio
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Loja da Maria"
              required
            />
          </label>

          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Meta mensal (opcional)
            <input
              value={target}
              onChange={(e) => setTarget(e.target.value)}
              placeholder="ex: 50000"
              inputMode="decimal"
            />
          </label>

          {errorMsg && <div className="alert danger">{errorMsg}</div>}

          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <button disabled={busy} className="btn btn-primary" type="submit">
              {busy ? "Criando..." : "Criar e continuar"}
            </button>

            <button
              type="button"
              className="btn btn-ghost"
              disabled={busy}
              onClick={async () => {
                await supabase.auth.signOut();
                router.replace("/auth");
              }}
            >
              Sair
            </button>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Você poderá ajustar a meta depois em <strong>Configurações</strong>.
          </div>
        </form>
      </section>
    </main>
  );
}