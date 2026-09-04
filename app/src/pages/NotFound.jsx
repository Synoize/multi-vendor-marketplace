import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { Home, ArrowLeft, Search } from "lucide-react";

export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page Not Found - The Damini Edit</title>
      </Helmet>

      <div className="min-h-screen flex items-center justify-center px-4 bg-white">
        <div className="flex flex-col items-center text-center max-w-xl w-full">
          <iframe
            src="https://lottie.host/embed/78bc52a2-b83d-47e1-9d9c-1c4f5613138f/6k7wUWMm6N.lottie"
            title="404 Animation"
            className="w-full max-w-lg h-[150px] sm:h-[350px]"
          />

          <h1 className="mt-2 text-lg sm:text-2xl text-secondary-950">
            Oops! Page Not Found
          </h1>

          <p className="mt-3 text-secondary-800 max-w-md font-thin text-xs sm:text-base">
            The page you're looking for doesn't exist or may have been moved.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <Link
              to="/"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-xs text-white transition hover:opacity-90"
            >
              <Home strokeWidth={1} className="h-4 w-4" />
              Go Home
            </Link>

            <Link
              to="/products"
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary px-6 py-3 text-xs text-primary transition hover:bg-primary hover:text-white"
            >
              <Search strokeWidth={1.5} className="h-4 w-4" />
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
