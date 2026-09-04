import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { RotateCcw, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function CancellationReturns() {
  return (
    <>
      <Helmet>
        <title>Cancellation & Returns - The Damini Edit Marketplace</title>
        <meta name="description" content="Learn about our cancellation and return policies on The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <RotateCcw strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Cancellation & Returns</h1>
            <p className="text-secondary text-xs sm:text-sm">Easy cancellations and hassle-free returns.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Order Cancellation</h2>
            <p className="text-secondary-800 text-sm leading-relaxed mb-4">
              You can cancel your order anytime before it is shipped. Once shipped, cancellation is not possible and you will need to use the return process after delivery.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm">Go to My Orders &rarr; Select the order &rarr; Click "Cancel Order"</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm">Refund for cancelled orders is processed within 5-7 business days.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Return Policy</h2>
            <p className="text-secondary-800 text-sm leading-relaxed mb-4">
              Most items are eligible for return within 7 days of delivery. The item must be unused, in its original packaging, with all tags and labels intact.
            </p>
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm">Initiate a return from My Orders &rarr; Select order &rarr; "Request Return"</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm">A pickup will be scheduled from your address.</p>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                <p className="text-secondary-800 text-sm">After quality check, your refund is processed within 5-7 business days.</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">Non-Returnable Items</h2>
            <div className="space-y-2">
              {["Innerwear and lingerie", "Perishable goods (food, flowers)", "Customized or personalized products", "Items without original packaging or tags", "Products damaged due to misuse"].map((item) => (
                <div key={item} className="flex items-start gap-3">
                  <XCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-secondary-800 text-sm">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              Need help with a return?{" "}
              <Link to="/support" className="text-primary font-medium hover:underline">Contact Support</Link>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
