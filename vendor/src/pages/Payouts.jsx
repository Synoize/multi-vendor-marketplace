import React from "react";
import { useQuery } from "@tanstack/react-query";
import { usePayoutStore } from "../store/payoutStore";
import { useVendorStore } from "../store/vendorStore";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import DataTable from "../components/ui/DataTable";
import { Wallet, History, CreditCard, ArrowUpRight } from "lucide-react";

export default function Payouts() {
  const fetchPayouts = usePayoutStore((state) => state.fetchPayouts);
  const fetchProfile = useVendorStore((state) => state.fetchProfile);

  const { data: payoutData, isLoading } = useQuery({
    queryKey: ["vendor-payouts"],
    queryFn: () => fetchPayouts(),
  });

  const { data: profile } = useQuery({
    queryKey: ["vendor-profile"],
    queryFn: () => fetchProfile(),
  });

  const payouts = payoutData?.payouts || [];
  const pendingAmount = payoutData?.pendingAmount || 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Payouts & Settlements</h1>
        <p className="text-sm text-secondary-800 mt-0.5">
          View your earnings, pending payouts, and bank settlement history
        </p>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Stats Left */}
          <div className="md:col-span-2 space-y-6">
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-primary-600 to-primary-500 rounded-xl p-6 text-white shadow-md flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-secondary text-xs uppercase tracking-wider">
                  Unsettled Balance
                </p>
                <h3 className="text-3xl font-semibold">
                  ₹{parseFloat(pendingAmount).toLocaleString("en-IN")}
                </h3>
                <p className="text-secondary-400 text-xs mt-2">
                  These earnings will be released in the next automated
                  settlement cycle.
                </p>
              </div>
              <div className="h-14 w-14 bg-white/10 rounded-full flex items-center justify-center">
                <Wallet strokeWidth={1.5} className="h-7 w-7 text-white" />
              </div>
            </div>

            {/* History Table */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
              <div className="p-4 border-b border-gray-100 flex items-center gap-2">
                <History className="h-4 w-4 text-gray-500" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Settlement History
                </h3>
              </div>

              {payouts.length === 0 ? (
                <EmptyState
                  icon={<History className="h-10 w-10 text-gray-400" />}
                  title="No payouts yet"
                  description="Your settlement history will show up here after payouts are processed."
                />
              ) : (
                <DataTable
                  enablePagination={false}
                  enableSearch={false}
                  emptyMessage="No payouts yet"
                  columns={[
                    {
                      key: "transaction_id",
                      label: "Transaction ID",
                      sortable: false,
                      render: (val, row) => (
                        <span className="font-mono text-xs">
                          {val || `settle_${row.id}`}
                        </span>
                      ),
                    },
                    {
                      key: "order_ids",
                      label: "Orders",
                      sortable: false,
                      render: (val) => (
                        <span className="text-gray-500">
                          {(Array.isArray(val) ? val.length : JSON.parse(val || "[]").length) || 0}{" "}
                          orders
                        </span>
                      ),
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (val) => (
                        <span className="font-bold text-gray-900">
                          ₹{parseFloat(val).toLocaleString("en-IN")}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (val) => (
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full capitalize">
                          {val}
                        </span>
                      ),
                    },
                    {
                      key: "created_at",
                      label: "Settled At",
                      render: (val) => (
                        <span className="text-xs text-gray-400">
                          {new Date(val).toLocaleDateString("en-IN", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                      ),
                    },
                  ]}
                  data={payouts}
                />
              )}
            </div>
          </div>

          {/* Bank details side */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
              <div className="flex items-center gap-2 mb-4 border-b border-gray-50 pb-3">
                <CreditCard className="h-5 w-5 text-[#2874F0]" />
                <h3 className="font-bold text-gray-900 text-sm">
                  Settlement Bank Account
                </h3>
              </div>
              {profile?.bank_name ? (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-gray-400">Bank Name</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {profile.bank_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Account Holder</p>
                    <p className="text-sm font-semibold text-gray-800">
                      {profile.account_holder || "Vendor Account"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">Account Number</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono">
                      •••• •••• {profile.account_number?.slice(-4) || "XXXX"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400">IFSC Code</p>
                    <p className="text-sm font-semibold text-gray-800 font-mono">
                      {profile.ifsc_code}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <p className="text-xs text-gray-500">
                    No bank details added.
                  </p>
                  <a
                    href="/settings"
                    className="inline-block text-xs font-semibold text-[#2874F0] hover:underline"
                  >
                    Add Bank Details in Settings →
                  </a>
                </div>
              )}
            </div>

            <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-3">
              <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
                Settlement Policy
              </h4>
              <p className="text-xs text-gray-500 leading-relaxed">
                Damini processes automated payments to your registered bank
                account weekly. Minimum payout threshold is ₹500. Orders return
                window must expire before the order item becomes eligible for
                payout settlement.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
