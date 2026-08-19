import { Helmet } from "react-helmet-async";
import { ShieldCheck, Lock, Server, Eye, Key, FileCheck } from "lucide-react";

const MEASURES = [
  { icon: Lock, title: "SSL/TLS Encryption", desc: "All data transmitted between your browser and our servers is encrypted using industry-standard TLS/SSL protocols." },
  { icon: Server, title: "Secure Infrastructure", desc: "Our servers are hosted on enterprise-grade cloud infrastructure with multiple layers of security and regular audits." },
  { icon: Key, title: "Password Hashing", desc: "Passwords are hashed using bcrypt with salt, ensuring they cannot be read even in the event of a data breach." },
  { icon: Eye, title: "Access Control", desc: "Personal data is accessible only to authorized personnel on a need-to-know basis with role-based permissions." },
  { icon: FileCheck, title: "PCI-DSS Compliance", desc: "Payment processing is handled by PCI-DSS compliant gateways. Card details are tokenized and never stored on our servers." },
  { icon: ShieldCheck, title: "Regular Audits", desc: "We conduct periodic security audits, vulnerability assessments, and penetration testing to identify and fix threats." },
];

export default function Security() {
  return (
    <>
      <Helmet>
        <title>Security - The Damini Edit Marketplace</title>
        <meta name="description" content="Learn about the security measures and data protection practices at The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <ShieldCheck strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Security</h1>
            <p className="text-secondary text-xs sm:text-sm">Your safety is our top priority.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8 mb-6">
            <p className="text-secondary-800 text-sm leading-relaxed">
              At The Damini Edit, we take security seriously. Our platform is built with multiple layers of protection
              to safeguard your personal information, payment data, and browsing activity. We follow industry best
              practices and comply with applicable data protection regulations.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {MEASURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-white rounded-xl border border-secondary p-5 shadow-sm">
                <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                  <Icon strokeWidth={1.5} className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-medium text-secondary-950 text-sm mb-1">{title}</h3>
                <p className="text-secondary-700 text-xs leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-8 bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              Found a security vulnerability? Report it to{" "}
              <a href="mailto:security@damini.com" className="text-primary font-medium hover:underline">security@damini.com</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
