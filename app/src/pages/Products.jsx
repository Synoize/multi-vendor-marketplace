import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { SlidersHorizontal, X, ChevronDown, ChevronUp } from 'lucide-react'
import api from '@/lib/axios'
import ProductCard from '@/components/product/ProductCard'
import { SkeletonProductGrid } from '@/components/ui/SkeletonCard'

const SORT_OPTIONS = [
  { label: 'Relevance', value: 'created_at:desc' },
  { label: 'Price: Low to High', value: 'price:asc' },
  { label: 'Price: High to Low', value: 'price:desc' },
  { label: 'Highest Rated', value: 'rating:desc' },
  { label: 'Most Popular', value: 'sale_count:desc' },
  { label: 'Newest First', value: 'created_at:desc' },
]

function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="border-b border-gray-100 pb-4 mb-4">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-sm font-semibold text-gray-800 mb-3">
        {title} {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && children}
    </div>
  )
}

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [showFilters, setShowFilters] = useState(false)
  const [page, setPage] = useState(1)

  const filters = {
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    min_rating: searchParams.get('min_rating') || '',
    in_stock: searchParams.get('in_stock') || '',
    sort: searchParams.get('sort') || 'created_at',
    order: searchParams.get('order') || 'desc',
  }

  const [priceRange, setPriceRange] = useState({ min: filters.min_price, max: filters.max_price })

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams)
    if (value) params.set(key, value)
    else params.delete(key)
    params.delete('page')
    setPage(1)
    setSearchParams(params)
  }

  const clearFilter = (key) => updateFilter(key, '')

  const applySort = (sortValue) => {
    const [sort, order] = sortValue.split(':')
    const params = new URLSearchParams(searchParams)
    params.set('sort', sort)
    params.set('order', order)
    setSearchParams(params)
  }

  const currentSort = `${filters.sort}:${filters.order}`

  const queryParams = new URLSearchParams({
    ...filters, page, limit: 20,
  }).toString()

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['products', queryParams],
    queryFn: async () => {
      const { data } = await api.get(`/products?${queryParams}`)
      return data.data
    },
    keepPreviousData: true,
  })

  const products = data?.products || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / 20)

  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => { const { data } = await api.get('/categories'); return data.data || [] },
    staleTime: 10 * 60 * 1000,
  })

  const { data: brands = [] } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => { const { data } = await api.get('/brands'); return data.data || [] },
    staleTime: 10 * 60 * 1000,
  })

  const activeFiltersCount = ['category', 'brand', 'min_price', 'max_price', 'min_rating', 'in_stock'].filter(k => filters[k]).length

  const FilterPanel = () => (
    <div className="bg-white rounded-lg shadow-sm p-4 h-fit sticky top-20">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">Filters</h3>
        {activeFiltersCount > 0 && (
          <button onClick={() => { setSearchParams(new URLSearchParams(filters.search ? { search: filters.search } : {})); setPage(1) }}
            className="text-[#2874F0] text-xs font-semibold hover:underline">
            Clear All ({activeFiltersCount})
          </button>
        )}
      </div>

      <FilterSection title="Category">
        {categories.filter(c => !c.parent_id).map(cat => (
          <label key={cat.id} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="radio" name="category" checked={filters.category === cat.slug}
              onChange={() => updateFilter('category', filters.category === cat.slug ? '' : cat.slug)}
              className="accent-[#2874F0]" />
            <span className="text-sm text-gray-700">{cat.icon} {cat.name}</span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Price Range">
        <div className="flex gap-2 items-center">
          <input type="number" placeholder="Min" value={priceRange.min}
            onChange={e => setPriceRange(p => ({ ...p, min: e.target.value }))}
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="number" placeholder="Max" value={priceRange.max}
            onChange={e => setPriceRange(p => ({ ...p, max: e.target.value }))}
            className="flex-1 border border-gray-200 rounded px-2 py-1.5 text-xs" />
        </div>
        <button onClick={() => { updateFilter('min_price', priceRange.min); updateFilter('max_price', priceRange.max) }}
          className="mt-2 w-full bg-[#2874F0] text-white text-xs py-1.5 rounded font-semibold hover:bg-[#1a5de0] transition-colors">
          Apply
        </button>
      </FilterSection>

      <FilterSection title="Customer Rating">
        {[4, 3, 2, 1].map(rating => (
          <label key={rating} className="flex items-center gap-2 py-1.5 cursor-pointer">
            <input type="radio" name="rating" checked={filters.min_rating === String(rating)}
              onChange={() => updateFilter('min_rating', filters.min_rating === String(rating) ? '' : rating)}
              className="accent-[#2874F0]" />
            <span className="text-sm text-gray-700 flex items-center gap-1">
              {'★'.repeat(rating)}{'☆'.repeat(5 - rating)} & Above
            </span>
          </label>
        ))}
      </FilterSection>

      <FilterSection title="Availability">
        <label className="flex items-center gap-2 py-1.5 cursor-pointer">
          <input type="checkbox" checked={filters.in_stock === 'true'}
            onChange={e => updateFilter('in_stock', e.target.checked ? 'true' : '')}
            className="accent-[#2874F0]" />
          <span className="text-sm text-gray-700">In Stock Only</span>
        </label>
      </FilterSection>

      <FilterSection title="Brand" defaultOpen={false}>
        <div className="max-h-40 overflow-y-auto space-y-1">
          {brands.map(brand => (
            <label key={brand.id} className="flex items-center gap-2 py-1 cursor-pointer">
              <input type="checkbox" checked={filters.brand === brand.slug}
                onChange={() => updateFilter('brand', filters.brand === brand.slug ? '' : brand.slug)}
                className="accent-[#2874F0]" />
              <span className="text-sm text-gray-700">{brand.name}</span>
            </label>
          ))}
        </div>
      </FilterSection>
    </div>
  )

  return (
    <>
      <Helmet>
        <title>{filters.search ? `Search: "${filters.search}" - Damini` : 'All Products - Damini Marketplace'}</title>
      </Helmet>

      <div className="max-w-7xl mx-auto px-3 md:px-4 py-4">
        <div className="flex gap-5">
          {/* Filter Sidebar (desktop) */}
          <div className="w-64 flex-shrink-0 hidden md:block">
            <FilterPanel />
          </div>

          {/* Products */}
          <div className="flex-1 min-w-0">
            {/* Results Header */}
            <div className="bg-white rounded-lg shadow-sm px-4 py-3 mb-3 flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex-1">
                {filters.search ? (
                  <p className="text-sm text-gray-600">
                    <span className="font-bold text-gray-900">{total.toLocaleString('en-IN')}</span> results for "
                    <span className="text-[#2874F0] font-semibold">{filters.search}</span>"
                  </p>
                ) : (
                  <p className="text-sm text-gray-600">{total.toLocaleString('en-IN')} products found</p>
                )}
              </div>

              {/* Active Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {filters.category && (
                  <span className="flex items-center gap-1 bg-blue-50 text-[#2874F0] text-xs px-2 py-1 rounded-full font-medium">
                    {filters.category} <button onClick={() => clearFilter('category')}><X className="h-3 w-3" /></button>
                  </span>
                )}
                {filters.min_rating && (
                  <span className="flex items-center gap-1 bg-blue-50 text-[#2874F0] text-xs px-2 py-1 rounded-full font-medium">
                    ★ {filters.min_rating}+ <button onClick={() => clearFilter('min_rating')}><X className="h-3 w-3" /></button>
                  </span>
                )}
              </div>

              {/* Sort */}
              <select value={currentSort} onChange={e => applySort(e.target.value)}
                className="border border-gray-200 rounded px-2 py-1.5 text-sm text-gray-700 outline-none focus:border-[#2874F0]">
                {SORT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>

              {/* Mobile filter button */}
              <button onClick={() => setShowFilters(true)}
                className="md:hidden flex items-center gap-1.5 bg-[#2874F0] text-white px-3 py-1.5 rounded text-sm font-semibold">
                <SlidersHorizontal className="h-4 w-4" /> Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
              </button>
            </div>

            {/* Products Grid */}
            {isLoading || isFetching ? (
              <SkeletonProductGrid count={12} />
            ) : products.length > 0 ? (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 xl:grid-cols-4 gap-3">
                  {products.map((p) => <ProductCard key={p.id} product={p} />)}
                </div>
                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2 mt-6">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                      className="px-4 py-2 border border-gray-200 rounded text-sm font-semibold disabled:opacity-40 hover:border-[#2874F0] hover:text-[#2874F0] transition-colors">
                      ← Previous
                    </button>
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      const p = Math.max(1, page - 2) + i
                      return p <= totalPages ? (
                        <button key={p} onClick={() => setPage(p)}
                          className={`w-9 h-9 rounded text-sm font-semibold transition-colors ${page === p ? 'bg-[#2874F0] text-white' : 'border border-gray-200 hover:border-[#2874F0] hover:text-[#2874F0]'}`}>
                          {p}
                        </button>
                      ) : null
                    })}
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}
                      className="px-4 py-2 border border-gray-200 rounded text-sm font-semibold disabled:opacity-40 hover:border-[#2874F0] hover:text-[#2874F0] transition-colors">
                      Next →
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-white rounded-lg shadow-sm p-16 text-center">
                <p className="text-4xl mb-4">🔍</p>
                <h3 className="text-xl font-bold text-gray-800 mb-2">No products found</h3>
                <p className="text-gray-500 text-sm">Try adjusting your filters or search terms</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Filter Drawer */}
      {showFilters && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowFilters(false)} />
          <div className="absolute right-0 top-0 bottom-0 w-80 bg-white shadow-2xl overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900">Filters</h3>
              <button onClick={() => setShowFilters(false)}><X className="h-5 w-5" /></button>
            </div>
            <div className="p-4"><FilterPanel /></div>
          </div>
        </div>
      )}
    </>
  )
}
