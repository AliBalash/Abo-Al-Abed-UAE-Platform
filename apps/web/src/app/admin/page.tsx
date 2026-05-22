"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";

type AvailabilityStatus = "AVAILABLE" | "UNAVAILABLE" | "PAUSED";

type Category = {
  id: string;
  slug: string;
  titleEn: string;
  descriptionEn?: string;
  displayOrder: number;
  isActive: boolean;
  _count?: { products: number };
};

type Branch = {
  id: string;
  code: string;
  nameEn: string;
  addressEn: string;
  phone: string;
  isActive: boolean;
  isAcceptingOrders: boolean;
  estimatedPrepMinutes: number;
  _count?: { orders: number; staffAssignments: number; productAvailability: number };
};

type Variant = {
  id: string;
  name: string;
  sku: string;
  price: { amount: number };
  isDefault: boolean;
  isActive: boolean;
};

type ProductAvailability = {
  id?: string;
  branchId: string;
  branchCode?: string;
  branchName?: string;
  status: AvailabilityStatus;
  note?: string | null;
};

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
  availability?: ProductAvailability[];
};

type OrderItem = {
  id: string;
  name: string;
  variantName: string;
  quantity: number;
  notes?: string;
  modifiers?: { modifierGroupNameEn?: string; optionNameEn?: string; group?: string; option?: string }[];
};

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

type Banner = {
  id: string;
  titleEn: string;
  subtitleEn: string;
  imageUrl: string;
  ctaLabelEn: string;
  ctaTarget: string;
  theme?: BannerTheme;
  displayOrder?: number;
  isActive: boolean;
};

type BannerTheme = "top_strip" | "bottom_feature";

type QueueData = {
  branch?: { id: string; code?: string; nameEn?: string };
  awaitingPayment: Order[];
  paid: Order[];
  inPreparation: Order[];
  ready: Order[];
  pickedUp: Order[];
};

const tabs = [
  { id: "command", label: "Command Center" },
  { id: "menu", label: "Menu & Categories" },
  { id: "availability", label: "Branch Availability" },
  { id: "branches", label: "Branches" },
  { id: "orders", label: "Orders" },
  { id: "customers", label: "Users" },
  { id: "content", label: "Content" },
  { id: "audit", label: "Audit" },
] as const;

const statusGroups = [
  { status: "AWAITING_PAYMENT", label: "Awaiting Payment" },
  { status: "PAID", label: "Paid" },
  { status: "IN_PREPARATION", label: "In Preparation" },
  { status: "READY_FOR_PICKUP", label: "Ready" },
  { status: "PICKED_UP", label: "Picked Up" },
];

const emptyProductForm = {
  categoryId: "",
  nameEn: "",
  descriptionEn: "",
  imageUrl: "",
  tagsCsv: "",
  isFeatured: false,
};

const emptyBannerForm = {
  titleEn: "",
  subtitleEn: "",
  imageUrl: "",
  ctaLabelEn: "View Offer",
  ctaTarget: "/menu",
  theme: "top_strip" as BannerTheme,
  displayOrder: 1,
};

const bundledBannerPresets: Array<{
  id: string;
  label: string;
  theme: BannerTheme;
  imageUrl: string;
  titleEn: string;
  subtitleEn: string;
  displayOrder: number;
}> = [
  {
    id: "hareeq-top",
    label: "Top Strip · Hareeq",
    theme: "top_strip",
    imageUrl: "/assets/banners/Hareeq_Offer_Slider_T01.jpg",
    titleEn: "Hareeq Offer",
    subtitleEn: "Hot slider deal for fast pickup.",
    displayOrder: 1,
  },
  {
    id: "taghmisat-top",
    label: "Top Strip · Taghmisat",
    theme: "top_strip",
    imageUrl: "/assets/banners/Taghmisat_Offer_Slider_T01.jpg",
    titleEn: "Taghmisat Box",
    subtitleEn: "Sharing box offer for groups.",
    displayOrder: 2,
  },
  {
    id: "baby-top",
    label: "Top Strip · Baby Satl",
    theme: "top_strip",
    imageUrl: "/assets/banners/Baby_Satl_Offer_Slider_T01.jpg",
    titleEn: "Baby Satl",
    subtitleEn: "Big value family pickup deal.",
    displayOrder: 3,
  },
  {
    id: "app-gif-bottom",
    label: "Bottom Feature · 30% App GIF",
    theme: "bottom_feature",
    imageUrl: "/assets/banners/app-deal-30.gif",
    titleEn: "30% App Deal",
    subtitleEn: "Order from app and save on pickup.",
    displayOrder: 10,
  },
];

const statusTone: Record<AvailabilityStatus, string> = {
  AVAILABLE: "success",
  PAUSED: "warning",
  UNAVAILABLE: "danger",
};

function formatMoney(value?: number) {
  if (value === undefined || Number.isNaN(value)) return "--";
  return `AED ${new Intl.NumberFormat("en-US", { maximumFractionDigits: 2 }).format(value)}`;
}

function formatDateTime(value?: string) {
  if (!value) return "--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--";
  return date.toLocaleString();
}

function minutesSince(value?: string, nowMs?: number | null) {
  if (!value || nowMs === null || nowMs === undefined) return null;
  const diff = nowMs - new Date(value).getTime();
  if (diff < 0 || Number.isNaN(diff)) return null;
  return Math.floor(diff / 60000);
}

function AdminDashboardContent() {
  const { token, user, loading, logout } = useSession();
  const panelMode = (process.env.NEXT_PUBLIC_PANEL_MODE ?? "unified").toLowerCase();
  const kitchenPanelUrl = process.env.NEXT_PUBLIC_KITCHEN_PANEL_URL ?? "/kitchen";

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
  const [orderStatusFilter, setOrderStatusFilter] = useState("ALL");
  const [orderBranchFilter, setOrderBranchFilter] = useState("ALL");
  const [orderSearch, setOrderSearch] = useState("");
  const [availabilityBranchId, setAvailabilityBranchId] = useState("");
  const [availabilityFilter, setAvailabilityFilter] = useState("ALL");
  const [availabilitySearch, setAvailabilitySearch] = useState("");

  const [categoryForm, setCategoryForm] = useState({ titleEn: "", descriptionEn: "", displayOrder: 0 });
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [variantDrafts, setVariantDrafts] = useState<Record<string, { nameEn: string; price: string }>>({});
  const [categoryDrafts, setCategoryDrafts] = useState<Record<string, { titleEn: string; descriptionEn: string; displayOrder: number; isActive: boolean }>>({});
  const [branchEtaDrafts, setBranchEtaDrafts] = useState<Record<string, number>>({});
  const [availabilityDrafts, setAvailabilityDrafts] = useState<Record<string, { status: AvailabilityStatus; note: string }>>({});
  const [bannerForm, setBannerForm] = useState(emptyBannerForm);
  const [selectedBannerPreset, setSelectedBannerPreset] = useState("");

  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [isLoadingData, setIsLoadingData] = useState(true);
  const [nowMs, setNowMs] = useState<number | null>(null);

  const categoryById = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const topStripBanners = useMemo(
    () => banners.filter((banner) => (banner.theme || "").toLowerCase() === "top_strip").sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [banners],
  );
  const bottomFeatureBanners = useMemo(
    () => banners.filter((banner) => (banner.theme || "").toLowerCase() === "bottom_feature").sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [banners],
  );

  const filteredCatalog = useMemo(
    () =>
      catalog.filter((product) => {
        if (selectedCategoryId && product.categoryId !== selectedCategoryId) return false;
        if (statusFilter !== "ALL" && product.status !== statusFilter) return false;
        return true;
      }),
    [catalog, selectedCategoryId, statusFilter],
  );

  const filteredOrders = useMemo(() => {
    const needle = orderSearch.trim().toLowerCase();
    return orders.filter((order) => {
      if (orderStatusFilter !== "ALL" && order.status !== orderStatusFilter) return false;
      if (orderBranchFilter !== "ALL" && order.branch?.id !== orderBranchFilter) return false;
      if (!needle) return true;
      return (
        order.orderCode.toLowerCase().includes(needle) ||
        order.customer?.email?.toLowerCase().includes(needle) ||
        order.customer?.name?.toLowerCase().includes(needle) ||
        order.pickupToken?.toLowerCase().includes(needle)
      );
    });
  }, [orders, orderBranchFilter, orderSearch, orderStatusFilter]);

  const activeOrders = useMemo(
    () => orders.filter((order) => ["AWAITING_PAYMENT", "PAID", "IN_PREPARATION", "READY_FOR_PICKUP"].includes(order.status)),
    [orders],
  );

  const stalledOrders = useMemo(() => {
    if (nowMs === null) return [] as { order: Order; age: number }[];
    const threshold = 25;
    return activeOrders
      .map((order) => ({ order, age: minutesSince(order.placedAt, nowMs) ?? 0 }))
      .filter((item) => item.age >= threshold)
      .sort((a, b) => b.age - a.age)
      .slice(0, 8);
  }, [activeOrders, nowMs]);

  const availabilityIssues = useMemo(
    () =>
      catalog.reduce((count, product) => {
        const affected = (product.availability ?? []).filter((item) => item.status !== "AVAILABLE").length;
        return count + affected;
      }, 0),
    [catalog],
  );

  const availabilityRows = useMemo(() => {
    if (!availabilityBranchId) return [] as Product[];
    const needle = availabilitySearch.trim().toLowerCase();

    return catalog.filter((product) => {
      if (product.status !== "ACTIVE") return false;
      const record = product.availability?.find((item) => item.branchId === availabilityBranchId);
      const status = record?.status ?? "AVAILABLE";
      if (availabilityFilter === "NON_AVAILABLE" && status === "AVAILABLE") return false;
      if (availabilityFilter === "PAUSED" && status !== "PAUSED") return false;
      if (availabilityFilter === "UNAVAILABLE" && status !== "UNAVAILABLE") return false;
      if (!needle) return true;
      return product.name.toLowerCase().includes(needle) || (product.category ?? "").toLowerCase().includes(needle);
    });
  }, [availabilityBranchId, availabilityFilter, availabilitySearch, catalog]);

  async function load() {
    if (!token) {
      setIsLoadingData(false);
      return;
    }

    setIsLoadingData(true);

    const calls = await Promise.allSettled([
      apiRequest<any>("/admin/overview", {}, token),
      apiRequest<Branch[]>("/admin/branches", {}, token),
      apiRequest<Category[]>("/admin/categories", {}, token),
      apiRequest<Product[]>("/admin/catalog?status=ALL", {}, token),
      apiRequest<Order[]>("/admin/orders", {}, token),
      apiRequest<Banner[]>("/admin/banners", {}, token),
      apiRequest<any[]>("/admin/users", {}, token),
      apiRequest<any[]>("/admin/audit", {}, token),
      apiRequest<QueueData>("/kitchen/queue", {}, token),
    ]);

    const [overviewRes, branchesRes, categoriesRes, catalogRes, ordersRes, bannersRes, usersRes, auditRes, queueRes] = calls;

    if (overviewRes.status === "fulfilled") setOverview(overviewRes.value);
    if (branchesRes.status === "fulfilled") {
      setBranches(branchesRes.value);
      setBranchEtaDrafts(Object.fromEntries(branchesRes.value.map((branch) => [branch.id, branch.estimatedPrepMinutes])));
      setAvailabilityBranchId((current) => current || branchesRes.value[0]?.id || "");
    }
    if (categoriesRes.status === "fulfilled") {
      setCategories(categoriesRes.value);
      setCategoryDrafts(
        Object.fromEntries(
          categoriesRes.value.map((category) => [
            category.id,
            {
              titleEn: category.titleEn,
              descriptionEn: category.descriptionEn ?? "",
              displayOrder: category.displayOrder,
              isActive: category.isActive,
            },
          ]),
        ),
      );
      setProductForm((form) => ({ ...form, categoryId: form.categoryId || categoriesRes.value[0]?.id || "" }));
    }
    if (catalogRes.status === "fulfilled") setCatalog(catalogRes.value);
    if (ordersRes.status === "fulfilled") setOrders(ordersRes.value);
    if (bannersRes.status === "fulfilled") setBanners(bannersRes.value);
    if (usersRes.status === "fulfilled") setUsers(usersRes.value);
    if (auditRes.status === "fulfilled") setAudit(auditRes.value);
    if (queueRes.status === "fulfilled") setQueue(queueRes.value);

    const failed = calls.filter((item) => item.status === "rejected");
    if (failed.length > 0) {
      setNotice("Some sections could not be refreshed. Check role permissions or API health.");
    } else {
      setNotice("");
    }

    setIsLoadingData(false);
  }

  useEffect(() => {
    void load();
  }, [token]);

  useEffect(() => {
    setNowMs(Date.now());
    const interval = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!availabilityBranchId) return;
    setAvailabilityDrafts((prev) => {
      const next = { ...prev };
      for (const product of catalog) {
        const item = product.availability?.find((entry) => entry.branchId === availabilityBranchId);
        next[product.id] = {
          status: item?.status ?? "AVAILABLE",
          note: item?.note ?? "",
        };
      }
      return next;
    });
  }, [availabilityBranchId, catalog]);

  async function saveAction(label: string, action: () => Promise<void>) {
    if (!token) return;
    setBusy(true);
    setNotice("");

    try {
      await action();
      await load();
      setNotice(`${label} saved.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : `${label} failed.`);
    } finally {
      setBusy(false);
    }
  }

  function applyBannerPreset(presetId: string) {
    setSelectedBannerPreset(presetId);
    if (!presetId) return;

    const preset = bundledBannerPresets.find((item) => item.id === presetId);
    if (!preset) return;

    setBannerForm((current) => ({
      ...current,
      titleEn: preset.titleEn,
      subtitleEn: preset.subtitleEn,
      imageUrl: preset.imageUrl,
      theme: preset.theme,
      displayOrder: preset.displayOrder,
    }));
  }

  return (
    <div className="command-shell">
      <aside className="command-sidebar">
        <img className="command-logo" src="/brand/farooj-logo-english.png" alt="Farooj Abu Al-Abed" />
        <div className="command-user">
          <span>Signed in</span>
          <strong>{user?.email ?? "loading session"}</strong>
          <small>{user?.roles.join(" · ") ?? ""}</small>
        </div>

        <nav className="command-nav">
          {tabs.map((tab) => (
            <button className={activeTab === tab.id ? "active" : ""} key={tab.id} onClick={() => setActiveTab(tab.id)}>
              {tab.label}
            </button>
          ))}
        </nav>

        <div className="command-side-actions">
          {panelMode !== "admin" ? (
            <Link className="btn secondary" href={kitchenPanelUrl}>
              Open Kitchen Panel
            </Link>
          ) : null}
          <button className="btn ghost" onClick={logout}>
            Logout
          </button>
        </div>
      </aside>

      <main className="command-main">
        <header className="command-topbar">
          <div>
            <span className="tag">Management Console</span>
            <h1>{tabs.find((tab) => tab.id === activeTab)?.label ?? "Command Center"}</h1>
            <p className="muted">
              Central control over app health, orders, branch readiness, catalog quality, and operational governance.
            </p>
          </div>
          <div className="btn-row">
            <button className="btn secondary" disabled={busy || isLoadingData} onClick={() => void load()}>
              {isLoadingData ? "Refreshing..." : "Refresh All"}
            </button>
          </div>
        </header>

        {loading || isLoadingData ? <Panel title="Loading Manager Panel" subtitle="Syncing live data from API services." /> : null}
        {!loading && !token ? <div className="notice">Please sign in with an admin or kitchen manager account.</div> : null}
        {notice ? <div className="notice">{notice}</div> : null}

        {!loading && !isLoadingData && activeTab === "command" ? (
          <section className="command-section">
            <div className="command-kpis">
              <Kpi label="Active Products" value={overview.products ?? 0} detail={`${categories.length} categories`} />
              <Kpi label="Branches Live" value={branches.filter((item) => item.isAcceptingOrders).length} detail={`${branches.length} total branches`} />
              <Kpi label="Active Orders" value={overview.activeOrders ?? 0} detail={`${overview.todayOrders ?? 0} today`} />
              <Kpi label="Revenue Today" value={formatMoney(overview.todayRevenue)} detail={`${overview.orders ?? 0} lifetime orders`} />
              <Kpi label="Stalled Orders" value={stalledOrders.length} detail="older than 25 minutes" />
              <Kpi label="Availability Issues" value={availabilityIssues} detail="paused or unavailable branch items" />
            </div>

            <div className="command-grid two">
              <div className="command-card">
                <CardHeader title="Immediate Attention" subtitle="Operational risks that need intervention." />
                <div className="mini-grid">
                  <AlertLine
                    tone={branches.some((branch) => !branch.isAcceptingOrders) ? "warning" : "success"}
                    title="Branch Intake"
                    detail={`${branches.filter((branch) => !branch.isAcceptingOrders).length} branch(es) are not accepting new orders.`}
                  />
                  <AlertLine
                    tone={stalledOrders.length > 0 ? "danger" : "success"}
                    title="Kitchen Delay"
                    detail={`${stalledOrders.length} active order(s) are beyond 25 minutes.`}
                  />
                  <AlertLine
                    tone={availabilityIssues > 0 ? "warning" : "success"}
                    title="Menu Availability"
                    detail={`${availabilityIssues} branch-product availability entry(ies) are not AVAILABLE.`}
                  />
                </div>
              </div>

              <div className="command-card">
                <CardHeader title="Branch Readiness" subtitle="Open/close status, ETA, order and staff volume." />
                <div className="command-list">
                  {branches.map((branch) => (
                    <div className="command-row" key={branch.id}>
                      <div>
                        <strong>{branch.nameEn}</strong>
                        <span>
                          {branch.code} · ETA {branch.estimatedPrepMinutes} min · {branch._count?.orders ?? 0} orders · {branch._count?.staffAssignments ?? 0} staff
                        </span>
                      </div>
                      <span className={branch.isAcceptingOrders ? "status-pill success" : "status-pill warning"}>
                        {branch.isAcceptingOrders ? "Accepting" : "Stopped"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="command-card">
              <CardHeader title="Aging Watchlist" subtitle="Oldest active orders across all branches." />
              <DataTable headers={["Order", "Branch", "Status", "Age", "Amount", "Placed"]}>
                {stalledOrders.length === 0 ? (
                  <tr>
                    <td colSpan={6}>No stalled orders right now.</td>
                  </tr>
                ) : (
                  stalledOrders.map(({ order, age }) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}</td>
                      <td>{order.branch?.nameEn ?? "--"}</td>
                      <td>{order.status}</td>
                      <td>{age} min</td>
                      <td>{formatMoney(order.grandTotal?.amount)}</td>
                      <td>{formatDateTime(order.placedAt)}</td>
                    </tr>
                  ))
                )}
              </DataTable>
            </div>

            <OrdersBoard orders={activeOrders} title="Active Order Control Board" nowMs={nowMs} />
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "menu" ? (
          <section className="command-section">
            <div className="command-grid two">
              <div className="command-card">
                <CardHeader title="Create Category" subtitle="Add a new menu category for customer apps." />
                <div className="input-grid two">
                  <label className="field">
                    <span>Name</span>
                    <input value={categoryForm.titleEn} onChange={(event) => setCategoryForm({ ...categoryForm, titleEn: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Display Order</span>
                    <input
                      type="number"
                      value={categoryForm.displayOrder}
                      onChange={(event) => setCategoryForm({ ...categoryForm, displayOrder: Number(event.target.value) })}
                    />
                  </label>
                  <label className="field span-2">
                    <span>Description</span>
                    <input
                      value={categoryForm.descriptionEn}
                      onChange={(event) => setCategoryForm({ ...categoryForm, descriptionEn: event.target.value })}
                    />
                  </label>
                </div>
                <button
                  className="btn primary"
                  disabled={busy || !categoryForm.titleEn}
                  onClick={() =>
                    void saveAction("Category", async () => {
                      await apiRequest("/admin/categories", { method: "POST", body: JSON.stringify(categoryForm) }, token!);
                      setCategoryForm({ titleEn: "", descriptionEn: "", displayOrder: 0 });
                    })
                  }
                >
                  Add Category
                </button>
              </div>

              <div className="command-card">
                <CardHeader title="Create Product" subtitle="Insert a new item into the live menu catalog." />
                <div className="input-grid two">
                  <label className="field">
                    <span>Category</span>
                    <select value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })}>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.titleEn}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="field">
                    <span>Name</span>
                    <input value={productForm.nameEn} onChange={(event) => setProductForm({ ...productForm, nameEn: event.target.value })} />
                  </label>
                  <label className="field span-2">
                    <span>Description</span>
                    <textarea
                      value={productForm.descriptionEn}
                      onChange={(event) => setProductForm({ ...productForm, descriptionEn: event.target.value })}
                    />
                  </label>
                  <label className="field">
                    <span>Image URL</span>
                    <input value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} />
                  </label>
                  <label className="field">
                    <span>Tags CSV</span>
                    <input value={productForm.tagsCsv} onChange={(event) => setProductForm({ ...productForm, tagsCsv: event.target.value })} />
                  </label>
                  <label className="check-row">
                    <input
                      type="checkbox"
                      checked={productForm.isFeatured}
                      onChange={(event) => setProductForm({ ...productForm, isFeatured: event.target.checked })}
                    />
                    Featured
                  </label>
                </div>
                <button
                  className="btn primary"
                  disabled={busy || !productForm.categoryId || !productForm.nameEn}
                  onClick={() =>
                    void saveAction("Product", async () => {
                      await apiRequest("/admin/products", { method: "POST", body: JSON.stringify(productForm) }, token!);
                      setProductForm({ ...emptyProductForm, categoryId: categories[0]?.id || "" });
                    })
                  }
                >
                  Add Product
                </button>
              </div>
            </div>

            <div className="command-card">
              <div className="command-card-head">
                <CardHeader title="Category Governance" subtitle="Edit name, order and active state for menu categories." />
              </div>
              <DataTable headers={["Category", "Products", "Display", "Active", "Actions"]}>
                {categories.map((category) => {
                  const draft = categoryDrafts[category.id] ?? {
                    titleEn: category.titleEn,
                    descriptionEn: category.descriptionEn ?? "",
                    displayOrder: category.displayOrder,
                    isActive: category.isActive,
                  };

                  return (
                    <tr key={category.id}>
                      <td>
                        <input
                          value={draft.titleEn}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, titleEn: event.target.value },
                            })
                          }
                        />
                      </td>
                      <td>{category._count?.products ?? 0}</td>
                      <td>
                        <input
                          type="number"
                          value={draft.displayOrder}
                          onChange={(event) =>
                            setCategoryDrafts({
                              ...categoryDrafts,
                              [category.id]: { ...draft, displayOrder: Number(event.target.value) },
                            })
                          }
                        />
                      </td>
                      <td>
                        <label className="check-row">
                          <input
                            type="checkbox"
                            checked={draft.isActive}
                            onChange={(event) =>
                              setCategoryDrafts({
                                ...categoryDrafts,
                                [category.id]: { ...draft, isActive: event.target.checked },
                              })
                            }
                          />
                          {draft.isActive ? "Active" : "Hidden"}
                        </label>
                      </td>
                      <td>
                        <button
                          className="btn secondary"
                          onClick={() =>
                            void saveAction("Category", async () => {
                              await apiRequest(
                                `/admin/categories/${category.id}`,
                                {
                                  method: "PATCH",
                                  body: JSON.stringify({
                                    titleEn: draft.titleEn,
                                    descriptionEn: draft.descriptionEn,
                                    displayOrder: draft.displayOrder,
                                    isActive: draft.isActive,
                                  }),
                                },
                                token!,
                              );
                            })
                          }
                        >
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </DataTable>
            </div>

            <div className="command-card">
              <div className="command-card-head">
                <CardHeader title="Menu Catalog" subtitle="Manage product lifecycle, featured state, tags and variants." />
                <div className="toolbar-controls">
                  <select value={selectedCategoryId} onChange={(event) => setSelectedCategoryId(event.target.value)}>
                    <option value="">All categories</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.titleEn}
                      </option>
                    ))}
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
                      <small>
                        {(product.tags ?? []).join(", ") || "No tags"} · variants {(product.variants ?? []).length} · paused branches {product.pausedBranches}
                      </small>
                    </div>

                    <div className="btn-row">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          void saveAction("Product", async () => {
                            await apiRequest(
                              `/admin/products/${product.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  status: product.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE",
                                  categoryId: product.categoryId,
                                  nameEn: product.name,
                                  descriptionEn: product.description,
                                }),
                              },
                              token!,
                            );
                          })
                        }
                      >
                        {product.status === "ACTIVE" ? "Archive" : "Activate"}
                      </button>
                      <button
                        className="btn secondary"
                        onClick={() =>
                          void saveAction("Product", async () => {
                            await apiRequest(
                              `/admin/products/${product.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  isFeatured: !product.isFeatured,
                                  categoryId: product.categoryId,
                                  nameEn: product.name,
                                  descriptionEn: product.description,
                                }),
                              },
                              token!,
                            );
                          })
                        }
                      >
                        {product.isFeatured ? "Unfeature" : "Feature"}
                      </button>
                    </div>

                    <div className="mini-grid">
                      {(product.variants ?? []).map((variant) => (
                        <div className="variant-row" key={variant.id}>
                          <span>{variant.name}</span>
                          <strong>{formatMoney(variant.price.amount)}</strong>
                          <button
                            className="btn ghost"
                            onClick={() =>
                              void saveAction("Variant", async () => {
                                await apiRequest(
                                  `/admin/variants/${variant.id}`,
                                  { method: "PATCH", body: JSON.stringify({ isActive: !variant.isActive }) },
                                  token!,
                                );
                              })
                            }
                          >
                            {variant.isActive ? "Disable" : "Enable"}
                          </button>
                        </div>
                      ))}

                      <div className="variant-row">
                        <input
                          placeholder="Variant name"
                          value={variantDrafts[product.id]?.nameEn ?? ""}
                          onChange={(event) =>
                            setVariantDrafts({
                              ...variantDrafts,
                              [product.id]: { ...(variantDrafts[product.id] ?? { price: "" }), nameEn: event.target.value },
                            })
                          }
                        />
                        <input
                          placeholder="Price"
                          type="number"
                          value={variantDrafts[product.id]?.price ?? ""}
                          onChange={(event) =>
                            setVariantDrafts({
                              ...variantDrafts,
                              [product.id]: { ...(variantDrafts[product.id] ?? { nameEn: "" }), price: event.target.value },
                            })
                          }
                        />
                        <button
                          className="btn ghost"
                          onClick={() =>
                            void saveAction("Variant", async () => {
                              const draft = variantDrafts[product.id];
                              await apiRequest(
                                `/admin/products/${product.id}/variants`,
                                { method: "POST", body: JSON.stringify({ nameEn: draft?.nameEn, price: Number(draft?.price || 0) }) },
                                token!,
                              );
                              setVariantDrafts({ ...variantDrafts, [product.id]: { nameEn: "", price: "" } });
                            })
                          }
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "availability" ? (
          <section className="command-section">
            <div className="command-card">
              <div className="command-card-head">
                <CardHeader
                  title="Branch Product Availability"
                  subtitle="Control sold-out and paused items per branch. Kitchen and branch teams read this state live."
                />
                <div className="toolbar-controls">
                  <select value={availabilityBranchId} onChange={(event) => setAvailabilityBranchId(event.target.value)}>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nameEn}
                      </option>
                    ))}
                  </select>
                  <select value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
                    <option value="ALL">All items</option>
                    <option value="NON_AVAILABLE">Not available</option>
                    <option value="PAUSED">Paused</option>
                    <option value="UNAVAILABLE">Out of stock</option>
                  </select>
                  <input
                    value={availabilitySearch}
                    placeholder="Search product"
                    onChange={(event) => setAvailabilitySearch(event.target.value)}
                  />
                </div>
              </div>

              <div className="availability-grid">
                {availabilityRows.map((product) => {
                  const draft = availabilityDrafts[product.id] ?? { status: "AVAILABLE" as AvailabilityStatus, note: "" };
                  return (
                    <div className="availability-card" key={product.id}>
                      <div>
                        <strong>{product.name}</strong>
                        <p className="muted">{product.category ?? "--"}</p>
                      </div>

                      <div className="btn-row">
                        <span className={`status-pill ${statusTone[draft.status]}`}>{draft.status}</span>
                        <button
                          className="btn ghost"
                          onClick={() => setAvailabilityDrafts({ ...availabilityDrafts, [product.id]: { ...draft, status: "AVAILABLE" } })}
                        >
                          Available
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => setAvailabilityDrafts({ ...availabilityDrafts, [product.id]: { ...draft, status: "PAUSED" } })}
                        >
                          Pause
                        </button>
                        <button
                          className="btn ghost"
                          onClick={() => setAvailabilityDrafts({ ...availabilityDrafts, [product.id]: { ...draft, status: "UNAVAILABLE" } })}
                        >
                          Out
                        </button>
                      </div>

                      <label className="field">
                        <span>Kitchen note</span>
                        <input
                          value={draft.note}
                          placeholder="e.g. chicken fillet sold out"
                          onChange={(event) =>
                            setAvailabilityDrafts({
                              ...availabilityDrafts,
                              [product.id]: { ...draft, note: event.target.value },
                            })
                          }
                        />
                      </label>

                      <button
                        className="btn primary"
                        disabled={!availabilityBranchId || busy}
                        onClick={() =>
                          void saveAction("Availability", async () => {
                            await apiRequest(
                              "/admin/availability",
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  branchId: availabilityBranchId,
                                  productId: product.id,
                                  status: draft.status,
                                  note: draft.note,
                                }),
                              },
                              token!,
                            );
                          })
                        }
                      >
                        Save for Branch
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "branches" ? (
          <section className="command-section">
            <div className="command-card">
              <CardHeader title="Branch Controls" subtitle="Manage intake, activation and preparation ETA by branch." />
              <div className="branch-grid">
                {branches.map((branch) => (
                  <div className="branch-card" key={branch.id}>
                    <span className={branch.isAcceptingOrders ? "status-pill success" : "status-pill warning"}>
                      {branch.isAcceptingOrders ? "Accepting Orders" : "Orders Stopped"}
                    </span>
                    <h3>{branch.nameEn}</h3>
                    <p className="muted">{branch.addressEn}</p>
                    <small>
                      {branch.code} · {branch._count?.orders ?? 0} orders · {branch._count?.staffAssignments ?? 0} staff · {branch.phone}
                    </small>

                    <label className="field" style={{ marginTop: 10 }}>
                      <span>Estimated Prep Minutes</span>
                      <input
                        type="number"
                        value={branchEtaDrafts[branch.id] ?? branch.estimatedPrepMinutes}
                        onChange={(event) => setBranchEtaDrafts({ ...branchEtaDrafts, [branch.id]: Number(event.target.value) })}
                      />
                    </label>

                    <div className="btn-row">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          void saveAction("Branch", async () => {
                            await apiRequest(
                              `/admin/branches/${branch.id}`,
                              { method: "PATCH", body: JSON.stringify({ isAcceptingOrders: !branch.isAcceptingOrders }) },
                              token!,
                            );
                          })
                        }
                      >
                        {branch.isAcceptingOrders ? "Stop Orders" : "Accept Orders"}
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          void saveAction("Branch", async () => {
                            await apiRequest(`/admin/branches/${branch.id}`, { method: "PATCH", body: JSON.stringify({ isActive: !branch.isActive }) }, token!);
                          })
                        }
                      >
                        {branch.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          void saveAction("ETA", async () => {
                            await apiRequest(
                              `/admin/branches/${branch.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({ estimatedPrepMinutes: Number(branchEtaDrafts[branch.id] ?? branch.estimatedPrepMinutes) }),
                              },
                              token!,
                            );
                          })
                        }
                      >
                        Save ETA
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "orders" ? (
          <section className="command-section">
            <div className="command-card">
              <div className="command-card-head">
                <CardHeader title="Order Monitoring" subtitle="Filter by branch, status and order code for rapid incident handling." />
                <div className="toolbar-controls">
                  <select value={orderBranchFilter} onChange={(event) => setOrderBranchFilter(event.target.value)}>
                    <option value="ALL">All branches</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.nameEn}
                      </option>
                    ))}
                  </select>
                  <select value={orderStatusFilter} onChange={(event) => setOrderStatusFilter(event.target.value)}>
                    <option value="ALL">All statuses</option>
                    {statusGroups.map((item) => (
                      <option key={item.status} value={item.status}>
                        {item.label}
                      </option>
                    ))}
                  </select>
                  <input value={orderSearch} placeholder="Search code / email / token" onChange={(event) => setOrderSearch(event.target.value)} />
                </div>
              </div>
            </div>
            <OrdersBoard orders={filteredOrders} title="All Orders" nowMs={nowMs} />
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "customers" ? (
          <section className="command-section">
            <div className="command-card">
              <CardHeader title="Users, Staff, Customers" subtitle="Track account status, roles, branch mapping and order volume." />
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
          <section className="command-section">
            <div className="command-card">
              <CardHeader
                title="Banner Composer"
                subtitle="Top Strip: unlimited compact banners. Bottom Feature: full-width banner/GIF. Designed for the iOS home layout."
              />
              <div className="mini-grid" style={{ marginBottom: 12 }}>
                <span className="tag">Bundled asset: /assets/banners/Hareeq_Offer_Slider_T01.jpg</span>
                <span className="tag">Bundled asset: /assets/banners/Taghmisat_Offer_Slider_T01.jpg</span>
                <span className="tag">Bundled asset: /assets/banners/Baby_Satl_Offer_Slider_T01.jpg</span>
                <span className="tag">Bundled GIF: /assets/banners/app-deal-30.gif</span>
              </div>
              <div className="input-grid two">
                <label className="field span-2">
                  <span>Quick Preset</span>
                  <select value={selectedBannerPreset} onChange={(event) => applyBannerPreset(event.target.value)}>
                    <option value="">Manual entry</option>
                    {bundledBannerPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Title</span>
                  <input value={bannerForm.titleEn} onChange={(event) => setBannerForm({ ...bannerForm, titleEn: event.target.value })} />
                </label>
                <label className="field">
                  <span>Theme / Slot</span>
                  <select value={bannerForm.theme} onChange={(event) => setBannerForm({ ...bannerForm, theme: event.target.value as BannerTheme })}>
                    <option value="top_strip">Top Strip (small cards)</option>
                    <option value="bottom_feature">Bottom Feature (full width, supports GIF)</option>
                  </select>
                </label>
                <label className="field span-2">
                  <span>Image URL (JPG/PNG/GIF)</span>
                  <input value={bannerForm.imageUrl} onChange={(event) => setBannerForm({ ...bannerForm, imageUrl: event.target.value })} />
                </label>
                <label className="field">
                  <span>CTA Label</span>
                  <input value={bannerForm.ctaLabelEn} onChange={(event) => setBannerForm({ ...bannerForm, ctaLabelEn: event.target.value })} />
                </label>
                <label className="field">
                  <span>Display Order</span>
                  <input
                    type="number"
                    value={bannerForm.displayOrder}
                    onChange={(event) => setBannerForm({ ...bannerForm, displayOrder: Number(event.target.value) })}
                  />
                </label>
                <label className="field span-2">
                  <span>Subtitle</span>
                  <input value={bannerForm.subtitleEn} onChange={(event) => setBannerForm({ ...bannerForm, subtitleEn: event.target.value })} />
                </label>
              </div>
              <div className="btn-row">
                <button
                  className="btn primary"
                  disabled={busy || !bannerForm.titleEn || !bannerForm.imageUrl}
                  onClick={() =>
                    void saveAction("Banner", async () => {
                      await apiRequest("/admin/banners", { method: "POST", body: JSON.stringify(bannerForm) }, token!);
                      setBannerForm(emptyBannerForm);
                      setSelectedBannerPreset("");
                    })
                  }
                >
                  Add Banner
                </button>
              </div>
            </div>

            <div className="command-card">
              <CardHeader title={`Top Strip Banners (${topStripBanners.length})`} subtitle="Compact horizontal cards shown at the top of Home screen." />
              <div className="catalog-grid">
                {topStripBanners.map((banner) => (
                  <div className="product-admin-card" key={banner.id}>
                    <img src={banner.imageUrl} alt="" />
                    <h3>{banner.titleEn}</h3>
                    <p className="muted">{banner.subtitleEn}</p>
                    <small>
                      order {banner.displayOrder ?? 0} · {banner.ctaLabelEn} · {banner.ctaTarget}
                    </small>
                    <div className="btn-row">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          void saveAction("Banner", async () => {
                            await apiRequest(
                              `/admin/banners/${banner.id}`,
                              { method: "PATCH", body: JSON.stringify({ isActive: !banner.isActive }) },
                              token!,
                            );
                          })
                        }
                      >
                        {banner.isActive ? "Hide Banner" : "Show Banner"}
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          void saveAction("Banner", async () => {
                            await apiRequest(
                              `/admin/banners/${banner.id}`,
                              {
                                method: "PATCH",
                                body: JSON.stringify({
                                  displayOrder: Math.max(1, (banner.displayOrder ?? 1) - 1),
                                }),
                              },
                              token!,
                            );
                          })
                        }
                      >
                        Move Up
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="command-card">
              <CardHeader title={`Bottom Feature (${bottomFeatureBanners.length})`} subtitle="Single full-width banner/GIF section under top strip offers." />
              <div className="catalog-grid">
                {bottomFeatureBanners.map((banner) => (
                  <div className="product-admin-card" key={banner.id}>
                    <img src={banner.imageUrl} alt="" />
                    <h3>{banner.titleEn}</h3>
                    <p className="muted">{banner.subtitleEn}</p>
                    <small>
                      order {banner.displayOrder ?? 0} · {banner.ctaLabelEn} · {banner.ctaTarget}
                    </small>
                    <div className="btn-row">
                      <button
                        className="btn secondary"
                        onClick={() =>
                          void saveAction("Banner", async () => {
                            await apiRequest(
                              `/admin/banners/${banner.id}`,
                              { method: "PATCH", body: JSON.stringify({ isActive: !banner.isActive }) },
                              token!,
                            );
                          })
                        }
                      >
                        {banner.isActive ? "Hide Banner" : "Show Banner"}
                      </button>
                      <button
                        className="btn ghost"
                        onClick={() =>
                          void saveAction("Banner", async () => {
                            await apiRequest(
                              `/admin/banners/${banner.id}`,
                              { method: "PATCH", body: JSON.stringify({ theme: "top_strip" }) },
                              token!,
                            );
                          })
                        }
                      >
                        Move to Top Strip
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ) : null}

        {!loading && !isLoadingData && activeTab === "audit" ? (
          <section className="command-section">
            <div className="command-card">
              <CardHeader title="Audit Trail" subtitle="Recent management and branch operations actions." />
              <DataTable headers={["Action", "Entity", "Actor", "Time"]}>
                {audit.map((entry) => (
                  <tr key={entry.id}>
                    <td>{entry.action}</td>
                    <td>{entry.entityType}</td>
                    <td>{entry.actor?.email ?? "system"}</td>
                    <td>{formatDateTime(entry.createdAt)}</td>
                  </tr>
                ))}
              </DataTable>
            </div>

            <div className="command-card">
              <CardHeader title="Kitchen Snapshot" subtitle="Shared branch queue monitor from the manager view (read-only)." />
              <div className="command-grid two">
                <Kpi label="Awaiting Payment" value={queue.awaitingPayment.length} detail={queue.branch?.nameEn ?? "branch context"} />
                <Kpi
                  label="Kitchen Active"
                  value={queue.paid.length + queue.inPreparation.length + queue.ready.length}
                  detail="paid + in prep + ready"
                />
              </div>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

function Kpi({ label, value, detail }: { label: string; value: React.ReactNode; detail: string }) {
  return (
    <div className="command-kpi">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  );
}

function Panel({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="command-card">
      <CardHeader title={title} subtitle={subtitle} />
    </div>
  );
}

function CardHeader({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="card-header">
      <h2>{title}</h2>
      <p className="muted">{subtitle}</p>
    </div>
  );
}

function AlertLine({
  tone,
  title,
  detail,
}: {
  tone: "success" | "warning" | "danger";
  title: string;
  detail: string;
}) {
  return (
    <div className="command-row">
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
      <span className={`status-pill ${tone}`}>{tone.toUpperCase()}</span>
    </div>
  );
}

function OrdersBoard({ orders, title, nowMs }: { orders: Order[]; title: string; nowMs: number | null }) {
  return (
    <div className="command-card">
      <CardHeader title={title} subtitle="Status, payment, branch, customer, modifiers and notes." />
      <div className="order-board">
        {statusGroups.map((group) => {
          const groupOrders = orders.filter((order) => order.status === group.status);
          return (
            <div className="order-column" key={group.status}>
              <header>
                <h3>{group.label}</h3>
                <span className="tag">{groupOrders.length}</span>
              </header>
              {groupOrders.length === 0 ? <p className="muted">No orders.</p> : null}
              {groupOrders.map((order) => (
                <OrderCard key={order.id} order={order} nowMs={nowMs} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrderCard({ order, nowMs }: { order: Order; nowMs: number | null }) {
  const age = minutesSince(order.placedAt, nowMs);
  return (
    <div className="order-card">
      <div className="command-row compact">
        <div>
          <strong>{order.orderCode}</strong>
          <span>
            {order.branch?.nameEn ?? "--"} · {order.customer?.name || order.customer?.email || "Guest"}
          </span>
        </div>
        <strong>{formatMoney(order.grandTotal?.amount)}</strong>
      </div>
      <small>
        {order.paymentStatus} · {order.itemCount} items · {age !== null ? `${age} min` : "--"} · {formatDateTime(order.placedAt)}
      </small>
      <div className="item-list">
        {(order.items ?? []).slice(0, 4).map((item) => (
          <div className="kitchen-line" key={item.id}>
            <strong>{item.quantity}x</strong>
            <span>{item.name}</span>
            <small>{item.variantName}</small>
            {(item.modifiers ?? []).map((modifier, index) => (
              <em key={`${item.id}-${index}`}>
                {modifier.modifierGroupNameEn ?? modifier.group}: {modifier.optionNameEn ?? modifier.option}
              </em>
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
        <thead>
          <tr>
            {headers.map((header) => (
              <th key={header}>{header}</th>
            ))}
          </tr>
        </thead>
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
