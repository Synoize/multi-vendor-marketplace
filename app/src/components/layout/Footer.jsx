import { Link } from "react-router-dom";
import { ChevronDown, Store, Megaphone, Gift, HelpCircle } from "lucide-react";
import { useState } from "react";
import { assets, SOCIALLINKS } from "../../assets/assets";

const linkSections = [
  {
    title: "About",
    links: [
      { label: "Contact Us", to: "/contact" },
      { label: "About Us", to: "/about" },
      { label: "Careers", to: "/careers" },
    ],
  },
  {
    title: "Help",
    links: [
      { label: "Payments", to: "/payments" },
      { label: "Shipping", to: "/shipping" },
      { label: "Cancellation & Returns", to: "/cancellation-returns" },
      { label: "FAQ", to: "/faq" },
    ],
  },
  {
    title: "Consumer Policy",
    links: [
      { label: "Cancellation & Returns", to: "/cancellation-returns" },
      { label: "Terms Of Use", to: "/terms" },
      { label: "Security", to: "/security" },
      { label: "Privacy", to: "/privacy" },
      { label: "Sitemap", to: "/sitemap" },
    ],
  },
];

const contactBlocks = [
  {
    label: "Customer Support",
    value: "supportthedaminiedit@gmail.com",
    href: "mailto:supportthedaminiedit@gmail.com",
  },
  {
    label: "Business Enquiries",
    value: "thedaminiedit3094@gmail.com",
    href: "mailto:thedaminiedit3094@gmail.com",
  },
  { label: "Phone", value: "+91 8485833094", href: "tel:+918485833094" },
];

function ContactInfo() {
  return (
    <div className="space-y-3 text-sm">
      {contactBlocks.map((block) => (
        <div key={block.label}>
          <p className="text-secondary-600 text-xs">{block.label}</p>
          <a href={block.href} className="hover:text-[#2874F0] transition">
            {block.value}
          </a>
        </div>
      ))}
      <div>
        <p className="text-secondary-600 text-xs">Working Hours</p>
        <p>Mon – Sat : 9:00 AM – 8:00 PM</p>
      </div>
    </div>
  );
}

function SocialLinks() {
  return (
    <div className="flex items-center gap-4 mt-6">
      {SOCIALLINKS.map((social) => (
        <a
          key={social.name}
          href={social.links}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={social.name}
          className="transition-transform duration-200 hover:scale-110"
        >
          <img
            src={social.icons}
            alt={social.name}
            className="w-6 h-6 object-contain"
          />
        </a>
      ))}
    </div>
  );
}

export default function Footer() {
  const [open, setOpen] = useState(null);
  const toggle = (key) => setOpen(open === key ? null : key);

  return (
    <footer className="bg-secondary-900 text-secondary">
      {/* Main Footer */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-10">
        {/* MOBILE: collapsed accordion (like Amazon) */}
        <div className="lg:hidden">
          <Link to="/" className="shrink-0 select-none flex mb-2 gap-2">
            <img src={assets.logo} alt="The Damini Edit" className="h-10" />

            <div className="leading-none">
              <h1 className="text-white text-lg tracking-tight">
                The Damini Edit<sup className="ml-0.5">™</sup>
              </h1>

              <p className="text-[10px] italic text-accent mt-0.5">
                Explore <span className="text-white">Plus</span> ✦
              </p>
            </div>
          </Link>

          <div className="divide-y divide-secondary-800/60">
            {linkSections.map((section, i) => (
              <div key={section.title}>
                <button
                  onClick={() => toggle(i)}
                  className="w-full flex items-center justify-between py-3 text-secondary-700 uppercase text-xs font-semibold tracking-wide"
                >
                  {section.title}
                  <ChevronDown
                    className={`h-4 w-4 text-secondary-500 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`}
                  />
                </button>
                {open === i && (
                  <ul className="space-y-2 pb-3 text-sm">
                    {section.links.map(({ label, to }) => (
                      <li
                        key={label}
                        className="hover:underline underline-offset-4"
                      >
                        <Link to={to}>{label}</Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}

            <div>
              <button
                onClick={() => toggle("contact")}
                className="w-full flex items-center justify-between py-3 text-secondary-700 uppercase text-xs font-semibold tracking-wide"
              >
                Contact Us
                <ChevronDown
                  className={`h-4 w-4 text-secondary-500 transition-transform duration-200 ${open === "contact" ? "rotate-180" : ""}`}
                />
              </button>
              {open === "contact" && (
                <div className="pb-3">
                  <ContactInfo />
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 text-sm space-y-2">
            <p className="text-secondary-600 text-xs">
              Registered Office Address
            </p>
            <p>
              53H4+3CH The Damini Edit, opposite Chubeji
              <br className="hidden sm:block" />
              Katiya Bhandar Gittikhadan chowk Nagpur
              <br />
              Maharashtra – 440013, India
            </p>
          </div>

          <SocialLinks />
        </div>

        {/* DESKTOP: full grid */}
        <div className="hidden lg:grid lg:grid-cols-5 gap-10">
          {linkSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-secondary-700 uppercase text-xs font-semibold mb-4">
                {section.title}
              </h3>
              <ul className="space-y-2 text-sm">
                {section.links.map(({ label, to }) => (
                  <li
                    key={label}
                    className="hover:underline underline-offset-4"
                  >
                    <Link to={to}>{label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          {/* CONTACT */}
          <div className="lg:border-l border-secondary-800 lg:pl-8">
            <h3 className="text-secondary-700 uppercase text-xs font-semibold mb-4">
              Contact Us
            </h3>
            <ContactInfo />
            <SocialLinks />
          </div>

          {/* REGISTERED OFFICE */}
          <div className="space-y-3 text-sm">
            <Link to="/" className="shrink-0 select-none flex gap-2">
              <img src={assets.logo} alt="The Damini Edit" className="h-12" />
              <div className="leading-none">
                <h1 className="text-white font-medium text-xl tracking-tight">
                  The Damini Edit<sup className="ml-0.5">™</sup>
                </h1>
                <p className="text-xs md:text-[10px] italic text-accent -mt-0.5">
                  Explore <span className="text-white">Plus</span> ✦
                </p>
              </div>
            </Link>

            <div>
              <p className="text-secondary-600 text-xs">
                Registered Office Address
              </p>
              <p>
                53H4+3CH The Damini Edit, opposite Chubeji Katiya Bhandar
                Gittikhadan chowk Nagpur
                <br />
                Maharashtra – 440037, India
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <span className="text-secondary-600">CIN:</span> XXXXXXX
              </p>
              <p>
                <span className="text-secondary-600">GSTIN:</span>{" "}
                XXABCDE1234F1Z5
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-secondary-800">
        <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-6">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            {/* Links */}
            <div className="flex flex-wrap justify-center lg:justify-start gap-5 text-xs sm:text-sm">
              <Link
                to="/seller-register"
                className="flex items-center gap-2 transition-colors hover:text-secondary-600"
              >
                <Store size={16} strokeWidth={1} />
                <span>Become a Seller</span>
              </Link>

              <Link
                to="/advertise"
                className="flex items-center gap-2 transition-colors hover:text-secondary-600"
              >
                <Megaphone size={16} strokeWidth={1} />
                <span>Advertise</span>
              </Link>

              <Link
                to="/support"
                className="flex items-center gap-2 transition-colors hover:text-secondary-600"
              >
                <HelpCircle size={16} strokeWidth={1} />
                <span>Help Center</span>
              </Link>
            </div>

            {/* Copyright */}
            <p className="text-xs sm:text-sm text-center text-secondary-500">
              © 2026 thedaminiedit.com. All Rights Reserved.
            </p>

            {/* Payments */}
            <div className="flex flex-wrap justify-center gap-2">
              {["Visa", "Master", "RuPay", "UPI", "Net Banking"].map((item) => (
                <span
                  key={item}
                  className="bg-white text-black text-[10px] px-2.5 py-1 rounded"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
