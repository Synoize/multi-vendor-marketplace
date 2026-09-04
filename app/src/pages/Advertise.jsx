import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Megaphone, ArrowRight, Target, BarChart3, Globe } from "lucide-react";

export default function Advertise() {
  return (
    <>
      <Helmet>
        <title>Advertise - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Advertise your brand on The Damini Edit Marketplace. Reach millions of Indian shoppers."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Megaphone strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Advertise With Us
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              Reach millions of active shoppers across India.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-8">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-xl font-semibold text-secondary-950 mb-3">
              Why Advertise on The Damini Edit?
            </h2>
            <p className="text-secondary-800 text-sm leading-relaxed">
              With millions of monthly visitors and a growing customer base
              across 500+ cities, The Damini Edit offers brands and sellers an
              unparalleled opportunity to showcase their products to a highly
              engaged audience. Our targeted advertising solutions help you
              reach the right customers at the right time.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <Target
                strokeWidth={1.2}
                className="h-8 w-8 text-pink-500 mx-auto mb-2"
              />
              <h3 className="font-medium text-secondary-950 text-sm">
                Targeted Reach
              </h3>
              <p className="text-secondary-700 text-xs mt-1">
                Reach specific demographics, categories, and regions.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <BarChart3
                strokeWidth={1.2}
                className="h-8 w-8 text-orange-500 mx-auto mb-2"
              />
              <h3 className="font-medium text-secondary-950 text-sm">
                Performance Insights
              </h3>
              <p className="text-secondary-700 text-xs mt-1">
                Track impressions, clicks, and conversions in real-time.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-secondary p-5 text-center shadow-sm">
              <Globe
                strokeWidth={1.2}
                className="h-8 w-8 text-blue-500 mx-auto mb-2"
              />
              <h3 className="font-medium text-secondary-950 text-sm">
                Wide Coverage
              </h3>
              <p className="text-secondary-700 text-xs mt-1">
                Access customers across 500+ cities in India.
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-3">
              Ad Formats
            </h2>
            <div className="space-y-3 text-sm text-secondary-800 leading-relaxed">
              <p>
                <strong className="text-secondary-950">Banner Ads:</strong>{" "}
                Display your brand across category and product pages.
              </p>
              <p>
                <strong className="text-secondary-950">
                  Sponsored Listings:
                </strong>{" "}
                Feature your products at the top of search results.
              </p>
              <p>
                <strong className="text-secondary-950">
                  Homepage Takeover:
                </strong>{" "}
                Dominate the homepage with exclusive placements during
                campaigns.
              </p>
            </div>
          </div>

          <div className="p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-sm mb-3">
              Ready to grow your brand?
            </p>
            <a
              href="mailto:thedaminiedit3094@gmail.com"
              className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-xl text-sm font-medium hover:bg-opacity-90 transition-colors"
            >
              Contact Our Sales Team <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
