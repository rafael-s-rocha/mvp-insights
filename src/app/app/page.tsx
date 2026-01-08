"use client";

import dynamic from "next/dynamic";

const DashboardClient = dynamic(() => import("./DashboardClient"), {
  ssr: false,
  loading: () => <main className="container">Carregando...</main>,
});

export default function Page() {
  return <DashboardClient />;
}