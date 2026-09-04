import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { HelpCircle, ChevronDown, Search } from "lucide-react";

const FAQ_DATA = [
  { category: "Orders", q: "How do I track my order?", a: "Go to My Orders from your profile, click on the order to see real-time tracking details and estimated delivery date." },
  { category: "Orders", q: "Can I change my order after placing it?", a: "You can cancel an order before it is shipped and place a new one. Modifications to an existing order are not supported." },
  { category: "Payments", q: "What payment methods are accepted?", a: "We accept UPI, credit/debit cards, net banking, wallets, and Cash on Delivery (COD) for eligible orders." },
  { category: "Payments", q: "Is COD available?", a: "Yes, Cash on Delivery is available for most products and pincodes. You can check availability at checkout." },
  { category: "Returns", q: "What is the return policy?", a: "Most items can be returned within 7 days of delivery. The item should be unused and in its original packaging. Some categories have different return windows." },
  { category: "Returns", q: "How do I get a refund?", a: "After your return is approved and the item is received, the refund is processed within 5-7 business days to your original payment method." },
  { category: "Account", q: "How do I create an account?", a: "Click Sign Up on the top right and enter your email or phone number. You can also sign up during checkout." },
  { category: "Account", q: "How do I reset my password?", a: "Click Forgot Password on the login page, enter your registered email, and follow the reset link sent to your inbox." },
  { category: "Sellers", q: "How do I become a seller?", a: "Click Become a Seller in the footer and complete the registration form. Our team will review and activate your account within 48 hours." },
  { category: "Sellers", q: "What fees does The Damini Edit charge sellers?", a: "We charge a small commission per sale. There are no upfront listing fees. Contact our seller support for detailed pricing." },
];

export default function Faq() {
  const [openFaq, setOpenFaq] = useState(null);
  const [search, setSearch] = useState("");

  const filtered = FAQ_DATA.filter(
    (f) =>
      f.q.toLowerCase().includes(search.toLowerCase()) ||
      f.a.toLowerCase().includes(search.toLowerCase()) ||
      f.category.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <Helmet>
        <title>FAQ - The Damini Edit Marketplace</title>
        <meta name="description" content="Frequently asked questions about shopping, payments, returns, and more on The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <HelpCircle strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Frequently Asked Questions</h1>
            <p className="text-secondary text-xs sm:text-sm">Find answers to common questions.</p>
          </div>
        </div>

        <div className="max-w-3xl mx-auto py-6">
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-secondary-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search questions..."
              className="w-full border border-secondary-200 rounded-lg pl-10 pr-3 py-2.5 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="space-y-2">
            {filtered.map((faq, i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm border border-secondary overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary transition-colors"
                >
                  <span className="font-medium text-secondary-950 text-sm flex-1">{faq.q}</span>
                  <span className="text-[10px] text-primary font-medium bg-primary-50 px-2 py-0.5 rounded-full shrink-0">{faq.category}</span>
                  <ChevronDown className={`h-4 w-4 text-secondary-700 flex-shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 pt-0">
                    <div className="border-t border-secondary-100 pt-4">
                      <p className="text-secondary-800 text-sm leading-relaxed">{faq.a}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-10">
              <p className="text-secondary-700 text-sm">No matching questions found.</p>
            </div>
          )}

          <div className="mt-8 bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              Still have questions?{" "}
              <a href="mailto:supportthedaminiedit@gmail.com" className="text-primary font-medium hover:underline">Contact Support</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
