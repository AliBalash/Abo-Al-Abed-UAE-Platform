"use client";

import { startTransition, useEffect, useState } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";
import { mockOpsData } from "@/lib/mocks";

function OpsDashboardContent() {
  const { token, user } = useSession();
  const [queue, setQueue] = useState<any>(mockOpsData);
  const [lookupCode, setLookupCode] = useState("AA1483");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);

  async function refresh() {
    if (!token) return;
    try {
      const data = await apiRequest<any>("/branch-ops/queue", {}, token);
      setQueue(data);
    } catch {
      setQueue(mockOpsData);
    }
  }

  useEffect(() => {
    void refresh();
  }, [token]);

  async function confirmPayment(orderId: string, amount: number) {
    if (!token) return;
    setStatusBusy(orderId);
    try {
      await apiRequest(
        "/payments/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            orderId,
            amount,
            providerReference: `CASH-${Date.now()}`,
          }),
        },
        token,
      );
      await refresh();
    } finally {
      setStatusBusy(null);
    }
  }

  async function moveStatus(orderId: string, status: string) {
    if (!token) return;
    setStatusBusy(orderId);
    try {
      await apiRequest(
        `/branch-ops/orders/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token,
      );
      await refresh();
    } finally {
      setStatusBusy(null);
    }
  }

  async function lookup() {
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiRequest(`/branch-ops/lookup?orderCode=${lookupCode}`, {}, token);
      setLookupResult(data);
    } catch {
      setLookupResult(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppFrame
      title="Branch Ops"
      subtitle="One surface for cashier confirmation, live kitchen progression, and branch-side order control."
    >
      <div className="page-grid two-col">
        <div className="page-grid">
          <div className="panel">
            <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2>Live Queue</h2>
                <p className="muted">
                  Active role: {user?.roles.join(", ") ?? "demo"} {user?.staffProfile?.primaryBranch?.nameEn ? `· ${user.staffProfile.primaryBranch.nameEn}` : ""}
                </p>
              </div>
              <button className="btn secondary" onClick={() => startTransition(() => void refresh())}>
                Refresh Queue
              </button>
            </div>
            <div className="queue-grid">
              <div className="queue-column">
                <header>
                  <h3>Awaiting Payment</h3>
                  <span className="tag warning">{queue.awaitingPayment.length}</span>
                </header>
                {queue.awaitingPayment.map((order: any) => (
                  <div className="queue-card" key={order.id}>
                    <strong>{order.orderCode}</strong>
                    <div className="muted">{order.customer ?? order.branchName}</div>
                    <small>{order.itemCount} items · AED {order.total ?? order.grandTotal?.amount ?? "--"}</small>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <button className="btn primary" disabled={statusBusy === order.id} onClick={() => void confirmPayment(order.id, order.total ?? order.grandTotal?.amount ?? 0)}>
                        Confirm Payment
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="queue-column">
                <header>
                  <h3>Kitchen Start</h3>
                  <span className="tag">{queue.paid.length}</span>
                </header>
                {queue.paid.map((order: any) => (
                  <div className="queue-card" key={order.id}>
                    <strong>{order.orderCode}</strong>
                    <div className="muted">{order.customer ?? "Paid queue"}</div>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <button className="btn secondary" disabled={statusBusy === order.id} onClick={() => void moveStatus(order.id, "IN_PREPARATION")}>
                        Start Prep
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="queue-column">
                <header>
                  <h3>In Preparation</h3>
                  <span className="tag">{queue.inPreparation.length}</span>
                </header>
                {queue.inPreparation.map((order: any) => (
                  <div className="queue-card" key={order.id}>
                    <strong>{order.orderCode}</strong>
                    <div className="muted">{order.customer ?? "Kitchen queue"}</div>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <button className="btn secondary" disabled={statusBusy === order.id} onClick={() => void moveStatus(order.id, "READY_FOR_PICKUP")}>
                        Mark Ready
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <div className="queue-column">
                <header>
                  <h3>Ready Shelf</h3>
                  <span className="tag success">{queue.ready.length}</span>
                </header>
                {queue.ready.map((order: any) => (
                  <div className="queue-card" key={order.id}>
                    <strong>{order.orderCode}</strong>
                    <div className="muted">{order.customer ?? "Ready queue"}</div>
                    <div className="btn-row" style={{ marginTop: 12 }}>
                      <button className="btn ghost" disabled={statusBusy === order.id} onClick={() => void moveStatus(order.id, "PICKED_UP")}>
                        Complete Pickup
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="page-grid">
          <div className="panel dark">
            <h2>Code Lookup</h2>
            <p>Find any branch-visible order by pickup code before accepting payment.</p>
            <div className="input-grid">
              <label className="field">
                <span>Pickup Code</span>
                <input value={lookupCode} onChange={(event) => setLookupCode(event.target.value)} />
              </label>
              <button className="btn primary" disabled={busy} onClick={() => void lookup()}>
                {busy ? "Searching..." : "Lookup Order"}
              </button>
            </div>
            {lookupResult ? (
              <div className="queue-card" style={{ marginTop: 16 }}>
                <strong>{lookupResult.orderCode}</strong>
                <p>
                  {lookupResult.branch.name.en} · {lookupResult.status}
                </p>
                <small>Pickup token: {lookupResult.pickupToken}</small>
              </div>
            ) : null}
          </div>

          <div className="panel">
            <h2>Ops Notes</h2>
            <div className="mini-grid">
              <div className="tag">Payment happens first, prep starts second.</div>
              <div className="tag">No online gateway in v1.</div>
              <div className="tag">Status push events are emitted from the backend.</div>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

export default function OpsPage() {
  return (
    <SessionProvider>
      <OpsDashboardContent />
    </SessionProvider>
  );
}
