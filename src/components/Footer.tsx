/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Mail, Phone, MapPin, X } from 'lucide-react';

type PolicyType = 'privacy' | 'refund' | 'shipping' | 'terms' | null;

const POLICIES: Record<Exclude<PolicyType, null>, { title: string; content: string }> = {
  privacy: {
    title: 'Privacy Policy',
    content: 'We respect your privacy. MK SMM panel collects user information (Name, Email, Phone Number) solely to process orders, manage accounts, and handle secure automated payments via PayFast. We do not sell, rent, or share your personal data with any third-party marketing companies. All payment credentials are encrypted securely by the payment gateway.'
  },
  refund: {
    title: 'Refund & Return Policy',
    content: 'At MK SMM panel, all transactions are final. Once funds are deposited into your panel wallet via PayFast (EasyPaisa/JazzCash), they cannot be refunded back to your bank account. The balance can strictly be used to purchase services on our platform. In case of a failed or dropped order, the amount will be automatically credited back to your MK SMM panel wallet balance within 24–48 hours.'
  },
  shipping: {
    title: 'Shipping & Service Policy',
    content: 'Since we offer intangible, digital services (Social Media Marketing and Branding), there is no physical shipping involved. Services are deployed digitally. Execution times vary from 1 hour to 72 hours depending on the package selected. A tracking link or counter state will be visible in your user dashboard once the order is activated.'
  },
  terms: {
    title: 'Terms & Conditions',
    content: 'By registering on MK SMM panel, you agree to all our service terms. Users are prohibited from utilizing our marketing services for any illegal, hateful, or abusive content. MK SMM panel reserves the right to terminate accounts that violate these terms without any notice. Rates and delivery schedules are subject to change based on platform algorithms.'
  }
};

export default function Footer() {
  const [activePolicy, setActivePolicy] = useState<PolicyType>(null);
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-zinc-950 text-gray-300 pt-16 pb-8 border-t border-zinc-900">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 mb-16">
          {/* Company Info */}
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-white uppercase tracking-tight">MK SMM panel</h2>
            <p className="text-sm text-gray-400 leading-relaxed">
              Accelerate your digital presence with professional, high-converting social media marketing and brand growth solutions tailored for creators and businesses.
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <MapPin className="w-4 h-4 text-blue-500" />
              <p>Street No. 215, Gulshan-e-Zia, Orangi Town, Karachi, Pakistan.</p>
            </div>
          </div>

          {/* Services */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Services</h3>
            <ul className="space-y-2 text-sm">
              <li><button onClick={() => {}} className="hover:text-blue-400 transition-colors">Instagram Growth</button></li>
              <li><button onClick={() => {}} className="hover:text-blue-400 transition-colors">YouTube Automation</button></li>
              <li><button onClick={() => {}} className="hover:text-blue-400 transition-colors">TikTok Marketing</button></li>
              <li><button onClick={() => {}} className="hover:text-blue-400 transition-colors">Facebook Ads</button></li>
            </ul>
          </div>

          {/* Legal */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Legal & Policies</h3>
            <ul className="space-y-2 text-sm courser-pointer">
              <li><button onClick={() => setActivePolicy('privacy')} className="hover:text-blue-400 transition-colors w-full text-left">Privacy Policy</button></li>
              <li><button onClick={() => setActivePolicy('refund')} className="hover:text-blue-400 transition-colors w-full text-left">Refund & Return Policy</button></li>
              <li><button onClick={() => setActivePolicy('shipping')} className="hover:text-blue-400 transition-colors w-full text-left">Shipping & Service Policy</button></li>
              <li><button onClick={() => setActivePolicy('terms')} className="hover:text-blue-400 transition-colors w-full text-left">Terms & Conditions</button></li>
            </ul>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h3 className="font-semibold text-white">Contact & Support</h3>
            <div className="space-y-3 text-sm">
              <a 
                href="https://wa.me/923323242608?text=Hello%20MK%20SMM%20Panel"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-green-400 transition-colors"
              >
                <Phone className="w-4 h-4" />
                +92 332 3242608
              </a>
              <a 
                href="mailto:itxmerajkhan3109@gmail.com"
                className="flex items-center gap-2 hover:text-blue-400 transition-colors break-words"
              >
                <Mail className="w-4 h-4" />
                itxmerajkhan3109@gmail.com
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-zinc-900 pt-8 mt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-500">
          <p>© {currentYear} MK SMM panel. All rights reserved.</p>
          <div className="flex flex-wrap gap-4 text-center justify-center">
            <span>Secure Payments via</span>
            <span className="font-semibold text-gray-400">PayFast | EasyPaisa | JazzCash | Visa | MasterCard</span>
          </div>
        </div>
      </div>

      {/* Modal Overlay */}
      {activePolicy && (
        <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-lg w-full relative shadow-2xl animate-in fade-in zoom-in duration-300">
            <button 
              onClick={() => setActivePolicy(null)}
              className="absolute top-4 right-4 text-zinc-400 hover:text-white"
            >
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-xl font-bold text-white mb-4">{POLICIES[activePolicy].title}</h3>
            <p className="text-gray-300 text-sm leading-relaxed">{POLICIES[activePolicy].content}</p>
          </div>
        </div>
      )}
    </footer>
  );
}
