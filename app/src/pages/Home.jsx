import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { ChevronRight, Zap, Clock } from 'lucide-react'
import api from '@/lib/axios'
import ProductCard from '@/components/product/ProductCard'
import { SkeletonProductGrid, SkeletonBanner } from '@/components/ui/SkeletonCard'
import { useState, useEffect } from 'react'

// Countdown Timer
function CountdownTimer({ targetDate }) {
  const [time, setTime] = useState({ d: 0, h: 0, m: 0, s: 0 })
  useEffect(() => {
    const interval = setInterval(() => {
      const diff = Math.max(0, Math.floor((new Date(targetDate) - Date.now()) / 1000))
      setTime({
        d: Math.floor(diff / 86400),
        h: Math.floor((diff % 86400) / 3600),
        m: Math.floor((diff % 3600) / 60),
        s: diff % 60,
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [targetDate])

  const pad = (n) => String(n).padStart(2, '0')
  return (
    <div className="flex items-center gap-2">
      {[['d', 'Days'], ['h', 'Hrs'], ['m', 'Min'], ['s', 'Sec']].map(([k, label]) => (
        <div key={k} className="text-center">
          <div className="bg-[#1a1a2e] text-white font-bold text-lg w-12 h-10 rounded flex items-center justify-center tabular-nums">
            {pad(time[k])}
          </div>
          <div className="text-gray-500 text-[9px] mt-0.5">{label}</div>
        </div>
      ))}
    </div>
  )
}

// Hero Banner Carousel (manual, no lib required)
function HeroBanner({ banners }) {
  const [active, setActive] = useState(0)
  useEffect(() => {
    if (!banners.length) return
    const interval = setInterval(() => setActive(i => (i + 1) % banners.length), 4000)
    return () => clearInterval(interval)
  }, [banners.length])

  if (!banners.length) return <SkeletonBanner />
  return (
    <div className="relative overflow-hidden rounded-lg shadow-md bg-gray-200" style={{ aspectRatio: '3/1' }}>
      {banners.map((b, i) => (
        <div key={b.id}
          className={`absolute inset-0 transition-opacity duration-700 ${i === active ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}>
          <Link to={b.link || '#'}>
            <img src={b.image || `https://picsum.photos/seed/${b.id}/1200/400`} alt={b.title}
              className="w-full h-full object-cover" />
          </Link>
        </div>
      ))}
      {/* Dots */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
        {banners.map((_, i) => (
          <button key={i} onClick={() => setActive(i)}
            className={`h-1.5 rounded-full transition-all ${i === active ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
        ))}
      </div>
    </div>
  )
}

// Section Header
function SectionHeader({ title, subtitle, link, linkText = 'View All', icon }) {
  return (
    <div className="flex items-center justify-between mb-4">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-lg md:text-xl font-bold text-gray-900">{title}</h2>
        </div>
        {subtitle && <p className="text-gray-500 text-sm mt-0.5">{subtitle}</p>}
      </div>
      {link && (
        <Link to={link} className="flex items-center gap-1 text-[#2874F0] hover:text-[#1a5de0] text-sm font-semibold transition-colors">
          {linkText} <ChevronRight className="h-4 w-4" />
        </Link>
      )}
    </div>
  )
}

// Category Pill
function CategoryPill({ cat }) {
  return (
    <Link to={`/products?category=${cat.slug}`}
      className="flex flex-col items-center gap-1.5 group min-w-[72px]">
      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100 group-hover:from-[#2874F0] group-hover:to-[#1a5de0] flex items-center justify-center text-2xl transition-all duration-300 shadow-sm group-hover:shadow-md">
        {cat.icon || '📦'}
      </div>
      <span className="text-xs text-gray-700 font-medium text-center line-clamp-1 w-full group-hover:text-[#2874F0] transition-colors">{cat.name}</span>
    </Link>
  )
}

export default function Home() {
  const { data: banners = [], isLoading: bannersLoading } = useQuery({
    queryKey: ['banners', 'hero'],
    queryFn: async () => {
      const { data } = await api.get('/banners?position=hero')
      return data.data || []
    },
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/categories')
      return data.data?.filter(c => !c.parent_id) || []
    },
    staleTime: 10 * 60 * 1000,
  })

  const { data: featuredProducts = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['products', 'featured'],
    queryFn: async () => {
      const { data } = await api.get('/products/featured?limit=10')
      return data.data || []
    },
  })

  const { data: trendingProducts = [], isLoading: trendingLoading } = useQuery({
    queryKey: ['products', 'trending'],
    queryFn: async () => {
      const { data } = await api.get('/products/trending?limit=10')
      return data.data || []
    },
  })

  const { data: topDeals = [], isLoading: dealsLoading } = useQuery({
    queryKey: ['products', 'deals'],
    queryFn: async () => {
      const { data } = await api.get('/products?sort=sale_count&order=desc&limit=8')
      return data.data?.products || []
    },
  })

  // Sale end date: 2 days from now
  const saleEnd = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString()

  return (
    <>
      <Helmet>
        <title>Damini - India's Favourite Marketplace | Best Deals Online</title>
        <meta name="description" content="Shop the best products at unbeatable prices on Damini. Electronics, Fashion, Home & Kitchen, Beauty, and more. Free shipping on orders above ₹499." />
      </Helmet>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4 space-y-8">

        {/* Hero Banner */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3">
            {bannersLoading ? <SkeletonBanner /> : <HeroBanner banners={banners} />}
          </div>
          <div className="hidden md:flex flex-col gap-3">
            {/* Offer side banners */}
            <div className="bg-gradient-to-br from-[#2874F0] to-[#1a5de0] rounded-lg p-4 text-white flex flex-col justify-between h-full">
              <div>
                <p className="text-[#FFE11B] font-bold text-sm">🔥 Flash Sale</p>
                <h3 className="text-lg font-bold mt-1">Up to 70% Off</h3>
                <p className="text-blue-200 text-sm mt-1">On Top Electronics</p>
              </div>
              <Link to="/products?category=electronics&sort=sale_count"
                className="mt-4 bg-white text-[#2874F0] font-bold text-xs px-3 py-2 rounded text-center hover:bg-[#FFE11B] transition-colors">
                Shop Now
              </Link>
            </div>
            <div className="bg-gradient-to-br from-[#FB641B] to-[#e0571a] rounded-lg p-4 text-white flex flex-col justify-between h-full">
              <div>
                <p className="text-yellow-200 font-bold text-sm">✨ New Arrivals</p>
                <h3 className="text-lg font-bold mt-1">Fresh Fashion</h3>
                <p className="text-orange-200 text-sm mt-1">Latest Trends 2024</p>
              </div>
              <Link to="/products?category=fashion&sort=created_at"
                className="mt-4 bg-white text-[#FB641B] font-bold text-xs px-3 py-2 rounded text-center hover:bg-[#FFE11B] transition-colors">
                Explore
              </Link>
            </div>
          </div>
        </div>

        {/* Categories */}
        {categories.length > 0 && (
          <section className="bg-white rounded-lg p-4 shadow-sm">
            <SectionHeader title="Shop by Category" link="/products" />
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map((cat) => <CategoryPill key={cat.id} cat={cat} />)}
            </div>
          </section>
        )}

        {/* Flash Sale Countdown */}
        <section className="bg-gradient-to-r from-[#2874F0] via-[#1a5de0] to-[#0d4bbf] rounded-xl p-5 text-white shadow-lg">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Zap className="h-5 w-5 text-[#FFE11B] fill-[#FFE11B]" />
                <h2 className="text-xl font-bold">Big Billion Days Sale</h2>
              </div>
              <p className="text-blue-200 text-sm">Exclusive deals on top products. Limited time only!</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-blue-200 text-sm">
                <Clock className="h-4 w-4" /> Ends in:
              </div>
              <CountdownTimer targetDate={saleEnd} />
            </div>
          </div>
          <div className="mt-4">
            <Link to="/products?sort=sale_count&order=desc"
              className="inline-block bg-[#FFE11B] text-[#1a1a2e] font-bold px-6 py-2.5 rounded-full text-sm hover:bg-yellow-300 transition-colors shadow-sm">
              Shop the Sale →
            </Link>
          </div>
        </section>

        {/* Featured Products */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <SectionHeader
            title="Featured Products"
            subtitle="Handpicked just for you"
            link="/products?is_featured=true"
            icon={<span className="text-lg">⭐</span>}
          />
          {featuredLoading ? (
            <SkeletonProductGrid count={5} />
          ) : featuredProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {featuredProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : (
            <p className="text-gray-400 text-center py-8">No featured products yet</p>
          )}
        </section>

        {/* Best Sellers */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <SectionHeader
            title="Best Sellers"
            subtitle="Most popular products"
            link="/products?sort=sale_count&order=desc"
            icon={<span className="text-lg">🔥</span>}
          />
          {dealsLoading ? (
            <SkeletonProductGrid count={4} />
          ) : topDeals.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {topDeals.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : null}
        </section>

        {/* Mid Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { title: 'Electronics Bonanza', sub: 'Phones, Laptops & more', color: 'from-blue-600 to-indigo-700', emoji: '📱', link: '/products?category=electronics' },
            { title: 'Fashion Week', sub: "Season's hottest styles", color: 'from-pink-500 to-rose-600', emoji: '👗', link: '/products?category=fashion' },
            { title: 'Home & Kitchen', sub: 'Make your home beautiful', color: 'from-amber-500 to-orange-600', emoji: '🏠', link: '/products?category=home-kitchen' },
          ].map(({ title, sub, color, emoji, link }) => (
            <Link key={title} to={link}
              className={`bg-gradient-to-br ${color} text-white rounded-xl p-6 flex items-center justify-between hover:scale-[1.02] transition-transform shadow-md`}>
              <div>
                <h3 className="font-bold text-lg">{title}</h3>
                <p className="text-white/80 text-sm mt-0.5">{sub}</p>
                <div className="mt-3 text-sm font-semibold underline underline-offset-2 opacity-90">Shop Now →</div>
              </div>
              <span className="text-5xl">{emoji}</span>
            </Link>
          ))}
        </div>

        {/* Trending Products */}
        <section className="bg-white rounded-lg p-4 shadow-sm">
          <SectionHeader
            title="Trending Now"
            subtitle="What's hot this week"
            link="/products?sort=view_count&order=desc"
            icon={<span className="text-lg">📈</span>}
          />
          {trendingLoading ? (
            <SkeletonProductGrid count={5} />
          ) : trendingProducts.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3">
              {trendingProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          ) : null}
        </section>

        {/* Trust Section */}
        <section className="bg-white rounded-xl p-6 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { emoji: '🛡️', title: '100% Authentic', desc: 'Verified sellers & genuine products' },
              { emoji: '🚀', title: 'Fast Delivery', desc: 'Same day & next day delivery' },
              { emoji: '💰', title: 'Best Prices', desc: 'Guaranteed lowest prices' },
              { emoji: '🔄', title: 'Easy Returns', desc: '7-day hassle-free returns' },
            ].map(({ emoji, title, desc }) => (
              <div key={title} className="flex flex-col items-center">
                <span className="text-3xl mb-2">{emoji}</span>
                <h3 className="font-bold text-gray-800 text-sm">{title}</h3>
                <p className="text-gray-500 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </section>

      </div>
    </>
  )
}
