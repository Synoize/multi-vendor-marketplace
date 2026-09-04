import { ChevronLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function PageHeader({ title, right, className = "" }) {
  const navigate = useNavigate();

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <h1 className="sm:text-lg md:text-xl font-medium text-black flex items-center gap-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="p-1 rounded-lg text-xs sm:text-sm font-medium text-secondary-800 hover:bg-secondary"
        >
          <ChevronLeft strokeWidth={1.5} className="w-5 h-5" />
        </button>
        {title}
      </h1>
      {right}
    </div>
  );
}
