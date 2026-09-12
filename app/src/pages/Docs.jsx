import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  BookOpen,
  ShoppingBag,
  Store,
  Megaphone,
  ShieldCheck,
  Wallet,
  ChevronDown,
  Link as LinkIcon,
} from "lucide-react";
import { Link } from "react-router-dom";

const DOCS = [
  {
    tab: "Overview",
    icon: BookOpen,
    intro:
      "The Damini Edit is a complete multi-vendor marketplace. Four portals work together on one platform: the customer storefront, the vendor hub, the ads manager, and the admin panel.",
    sections: [
      {
        title: "How the marketplace works",
        items: [
          "Vendors apply to sell, complete KYC (5 steps), and go live once approved by admin.",
          "Vendors list products under categories. Each category carries its own GST rate (default 18%).",
          "Customers browse, add to cart, checkout with coupons / coins / offers, and pay online or via COD.",
          "Orders flow to vendors for fulfilment. Shipments, returns, refunds and payouts are tracked on both sides.",
          "Vendors can promote products through the Ads Manager, which is fed by an ad wallet recharged by the vendor.",
          "Admin oversees everything: approvals, catalog, orders, finance, content and support.",
        ],
      },
      {
        title: "The four portals",
        items: [
          "Customer Storefront — shopping, orders, wallet & coins, support (this website).",
          "Vendor Hub — product listing, order fulfilment, shipments, returns, payouts, settings.",
          "Ads Manager — create and manage ad campaigns, wallet and billing.",
          "Admin Panel — staff dashboard for approvals, catalog, content, finance and reports.",
        ],
      },
      {
        title: "Money model at a glance",
        items: [
          "Customers pay a single price — all prices shown are final (GST-inclusive).",
          "On every sale the vendor pays a commission (%) plus GST on that item to the platform.",
          "The vendor payout is: item price − platform commission − GST.",
          "The platform pays vendors automatically once earnings cross the payout threshold.",
        ],
      },
    ],
  },
  {
    tab: "Shopping",
    icon: ShoppingBag,
    intro:
      "Everything a customer can do on the storefront: discover, buy, track, return and reuse the platform.",
    sections: [
      {
        title: "Discover & browse",
        items: [
          "Home page shows category tiles, banners, festival sales, video reels, sponsored products and trending picks.",
          "Categories page and search let you filter by category, price, brand and rating.",
          "Open any product to see images, variant options, price, stock, GST-inclusive pricing, seller store and reviews.",
        ],
      },
      {
        title: "Cart & checkout",
        items: [
          "Add items to cart, adjust quantities, and move to a protected checkout.",
          "At checkout choose a saved address, a coupon, redeem wallet coins, and apply offers (discounts stack automatically).",
          "Shipping charges are shown per item; the order total is recalculated live.",
          "Pay via UPI, cards, net banking, wallet, or Cash on Delivery where eligible.",
        ],
      },
      {
        title: "Orders, returns & more",
        items: [
          "My Orders shows status in real time: Confirmed, Shipped, Out for Delivery, Delivered, Cancelled.",
          "Orders can be cancelled from Checkout to shipment; refunds follow the original payment method.",
          "Most categories allow returns / exchange within their return window (commonly 7 days).",
          "Login with your mobile/email keeps cart, wishlist, addresses, coins and support tickets in sync.",
        ],
      },
    ],
  },
  {
    tab: "Selling",
    icon: Store,
    intro:
      "Vendors manage everything from onboarding to daily sales in the Vendor Hub — here is the end-to-end flow.",
    sections: [
      {
        title: "Onboarding & KYC",
        items: [
          "Apply via 'Become a Seller' — complete 5 steps: store identity, business + PAN + valid GSTIN, business email OTP, bank account, and pickup address (pincode auto-fills city/state).",
          "Upload required documents: GST certificate, PAN, Aadhaar (front & back), passport photo and cancelled cheque (max 5MB each).",
          "On submit your application moves to 'Submitted' and admin reviews it — you only move to 'Approved' if the application is complete.",
          "Application status (draft → submitted → under_review → approved / rejected) is visible in Settings.",
        ],
      },
      {
        title: "Products",
        items: [
          "Create products with name, category, price, stock, images, return policy, COD availability and variants.",
          "Variants (size/colour, extra price, stock) are built with the Variant Builder.",
          "New and edited listings go through admin approval before going live.",
          "Edit any active listing anytime; your edits are reviewed before republishing.",
        ],
      },
      {
        title: "Orders, shipments & returns",
        items: [
          "New orders appear instantly on the Orders page; notifications keep you updated.",
          "Pack, generate the label, and update shipment status — tracking flows to the customer.",
          "Return requests land in Returns; review, approve/reject, schedule pickup and process refunds.",
          "Once the return window passes, order earnings become eligible for payout.",
        ],
      },
      {
        title: "Payouts",
        items: [
          "Payouts are processed automatically to your registered bank account on a periodic cycle (weekly).",
          "Minimum payout threshold applies (₹500); eligible earnings accumulate until reached.",
          "Every payout line shows item total, commission, GST deducted and your net payout.",
          "See the Money & Policies tab for the exact payout formula.",
        ],
      },
    ],
  },
  {
    tab: "Ads & Advertising",
    icon: Megaphone,
    intro:
      "Sponsored placements give products more visibility. Vendors run ads through the Ads Manager portal.",
    sections: [
      {
        title: "How ads work",
        items: [
          "The Ads Manager is a separate portal linked to your vendor account.",
          "Ads run within a daily budget and a maximum cost-per-click you set.",
          "Sponsored products appear in the storefront's sponsored carousels and search/ad placements.",
          "You can pause or end campaigns anytime; spend only accrues while a campaign is active.",
        ],
      },
      {
        title: "Wallet & billing",
        items: [
          "Ads are paid from your ad wallet; the balance is shown in the Ads Manager sidebar and header.",
          "Recharge the wallet from the Billing page; every spend reduces your balance.",
          "Low-balance and budget-exhausted alerts keep you informed through notifications.",
          "Set alert preferences in Settings — max CPC bid limit and low-balance threshold.",
        ],
      },
      {
        title: "Campaign tips",
        items: [
          "Pick the promoted product, set your budget, CPC bid, duration and ad copy/creative.",
          "Monitor impressions, clicks and spend in the campaign detail page.",
          "Optimise bids and daily budgets based on the performance metrics shown.",
        ],
      },
    ],
  },
  {
    tab: "Admin & Operations",
    icon: ShieldCheck,
    intro:
      "The admin panel is the control room where staff approve, manage and monitor the whole platform.",
    sections: [
      {
        title: "Approvals & governance",
        items: [
          "Approve or reject vendor KYC applications and view each vendor's full documents.",
          "Approve or reject newly listed / edited products.",
          "Assign each vendor a commission rate and GST rate; vendors default to 18% GST.",
        ],
      },
      {
        title: "Catalog & content",
        items: [
          "Manage the category tree, each with its own GST rate used in payouts.",
          "Manage brands, banners, videos, festival sales and coupon/offer campaigns.",
          "Edit platform settings such as support contacts, GSTIN and commission defaults.",
        ],
      },
      {
        title: "Orders, finance & support",
        items: [
          "Track every order, handle return approvals and process refunds/reversals.",
          "Run payouts to vendors and review finance reports (sales, commission, GST, payouts).",
          "Handle customer support tickets and respond from the Support Desk.",
        ],
      },
    ],
  },
  {
    tab: "Money & Policies",
    icon: Wallet,
    intro:
      "How money moves between customers, vendors and the platform — and the policies that govern it.",
    sections: [
      {
        title: "Customer pricing",
        items: [
          "Every price you see is the final price you pay — it already includes GST. There are no hidden charges.",
          "Extra costs are limited to shipping (shown before checkout) unless free shipping applies.",
          "Refunds go back to your original payment method (COD refunds are transferred / credited).",
        ],
      },
      {
        title: "Vendor payout formula",
        items: [
          "Subtotal for the item = unit price × quantity.",
          "Commission = subtotal × vendor commission rate (vendor rate, else platform default).",
          "GST = subtotal × GST rate of the product's category (18% default; admin can override per category).",
          "Net vendor payout = subtotal − commission − GST.",
        ],
      },
      {
        title: "Policies & timelines",
        items: [
          "Eligibility for customer cancellation ends once an order is shipped.",
          "Return windows vary by category (commonly 7 days from delivery).",
          "Refunds are processed after the returned item is received (5–7 business days).",
          "Payouts happen to the vendor's registered bank account on the payout cycle; see Help/Support for exact schedules.",
        ],
      },
    ],
  },
];

const QUICK_LINKS = [
  { label: "Payments", to: "/payments" },
  { label: "Shipping", to: "/shipping" },
  { label: "Cancellation & Returns", to: "/cancellation-returns" },
  { label: "FAQ", to: "/faq" },
  { label: "Become a Seller", to: "/seller-register" },
  { label: "Advertise", to: "/advertise" },
  { label: "Privacy", to: "/privacy" },
  { label: "Terms", to: "/terms" },
];

export default function Docs() {
  const [active, setActive] = useState(0);
  const doc = DOCS[active];
  const Icon = doc.icon;

  return (
    <>
      <Helmet>
        <title>Documentation - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Complete working documentation for the The Damini Edit marketplace: shopping, selling, ads, admin and the money model."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <BookOpen
                strokeWidth={1.5}
                className="h-6 w-6 sm:h-7 sm:w-7"
              />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Platform Documentation
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              How everything works on The Damini Edit — customers, vendors, ads
              and operations.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2 mb-6">
          {DOCS.map((d, i) => {
            const TIcon = d.icon;
            return (
              <button
                key={d.tab}
                onClick={() => setActive(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                  active === i
                    ? "bg-primary text-white shadow-sm"
                    : "bg-white border border-secondary-200 text-secondary-700 hover:border-primary"
                }`}
              >
                <TIcon strokeWidth={1.5} className="w-4 h-4" />
                {d.tab}
              </button>
            );
          })}
        </div>

        {/* Active section */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 bg-white rounded-xl shadow-sm border border-secondary p-4 sm:p-5">
            <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Icon strokeWidth={1.5} className="w-5 h-5 text-primary" />
            </div>
            <p className="text-secondary-800 text-sm leading-relaxed">
              {doc.intro}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {doc.sections.map((section) => (
              <div
                key={section.title}
                className="bg-white rounded-xl shadow-sm border border-secondary overflow-hidden"
              >
                <div className="px-5 py-4 border-b border-secondary-100 bg-secondary/40">
                  <h2 className="font-semibold text-secondary-950 text-sm">
                    {section.title}
                  </h2>
                </div>
                <ul className="divide-y divide-secondary-100">
                  {section.items.map((item, j) => (
                    <li
                      key={j}
                      className="flex items-start gap-2.5 px-5 py-3 text-secondary-800 text-sm leading-relaxed"
                    >
                      <span className="mt-0.5 w-5 h-5 rounded-full bg-primary-50 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                        {j + 1}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="mt-8 bg-secondary-50 rounded-xl p-5 sm:p-6">
          <h3 className="text-sm font-semibold text-secondary-950 mb-3 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-primary" strokeWidth={1.5} />
            Related pages
          </h3>
          <div className="flex flex-wrap gap-2">
            {QUICK_LINKS.map((l) => (
              <Link
                key={l.to}
                to={l.to}
                className="text-xs font-medium bg-white border border-secondary-200 text-secondary-800 px-3 py-1.5 rounded-lg hover:border-primary hover:text-primary transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}