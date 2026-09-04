import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Megaphone,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Helmet } from "react-helmet-async";
import useAuthStore from "../../store/authStore";
import Spinner from "../../components/ui/Spinner";
import { assets } from "../../assets/assets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const FEATURES = [
  {
    icon: Megaphone,
    label: "Promote your products",
    desc: "Reach millions of shoppers on The Damini Edit",
  },
  {
    icon: TrendingUp,
    label: "Track performance",
    desc: "Real-time impressions, clicks & ROAS",
  },
  {
    icon: BarChart3,
    label: "Smart analytics",
    desc: "Campaign-level and product-level insights",
  },
];

function Login() {
  const { requestOtp, verifyOtp } = useAuthStore();
  const navigate = useNavigate();

  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [emailError, setEmailError] = useState("");
  const [serverError, setServerError] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  const handleSendOtp = async (e) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed || !EMAIL_RE.test(trimmed)) {
      setEmailError("Enter a valid email address");
      return;
    }
    setEmailError("");
    setServerError("");
    setSending(true);
    try {
      await requestOtp(trimmed);
      setEmail(trimmed);
      setOtp("");
      setStep("otp");
      setResendIn(30);
      toast.success("OTP sent to your email");
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Failed to send OTP. Please try again.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setSending(false);
    }
  };

  const handleResend = async () => {
    if (resendIn > 0 || sending) return;
    setServerError("");
    try {
      await requestOtp(email);
      setResendIn(30);
      toast.success("OTP resent to your email");
    } catch (err) {
      const msg =
        err?.response?.data?.message ||
        "Failed to resend OTP. Please try again.";
      setServerError(msg);
      toast.error(msg);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(otp)) {
      setServerError("Please enter the 6-digit OTP");
      return;
    }
    setServerError("");
    setVerifying(true);
    try {
      await verifyOtp(email, otp);
      toast.success("Welcome back! Loading your campaigns...");
      navigate("/");
    } catch (err) {
      const msg =
        err?.response?.data?.message || "Invalid OTP. Please try again.";
      setServerError(msg);
      toast.error(msg);
    } finally {
      setVerifying(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Sign In - The Damini Edit Ads Manager</title>
      </Helmet>

      <div className="h-screen overflow-hidden bg-secondary flex">
        {/* Left Panel — Branding */}
        <div className="hidden lg:flex flex-col justify-between w-[45%] bg-white border-r border-secondary-300 p-10 lg:p-12">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center shadow-md shadow-primary/30">
              <img
                src={assets.logoIcon}
                alt="Damini"
                className="w-8 h-8 object-contain"
              />
            </div>
            <div>
              <p className="text-secondary-950 font-bold text-lg leading-tight">
                The Damini Edit Ads
              </p>
              <p className="text-secondary-800 text-[10px] uppercase tracking-widest">
                Manager
              </p>
            </div>
          </div>

          {/* Hero (centered, no scroll) */}
          <div className="flex flex-col justify-center gap-8 py-6">
            <div>
              <h1 className="text-3xl xl:text-4xl font-black text-secondary-950 leading-tight">
                Manage your{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  The Damini Edit Ad
                </span>{" "}
                Campaigns
              </h1>
              <p className="text-secondary-800 mt-3 text-base leading-relaxed">
                Create high-performance ad campaigns, track real-time analytics,
                and grow your sales on India's fastest-growing marketplace.
              </p>
            </div>

            <div className="flex flex-col gap-3">
              {FEATURES.map(({ icon: Icon, label, desc }) => (
                <div key={label} className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-[18px] h-[18px] text-primary" />
                  </div>
                  <div>
                    <p className="text-secondary-950 text-sm font-semibold">
                      {label}
                    </p>
                    <p className="text-secondary-800 text-xs">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "2M+", label: "Monthly Shoppers" },
              { value: "₹50Cr+", label: "Ad Spend Managed" },
              { value: "10x", label: "Avg. ROAS" },
            ].map((stat) => (
              <div key={stat.label} className="glass-card p-3 text-center">
                <p className="text-lg font-black text-primary">{stat.value}</p>
                <p className="text-secondary-800 text-[11px] mt-0.5">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Right Panel — Form */}
        <div className="flex-1 flex items-center justify-center p-6 overflow-y-auto">
          <div className="w-full max-w-md py-4">
            {/* Mobile Logo */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary-800 flex items-center justify-center shadow-md shadow-primary/30">
                <img
                  src={assets.logoIcon}
                  alt="Damini"
                  className="w-7 h-7 object-contain"
                />
              </div>
              <div>
                <p className="text-secondary-950 font-bold text-base">
                  The Damini Edit Ads
                </p>
                <p className="text-secondary-800 text-[10px] uppercase tracking-widest">
                  Manager
                </p>
              </div>
            </div>

            <div className="mb-8 flex items-start justify-between">
              <div>
                <h2 className="text-2xl font-normal text-secondary-950">
                  {step === "email" ? "Vendor Sign In" : "Verify OTP"}
                </h2>
                <p className="text-secondary-800 text-sm mt-1.5">
                  {step === "email"
                    ? "We'll send a verification code to your email"
                    : "Enter the 6-digit code sent to your email"}
                </p>
              </div>
              {step === "otp" && (
                <button
                  type="button"
                  onClick={() => {
                    setStep("email");
                    setOtp("");
                    setServerError("");
                  }}
                  className="w-9 h-9 rounded-xl bg-white border border-secondary-300 flex items-center justify-center text-secondary-800 hover:text-primary hover:bg-secondary-200 transition-all flex-shrink-0"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              )}
            </div>

            {serverError && (
              <div className="mb-4 flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5">
                <ShieldCheck className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{serverError}</p>
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="flex flex-col gap-5">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary-900">
                    Email Address
                  </label>
                  <div className="relative w-full">
                    <Mail
                      strokeWidth={1.5}
                      className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary-800 pointer-events-none"
                    />

                    <input
                      type="email"
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="vendor@store.com"
                      className={`input-dark w-full pl-10 pr-3 py-2.5 text-sm sm:text-base rounded-xl ${
                        emailError ? "border-red-400 focus:border-red-400" : ""
                      }`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-red-500 text-xs">{emailError}</p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={sending}
                  className="w-full flex items-center justify-center gap-2 btn-primary py-3"
                >
                  {sending ? (
                    <>
                      <Spinner size="xs" color="white" />
                      Sending OTP...
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="flex flex-col gap-5">
                <div className="flex items-center justify-between bg-white border border-secondary-300 rounded-xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-secondary-800">OTP sent to</p>
                    <p className="text-[11px] text-secondary-950 font-medium truncate">
                      {email}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setServerError("");
                    }}
                    className="text-xs font-semibold text-primary hover:underline flex-shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-secondary-900">
                    One-Time Passcode
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="000000"
                    className="input-dark w-full text-center tracking-[0.5em] font-mono text-lg"
                  />
                </div>

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full flex items-center justify-center gap-2 btn-primary py-3"
                >
                  {verifying ? (
                    <>
                      <Spinner size="xs" color="white" />
                      Verifying...
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>

                <div className="text-center">
                  {resendIn > 0 ? (
                    <p className="text-xs text-secondary-800">
                      Resend OTP in {resendIn}s
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={handleResend}
                      disabled={sending}
                      className="text-xs font-semibold text-primary hover:underline disabled:opacity-50"
                    >
                      Resend OTP
                    </button>
                  )}
                </div>
              </form>
            )}

            <div className="mt-5 p-3.5 bg-primary-50/70 border border-primary-100 rounded-xl">
              <p className="text-xs text-primary font-medium">
                Vendor accounts only
              </p>
              <p className="text-[11px] text-secondary-800 mt-0.5 leading-relaxed">
                Exclusive to registered The Damini Edit vendors. Contact support
                if you need access.
              </p>
            </div>

            <p className="text-center text-secondary-800 text-xs mt-4">
              © 2025 The Damini Edit Marketplace. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}

export default Login;
