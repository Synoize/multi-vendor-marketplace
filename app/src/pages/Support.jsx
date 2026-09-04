import { useState, useRef, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { useSupportStore } from "@/store/supportStore";
import { toast } from "sonner";
import {
  MessageCircle,
  Plus,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Send,
  Phone,
  Mail,
  Headphones,
  MessageSquare,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  UserCircle,
  HelpCircle,
  ChevronDown,
  X,
  Search,
  Ticket,
} from "lucide-react";
import { Link } from "react-router-dom";

const CATEGORY_OPTIONS = [
  { value: "order", label: "Order Issue", icon: ShoppingCart },
  { value: "payment", label: "Payment", icon: CreditCard },
  { value: "product", label: "Product Query", icon: PackageSearch },
  { value: "return", label: "Return / Refund", icon: PackageSearch },
  { value: "account", label: "Account", icon: UserCircle },
  { value: "other", label: "Other", icon: HelpCircle },
];
const STATUS_COLORS = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  closed: "bg-green-100 text-green-700",
};

const FAQs = [
  {
    q: "How do I track my order?",
    a: "Go to My Orders from your profile, click on the order to see the tracking details and estimated delivery date.",
  },
  {
    q: "What is the return policy?",
    a: "Most items can be returned within 7 days of delivery. The item should be unused and in its original packaging. Some categories have different return windows.",
  },
  {
    q: "How long does delivery take?",
    a: "Standard delivery takes 3-7 business days. Express delivery (same day/next day) is available for select pincodes.",
  },
  {
    q: "How do I cancel an order?",
    a: 'You can cancel an order within 15 minutes of placing it. Go to My Orders and click "Cancel Order". After 15 minutes, you would need to contact support.',
  },
  {
    q: "Is COD available?",
    a: "Yes, Cash on Delivery is available for most products and pincodes. You can check availability at checkout.",
  },
  {
    q: "How do I become a seller?",
    a: 'Click "Sell on The Damini Edit" and complete the seller registration process. After KYC verification (24-48 hours), you can start listing products.',
  },
];

export default function Support() {
  const { isAuthenticated } = useAuthStore();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "order",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [openTicket, setOpenTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [faqSearch, setFaqSearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const categoryRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const data = await useSupportStore.getState().fetchTickets();
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ["ticket", openTicket],
    queryFn: async () => {
      const data = await useSupportStore.getState().fetchTicket(openTicket);
      return data;
    },
    enabled: !!openTicket,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      toast.error("Please login to create a support ticket");
      return;
    }
    setSubmitting(true);
    try {
      await useSupportStore.getState().createTicket(form);
      toast.success("Support ticket created! We will get back to you soon.");
      setShowForm(false);
      setForm({ subject: "", category: "order", message: "" });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim()) return;
    try {
      await useSupportStore.getState().replyTicket(openTicket, reply);
      setReply("");
      toast.success("Reply sent");
    } catch {
      toast.error("Failed to send reply");
    }
  };

  const filteredFAQs = faqSearch
    ? FAQs.filter(
        (f) =>
          f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
          f.a.toLowerCase().includes(faqSearch.toLowerCase()),
      )
    : FAQs;

  const selectedCategory = CATEGORY_OPTIONS.find(
    (c) => c.value === form.category,
  );

  const openTickets = tickets.filter((t) => t.status !== "closed");
  const closedTickets = tickets.filter((t) => t.status === "closed");

  return (
    <>
      <Helmet>
        <title>Help & Support - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Get help with your orders, payments, returns, and more. Contact The Damini Edit support 24/7."
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
              How can we help you?
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              24/7 support for all your queries
            </p>
          </div>
        </div>

        {/* Mobile: Tickets first (if logged in) */}
        {isAuthenticated && tickets.length > 0 && (
          <div className="lg:hidden mb-6">
            <div className="bg-white border border-secondary-200 rounded-xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-secondary-950 text-sm flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-primary" />
                  My Tickets ({tickets.length})
                </h2>
                {!showForm && (
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-primary text-xs font-semibold flex items-center gap-1"
                  >
                    <Plus className="h-3.5 w-3.5" /> New
                  </button>
                )}
              </div>
              <div className="space-y-2">
                {tickets.slice(0, 3).map((ticket) => (
                  <button
                    key={ticket.id}
                    onClick={() => setOpenTicket(ticket.id)}
                    className="w-full text-left p-3 border rounded-lg hover:border-primary hover:bg-primary-50/50 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span
                        className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ticket.status?.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-secondary-700">
                        {new Date(ticket.created_at).toLocaleDateString(
                          "en-IN",
                          { month: "short", day: "numeric" },
                        )}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-secondary-900 line-clamp-1">
                      {ticket.subject}
                    </p>
                    <p className="text-[11px] text-secondary-700 mt-0.5 capitalize">
                      {ticket.category}
                    </p>
                  </button>
                ))}
                {tickets.length > 3 && (
                  <p className="text-center text-xs text-primary font-medium pt-1">
                    View all {tickets.length} tickets →
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 sm:gap-6">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-5 sm:space-y-6">
            {/* FAQ */}
            <div className="bg-white border border-secondary-200 rounded-xl shadow-sm p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                <h2 className="font-semibold text-sm sm:text-xl text-secondary-950">
                  Frequently Asked Questions
                </h2>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-secondary-700" />
                  <input
                    value={faqSearch}
                    onChange={(e) => setFaqSearch(e.target.value)}
                    placeholder="Search FAQs..."
                    className="w-full sm:w-52 border border-secondary-200 shadow-sm rounded-lg pl-8 pr-3 py-2 text-xs outline-none focus:border-secondary-600 transition-colors"
                  />
                </div>
              </div>
              <div className="space-y-2">
                {filteredFAQs.length === 0 ? (
                  <p className="text-center text-secondary-700 text-sm py-6">
                    No matching questions found
                  </p>
                ) : (
                  filteredFAQs.map((faq, i) => (
                    <FAQItem key={i} q={faq.q} a={faq.a} />
                  ))
                )}
              </div>
            </div>

            {/* Create Ticket */}
            {isAuthenticated && (
              <div className="bg-white border border-secondary-200 rounded-xl shadow-sm p-4 sm:p-6">
                <div className="flex items-center justify-between mb-4 gap-2">
                  <h2 className="font-semibold text-sm sm:text-xl text-secondary-950">
                    Create Support Ticket
                  </h2>
                  {!showForm && (
                    <button
                      onClick={() => setShowForm(true)}
                      className="flex items-center gap-1.5 bg-primary text-white text-nowrap px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm font-medium hover:bg-primary-700 transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> New Ticket
                    </button>
                  )}
                </div>

                {showForm && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Category Dropdown */}
                    <div className="relative" ref={categoryRef}>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Category *
                      </label>
                      <button
                        type="button"
                        onClick={() =>
                          setShowCategoryDropdown(!showCategoryDropdown)
                        }
                        className="w-full flex items-center justify-between border border-secondary-200 rounded-lg px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600 transition-colors text-left"
                      >
                        <span className="flex items-center gap-2">
                          <span className="text-secondary-950">
                            {selectedCategory?.label}
                          </span>
                        </span>
                        <ChevronDown
                          className={`h-4 w-4 text-secondary-800 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                        />
                      </button>
                      {showCategoryDropdown && (
                        <div className="absolute top-full left-0 mt-1 w-full z-20 rounded-lg bg-white shadow-sm border py-1">
                          {CATEGORY_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => {
                                setForm((f) => ({ ...f, category: opt.value }));
                                setShowCategoryDropdown(false);
                              }}
                              className={`w-full text-left px-3 py-1.5 text-xs flex items-center gap-2 transition-colors ${form.category === opt.value ? "bg-primary-50 text-primary font-medium" : "text-secondary-900 hover:bg-secondary"}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Subject *
                      </label>
                      <input
                        value={form.subject}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, subject: e.target.value }))
                        }
                        placeholder="Brief description of your issue"
                        required
                        className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-secondary-800 mb-1">
                        Describe your issue *
                      </label>
                      <textarea
                        value={form.message}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, message: e.target.value }))
                        }
                        rows={4}
                        placeholder="Please provide as much detail as possible..."
                        required
                        className="w-full border border-secondary-200 rounded-lg px-3 py-2.5 text-xs sm:text-sm outline-none focus:border-secondary-600 resize-none"
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        type="submit"
                        disabled={submitting}
                        className="bg-primary hover:bg-primary-700 disabled:opacity-60 text-white px-5 sm:px-6 py-2.5 rounded-lg text-xs sm:text-sm transition-colors"
                      >
                        {submitting ? "Submitting..." : "Submit Ticket"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowForm(false)}
                        className="border border-secondary-400 px-4 py-2.5 rounded-lg text-xs sm:text-sm hover:bg-secondary-50 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {!showForm && (
                  <p className="text-secondary-700 text-xs text-center py-4">
                    Describe your issue and our team will respond within 24
                    hours
                  </p>
                )}
              </div>
            )}

            {/* Not logged in prompt (desktop) */}
            {!isAuthenticated && (
              <div className="hidden lg:block bg-white rounded-xl shadow-sm p-6 text-center">
                <AlertCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-secondary-950 mb-1">
                  Login Required
                </h3>
                <p className="text-secondary-700 text-sm mb-4">
                  Login to create and track support tickets
                </p>
                <Link
                  to="/login"
                  className="bg-primary text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-700 transition-colors inline-block"
                >
                  Login to Continue
                </Link>
              </div>
            )}
          </div>

          {/* Right Column: My Tickets (desktop) + Quick Contact */}
          <div className="space-y-5">
            {/* My Tickets - desktop only */}
            {isAuthenticated ? (
              <div className="hidden lg:block bg-white rounded-xl border border-secondary-200 shadow-sm p-5">
                <h3 className="font-semibold text-secondary-950 mb-4 flex items-center gap-2">
                  <Ticket strokeWidth={1.5} className="h-5 w-5 text-primary" />
                  My Tickets ({tickets.length})
                </h3>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle
                      strokeWidth={1}
                      className="h-10 w-10 text-secondary-600 mx-auto mb-2"
                    />
                    <p className="text-secondary-700 text-sm">
                      No support tickets yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tickets.map((ticket) => (
                      <button
                        key={ticket.id}
                        onClick={() => setOpenTicket(ticket.id)}
                        className="w-full text-left p-3 border border-secondary-100 rounded-lg hover:border-primary hover:bg-primary-50/50 transition-all"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || "bg-gray-100 text-gray-600"}`}
                          >
                            {ticket.status?.replace("_", " ")}
                          </span>
                          <span className="text-[10px] text-secondary-700">
                            {new Date(ticket.created_at).toLocaleDateString(
                              "en-IN",
                              { month: "short", day: "numeric" },
                            )}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-secondary-900 line-clamp-1">
                          {ticket.subject}
                        </p>
                        <p className="text-[11px] text-secondary-700 mt-0.5 capitalize">
                          {ticket.category}
                        </p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-secondary-200 p-5 text-center">
                <AlertCircle className="h-10 w-10 text-primary mx-auto mb-3" />
                <h3 className="font-bold text-secondary-950 mb-1">
                  Login Required
                </h3>
                <p className="text-secondary-700 text-sm mb-4">
                  Login to create and track support tickets
                </p>
                <Link
                  to="/login"
                  className="bg-primary text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-primary-700 transition-colors inline-block"
                >
                  Login to Continue
                </Link>
              </div>
            )}

            {/* Quick Contact */}
            <div className="bg-secondary-100 border border-secondary-200 rounded-xl p-4 sm:p-5">
              <h3 className="font-semibold text-secondary-950 mb-3 text-sm">
                Quick Contact
              </h3>
              <div className="space-y-2.5 text-xs sm:text-sm">
                <p className="flex items-center gap-3 text-secondary-900">
                  <Clock
                    strokeWidth={1.5}
                    className="h-4 w-4 flex-shrink-0 text-amber-500"
                  />
                  <span>Mon–Sat, 9:00 AM – 6:00 PM IST</span>
                </p>

                <p className="flex items-center gap-3 text-secondary-900">
                  <Phone
                    strokeWidth={1.5}
                    className="h-4 w-4 flex-shrink-0 text-emerald-500"
                  />
                  <a
                    href="tel:+918485833094"
                    className="text-emerald-600 hover:text-emerald-700 hover:underline transition-colors"
                  >
                    +91 8485833094
                  </a>
                </p>

                <p className="flex items-center gap-3 text-secondary-900">
                  <Mail
                    strokeWidth={1.5}
                    className="h-4 w-4 flex-shrink-0 text-sky-500"
                  />
                  <a
                    href="mailto:supportthedaminiedit@gmail.com"
                    className="text-sky-600 hover:text-sky-700 hover:underline transition-colors"
                  >
                    supportthedaminiedit@gmail.com
                  </a>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Detail Drawer */}
      {openTicket && ticketDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center">
          <div className="w-full sm:max-w-md h-[92vh] sm:h-[80vh] sm:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden sm:mx-4">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1 mr-3">
                <h3 className="font-bold text-secondary-950 text-sm truncate">
                  {ticketDetail.subject}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[ticketDetail.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {ticketDetail.status?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-secondary-700 capitalize">
                    {ticketDetail.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpenTicket(null)}
                className="p-1.5 rounded-lg hover:bg-secondary-100 flex-shrink-0"
              >
                <X className="h-5 w-5 text-secondary-800" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {ticketDetail.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === "admin" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${msg.sender_role === "admin" ? "bg-secondary-100 text-secondary-900 rounded-bl-sm" : "bg-primary text-white rounded-br-sm"}`}
                  >
                    <p className="font-semibold text-[10px] mb-0.5 opacity-70">
                      {msg.sender_name}
                    </p>
                    <p>{msg.message}</p>
                    <p className="text-[10px] opacity-60 mt-1 text-right">
                      {new Date(msg.created_at).toLocaleTimeString("en-IN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}
              {(!ticketDetail.messages ||
                ticketDetail.messages.length === 0) && (
                <div className="text-center py-8">
                  <MessageSquare className="h-8 w-8 text-secondary-300 mx-auto mb-2" />
                  <p className="text-secondary-700 text-xs">No messages yet</p>
                </div>
              )}
            </div>
            {ticketDetail.status !== "closed" && (
              <div className="p-3 border-t flex gap-2 flex-shrink-0 bg-white">
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  placeholder="Type your reply..."
                  onKeyDown={(e) =>
                    e.key === "Enter" && !e.shiftKey && handleReply()
                  }
                  className="flex-1 border border-secondary-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-primary"
                />
                <button
                  onClick={handleReply}
                  disabled={!reply.trim()}
                  className="bg-primary text-white px-3 py-2.5 rounded-lg disabled:opacity-50 hover:bg-primary-700 transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border shadow-sm border-secondary-200 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 sm:px-4 py-3 text-left hover:bg-secondary-50 transition-colors"
      >
        <span className="font-medium text-secondary-900 text-xs sm:text-sm pr-2">
          {q}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-secondary-700 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 sm:px-4 pb-3 pt-0 text-xs sm:text-sm text-secondary-800 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}
