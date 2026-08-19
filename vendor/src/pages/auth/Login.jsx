import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, ShieldCheck, AlertCircle, Store, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import useAuthStore from "../../store/authStore";
import { assets } from "../../assets/assets";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const navigate = useNavigate();
  const { login, requestOtp, verifyOtp } = useAuthStore();

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
      const { user, token } = await verifyOtp(email, otp);
      if (!user) {
        setServerError("Invalid response from server. Please try again.");
        return;
      }
      login(user, token);
      toast.success(`Welcome back, ${user.name || "Vendor"}!`);
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
    <div className="min-h-screen bg-gradient-to-br from-primary via-primary-500 to-primary-700 flex items-center justify-center p-4">
      <div className="max-w-6xl min-h-[60vh] bg-white rounded-3xl overflow-hidden shadow-2xl grid lg:grid-cols-2">
        {/* Left Side */}
        <div className="hidden lg:flex relative">
          <img
            src="https://picsum.photos/seed/2/900/900"
            alt="Damini"
            className="absolute inset-0 h-full w-full object-cover"
          />

          <div className="absolute inset-0 bg-black/10" />

          <div className="w-full relative z-10 flex flex-col justify-center p-12 text-white">
            <img src={assets.logo} alt="" className="w-20" />

            <h1 className="mt-8 text-4xl leading-tight">Grow with Damini</h1>

            <p className="mt-2 text-sm text-white/90 font-light leading-8">
              {step === "email"
                ? "Manage your store with ease."
                : "Enter the OTP sent to your email."}
            </p>

            <div className="mt-10 space-y-4 text-sm font-light">
              <div>✔ Manage Products & Inventory</div>
              <div>✔ Process Customer Orders</div>
              <div>✔ Monitor Sales Performance</div>
              <div>✔ Secure OTP Authentication</div>
            </div>
          </div>
        </div>

        {/* Form */}
        <div className="flex items-center justify-center px-6 py-8 md:px-12">
          <div className="w-full max-w-md">
            {/* Mobile Logo */}
            <img
              src={assets.logo}
              alt=""
              className="w-20 lg:hidden text-center mb-4"
            />
            <div className="mb-6">
              <div className="flex flex-col items-start gap-3">
                {!step === "otp" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStep("email");
                      setOtp("");
                      setServerError("");
                    }}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary hover:bg-secondary-200 transition"
                    title="Back"
                  >
                    <ArrowLeft className="h-5 w-5 text-secondary-900" />
                  </button>
                )}

                <div>
                  <h2 className="text-xl sm:text-3xl text-secondary-950">
                    {step === "email" ? "Vendor Login" : "Verify OTP"}
                  </h2>
                  <p className="mt-2 text-xs sm:text-sm text-secondary-800">
                    We'll send a verification code to your email.
                  </p>
                </div>
              </div>
            </div>

            {serverError && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-2.5 mb-4">
                <AlertCircle
                  strokeWidth={1.5}
                  className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0"
                />
                <p className="text-xs text-red-700">{serverError}</p>
              </div>
            )}

            {step === "email" ? (
              <form onSubmit={handleSendOtp} className="space-y-5 min-h-[250px]">
                {/* Email */}
                <div>
                  <label className="text-sm font-medium text-secondary-950">
                    Email Address
                  </label>
                  <div className="relative mt-2 group">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-700 transition-colors duration-200 group-focus-within:text-secondary-800" />
                    <input
                      type="email"
                      autoComplete="email"
                      placeholder="you@yourstore.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className={`w-full rounded-xl border bg-white py-2.5 sm:py-3.5 pl-12 pr-4 text-xs sm:text-sm text-secondary-950 shadow-sm outline-none transition-all duration-200 
                        ${
                          emailError
                            ? "border-red-400 bg-red-50"
                            : "border-secondary-500 focus:border-secondary-800"
                        }`}
                    />
                  </div>
                  {emailError && (
                    <p className="text-xs text-red-600 mt-1">{emailError}</p>
                  )}
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-xl bg-primary py-2.5 sm:py-3.5 text-xs sm:text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sending OTP…
                    </>
                  ) : (
                    "Send OTP"
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleVerify} className="space-y-5 min-h-[250px]">
                {/* Email summary */}
                <div className="flex items-center justify-between bg-secondary border rounded-xl px-4 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm text-secondary-800">
                      OTP sent to
                    </p>
                    <p className="text-xs text-secondary-900 font-medium break-all">
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
                    className="text-xs font-semibold text-blue-500 hover:underline flex-shrink-0 ml-2"
                  >
                    Change
                  </button>
                </div>
                {/* OTP */}
                <div>
                  <label className="text-sm font-medium text-secondary-900">
                    One-Time Passcode
                  </label>
                  <div className="relative mt-2 group">
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) =>
                        setOtp(e.target.value.replace(/\D/g, ""))
                      }
                      className="w-full px-4 py-1.5 sm:py-2.5 sm:text-lg text-center tracking-[0.5em] font-mono border rounded-xl outline-none focus:border-secondary-600 transition-all"
                    />
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full rounded-xl bg-primary py-2.5 sm:py-3.5 text-xs sm:text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                >
                  {verifying ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Verifying…
                    </>
                  ) : (
                    "Verify & Sign In"
                  )}
                </button>
                {/* Resend */}
                <div className="text-center">
                  {resendIn > 0 ? (
                    <p className="text-xs text-secondary-600">
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

            <a
              href="mailto:support@damini.com"
              className="group inline-flex items-center gap-2 font-medium text-xs md:text-sm text-primary transition-all duration-300 hover:gap-3 mt-10"
            >
              Contact Support
              <span className="transition-transform duration-300 group-hover:translate-x-1">
                →
              </span>
            </a>
          </div>
        </div>
      </div>
      <p className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full text-center text-xs text-secondary">
        © {new Date().getFullYear()} The Damini Edit. All rights reserved.
      </p>
    </div>
  );
}
