import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useSupportStore } from "@/store/supportStore";
import { toast } from "sonner";
import {
  Phone,
  Mail,
  MapPin,
  Send,
  Clock,
  MessageCircle,
  ChevronRight,
  ChevronDown,
  Headphones,
  HelpCircle,
  Loader2,
} from "lucide-react";
import { Link } from "react-router-dom";

const SUBJECT_OPTIONS = [
  { value: "order", label: "Order Issue" },
  { value: "payment", label: "Payment" },
  { value: "product", label: "Product Query" },
  { value: "return", label: "Return / Refund" },
  { value: "account", label: "Account" },
  { value: "other", label: "Other" },
];

const CONTACT_CARDS = [
  {
    icon: Phone,
    title: "Call Us",
    value: "+91 9800000000",
    sub: "Mon-Sat, 9AM - 6PM IST",
    href: "tel:+919800000000",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Mail,
    title: "Email Us",
    value: "support@The Damini Edit.com",
    sub: "We reply within 24 hours",
    href: "mailto:support@The Damini Edit.com",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
  {
    icon: MapPin,
    title: "Visit Us",
    value: "23 BESA Road, Nagpur",
    sub: "Maharashtra - 440037, India",
    href: null,
    color: "text-green-500",
    bg: "bg-green-50",
  },
];

const FAQs = [
  {
    q: "How do I track my order?",
    a: "Go to My Orders from your profile, click on the order to see real-time tracking details and estimated delivery date.",
  },
  {
    q: "What is the return policy?",
    a: "Most items can be returned within 7 days of delivery. The item should be unused and in its original packaging. Some categories have different return windows.",
  },
  {
    q: "How do I contact a seller directly?",
    a: "Open the product page and click on the seller name to visit their store. You can raise a support ticket mentioning the seller and order number.",
  },
  {
    q: "Is COD available?",
    a: "Yes, Cash on Delivery is available for most products and pincodes. You can check availability at checkout.",
  },
];

export default function Contact() {
  const { user } = useAuthStore();
  const [subject, setSubject] = useState("order");
  const [subjectOpen, setSubjectOpen] = useState(false);
  const subjectRef = useRef(null);
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [message, setMessage] = useState("");
  const [openFaq, setOpenFaq] = useState(null);

  useEffect(() => {
    const handler = (e) => {
      if (subjectRef.current && !subjectRef.current.contains(e.target)) {
        setSubjectOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mutation = useMutation({
    mutationFn: (data) => useSupportStore.getState().createTicket(data),
    onSuccess: () => {
      toast.success("Message sent! We'll get back to you soon.");
      setSubject("order");
      setName(user?.name || "");
      setEmail(user?.email || "");
      setPhone(user?.phone || "");
      setMessage("");
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to send message");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim() || !message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    mutation.mutate({
      subject: `${name} - ${SUBJECT_OPTIONS.find((s) => s.value === subject)?.label || subject}`,
      category: subject,
      message: `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\n${message}`,
    });
  };

  const selectedSubject = SUBJECT_OPTIONS.find((s) => s.value === subject);

  return (
    <>
      <Helmet>
        <title>Contact Us - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Get in touch with The Damini Edit support. Call, email, or visit us. We're here to help 24/7."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto min-h-[calc(100vh-120px)] px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Headphones strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Get in Touch
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              Have a question? We'd love to hear from you.
            </p>
          </div>
        </div>

        {/* Contact Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 lg:gap-6 mb-6 sm:mb-8">
          {CONTACT_CARDS.map(
            ({ icon: Icon, title, value, sub, href, color, bg }) => {
              const Card = href ? "a" : "div";

              return (
                <Card
                  key={title}
                  {...(href
                    ? {
                        href,
                        target: "_blank",
                        rel: "noopener noreferrer",
                      }
                    : {})}
                  className="group flex flex-col items-center justify-center
                     rounded-xl md:rounded-2xl border
                     bg-white p-5
                     text-center shadow-sm"
                >
                  {/* Icon */}
                  <div
                    className={`mb-2 flex h-9 w-9 sm:h-12 sm:w-12 lg:h-14 lg:w-14
                        items-center justify-center rounded-lg sm:rounded-xl ${bg}
                        transition-transform duration-300 group-hover:scale-110`}
                  >
                    <Icon
                      strokeWidth={1.5}
                      className={`h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 ${color}`}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-sm sm:text-base font-medium text-secondary-950 leading-tight">
                    {title}
                  </h3>

                  {/* Value */}
                  <p className="mt-1 text-sm text-secondary-900 break-all">
                    {value}
                  </p>

                  {/* Subtitle */}
                  <p className="mt-1 text-xs sm:text-sm text-secondary-800 leading-tight">
                    {sub}
                  </p>
                </Card>
              );
            },
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-8">
          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h2 className=" text-base sm:text-lg text-secondary-950 mb-1">
                Send us a Message
              </h2>
              <p className="text-secondary-700 text-xs mb-5">
                Fill out the form below and we'll respond within 24 hours
              </p>
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Subject Dropdown */}
                <div className="relative" ref={subjectRef}>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Subject *
                  </label>
                  <button
                    type="button"
                    onClick={() => setSubjectOpen(!subjectOpen)}
                    className="w-full flex items-center justify-between border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary transition-colors text-left"
                  >
                    <span className="text-secondary-950">
                      {selectedSubject?.label}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-secondary-800 transition-transform ${subjectOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {subjectOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full z-20 rounded-lg bg-white shadow-lg border py-1">
                      {SUBJECT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setSubject(opt.value);
                            setSubjectOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${subject === opt.value ? "bg-primary-50 text-primary font-medium" : "text-secondary-900 hover:bg-secondary-50"}`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Name *
                    </label>
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-secondary-800 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Phone
                  </label>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-secondary-800 mb-1">
                    Message *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    rows={5}
                    placeholder="How can we help you?"
                    className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 bg-primary hover:bg-primary-700 disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors"
                >
                  {mutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                  {mutation.isPending ? "Sending..." : "Send Message"}
                </button>
              </form>
            </div>
          </div>

          {/* Right: FAQs */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm p-5 sm:p-6">
              <h3 className="font-bold text-secondary-950 text-sm mb-4 flex items-center gap-2">
                <HelpCircle className="h-4 w-4 text-primary" />
                Frequently Asked Questions
              </h3>
              <div className="space-y-2">
                {FAQs.map((faq, i) => (
                  <div
                    key={i}
                    className="border border-secondary-100 rounded-lg overflow-hidden"
                  >
                    <button
                      onClick={() => setOpenFaq(openFaq === i ? null : i)}
                      className="flex items-center justify-between w-full px-3 py-3 text-left hover:bg-secondary-50 transition-colors"
                    >
                      <span className="font-medium text-secondary-900 text-xs pr-2">
                        {faq.q}
                      </span>
                      <ChevronRight
                        className={`h-4 w-4 text-secondary-700 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-90" : ""}`}
                      />
                    </button>
                    {openFaq === i && (
                      <div className="px-3 pb-3 pt-0 text-xs text-secondary-800 leading-relaxed">
                        {faq.a}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-5 pt-4 border-t border-secondary-100">
                <Link
                  to="/support"
                  className="flex items-center justify-between text-primary text-xs font-semibold hover:underline"
                >
                  Visit Help & Support
                  <ChevronRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            {/* Office Hours */}
            <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-4">
              <h3 className="font-bold text-secondary-950 text-sm mb-2">
                Office Hours
              </h3>
              <div className="space-y-1.5 text-xs text-secondary-900">
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                  Monday - Saturday: 9AM - 6PM
                </p>
                <p className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                  Sunday: Closed
                </p>
                <p className="flex items-center gap-2">
                  <MessageCircle className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                  Online support: 24/7
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
