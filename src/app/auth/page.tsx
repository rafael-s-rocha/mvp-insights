"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { fetchMyBusiness } from "@/lib/db";
import { APP_NAME } from "@/lib/appConfig";

export default function AuthPage() {
  const router = useRouter();

  const [mode, setMode] = useState<"LOGIN" | "SIGNUP">("LOGIN");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) return;

      const biz = await fetchMyBusiness();
      router.replace(biz ? "/app" : "/setup");
    })();
  }, [router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);

    try {
      const eMail = email.trim().toLowerCase();
      if (!eMail) throw new Error("Informe o email.");
      if (!password) throw new Error("Informe a senha.");

      if (mode === "LOGIN") {
        const { error } = await supabase.auth.signInWithPassword({
          email: eMail,
          password,
        });
        if (error) throw error;

        const biz = await fetchMyBusiness();
        router.replace(biz ? "/app" : "/setup");
        return;
      }

      const { error } = await supabase.auth.signUp({
        email: eMail,
        password,
      });
      if (error) throw error;

      setInfoMsg("Conta criada. Confira seu email para confirmar e depois faça login.");
      setMode("LOGIN");
      setPassword("");
    } catch (err: any) {
      setErrorMsg(err?.message ?? "Falha na autenticação.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="container" style={{ maxWidth: 520 }}>
      <header className="topbar">
        <div className="brand">
          <h2>{APP_NAME}</h2>
          <small className="muted">Acompanhe seu negócio</small>
        </div>
      </header>

      <section className="section">
        <h3>{mode === "LOGIN" ? "Entrar" : "Criar conta"}</h3>

        <form onSubmit={onSubmit} className="grid" style={{ maxWidth: 420 }}>
          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Email
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="voce@exemplo.com"
              autoComplete="email"
              required
            />
          </label>

          <label className="muted" style={{ display: "grid", gap: 8 }}>
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === "LOGIN" ? "current-password" : "new-password"}
              required
            />
          </label>

          {errorMsg && <div className="alert danger">{errorMsg}</div>}
          {infoMsg && <div style={{ color: "#7CFF6B" }}>{infoMsg}</div>}

          <div className="actions" style={{ justifyContent: "flex-start" }}>
            <button disabled={busy} className="btn btn-primary" type="submit">
              {busy ? "Aguarde..." : mode === "LOGIN" ? "Entrar" : "Criar conta"}
            </button>

            <button
              type="button"
              disabled={busy}
              className="btn btn-ghost"
              onClick={() => {
                setErrorMsg(null);
                setInfoMsg(null);
                setMode(mode === "LOGIN" ? "SIGNUP" : "LOGIN");
              }}
            >
              {mode === "LOGIN" ? "Criar conta" : "Já tenho conta"}
            </button>
          </div>

          <div className="muted" style={{ fontSize: 12 }}>
            Controle simples de faturamento, ticket e metas — sem planilhas.
          </div>
        </form>
      </section>
    </main>
  );
}