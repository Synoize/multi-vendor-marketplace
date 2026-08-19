import { Helmet } from "react-helmet-async";
import { Truck, Clock, MapPin, AlertCircle } from "lucide-react";

export default function Shipping() {
  return (
    <>
      <Helmet>
        <title>Shipping & Delivery - The Damini Edit Marketplace</title>
        <meta name="description" content="Learn about shipping options, delivery timelines, and charges on The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Truck strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Shipping & Delivery</h1>
            <p className="text-secondary text-xs sm:text-sm">Fast, reliable delivery across India.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <Clock className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium text-secondary-950 text-sm">Standard Delivery</h3>
              <p className="text-secondary-700 text-xs mt-1">3-7 business days</p>
            </div>
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <Truck className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium text-secondary-950 text-sm">Express Delivery</h3>
              <p className="text-secondary-700 text-xs mt-1">1-3 business days (select areas)</p>
            </div>
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <MapPin className="h-8 w-8 text-primary mx-auto mb-2" />
              <h3 className="font-medium text-secondary-950 text-sm">Coverage</h3>
              <p className="text-secondary-700 text-xs mt-1">500+ cities across India</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">How Delivery Works</h2>
            <div className="space-y-3 text-sm text-secondary-800 leading-relaxed">
              <p>After you place an order, the seller packages and ships the item through our logistics partners. You'll receive real-time tracking updates via email and SMS.</p>
              <p>Delivery charges are calculated at checkout based on product weight, dimensions, and distance from the seller's warehouse to your delivery address.</p>
              <p>Free shipping is available on select products and for orders above a certain value, as indicated on the product page.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Important Notes</h2>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm leading-relaxed">
                  Delivery timelines may vary due to weather conditions, holidays, or remote pincode locations.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm leading-relaxed">
                  Please ensure your shipping address and phone number are accurate to avoid delivery delays.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm leading-relaxed">
                  Risk of loss passes to the buyer upon delivery to the carrier.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
