import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  ShieldCheck,
  ChevronDown,
  Database,
  Eye,
  Lock,
  Share2,
  Cookie,
  UserCheck,
  Mail,
  Clock,
} from "lucide-react";

export const SECTIONS = [
  {
    id: "collection",
    icon: Database,
    title: "Information We Collect",
    content: `We collect the following types of information:

Personal Information: Name, email address, phone number, shipping/billing addresses, and payment details when you register, make a purchase, or contact support.

Transaction Data: Order history, payment method details (tokenized), delivery addresses, and purchase amounts.

Device & Usage Data: IP address, browser type, device information, operating system, pages visited, time spent on pages, and referral URLs collected through cookies and similar technologies.

Seller Information: Business name, GST/PAN numbers, bank account details, and pickup addresses collected during seller registration and KYC verification.`,
  },
  {
    id: "usage",
    icon: Eye,
    title: "How We Use Your Information",
    content: `We use your information to:

• Process and fulfill your orders, including payment processing and delivery
• Create and manage your account and provide customer support
• Send transactional updates (order confirmations, shipping notifications, delivery updates)
• Personalize your shopping experience with product recommendations
• Detect and prevent fraud, unauthorized access, and other security threats
• Improve our Platform, services, and user experience through analytics
• Send promotional communications (only with your consent; unsubscribe anytime)
• Comply with legal obligations and resolve disputes`,
  },
  {
    id: "cookies",
    icon: Cookie,
    title: "Cookies & Tracking",
    content: `We use cookies and similar technologies for:

Essential Cookies: Required for login sessions, cart management, and security. These are HttpOnly cookies that cannot be accessed by client-side scripts.

Analytics Cookies: Help us understand how users interact with our Platform, which pages are visited most, and where users encounter errors.

Preference Cookies: Remember your settings such as language, currency, and region preferences.

You can manage cookie preferences through your browser settings. Disabling essential cookies may affect Platform functionality.`,
  },
  {
    id: "sharing",
    icon: Share2,
    title: "Information Sharing",
    content: `We may share your information with:

Sellers: Order details (name, shipping address, phone) are shared with the relevant seller to fulfill your order.

Payment Processors: Payment information is shared with PCI-DSS compliant payment gateways to process transactions securely.

Logistics Partners: Delivery address and contact details are shared with shipping carriers for order delivery.

Legal Authorities: When required by law, court order, or to protect the rights and safety of The Damini Edit, our users, or the public.

We do not sell your personal information to third parties for their marketing purposes.`,
  },
  {
    id: "security",
    icon: Lock,
    title: "Data Security",
    content: `We implement industry-standard security measures to protect your data:

• All data transmission is encrypted using TLS/SSL technology
• Passwords are hashed using bcrypt with salt
• Session tokens are stored in HttpOnly, Secure cookies
• Payment card details are tokenized and never stored on our servers
• Access to personal data is restricted to authorized personnel only
• Regular security audits and vulnerability assessments are conducted

While we take every reasonable precaution, no method of transmission or storage is 100% secure. We encourage you to use strong passwords and keep your account credentials confidential.`,
  },
  {
    id: "retention",
    icon: Clock,
    title: "Data Retention",
    content: `We retain your information for as long as necessary to provide our services:

Account Data: Retained as long as your account is active. Deleted within 30 days of account closure.

Transaction Data: Retained for 7 years as required by Indian tax and accounting regulations.

Support Tickets: Retained for 2 years after the last message for quality and reference purposes.

Cookie Data: Expires based on cookie type (session cookies expire on browser close; persistent cookies last up to 12 months).`,
  },
  {
    id: "rights",
    icon: UserCheck,
    title: "Your Rights",
    content: `You have the right to:

• Access: Request a copy of all personal data we hold about you
• Correction: Update or correct inaccurate personal information
• Deletion: Request deletion of your personal data (subject to legal retention requirements)
• Portability: Receive your data in a structured, machine-readable format
• Opt-out: Unsubscribe from marketing communications at any time
• Grievance: File a complaint with our Data Protection Officer

To exercise any of these rights, contact us at privacy@damini.com. We will respond within 30 days.`,
  },
  {
    id: "children",
    icon: ShieldCheck,
    title: "Children's Privacy",
    content: `Damini Marketplace is not intended for users under 18 years of age. We do not knowingly collect personal information from children. If we become aware that a child has provided us with personal data, we will take steps to delete such information promptly.`,
  },
  {
    id: "grievance",
    icon: Mail,
    title: "Grievance Officer",
    content: `In accordance with the Information Technology Act, 2000 and the rules made thereunder, the Grievance Officer for The Damini Edit Marketplace can be contacted at:

Email: grievance@damini.com
Address: The Damini Edit Internet Private Limited, 23 BESA Road, Nagpur, Maharashtra - 440037

We aim to resolve all complaints within 30 days of receipt.`,
  },
];

export default function Privacy() {
  const [openSection, setOpenSection] = useState("collection");

  return (
    <>
      <Helmet>
        <title>Privacy Policy - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Read how The Damini Edit Marketplace collects, uses, and protects your personal information."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck
                strokeWidth={1.5}
                className="h-6 w-6 sm:h-7 sm:w-7"
              />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Privacy Policy
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              Effective Date: July 1, 2026 | Last Updated: July 1, 2026
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8 mb-6">
            <p className="text-secondary-800 text-sm leading-relaxed">
              At The Damini Edit, accessible from The thedaminiedit.com, one of
              our main priorities is the privacy of our visitors. This Privacy
              Policy document describes the types of information we collect and
              record, how we use it, and the steps we take to safeguard it. This
              policy applies to all users of our Platform, including buyers,
              sellers, and visitors.
            </p>
          </div>

          <div className="space-y-2">
            {SECTIONS.map((section) => {
              const isOpen = openSection === section.id;
              const Icon = section.icon;
              return (
                <div
                  key={section.id}
                  className="bg-white rounded-xl shadow-sm border border-secondary overflow-hidden"
                >
                  <button
                    onClick={() => setOpenSection(isOpen ? null : section.id)}
                    className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-secondary transition-colors"
                  >
                    <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                      <Icon
                        strokeWidth={1.5}
                        className="h-4 w-4 text-primary"
                      />
                    </div>
                    <span className="font-semibold text-secondary-950 text-sm flex-1">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={`h-4 w-4 text-secondary-700 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-0">
                      <div className="border-t border-secondary-100 pt-4">
                        <p className="text-secondary-800 text-sm leading-relaxed whitespace-pre-line">
                          {section.content}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-8 bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              For privacy-related inquiries, contact our Data Protection Officer
              at{" "}
              <a
                href="mailto:privacy@damini.com"
                className="text-primary font-medium hover:underline"
              >
                privacy@damini.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
