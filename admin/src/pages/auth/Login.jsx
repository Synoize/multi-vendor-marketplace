import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { toast } from "sonner";
import { Shield, Eye, EyeOff, Lock, Mail, AlertTriangle } from "lucide-react";
import api from "../../lib/axios";
import useAuthStore from "../../store/authStore";
import Spinner from "../../components/ui/Spinner";
import { assets } from "../../assets/assets";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const { setUser } = useAuthStore();

  const from = location.state?.from?.pathname || "/";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password.trim()) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);
    try {
      const response = await api.post("/auth/login", { email, password });
      const data = response.data?.data || response.data;

      if (data?.user?.role !== "admin") {
        setError(
          "Access denied. This panel is restricted to administrators only.",
        );
        setLoading(false);
        return;
      }

      setUser(data.user);
      toast.success(`Welcome back, ${data.user?.name || "Admin"}!`);
      navigate(from, { replace: true });
    } catch (err) {
      const msg =
        err.response?.data?.message || "Invalid credentials. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Admin Login - The Damini Edit</title>
      </Helmet>

      <div className="min-h-screen bg-white flex items-center justify-center p-4 relative">
        <div className="w-full max-w-sm z-10 bg-white rounded-3xl shadow-sm border border-secondary-300 p-6 sm:p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-xl overflow-hidden bg-secondary flex items-center justify-center border border-gray-100">
              <img
                src={assets.logo}
                alt="The Damini Edit"
                className="w-full h-full object-contain"
              />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-secondary-900 tracking-tight">
                The Damini Edit
                <sup className="ml-0.5 text-xs align-super text-secondary-900">
                  ™
                </sup>
              </h1>
              <p className="text-xs text-secondary-700 font-medium">
                Sign in to admin panel
              </p>
            </div>
          </div>

          <div className="flex items-start gap-2.5 bg-emerald-50 border border-emerald-100 rounded-xl py-2 px-2.5 mb-6">
            <Shield
              strokeWidth={2}
              className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5"
            />
            <p className="text-xs text-emerald-700 leading-relaxed">
              This panel is restricted to authorized administrators only.
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-2.5 bg-red-50 border border-red-100 rounded-xl p-3.5 mb-6">
              <AlertTriangle
                className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5"
                strokeWidth={2}
              />
              <p className="text-xs text-red-600 leading-relaxed">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-secondary-900 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  strokeWidth={1.5}
                />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@thedaminiedit.in"
                  autoComplete="email"
                  autoFocus
                  disabled={loading}
                  className="w-full p-2.5 pl-10 rounded-xl border bg-secondary-200 text-secondary-900 text-xs md:text-sm outline-none transition-all focus:bg-white focus:border-secondary-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-secondary-900 mb-2 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <Lock
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                  strokeWidth={1.5}
                />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  className="w-full py-2.5 pl-10 pr-10 rounded-xl border bg-secondary-200 text-secondary-900 text-xs md:text-sm outline-none transition-all focus:bg-white focus:border-secondary-600 disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={loading}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-primary hover:bg-opacity-90 active:bg-opacity-80 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Spinner size="sm" />
                  Authenticating...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>
        </div>

        <p className=" absolute bottom-7 text-center text-xs sm:text-sm text-secondary-800 mt-6">
          © {new Date().getFullYear()} The Damini Edit
          <sup className="ml-0.5 text-xs align-super">™</sup>. All rights
          reserved.
        </p>
      </div>
    </>
  );
}
