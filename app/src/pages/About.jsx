import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";

import {
  Store,
  Shield,
  IndianRupee,
  ArrowRight,
  Target,
  Eye,
  Sprout,
  Globe2,
  Truck,
  Gem,
  Rocket,
  Heart,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  Award,
  Users,
  Quote,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { TEAM } from "../assets/assets";

const JOURNEY = [
  {
    year: "2025",
    title: "Foundation",
    icon: Sprout,
    desc: "The Damini Edit was founded with a vision to build a trusted Indian e-commerce marketplace. During this phase, we focused on market research, establishing our brand identity, building supplier relationships, and understanding customer needs.",
  },
  {
    year: "2026",
    title: "Website & Seller Onboarding",
    icon: Globe2,
    current: true,
    desc: "We launched our official online marketplace, introduced secure payments, order management, and customer support, while welcoming sellers from multiple categories across India to expand product variety.",
  },
  {
    year: "2027",
    title: "Expansion",
    icon: Truck,
    desc: "Expand our seller network, significantly increase product selection, launch Android and iOS mobile applications, and strengthen logistics partnerships for faster nationwide delivery.",
  },
  {
    year: "2028",
    title: "Brand Growth",
    icon: Gem,
    desc: "Introduce premium brands, exclusive collections, AI-powered product recommendations, personalized shopping experiences, and enhanced customer loyalty programs.",
  },
  {
    year: "2029",
    title: "Global Vision",
    icon: Rocket,
    beyond: true,
    desc: "Become one of India's leading multi-category marketplaces, expand into international markets, enable cross-border selling, and empower MSMEs, startups, and manufacturers with a world-class global commerce platform.",
  },
];

const VALUES = [
  {
    icon: Heart,
    title: "Customer First",
    desc: "Every decision begins with delivering the best shopping experience.",
    color: "text-rose-500",
    bg: "bg-rose-50",
  },
  {
    icon: ShieldCheck,
    title: "Trust & Authenticity",
    desc: "We partner with trusted sellers and ensure authentic, quality products.",
    color: "text-blue-500",
    bg: "bg-blue-50",
  },
  {
    icon: Sparkles,
    title: "Innovation",
    desc: "We continuously improve through technology, AI, and better digital experiences.",
    color: "text-purple-500",
    bg: "bg-purple-50",
  },
  {
    icon: TrendingUp,
    title: "Empowering Sellers",
    desc: "Helping businesses, startups, and entrepreneurs reach more customers and grow successfully.",
    color: "text-green-500",
    bg: "bg-green-50",
  },
  {
    icon: Award,
    title: "Quality & Value",
    desc: "Delivering the perfect balance of quality, affordability, and customer satisfaction.",
    color: "text-orange-500",
    bg: "bg-orange-50",
  },
];

const STATS = [
  { value: "50,000+", label: "Active sellers" },
  { value: "10 Lakh+", label: "Products listed" },
  { value: "500+", label: "Cities served" },
  { value: "1 Crore+", label: "Happy customers" },
];

export default function About() {
  return (
    <>
      <Helmet>
        <title>About Us - The Damini Edit Marketplace</title>
        <meta
          name="description"
          content="Learn about The Damini Edit Marketplace — India's trusted multi-vendor e-commerce platform connecting local sellers with customers nationwide."
        />
      </Helmet>

      {/* Hero */}
      <div className="bg-gradient-to-b from-primary-50/60 to-white">
        <div className="max-w-3xl mx-auto text-center px-4 pt-14 pb-8 sm:pt-20 sm:pb-10">
          <h1 className="text-2xl sm:text-4xl lg:text-[2.75rem] font-semibold text-secondary-950 mb-4 tracking-tight">
            Welcome to The Damini Edit<sup className="ml-0.5">™</sup>
          </h1>
          <p className="text-secondary-800 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            India's trusted multi-vendor marketplace, connecting local sellers
            with customers across the country. Born in Nagpur, built for Bharat.
          </p>
        </div>

        {/* Signature visual: a network of cities connecting to the marketplace */}
        <div className="max-w-4xl mx-auto px-4 pb-10 sm:pb-14">
          <div className="relative rounded-[28px] bg-gradient-to-br from-primary to-accent overflow-hidden py-10 sm:py-14 px-6">
            <svg
              className="absolute inset-0 w-full h-full opacity-[0.15]"
              viewBox="0 0 800 300"
              preserveAspectRatio="none"
            >
              <path
                d="M0,150 C200,80 300,220 400,150 C500,80 600,220 800,150"
                stroke="white"
                strokeWidth="1.5"
                fill="none"
              />
            </svg>
            <div className="relative flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur flex items-center justify-center mb-5">
                <Store className="h-7 w-7 text-white" />
              </div>
              <p className="text-secondary text-sm sm:text-base font-medium max-w-md text-center mb-8">
                One platform, thousands of neighborhood shops — from Itwari to
                Sadar and every tier-2 city in between.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-10 w-full max-w-2xl">
                {STATS.map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="text-xl sm:text-2xl font-bold text-white">
                      {value}
                    </p>
                    <p className="text-secondary text-xs mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6">
        {/* Mission & Vision */}
        <div className="py-6 sm:py-10 ">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
              Mission & Vision
            </h2>
            <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-2xl mx-auto leading-relaxed">
              Driven by purpose, inspired by innovation, and committed to
              creating a trusted marketplace for everyone.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 sm:gap-10">
            <div className="rounded-2xl border border-secondary-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                <Target strokeWidth={1.5} className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-secondary-950 mb-1.5">
                Our Mission
              </h2>
              <p className="italic text-secondary-800 text-sm mb-3">
                Making online shopping simple, trusted, and accessible.
              </p>
              <p className="text-secondary-700 text-sm leading-relaxed">
                Our mission is to offer a vast selection of authentic products
                across fashion, electronics, beauty, home, groceries, books,
                sports, automotive, toys, and more while empowering brands,
                businesses, and independent sellers to grow through a trusted
                digital marketplace. We strive to deliver secure payments,
                reliable service, competitive prices, and an exceptional
                shopping experience for every customer.
              </p>
            </div>

            <div className="rounded-2xl border border-secondary-200 bg-white p-6 sm:p-8 shadow-sm">
              <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center mb-4">
                <Eye strokeWidth={1.5} className="h-5 w-5 text-primary" />
              </div>
              <h2 className="text-xl font-medium text-secondary-950 mb-1.5">
                Our Vision
              </h2>
              <p className="italic text-secondary-800 text-sm mb-3">
                Building the world's most trusted online marketplace.
              </p>
              <p className="text-secondary-700 text-sm leading-relaxed">
                We envision The Damini Edit becoming a globally trusted
                marketplace that connects millions of customers with quality
                products across every category. Through innovation, technology,
                and customer-first thinking, we aim to redefine online shopping
                while creating opportunities for businesses, brands, and
                entrepreneurs worldwide.
              </p>
            </div>
          </div>
        </div>

        {/* About / Our Story */}
        <div className="py-6 sm:py-10 border-b border-secondary-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
              About The Damini Edit<sup className="ml-0.5">™</sup>
            </h2>
            <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-2xl mx-auto leading-relaxed">
              Discover the story behind our commitment to quality, trust, and
              exceptional shopping experiences.
            </p>
          </div>

          <div className="grid md:grid-cols-[1fr_280px] gap-14 items-start">
            <div className="space-y-6 text-secondary-900 leading-6 text-sm order-2 md:order-1">
              <p>
                The Damini Edit is more than an online marketplace—it's a
                carefully curated destination where{" "}
                <strong className="text-secondary-950">
                  quality, style, innovation, authenticity, and value
                </strong>
                , come together. The word "Edit" represents our commitment to
                selecting the best products from trusted brands and sellers, so
                customers can shop with confidence.
              </p>

              <p>
                Our vision is to build a global marketplace where millions of
                products across fashion, electronics, beauty, home, groceries,
                books, and more are available in one place. Every product
                featured on The Damini Edit is part of our promise to deliver
                quality, authenticity, and an exceptional shopping experience.
              </p>

              <p>
                Whether you're shopping for everyday essentials or premium
                brands, The Damini Edit is dedicated to making online shopping
                simple, secure, and enjoyable. What "Edit" Means "Edit" means
                carefully choosing the best. At The Damini Edit, every product
                is thoughtfully selected to ensure quality, value, and customer
                satisfaction.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-5 pt-4">
                <div className="rounded-2xl border border-secondary-200 bg-secondary p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-medium text-primary">
                    100%
                  </h3>
                  <p className="mt-1 text-xs text-secondary-800">
                    Genuine Products
                  </p>
                </div>

                <div className="rounded-2xl border border-secondary-200 bg-secondary p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-medium text-primary">
                    Secure
                  </h3>
                  <p className="mt-1 text-xs text-secondary-800">
                    Payment Gateway
                  </p>
                </div>

                <div className="rounded-2xl border border-secondary-200 bg-secondary p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-medium text-primary">
                    Trusted
                  </h3>
                  <p className="mt-1 text-xs text-secondary-800">
                    Verified Sellers
                  </p>
                </div>

                <div className="rounded-2xl border border-secondary-200 bg-secondary p-5 text-center">
                  <h3 className="text-lg sm:text-xl font-medium text-primary">
                    24/7
                  </h3>
                  <p className="mt-1 text-xs text-secondary-800">
                    Customer Support
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-center order-1 md:order-2">
              <div className="sticky top-24 max-w-xs rounded-3xl border border-secondary-100 bg-gradient-to-br from-primary-50 to-white p-8 text-center shadow-sm">
                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-white shadow-sm">
                  <Quote
                    strokeWidth={1.5}
                    className="h-8 w-8 text-primary/40"
                  />
                </div>

                <h3 className="mt-6 text-xl text-secondary-950">
                  Curated with Trust
                </h3>

                <p className="mt-3 text-sm leading-5 font-thin text-secondary-800">
                  Every purchase is backed by quality standards, trusted
                  sellers, secure payments, and a customer-first shopping
                  experience.
                </p>

                <div className="mt-6 border-t pt-5 text-xs tracking-widest uppercase text-secondary-800">
                  Quality • Trust • Innovation
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Growth Journey */}
        <div className="py-6 sm:py-10 border-b border-secondary-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
              Our Growth Journey
            </h2>
            <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-2xl mx-auto leading-relaxed">
              From founding to a world-class global marketplace
            </p>
          </div>
          <div className="relative pl-2">
            {/* connecting line */}
            <div className="absolute left-[27px] sm:left-[36px] top-2 bottom-2 w-px bg-gradient-to-br from-primary-500 to-accent" />

            <div className="space-y-10">
              {JOURNEY.map(
                ({ year, title, icon: Icon, desc, current, beyond }) => (
                  <div key={year} className="relative flex gap-5 sm:gap-6">
                    <div className="relative z-10 flex-shrink-0">
                      <div
                        className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-sm ${
                          current
                            ? "bg-primary ring-2 border-2 ring-primary border-white"
                            : "bg-gradient-to-br from-primary-500 to-accent ring-1 border-2 ring-accent border-white"
                        }`}
                      >
                        <Icon
                          strokeWidth={1.5}
                          className="h-4 w-4 sm:h-6 sm:w-6 text-white"
                        />
                      </div>
                    </div>
                    <div className="pt-1">
                      <div className="flex items-center flex-wrap gap-2 mb-1">
                        <span
                          className={`text-xs font-semibold px-3 py-1 rounded-full ${
                            current
                              ? " bg-primary-50 text-primary-500"
                              : "bg-accent-50 text-accent"
                          }`}
                        >
                          {year}
                          {beyond ? " & Beyond" : ""}
                        </span>
                        {current && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-accent">
                            We are here
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-secondary-950 text-sm sm:text-base mb-1.5">
                        {title}
                      </h3>
                      <p className="text-secondary-800 text-xs sm:text-sm font-thin leading-relaxed max-w-xl">
                        {desc}
                      </p>
                    </div>
                  </div>
                ),
              )}
            </div>
          </div>
        </div>

        {/* Values */}
        <div className="py-6 sm:py-10 border-b border-secondary-100">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
              Our Core Values
            </h2>
            <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-2xl mx-auto leading-relaxed">
              At The Damini Edit, our values shape every decision we make—from
              selecting trusted sellers and quality products to delivering
              secure, transparent, and customer-first shopping experiences.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {VALUES.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <div
                key={title}
                className={`rounded-xl border border-secondary-200 bg-white p-5 sm:p-6 shadow-sm ${
                  i === VALUES.length - 1 ? "sm:col-span-2 lg:col-span-1" : ""
                }`}
              >
                <div
                  className={`w-10 h-10 rounded-lg ${bg} flex items-center justify-center mb-3`}
                >
                  <Icon strokeWidth={1.5} className={`h-5 w-5 ${color}`} />
                </div>
                <h3 className="font-bold text-secondary-950 text-sm mb-1.5">
                  {title}
                </h3>
                <p className="text-secondary-800 text-sm leading-relaxed">
                  {desc}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Leadership */}
        <div className="py-6 sm:py-10">
          <div className="text-center mb-10">
            <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
              Leadership
            </h2>
            <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
              A passionate team building the future of digital commerce with
              innovation, trust, and customer satisfaction at its core.
            </p>
          </div>

          <div className="grid grid-cols-3 gap-1 sm:gap-6">
            {TEAM.map(({ role, desc, image }) => (
              <div
                key={role}
                className="text-center group transition-all duration-300"
              >
                <img
                  src={image}
                  alt={role}
                  className=" aspect-square rounded-3xl object-cover p-1 shadow-sm transition-all duration-300 group-hover:scale-105 mb-4"
                />

                <h3 className="font-medium text-secondary-950 text-sm sm:text-lg">
                  {role}
                </h3>

                <p className="text-secondary-800 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-3xl mx-auto px-4 pt-12 pb-6 sm:pb-24 text-center">
        <div className="text-center mb-10">
          <h2 className="text-2xl sm:text-3xl font-medium text-secondary-950">
            Ready to get started?
          </h2>
          <p className="text-secondary-700 font-thin text-sm sm:text-base mt-2 max-w-xl mx-auto leading-relaxed">
            Whether you want to sell or shop, The Damini Edit has something for
            you.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/seller-register"
            className="group inline-flex items-center justify-center gap-2 bg-primary text-white px-6 py-3 rounded-xl text-sm hover:bg-opacity-90 transition-colors"
          >
            Become a Seller{" "}
            <ArrowRight className="h-4 w-4 transform transition-all duration-300 group-hover:translate-x-1" />
          </Link>
          <Link
            to="/products"
            className="group inline-flex items-center justify-center gap-2 rounded-xl border text-secondary-950 px-6 py-3 text-sm font-medium transition-all duration-300 hover:bg-secondary hover:shadow-sm"
          >
            <ShoppingCart className="h-4 w-4 transform transition-all duration-300 group-hover:scale-110" />{" "}
            Start Shopping
          </Link>
        </div>
      </div>
    </>
  );
}
