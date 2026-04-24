"use client";

import Link from "next/link";

import { useSession } from "../shared/session";

function FrameInner({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  const { logout, user } = useSession();

  return (
    <div className="app-shell">
      <div className="hero-bar">
        <div className="hero-copy">
          <div className="tag">Abo Al-Abed UAE Platform</div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        <div className="hero-meta">
          <div className="hero-pill">
            Signed in as <strong>{user?.email ?? "demo"}</strong>
          </div>
          <div className="btn-row">
            <Link className="btn secondary" href="/ops">
              Ops
            </Link>
            <Link className="btn secondary" href="/admin">
              Admin
            </Link>
            <button className="btn ghost" onClick={logout}>
              Logout
            </button>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}

export function AppFrame(props: { title: string; subtitle: string; children: React.ReactNode }) {
  return <FrameInner {...props} />;
}
