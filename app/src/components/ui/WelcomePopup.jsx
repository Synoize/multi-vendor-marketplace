import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useProfileStore } from "@/store/profileStore";
import { toast } from "sonner";

export default function WelcomePopup({ user, onDismiss }) {
  const [visible, setVisible] = useState(false);
  const { setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    setTimeout(onDismiss, 300);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const phoneDigits = phone.replace(/\D/g, "").slice(0, 10);
    if (phoneDigits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const updatedUser = await useProfileStore
        .getState()
        .updateProfile({
          name: name.trim() || user?.name,
          phone: phoneDigits,
        });
      setUser(updatedUser);
      toast.success("Profile updated successfully!");
      handleDismiss();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center p-4 transition-all duration-300 ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div className="absolute inset-0 bg-black/60" onClick={handleDismiss} />

      <div
        className={`relative bg-white rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-300 ${
          visible ? "scale-100" : "scale-90"
        }`}
      >
        {/* Image */}
        <img
          src="https://i.pinimg.com/736x/48/2a/8a/482a8a4515c7e9e9565c63fda86559e2.jpg"
          alt="Welcome"
          className="w-full h-[28vh] object-cover"
        />

        <div className="p-5 text-center">
          <h2 className="text-slate-900 text-xl font-medium">
            Welcome, {user?.name?.split(" ")[0] || "Guest"}!
          </h2>

          {user?.phone ? (
            <>
              <p className="mt-1 text-xs text-slate-500">Happy to see you again!</p>
              <button
                onClick={handleDismiss}
                className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-full transition-colors text-sm"
              >
                Start Shopping
              </button>
            </>
          ) : (
            <form onSubmit={handleSubmit}>
              <p className="mt-1 text-xs text-slate-500">
                Complete your profile to continue shopping.
              </p>

              <div className="mt-4 text-left">
                <label className="text-xs font-medium text-slate-700">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              <div className="mt-3 text-left">
                <label className="text-xs font-medium text-slate-700">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                  }
                  placeholder="10-digit mobile number"
                  maxLength={10}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-primary-500 transition-colors"
                />
              </div>

              {error && (
                <p className="mt-2 text-left text-xs text-red-500">{error}</p>
              )}

              <button
                type="submit"
                disabled={saving}
                className="w-full mt-4 bg-primary-500 hover:bg-primary-600 text-white py-2.5 rounded-full transition-colors text-sm disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : (
                  "Continue"
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
