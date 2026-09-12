import { useState } from "react";
import {
  BookOpen,
  LayoutDashboard,
  Store,
  Package,
  ShoppingCart,
  RotateCcw,
  Gift,
  Wallet,
  Megaphone,
  HeadphonesIcon,
  Settings,
  FolderTree,
} from "lucide-react";

const DOCS = [
  {
    tab: "Overview",
    icon: LayoutDashboard,
    intro:
      "The admin panel is the command centre for the entire The Damini Edit marketplace. This tab explains every module and how the money moves.",
    sections: [
      {
        title: "Dashboard",
        items: [
          "See live KPIs: revenue, orders, products, vendors, users, payout totals and more.",
          "Monitor pending work — vendors awaiting KYC approval, products waiting for approval, returns pending action.",
          "The bell icon lists pending vendors and products; the sidebar shows pending badges.",
          "Recent activity and trends give an at-a-glance pulse of the platform.",
        ],
      },
      {
        title: "The money model (what admin manages)",
        items: [
          "Customer prices are GST-inclusive; GST is never added at checkout.",
          "Per sale, the vendor pays commission + GST on that item.",
          "Vendor payout = item total − commission − GST.",
          "Admin sets the platform default commission and per-category GST rates (default 18%).",
        ],
      },
    ],
  },
  {
    tab: "Vendors",
    icon: Store,
    intro:
      "Recruit, verify and manage sellers — the KYC pipeline and the vendor record.",
    sections: [
      {
        title: "KYC approval flow",
        items: [
          "Vendors register in 5 steps (store, business+PAN+GSTIN, business email OTP, bank, pickup address + documents).",
          "Incomplete applications never reach you — only fully-submitted applications appear for review.",
          "Statuses: draft → submitted → under_review → approved / rejected.",
          "Open a vendor's detail to view their documents, approve or reject with clear reasoning.",
          "On approval the vendor's GST rate defaults to 18% (COALESCE pattern) unless already set.",
        ],
      },
      {
        title: "Vendor configuration",
        items: [
          "Set each vendor's commission rate (overrides the platform default).",
          "View/override the vendor's default GST rate; category GST rates take precedence in payouts.",
          "See store info, business email, bank details, pickup address and all documents in Vendor Detail.",
        ],
      },
    ],
  },
  {
    tab: "Catalog",
    icon: FolderTree,
    intro:
      "The category tree, GST control and product approvals.",
    sections: [
      {
        title: "Categories & GST",
        items: [
          "Categories form a two-level tree with icons, images, banners and sort order.",
          "Each category carries a GST rate (default 18%) — this is the GST % applied to vendor payouts for market products.",
          "Edit a category's GST rate any time; the change applies to future orders.",
          "Export the category list to CSV from the Categories page.",
        ],
      },
      {
        title: "Products & brands",
        items: [
          "Review and approve/reject product listings and edits from vendors.",
          "Approve or reject brands; browse the full catalogue with filters.",
          "Product prices shown to customers are final (GST-inclusive).",
        ],
      },
      {
        title: "Users",
        items: [
          "View all customer accounts across the platform.",
          "Access order and support history attached to each user.",
        ],
      },
    ],
  },
  {
    tab: "Orders & Returns",
    icon: ShoppingCart,
    intro:
      "Everything about order lifecycle, return approvals and refund reversals.",
    sections: [
      {
        title: "Orders",
        items: [
          "Track every order with its customer, vendor, items, payment method, totals and status.",
          "Statuses flow: confirmed → shipped → delivered (plus cancelled).",
          "Each order stores subtotal, discount, shipping, GST total and the final total.",
        ],
      },
      {
        title: "Returns & refunds",
        items: [
          "Returns are initiated by the customer; vendors and admin review them.",
          "When a refund is processed, the vendor's stored payout for the item is reversed automatically.",
          "The Returns tab gives you the full pending pipeline with pending badges.",
          "Refund amounts match what was withheld (commission + GST included) — no manual recalculation.",
        ],
      },
      {
        title: "Payout reversal logic",
        items: [
          "Payouts are computed from each order item's stored vendor payout.",
          "Because vendor payout is stored at order time, refunds simply reverse that stored value.",
          "No recomputation is needed when an item is returned.",
        ],
      },
    ],
  },
  {
    tab: "Promotions",
    icon: Gift,
    intro:
      "Drive demand with coupons, offers, festival sales, banners and videos.",
    sections: [
      {
        title: "Coupons & offers",
        items: [
          "Create platform coupons (minimum spend, flat/percent, expiry, usage limits).",
          "Configure offers that apply automatically at checkout and their budgets/validity.",
          "Discounts are calculated at checkout before adding shipping.",
        ],
      },
      {
        title: "Banners, videos & festival sales",
        items: [
          "Publish banners for the storefront (image + target link + sort order).",
          "Upload short product/reel videos shown on the storefront.",
          "Run festival sales with themed collections, banners and promo settings.",
          "All content is visible to customers instantly after publishing.",
        ],
      },
    ],
  },
  {
    tab: "Finance",
    icon: Wallet,
    intro:
      "Payouts, reports and the complete audit trail of money.",
    sections: [
      {
        title: "Payouts",
        items: [
          "Generate and process payouts to vendors on the platform cycle.",
          "Each payout reflects the stored vendor payout per item (after commission and GST).",
          "Track payout status per vendor and per order across time.",
        ],
      },
      {
        title: "Reports",
        items: [
          "Sales report: order volume, GMV and totals by date range.",
          "Finance report: commission collected and GST collected per order.",
          "Payout report: every vendor payout with its breakdown.",
          "Export reports to CSV for accounting.",
        ],
      },
    ],
  },
  {
    tab: "Ads",
    icon: Megaphone,
    intro:
      "The e-commerce advertising layer run by vendors through the Ads Manager.",
    sections: [
      {
        title: "Admin's ad role",
        items: [
          "Monitor all vendor ad campaigns and wallet usage from the Ads page.",
          "Campaigns are run by vendors: product selection, daily budget, CPC bid, duration.",
          "Sponsored product placements surface in the storefront carousels.",
        ],
      },
      {
        title: "Wallet flow",
        items: [
          "Vendors top up an ad wallet; every ad click/spend debits it.",
          "Low-balance and budget-exhausted alerts are automated via notifications.",
          "Billing is transparent to the vendor in the Ads Manager (Billing page).",
        ],
      },
    ],
  },
  {
    tab: "Support & Settings",
    icon: HeadphonesIcon,
    intro:
      "Customer care and platform configuration in one place.",
    sections: [
      {
        title: "Support desk",
        items: [
          "Respond to customer and vendor support tickets.",
          "Ticket statuses: open → in_progress → closed.",
          "Reply directly within the ticket thread; both parties see the conversation.",
        ],
      },
      {
        title: "Settings",
        items: [
          "Platform commission rate used as the default for new vendors/sales.",
          "Support email, business email, phone, working hours, registered address, GSTIN.",
          "Social links (Facebook, Instagram, YouTube, Twitter, WhatsApp).",
          "All settings feed the customer-facing storefront and footer.",
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
      <div className="flex items-center justify-between gap-4 rounded-2xl bg-gradient-to-br from-primary to-primary-800 text-white p-6 sm:p-8">
        <div>
          <h1 className="text-xl sm:text-3xl font-bold">Admin Documentation</h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Complete working documentation for the marketplace — every module,
            status and money rule.
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
                  : "bg-white border border-gray-200 text-gray-500 hover:border-primary hover:text-gray-700"
              }`}
            >
              <TIcon strokeWidth={1.5} className="w-4 h-4" />
              {d.tab}
            </button>
          );
        })}
      </div>

      <div className="flex items-start gap-3 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-5">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <Icon strokeWidth={1.5} className="w-5 h-5 text-primary" />
        </div>
        <p className="text-gray-600 text-sm leading-relaxed">{doc.intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doc.sections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-gray-100 bg-secondary">
              <h2 className="font-semibold text-gray-900 text-sm">
                {section.title}
              </h2>
            </div>
            <ul className="divide-y divide-gray-50">
              {section.items.map((item, j) => (
                <li
                  key={j}
                  className="flex items-start gap-2.5 px-5 py-3 text-gray-600 text-sm leading-relaxed"
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

      <div className="bg-primary-50 border border-primary-100 rounded-xl p-5 text-sm text-gray-700">
        <Settings className="w-4 h-4 inline mr-1.5 text-primary" />
        <strong>Tip:</strong> the pending badges in the sidebar (vendors,
        products, returns) point you to the exact items that need action today.
      </div>
    </div>
  );
}