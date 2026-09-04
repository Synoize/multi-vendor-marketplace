import { Link } from "react-router-dom";
import { ChevronDown, Store, Megaphone, HelpCircle } from "lucide-react";
import { useState } from "react";
import { assets, SOCIALLINKS } from "../../assets/assets";
import { useSettings } from "@/store/settingsStore";

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

function ContactInfo() {
  const s = useSettings();
  const contactBlocks = [
    {
      label: "Customer Support",
      value: s.support_email,
      href: `mailto:${s.support_email}`,
    },
    {
      label: "Business Enquiries",
      value: s.business_email,
      href: `mailto:${s.business_email}`,
    },
    {
      label: "Phone",
      value: s.support_phone,
      href: `tel:${s.support_phone.replace(/[^+\d]/g, "")}`,
    },
  ];

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
        <p>{s.working_hours}</p>
      </div>
    </div>
  );
}

function SocialLinks() {
  const s = useSettings();
  const socialUrlMap = {
    Facebook: s.facebook_url,
    Instagram: s.instagram_url,
    YouTube: s.youtube_url,
    Twitter: s.twitter_url,
    WhatsApp: s.whatsapp_number ? `https://wa.me/${s.whatsapp_number}` : "",
  };

  return (
    <div className="flex items-center gap-4 mt-6">
      {SOCIALLINKS.map((social) => {
        const url = socialUrlMap[social.name];
        if (!url) return null;
        return (
          <a
            key={social.name}
            href={url}
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
        );
      })}
    </div>
  );
}

export default function Footer() {
  const [open, setOpen] = useState(null);
  const toggle = (key) => setOpen(open === key ? null : key);
  const s = useSettings();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-black/95 text-secondary">
      {/* Main Footer */}
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-10">
        {/* MOBILE: collapsed accordion (like Amazon) */}
        <div className="lg:hidden">
          <Link to="/" className="shrink-0 select-none flex mb-2 gap-2">
            <img src={assets.logo} alt={s.site_name} className="h-10" />

            <div className="leading-none">
              <h1 className="text-white text-lg tracking-tight">
                {s.site_name}
                <sup className="ml-0.5">™</sup>
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
            <p>{s.registered_address}</p>
          </div>

          <div className="mt-2 text-xs">
            <p>
              <span className="text-secondary-600">GSTIN:</span> {s.gstin}
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
              <img src={assets.logo} alt={s.site_name} className="h-12" />
              <div className="leading-none">
                <h1 className="text-white font-medium text-xl tracking-tight">
                  {s.site_name}
                  <sup className="ml-0.5">™</sup>
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
              <p>{s.registered_address}</p>
            </div>

            <div className="space-y-2 text-xs">
              <p>
                <span className="text-secondary-600">GSTIN:</span> {s.gstin}
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
              © {year} {s.site_domain}. All Rights Reserved.
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
