import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { Helmet } from 'react-helmet-async'
import { toast } from 'sonner'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Package,
  Info,
  DollarSign,
  Calendar,
  Rocket,
  CheckCircle,
} from 'lucide-react'
import api from '../lib/axios'
import Stepper from '../components/ui/Stepper'
import Spinner from '../components/ui/Spinner'

const STEPS = [
  { id: 1, label: 'Campaign Basics', description: 'Name, type & budget' },
  { id: 2, label: 'Select Products', description: 'Choose products to promote' },
  { id: 3, label: 'Review & Launch', description: 'Confirm and go live' },
]

const step1Schema = z.object({
  name: z.string().min(3, 'Campaign name must be at least 3 characters').max(80, 'Too long'),
  type: z.enum(['CPC', 'CPM'], { required_error: 'Select a campaign type' }),
  bidAmount: z.coerce.number().min(0.01, 'Bid must be at least ₹0.01').max(500, 'Max bid is ₹500'),
  dailyBudget: z.coerce.number().min(50, 'Daily budget must be at least ₹50'),
  totalBudget: z.coerce.number().min(100, 'Total budget must be at least ₹100'),
  startDate: z.string().min(1, 'Start date required'),
  endDate: z.string().optional(),
}).refine((d) => {
  if (d.endDate && d.startDate) {
    return new Date(d.endDate) >= new Date(d.startDate)
  }
  return true
}, { message: 'End date must be after start date', path: ['endDate'] })

function FormError({ message }) {
  if (!message) return null
  return <p className="text-red-400 text-xs mt-1">{message}</p>
}

function Step1({ onNext, defaultValues }) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    resolver: zodResolver(step1Schema),
    defaultValues: defaultValues || {
      name: '',
      type: 'CPC',
      bidAmount: 2,
      dailyBudget: 200,
      totalBudget: 2000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
    },
  })

  const campaignType = watch('type')

  return (
    <form onSubmit={handleSubmit(onNext)} className="flex flex-col gap-6">
      {/* Campaign Name */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-1.5 block">Campaign Name *</label>
        <input
          {...register('name')}
          className="input-dark w-full"
          placeholder="e.g. Summer Electronics Sale"
        />
        <FormError message={errors.name?.message} />
      </div>

      {/* Campaign Type */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-3 block">Campaign Type *</label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              value: 'CPC',
              label: 'Cost Per Click',
              desc: 'Pay only when someone clicks your ad',
              icon: MousePointerClick,
            },
            {
              value: 'CPM',
              label: 'Cost Per 1000 Impressions',
              desc: 'Pay for every 1000 times your ad is shown',
              icon: Eye,
            },
          ].map(({ value, label, desc, icon: Icon }) => {
            const isSelected = campaignType === value
            return (
              <label
                key={value}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'border-[#FB641B]/50 bg-[#FB641B]/10'
                    : 'border-white/10 bg-white/3 hover:border-white/20'
                }`}
              >
                <input
                  {...register('type')}
                  type="radio"
                  value={value}
                  className="sr-only"
                />
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSelected ? 'bg-[#FB641B]/20' : 'bg-white/5'}`}>
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-[#FB641B]' : 'text-gray-500'}`} />
                </div>
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? 'text-white' : 'text-gray-300'}`}>{label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                </div>
                {isSelected && (
                  <Check className="w-4 h-4 text-[#FB641B] ml-auto flex-shrink-0 mt-0.5" />
                )}
              </label>
            )
          })}
        </div>
        <FormError message={errors.type?.message} />
      </div>

      {/* Bid Amount */}
      <div>
        <label className="text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-2">
          <DollarSign className="w-4 h-4" />
          Bid Amount *
          <span className="text-gray-500 font-normal text-xs ml-1">
            (₹ per {campaignType === 'CPM' ? '1000 impressions' : 'click'})
          </span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
          <input
            {...register('bidAmount')}
            type="number"
            step="0.01"
            className="input-dark w-full pl-7"
            placeholder="2.00"
          />
        </div>
        <FormError message={errors.bidAmount?.message} />
      </div>

      {/* Budget */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Daily Budget *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              {...register('dailyBudget')}
              type="number"
              className="input-dark w-full pl-7"
              placeholder="200"
            />
          </div>
          <FormError message={errors.dailyBudget?.message} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 block">Total Budget *</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
            <input
              {...register('totalBudget')}
              type="number"
              className="input-dark w-full pl-7"
              placeholder="2000"
            />
          </div>
          <FormError message={errors.totalBudget?.message} />
        </div>
      </div>

      {/* Dates */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            Start Date *
          </label>
          <input
            {...register('startDate')}
            type="date"
            className="input-dark w-full"
            min={new Date().toISOString().split('T')[0]}
          />
          <FormError message={errors.startDate?.message} />
        </div>
        <div>
          <label className="text-sm font-medium text-gray-300 mb-1.5 flex items-center gap-1.5">
            <Calendar className="w-4 h-4" />
            End Date
            <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            {...register('endDate')}
            type="date"
            className="input-dark w-full"
          />
          <FormError message={errors.endDate?.message} />
        </div>
      </div>

      <button
        type="submit"
        className="self-end flex items-center gap-2 bg-gradient-to-r from-[#FB641B] to-[#e04f09] hover:from-[#e04f09] hover:to-[#cc3d00] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20"
      >
        Next: Select Products
        <ArrowRight className="w-4 h-4" />
      </button>
    </form>
  )
}

// Stub icon imports for Step1 (used inside)
function MousePointerClick({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 9L4 14l3 1 1 3 5-5" />
      <path d="M9 9l7 7" strokeLinecap="round" />
      <path d="M18 3l-5 9" strokeLinecap="round" />
    </svg>
  )
}

function Eye({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function Step2({ onNext, onBack, selectedProducts, setSelectedProducts }) {
  const { data, isLoading } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: () => api.get('/vendors/products').then((r) => r.data),
  })

  const products = data?.products || data || []

  const toggleProduct = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId]
    )
  }

  const estimatedReach = selectedProducts.length * 1200

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-white font-semibold">Select Products to Promote</h3>
          <p className="text-gray-400 text-sm mt-0.5">Choose which products will appear in your ads</p>
        </div>
        <div className="text-right">
          <p className="text-[#FB641B] font-bold">{selectedProducts.length} selected</p>
          <p className="text-gray-500 text-xs">Est. reach: {estimatedReach.toLocaleString('en-IN')}+</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Spinner size="lg" />
        </div>
      ) : products.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Package className="w-12 h-12 text-gray-600" />
          <p className="text-gray-400 text-sm">No products found. Add products to your store first.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[440px] overflow-y-auto pr-1">
          {products.map((product) => {
            const productId = product._id
            const isSelected = selectedProducts.includes(productId)
            return (
              <button
                key={productId}
                onClick={() => toggleProduct(productId)}
                className={`flex items-start gap-3 p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-[#FB641B]/50 bg-[#FB641B]/10'
                    : 'border-white/10 bg-white/3 hover:border-white/20'
                }`}
              >
                <div className="w-12 h-12 rounded-lg bg-white/10 flex-shrink-0 overflow-hidden">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-gray-500 m-3" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    ₹{product.price?.toLocaleString('en-IN') || 'N/A'}
                  </p>
                  {product.stock !== undefined && (
                    <p className="text-[11px] text-gray-600 mt-0.5">{product.stock} in stock</p>
                  )}
                </div>
                <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${
                  isSelected ? 'border-[#FB641B] bg-[#FB641B]' : 'border-white/20'
                }`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {selectedProducts.length > 0 && (
        <div className="flex items-center gap-2 text-sm bg-[#FB641B]/10 border border-[#FB641B]/20 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-[#FB641B] flex-shrink-0" />
          <span className="text-gray-300">
            <span className="text-[#FB641B] font-semibold">{selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}</span> selected.
            Estimated reach: <span className="text-white font-semibold">{estimatedReach.toLocaleString('en-IN')}+ shoppers/day</span>
          </span>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onBack}
          className="flex items-center gap-2 btn-ghost"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={() => {
            if (selectedProducts.length === 0) {
              toast.error('Please select at least one product to promote')
              return
            }
            onNext()
          }}
          className="flex items-center gap-2 bg-gradient-to-r from-[#FB641B] to-[#e04f09] hover:from-[#e04f09] hover:to-[#cc3d00] text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/20"
        >
          Review Campaign
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

function Step3({ onBack, campaignData, selectedProducts, productsData, onLaunch, launching }) {
  const selectedProductDetails = (productsData || []).filter((p) =>
    selectedProducts.includes(p._id)
  )

  const estimatedDays = campaignData.dailyBudget > 0
    ? Math.floor(campaignData.totalBudget / campaignData.dailyBudget)
    : 0

  return (
    <div className="flex flex-col gap-6">
      <div className="text-center pb-2">
        <div className="w-16 h-16 rounded-2xl bg-[#FB641B]/10 border border-[#FB641B]/20 flex items-center justify-center mx-auto mb-4">
          <Rocket className="w-8 h-8 text-[#FB641B]" />
        </div>
        <h3 className="text-white font-bold text-xl">Ready to Launch?</h3>
        <p className="text-gray-400 text-sm mt-1">Review your campaign details before going live</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Campaign Details */}
        <div className="glass-card p-5 flex flex-col gap-3">
          <h4 className="text-white font-semibold text-sm border-b border-white/5 pb-2">Campaign Settings</h4>
          {[
            { label: 'Name', value: campaignData.name },
            { label: 'Type', value: campaignData.type },
            { label: 'Bid Amount', value: `₹${campaignData.bidAmount} per ${campaignData.type === 'CPM' ? '1k impressions' : 'click'}` },
            { label: 'Start Date', value: campaignData.startDate || 'Today' },
            { label: 'End Date', value: campaignData.endDate || 'No end date' },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
        </div>

        {/* Budget Breakdown */}
        <div className="glass-card p-5 flex flex-col gap-3">
          <h4 className="text-white font-semibold text-sm border-b border-white/5 pb-2">Budget Breakdown</h4>
          {[
            { label: 'Daily Budget', value: `₹${Number(campaignData.dailyBudget).toLocaleString('en-IN')}` },
            { label: 'Total Budget', value: `₹${Number(campaignData.totalBudget).toLocaleString('en-IN')}` },
            { label: 'Est. Duration', value: `~${estimatedDays} days` },
            { label: 'Products', value: `${selectedProducts.length} promoted` },
          ].map(({ label, value }) => (
            <div key={label} className="flex items-center justify-between">
              <span className="text-gray-500 text-sm">{label}</span>
              <span className="text-white text-sm font-medium">{value}</span>
            </div>
          ))}
          <div className="mt-2 pt-3 border-t border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-gray-300 text-sm font-medium">Max Charge at Launch</span>
              <span className="text-[#FB641B] text-lg font-bold">
                ₹{Number(campaignData.dailyBudget).toLocaleString('en-IN')}
              </span>
            </div>
            <p className="text-gray-500 text-xs mt-1">You'll be charged your daily budget when the campaign starts.</p>
          </div>
        </div>
      </div>

      {/* Selected Products Preview */}
      {selectedProductDetails.length > 0 && (
        <div className="glass-card p-4">
          <h4 className="text-white font-semibold text-sm mb-3">Promoted Products ({selectedProductDetails.length})</h4>
          <div className="flex flex-wrap gap-2">
            {selectedProductDetails.map((p) => (
              <div
                key={p._id}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-3 py-1.5"
              >
                <div className="w-6 h-6 rounded-md bg-white/10 overflow-hidden flex-shrink-0">
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <Package className="w-4 h-4 text-gray-500 m-1" />
                  )}
                </div>
                <span className="text-xs text-gray-300 max-w-[120px] truncate">{p.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info */}
      <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-gray-400 text-xs leading-relaxed">
          Your campaign will be reviewed by our team and activated within a few hours.
          You will receive an email notification once it goes live.
          The total budget of <span className="text-white font-medium">₹{Number(campaignData.totalBudget).toLocaleString('en-IN')}</span> will be deducted from your Ads Wallet.
        </p>
      </div>

      <div className="flex items-center justify-between pt-2">
        <button onClick={onBack} className="flex items-center gap-2 btn-ghost">
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <button
          onClick={onLaunch}
          disabled={launching}
          className="flex items-center gap-2 bg-gradient-to-r from-[#FB641B] to-[#e04f09] hover:from-[#e04f09] hover:to-[#cc3d00] text-white font-bold px-8 py-3 rounded-xl text-sm transition-all shadow-lg shadow-orange-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {launching ? (
            <>
              <Spinner size="xs" color="white" />
              Launching...
            </>
          ) : (
            <>
              <Rocket className="w-4 h-4" />
              Launch Campaign
            </>
          )}
        </button>
      </div>
    </div>
  )
}

function CampaignCreate() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(1)
  const [step1Data, setStep1Data] = useState(null)
  const [selectedProducts, setSelectedProducts] = useState([])
  const [launching, setLaunching] = useState(false)

  const { data: productsData } = useQuery({
    queryKey: ['vendor-products'],
    queryFn: () => api.get('/vendors/products').then((r) => r.data?.products || r.data || []),
  })

  const handleStep1 = (data) => {
    setStep1Data(data)
    setCurrentStep(2)
  }

  const handleLaunch = async () => {
    setLaunching(true)
    try {
      await api.post('/ads/vendor', {
        ...step1Data,
        products: selectedProducts,
      })
      toast.success('Campaign launched successfully! 🚀')
      navigate('/campaigns')
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to launch campaign. Please try again.'
      toast.error(msg)
    } finally {
      setLaunching(false)
    }
  }

  return (
    <>
      <Helmet>
        <title>Create Campaign — Damini Ads Manager</title>
      </Helmet>

      <div className="max-w-3xl mx-auto flex flex-col gap-6 animate-fadeIn">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => currentStep === 1 ? navigate('/campaigns') : setCurrentStep(s => s - 1)}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white">Create Campaign</h1>
            <p className="text-gray-400 text-sm mt-0.5">Set up your ad campaign in 3 easy steps</p>
          </div>
        </div>

        {/* Stepper */}
        <div className="glass-card p-6">
          <Stepper steps={STEPS} currentStep={currentStep} />
        </div>

        {/* Step Content */}
        <div className="glass-card p-6">
          {currentStep === 1 && (
            <Step1
              onNext={handleStep1}
              defaultValues={step1Data}
            />
          )}
          {currentStep === 2 && (
            <Step2
              onNext={() => setCurrentStep(3)}
              onBack={() => setCurrentStep(1)}
              selectedProducts={selectedProducts}
              setSelectedProducts={setSelectedProducts}
            />
          )}
          {currentStep === 3 && (
            <Step3
              onBack={() => setCurrentStep(2)}
              campaignData={step1Data}
              selectedProducts={selectedProducts}
              productsData={productsData || []}
              onLaunch={handleLaunch}
              launching={launching}
            />
          )}
        </div>
      </div>
    </>
  )
}

export default CampaignCreate
