import { useState } from "react";
import {
  BookOpen,
  UserPlus,
  Package,
  ShoppingCart,
  RotateCcw,
  Wallet,
  Megaphone,
  Headphones,
} from "lucide-react";

const DOCS = [
  {
    tab: "Getting Started",
    icon: UserPlus,
    intro:
      "From application to a live store — this is every step a vendor goes through on the Damini Edit Vendor Hub.",
    sections: [
      {
        title: "Apply & complete KYC",
        items: [
          "Start with 'Become a Seller' on the storefront and complete the 5-step registration form.",
          "Step 1 — Store identity (store name, category, logo).",
          "Step 2 — Business details (business name, PAN, valid GSTIN).",
          "Step 3 — Business email verification (OTP) + contact details.",
          "Step 4 — Bank account details for payouts.",
          "Step 5 — Pickup address; entering a 6-digit pincode auto-fills city and state.",
        ],
      },
      {
        title: "Required documents",
        items: [
          "GST certificate, PAN card, Aadhaar front, Aadhaar back, passport photo, cancelled cheque.",
          "Images must be under 5MB each and in a supported format.",
          "An application is only submitted when all fields and documents are complete — incomplete applications stay as drafts and are never sent to admin.",
        ],
      },
    ],
  },
  {
    tab: "Products",
    icon: Package,
    intro:
      "How to build, publish and take care of your catalogue on the Vendor Hub.",
    sections: [
      {
        title: "Adding a product",
        items: [
          "Go to Products → Add Product. Choose its category, fill name, description, price, stock and images.",
          "Set return policy, COD availability and other listing options.",
          "Use the Variant Builder for size/colour variants with their own price and stock.",
          "Products you add are reviewed by admin before going live.",
        ],
      },
      {
        title: "Managing listings",
        items: [
          "Edit an active listing anytime — the change is re-reviewed before it goes live.",
          "Track the approval status of every product on the Products page.",
          "Use stock and variant management to avoid overselling.",
        ],
      },
    ],
  },
  {
    tab: "Orders & Shipments",
    icon: ShoppingCart,
    intro:
      "How orders reach you, how to fulfil them, and how shipments are tracked.",
    sections: [
      {
        title: "Order lifecycle",
        items: [
          "Customers place orders with the 'New order' status; you get a notification instantly.",
          "Confirm, pack and proceed to shipment generation.",
          "Once the item leaves, the customer sees live tracking in their My Orders page.",
          "Keep shipment statuses updated so fulfilment, payment eligibility and payouts move forward.",
        ],
      },
      {
        title: "Shipments",
        items: [
          "The Shipments page lists every package you need to send out.",
          "Generate labels and update carrier/tracking info from the vendor side.",
          "The order's payout eligibility starts after delivery and the return window passing.",
        ],
      },
    ],
  },
  {
    tab: "Returns & Refunds",
    icon: RotateCcw,
    intro:
      "Handle customer return requests cleanly — approve, pick up, refund.",
    sections: [
      {
        title: "The return flow",
        items: [
          "Return requests appear under 'Under Review' on the Returns page.",
          "Review the request; Approve or Reject it with a reason.",
          "For approvals, schedule the pickup and process the refund once the item is received.",
          "Refund amounts are reversed from your stored payout for that item — no manual math needed.",
        ],
      },
      {
        title: "Rules",
        items: [
          "Customers can raise returns within the product's return window (commonly 7 days).",
          "Your decision and timelines are visible to the customer and to admin.",
        ],
      },
    ],
  },
  {
    tab: "Payouts & Money",
    icon: Wallet,
    intro:
      "The exact maths behind every payout — commission, GST and your net amount.",
    sections: [
      {
        title: "Payout formula",
        items: [
          "Item total = unit price × quantity.",
          "Platform commission = item total × your commission rate.",
          "GST = item total × the product category's GST rate (default 18%).",
          "Your net payout = item total − commission − GST.",
          "The customer's price is GST-inclusive and never changes — GST is only deducted from your payout.",
        ],
      },
      {
        title: "Getting paid",
        items: [
          "Earnings become payout-eligible once the return window on an order expires.",
          "Payouts are processed to your registered bank account on the payout cycle (weekly).",
          "A minimum threshold applies (₹500) — eligible earnings pool until the threshold is reached.",
          "See every payout's breakdown (total, commission, GST, net) on the Payouts page.",
        ],
      },
      {
        title: "Configuration",
        items: [
          "Your commission rate is set by admin and shown in your settings / vendor detail.",
          "Your default GST rate is 18% — category GST rates apply where admin has set them.",
          "Bank and contact details are managed under Settings → Business Details.",
        ],
      },
    ],
  },
  {
    tab: "Ads & Campaigns",
    icon: Megaphone,
    intro:
      "Promote your products through sponsored placements run in the Ads Manager.",
    sections: [
      {
        title: "Campaigns",
        items: [
          "Create campaigns from Ads & Campaigns → Create Campaign (also available in the Ads Manager portal).",
          "Set the product, daily budget, max cost-per-click, duration and creative/copy.",
          "Campaigns spend only while active — pause or end them anytime.",
          "Track impressions, clicks and spend in campaign details.",
        ],
      },
      {
        title: "Wallet & billing",
        items: [
          "Ads are paid from your ad wallet; top it up from the Billing page.",
          "Your current ad balance is shown in the Ads Manager sidebar and header.",
          "Low-balance and budget-exhausted alerts keep you informed.",
          "Set alert preferences (max CPC limit, low-balance threshold) in Ads Manager Settings.",
        ],
      },
    ],
  },
  {
    tab: "Support",
    icon: Headphones,
    intro:
      "Where to get help and what to expect when things go wrong.",
    sections: [
      {
        title: "Getting help",
        items: [
          "Raise support tickets from the Support page — pick a category (product, order, payment/payout, shipping, account/KYC, other).",
          "Track ticket status: open → in_progress → (awaiting_user) → resolved / closed.",
          "Fast-track common issues with the FAQ on the support page.",
        ],
      },
      {
        title: "What to expect",
        items: [
          "KYC review takes 24–48 hours after a complete submission.",
          "Listing approvals are processed by admin; you are notified of the outcome.",
          "Payout queries and payment issues are handled through the payout/support channels.",
        ],
      },
    ],
  },
];

export default function Docs() {
  const [active, setActive] = useState(0);
  const doc = DOCS[active];
  const Icon = doc.icon;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div
        className={`flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary to-primary-800 text-white p-6 ${
          active ? "sm:p-6" : "sm:p-8"
        }`}
      >
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Vendor Documentation</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Everything about selling on The Damini Edit — from onboarding to
            payouts.
          </p>
        </div>
        <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-white/15 items-center justify-center flex-shrink-0">
          <BookOpen className="w-6 h-6" strokeWidth={1.5} />
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {DOCS.map((d, i) => {
          const TIcon = d.icon;
          return (
            <button
              key={d.tab}
              onClick={() => setActive(i)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all ${
                active === i
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white border border-secondary-300 text-secondary-900 hover:border-primary"
              }`}
            >
              <TIcon strokeWidth={1.5} className="w-4 h-4" />
              {d.tab}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-3 bg-white rounded-xl shadow-sm border border-secondary-300 p-4 sm:p-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon strokeWidth={1.5} className="w-5 h-5 text-primary" />
        </div>
        <p className="text-secondary-800 text-sm leading-relaxed">{doc.intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doc.sections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl shadow-sm border border-secondary-300 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-secondary-300 bg-secondary">
              <h2 className="font-semibold text-secondary-950 text-sm">
                {section.title}
              </h2>
            </div>
            <ul className="divide-y divide-secondary-300">
              {section.items.map((item, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2.5 px-5 py-3 text-secondary-900 text-sm leading-relaxed"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center flex-shrink-0">
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
  );
}