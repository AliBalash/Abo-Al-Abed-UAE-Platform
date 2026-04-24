"use client";

import { useEffect, useState } from "react";

import { AppFrame } from "@/components/layout/app-frame";
import { SessionProvider, useSession } from "@/components/shared/session";
import { apiRequest } from "@/lib/api";
import { mockAdminOverview, mockBranches, mockCatalog } from "@/lib/mocks";

function AdminDashboardContent() {
  const { token } = useSession();
  const [overview, setOverview] = useState<any>(mockAdminOverview);
  const [branches, setBranches] = useState<any[]>(mockBranches);
  const [catalog, setCatalog] = useState<any[]>(mockCatalog);
  const [orders, setOrders] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      if (!token) return;

      try {
        const [overviewData, branchesData, catalogData, orderData] = await Promise.all([
          apiRequest<any>("/admin/overview", {}, token),
          apiRequest<any[]>("/admin/branches", {}, token),
          apiRequest<any[]>("/admin/catalog", {}, token),
          apiRequest<any[]>("/admin/orders", {}, token),
        ]);

        setOverview(overviewData);
        setBranches(branchesData);
        setCatalog(catalogData);
        setOrders(orderData);
      } catch {
        setOrders([]);
      }
    }

    void load();
  }, [token]);

  return (
    <AppFrame
      title="Manager Admin"
      subtitle="Control catalog health, branch readiness, order visibility, and launch reporting from one operational console."
    >
      <div className="page-grid">
        <div className="panel">
          <h2>Overview</h2>
          <div className="stat-grid">
            <div className="stat-card">
              Branches
              <strong>{overview.branches}</strong>
            </div>
            <div className="stat-card">
              Products
              <strong>{overview.products}</strong>
            </div>
            <div className="stat-card">
              Orders
              <strong>{overview.orders}</strong>
            </div>
            <div className="stat-card">
              Users
              <strong>{overview.users}</strong>
            </div>
            <div className="stat-card">
              Banners
              <strong>{overview.banners}</strong>
            </div>
          </div>
        </div>

        <div className="page-grid two-col">
          <div className="panel">
            <h2>Branch Health</h2>
            <div className="branch-grid">
              {branches.map((branch) => (
                <div className="branch-card" key={branch.code}>
                  <div className="tag">{branch.code}</div>
                  <h3>{branch.nameEn}</h3>
                  <p className="muted">ETA {branch.estimatedPrepMinutes} min</p>
                  <small>
                    Orders {branch._count.orders} · Staff {branch._count.staffAssignments} · Availability rows {branch._count.productAvailability}
                  </small>
                </div>
              ))}
            </div>
          </div>

          <div className="panel dark">
            <h2>Launch Checklist</h2>
            <div className="mini-grid">
              <div className="tag">Catalog imported from Google Sites and editable in admin.</div>
              <div className="tag">Branch operational flags wired to suggestion engine.</div>
              <div className="tag">Audit logs and reports endpoints already scaffolded.</div>
              <div className="tag">Push notification templates seeded in backend.</div>
            </div>
          </div>
        </div>

        <div className="page-grid two-col">
          <div className="panel">
            <h2>Catalog Snapshot</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Variants</th>
                    <th>Base Price</th>
                    <th>Paused Branches</th>
                  </tr>
                </thead>
                <tbody>
                  {catalog.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.category}</td>
                      <td>{product.variantCount}</td>
                      <td>AED {product.basePrice?.amount ?? "--"}</td>
                      <td>{product.pausedBranches}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="panel">
            <h2>Recent Orders</h2>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Code</th>
                    <th>Status</th>
                    <th>Branch</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.slice(0, 8).map((order) => (
                    <tr key={order.id}>
                      <td>{order.orderCode}</td>
                      <td>{order.status}</td>
                      <td>{order.branch?.nameEn ?? "--"}</td>
                      <td>AED {order.grandTotal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </AppFrame>
  );
}

export default function AdminPage() {
  return (
    <SessionProvider>
      <AdminDashboardContent />
    </SessionProvider>
  );
}
