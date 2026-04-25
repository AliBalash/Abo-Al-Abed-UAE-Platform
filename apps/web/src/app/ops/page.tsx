"use client";

import { startTransition, useEffect, useMemo, useState } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";
import { mockOpsData } from "@/lib/mocks";

type QueueOrder = {
  id: string;
  orderCode: string;
  pickupToken?: string;
  status?: string;
  paymentStatus?: string;
  customer?: string;
  branchName?: string;
  placedAt?: string;
  expiresAt?: string;
  itemCount: number;
  total?: { amount: number };
  grandTotal?: { amount: number };
  address?: { line1: string; line2?: string; notes?: string };
  items?: {
    id: string;
    name: string;
    variantName: string;
    quantity: number;
    notes?: string;
    modifiers?: { group: string; option: string }[];
  }[];
};

type QueueData = {
  branch?: { id: string; code?: string; nameEn?: string };
  awaitingPayment: QueueOrder[];
  paid: QueueOrder[];
  inPreparation: QueueOrder[];
  ready: QueueOrder[];
  pickedUp: QueueOrder[];
};

const columns: { key: keyof QueueData; title: string; next?: string; action?: string; tone?: string }[] = [
  { key: "awaitingPayment", title: "Cashier Payment", action: "Confirm Payment", tone: "warning" },
  { key: "paid", title: "Kitchen Start", next: "IN_PREPARATION", action: "Start Prep" },
  { key: "inPreparation", title: "Cooking", next: "READY_FOR_PICKUP", action: "Mark Ready" },
  { key: "ready", title: "Ready Shelf", next: "PICKED_UP", action: "Complete Pickup", tone: "success" },
  { key: "pickedUp", title: "Picked Up", tone: "success" },
];

function OpsDashboardContent() {
  const { token, user } = useSession();
  const [queue, setQueue] = useState<QueueData>(mockOpsData as unknown as QueueData);
  const [lookupCode, setLookupCode] = useState("AA1483");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);
  const [notice, setNotice] = useState("");

  const activeCount = useMemo(
    () => queue.awaitingPayment.length + queue.paid.length + queue.inPreparation.length + queue.ready.length,
    [queue],
  );

  async function refresh() {
    if (!token) return;
    try {
      const data = await apiRequest<QueueData>("/branch-ops/queue", {}, token);
      setQueue(data);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load branch queue.");
      setQueue(mockOpsData as unknown as QueueData);
    }
  }

  useEffect(() => {
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    return () => window.clearInterval(interval);
  }, [token]);

  async function confirmPayment(order: QueueOrder) {
    if (!token) return;
    setStatusBusy(order.id);
    try {
      await apiRequest(
        "/payments/confirm",
        {
          method: "POST",
          body: JSON.stringify({
            orderId: order.id,
            amount: order.total?.amount ?? order.grandTotal?.amount ?? 0,
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
    <AppFrame title="Kitchen & Branch Panel" subtitle="Live queue for cashier payment, kitchen preparation, ready shelf, pickup handoff, and order lookup.">
      <div className="page-grid">
        <div className="panel">
          <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2>Live Queue</h2>
              <p className="muted">
                {queue.branch?.nameEn ?? user?.staffProfile?.primaryBranch?.nameEn ?? "Branch"} · active orders {activeCount} · role {user?.roles.join(", ") ?? "demo"}
              </p>
            </div>
            <button className="btn secondary" onClick={() => startTransition(() => void refresh())}>
              Refresh Queue
            </button>
          </div>
          {notice ? <div className="notice">{notice}</div> : null}
          <div className="queue-grid dense">
            {columns.map((column) => {
              const orders = (queue[column.key] as QueueOrder[]) ?? [];
              return (
                <div className="queue-column" key={column.key}>
                  <header>
                    <h3>{column.title}</h3>
                    <span className={`tag ${column.tone ?? ""}`}>{orders.length}</span>
                  </header>
                  {orders.length === 0 ? <p className="muted">No orders.</p> : null}
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      busy={statusBusy === order.id}
                      action={column.action}
                      onOpen={() => setSelectedOrder(order)}
                      onAction={() => {
                        if (column.key === "awaitingPayment") void confirmPayment(order);
                        else if (column.next) void moveStatus(order.id, column.next);
                      }}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        <div className="page-grid two-col">
          <div className="panel dark">
            <h2>Code Lookup</h2>
            <p>Find any branch-visible order by pickup code before accepting payment or handing off food.</p>
            <div className="input-grid">
              <label className="field">
                <span>Pickup Code</span>
                <input value={lookupCode} onChange={(event) => setLookupCode(event.target.value.toUpperCase())} />
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
            <h2>Kitchen Rules</h2>
            <div className="mini-grid">
              <div className="tag">Payment must be confirmed before kitchen prep.</div>
              <div className="tag">Kitchen sees each item, variant, modifiers, quantity, and notes.</div>
              <div className="tag">Ready shelf orders can be completed only after handoff.</div>
              <div className="tag">Queue refreshes every 15 seconds and status events emit from backend.</div>
            </div>
          </div>
        </div>
      </div>

      {selectedOrder ? <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} /> : null}
    </AppFrame>
  );
}

function OrderCard({ order, busy, action, onOpen, onAction }: { order: QueueOrder; busy: boolean; action?: string; onOpen: () => void; onAction: () => void }) {
  return (
    <div className="queue-card">
      <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong>{order.orderCode}</strong>
        <span className="tag">{order.itemCount} items</span>
      </div>
      <div className="muted">{order.customer ?? order.branchName}</div>
      <small>AED {order.total?.amount ?? order.grandTotal?.amount ?? "--"} · {order.pickupToken ? `Token ${order.pickupToken}` : "No token"}</small>
      <div className="item-list">
        {(order.items ?? []).slice(0, 3).map((item) => (
          <div key={item.id} className="item-line">
            <strong>{item.quantity}x</strong>
            <span>{item.name}</span>
          </div>
        ))}
      </div>
      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onOpen}>Details</button>
        {action ? <button className="btn primary" disabled={busy} onClick={onAction}>{busy ? "Working..." : action}</button> : null}
      </div>
    </div>
  );
}

function OrderDrawer({ order, onClose }: { order: QueueOrder; onClose: () => void }) {
  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2>{order.orderCode}</h2>
            <p className="muted">{order.customer} · {order.status ?? "queued"}</p>
          </div>
          <button className="btn ghost" onClick={onClose}>Close</button>
        </div>
        <div className="mini-grid">
          {(order.items ?? []).map((item) => (
            <div className="kitchen-item" key={item.id}>
              <h3>{item.quantity}x {item.name}</h3>
              <p className="muted">{item.variantName}</p>
              {item.modifiers?.map((modifier, index) => (
                <span className="tag" key={`${item.id}-${index}`}>{modifier.group}: {modifier.option}</span>
              ))}
              {item.notes ? <p className="note">Note: {item.notes}</p> : null}
            </div>
          ))}
        </div>
        <div className="panel" style={{ boxShadow: "none", marginTop: 16 }}>
          <h3>Customer Address</h3>
          <p>{order.address?.line1}</p>
          {order.address?.line2 ? <p className="muted">{order.address.line2}</p> : null}
          {order.address?.notes ? <p className="note">{order.address.notes}</p> : null}
        </div>
      </aside>
    </div>
  );
}

export default function OpsPage() {
  return (
    <SessionProvider>
      <OpsDashboardContent />
    </SessionProvider>
  );
}
