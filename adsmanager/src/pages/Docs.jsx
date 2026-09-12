import { useState } from "react";
import {
  BookOpen,
  Rocket,
  Megaphone,
  CreditCard,
  BarChart3,
  Wallet,
  Settings,
} from "lucide-react";

const DOCS = [
  {
    tab: "Overview",
    icon: Rocket,
    intro:
      "The Damini Edit Ads Manager lets vendors promote products through sponsored placements across the customer storefront. This is the complete guide to how it all works.",
    sections: [
      {
        title: "How ads work",
        items: [
          "Every ad runs as a campaign: a promoted product with a daily budget and a max cost-per-click (CPC) you set.",
          "When active, the promoted product appears in sponsored carousels and ad placements on the storefront.",
          "You only pay when your budget allows; a campaign spends nothing once paused or ended.",
          "Ads are tied to your vendor account — the Ads Manager logs in with the same credentials.",
        ],
      },
      {
        title: "Your workspace at a glance",
        items: [
          "Sidebar: Dashboard, Campaigns, Create Campaign, Billing, Documentation.",
          "Header: current ad wallet balance and notifications.",
          "Notifications cover order-like events plus ad alerts (low balance, budget exhausted).",
          "Everything is mobile-friendly through the same responsive layout.",
        ],
      },
    ],
  },
  {
    tab: "Campaigns",
    icon: Megaphone,
    intro:
      "Create, run and optimise ad campaigns for your products.",
    sections: [
      {
        title: "Creating a campaign",
        items: [
          "Pick the product you want to promote (products you have listed).",
          "Set your daily budget and maximum cost-per-click bid.",
          "Choose the campaign duration / schedule.",
          "Write the ad copy and pick your creative from the product images.",
          "Review the summary and launch.",
        ],
      },
      {
        title: "Managing campaigns",
        items: [
          "The Campaigns list shows every campaign with its status (active/paused/ended).",
          "Open any campaign to see detail: spend, impressions, clicks, CTR and remaining budget.",
          "Pause or resume campaigns at any time from the list or detail view.",
          "A running campaign only accrues spend while it is active.",
        ],
      },
    ],
  },
  {
    tab: "Billing & Wallet",
    icon: CreditCard,
    intro:
      "Ads are pre-funded from your ad wallet. Here is how that money works.",
    sections: [
      {
        title: "Wallet",
        items: [
          "Your ad balance is always visible in the sidebar and header.",
          "Add funds from the Billing page — payments are immediate.",
          "Every ad click/spend debits the wallet in real time.",
          "If your balance empties, campaigns pause automatically and you are notified.",
        ],
      },
      {
        title: "Alerts & limits",
        items: [
          "Settings lets you configure a max CPC bid limit and a low-balance threshold.",
          "You get notified when your balance drops below the threshold and when a budget is exhausted.",
          "Alerts keep you in control so your ads never run without your knowledge.",
        ],
      },
    ],
  },
  {
    tab: "Metrics",
    icon: BarChart3,
    intro:
      "Understand performance and spend efficiently.",
    sections: [
      {
        title: "Key numbers",
        items: [
          "Impressions — how many times your ad was shown.",
          "Clicks — how many users clicked through to your product.",
          "CTR — clicks ÷ impressions; a higher CTR means a more relevant ad.",
          "Spend — how much of your budget/campaign total has been used.",
        ],
      },
      {
        title: "Optimising",
        items: [
          "Raise or lower your CPC bid to compete for placement or control cost.",
          "Adjust the daily budget so spend matches your schedule.",
          "Compare campaigns and keep the creatives/products with the best CTR.",
          "End underperformers and reinvest in what converts.",
        ],
      },
    ],
  },
  {
    tab: "Commerce Context",
    icon: Wallet,
    intro:
      "How ads fit into the wider marketplace money model.",
    sections: [
      {
        title: "Ads vs sales money",
        items: [
          "Ad spend comes from your ad wallet and funds sponsored visibility.",
          "Sales payouts live in your Vendor Hub and use the commission + GST formula.",
          "The two are separate: ads buy visibility, sales generate payouts.",
          "Wallet balance and payout balance are distinct amounts.",
        ],
      },
      {
        title: "Where ads appear",
        items: [
          "Sponsored product carousels on the customer storefront.",
          "Search and listing ad slots (where product ranking shows sponsored marks).",
          "Only approved, active products are eligible to be promoted.",
        ],
      },
    ],
  },
  {
    tab: "Settings",
    icon: Settings,
    intro:
      "Tune your advertising preferences in two minutes.",
    sections: [
      {
        title: "Preferences",
        items: [
          "Max CPC bid limit — the highest bid you allow any campaign to use.",
          "Low balance threshold — get alerted before your wallet dries up.",
          "Notification toggles for budget-exhausted and low-balance events.",
          "Save changes and they apply to future alerts immediately.",
        ],
      },
      {
        title: "Profile",
        items: [
          "Your vendor profile (store name, email) is shown in the header and profile menu.",
          "Use Billing to add funds and keep your campaigns running.",
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
          <h1 className="text-xl sm:text-3xl font-bold">
            Ads Manager Documentation
          </h1>
          <p className="text-white/80 text-xs sm:text-sm mt-1">
            Everything about running ads on The Damini Edit — campaigns,
            wallet, billing and metrics.
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

      <div className="flex items-start gap-3 bg-white rounded-xl border border-secondary-300 shadow-sm p-4 sm:p-5">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <Icon strokeWidth={1.5} className="w-5 h-5 text-primary" />
        </div>
        <p className="text-secondary-800 text-sm leading-relaxed">{doc.intro}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {doc.sections.map((section) => (
          <div
            key={section.title}
            className="bg-white rounded-xl border border-secondary-300 shadow-sm overflow-hidden"
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