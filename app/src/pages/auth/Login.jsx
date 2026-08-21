import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { ShoppingBag, Mail, Lock } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { assets } from "../../assets/assets";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const referralCode = searchParams.get("ref") || undefined;
  const [step, setStep] = useState("email"); // 'email' | 'otp'
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const handleRequestOTP = async (data) => {
    setLoading(true);
    try {
      await useAuthStore.getState().requestLoginOtp(data.email, referralCode);
      setEmail(data.email);
      setStep("otp");
      toast.success("OTP sent to your email address!");
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    if (!otp || otp.length !== 6) {
      toast.error("Please enter a 6-digit OTP");
      return;
    }
    setLoading(true);
    try {
      const res = await useAuthStore.getState().verifyLoginOtp(email, otp);
      localStorage.setItem("show_welcome", "true");
      toast.success(`Welcome to The Damini Edit!`);
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid or expired OTP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Helmet>
        <title>Login - The Damini Edit Marketplace</title>
      </Helmet>
      <div className="h-screen bg-gradient-to-br from-primary via-primary-500 to-primary-700 flex items-center justify-center p-4">
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

              <h2 className="mt-8 text-4xl leading-tight">The Damini Edit</h2>

              <p className="mt-2 text-sm text-white/90 font-light max-w-md leading-8">
                {step === "email"
                  ? "Sign in to manage your store"
                  : "Enter the OTP sent to your email"}
              </p>

              <div className="mt-10 space-y-4 text-sm font-light">
                <div>✔ Secure OTP Login</div>
                <div>✔ Fast Delivery</div>
                <div>✔ Trusted Sellers</div>
                <div>✔ Safe Payments</div>
              </div>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center justify-center px-6 py-8 md:px-12">
            <div className="w-full max-w-md h-auto">
              {/* Mobile Logo */}
              <img
                src={assets.logo}
                alt=""
                className="w-20 lg:hidden text-center mb-4"
              />

              {step === "email" ? (
                <div className="min-h-[100px]">
                  <h2 className="text-xl sm:text-3xl text-secondary-950">
                    Login or Signup
                  </h2>

                  <p className="mt-2 text-xs sm:text-sm text-secondary-800">
                    We'll send a verification code to your email.
                  </p>

                  {referralCode && (
                    <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-2">
                      <span className="text-amber-600 text-lg">🎁</span>
                      <div>
                        <p className="text-xs font-semibold text-amber-800">
                          You were referred by a friend!
                        </p>
                        <p className="text-[10px] text-amber-700">
                          Get 50 bonus coins on your first purchase
                        </p>
                      </div>
                    </div>
                  )}

                  <form
                    onSubmit={handleSubmit(handleRequestOTP)}
                    className="mt-6 space-y-5"
                  >
                    <div>
                      <label className="text-sm font-medium text-secondary-950">
                        Email Address
                      </label>

                      <div className="relative mt-2 group">
                        <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-secondary-700 transition-colors duration-200 group-focus-within:text-secondary-800" />

                        <input
                          type="email"
                          {...register("email", {
                            required: "Email is required",
                          })}
                          placeholder="you@example.com"
                          className="w-full rounded-xl border border-secondary-500 bg-white py-2.5 sm:py-3.5 pl-12 pr-4 text-xs sm:text-sm text-secondary-950 shadow-sm outline-none transition-all duration-200 focus:border-secondary-800"
                        />
                      </div>

                      {errors.email && (
                        <p className="mt-2 text-sm text-red-500">
                          {errors.email.message}
                        </p>
                      )}
                    </div>

                    <button
                      disabled={loading}
                      className="w-full rounded-xl bg-primary py-2.5 sm:py-3.5 text-xs sm:text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {loading ? "Sending OTP..." : "Send OTP"}
                    </button>
                  </form>
                </div>
              ) : (
                <div className="min-h-[100px]">
                  <h2 className="text-xl sm:text-3xl text-secondary-950">
                    Verify OTP
                  </h2>

                  <div className="mt-4 flex items-center gap-4 justify-between bg-secondary border rounded-xl px-4 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs text-secondary-800">
                        We've sent a verification code to
                      </p>
                      <p className="text-[11px] text-secondary-900 font-medium break-all">
                        {email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStep("email");
                        setOtp("");
                      }}
                      className="text-xs font-semibold text-blue-600 hover:underline flex-shrink-0 ml-2"
                    >
                      Change
                    </button>
                  </div>

                  <form onSubmit={handleVerifyOTP} className="mt-4 space-y-5">
                    <div>
                      <label className="text-sm font-medium text-secondary-900">
                        Verification Code
                      </label>

                      <div className="relative mt-2 group">
                        <input
                          type="text"
                          maxLength={6}
                          value={otp}
                          onChange={(e) =>
                            setOtp(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            )
                          }
                          placeholder="000000"
                          className="w-full px-4 py-1.5 sm:py-2.5 sm:text-lg text-center tracking-[0.5em] font-mono border rounded-xl outline-none focus:border-secondary-600 transition-all"
                        />
                      </div>
                    </div>

                    <button
                      disabled={loading || otp.length !== 6}
                      className="w-full rounded-xl bg-primary py-2.5 sm:py-3.5 text-xs sm:text-sm text-white transition hover:opacity-90 disabled:opacity-60"
                    >
                      {loading ? "Verifying..." : "Verify & Continue"}
                    </button>
                  </form>

                  <p className="group mt-6 w-full text-xs text-center font-medium text-secondary-800">
                    Didn't receive the code?{" "}
                    <button
                      type="button"
                      onClick={() =>
                        useAuthStore
                          .getState()
                          .requestLoginOtp(email)
                          .then(() => toast.success("OTP sent again"))
                      }
                      className="hover:underline text-secondary-950"
                    >
                      Resend OTP
                    </button>
                  </p>
                </div>
              )}

              <Link
                to="/seller-register"
                className="group inline-flex items-center gap-2 font-medium text-xs md:text-sm text-primary transition-all duration-300 hover:gap-3 mt-10"
              >
                Become a Seller
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  →
                </span>
              </Link>
            </div>
          </div>
        </div>
        <p className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full text-center text-xs text-secondary">
          © {new Date().getFullYear()} The Damini Edit. All rights reserved.
        </p>
      </div>
    </>
  );
}
