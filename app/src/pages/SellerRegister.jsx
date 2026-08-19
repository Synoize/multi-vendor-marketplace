import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useNavigate, Link } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { useVendorStore } from "@/store/vendorStore";
import LegalModal from "@/components/ui/LegalModal";
import Spinner from "@/components/ui/Spinner";
import {
  Store,
  Shield,
  TrendingUp,
  Star,
  Zap,
  CheckCircle,
  ChevronRight,
  ChevronDown,
  Clock,
  IndianRupee,
  BarChart3,
  Target,
  Lock,
  FileText,
  CreditCard,
  MapPin,
  User,
  Phone,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Upload,
  Image,
  File,
  X,
  Check,
  Mail,
  SendHorizonal,
  XCircle,
} from "lucide-react";

const STEPS = [
  { label: "Store", icon: Store },
  { label: "Business", icon: FileText },
  { label: "Bank", icon: CreditCard },
  { label: "Docs", icon: Upload },
  { label: "Review", icon: CheckCircle },
];

const BUSINESS_TYPES = [
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
];

export default function SellerRegister() {
  const navigate = useNavigate();
  const { isAuthenticated, user, isLoading, checkAuth } = useAuthStore();
  const {
    otpSent,
    emailVerified,
    otpLoading,
    sendBusinessOtp,
    verifyBusinessOtp,
    submitKyc,
  } = useVendorStore();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [businessTypeOpen, setBusinessTypeOpen] = useState(false);
  const businessTypeRef = useRef(null);
  const [emailOtp, setEmailOtp] = useState("");
  const [legalModal, setLegalModal] = useState(null);
  const [agreedTerms, setAgreedTerms] = useState(false);
  const [agreedPrivacy, setAgreedPrivacy] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const vendorStatus = user?.vendor_status;
  const isUnderReview =
    vendorStatus &&
    ["pending", "submitted", "under_review"].includes(vendorStatus);
  const isRejected = vendorStatus === "rejected";

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (
        businessTypeRef.current &&
        !businessTypeRef.current.contains(e.target)
      ) {
        setBusinessTypeOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const [form, setForm] = useState({
    business_name: "",
    business_type: "sole_proprietorship",
    business_email: "",
    gst_number: "",
    pan_number: "",
    store_name: "",
    store_description: "",
    bank_name: "",
    account_number: "",
    ifsc_code: "",
    account_holder: "",
    pickup_name: "",
    pickup_phone: "",
    pickup_line1: "",
    pickup_city: "",
    pickup_state: "",
    pickup_pincode: "",
  });

  const [files, setFiles] = useState({});
  const fileInputRefs = {};

  const update = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setFile = (key, file) => {
    setFiles((prev) => {
      const next = { ...prev };
      if (file) next[key] = file;
      else delete next[key];
      return next;
    });
  };

  const handleSendEmailOtp = async () => {
    if (
      !form.business_email ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.business_email)
    ) {
      toast.error("Enter a valid business email address");
      return;
    }
    const result = await sendBusinessOtp(form.business_email);
    if (result.success) {
      toast.success("OTP sent to business email");
    } else {
      toast.error(result.message);
    }
  };

  const handleVerifyEmailOtp = async () => {
    if (!emailOtp) {
      toast.error("Enter the OTP sent to your business email");
      return;
    }
    const result = await verifyBusinessOtp(emailOtp);
    if (result.success) {
      toast.success("Business email verified");
    } else {
      toast.error(result.message);
    }
  };

  const handleSubmit = async () => {
    if (!agreedTerms || !agreedPrivacy) {
      toast.error(
        "Please read and accept the Terms & Conditions and Privacy Policy to continue",
      );
      return;
    }
    setLoading(true);
    try {
      if (!isAuthenticated) {
        toast.error("Please login first to register as a seller");
        navigate("/login");
        return;
      }
      const formData = new FormData();
      Object.entries(form).forEach(([k, v]) => formData.append(k, v));
      Object.entries(files).forEach(([k, v]) => formData.append(k, v));
      const result = await submitKyc(formData);
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      toast.success(
        "KYC submitted successfully! Our team will review within 24-48 hours.",
      );
      await useAuthStore.getState().checkAuth();
      navigate("/profile");
    } catch (err) {
      toast.error(err.response?.data?.message || "Submission failed");
    } finally {
      setLoading(false);
    }
  };

  const canNext = () => {
    if (step === 0) return form.store_name.trim();
    if (step === 1)
      return (
        form.business_name.trim() &&
        form.pan_number.trim() &&
        emailVerified &&
        form.pickup_line1.trim() &&
        form.pickup_city.trim() &&
        form.pickup_state.trim() &&
        form.pickup_pincode.trim()
      );
    if (step === 2)
      return (
        form.bank_name.trim() &&
        form.account_number.trim() &&
        form.ifsc_code.trim() &&
        form.account_holder.trim()
      );
    if (step === 3) return allRequiredFiles.every((k) => files[k]);
    return true;
  };

  const DOCUMENTS = [
    {
      key: "passport_photo",
      label: "Passport Size Photograph",
      icon: Image,
      required: true,
    },
    { key: "pan_image", label: "PAN Card", icon: File, required: true },
    {
      key: "aadhar",
      label: "Aadhaar Card",
      icon: File,
      required: true,
      isGroup: true,
      children: [
        { key: "aadhar_image_front", label: "(Front)", required: true },
        { key: "aadhar_image_back", label: "(Back)", required: true },
      ],
    },
    {
      key: "udyam_certificate",
      label: "Udyam Registration (MSME)",
      icon: File,
      required: false,
    },
    {
      key: "bank_passbook",
      label: "Bank Passbook / Statement",
      icon: File,
      required: true,
    },
    {
      key: "cancelled_cheque",
      label: "Cancelled Cheque",
      icon: File,
      required: false,
    },
  ];

  const allRequiredFiles = DOCUMENTS.flatMap((d) =>
    d.isGroup
      ? d.children.filter((c) => c.required).map((c) => c.key)
      : d.required
        ? [d.key]
        : [],
  );

  return (
    <>
      <Helmet>
        <title>Sell on The Damini Edit - Register as a Seller</title>
        <meta
          name="description"
          content="Join  The Damini Edit Marketplace as a seller and reach millions of customers across India. Easy registration, instant payouts, and powerful seller tools."
        />
      </Helmet>

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-accent text-white py-8 sm:py-12 lg:py-16 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
            <Store
              strokeWidth={1.5}
              className="h-6 w-6 sm:h-7 sm:w-7 text-yellow-300"
            />
          </div>
          <h1 className="text-xl sm:text-3xl lg:text-4xl font-medium mb-2 sm:mb-4">
            Sell on The Damini Edit<sup className="ml-0.5">™</sup>
          </h1>
          <p className="text-secondary text-sm sm:text-base lg:text-lg max-w-xl mx-auto">
            Join 50,000+ sellers and reach crores of customers across India.
            Start selling today for free!
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-6 mt-6 sm:mt-8">
            {[
              {
                icon: Clock,
                title: "Quick Setup",
                sub: "15 min onboarding",
                color: "text-emerald-400",
              },
              {
                icon: IndianRupee,
                title: "Low Fees",
                sub: "Only 3-5% commission",
                color: "text-yellow-400",
              },
              {
                icon: BarChart3,
                title: "Analytics",
                sub: "Real-time insights",
                color: "text-sky-400",
              },
              {
                icon: Target,
                title: "Ads Platform",
                sub: "Boost your sales",
                color: "text-orange-400",
              },
            ].map(({ icon: Icon, title, sub, color }) => (
              <div key={title} className="text-center">
                <Icon
                  strokeWidth={1.5}
                  className={`h-6 w-6 mx-auto mb-1.5 ${color}`}
                />
                <div className="font-semibold text-xs sm:text-sm">{title}</div>
                <div className="text-secondary text-[10px] sm:text-xs">
                  {sub}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
        {isLoading ? (
          <div className="py-24 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        ) : isAuthenticated && user?.role === "vendor" ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-secondary-100 flex items-center justify-center mx-auto mb-3">
              <CheckCircle className="h-7 w-7 text-green-500" />
            </div>
            <h2 className="text-xl font-semibold text-secondary-950 mb-1">
              You're already a seller!
            </h2>
            <p className="text-secondary-700 text-sm mb-5">
              Manage your store from the Vendor Dashboard
            </p>
            <Link
              to="https://www.vendor.thedaminiedit.com"
              className="bg-primary text-white px-6 sm:px-8 py-3 rounded-lg text-sm hover:bg-opacity-90 transition-colors inline-block"
            >
              Go to Seller Hub →
            </Link>
          </div>
        ) : isAuthenticated && isUnderReview ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
              <Clock className="h-7 w-7 text-amber-500" />
            </div>
            <h2 className="text-xl font-medium text-secondary-950 mb-1">
              Your seller application is under review
            </h2>
            <p className="text-secondary-700 text-xs mb-5">
              Our team is verifying your KYC documents. You'll be able to start
              selling within 24-48 hours.
            </p>
            <Link
              to="/profile"
              className="bg-primary text-white px-6 sm:px-8 py-3 rounded-xl text-xs hover:bg-opacity-90 transition-colors inline-block"
            >
              Go to My Profile
            </Link>
          </div>
        ) : isAuthenticated && isRejected && !showForm ? (
          <div className="bg-white rounded-2xl shadow-sm p-6 sm:p-8 text-center">
            <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-3">
              <XCircle className="h-7 w-7 text-red-500" />
            </div>
            <h2 className="text-xl font-semibold text-secondary-950 mb-1">
              Your seller application was rejected
            </h2>
            {user?.vendor_rejected_reason && (
              <p className="text-red-600 text-sm mb-2">
                Reason: {user.vendor_rejected_reason}
              </p>
            )}
            <p className="text-secondary-700 text-sm mb-5">
              Please correct the issues and re-apply to become a seller.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => setShowForm(true)}
                className="bg-primary text-white px-6 sm:px-8 py-3 rounded-xl text-xs hover:bg-opacity-90 transition-colors"
              >
                Re-apply
              </button>
              <Link
                to="/profile"
                className="border border-secondary-300 text-secondary-900 px-6 sm:px-8 py-3 rounded-xl text-xs hover:bg-secondary-50 transition-colors"
              >
                Go to My Profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border shadow-sm overflow-hidden">
            {/* Stepper */}
            <div className="bg-secondary-50 px-4 sm:px-6 py-3 sm:py-4 border-b">
              <div className="flex items-center gap-1 sm:gap-2">
                {STEPS.map((s, i) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-1 sm:gap-2 flex-1 last:flex-grow-0"
                  >
                    <div
                      className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${i < step ? "bg-green-600 text-white" : i === step ? "bg-primary text-white" : "bg-secondary-200 text-secondary-800"}`}
                    >
                      {i < step ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <s.icon strokeWidth={1.5} className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span
                      className={`text-[11px] sm:text-xs font-medium hidden sm:block whitespace-nowrap ${i === step ? "text-primary font-semibold" : i < step ? "text-green-600" : "text-secondary-800"}`}
                    >
                      {s.label}
                    </span>
                    {i < STEPS.length - 1 && (
                      <hr
                        className={`flex-1 border-t-[2px] rounded-full ${
                          i < step ? "border-green-500" : "border-secondary-300"
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>
              {/* Mobile step label */}
              <p className="sm:hidden text-[10px] font-medium text-primary mt-2 text-center">
                Step {step + 1} of {STEPS.length}: {STEPS[step].label}
              </p>
            </div>

            <div className="p-4 sm:p-6">
              {/* Step 0: Basic Info */}
              {step === 0 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg text-secondary-950">
                      Store Information
                    </h2>
                    <p className="text-secondary-700 text-xs mt-0.5">
                      Tell customers about your store
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Store Name *
                      </label>
                      <input
                        value={form.store_name}
                        onChange={(e) => update("store_name", e.target.value)}
                        placeholder="e.g. Ravi Electronics"
                        className="w-full border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                    <div className="relative" ref={businessTypeRef}>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Business Type *
                      </label>
                      <button
                        type="button"
                        onClick={() => setBusinessTypeOpen(!businessTypeOpen)}
                        className="w-full flex items-center justify-between border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-secondary-600 transition-colors text-left bg-white"
                      >
                        <span className="text-secondary-950">
                          {
                            BUSINESS_TYPES.find(
                              (t) => t.value === form.business_type,
                            )?.label
                          }
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-secondary-800 transition-transform ${businessTypeOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {businessTypeOpen && (
                        <div className="absolute top-full left-0 mt-1 w-full z-20 rounded-lg bg-white shadow-sm border py-1">
                          {BUSINESS_TYPES.map((t) => (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => {
                                update("business_type", t.value);
                                setBusinessTypeOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 text-xs z-20 transition-colors ${form.business_type === t.value ? "bg-primary-50 text-primary font-medium" : "text-secondary-900 hover:bg-secondary-50"}`}
                            >
                              {t.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Store Description
                    </label>

                    <textarea
                      value={form.store_description}
                      onChange={(e) =>
                        update("store_description", e.target.value)
                      }
                      rows={3}
                      placeholder="Tell customers what you sell and why they should buy from you..."
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm outline-none focus:border-secondary-600 resize-none"
                    />
                  </div>

                  {!isAuthenticated && (
                    <div className="bg-secondary border rounded-lg p-3 text-xs sm:text-sm text-secondary-900 flex items-start gap-2">
                      <Zap className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <span>
                        Please{" "}
                        <Link
                          to="/login"
                          className="font-semibold text-secondary-950 underline"
                        >
                          login
                        </Link>{" "}
                        or{" "}
                        <Link
                          to="/signup"
                          className="font-semibold text-secondary-950 underline"
                        >
                          create an account
                        </Link>{" "}
                        before completing registration.
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Step 1: Business Info */}
              {step === 1 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg text-secondary-950">
                      Business & Pickup Info
                    </h2>
                    <p className="text-secondary-700 text-xs mt-0.5">
                      Tax details and pickup address
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Business / Legal Name *
                    </label>
                    <input
                      value={form.business_name}
                      onChange={(e) => update("business_name", e.target.value)}
                      placeholder="Registered business name"
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        GST Number
                      </label>
                      <input
                        value={form.gst_number}
                        onChange={(e) => update("gst_number", e.target.value)}
                        placeholder="15-digit GSTIN (optional)"
                        className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        PAN Number *
                      </label>
                      <input
                        value={form.pan_number}
                        onChange={(e) => update("pan_number", e.target.value)}
                        placeholder="AAAAA0000A"
                        className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                  </div>

                  {/* Business Email */}
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Business Email *
                    </label>
                    <div className="flex flex-wrap gap-2 items-center justify-between">
                      <input
                        value={form.business_email}
                        onChange={(e) =>
                          update("business_email", e.target.value)
                        }
                        placeholder="contact@yourbusiness.com"
                        disabled={emailVerified}
                        className="flex-1 border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600 disabled:bg-secondary disabled:text-secondary-800"
                      />
                      {!emailVerified && (
                        <button
                          type="button"
                          onClick={handleSendEmailOtp}
                          disabled={otpLoading || !form.business_email}
                          className="flex items-center gap-1.5 px-3 sm:px-4 sm:py-3 py-2.5 bg-primary text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                        >
                          {otpLoading ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : otpSent ? (
                            "Resend"
                          ) : (
                            <>
                              <SendHorizonal className="h-3.5 w-3.5" /> Send OTP
                            </>
                          )}
                        </button>
                      )}
                      {emailVerified ? (
                        <p className="flex items-center gap-1 text-xs text-green-600 font-medium ">
                          <CheckCircle className="h-3.5 w-3.5" /> Business email
                          verified
                        </p>
                      ) : (
                        otpSent && (
                          <div className="flex gap-2 items-center justify-between">
                            <input
                              value={emailOtp}
                              onChange={(e) =>
                                setEmailOtp(
                                  e.target.value.replace(/\D/g, "").slice(0, 6),
                                )
                              }
                              placeholder="Enter 6-digit OTP"
                              maxLength={6}
                              className="w-32 border rounded-lg px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                            />
                            <button
                              type="button"
                              onClick={handleVerifyEmailOtp}
                              disabled={otpLoading || emailOtp.length < 6}
                              className="flex items-center gap-1.5 px-3 sm:px-4 sm:py-3 py-2.5 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
                            >
                              {otpLoading ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                "Verify"
                              )}
                            </button>
                          </div>
                        )
                      )}
                    </div>
                  </div>

                  {/* Pickup Address */}
                  <div className="border-t-2 border-dashed pt-4 mt-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin
                        strokeWidth={1.5}
                        className="h-4 w-4 text-primary"
                      />
                      <h3 className="font-semibold text-sm text-secondary-950">
                        Pickup Address
                      </h3>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        <div className="col-span-2 sm:col-span-1">
                          <label className="block text-xs font-medium text-secondary-800 mb-1">
                            Pincode *
                          </label>
                          <input
                            value={form.pickup_pincode}
                            onChange={(e) =>
                              update("pickup_pincode", e.target.value)
                            }
                            placeholder="6-digit"
                            className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-800 mb-1">
                            City *
                          </label>
                          <input
                            value={form.pickup_city}
                            onChange={(e) =>
                              update("pickup_city", e.target.value)
                            }
                            placeholder="City"
                            className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-800 mb-1">
                            State *
                          </label>
                          <input
                            value={form.pickup_state}
                            onChange={(e) =>
                              update("pickup_state", e.target.value)
                            }
                            placeholder="State"
                            className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-secondary-800 mb-1">
                          Full Address *
                        </label>
                        <input
                          value={form.pickup_line1}
                          onChange={(e) =>
                            update("pickup_line1", e.target.value)
                          }
                          placeholder="House No, Building, Street, Area"
                          className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-secondary-800 mb-1">
                            Contact Name *
                          </label>
                          <input
                            value={form.pickup_name}
                            onChange={(e) =>
                              update("pickup_name", e.target.value)
                            }
                            placeholder="Contact person name"
                            className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-secondary-800 mb-1">
                            Contact Phone *
                          </label>
                          <input
                            value={form.pickup_phone}
                            onChange={(e) =>
                              update("pickup_phone", e.target.value)
                            }
                            placeholder="10-digit mobile"
                            className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Bank Details */}
              {step === 2 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg text-secondary-950">
                      Bank Details
                    </h2>
                    <p className="text-secondary-700 text-xs mt-0.5">
                      Your payouts will be deposited to this account
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Bank Name *
                    </label>
                    <input
                      value={form.bank_name}
                      onChange={(e) => update("bank_name", e.target.value)}
                      placeholder="e.g. State Bank of India"
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Account Holder Name *
                    </label>
                    <input
                      value={form.account_holder}
                      onChange={(e) => update("account_holder", e.target.value)}
                      placeholder="As per bank records"
                      className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Account Number *
                      </label>
                      <input
                        value={form.account_number}
                        onChange={(e) =>
                          update("account_number", e.target.value)
                        }
                        placeholder="Bank account number"
                        className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        IFSC Code *
                      </label>
                      <input
                        value={form.ifsc_code}
                        onChange={(e) => update("ifsc_code", e.target.value)}
                        placeholder="e.g. SBIN0001234"
                        className="w-full border rounded-lg px-3 sm:px-4 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                  </div>
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                    <Lock className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      Your bank details are encrypted and stored securely.
                      Payouts are processed within 7 business days.
                    </span>
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {step === 3 && (
                <div className="space-y-4">
                  <div>
                    <h2 className="font-semibold text-base sm:text-lg text-secondary-950">
                      Upload Documents
                    </h2>
                    <p className="text-secondary-700 text-xs mt-0.5">
                      Upload clear scanned copies or photos of the following
                      documents
                    </p>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-3">
                    {DOCUMENTS.map((doc) => {
                      if (doc.isGroup) {
                        return (
                          <div
                            key={doc.key}
                            className="border-2 border-dashed rounded-lg p-3"
                          >
                            <div className="flex items-start gap-3">
                              <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                                <doc.icon
                                  strokeWidth={1.5}
                                  className="h-4 w-4 text-secondary-900"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1">
                                  <p className="text-xs font-medium text-secondary-950">
                                    {doc.label}
                                  </p>
                                  {doc.required && (
                                    <span className="text-red-400 text-xs">
                                      *
                                    </span>
                                  )}
                                </div>
                                <div className="mt-2 grid grid-cols-2 gap-2">
                                  {doc.children.map((child) => (
                                    <div key={child.key}>
                                      {files[child.key] ? (
                                        <div className="flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
                                          <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                          <span className="text-[11px] text-secondary-900 truncate flex-1">
                                            {files[child.key].name}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              setFile(child.key, null)
                                            }
                                            className="p-0.5 rounded hover:bg-primary-100 flex-shrink-0"
                                          >
                                            <X className="h-3 w-3 text-secondary-800" />
                                          </button>
                                        </div>
                                      ) : (
                                        <div className="flex items-center justify-start gap-2">
                                          <div>
                                            <input
                                              type="file"
                                              accept="image/*,application/pdf"
                                              id={`file-${child.key}`}
                                              className="hidden"
                                              onChange={(e) => {
                                                const f = e.target.files?.[0];
                                                if (f) setFile(child.key, f);
                                              }}
                                            />

                                            <label
                                              htmlFor={`file-${child.key}`}
                                              className="inline-flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer hover:underline"
                                            >
                                              <Upload className="h-3.5 w-3.5" />
                                              Upload
                                            </label>
                                          </div>
                                          <p className="text-xs font-medium text-secondary-800">
                                            {child.label}
                                          </p>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return (
                        <div
                          key={doc.key}
                          className="border-2 border-dashed rounded-lg p-3"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center flex-shrink-0 mt-0.5">
                              <doc.icon
                                strokeWidth={1.5}
                                className="h-4 w-4 text-secondary-900"
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1">
                                <p className="text-xs font-medium text-secondary-950 truncate">
                                  {doc.label}
                                </p>
                                {doc.required && (
                                  <span className="text-red-400 text-xs">
                                    *
                                  </span>
                                )}
                              </div>
                              {files[doc.key] ? (
                                <div className="mt-2 flex items-center gap-2 bg-secondary rounded-lg px-3 py-1.5">
                                  <CheckCircle className="h-3 w-3 text-green-500 flex-shrink-0" />
                                  <span className="text-[11px] text-secondary-900 truncate flex-1">
                                    {files[doc.key].name}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => setFile(doc.key, null)}
                                    className="p-0.5 rounded hover:bg-primary-100 flex-shrink-0"
                                  >
                                    <X className="h-3 w-3 text-secondary-800" />
                                  </button>
                                </div>
                              ) : (
                                <div className="mt-2">
                                  <input
                                    type="file"
                                    accept="image/*,application/pdf"
                                    id={`file-${doc.key}`}
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) setFile(doc.key, f);
                                    }}
                                  />
                                  <label
                                    htmlFor={`file-${doc.key}`}
                                    className="inline-flex items-center gap-1.5 text-xs text-primary font-medium cursor-pointer hover:underline"
                                  >
                                    <Upload className="h-3.5 w-3.5" /> Upload
                                  </label>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700 flex items-start gap-2">
                    <Shield className="h-4 w-4 flex-shrink-0 mt-0.5" />
                    <span>
                      All documents are encrypted and stored securely. They are
                      used only for KYC verification as per regulatory
                      requirements.
                    </span>
                  </div>
                </div>
              )}

              {/* Step 4: Review */}
              {step === 4 && (
                <div className="text-center py-2 sm:py-4">
                  <div className="flex items-center justify-center mx-auto mb-3">
                    <CheckCircle
                      strokeWidth={1.5}
                      className="h-10 w-10 text-green-500"
                    />
                  </div>
                  <h2 className="text-lg sm:text-xl font-semibold text-secondary-950 mb-1">
                    Ready to Submit!
                  </h2>
                  <p className="text-secondary-700 text-xs sm:text-sm mb-5">
                    Review your information. Our team will verify within 24-48
                    hours.
                  </p>
                  <div className="bg-secondary rounded-lg p-4 text-left text-sm space-y-2.5 mb-4">
                    {[
                      { label: "Store", value: form.store_name },
                      { label: "Business", value: form.business_name },
                      { label: "Business Email", value: form.business_email },
                      {
                        label: "Type",
                        value: form.business_type?.replace(/_/g, " "),
                      },
                      {
                        label: "PAN",
                        value: form.pan_number,
                        sensitive: true,
                      },
                      {
                        label: "GST",
                        value: form.gst_number || "Not provided",
                        sensitive: true,
                      },
                      { label: "Bank", value: form.bank_name },
                      {
                        label: "Account",
                        value: form.account_number,
                        sensitive: true,
                      },
                      {
                        label: "IFSC",
                        value: form.ifsc_code,
                        sensitive: true,
                      },
                      {
                        label: "Pickup",
                        value: `${form.pickup_line1}, ${form.pickup_city}, ${form.pickup_state} - ${form.pickup_pincode}`,
                      },
                    ].map(({ label, value, sensitive }) => (
                      <div key={label} className="flex justify-between gap-2">
                        <span className="text-secondary-800 text-xs">
                          {label}
                        </span>

                        {sensitive ? (
                          <span className="group relative cursor-pointer text-right text-xs font-medium text-secondary-950">
                            {/* Masked */}
                            <span className="group-hover:hidden">
                              {value
                                ? `${"•".repeat(Math.max(String(value).length - 4, 0))}${String(value).slice(-4)}`
                                : ""}
                            </span>

                            {/* Actual */}
                            <span className="hidden group-hover:inline">
                              {value}
                            </span>
                          </span>
                        ) : (
                          <span className="text-right text-xs font-medium text-secondary-950 capitalize">
                            {value}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Legal Agreement */}
                  <div className="bg-white p-2 text-left">
                    <div className="flex items-center gap-2 mb-3">
                      <Shield
                        strokeWidth={1.5}
                        className="h-4 w-4 text-primary"
                      />
                      <h3 className="font-medium text-sm text-secondary-950">
                        Agreements
                      </h3>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="agree-terms"
                          checked={agreedTerms}
                          onChange={(e) => setAgreedTerms(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-secondary-300 text-primary focus:ring-primary"
                        />
                        <div className="text-xs text-secondary-800">
                          I have read and agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setLegalModal("terms")}
                            className="text-primary font-medium hover:underline inline"
                          >
                            Terms & Conditions
                          </button>
                          {!agreedTerms && (
                            <span className="text-red-400"> *</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          id="agree-privacy"
                          checked={agreedPrivacy}
                          onChange={(e) => setAgreedPrivacy(e.target.checked)}
                          className="mt-0.5 h-4 w-4 rounded border-secondary-300 text-primary focus:ring-primary"
                        />
                        <div className="text-xs text-secondary-800">
                          I have read and agree to the{" "}
                          <button
                            type="button"
                            onClick={() => setLegalModal("privacy")}
                            className="text-primary font-medium hover:underline inline"
                          >
                            Privacy Policy
                          </button>
                          {!agreedPrivacy && (
                            <span className="text-red-400"> *</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation */}
              <div className="flex gap-3 mt-4">
                {step > 0 && (
                  <button
                    onClick={() => setStep((s) => s - 1)}
                    className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 border rounded-xl text-xs sm:text-sm font-semibold text-secondary-900 hover:bg-secondary-50 transition-colors"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                )}
                {step < STEPS.length - 1 ? (
                  <button
                    onClick={() => setStep((s) => s + 1)}
                    disabled={!canNext()}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-primary hover:bg-opacity-90 disabled:opacity-60 disabled:cursor-not-allowed text-white py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-colors"
                  >
                    Continue <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={loading || !agreedTerms || !agreedPrivacy}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-opacity-90 disabled:opacity-60 text-white py-2.5 sm:py-3 rounded-xl text-xs sm:text-sm transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    {loading ? "Submitting..." : "Submit for Review"}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mt-6 sm:mt-8">
          {[
            {
              icon: Shield,
              title: "Secure Payouts",
              desc: "Weekly payouts directly to your bank account",
              color: "text-emerald-500", // Trust, security, money
              bg: "bg-emerald-100",
            },
            {
              icon: TrendingUp,
              title: "Seller Analytics",
              desc: "Track sales, revenue and customer insights",
              color: "text-sky-500", // Growth, insights
              bg: "bg-sky-100",
            },
            {
              icon: Zap,
              title: "Ad Campaigns",
              desc: "Boost product visibility with targeted ads",
              color: "text-amber-500", // Promotion, attention
              bg: "bg-amber-100",
            },
          ].map(({ icon: Icon, title, desc, color }) => (
            <div
              key={title}
              className="bg-white rounded-xl border border-secondary-200 p-4 sm:p-5 shadow-sm text-center"
            >
              <Icon
                strokeWidth={1.5}
                className={`h-6 w-6 mx-auto mb-2 ${color}`}
              />
              <h3 className="font-semibold text-secondary-950 mb-0.5 text-xs sm:text-sm">
                {title}
              </h3>
              <p className="text-secondary-700 text-[11px] sm:text-xs">
                {desc}
              </p>
            </div>
          ))}
        </div>
      </div>

      {legalModal && (
        <LegalModal type={legalModal} onClose={() => setLegalModal(null)} />
      )}
    </>
  );
}
