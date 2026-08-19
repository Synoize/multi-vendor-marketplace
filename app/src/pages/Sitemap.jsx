import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Map } from "lucide-react";

const SITEMAP = [
  {
    title: "Shop",
    links: [
      { label: "Home", to: "/" },
      { label: "All Products", to: "/products" },
      { label: "Cart", to: "/cart" },
      { label: "Wishlist", to: "/wishlist" },
      { label: "My Orders", to: "/orders" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Login", to: "/login" },
      { label: "Sign Up", to: "/signup" },
      { label: "My Profile", to: "/profile" },
    ],
  },
  {
    title: "Seller",
    links: [
      { label: "Become a Seller", to: "/seller-register" },
    ],
  },
  {
    title: "Support",
    links: [
      { label: "Help Center", to: "/support" },
      { label: "Contact Us", to: "/contact" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    title: "About",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Careers", to: "/careers" },
      { label: "Press", to: "/press" },
      { label: "Damini Stories", to: "/stories" },
      { label: "Corporate Information", to: "/corporate" },
    ],
  },
  {
    title: "Policies",
    links: [
      { label: "Terms of Use", to: "/terms" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Security", to: "/security" },
      { label: "Cancellation & Returns", to: "/cancellation-returns" },
      { label: "Payments", to: "/payments" },
      { label: "Shipping & Delivery", to: "/shipping" },
      { label: "Grievance Redressal", to: "/grievance" },
    ],
  },
];

export default function Sitemap() {
  return (
    <>
      <Helmet>
        <title>Sitemap - The Damini Edit Marketplace</title>
        <meta name="description" content="Browse all pages and sections of The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Map strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Sitemap</h1>
            <p className="text-secondary text-xs sm:text-sm">Navigate every corner of The Damini Edit.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {SITEMAP.map(({ title, links }) => (
              <div key={title} className="bg-white rounded-xl border border-secondary p-5 shadow-sm">
                <h2 className="font-semibold text-secondary-950 text-sm mb-3">{title}</h2>
                <ul className="space-y-2">
                  {links.map(({ label, to }) => (
                    <li key={to}>
                      <Link to={to} className="text-secondary-700 text-xs hover:text-primary hover:underline transition-colors">
                        {label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
