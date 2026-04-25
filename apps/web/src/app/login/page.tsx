"use client";

import { FormEvent, useState } from "react";

import { SessionProvider, useSession } from "@/components/shared/session";

function LoginPageContent() {
  const { login } = useSession();
  const [email, setEmail] = useState("admin@aboalabed.ae");
  const [password, setPassword] = useState("ChangeMe123!");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await login(email, password);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Unable to login");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login-shell">
      <div className="login-card">
        <div className="login-brand">
          <img className="brand-logo" src="/brand/farooj-logo-english.png" alt="Farooj Abu Al-Abed" />
          <h1>Pickup-first restaurant operations, without the clutter.</h1>
          <p>
            This internal panel covers cashier confirmation, kitchen flow, branch controls, catalog visibility, and
            launch reporting for the Abo Al-Abed UAE ecosystem.
          </p>
          <div className="mini-grid">
            <div className="hero-pill">Cashier demo: `cashier@aboalabed.ae`</div>
            <div className="hero-pill">Kitchen demo: `kitchen@aboalabed.ae`</div>
            <div className="hero-pill">Admin demo: `admin@aboalabed.ae`</div>
          </div>
        </div>

        <div className="panel login-form">
          <h2>Sign In</h2>
          <p className="muted">Use the seeded staff accounts from the API seed.</p>
          <form className="input-grid" onSubmit={handleSubmit}>
            <label className="field">
              <span>Email</span>
              <input value={email} onChange={(event) => setEmail(event.target.value)} />
            </label>
            <label className="field">
              <span>Password</span>
              <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </label>
            {error ? <div className="tag warning">{error}</div> : null}
            <div className="btn-row">
              <button className="btn primary" disabled={busy} type="submit">
                {busy ? "Signing In..." : "Enter Dashboard"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <SessionProvider>
      <LoginPageContent />
    </SessionProvider>
  );
}
