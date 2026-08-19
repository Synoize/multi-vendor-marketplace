import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useShipmentStore } from "../store/shipmentStore";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import DataTable from "../components/ui/DataTable";
import { Truck, CheckCircle, Search, Compass, RefreshCw } from "lucide-react";

export default function Shipments() {
  const [pickup, setPickup] = useState("");
  const [delivery, setDelivery] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [couriers, setCouriers] = useState([]);
  const [checking, setChecking] = useState(false);

  // Fetch shipped orders to display active shipments
  const fetchShippedOrders = useShipmentStore(
    (state) => state.fetchShippedOrders,
  );
  const checkServiceability = useShipmentStore(
    (state) => state.checkServiceability,
  );
  const { data, isLoading } = useQuery({
    queryKey: ["vendor-shipments"],
    queryFn: () => fetchShippedOrders(),
  });

  const orders = data?.orders || [];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Shipments & Logistics</h1>
        <p className="text-sm text-secondary-800 mt-0.5">
          Check courier serviceability and track active shipments
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side - Serviceability Checker */}
        <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 border-b border-gray-50 pb-3">
            <Compass className="h-5 w-5 text-[#2874F0]" />
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
                onChange={(e) => setPickup(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
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
                onChange={(e) => setDelivery(e.target.value.replace(/\D/g, ""))}
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
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
                className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <button
              type="submit"
              disabled={checking}
              className="w-full bg-[#2874F0] text-white py-2 rounded-lg text-sm font-semibold hover:bg-[#1a5de0] transition-colors"
            >
              {checking ? "Checking..." : "Check Rates & Availability"}
            </button>
          </form>

          {/* Results */}
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
                    <p className="text-gray-400">Rating: {c.rating || "N/A"}</p>
                  </div>
                  <p className="font-bold text-[#2874F0]">
                    ₹{c.rate || "Check Label"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side - Shipments Tracker */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center gap-2">
              <Truck className="h-4 w-4 text-gray-500" />
              <h3 className="font-bold text-gray-900 text-sm">
                Active Shipments ({orders.length})
              </h3>
            </div>

            <DataTable
              columns={[
                {
                  key: "order_number",
                  label: "Order details",
                  render: (_, row) => (
                    <div>
                      <p className="font-bold text-gray-900">
                        #{row.order_number}
                      </p>
                      <p className="text-xs text-gray-500 truncate max-w-[200px]">
                        {row.product_names || row.product_name}
                      </p>
                    </div>
                  ),
                  sortable: true,
                },
                {
                  key: "delivery_name",
                  label: "Delivery Customer",
                  render: (_, row) => (
                    <div>
                      <p className="font-medium">
                        {row.delivery_name || "Customer"}
                      </p>
                      <p className="text-xs text-gray-400">
                        {row.delivery_phone}
                      </p>
                    </div>
                  ),
                  sortable: true,
                },
                {
                  key: "awb_code",
                  label: "Tracking AWB",
                  render: (_, row) => (
                    <div>
                      <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                        {row.awb_code || "Self Ship"}
                      </span>
                      {row.courier_name && (
                        <p className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">
                          {row.courier_name}
                        </p>
                      )}
                    </div>
                  ),
                  sortable: true,
                },
                {
                  key: "created_at",
                  label: "Shipped Date",
                  render: (value) =>
                    new Date(value).toLocaleDateString("en-IN", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    }),
                  sortable: true,
                },
              ]}
              data={orders}
              loading={isLoading}
              emptyMessage="No active shipments"
              enablePagination={false}
              enableSearch={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
