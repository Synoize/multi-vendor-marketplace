import { Link } from 'react-router-dom'
import { Facebook, Twitter, Instagram, Youtube, Shield, Truck, RotateCcw, Headphones } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="bg-[#172337] text-gray-300">
      {/* Trust Badges */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <Shield className="h-6 w-6 text-[#2874F0]" />, title: '100% Secure', desc: 'All transactions are SSL encrypted' },
              { icon: <Truck className="h-6 w-6 text-[#2874F0]" />, title: 'Free Shipping', desc: 'On orders above ₹499' },
              { icon: <RotateCcw className="h-6 w-6 text-[#2874F0]" />, title: 'Easy Returns', desc: '7-day hassle-free return policy' },
              { icon: <Headphones className="h-6 w-6 text-[#2874F0]" />, title: '24/7 Support', desc: 'Dedicated customer support team' },
            ].map(({ icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3">
                <div className="p-2 bg-[#1e2f45] rounded-lg">{icon}</div>
                <div>
                  <p className="text-white font-semibold text-sm">{title}</p>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <div className="mb-4">
              <span className="text-white font-bold text-2xl">damini</span>
              <div className="text-[#FFE11B] text-xs font-medium italic mt-0.5">India's Favourite Marketplace</div>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed mb-4">
              Damini connects millions of buyers with thousands of trusted sellers across India.
              Quality products, great prices, fast delivery.
            </p>
            <div className="flex gap-3">
              {[
                { icon: <Facebook className="h-4 w-4" />, href: '#', label: 'Facebook' },
                { icon: <Twitter className="h-4 w-4" />, href: '#', label: 'Twitter' },
                { icon: <Instagram className="h-4 w-4" />, href: '#', label: 'Instagram' },
                { icon: <Youtube className="h-4 w-4" />, href: '#', label: 'Youtube' },
              ].map(({ icon, href, label }) => (
                <a key={label} href={href} aria-label={label}
                  className="w-8 h-8 bg-[#1e2f45] hover:bg-[#2874F0] rounded-full flex items-center justify-center transition-colors">
                  {icon}
                </a>
              ))}
            </div>
          </div>

          {/* About */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">About</h4>
            <ul className="space-y-2.5">
              {['About Us', 'Careers', 'Press & Media', 'Blog', 'Investor Relations'].map(link => (
                <li key={link}><Link to="#" className="text-gray-400 hover:text-[#2874F0] text-sm transition-colors">{link}</Link></li>
              ))}
            </ul>
          </div>

          {/* Help */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Help</h4>
            <ul className="space-y-2.5">
              {['Payments', 'Shipping', 'Cancellation & Returns', 'FAQ', 'Report Infringement'].map(link => (
                <li key={link}><Link to="/support" className="text-gray-400 hover:text-[#2874F0] text-sm transition-colors">{link}</Link></li>
              ))}
            </ul>
          </div>

          {/* Policy */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">Policy</h4>
            <ul className="space-y-2.5">
              {['Return Policy', 'Terms of Use', 'Privacy Policy', 'Cookie Policy', 'Grievance Redressal'].map(link => (
                <li key={link}><Link to="#" className="text-gray-400 hover:text-[#2874F0] text-sm transition-colors">{link}</Link></li>
              ))}
            </ul>
          </div>

          {/* Social */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wide">For Sellers</h4>
            <ul className="space-y-2.5">
              {[
                { label: 'Sell on Damini', to: '/seller-register' },
                { label: 'Advertise', to: '/seller-register' },
                { label: 'Seller Hub', to: 'http://localhost:5174', external: true },
              ].map(({ label, to, external }) => (
                <li key={label}>
                  {external ? (
                    <a href={to} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-[#2874F0] text-sm transition-colors">{label}</a>
                  ) : (
                    <Link to={to} className="text-gray-400 hover:text-[#2874F0] text-sm transition-colors">{label}</Link>
                  )}
                </li>
              ))}
            </ul>

            {/* App Download */}
            <div className="mt-5">
              <h4 className="text-white font-semibold mb-3 text-sm uppercase tracking-wide">Download App</h4>
              <div className="space-y-2">
                {['App Store', 'Google Play'].map(store => (
                  <button key={store}
                    className="flex items-center gap-2 bg-[#1e2f45] hover:bg-[#2874F0] text-white px-3 py-1.5 rounded text-xs w-full transition-colors">
                    📱 {store}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Payment Methods */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-gray-500 text-xs">
              © 2024 Damini Marketplace. All rights reserved. Built with ❤️ in India.
            </p>
            <div className="flex items-center gap-2 flex-wrap justify-center">
              <span className="text-gray-500 text-xs">Payments:</span>
              {['Visa', 'Mastercard', 'UPI', 'PayTM', 'Net Banking', 'EMI', 'COD'].map(method => (
                <span key={method} className="bg-[#1e2f45] text-gray-300 text-xs px-2 py-1 rounded font-medium">{method}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
