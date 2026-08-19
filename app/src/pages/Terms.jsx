import { useState } from "react";
import { Helmet } from "react-helmet-async";
import {
  Scale,
  ChevronDown,
  Shield,
  FileText,
  AlertTriangle,
  Users,
  CreditCard,
  Gavel,
} from "lucide-react";

export const SECTIONS = [
  {
    id: "acceptance",
    icon: FileText,
    title: "Acceptance of Terms",
    content: `By accessing or using The Damini Edit Marketplace, you agree to be bound by these Terms and Conditions. If you do not agree, please do not use the Platform. These terms apply to all users, including buyers, sellers, and visitors.`,
  },
  {
    id: "accounts",
    icon: Users,
    title: "User Accounts",
    content: `You must be at least 18 years old to create an account. You are responsible for maintaining the confidentiality of your login credentials and for all activities under your account. You agree to provide accurate, current, and complete information during registration and to update it as necessary. The Damini Edit reserves the right to suspend or terminate accounts found engaging in fraudulent, illegal, or abusive behavior.`,
  },
  {
    id: "products",
    icon: FileText,
    title: "Product Listings & Pricing",
    content: `Sellers are responsible for all product listings, including accurate descriptions, images, pricing, and stock availability. The Damini Edit does not guarantee the accuracy of product listings provided by sellers. All prices are inclusive of applicable taxes unless stated otherwise. The Damini Edit reserves the right to remove listings that violate our policies or are found to be misleading.`,
  },
  {
    id: "orders",
    icon: CreditCard,
    title: "Orders & Payments",
    content: `Orders are confirmed only after successful payment processing. We accept UPI, credit/debit cards, net banking, wallets, and Cash on Delivery (COD) where available. The Damini Edit acts as an intermediary and collects payments on behalf of sellers. Refunds, where applicable, are processed within 5-7 business days to the original payment method or wallet.`,
  },
  {
    id: "shipping",
    icon: FileText,
    title: "Shipping & Delivery",
    content: `Standard delivery takes 3-7 business days depending on the pincode and seller location. Express delivery is available for select areas. Delivery charges are calculated at checkout based on weight, dimensions, and distance. Risk of loss and title for items pass to the buyer upon delivery to the carrier.`,
  },
  {
    id: "returns",
    icon: AlertTriangle,
    title: "Returns & Refunds",
    content: `Most items are eligible for return within 7 days of delivery. Items must be unused, in original packaging, with all tags intact. Certain categories (innerwear, perishables, customized products) are non-returnable. Refunds are initiated after quality check of the returned item. Marketplace credits or wallet refunds may be offered as alternatives at The Damini Edit's discretion.`,
  },
  {
    id: "vendors",
    icon: Shield,
    title: "Vendor Obligations",
    content: `Verified sellers must list products with accurate descriptions, pricing, and stock details. Sellers are strictly prohibited from listing counterfeit, illegal, or restricted products. Sellers must process and ship orders within the promised timeline. Repeated cancellations, late shipments, or poor quality may result in account suspension. Sellers are responsible for managing their own tax compliance including GST filing.`,
  },
  {
    id: "liability",
    icon: Gavel,
    title: "Limitation of Liability",
    content: `Damini acts as an intermediary platform connecting independent sellers with buyers. We are not liable for direct disputes between buyers and sellers, although we offer dispute resolution mechanisms. The Damini Edit shall not be liable for any indirect, incidental, or consequential damages. Our total liability shall not exceed the amount paid by you for the specific transaction in question.`,
  },
  {
    id: "intellectual",
    icon: Shield,
    title: "Intellectual Property",
    content: `All content on the Platform, including logos, text, graphics, and software, is the property of The Damini Edit or its licensors and is protected by applicable intellectual property laws. Sellers grant The Damini Edit a non-exclusive license to use product images and descriptions for marketing and platform operations. Unauthorized reproduction or distribution of any content is strictly prohibited.`,
  },
  {
    id: "modifications",
    icon: FileText,
    title: "Modifications to Terms",
    content: `Damini reserves the right to modify these Terms at any time. Changes will be effective upon posting on the Platform. Continued use of the Platform after changes constitutes acceptance of the modified Terms. Users will be notified of material changes via email or platform notifications.`,
  },
];

export default function Terms() {
  const [openSection, setOpenSection] = useState("acceptance");

  return (
    <>
      <Helmet>
        <title>Terms & Conditions - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Read the terms and conditions governing the use of The Damini Edit Marketplace platform."
        />
      </Helmet>

      {/* Hero */}
      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        {/* Header */}
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center mb-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Scale strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Terms & Conditions
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              Have a question? We'd love to hear from you.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8 mb-6">
            <p className="text-secondary-800 text-sm leading-relaxed">
              Welcome to The Damini Edit Marketplace. These Terms and Conditions
              ("Terms") govern your use of our platform, including our website,
              mobile applications, and related services (collectively, the
              "Platform"). Please read them carefully before using the Platform.
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
              If you have any questions about these Terms, please contact us at{" "}
              <a
                href="mailto:legal@damini.com"
                className="text-primary font-medium hover:underline"
              >
                legal@damini.com
              </a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
