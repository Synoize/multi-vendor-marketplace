import { Helmet } from "react-helmet-async";
import { Building2 } from "lucide-react";
import { useSettings } from "@/store/settingsStore";

export default function Corporate() {
  const s = useSettings();
  return (
    <>
      <Helmet>
        <title>Corporate Information - {s.site_name} Marketplace</title>
        <meta name="description" content={`Corporate information about ${s.site_name} including registration details and governance.`} />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Building2 strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Corporate Information</h1>
            <p className="text-secondary text-xs sm:text-sm">Legal and governance details of {s.site_name}.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-4">Company Details</h2>
            <div className="space-y-3 text-sm text-secondary-800">
              <p><span className="font-medium text-secondary-950">Company Name:</span> {s.site_name}</p>
              <p><span className="font-medium text-secondary-950">GSTIN:</span> {s.gstin}</p>
              <p><span className="font-medium text-secondary-950">Registered Office:</span> {s.registered_address}</p>
              <p><span className="font-medium text-secondary-950">Email:</span> <a href={`mailto:${s.business_email}`} className="text-primary hover:underline">{s.business_email}</a></p>
              <p><span className="font-medium text-secondary-950">Phone:</span> {s.support_phone}</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-4">Board of Directors</h2>
            <div className="space-y-2 text-sm text-secondary-800">
              <p>Details available upon request.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-lg font-semibold text-secondary-950 mb-4">Policies</h2>
            <div className="space-y-2 text-sm text-secondary-800">
              <p>All corporate governance policies, including our Code of Conduct, Anti-Bribery Policy, and Whistleblower Policy, are available upon request.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
