import { Helmet } from "react-helmet-async";
import { CreditCard, Shield, CheckCircle } from "lucide-react";

const METHODS = [
  { name: "UPI", desc: "Pay via Google Pay, PhonePe, Paytm, BHIM, or any UPI app." },
  { name: "Credit / Debit Cards", desc: "Visa, Mastercard, RuPay, and American Express accepted." },
  { name: "Net Banking", desc: "All major Indian banks supported." },
  { name: "Wallets", desc: "Paytm, Amazon Pay, Mobikwik, and more." },
  { name: "Cash on Delivery", desc: "Available for eligible orders across India." },
];

export default function Payments() {
  return (
    <>
      <Helmet>
        <title>Payments - The Damini Edit Marketplace</title>
        <meta name="description" content="Learn about payment methods, security, and refund policies on The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <CreditCard strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Payments</h1>
            <p className="text-secondary text-xs sm:text-sm">Secure, flexible payment options for every shopper.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-4">Payment Methods</h2>
            <div className="space-y-4">
              {METHODS.map(({ name, desc }) => (
                <div key={name} className="flex items-start gap-3">
                  <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium text-secondary-950 text-sm">{name}</p>
                    <p className="text-secondary-700 text-xs leading-relaxed">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Payment Security</h2>
            <p className="text-secondary-800 text-sm leading-relaxed">
              All transactions on The Damini Edit are processed through PCI-DSS compliant payment gateways.
              Your card details are encrypted and never stored on our servers. We use industry-standard
              SSL/TLS encryption to protect your data during transmission.
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Refund Policy</h2>
            <p className="text-secondary-800 text-sm leading-relaxed">
              Refunds are processed within 5-7 business days after the return is approved. The amount is
              credited to the original payment method. For UPI and wallet payments, refunds are typically
              faster. COD refunds are processed via bank transfer or store credit.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
