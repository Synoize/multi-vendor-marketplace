import { useEffect, useState } from "react";
import { Check, ChevronDown, Scale, ShieldCheck, X } from "lucide-react";
import { SECTIONS as TERMS_SECTIONS } from "@/pages/Terms";
import { SECTIONS as PRIVACY_SECTIONS } from "@/pages/Privacy";

export default function LegalModal({ type = "terms", onClose }) {
  const sections = type === "privacy" ? PRIVACY_SECTIONS : TERMS_SECTIONS;
  const [openSection, setOpenSection] = useState(sections[0]?.id);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  const isPrivacy = type === "privacy";
  const Icon = isPrivacy ? ShieldCheck : Scale;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-secondary sticky top-0 bg-white rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center">
              <Icon strokeWidth={1.5} className="h-4 w-4 text-primary" />
            </div>
            <h3 className="font-semibold text-secondary-950 text-sm sm:text-base">
              {isPrivacy ? "Privacy Policy" : "Terms & Conditions"}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 rounded-full hover:bg-secondary-100 transition-colors"
          >
            <X className="h-4 w-4 text-secondary-800" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-5 space-y-2">
          {sections.map((section) => {
            const isOpen = openSection === section.id;
            const SectionIcon = section.icon;
            return (
              <div
                key={section.id}
                className="bg-white rounded-xl border border-secondary overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenSection(isOpen ? null : section.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-secondary transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
                    <SectionIcon
                      strokeWidth={1.5}
                      className="h-4 w-4 text-primary"
                    />
                  </div>
                  <span className="font-semibold text-secondary-950 text-xs sm:text-sm flex-1">
                    {section.title}
                  </span>
                  <ChevronDown
                    className={`h-4 w-4 text-secondary-700 flex-shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-secondary-100 pt-3">
                      <p className="text-secondary-800 text-xs sm:text-sm leading-relaxed whitespace-pre-line">
                        {section.content}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="border-t border-secondary px-4 sm:px-5 py-3 sticky bottom-0 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="w-full flex items-center justify-center gap-1.5 bg-primary hover:bg-opacity-90 text-white py-2.5 rounded-lg text-xs sm:text-sm font-medium transition-colors"
          >
            <Check className="h-4 w-4" /> I've read this
          </button>
        </div>
      </div>
    </div>
  );
}
