import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import { useAuthStore } from '@/store/authStore'
import api from '@/lib/axios'
import { toast } from 'sonner'
import { MessageCircle, Plus, ChevronRight, Clock, CheckCircle, AlertCircle, Send } from 'lucide-react'
import { Link } from 'react-router-dom'

const CATEGORY_OPTIONS = ['order', 'payment', 'product', 'return', 'account', 'other']
const STATUS_COLORS = { open: 'bg-blue-100 text-blue-700', in_progress: 'bg-yellow-100 text-yellow-700', closed: 'bg-green-100 text-green-700' }

export default function Support() {
  const { isAuthenticated } = useAuthStore()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ subject: '', category: 'order', message: '' })
  const [submitting, setSubmitting] = useState(false)
  const [openTicket, setOpenTicket] = useState(null)
  const [reply, setReply] = useState('')

  const { data: tickets = [], refetch } = useQuery({
    queryKey: ['tickets'],
    queryFn: async () => { const { data } = await api.get('/support/tickets'); return data.data || [] },
    enabled: isAuthenticated,
  })

  const { data: ticketDetail } = useQuery({
    queryKey: ['ticket', openTicket],
    queryFn: async () => { const { data } = await api.get(`/support/tickets/${openTicket}`); return data.data },
    enabled: !!openTicket,
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isAuthenticated) { toast.error('Please login to create a support ticket'); return }
    setSubmitting(true)
    try {
      await api.post('/support/tickets', form)
      toast.success('Support ticket created! We will get back to you soon.')
      setShowForm(false)
      setForm({ subject: '', category: 'order', message: '' })
      refetch()
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create ticket') }
    finally { setSubmitting(false) }
  }

  const handleReply = async () => {
    if (!reply.trim()) return
    try {
      await api.post(`/support/tickets/${openTicket}/reply`, { message: reply })
      setReply('')
      toast.success('Reply sent')
    } catch { toast.error('Failed to send reply') }
  }

  const FAQs = [
    { q: 'How do I track my order?', a: 'Go to My Orders from your profile, click on the order to see the tracking details and estimated delivery date.' },
    { q: 'What is the return policy?', a: 'Most items can be returned within 7 days of delivery. The item should be unused and in its original packaging. Some categories have different return windows.' },
    { q: 'How long does delivery take?', a: 'Standard delivery takes 3-7 business days. Express delivery (same day/next day) is available for select pincodes.' },
    { q: 'How do I cancel an order?', a: 'You can cancel an order within 15 minutes of placing it. Go to My Orders and click "Cancel Order". After 15 minutes, you would need to contact support.' },
    { q: 'Is COD available?', a: 'Yes, Cash on Delivery is available for most products and pincodes. You can check availability at checkout.' },
    { q: 'How do I become a seller?', a: 'Click "Sell on Damini" and complete the seller registration process. After KYC verification (24-48 hours), you can start listing products.' },
  ]

  return (
    <>
      <Helmet>
        <title>Help & Support - Damini Marketplace</title>
        <meta name="description" content="Get help with your orders, payments, returns, and more. Contact Damini support 24/7." />
      </Helmet>

      <div className="max-w-6xl mx-auto px-3 md:px-4 py-8">
        {/* Header */}
        <div className="bg-gradient-to-br from-[#2874F0] to-[#0d4bbf] text-white rounded-2xl p-8 mb-8 text-center">
          <MessageCircle className="h-12 w-12 mx-auto mb-3 text-[#FFE11B]" />
          <h1 className="text-3xl font-bold mb-2">How can we help you?</h1>
          <p className="text-blue-200 text-lg">24/7 support for all your queries</p>
          <div className="flex flex-wrap justify-center gap-4 mt-6 text-sm">
            {[['📱', 'Chat Support', 'Instant'], ['📞', '+91 9800000000', 'Mon-Sat 9AM-6PM'], ['📧', 'support@damini.com', 'Reply in 24hrs']].map(([icon, contact, sub]) => (
              <div key={contact} className="bg-white/20 rounded-xl px-5 py-3 text-center">
                <div className="text-xl mb-0.5">{icon}</div>
                <div className="font-semibold text-sm">{contact}</div>
                <div className="text-blue-200 text-xs">{sub}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: FAQ + Ticket Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* FAQ */}
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="font-bold text-xl text-gray-900 mb-5">Frequently Asked Questions</h2>
              <div className="space-y-3">
                {FAQs.map((faq, i) => <FAQItem key={i} q={faq.q} a={faq.a} />)}
              </div>
            </div>

            {/* Create Ticket */}
            {isAuthenticated && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-bold text-xl text-gray-900">Create Support Ticket</h2>
                  {!showForm && (
                    <button onClick={() => setShowForm(true)}
                      className="flex items-center gap-2 bg-[#2874F0] text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-[#1a5de0] transition-colors">
                      <Plus className="h-4 w-4" /> New Ticket
                    </button>
                  )}
                </div>

                {showForm && (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                        <select value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2874F0]">
                          {CATEGORY_OPTIONS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                        <input value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                          placeholder="Brief description of your issue" required
                          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2874F0]" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Describe your issue *</label>
                      <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={4}
                        placeholder="Please provide as much detail as possible..." required
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#2874F0] resize-none" />
                    </div>
                    <div className="flex gap-3">
                      <button type="submit" disabled={submitting}
                        className="bg-[#2874F0] hover:bg-[#1a5de0] disabled:opacity-60 text-white font-bold px-6 py-2.5 rounded-lg text-sm transition-colors">
                        {submitting ? 'Submitting...' : 'Submit Ticket'}
                      </button>
                      <button type="button" onClick={() => setShowForm(false)} className="border border-gray-200 px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-50">
                        Cancel
                      </button>
                    </div>
                  </form>
                )}
              </div>
            )}
          </div>

          {/* Right: My Tickets */}
          <div>
            {isAuthenticated ? (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="font-bold text-gray-900 mb-4">My Tickets ({tickets.length})</h3>
                {tickets.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-10 w-10 text-gray-200 mx-auto mb-2" />
                    <p className="text-gray-400 text-sm">No support tickets yet</p>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {tickets.map(ticket => (
                      <button key={ticket.id} onClick={() => setOpenTicket(ticket.id)}
                        className="w-full text-left p-3 border border-gray-100 rounded-lg hover:border-[#2874F0] hover:bg-blue-50 transition-all">
                        <div className="flex items-center justify-between mb-1">
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[ticket.status] || 'bg-gray-100 text-gray-600'}`}>
                            {ticket.status?.replace('_', ' ')}
                          </span>
                          <span className="text-xs text-gray-400">{new Date(ticket.created_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}</span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 line-clamp-1">{ticket.subject}</p>
                        <p className="text-xs text-gray-500 mt-0.5 capitalize">{ticket.category}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Ticket Detail Drawer */}
                {openTicket && ticketDetail && (
                  <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-end">
                    <div className="w-full max-w-md h-full bg-white shadow-2xl flex flex-col">
                      <div className="p-4 border-b flex items-center justify-between">
                        <div>
                          <h3 className="font-bold text-gray-900 text-sm">{ticketDetail.subject}</h3>
                          <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[ticketDetail.status] || 'bg-gray-100 text-gray-600'}`}>
                            {ticketDetail.status}
                          </span>
                        </div>
                        <button onClick={() => setOpenTicket(null)} className="text-gray-400 hover:text-gray-700 text-xl">✕</button>
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {ticketDetail.messages?.map(msg => (
                          <div key={msg.id} className={`flex ${msg.sender_role === 'admin' ? 'justify-start' : 'justify-end'}`}>
                            <div className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm ${msg.sender_role === 'admin' ? 'bg-gray-100 text-gray-800' : 'bg-[#2874F0] text-white'}`}>
                              <p className="font-semibold text-xs mb-1 opacity-70">{msg.sender_name}</p>
                              <p>{msg.message}</p>
                              <p className="text-[10px] opacity-60 mt-1">{new Date(msg.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                      {ticketDetail.status !== 'closed' && (
                        <div className="p-4 border-t flex gap-2">
                          <input value={reply} onChange={e => setReply(e.target.value)} placeholder="Type your reply..."
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleReply()}
                            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#2874F0]" />
                          <button onClick={handleReply} disabled={!reply.trim()}
                            className="bg-[#2874F0] text-white px-3 py-2 rounded-lg disabled:opacity-50 hover:bg-[#1a5de0] transition-colors">
                            <Send className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl shadow-sm p-6 text-center">
                <AlertCircle className="h-10 w-10 text-[#2874F0] mx-auto mb-3" />
                <h3 className="font-bold text-gray-900 mb-2">Login Required</h3>
                <p className="text-gray-500 text-sm mb-4">Login to create and track support tickets</p>
                <Link to="/login" className="bg-[#2874F0] text-white font-bold px-5 py-2.5 rounded-lg text-sm hover:bg-[#1a5de0] transition-colors inline-block">
                  Login to Continue
                </Link>
              </div>
            )}

            {/* Contact Info */}
            <div className="mt-4 bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-xl p-5">
              <h3 className="font-bold text-gray-900 mb-3 text-sm">Quick Contact</h3>
              <div className="space-y-2 text-sm">
                <p className="flex items-center gap-2 text-gray-700"><Clock className="h-4 w-4 text-orange-500" /> Mon-Sat, 9AM to 6PM IST</p>
                <p className="flex items-center gap-2 text-gray-700">📞 <a href="tel:+919800000000" className="text-[#2874F0] hover:underline">+91 9800000000</a></p>
                <p className="flex items-center gap-2 text-gray-700">📧 <a href="mailto:support@damini.com" className="text-[#2874F0] hover:underline">support@damini.com</a></p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

function FAQItem({ q, a }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-gray-100 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full px-4 py-3.5 text-left hover:bg-gray-50 transition-colors">
        <span className="font-medium text-gray-800 text-sm">{q}</span>
        <ChevronRight className={`h-4 w-4 text-gray-400 flex-shrink-0 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && <div className="px-4 pb-4 pt-0 text-sm text-gray-600 leading-relaxed">{a}</div>}
    </div>
  )
}
