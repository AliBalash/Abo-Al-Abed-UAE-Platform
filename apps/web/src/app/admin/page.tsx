"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";

type Category = { id: string; slug: string; titleEn: string; descriptionEn?: string; displayOrder: number; isActive: boolean; _count?: { products: number } };
type Branch = { id: string; code: string; nameEn: string; addressEn: string; phone: string; isActive: boolean; isAcceptingOrders: boolean; estimatedPrepMinutes: number; _count?: { orders: number; staffAssignments: number; productAvailability: number } };
type Variant = { id: string; name: string; sku: string; price: { amount: number }; isDefault: boolean; isActive: boolean };
type Product = {
  id: string;
  name: string;
  description: string;
  categoryId: string;
  category?: string;
  categorySlug?: string;
  status: "ACTIVE" | "ARCHIVED";
  isFeatured: boolean;
  imageUrl?: string | null;
  tags?: string[];
  variants?: Variant[];
  pausedBranches: number;
};
type OrderItem = { id: string; name: string; variantName: string; quantity: number; notes?: string; modifiers?: { modifierGroupNameEn?: string; optionNameEn?: string; group?: string; option?: string }[] };
type Order = {
  id: string;
  orderCode: string;
  pickupToken?: string;
  status: string;
  paymentStatus: string;
  branch?: { id?: string; code?: string; nameEn: string };
  customer?: { email: string; name?: string };
  itemCount: number;
  grandTotal: { amount: number };
  placedAt?: string;
  paidAt?: string;
  readyAt?: string;
  pickedUpAt?: string;
  items?: OrderItem[];
};
type Banner = { id: string; titleEn: string; subtitleEn: string; imageUrl: string; ctaLabelEn: string; ctaTarget: string; isActive: boolean };
type QueueData = { branch?: { id: string; code?: string; nameEn?: string }; awaitingPayment: Order[]; paid: Order[]; inPreparation: Order[]; ready: Order[]; pickedUp: Order[] };

const tabs = [
  { id: "command", label: "Command" },
  { id: "menu", label: "Menu" },
  { id: "branches", label: "Branches" },
  { id: "orders", label: "Orders" },
  { id: "kitchen", label: "Kitchen" },
  { id: "customers", label: "Users" },
  { id: "content", label: "Content" },
  { id: "audit", label: "Audit" },
] as const;

const emptyProduct = { categoryId: "", nameEn: "", descriptionEn: "", imageUrl: "", tagsCsv: "", isFeatured: false };

function AdminDashboardContent() {
  const { token, user, loading, logout } = useSession();
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]["id"]>("command");
  const [overview, setOverview] = useState<any>({});
  const [branches, setBranches] = useState<Branch[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [audit, setAudit] = useState<any[]>([]);
  const [queue, setQueue] = useState<QueueData>({ awaitingPayment: [], paid: [], inPreparation: [], ready: [], pickedUp: [] });
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [categoryForm, setCategoryForm] = useState({ titleEn: "", descriptionEn: "", displayOrder: 0 });
  const [productForm, setProductForm] = useState(emptyProduct);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { nameEn: string; price: string }>>({});

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const filteredCatalog = catalog.filter((product) => {
    if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
    if (statusFilter !== "ALL" && product.status !== statusFilter) return false;
    return true;
  });
  const activeOrders = orders.filter((order) => ["AWAITING_PAYMENT", "PAID", "IN_PREPARATION", "READY_FOR_PICKUP"].includes(order.status));
  const kitchenOrders = orders.filter((order) => ["PAID", "IN_PREPARATION", "READY_FOR_PICKUP"].includes(order.status));
  const archivedProducts = catalog.filter((product) => product.status === "ARCHIVED").length;
  const pausedProducts = catalog.reduce((sum, product) => sum + (product.pausedBranches || 0), 0);

  async function load() {
    if (!token) {
      setIsLoadingData(false);
      return;
    }
    setIsLoadingData(true);
    try {
      const [overviewData, branchData, categoryData, catalogData, orderData, bannerData, userData, auditData, queueData] = await Promise.all([
        apiRequest<any>("/admin/overview", {}, token),
        apiRequest<Branch[]>("/admin/branches", {}, token),
        apiRequest<Category[]>("/admin/categories", {}, token),
        apiRequest<Product[]>("/admin/catalog?status=ALL", {}, token),
        apiRequest<Order[]>("/admin/orders", {}, token),
        apiRequest<Banner[]>("/admin/banners", {}, token),
        apiRequest<any[]>("/admin/users", {}, token),
        apiRequest<any[]>("/admin/audit", {}, token),
        apiRequest<QueueData>("/branch-ops/queue", {}, token),
      ]);

      setOverview(overviewData);
      setBranches(branchData);
      setCategories(categoryData);
      setCatalog(catalogData);
      setOrders(orderData);
      setBanners(bannerData);
      setUsers(userData);
      setAudit(auditData);
      setQueue(queueData);
      setProductForm((form) => ({ ...form, categoryId: form.categoryId || categoryData[0]?.id || "" }));
      setNotice("");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Unable to load manager data.");
    } finally {
      setIsLoadingData(false);
    }
  }

  useEffect(() => {
    void load();
  }, [token]);

  async function saveAction(label: string, action: () => Promise<void>) {
    if (!token) return;
    setBusy(true);
    setNotice("");
    try {
      await action();
      await load();
      setNotice(`${label} saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Save failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <img className="admin-logo" src="/brand/farooj-logo-english.png" alt="Farooj Abu Al-Abed" />
        <div className="admin-user">
          <span>Signed in</span>
          <strong>{user?.email ?? "loading session"}</strong>
        </div>
        <nav className="admin-nav">
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="admin-side-actions">
          <Link className="btn secondary" href="/ops">Kitchen Panel</Link>
          <Link className="btn secondary" href="/login">Login</Link>
          <button className="btn ghost" onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="tag">Manager Console</span>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label ?? "Command"}</h1>
            <p className="muted">Full operational control for the iOS app menu, branch availability, kitchen queue, orders, users, content, and audit trail.</p>
          </div>
          <div className="admin-top-actions">
            <button className="btn secondary" disabled={busy || isLoadingData} onClick={() => void load()}>
              {isLoadingData ? "Refreshing..." : "Refresh Data"}
            </button>
          </div>
        </header>

        {loading || isLoadingData ? <Panel title="Loading Manager Panel" subtitle="Connecting to the live API and syncing application data." /> : null}
        {!loading && !token ? <div className="notice">Please sign in with an admin or ops manager account.</div> : null}
        {notice ? <div className="notice">{notice}</div> : null}

        {!loading && !isLoadingData && activeTab === "command" ? (
          <section className="admin-section">
            <div className="admin-kpis">
              <Kpi label="Products" value={overview.products ?? 0} detail={`${categories.length} categories`} />
              <Kpi label="Branches" value={overview.branches ?? 0} detail={`${branches.filter((branch) => branch.isAcceptingOrders).length} accepting orders`} />
              <Kpi label="Active Orders" value={overview.activeOrders ?? 0} detail={`${overview.todayOrders ?? 0} today`} />
              <Kpi label="Today Revenue" value={`AED ${overview.todayRevenue ?? 0}`} detail={`${overview.orders ?? 0} total orders`} />
              <Kpi label="Users" value={overview.users ?? 0} detail={`${users.filter((item) => item.staffProfile).length} staff`} />
              <Kpi label="Attention" value={archivedProducts + pausedProducts} detail={`${archivedProducts} archived, ${pausedProducts} branch pauses`} />
            </div>

            <div className="admin-grid two">
              <div className="admin-card">
                <CardHeader title="Operational Coverage" subtitle="Every major app surface is wired into this console." />
                <div className="coverage-grid">
                  <Coverage title="iOS Menu" value={`${catalog.length} products`} ok={catalog.length > 0} />
                  <Coverage title="Categories" value={`${categories.length} filters`} ok={categories.length > 0} />
                  <Coverage title="Branches" value={`${branches.length} locations`} ok={branches.length > 0} />
                  <Coverage title="Kitchen" value={`${kitchenOrders.length} active tickets`} ok />
                  <Coverage title="Users" value={`${users.length} records`} ok={users.length > 0} />
                  <Coverage title="Content" value={`${banners.length} banners`} ok={banners.length > 0} />
                </div>
              </div>

              <div className="admin-card">
                <CardHeader title="Live Branch Readiness" subtitle="Accepting orders, ETA, order volume, and staff footprint." />
                <div className="admin-list">
                  {branches.map((branch) => (
                    <div className="admin-row" key={branch.id}>
                      <div>
                        <strong>{branch.nameEn}</strong>
                        <span>{branch.code} · ETA {branch.estimatedPrepMinutes} min · {branch._count?.orders ?? 0} orders</span>
                      </div>
                      <span className={branch.isAcceptingOrders ? "status-pill success" : "status-pill warning"}>
                        {branch.isAcceptingOrders ? "Accepting" : "Stopped"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <OrdersBoard orders={activeOrders} title="Active Order Control" />
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "menu" ? (
          <section className="admin-section">
            <div className="admin-grid two">
              <div className="admin-card">
                <CardHeader title="Create Category" subtitle="Adds a filter category for the iOS menu." />
                <div className="input-grid two">
                  <label className="field"><span>Name</span><input value={categoryForm.titleEn} onChange={(event) => setCategoryForm({ ...categoryForm, titleEn: event.target.value })} /></label>
                  <label className="field"><span>Display Order</span><input type="number" value={categoryForm.displayOrder} onChange={(event) => setCategoryForm({ ...categoryForm, displayOrder: Number(event.target.value) })} /></label>
                  <label className="field span-2"><span>Description</span><input value={categoryForm.descriptionEn} onChange={(event) => setCategoryForm({ ...categoryForm, descriptionEn: event.target.value })} /></label>
                </div>
                <button className="btn primary" disabled={busy || !categoryForm.titleEn} onClick={() => void saveAction("Category", async () => {
                  await apiRequest("/admin/categories", { method: "POST", body: JSON.stringify(categoryForm) }, token!);
                  setCategoryForm({ titleEn: "", descriptionEn: "", displayOrder: 0 });
                })}>Add Category</button>
              </div>

              <div className="admin-card">
                <CardHeader title="Create Product" subtitle="Adds a menu item visible to the app after activation." />
                <div className="input-grid two">
                  <label className="field"><span>Category</span><select value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}>{categories.map((category) => <option key={category.id} value={category.id}>{category.titleEn}</option>)}</select></label>
                  <label className="field"><span>Name</span><input value={productForm.nameEn} onChange={(event) => setProductForm({ ...productForm, nameEn: event.target.value })} /></label>
                  <label className="field span-2"><span>Description</span><textarea value={productForm.descriptionEn} onChange={(event) => setProductForm({ ...productForm, descriptionEn: event.target.value })} /></label>
                  <label className="field"><span>Image URL</span><input value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} /></label>
                  <label className="field"><span>Tags CSV</span><input value={productForm.tagsCsv} onChange={(event) => setProductForm({ ...productForm, tagsCsv: event.target.value })} /></label>
                  <label className="check-row"><input type="checkbox" checked={productForm.isFeatured} onChange={(event) => setProductForm({ ...productForm, isFeatured: event.target.checked })} /> Featured</label>
                </div>
                <button className="btn primary" disabled={busy || !productForm.categoryId || !productForm.nameEn} onClick={() => void saveAction("Product", async () => {
                  await apiRequest("/admin/products", { method: "POST", body: JSON.stringify(productForm) }, token!);
                  setProductForm({ ...emptyProduct, categoryId: categories[0]?.id || "" });
                })}>Add Product</button>
              </div>
            </div>

            <div className="admin-card">
              <div className="admin-card-head">
                <CardHeader title="Menu Catalog" subtitle="Manage every iOS menu item, category, status, featured flag, and variants." />
                <div className="toolbar-controls">
                  <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((category) => <option key={category.id} value={category.id}>{category.titleEn}</option>)}
                  </select>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="ALL">All statuses</option>
                    <option value="ACTIVE">Active</option>
                    <option value="ARCHIVED">Archived</option>
                  </select>
                </div>
              </div>
              <div className="catalog-grid">
                {filteredCatalog.map((product) => (
                  <div className="product-admin-card" key={product.id}>
                    {product.imageUrl ? <img src={product.imageUrl} alt="" /> : <div className="image-placeholder" />}
                    <div>
                      <div className="tag">{categoryById.get(product.categoryId)?.titleEn ?? product.category ?? "Uncategorized"}</div>
                      <h3>{product.name}</h3>
                      <p className="muted">{product.description}</p>
                      <small>{(product.tags ?? []).join(", ") || "No tags"} · paused branches {product.pausedBranches}</small>
                    </div>
                    <div className="btn-row">
                      <button className="btn secondary" onClick={() => void saveAction("Product", async () => {
                        await apiRequest(`/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ status: product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE", categoryId: product.categoryId, nameEn: product.name, descriptionEn: product.description }) }, token!);
                      })}>{product.status === "ACTIVE" ? "Archive" : "Activate"}</button>
                      <button className="btn secondary" onClick={() => void saveAction("Product", async () => {
                        await apiRequest(`/admin/products/${product.id}`, { method: "PATCH", body: JSON.stringify({ isFeatured: !product.isFeatured, categoryId: product.categoryId, nameEn: product.name, descriptionEn: product.description }) }, token!);
                      })}>{product.isFeatured ? "Unfeature" : "Feature"}</button>
                    </div>
                    <div className="mini-grid">
                      {(product.variants ?? []).map((variant) => (
                        <div className="variant-row" key={variant.id}><span>{variant.name}</span><strong>AED {variant.price.amount}</strong></div>
                      ))}
                      <div className="variant-row">
                        <input placeholder="Variant name" value={variantDrafts[product.id]?.nameEn ?? ""} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? { price: "" }), nameEn: event.target.value } })} />
                        <input placeholder="Price" type="number" value={variantDrafts[product.id]?.price ?? ""} onChange={(event) => setVariantDrafts({ ...variantDrafts, [product.id]: { ...(variantDrafts[product.id] ?? { nameEn: "" }), price: event.target.value } })} />
                        <button className="btn ghost" onClick={() => void saveAction("Variant", async () => {
                          const draft = variantDrafts[product.id];
                          await apiRequest(`/admin/products/${product.id}/variants`, { method: "POST", body: JSON.stringify({ nameEn: draft?.nameEn, price: Number(draft?.price || 0) }) }, token!);
                          setVariantDrafts({ ...variantDrafts, [product.id]: { nameEn: "", price: "" } });
                        })}>Add</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "branches" ? (
          <section className="admin-section">
            <div className="admin-card">
              <CardHeader title="Branch Controls" subtitle="Open or close branches, watch order load, staff footprint, and product availability rows." />
              <div className="branch-grid">
                {branches.map((branch) => (
                  <div className="branch-card" key={branch.id}>
                    <span className={branch.isAcceptingOrders ? "status-pill success" : "status-pill warning"}>{branch.isAcceptingOrders ? "Accepting Orders" : "Orders Stopped"}</span>
                    <h3>{branch.nameEn}</h3>
                    <p className="muted">{branch.addressEn}</p>
                    <small>{branch.code} · ETA {branch.estimatedPrepMinutes} min · {branch._count?.orders ?? 0} orders · {branch._count?.staffAssignments ?? 0} staff</small>
                    <div className="btn-row">
                      <button className="btn secondary" onClick={() => void saveAction("Branch", async () => {
                        await apiRequest(`/admin/branches/${branch.id}`, { method: "PATCH", body: JSON.stringify({ isAcceptingOrders: !branch.isAcceptingOrders }) }, token!);
                      })}>{branch.isAcceptingOrders ? "Stop Orders" : "Accept Orders"}</button>
                      <button className="btn ghost" onClick={() => void saveAction("Branch", async () => {
                        await apiRequest(`/admin/branches/${branch.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !branch.isActive }) }, token!);
                      })}>{branch.isActive ? "Deactivate" : "Activate"}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "orders" ? <OrdersBoard orders={orders} title="All Orders" /> : null}

        {!loading && !isLoadingData && activeTab === "kitchen" ? (
          <section className="admin-section">
            <div className="admin-grid two">
              <Kpi label="Cashier Payment" value={queue.awaitingPayment.length} detail={queue.branch?.nameEn ?? "Current branch"} />
              <Kpi label="Kitchen Tickets" value={kitchenOrders.length} detail={`${queue.paid.length + queue.inPreparation.length + queue.ready.length} in branch queue`} />
            </div>
            <OrdersBoard orders={kitchenOrders} title="Kitchen Command Board" />
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "customers" ? (
          <section className="admin-section">
            <div className="admin-card">
              <CardHeader title="Users, Staff, Customers" subtitle="Account status, roles, primary branch, addresses, and order count." />
              <DataTable headers={["Email", "Status", "Roles", "Primary Branch", "Orders", "Addresses"]}>
                {users.map((item) => (
                  <tr key={item.id}>
                    <td>{item.email}</td>
                    <td>{item.status}</td>
                    <td>{item.roleAssignments?.map((role: any) => role.role.name).join(", ") || "customer"}</td>
                    <td>{item.staffProfile?.primaryBranch?.nameEn ?? "--"}</td>
                    <td>{item._count?.orders ?? 0}</td>
                    <td>{item._count?.addresses ?? 0}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "content" ? (
          <section className="admin-section">
            <div className="admin-card">
              <CardHeader title="App Content" subtitle="Home banners and launch messaging used by the iOS menu surface." />
              <div className="catalog-grid">
                {banners.map((banner) => (
                  <div className="product-admin-card" key={banner.id}>
                    <img src={banner.imageUrl} alt="" />
                    <h3>{banner.titleEn}</h3>
                    <p className="muted">{banner.subtitleEn}</p>
                    <small>{banner.ctaLabelEn} · {banner.ctaTarget}</small>
                    <button className="btn secondary" onClick={() => void saveAction("Banner", async () => {
                      await apiRequest(`/admin/banners/${banner.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !banner.isActive }) }, token!);
                    })}>{banner.isActive ? "Hide Banner" : "Show Banner"}</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "audit" ? (
          <section className="admin-section">
            <div className="admin-card">
              <CardHeader title="Audit Trail" subtitle="Recent administrative and operational actions." />
              <DataTable headers={["Action", "Entity", "Actor", "Time"]}>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.action}</td>
                    <td>{entry.entityType}</td>
                    <td>{entry.actor?.email ?? "system"}</td>
                    <td>{new Date(entry.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </DataTable>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return <div className="admin-kpi"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>;
}

function Panel({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="admin-card"><CardHeader title={title} subtitle={subtitle} /></div>;
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return <div className="card-header"><h2>{title}</h2><p className="muted">{subtitle}</p></div>;
}

function Coverage({ title, value, ok }: { title: string; value: string; ok: boolean }) {
  return <div className="coverage-card"><span className={ok ? "status-dot ok" : "status-dot"} /><strong>{title}</strong><small>{value}</small></div>;
}

function OrdersBoard({ orders, title }: { orders: Order[]; title: string }) {
  const groups = [
    { status: "AWAITING_PAYMENT", label: "Awaiting Payment" },
    { status: "PAID", label: "Paid" },
    { status: "IN_PREPARATION", label: "In Preparation" },
    { status: "READY_FOR_PICKUP", label: "Ready" },
    { status: "PICKED_UP", label: "Picked Up" },
  ];

  return (
    <div className="admin-card">
      <CardHeader title={title} subtitle="Order status, customer, branch, amount, items, variants, modifiers, and notes." />
      <div className="order-board">
        {groups.map((group) => {
          const groupOrders = orders.filter((order) => order.status === group.status);
          return (
            <div className="order-column" key={group.status}>
              <header><h3>{group.label}</h3><span className="tag">{groupOrders.length}</span></header>
              {groupOrders.length === 0 ? <p className="muted">No orders.</p> : null}
              {groupOrders.map((order) => <OrderCard key={order.id} order={order} />)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order }: { order: Order }) {
  return (
    <div className="order-card">
      <div className="admin-row compact">
        <div><strong>{order.orderCode}</strong><span>{order.branch?.nameEn ?? "--"} · {order.customer?.name || order.customer?.email || "Guest"}</span></div>
        <strong>AED {order.grandTotal?.amount ?? "--"}</strong>
      </div>
      <small>{order.paymentStatus} · {order.itemCount} items · {order.placedAt ? new Date(order.placedAt).toLocaleString() : ""}</small>
      <div className="item-list">
        {(order.items ?? []).slice(0, 4).map((item) => (
          <div className="kitchen-line" key={item.id}>
            <strong>{item.quantity}x</strong>
            <span>{item.name}</span>
            <small>{item.variantName}</small>
            {(item.modifiers ?? []).map((modifier, index) => (
              <em key={`${item.id}-${index}`}>{modifier.modifierGroupNameEn ?? modifier.group}: {modifier.optionNameEn ?? modifier.option}</em>
            ))}
            {item.notes ? <b>Note: {item.notes}</b> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: React.ReactNode }) {
  return (
    <div className="table-wrap">
      <table>
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SessionProvider>
      <AdminDashboardContent />
    </SessionProvider>
  );
}
