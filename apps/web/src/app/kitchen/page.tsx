"use client";

import Link from "next/link";
import { startTransition, useEffect, useMemo, useState } from "react";

import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "PAUSED";

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
    unitPrice?: { amount: number };
    totalPrice?: { amount: number };
    modifiers?: { group: string; option: string; priceDelta?: { amount: number } }[];
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

type Branch = { id: string; nameEn: string; code: string };

type KitchenAvailabilityItem = {
  productId: string;
  productName: string;
  categoryName: string;
  status: AvailabilityStatus;
  note?: string;
  basePrice?: { amount: number };
};

type Role =
  | "super_admin"
  | "kitchen_manager"
  | "branch_manager"
  | "cashier"
  | "kitchen_staff"
  | "support_readonly"
  | string;

const kitchenAllowedRoles = new Set<Role>(["super_admin", "kitchen_manager", "branch_manager", "cashier", "kitchen_staff"]);
const crossBranchRoles = new Set<Role>(["super_admin", "kitchen_manager", "branch_manager"]);

const columns: { key: keyof QueueData; title: string; next?: string; action?: string; tone?: string }[] = [
  { key: "awaitingPayment", title: "Cashier Payment", action: "Confirm Payment", tone: "warning" },
  { key: "paid", title: "Ready to Start", next: "IN_PREPARATION", action: "Start Prep" },
  { key: "inPreparation", title: "Cooking", next: "READY_FOR_PICKUP", action: "Mark Ready" },
  { key: "ready", title: "Ready Shelf", next: "PICKED_UP", action: "Complete Pickup", tone: "success" },
  { key: "pickedUp", title: "Completed", tone: "success" },
];

const statusTone: Record<AvailabilityStatus, string> = {
  AVAILABLE: "success",
  PAUSED: "warning",
  UNAVAILABLE: "danger",
};

function money(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}`;
}

function minutesSince(value?: string, nowMs?: number | null) {
  if (!value || nowMs === null || nowMs === undefined) return null;
  const diff = nowMs - new Date(value).getTime();
  if (diff < 0 || Number.isNaN(diff)) return null;
  return Math.floor(diff / 60000);
}

function formatClock(nowMs: number | null) {
  if (nowMs === null) return "--:--";
  return new Date(nowMs).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function KitchenDashboardContent() {
  const { token, user, logout, loading } = useSession();
  const panelMode = (process.env.NEXT_PUBLIC_PANEL_MODE ?? "unified").toLowerCase();
  const adminPanelUrl = process.env.NEXT_PUBLIC_ADMIN_PANEL_URL ?? "/admin";

  const [queue, setQueue] = useState<QueueData>({ awaitingPayment: [], paid: [], inPreparation: [], ready: [], pickedUp: [] });
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranchId, setSelectedBranchId] = useState("");

  const [inventory, setInventory] = useState<KitchenAvailabilityItem[]>([]);
  const [inventoryDrafts, setInventoryDrafts] = useState<Record<string, { status: AvailabilityStatus; note: string }>>({});
  const [inventorySearch, setInventorySearch] = useState("");
  const [inventoryFilter, setInventoryFilter] = useState("ALL");

  const [lookupCode, setLookupCode] = useState("AA1483");
  const [lookupResult, setLookupResult] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [statusBusy, setStatusBusy] = useState<string | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<QueueOrder | null>(null);
  const [notice, setNotice] = useState("");
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [nowMs, setNowMs] = useState<number | null>(null);
  const [accessChecked, setAccessChecked] = useState(false);

  const userRoles = (user?.roles ?? []) as Role[];
  const canAccessKitchen = userRoles.some((role) => kitchenAllowedRoles.has(role));
  const canManageMultipleBranches = userRoles.some((role) => crossBranchRoles.has(role));
  const preferredBranch = user?.staffProfile?.primaryBranch ?? null;

  const activeCount = useMemo(
    () => queue.awaitingPayment.length + queue.paid.length + queue.inPreparation.length + queue.ready.length,
    [queue],
  );

  const activeOrders = useMemo(
    () => [...queue.awaitingPayment, ...queue.paid, ...queue.inPreparation, ...queue.ready],
    [queue],
  );

  const avgAge = useMemo(() => {
    if (nowMs === null) return 0;
    if (activeOrders.length === 0) return 0;
    const total = activeOrders.reduce((sum, order) => sum + (minutesSince(order.placedAt, nowMs) ?? 0), 0);
    return Math.round(total / activeOrders.length);
  }, [activeOrders, nowMs]);

  const urgentCount = useMemo(
    () => activeOrders.filter((order) => (minutesSince(order.placedAt, nowMs) ?? 0) >= 20).length,
    [activeOrders, nowMs],
  );

  const branchLabel = queue.branch?.nameEn ?? preferredBranch?.nameEn ?? "--";

  const filteredInventory = useMemo(() => {
    const needle = inventorySearch.trim().toLowerCase();
    return inventory.filter((item) => {
      const draft = inventoryDrafts[item.productId] ?? { status: item.status, note: item.note ?? "" };
      if (inventoryFilter === "NON_AVAILABLE" && draft.status === "AVAILABLE") return false;
      if (inventoryFilter === "PAUSED" && draft.status !== "PAUSED") return false;
      if (inventoryFilter === "UNAVAILABLE" && draft.status !== "UNAVAILABLE") return false;
      if (!needle) return true;
      return item.productName.toLowerCase().includes(needle) || item.categoryName.toLowerCase().includes(needle);
    });
  }, [inventory, inventoryDrafts, inventoryFilter, inventorySearch]);

  async function refreshQueue(branchId = selectedBranchId) {
    if (!token) return;

    const query = branchId ? `?branchId=${branchId}` : "";
    const data = await apiRequest<QueueData>(`/kitchen/queue${query}`, {}, token);
    setQueue(data);
    setLastSyncAt(new Date());
    if (!selectedBranchId && data.branch?.id) {
      setSelectedBranchId(data.branch.id);
    }
  }

  async function refreshInventory(branchId = selectedBranchId) {
    if (!token) return;
    if (!branchId) return;

    const data = await apiRequest<KitchenAvailabilityItem[]>(`/kitchen/availability?branchId=${branchId}`, {}, token);
    setInventory(data);
    setInventoryDrafts(
      Object.fromEntries(
        data.map((item) => [
          item.productId,
          {
            status: item.status,
            note: item.note ?? "",
          },
        ]),
      ),
    );
  }

  async function refreshBranches() {
    if (!token) return;
    try {
      const branchData = await apiRequest<Branch[]>("/admin/branches", {}, token);
      const allBranches = branchData.map((branch) => ({ id: branch.id, nameEn: branch.nameEn, code: branch.code }));
      const scopedBranches =
        canManageMultipleBranches || !preferredBranch?.id
          ? allBranches
          : allBranches.filter((branch) => branch.id === preferredBranch.id);

      setBranches(scopedBranches);
      if (!selectedBranchId && scopedBranches[0]?.id) {
        setSelectedBranchId(scopedBranches[0].id);
      }
    } catch {
      if (queue.branch?.id) {
        setBranches([{ id: queue.branch.id, nameEn: queue.branch.nameEn ?? "Branch", code: queue.branch.code ?? "" }]);
      }
    }
  }

  async function refreshAll(branchId = selectedBranchId) {
    if (!token) return;
    try {
      await refreshQueue(branchId);
      await refreshInventory(branchId);
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to refresh kitchen dashboard.");
    }
  }

  useEffect(() => {
    if (!token) return;
    if (user && !canAccessKitchen) return;
    void refreshAll();
    void refreshBranches();

    const interval = window.setInterval(() => {
      void refreshAll();
    }, 15_000);

    return () => window.clearInterval(interval);
  }, [token, user, canAccessKitchen]);

  useEffect(() => {
    if (!token || !selectedBranchId) return;
    if (user && !canAccessKitchen) return;
    void refreshAll(selectedBranchId);
  }, [selectedBranchId, token, user, canAccessKitchen]);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (loading) return;
    setAccessChecked(true);
  }, [loading]);

  useEffect(() => {
    if (!user || !preferredBranch?.id || selectedBranchId) return;
    setSelectedBranchId(preferredBranch.id);
  }, [preferredBranch?.id, selectedBranchId, user]);

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
      await refreshAll();
    } finally {
      setStatusBusy(null);
    }
  }

  async function moveStatus(orderId: string, status: string) {
    if (!token) return;
    setStatusBusy(orderId);
    try {
      await apiRequest(
        `/kitchen/orders/${orderId}/status`,
        {
          method: "PATCH",
          body: JSON.stringify({ status }),
        },
        token,
      );
      await refreshAll();
    } finally {
      setStatusBusy(null);
    }
  }

  async function saveInventory(productId: string) {
    if (!token || !selectedBranchId) return;
    setBusy(true);
    try {
      const draft = inventoryDrafts[productId];
      await apiRequest(
        "/kitchen/availability",
        {
          method: "PATCH",
          body: JSON.stringify({
            branchId: selectedBranchId,
            productId,
            status: draft.status,
            note: draft.note,
          }),
        },
        token,
      );
      await refreshInventory(selectedBranchId);
      setNotice("Availability updated.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to update availability.");
    } finally {
      setBusy(false);
    }
  }

  async function lookup() {
    if (!token) return;
    setBusy(true);
    try {
      const data = await apiRequest(`/kitchen/lookup?orderCode=${lookupCode}`, {}, token);
      setLookupResult(data);
    } catch {
      setLookupResult(null);
    } finally {
      setBusy(false);
    }
  }

  if (!accessChecked) {
    return (
      <div className="kitchen-shell">
        <div className="kitchen-panel">
          <h2>Loading kitchen workspace...</h2>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  if (!canAccessKitchen) {
    return (
      <div className="kitchen-shell">
        <div className="kitchen-panel kitchen-lock">
          <span className="tag danger">Access Restricted</span>
          <h2>Kitchen panel access is role-protected.</h2>
          <p className="muted">This workspace is only available for kitchen, cashier, or branch kitchen supervisors.</p>
          <div className="btn-row">
            {panelMode !== "kitchen" ? (
              <Link className="btn secondary" href={adminPanelUrl}>
                Go to Admin
              </Link>
            ) : null}
            <button className="btn ghost" onClick={logout}>
              Sign out
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="kitchen-shell">
      <header className="kitchen-header">
        <div>
          <span className="tag">Kitchen Operations Panel</span>
          <h1>Live Kitchen Command</h1>
          <p>
            Dedicated branch workflow for incoming app orders, kitchen prep stages, and branch-level product availability.
          </p>
        </div>

        <div className="kitchen-header-side">
          <div className="hero-pill">{user?.email ?? "staff"}</div>
          <div className="btn-row">
            <select
              value={selectedBranchId}
              onChange={(event) => setSelectedBranchId(event.target.value)}
              disabled={!canManageMultipleBranches}
              title={canManageMultipleBranches ? "Select branch" : "Branch locked to your staff profile"}
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.nameEn}
                </option>
              ))}
            </select>
            <button className="btn secondary" onClick={() => startTransition(() => void refreshAll())}>
              Refresh
            </button>
            {panelMode !== "kitchen" ? (
              <Link className="btn secondary" href={adminPanelUrl}>
                Admin
              </Link>
            ) : null}
            <button className="btn ghost" onClick={logout}>
              Logout
            </button>
          </div>
          <small>Last sync: {lastSyncAt ? lastSyncAt.toLocaleTimeString() : "--"}</small>
        </div>
      </header>

      {notice ? <div className="notice">{notice}</div> : null}

      <section className="kitchen-quick-strip">
        <div className="kitchen-quick-card">
          <span>Active Branch</span>
          <strong>{branchLabel}</strong>
          <small>{queue.branch?.code ?? preferredBranch?.code ?? "--"}</small>
        </div>
        <div className="kitchen-quick-card">
          <span>Live Clock</span>
          <strong>{formatClock(nowMs)}</strong>
          <small>Auto-sync every 15s</small>
        </div>
        <div className="kitchen-quick-card">
          <span>Urgent Tickets</span>
          <strong>{urgentCount}</strong>
          <small>Orders older than 20 min</small>
        </div>
      </section>

      <section className="kitchen-metrics">
        <MetricCard label="Pending Payment" value={queue.awaitingPayment.length} detail="cashier confirmation" />
        <MetricCard label="Prep Queue" value={queue.paid.length + queue.inPreparation.length} detail="ready to start + cooking" />
        <MetricCard label="Ready Shelf" value={queue.ready.length} detail="awaiting pickup handoff" />
        <MetricCard label="Active Tickets" value={activeCount} detail={`average age ${avgAge} min`} />
      </section>

      <section className="kitchen-layout">
        <div className="kitchen-panel">
          <div className="kitchen-section-head">
            <h2>Order Lanes</h2>
            <p className="muted">Branch {branchLabel}</p>
          </div>
          <div className="queue-grid dense">
            {columns.map((column) => {
              const orders = (queue[column.key] as QueueOrder[]) ?? [];
              const urgentInLane = orders.filter((order) => (minutesSince(order.placedAt, nowMs) ?? 0) >= 20).length;
              return (
                <div className="queue-column" key={column.key}>
                  <header>
                    <h3>{column.title}</h3>
                    <div className="lane-badges">
                      <span className={`tag ${column.tone ?? ""}`}>{orders.length}</span>
                      {urgentInLane > 0 ? <span className="tag danger">{urgentInLane} urgent</span> : null}
                    </div>
                  </header>

                  {orders.length === 0 ? <p className="muted">No orders.</p> : null}

                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      nowMs={nowMs}
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

        <div className="kitchen-side-stack">
          <div className="kitchen-panel dark">
            <h2>Order Lookup</h2>
            <p>Validate pickup token before handoff or cash confirmation.</p>
            <div className="input-grid">
              <label className="field">
                <span>Pickup / Order Code</span>
                <input value={lookupCode} onChange={(event) => setLookupCode(event.target.value.toUpperCase())} />
              </label>
              <button className="btn primary" disabled={busy} onClick={() => void lookup()}>
                {busy ? "Searching..." : "Lookup"}
              </button>
            </div>
            {lookupResult ? (
              <div className="queue-card" style={{ marginTop: 14 }}>
                <strong>{lookupResult.orderCode}</strong>
                <p>
                  {lookupResult.branch.name.en} · {lookupResult.status}
                </p>
                <small>Pickup token: {lookupResult.pickupToken}</small>
              </div>
            ) : null}
          </div>

          <div className="kitchen-panel">
            <div className="kitchen-section-head">
              <h2>Branch Product Status</h2>
              <p className="muted">Mark items as sold out / paused and push instantly to app.</p>
            </div>

            <div className="toolbar-controls">
              <select value={inventoryFilter} onChange={(event) => setInventoryFilter(event.target.value)}>
                <option value="ALL">All</option>
                <option value="NON_AVAILABLE">Not available</option>
                <option value="PAUSED">Paused</option>
                <option value="UNAVAILABLE">Out of stock</option>
              </select>
              <input value={inventorySearch} placeholder="Search product" onChange={(event) => setInventorySearch(event.target.value)} />
            </div>

            <div className="kitchen-stock-grid">
              {filteredInventory.map((item) => {
                const draft = inventoryDrafts[item.productId] ?? { status: item.status, note: item.note ?? "" };
                return (
                  <div className="stock-card" key={item.productId}>
                    <div>
                      <strong>{item.productName}</strong>
                      <p className="muted">
                        {item.categoryName} · {money(item.basePrice?.amount)}
                      </p>
                    </div>

                    <div className="btn-row">
                      <span className={`status-pill ${statusTone[draft.status]}`}>{draft.status}</span>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          setInventoryDrafts({
                            ...inventoryDrafts,
                            [item.productId]: { ...draft, status: "AVAILABLE" },
                          })
                        }
                      >
                        Available
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          setInventoryDrafts({
                            ...inventoryDrafts,
                            [item.productId]: { ...draft, status: "PAUSED" },
                          })
                        }
                      >
                        Pause
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          setInventoryDrafts({
                            ...inventoryDrafts,
                            [item.productId]: { ...draft, status: "UNAVAILABLE" },
                          })
                        }
                      >
                        Sold Out
                      </button>
                    </div>

                    <label className="field">
                      <span>Reason</span>
                      <input
                        value={draft.note}
                        placeholder="optional"
                        onChange={(event) =>
                          setInventoryDrafts({
                            ...inventoryDrafts,
                            [item.productId]: { ...draft, note: event.target.value },
                          })
                        }
                      />
                    </label>

                    <button className="btn primary" disabled={busy || !selectedBranchId} onClick={() => void saveInventory(item.productId)}>
                      Save
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {selectedOrder ? <OrderDrawer order={selectedOrder} onClose={() => setSelectedOrder(null)} /> : null}
    </div>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
      <small className="muted">{detail}</small>
    </div>
  );
}

function OrderCard({
  order,
  nowMs,
  busy,
  action,
  onOpen,
  onAction,
}: {
  order: QueueOrder;
  nowMs: number | null;
  busy: boolean;
  action?: string;
  onOpen: () => void;
  onAction: () => void;
}) {
  const age = minutesSince(order.placedAt, nowMs);
  const ageTone = age !== null && age >= 20 ? "danger" : age !== null && age >= 12 ? "warning" : "success";
  const ageClass = age !== null && age >= 20 ? "is-urgent" : age !== null && age >= 12 ? "is-warning" : "is-stable";

  return (
    <div className={`queue-card ${ageClass}`}>
      <div className="btn-row" style={{ justifyContent: "space-between", alignItems: "center" }}>
        <strong>{order.orderCode}</strong>
        <span className={`tag ${ageTone}`}>{age !== null ? `${age} min` : "--"}</span>
      </div>
      <div className="muted">{order.customer ?? order.branchName}</div>
      <small>
        {money(order.total?.amount ?? order.grandTotal?.amount)} · {order.pickupToken ? `Token ${order.pickupToken}` : "No token"} · {order.itemCount} item(s)
      </small>

      <div className="item-list">
        {(order.items ?? []).slice(0, 3).map((item) => (
          <div key={item.id} className="item-line">
            <strong>{item.quantity}x</strong>
            <span>{item.name}</span>
            <small>{item.variantName}</small>
          </div>
        ))}
      </div>

      <div className="btn-row" style={{ marginTop: 12 }}>
        <button className="btn ghost" onClick={onOpen}>
          Details
        </button>
        {action ? (
          <button className="btn primary" disabled={busy} onClick={onAction}>
            {busy ? "Working..." : action}
          </button>
        ) : null}
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
            <p className="muted">
              {order.customer} · {order.status ?? "queued"}
            </p>
          </div>
          <button className="btn ghost" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="mini-grid">
          {(order.items ?? []).map((item) => (
            <div className="kitchen-item" key={item.id}>
              <h3>
                {item.quantity}x {item.name}
              </h3>
              <p className="muted">
                {item.variantName} · {money(item.totalPrice?.amount)}
              </p>
              {item.modifiers?.map((modifier, index) => (
                <span className="tag" key={`${item.id}-${index}`}>
                  {modifier.group}: {modifier.option}
                </span>
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

export default function KitchenPage() {
  return (
    <SessionProvider>
      <KitchenDashboardContent />
    </SessionProvider>
  );
}
