import Link from "next/link";
import { APP_NAME } from "@/lib/appConfig";

export default function HomePage() {
  return (
    <main className="container" style={{ paddingTop: 48 }}>
      <header className="topbar" style={{ marginBottom: 18 }}>
        <div className="brand">
          <h2>{APP_NAME}</h2>
          <small>Insights diários simples para decisões melhores</small>
        </div>

        <div className="actions">
          <Link href="/auth" className="btn btn-ghost">
            Entrar
          </Link>
          <Link href="/auth" className="btn btn-primary">
            Criar conta
          </Link>
        </div>
      </header>

      <section className="section">
        <div className="card" style={{ padding: 22 }}>
          <h1 style={{ fontSize: 34, lineHeight: 1.1, marginBottom: 10 }}>
            Resumo diário do seu negócio em <span className="accentText">2 minutos</span>.
          </h1>

          <p className="muted" style={{ fontSize: 16, marginBottom: 18 }}>
            Lance faturamento e pedidos do dia e acompanhe meta, ticket médio e alertas de tendência
            sem planilhas complicadas.
          </p>

          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <Link href="/auth" className="btn btn-primary">
              Começar agora
            </Link>
            <Link href="/auth" className="btn btn-ghost">
              Já tenho conta
            </Link>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
              marginTop: 18,
            }}
          >
            <div className="card" style={{ padding: 14 }}>
              <div className="label">📈 Meta do mês</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Veja progresso real e ritmo projetado para bater a meta.
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="label">🧾 Ticket médio</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Compare o último dia com a semana e com 4 semanas.
              </div>
            </div>

            <div className="card" style={{ padding: 14 }}>
              <div className="label">⚠️ Alertas simples</div>
              <div className="muted" style={{ marginTop: 6 }}>
                Detecte quedas fora do normal e ajuste rápido.
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="grid cards">
          <div className="card" style={{ padding: 18 }}>
            <div className="label">Para quem é</div>
            <div className="value" style={{ fontSize: 18 }}>
              Pequenos e-commerces e lojas
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Ideal para quem quer acompanhamento diário sem montar dashboards complexos.
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="label">Como funciona</div>
            <div className="value" style={{ fontSize: 18 }}>
              Lançar dia → ver insights
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Em poucos cliques você registra o dia e o sistema atualiza tudo automaticamente.
            </div>
          </div>

          <div className="card" style={{ padding: 18 }}>
            <div className="label">Privacidade</div>
            <div className="value" style={{ fontSize: 18 }}>
              Você controla seus dados
            </div>
            <div className="muted" style={{ marginTop: 8 }}>
              Cada negócio tem seu login e seus dados ficam isolados.
            </div>
          </div>
        </div>
      </section>

      <footer className="muted" style={{ padding: "18px 0", textAlign: "center" }}>
        © {new Date().getFullYear()} {APP_NAME}.
      </footer>
    </main>
  );
}