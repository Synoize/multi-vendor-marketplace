import React, { useState } from "react";
import { Helmet } from "react-helmet-async";
import { ShieldCheck, Scale, FileText, HelpCircle } from "lucide-react";

const POLICIES = {
  privacy: {
    title: "Privacy Policy",
    icon: <ShieldCheck className="h-5 w-5 text-[#2874F0]" />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-bold text-gray-800">Effective Date: July 1, 2026</p>
        <p>
          At The Damini Edit, accessible from http://localhost:5173, one of our
          main priorities is the privacy of our visitors. This Privacy Policy
          document contains types of information that is collected and recorded
          by The Damini Edit and how we use it.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">Information We Collect</h4>
        <p>
          We collect personal details such as your name, email address, phone
          number, shipping address, and payment information when you register,
          make a purchase, or communicate with us.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">
          How We Use Your Information
        </h4>
        <ul className="list-disc pl-5 space-y-1">
          <li>Provide, operate, and maintain our marketplace website.</li>
          <li>Improve, personalize, and expand our platform.</li>
          <li>Understand and analyze how you use our platform.</li>
          <li>Process transactions and handle order deliveries.</li>
          <li>
            Send security alerts, transactional updates, and promotional
            communications.
          </li>
        </ul>
        <h4 className="font-bold text-gray-900 mt-4">Cookies & Security</h4>
        <p>
          We use HttpOnly cookies to securely store session tokens and protect
          user login states. Data transmission is encrypted using
          industry-standard Secure Socket Layer (SSL) technology.
        </p>
      </div>
    ),
  },
  terms: {
    title: "Terms of Service",
    icon: <Scale className="h-5 w-5 text-[#2874F0]" />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <p className="font-bold text-gray-800">Last Updated: July 1, 2026</p>
        <p>
          By accessing The Damini Edit Marketplace, you agree to comply with and
          be bound by the following Terms and Conditions of service.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">User Accounts</h4>
        <p>
          Users are responsible for safeguarding their login credentials. Any
          activity conducted under your account is your sole responsibility. We
          reserve the right to ban or suspend accounts engaged in fraudulent
          behavior.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">Vendor Obligations</h4>
        <p>
          Verified sellers must listing products with accurate descriptions,
          pricing, and stock details. Sellers are strictly prohibited from
          listing counterfeit, illegal, or restricted products.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">
          Limitation of Liability
        </h4>
        <p>
          The Damini Edit acts as an intermediary platform connecting
          independent sellers with buyers. We are not liable for direct disputes
          between buyers and sellers, although we offer dispute resolution
          mechanisms.
        </p>
      </div>
    ),
  },
  shipping: {
    title: "Shipping & Returns Policy",
    icon: <FileText className="h-5 w-5 text-[#2874F0]" />,
    content: (
      <div className="space-y-4 text-sm text-gray-600 leading-relaxed">
        <h4 className="font-bold text-gray-900">Delivery Guidelines</h4>
        <p>
          Standard shipping deliveries are processed within 3-7 business days
          across India. Delivery fees are computed at checkout based on package
          weight and pincode serviceability check.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">Cancellation Window</h4>
        <p>
          Customers can cancel their order within 15 minutes of placing it
          directly from the My Orders dashboard. Once the order is confirmed or
          shipped by the vendor, cancellations cannot be processed.
        </p>
        <h4 className="font-bold text-gray-900 mt-4">Returns & Refunds</h4>
        <p>
          Eligible items can be returned within 7 days of delivery. Returned
          products must be in their original packaging, unused, and with
          original tags. Once pickup is completed and quality checked by the
          vendor, refunds are credited directly to the customer's payment source
          or wallet.
        </p>
      </div>
    ),
  },
};

export default function Legal() {
  const [activeTab, setActiveTab] = useState("privacy");

  return (
    <>
      <Helmet>
        <title>{`${POLICIES[activeTab].title} - The Damini Edit Marketplace`}</title>
      </Helmet>

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <HelpCircle className="h-10 w-10 text-[#2874F0] mx-auto mb-2 animate-float" />
          <h1 className="text-3xl font-bold text-gray-900">
            Legal, Policies & terms
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Read the marketplace terms, shipping rules, and privacy policies
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar */}
          <div className="w-full md:w-60 flex-shrink-0">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden py-2">
              {Object.entries(POLICIES).map(([key, policy]) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`w-full text-left px-4 py-3 text-sm font-semibold flex items-center gap-3 transition-colors ${
                    activeTab === key
                      ? "bg-blue-50 text-[#2874F0] border-l-4 border-[#2874F0]"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {policy.icon} {policy.title}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-50 pb-2">
              {POLICIES[activeTab].title}
            </h2>
            {POLICIES[activeTab].content}
          </div>
        </div>
      </div>
    </>
  );
}
