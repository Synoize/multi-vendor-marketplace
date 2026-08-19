import { Helmet } from "react-helmet-async";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { toast } from "sonner";
import {
  User,
  MapPin,
  Package,
  Wallet,
  Bell,
  Mail,
  ChevronRight,
  Plus,
  Edit,
  Trash2,
  Phone,
  X,
  Star,
  Check,
} from "lucide-react";

const TABS = [
  {
    id: "profile",
    label: "My Profile",
    icon: <User strokeWidth={1.5} className="h-4 w-4" />,
  },
  {
    id: "addresses",
    label: "Addresses",
    icon: <MapPin strokeWidth={1.5} className="h-4 w-4" />,
  },
  {
    id: "wallet",
    label: "Wallet",
    icon: <Wallet strokeWidth={1.5} className="h-4 w-4" />,
  },
];

const EMPTY_FORM = {
  name: "",
  phone: "",
  email: "",
  line1: "",
  line2: "",
  landmark: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",
  type: "home",
  is_default: false,
};

export default function Profile() {
  const { user, setUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState("profile");
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
  });
  const [addrModalOpen, setAddrModalOpen] = useState(false);
  const [editingAddr, setEditingAddr] = useState(null);
  const [addrForm, setAddrForm] = useState(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const queryClient = useQueryClient();

  const { data: addresses = [], refetch: refetchAddresses } = useQuery({
    queryKey: ["addresses"],
    queryFn: () => useProfileStore.getState().fetchAddresses(),
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet"],
    queryFn: () => useProfileStore.getState().fetchWallet(),
  });

  const saveProfile = async () => {
    try {
      const updatedUser = await useProfileStore
        .getState()
        .updateProfile(formData);
      setUser(updatedUser);
      setEditing(false);
      toast.success("Profile updated!");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    }
  };

  const deleteAddress = async (id) => {
    try {
      await useProfileStore.getState().deleteAddress(id);
      setDeleteConfirmId(null);
      refetchAddresses();
      toast.success("Address deleted");
    } catch {
      toast.error("Failed to delete address");
    }
  };

  const saveAddress = async () => {
    const required = ["name", "phone", "line1", "city", "state", "pincode"];
    for (const key of required) {
      if (!addrForm[key]?.trim()) {
        toast.error(`Please fill in ${key === "line1" ? "address line" : key}`);
        return;
      }
    }
    try {
      if (editingAddr) {
        await useProfileStore
          .getState()
          .updateAddress(editingAddr.id, addrForm);
        toast.success("Address updated");
      } else {
        await useProfileStore.getState().addAddress(addrForm);
        toast.success("Address added");
      }
      setAddrModalOpen(false);
      setEditingAddr(null);
      setAddrForm(EMPTY_FORM);
      refetchAddresses();
    } catch {
      toast.error("Failed to save address");
    }
  };

  const setDefault = async (id) => {
    const addr = addresses.find((a) => a.id === id);
    if (!addr) return;
    try {
      await useProfileStore.getState().setDefaultAddress(id);
      toast.success("Default address set");
      refetchAddresses();
    } catch {
      toast.error("Failed to update");
    }
  };

  const openAdd = () => {
    setEditingAddr(null);
    setAddrForm({ ...EMPTY_FORM, phone: user?.phone || "" });
    setAddrModalOpen(true);
  };

  const openEdit = (addr) => {
    setEditingAddr(addr);
    setAddrForm({
      name: addr.name || "",
      phone: addr.phone || "",
      email: addr.email || "",
      line1: addr.line1 || "",
      line2: addr.line2 || "",
      landmark: addr.landmark || "",
      city: addr.city || "",
      state: addr.state || "",
      pincode: addr.pincode || "",
      country: addr.country || "India",
      type: addr.type || "home",
      is_default: !!addr.is_default,
    });
    setAddrModalOpen(true);
  };

  const setAddr = (key, value) => setAddrForm((f) => ({ ...f, [key]: value }));

  return (
    <>
      <Helmet>
        <title>My Profile - The Damini Edit</title>
      </Helmet>
      <div className="max-w-6xl mx-auto min-h-[calc(100vh-64px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="flex flex-col md:flex-row gap-5">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-primary-600 to-primary p-5 text-white text-center">
                <div className="w-16 h-16 rounded-full bg-white text-primary text-2xl font-bold flex items-center justify-center mx-auto mb-3 uppercase">
                  {user?.name?.[0] || "U"}
                </div>
                <p className="font-semibold">{user?.name}</p>
                <p className="text-secondary text-xs mt-0.5">{user?.email}</p>
                {user?.referral_code && (
                  <div className="mt-2 bg-white/20 rounded px-2 py-1 text-xs font-mono">
                    {user.referral_code}
                  </div>
                )}
              </div>
              <nav className="py-2">
                {TABS.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-3 w-full px-4 py-3 text-sm transition-colors ${activeTab === tab.id ? "bg-primary-50 text-primary font-semibold border-l-4 border-primary" : "text-secondary-900 hover:bg-secondary"}`}
                  >
                    <span
                      className={`${activeTab === tab.id ? "text-primary " : "text-secondary-900"}`}
                    >
                      {tab.icon}
                    </span>{" "}
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1">
            {/* Profile Tab */}
            {activeTab === "profile" && (
              <div className="bg-white sm:rounded-lg sm:shadow-sm p-2 sm:p-5">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-semibold text-secondary-950 sm:text-lg">
                    Personal Information
                  </h2>
                  <button
                    onClick={() => (editing ? saveProfile() : setEditing(true))}
                    className={`text-xs sm:text-sm px-4 py-1.5 rounded hover:bg-opacity-90 ${editing ? "bg-primary text-white" : "border border-primary text-primary"} transition-colors`}
                  >
                    {editing ? "Save Changes" : "Edit Profile"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Full Name", key: "name", type: "text" },
                    { label: "Mobile Number", key: "phone", type: "tel" },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-secondary-800 uppercase tracking-wide mb-1">
                        {label}
                      </label>
                      {editing ? (
                        <input
                          type={type}
                          value={formData[key] || ""}
                          onChange={(e) =>
                            setFormData((f) => ({
                              ...f,
                              [key]: e.target.value,
                            }))
                          }
                          className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                        />
                      ) : (
                        <p className="text-sm text-secondary-950 font-medium py-2">
                          {user?.[key] || "Not set"}
                        </p>
                      )}
                    </div>
                  ))}
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 uppercase tracking-wide mb-1">
                      Email Address
                    </label>
                    <div className="flex gap-2 items-center">
                      <p className="text-sm text-secondary-950 font-medium py-2">
                        {user?.email}
                      </p>
                      {user?.is_verified ? (
                        <span className="text-green-600 text-xs font-medium">
                          ✓ Verified
                        </span>
                      ) : (
                        <span className="text-red-500 text-xs font-medium">
                          ⚠ Not verified
                        </span>
                      )}
                    </div>
                  </div>
                  {/* <div>
                    <label className="block text-xs font-medium text-secondary-800 uppercase tracking-wide mb-1">
                      Account Type
                    </label>
                    <p className="text-sm font-medium py-2 capitalize">
                      {user?.role}
                    </p>
                  </div> */}
                </div>
                {editing && (
                  <button
                    onClick={() => setEditing(false)}
                    className="mt-3 text-sm text-secondary-800 hover:text-secondary-900"
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            {/* Addresses Tab */}
            {activeTab === "addresses" && (
              <div className="bg-white sm:rounded-lg sm:shadow-sm p-2 sm:p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-secondary-950 sm:text-lg">
                    Saved Addresses
                  </h2>
                  <button
                    onClick={openAdd}
                    className="text-primary text-xs sm:text-sm flex items-center gap-1.5 border border-primary px-4 py-1.5 rounded hover:bg-primary-50 transition-colors"
                  >
                    <Plus className="h-4 w-4" /> Add Address
                  </button>
                </div>
                {addresses.length === 0 ? (
                  <p className="text-secondary-700 text-sm text-center py-8">
                    No saved addresses
                  </p>
                ) : (
                  <div className="space-y-3">
                    {addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`border rounded-lg p-4 relative ${addr.is_default ? "border-primary bg-secondary" : ""}`}
                      >
                        {!!addr.is_default && (
                          <span className="absolute top-3 right-3 text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">
                            Default
                          </span>
                        )}
                        <div className="flex items-start gap-2 mb-1">
                          <span className="text-[10px] bg-white text-secondary-800 px-1.5 py-0.5 rounded uppercase font-semibold">
                            {addr.type}
                          </span>
                          <p className="font-semibold text-sm text-secondary-950">
                            {addr.name}
                          </p>
                        </div>
                        <p className="text-xs text-secondary-900">
                          {addr.line1}
                          {addr.line2 && `, ${addr.line2}`}
                        </p>
                        {addr.landmark && (
                          <p className="text-xs text-secondary-700">
                            Landmark: {addr.landmark}
                          </p>
                        )}
                        <p className="text-xs text-secondary-900">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-xs text-secondary-800 mt-1">
                          <Phone
                            strokeWidth={1.5}
                            className="w-3.5 h-3.5 inline"
                          />{" "}
                          {addr.phone}
                        </p>
                        {addr.email && (
                          <p className="text-xs text-secondary-800 mt-0.5">
                            <Mail
                              strokeWidth={1.5}
                              className="w-3.5 h-3.5 inline"
                            />{" "}
                            {addr.email}
                          </p>
                        )}
                        <div className="flex gap-3 mt-2">
                          <button
                            onClick={() => openEdit(addr)}
                            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                          >
                            <Edit className="w-3 h-3" /> Edit
                          </button>
                          {!addr.is_default && (
                            <button
                              onClick={() => setDefault(addr.id)}
                              className="text-xs text-secondary-800 hover:underline flex items-center gap-1"
                            >
                              <Check className="w-3 h-3" /> Set Default
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirmId(addr.id)}
                            className="text-xs text-red-500 hover:underline flex items-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Wallet Tab */}
            {activeTab === "wallet" && (
              <div className="bg-white sm:rounded-lg sm:shadow-sm p-2 sm:p-5">
                <h2 className="font-semibold text-secondary-950 sm:text-lg mb-4">
                  The Damini Edit Wallet
                </h2>
                <div className="bg-gradient-to-br from-primary-500 to-accent rounded-xl p-4 sm:p-6 text-white mb-5">
                  <p className="text-white text-sm mb-1">Available Balance</p>
                  <p className="text-3xl sm:text-4xl font-bold">
                    ₹{parseFloat(wallet?.balance || 0).toLocaleString("en-IN")}
                  </p>
                  <p className="text-secondary-200 text-[10px] sm:text-xs mt-2">
                    Use your wallet balance at checkout for instant discounts
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-secondary-950 mb-3 text-sm">
                    Recent Transactions
                  </h3>
                  {wallet?.transactions?.length > 0 ? (
                    wallet.transactions.map((t) => (
                      <div
                        key={t.id}
                        className="flex justify-between items-center py-2.5 border-b last:border-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-secondary-950">
                            {t.description}
                          </p>
                          <p className="text-xs text-secondary-800">
                            {new Date(t.created_at).toLocaleDateString("en-IN")}
                          </p>
                        </div>
                        <span
                          className={`font-bold text-sm ${t.type === "credit" ? "text-green-600" : "text-red-500"}`}
                        >
                          {t.type === "credit" ? "+" : "-"}₹
                          {parseFloat(t.amount).toLocaleString("en-IN")}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-secondary-700 text-sm text-center py-6">
                      No transactions yet
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Address Form Modal */}
      {addrModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setAddrModalOpen(false)}
          />
          <div className="relative bg-white rounded-lg w-full max-w-xl max-h-[78vh] sm:max-h-[68vh] overflow-y-auto shadow-sm scrollbar-thin">
            <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between z-10">
              <h3 className="font-semibold text-secondary-950">
                {editingAddr ? "Edit Address" : "Add Address"}
              </h3>
              <button
                onClick={() => setAddrModalOpen(false)}
                className="p-1 rounded hover:bg-secondary"
              >
                <X className="w-5 h-5 text-secondary-800" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div className="flex gap-2">
                {["home", "work", "other"].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setAddr("type", t)}
                    className={`flex-1 py-2.5 text-xs font-medium rounded-lg border capitalize transition-colors ${
                      addrForm.type === t
                        ? "bg-primary text-white border-primary"
                        : "border text-secondary-800 hover:bg-secondary-50"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Full Name *
                  </label>
                  <input
                    value={addrForm.name}
                    onChange={(e) => setAddr("name", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Phone *
                  </label>
                  <input
                    value={addrForm.phone}
                    onChange={(e) => setAddr("phone", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                    placeholder="9876543210"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-800 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={addrForm.email}
                  onChange={(e) => setAddr("email", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                  placeholder="john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Pincode *
                  </label>
                  <input
                    value={addrForm.pincode}
                    onChange={(e) => setAddr("pincode", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                    placeholder="400001"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    City *
                  </label>
                  <input
                    value={addrForm.city}
                    onChange={(e) => setAddr("city", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                    placeholder="Mumbai"
                  />
                </div>
                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    State *
                  </label>
                  <input
                    value={addrForm.state}
                    onChange={(e) => setAddr("state", e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                    placeholder="Maharashtra"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-800 mb-1">
                  Address Line 1 *
                </label>
                <input
                  value={addrForm.line1}
                  onChange={(e) => setAddr("line1", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                  placeholder="House No, Street, Area"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-800 mb-1">
                  Address Line 2
                </label>
                <input
                  value={addrForm.line2}
                  onChange={(e) => setAddr("line2", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                  placeholder="Apartment, Suite, Floor (optional)"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-secondary-800 mb-1">
                  Landmark
                </label>
                <input
                  value={addrForm.landmark}
                  onChange={(e) => setAddr("landmark", e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm outline-none focus:border-secondary-600"
                  placeholder="Near XYZ Mall (optional)"
                />
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={addrForm.is_default}
                  onChange={(e) => setAddr("is_default", e.target.checked)}
                  className="w-4 h-4 rounded border-secondary-300 text-primary focus:ring-primary"
                />
                <span className="text-sm text-secondary-900">
                  Set as default address
                </span>
              </label>
            </div>
            <div className="sticky bottom-0 bg-white border-t px-5 py-2.5 flex gap-3">
              <button
                onClick={() => setAddrModalOpen(false)}
                className="flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg border border-secondary-300 text-secondary-800 hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={saveAddress}
                className="flex-1 py-2.5 text-xs sm:text-sm font-medium rounded-lg bg-primary text-white hover:bg-opacity-90 transition-colors"
              >
                {editingAddr ? "Update Address" : "Save Address"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setDeleteConfirmId(null)}
          />
          <div className="relative bg-white rounded-xl w-full max-w-sm p-6 shadow-xl text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-6 h-6 text-red-500" />
            </div>
            <h3 className="font-semibold text-secondary-950 mb-1">
              Delete Address?
            </h3>
            <p className="text-sm text-secondary-700 mb-5">
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg border border-secondary-300 text-secondary-800 hover:bg-secondary-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteAddress(deleteConfirmId)}
                className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
