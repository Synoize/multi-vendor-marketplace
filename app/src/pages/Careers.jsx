import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Heart,
  TrendingUp,
  Users,
  Zap,
  Shield,
  ArrowRight,
} from "lucide-react";

const PERKS = [
  {
    icon: Heart,
    title: "Health & Wellness",
    desc: "Comprehensive health insurance for you and your family.",
  },
  {
    icon: TrendingUp,
    title: "Growth",
    desc: "Continuous learning, mentorship, and clear career progression.",
  },
  {
    icon: Users,
    title: "Team Culture",
    desc: "Collaborative, inclusive, and innovation-driven work environment.",
  },
  {
    icon: Zap,
    title: "Flexibility",
    desc: "Flexible work hours and remote work options.",
  },
  {
    icon: Shield,
    title: "Financial Security",
    desc: "Competitive salaries, bonuses, and retirement benefits.",
  },
];

const OPENINGS = [
  {
    title: "Frontend Developer",
    team: "Engineering",
    location: "Nagpur / Remote",
    type: "Full-time",
  },
  {
    title: "Backend Developer",
    team: "Engineering",
    location: "Nagpur / Remote",
    type: "Full-time",
  },
  {
    title: "UI/UX Designer",
    team: "Design",
    location: "Nagpur / Remote",
    type: "Full-time",
  },
  {
    title: "Marketing Specialist",
    team: "Marketing",
    location: "Nagpur",
    type: "Full-time",
  },
  {
    title: "Customer Support Executive",
    team: "Operations",
    location: "Nagpur",
    type: "Full-time",
  },
];

export default function Careers() {
  return (
    <>
      <Helmet>
        <title>Careers - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Join The Damini Edit team. Explore open positions and grow your career with India's trusted marketplace."
        />
      </Helmet>

      <div className="max-w-6xl mx-auto px-4 py-4 sm:px-8 sm:py-8 lg:px-12">
        <div className="bg-gradient-to-br from-primary-500 to-accent text-white rounded-2xl p-5 sm:p-8 mb-6 sm:mb-8">
          <div className="text-center">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-white/15 flex items-center justify-center mx-auto mb-3">
              <Briefcase strokeWidth={1.5} className="h-6 w-6 sm:h-7 sm:w-7" />
            </div>
            <h1 className="text-lg sm:text-3xl font-semibold mb-1">
              Careers at The Damini Edit<sup className="ml-0.5">™</sup>
            </h1>
            <p className="text-secondary text-xs sm:text-sm">
              Build the future of Indian e-commerce with us.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto py-6 space-y-10">
          <div className="bg-white rounded-xl shadow-sm border border-secondary p-5 sm:p-8">
            <h2 className="text-xl font-semibold text-secondary-950 mb-3">
              Why Work With Us?
            </h2>
            <p className="text-secondary-800 text-sm leading-relaxed">
              At The Damini Edit, we're on a mission to transform how India
              shops and sells. We're a fast-growing marketplace backed by
              technology, innovation, and a passionate team. If you thrive in a
              dynamic environment and want to make a real impact, we'd love to
              have you on board.
            </p>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-secondary-950 mb-5 text-center">
              Perks & Benefits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {PERKS.map(({ icon: Icon, title, desc }) => (
                <div
                  key={title}
                  className="bg-white rounded-xl border border-secondary p-5 shadow-sm"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-50 flex items-center justify-center mb-3">
                    <Icon strokeWidth={1.5} className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-medium text-secondary-950 text-sm mb-1">
                    {title}
                  </h3>
                  <p className="text-secondary-700 text-xs leading-relaxed">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-secondary-950 mb-5 text-center">
              Open Positions
            </h2>
            <div className="space-y-3">
              {OPENINGS.map(({ title, team, location, type }) => (
                <div
                  key={title}
                  className="bg-white rounded-xl border border-secondary p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                >
                  <div>
                    <h3 className="font-medium text-secondary-950 text-sm">
                      {title}
                    </h3>
                    <p className="text-secondary-700 text-xs mt-0.5">
                      {team} &middot; {location} &middot; {type}
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled
                    className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium cursor-not-allowed shrink-0 disabled:opacity-60"
                  >
                    Apply
                    <ArrowRight strokeWidth={1.5} className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-secondary-50 rounded-xl p-5 sm:p-6 text-center">
            <p className="text-secondary-700 text-xs">
              Don't see a role that fits? Send your resume to HR.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
