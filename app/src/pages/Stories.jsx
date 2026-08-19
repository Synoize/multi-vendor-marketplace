import { Helmet } from "react-helmet-async";
import { BookOpen, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const STORIES = [
  { title: "From Local Shop to National Reach", desc: "How a small store in Nagpur scaled to 10,000+ orders using The Damini Edit.", date: "June 2026" },
  { title: "Women Entrepreneurs on The Damini Edit", desc: "Meet the women-led businesses thriving on our platform.", date: "May 2026" },
  { title: "Behind the Scenes: Our Logistics Network", desc: "A deep dive into how we deliver across 500+ cities.", date: "April 2026" },
  { title: "Customer Stories: Trust in Every Order", desc: "Real experiences from our happiest customers.", date: "March 2026" },
];

export default function Stories() {
  return (
    <>
      <Helmet>
        <title>Damini Stories - The Damini Edit Marketplace</title>
        <meta name="description" content="Read inspiring stories from sellers, customers, and the team behind The Damini Edit Marketplace." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <BookOpen strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">Damini Stories</h1>
            <p className="text-secondary text-xs sm:text-sm">Inspiring stories from our community of sellers, buyers, and dreamers.</p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {STORIES.map(({ title, desc, date }) => (
              <div key={title} className="bg-white rounded-xl border border-secondary p-5 sm:p-6 shadow-sm hover:shadow-md transition-shadow">
                <p className="text-primary text-xs font-medium mb-2">{date}</p>
                <h3 className="font-semibold text-secondary-950 text-base mb-2">{title}</h3>
                <p className="text-secondary-700 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-10 bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              Want to share your story?{" "}
              <a href="mailto:stories@damini.com" className="text-primary font-medium hover:underline">Contact us</a>
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
