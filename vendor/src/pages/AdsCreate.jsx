import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useProductStore } from "../store/productStore";
import { useAdStore } from "../store/adStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import { Megaphone, Search, ChevronLeft, Check } from "lucide-react";

export default function AdsCreate() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    name: "",
    type: "cpc",
    daily_budget: "100",
    total_budget: "1000",
    bid_amount: "1",
    start_date: new Date().toISOString().split("T")[0],
    end_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
  });
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [search, setSearch] = useState("");

  const fetchProducts = useProductStore((state) => state.fetchProducts);
  const createAd = useAdStore((state) => state.createAd);

  // Fetch vendor's products
  const { data: productsData, isLoading } = useQuery({
    queryKey: ["vendor-products-for-ads", search],
    queryFn: async () => {
      const res = await fetchProducts({ limit: 100, search });
      return res?.products || res?.data || res?.items || [];
    },
  });

  const products = productsData || [];

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const createMutation = useMutation({
    mutationFn: (payload) => {
      return createAd(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-ads"] });
      toast.success("Campaign created successfully! Submitted for review.");
      navigate("/ads");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to create campaign");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (selectedProducts.length === 0) {
      toast.error("Please select at least one product to promote");
      return;
    }
    if (parseFloat(form.daily_budget) > parseFloat(form.total_budget)) {
      toast.error("Daily budget cannot exceed total budget");
      return;
    }
    createMutation.mutate({
      ...form,
      daily_budget: parseFloat(form.daily_budget),
      total_budget: parseFloat(form.total_budget),
      bid_amount: parseFloat(form.bid_amount),
      productIds: selectedProducts,
    });
  };

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate("/ads")}
          className="p-2 rounded-xl bg-white border text-secondary-800 hover:bg-secondary transition-colors"
        >
          <ChevronLeft strokeWidth={1.5} className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>
        <div>
          <h1 className="text-xl font-semibold">Create Sponsor Campaign</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            Target customers and boost sales
          </p>
        </div>
      </div>

      <form
        onSubmit={handleSubmit}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        {/* Settings Form */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
            Campaign Settings
          </h3>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Campaign Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Festival Season Sale Promo"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Pricing Model *
              </label>
              <select
                value={form.type}
                onChange={(e) => update("type", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              >
                <option value="cpc">CPC (Pay per Click)</option>
                <option value="cpm">CPM (Pay per 1k Impressions)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                {form.type === "cpc"
                  ? "Bid Amount (₹ per click) *"
                  : "Bid Amount (₹ per 1k impressions) *"}
              </label>
              <input
                type="number"
                min="0.5"
                step="0.1"
                required
                value={form.bid_amount}
                onChange={(e) => update("bid_amount", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Daily Budget (₹) *
              </label>
              <input
                type="number"
                min="50"
                required
                value={form.daily_budget}
                onChange={(e) => update("daily_budget", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Total Budget (₹) *
              </label>
              <input
                type="number"
                min="200"
                required
                value={form.total_budget}
                onChange={(e) => update("total_budget", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Start Date *
              </label>
              <input
                type="date"
                required
                value={form.start_date}
                onChange={(e) => update("start_date", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                End Date *
              </label>
              <input
                type="date"
                required
                value={form.end_date}
                onChange={(e) => update("end_date", e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
          </div>
        </div>

        {/* Product selector side */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 space-y-4 flex flex-col h-[400px]">
          <h3 className="font-bold text-gray-900 text-sm border-b border-gray-50 pb-2">
            Select Products
          </h3>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:border-[#2874F0]"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center py-4">
              <Spinner />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {products.map((p) => {
                const isSelected = selectedProducts.includes(p.id);
                return (
                  <div
                    key={p.id}
                    onClick={() => toggleProduct(p.id)}
                    className={`flex items-center gap-3 p-2 border rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? "border-[#2874F0] bg-blue-50/50"
                        : "border-gray-100 hover:bg-gray-50"
                    }`}
                  >
                    <div className="relative h-10 w-10 bg-gray-50 rounded flex-shrink-0 flex items-center justify-center">
                      <img
                        src={
                          p.primary_image ||
                          `https://picsum.photos/seed/${p.id}/100`
                        }
                        alt=""
                        className="max-h-full max-w-full object-contain"
                      />
                      {isSelected && (
                        <div className="absolute -top-1 -right-1 h-4 w-4 bg-[#2874F0] text-white rounded-full flex items-center justify-center">
                          <Check className="h-2.5 w-2.5" />
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-800 truncate">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-gray-500">
                        ₹{p.price} · Stock: {p.stock}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-gray-50 flex justify-between items-center text-xs">
            <span className="text-gray-500 font-semibold">
              {selectedProducts.length} selected
            </span>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="bg-[#FB641B] hover:bg-[#e55a18] text-white px-4 py-2 rounded-lg font-bold transition-colors"
            >
              {createMutation.isPending ? "Launching..." : "Launch Campaign"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
