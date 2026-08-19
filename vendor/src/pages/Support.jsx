import React, { useState, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSupportStore } from "../store/supportStore";
import { toast } from "sonner";
import Spinner from "../components/ui/Spinner";
import EmptyState from "../components/ui/EmptyState";
import {
  Headphones,
  Plus,
  Send,
  X,
  ChevronDown,
  Ticket,
  MessageCircle,
  ShoppingCart,
  CreditCard,
  PackageSearch,
  UserCircle,
  HelpCircle,
  Truck,
  Clock,
  Mail,
  Phone,
} from "lucide-react";

const CATEGORY_OPTIONS = [
  { value: "product", label: "Product / Listing", icon: PackageSearch },
  { value: "order", label: "Order Issue", icon: ShoppingCart },
  { value: "payment", label: "Payment / Payout", icon: CreditCard },
  { value: "shipping", label: "Shipping / Logistics", icon: Truck },
  { value: "account", label: "Account / KYC", icon: UserCircle },
  { value: "other", label: "Other", icon: HelpCircle },
];

const STATUS_CONFIG = {
  open: "bg-blue-100 text-blue-700",
  in_progress: "bg-yellow-100 text-yellow-700",
  awaiting_user: "bg-orange-100 text-orange-700",
  resolved: "bg-teal-100 text-teal-700",
  closed: "bg-green-100 text-green-700",
};

const FAQS = [
  {
    q: "How do payouts work?",
    a: "Damini processes automated payments to your registered bank account weekly. Minimum payout threshold is ₹500. Orders become eligible once the return window expires.",
  },
  {
    q: "How long does KYC approval take?",
    a: "KYC verification typically takes 24-48 hours after you submit all required documents. You will be notified once approved.",
  },
  {
    q: "When can I edit my product listing?",
    a: "Active listings can be edited anytime. Changes are reviewed and go live after approval.",
  },
  {
    q: "How do I handle a return request?",
    a: 'Go to the Returns page, review the request under "Under Review", and Approve or Reject it. You can then schedule pickup and process the refund.',
  },
];

export default function Support() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    subject: "",
    category: "product",
    priority: "medium",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [openTicket, setOpenTicket] = useState(null);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [faqSearch, setFaqSearch] = useState("");
  const categoryRef = useRef(null);

  const fetchTickets = useSupportStore((state) => state.fetchTickets);
  const fetchTicket = useSupportStore((state) => state.fetchTicket);
  const createTicket = useSupportStore((state) => state.createTicket);
  const replyTicket = useSupportStore((state) => state.replyTicket);

  useEffect(() => {
    const handler = (e) => {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setShowCategoryDropdown(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const {
    data: tickets = [],
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vendor-support-tickets"],
    queryFn: () => fetchTickets(),
  });

  const { data: ticketDetail } = useQuery({
    queryKey: ["vendor-support-ticket", openTicket],
    queryFn: () => fetchTicket(openTicket),
    enabled: !!openTicket,
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) return;
    setSubmitting(true);
    try {
      await createTicket(form);
      toast.success(
        "Support ticket created! Our team will get back to you soon.",
      );
      setShowForm(false);
      setForm({
        subject: "",
        category: "product",
        priority: "medium",
        message: "",
      });
      refetch();
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to create ticket");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!reply.trim() || !openTicket) return;
    setSendingReply(true);
    try {
      await replyTicket(openTicket, reply);
      setReply("");
      toast.success("Reply sent");
      queryClient.invalidateQueries({
        queryKey: ["vendor-support-ticket", openTicket],
      });
    } catch {
      toast.error("Failed to send reply");
    } finally {
      setSendingReply(false);
    }
  };

  const selectedCategory = CATEGORY_OPTIONS.find(
    (c) => c.value === form.category,
  );
  const filteredFAQs = faqSearch
    ? FAQS.filter(
        (f) =>
          f.q.toLowerCase().includes(faqSearch.toLowerCase()) ||
          f.a.toLowerCase().includes(faqSearch.toLowerCase()),
      )
    : FAQS;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">Support Tickets</h1>
          <p className="text-sm text-secondary-800 mt-0.5">
            Raise a ticket with Damini and track responses
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-opacity-90 text-white text-xs rounded-xl transition-colors shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:block">New Ticket</span>
          </button>
        )}
      </div>

      {/* Create ticket form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              <Headphones className="h-5 w-5 text-[#2874F0]" /> Create Support
              Ticket
            </h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1.5 rounded-lg hover:bg-gray-100"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="relative" ref={categoryRef}>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Category *
                </label>
                <button
                  type="button"
                  onClick={() => setShowCategoryDropdown((v) => !v)}
                  className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-3 py-2 text-sm text-left focus:outline-none focus:border-[#2874F0]"
                >
                  <span className="flex items-center gap-2">
                    {selectedCategory?.icon && (
                      <selectedCategory.icon className="h-4 w-4 text-gray-400" />
                    )}
                    {selectedCategory?.label}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-gray-400 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
                  />
                </button>
                {showCategoryDropdown && (
                  <div className="absolute top-full left-0 mt-1 w-full z-20 rounded-lg bg-white shadow-lg border py-1 max-h-56 overflow-y-auto">
                    {CATEGORY_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => {
                          setForm((f) => ({ ...f, category: opt.value }));
                          setShowCategoryDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center gap-2 transition-colors ${
                          form.category === opt.value
                            ? "bg-blue-50 text-[#2874F0] font-semibold"
                            : "text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <opt.icon className="h-4 w-4" /> {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Priority
                </label>
                <select
                  value={form.priority}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, priority: e.target.value }))
                  }
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] bg-white"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Subject *
              </label>
              <input
                type="text"
                required
                placeholder="Brief description of your issue"
                value={form.subject}
                onChange={(e) =>
                  setForm((f) => ({ ...f, subject: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0]"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Describe your issue *
              </label>
              <textarea
                required
                rows={4}
                placeholder="Please provide as much detail as possible..."
                value={form.message}
                onChange={(e) =>
                  setForm((f) => ({ ...f, message: e.target.value }))
                }
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#2874F0] resize-none"
              />
            </div>
            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-[#2874F0] hover:bg-[#1a5de0] disabled:opacity-60 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors"
              >
                {submitting ? "Submitting..." : "Submit Ticket"}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2.5 border border-gray-200 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tickets + FAQ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Tickets list */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 flex items-center gap-2">
            <Ticket className="h-4 w-4 text-[#2874F0]" />
            <h3 className="font-bold text-gray-900 text-sm">
              My Tickets ({tickets.length})
            </h3>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : tickets.length === 0 ? (
            <EmptyState
              icon={<MessageCircle className="h-10 w-10 text-gray-400" />}
              title="No support tickets"
              description="Create a ticket and our team will get back to you within 24 hours."
            />
          ) : (
            <div className="divide-y divide-gray-100">
              {tickets.map((ticket) => (
                <button
                  key={ticket.id}
                  onClick={() => setOpenTicket(ticket.id)}
                  className="w-full text-left p-4 hover:bg-gray-50/50 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CONFIG[ticket.status] || "bg-gray-100 text-gray-600"}`}
                      >
                        {ticket.status?.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-gray-400 capitalize">
                        {ticket.category}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 truncate">
                      {ticket.subject}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      <Clock className="inline h-3 w-3 mr-1 -mt-0.5" />
                      {new Date(ticket.created_at).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <span className="text-xs text-[#2874F0] font-semibold flex-shrink-0">
                    View →
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* FAQ + Quick contact */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 text-sm mb-3">Quick Help</h3>
            <input
              value={faqSearch}
              onChange={(e) => setFaqSearch(e.target.value)}
              placeholder="Search FAQs..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-[#2874F0]"
            />
            <div className="space-y-2">
              {filteredFAQs.length === 0 ? (
                <p className="text-center text-gray-400 text-sm py-4">
                  No matching questions
                </p>
              ) : (
                filteredFAQs.map((faq, i) => (
                  <FAQItem key={i} q={faq.q} a={faq.a} />
                ))
              )}
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl border border-gray-100 p-5 space-y-3">
            <h4 className="font-bold text-gray-800 text-xs uppercase tracking-wider">
              Quick Contact
            </h4>
            <p className="flex items-center gap-3 text-xs text-gray-600">
              <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />{" "}
              Mon–Sat, 9:00 AM – 6:00 PM IST
            </p>
            <p className="flex items-center gap-3 text-xs text-gray-600">
              <Phone className="h-4 w-4 text-emerald-500 flex-shrink-0" />
              <a
                href="tel:+919800000000"
                className="text-emerald-600 hover:underline"
              >
                +91 9800000000
              </a>
            </p>
            <p className="flex items-center gap-3 text-xs text-gray-600">
              <Mail className="h-4 w-4 text-sky-500 flex-shrink-0" />
              <a
                href="mailto:support@damini.com"
                className="text-sky-600 hover:underline"
              >
                support@damini.com
              </a>
            </p>
          </div>
        </div>
      </div>

      {/* Ticket detail drawer */}
      {openTicket && ticketDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center sm:justify-center p-0 sm:p-4">
          <div className="w-full sm:max-w-md h-[92vh] sm:h-[80vh] sm:rounded-2xl bg-white shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between flex-shrink-0">
              <div className="min-w-0 flex-1 mr-3">
                <h3 className="font-bold text-gray-900 text-sm truncate">
                  {ticketDetail.subject}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_CONFIG[ticketDetail.status] || "bg-gray-100 text-gray-600"}`}
                  >
                    {ticketDetail.status?.replace("_", " ")}
                  </span>
                  <span className="text-[10px] text-gray-500 capitalize">
                    {ticketDetail.category}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setOpenTicket(null)}
                className="p-1.5 rounded-lg hover:bg-gray-100 flex-shrink-0"
              >
                <X className="h-5 w-5 text-gray-600" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {ticketDetail.messages?.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.sender_role === "admin" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      msg.sender_role === "admin"
                        ? "bg-gray-100 text-gray-900 rounded-bl-sm"
                        : "bg-[#2874F0] text-white rounded-br-sm"
                    }`}
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
                  <MessageCircle className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-gray-500 text-xs">No messages yet</p>
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
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#2874F0]"
                />
                <button
                  onClick={handleReply}
                  disabled={!reply.trim() || sendingReply}
                  className="bg-[#2874F0] text-white px-3 py-2.5 rounded-lg disabled:opacity-50 hover:bg-[#1a5de0] transition-colors flex-shrink-0"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-gray-100 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="font-medium text-gray-800 text-xs pr-2">{q}</span>
        <ChevronDown
          className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="px-3 pb-3 text-xs text-gray-600 leading-relaxed">
          {a}
        </div>
      )}
    </div>
  );
}
