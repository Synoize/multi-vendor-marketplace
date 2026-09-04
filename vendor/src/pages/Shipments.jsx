import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShipmentStore } from "../store/shipmentStore";
import { useVendorStore } from "../store/vendorStore";
import DataTable from "../components/ui/DataTable";
import StatusBadge from "../components/ui/StatusBadge";
import StatCard from "../components/ui/StatCard";
import {
  Truck,
  Compass,
  RefreshCw,
  Archive,
  Package,
  Ship,
  Home,
  ExternalLink,
  FileText,
} from "lucide-react";

const STATUS_TABS = [
  { id: "all", label: "All", icon: Package },
  { id: "in_transit", label: "In Transit", icon: Truck },
  { id: "shipped", label: "Shipped", icon: Ship },
  { id: "delivered", label: "Delivered", icon: Home },
];

export default function Shipments() {
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [couriers, setCouriers] = useState([]);
  const [checking, setChecking] = useState(false);
  const [activeTab, setActiveTab] = useState("all");

  // Load the vendor's saved pickup pincode (Settings > Pickup Address)
  const fetchProfile = useVendorStore((state) => state.fetchProfile);
  const { data: vendorProfile } = useQuery({
    queryKey: ["shipments-vendor-profile"],
    queryFn: () => fetchProfile(),
  });

  useEffect(() => {
    const saved = vendorProfile?.pickup_pincode;
    if (saved) setPickup((cur) => cur || saved);
  }, [vendorProfile]);

  // Fetch vendor's real shipment records
  const fetchVendorShipments = useShipmentStore(
    (state) => state.fetchVendorShipments,
  );
  const checkServiceability = useShipmentStore(
    (state) => state.checkServiceability,
  );

  const {
    data,
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vendor-shipments"],
    queryFn: () => fetchVendorShipments(),
    refetchInterval: 15000,
  });

  const shipments = data?.data || [];
  const total = data?.total || shipments.length;

  const stats = useMemo(() => {
    return {
      total: shipments.length,
      in_transit: shipments.filter((s) => s.status === "in_transit").length,
      shipped: shipments.filter((s) => s.status === "shipped").length,
      delivered: shipments.filter((s) => s.status === "delivered").length,
    };
  }, [shipments]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return shipments;
    return shipments.filter((s) => s.status === activeTab);
  }, [shipments, activeTab]);

  const handleCheckServiceability = async (e) => {
    e.preventDefault();
    if (!pickup || !delivery) return;
    setChecking(true);
    try {
      const res = await checkServiceability({
        pickupPincode: pickup,
        deliveryPincode: delivery,
        weight,
      });
      setCouriers(res?.couriers || []);
    } catch (err) {
      setCouriers([]);
    } finally {
      setChecking(false);
    }
  };

  const formatDate = (value) =>
    value
      ? new Date(value).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—";

  const columns = [
    {
      key: "order_number",
      label: "Order",
      render: (_, row) => (
        <div>
          <p className="font-bold text-gray-900">#{row.order_number}</p>
          {row.product_names && (
            <p className="text-xs text-gray-500 truncate max-w-[220px]">
              {row.product_names}
            </p>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "delivery_name",
      label: "Deliver To",
      render: (_, row) => (
        <div>
          <p className="font-medium">{row.delivery_name || "Customer"}</p>
          <p className="text-xs text-gray-400">{row.delivery_phone}</p>
          <p className="text-[11px] text-gray-400">
            {[row.city, row.pincode].filter(Boolean).join(", ")}
          </p>
        </div>
      ),
      sortable: true,
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={value} />,
      sortable: true,
    },
    {
      key: "awb_code",
      label: "AWB",
      render: (value, row) => (
        <div>
          {value ? (
            <>
              <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full">
                {value}
              </span>
              {row.courier_name && (
                <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                  {row.courier_name}
                </p>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-400">Not assigned</span>
          )}
        </div>
      ),
      sortable: true,
    },
    {
      key: "estimated_delivery",
      label: "Expected Delivery",
      render: (value) => formatDate(value),
      sortable: true,
    },
    {
      key: "created_at",
      label: "Shipped On",
      render: (value) => formatDate(value),
      sortable: true,
    },
    {
      key: "actions",
      label: "Actions",
      enableSorting: false,
      render: (_, row) => (
        <div className="flex gap-1">
          {row.tracking_url && (
            <a
              href={row.tracking_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Track on courier site"
              className="p-1.5 rounded-lg text-primary hover:bg-primary/10 transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
            </a>
          )}
          {row.label_url && (
            <a
              href={row.label_url}
              target="_blank"
              rel="noopener noreferrer"
              title="Download label"
              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <FileText className="h-4 w-4" />
            </a>
          )}
          {!row.tracking_url && !row.label_url && (
            <span className="text-[10px] text-gray-300">—</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Shipments & Logistics</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            Track your shipments and check courier serviceability
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-3.5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total Shipments"
          value={total}
          icon={Archive}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          loading={isLoading}
        />
        <StatCard
          label="In Transit"
          value={stats.in_transit}
          icon={Truck}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          loading={isLoading}
        />
        <StatCard
          label="Shipped"
          value={stats.shipped}
          icon={Ship}
          iconBg="bg-purple-100"
          iconColor="text-purple-600"
          loading={isLoading}
        />
        <StatCard
          label="Delivered"
          value={stats.delivered}
          icon={Home}
          iconBg="bg-emerald-100"
          iconColor="text-emerald-600"
          loading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tracked shipments */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-100">
              {STATUS_TABS.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                const count =
                  tab.id === "all"
                    ? shipments.length
                    : shipments.filter((s) => s.status === tab.id).length;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "text-gray-600 hover:bg-gray-100"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span
                      className={`ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                        active
                          ? "bg-white/25 text-white"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <DataTable
              columns={columns}
              data={filtered}
              loading={isLoading}
              emptyMessage="No shipments found"
              enablePagination={filtered.length > 8}
              enableSearch={false}
            />
          </div>
        </div>

        {/* Serviceability Checker */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit">
            <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
              <Compass className="h-5 w-5 text-primary" />
              <h3 className="font-bold text-gray-900 text-sm">
                Check Courier Serviceability
              </h3>
            </div>
            <form onSubmit={handleCheckServiceability} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Pickup Pincode *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 560001"
                  value={pickup}
                  onChange={(e) =>
                    setPickup(e.target.value.replace(/\D/g, ""))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
                <p className="mt-1 text-[10px] text-gray-400">
                  Pre-filled from your pickup address. Edit if needed.
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Delivery Pincode *
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. 110001"
                  value={delivery}
                  onChange={(e) =>
                    setDelivery(e.target.value.replace(/\D/g, ""))
                  }
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase">
                  Weight (kg) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-primary"
                />
              </div>
              <button
                type="submit"
                disabled={checking}
                className="w-full bg-primary hover:bg-opacity-90 text-white py-2 rounded-lg text-sm font-semibold transition-colors"
              >
                {checking ? "Checking..." : "Check Rates & Availability"}
              </button>
            </form>

            {couriers.length > 0 && (
              <div className="space-y-2.5 pt-2 border-t border-gray-50 max-h-60 overflow-y-auto">
                <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                  Available Couriers
                </h4>
                {couriers.map((c, i) => (
                  <div
                    key={i}
                    className="flex justify-between items-center p-2.5 bg-gray-50 rounded-lg text-xs"
                  >
                    <div>
                      <p className="font-bold text-gray-900">{c.courier_name}</p>
                      <p className="text-gray-400">
                        Rating: {c.rating || "N/A"}
                      </p>
                    </div>
                    <p className="font-bold text-primary">
                      ₹{c.rate || "Check Label"}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
