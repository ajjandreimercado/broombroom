import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { HelpCircle, ChevronDown, ChevronUp, Mail, Phone, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const HelpView: React.FC = () => {
  const { showToast, navigateTo } = useApp();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact support form
  const [supportName, setSupportName] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [supportCategory, setSupportCategory] = useState('Buying & Applications');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const faqs = [
    {
      q: 'Does clicking "Apply Now" charge my credit card?',
      a: 'No. Applying on Groom Broom signifies your purchase interest. There are zero automatic card charges or platform fees. After submitting an application, the seller will contact you to verify paperwork, schedule an on-site viewing or test drive, and arrange cash payment or bank financing terms directly with you.',
    },
    {
      q: 'How are vehicles verified on Groom Broom?',
      a: 'All listings submitted by verified dealers must pass documentation checks, including valid LTO Certificate of Registration (CR), Official Receipt (OR), and VIN engine/chassis alignment. We also host a proactive safety reporting system to combat fraudulent or duplicate listings.',
    },
    {
      q: 'Can I apply for vehicle financing as a freelancer or OFW?',
      a: 'Yes. Most Groom Broom partner dealerships offer flexible financing schemes tailored to non-traditional income earners, including freelancers, business owners, and Overseas Filipino Workers (OFWs) with remittance proof.',
    },
    {
      q: 'What is the role of Groom Broom during vehicle handoff?',
      a: 'Groom Broom acts as the discovery, messaging, and pre-application portal connecting verified buyers and sellers. Final transfer of ownership (Deed of Absolute Sale, PNP-HPG clearance, and LTO registration) is completed directly between buyer and seller with guidance from our automotive guides.',
    },
    {
      q: 'How can I become a verified seller on Groom Broom?',
      a: 'Switch to the "Seller" role in the top navigation bar to access the Seller Dashboard. You can immediately post vehicle listings with full specifications, manage buyer inquiries, and update application statuses.',
    },
  ];

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;

    setTicketSent(true);
    showToast('Inquiry Received', 'Our concierge desk will respond within 24 hours.');
  };

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Editorial Dark Header */}
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-12 sm:pt-16 pb-12">
          <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517] max-w-[14ch]">
            How can we help?
          </h1>
          <p className="mt-5 text-[16px] sm:text-[17px] text-[#4E585E] max-w-[52ch] leading-relaxed">
            Instant answers regarding purchase applications, physical inspections, partner financing, and merchant partnerships.
          </p>
        </div>
      </section>

      <div className="gb-container max-w-5xl pt-10 sm:pt-14 space-y-12">
        {/* FAQs Section */}
        <div className="border-t-2 border-[#141517] pt-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
            <h2 className="font-display text-[22px] leading-tight text-[#141517]">Frequently Asked Questions</h2>
            <span className="text-xs text-[#6B767D] tabular-nums">Help Desk Knowledgebase</span>
          </div>

          <div className="divide-y divide-[#DDE3E6]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between text-left text-sm font-bold text-[#141517] hover:text-[#1D5FD1] transition-colors cursor-pointer gap-4"
                  >
                    <span>{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="w-4 h-4 text-[#1D5FD1] shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-[#6B767D] shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="mt-3 text-xs sm:text-sm text-[#4E585E] leading-relaxed animate-fade-in pl-1">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support Form & Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-[22px] leading-tight text-[#141517] uppercase tracking-wider">
              Direct Assistance
            </h2>

            <div className="p-6 bg-white rounded-[2px] border border-[#C9D1D6] space-y-5 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center shrink-0">
                  <Phone className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#141517] text-sm">Customer Helpline</p>
                  <p className="text-[#4E585E] tabular-nums mt-0.5">+63 (2) 8800-RIDE (7433)</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-[#DDE3E6]">
                <div className="w-10 h-10 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#141517] text-sm">Email Concierge</p>
                  <p className="text-[#4E585E] tabular-nums mt-0.5">concierge@groombroom.ph</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-[#DDE3E6]">
                <div className="w-10 h-10 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#141517] text-sm">Live Seller Inquiries</p>
                  <p className="text-[#4E585E] mt-0.5">Direct chat on every vehicle listing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="border-t-2 border-[#141517] pt-6 space-y-5">
              <h2 className="font-display text-[22px] leading-tight text-[#141517]">Send an Inquiry Ticket</h2>

              {ticketSent ? (
                <div className="p-8 bg-white border border-[#8C989F] rounded-[2px] text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#141517] mx-auto" />
                  <p className="font-bold text-[#141517] text-base">Inquiry Ticket Submitted</p>
                  <p className="text-xs text-[#141517] max-w-sm mx-auto">
                    A specialist will review your request and reply to <strong>{supportEmail}</strong> within 24 hours.
                  </p>
                  <button
                    onClick={() => setTicketSent(false)}
                    className="mt-3 px-4 py-2 bg-[#141517] text-white rounded-[2px] text-xs font-semibold cursor-pointer hover:bg-[#141517] transition-colors"
                  >
                    Submit Another Inquiry
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Your Full Name</label>
                      <input
                        type="text"
                        placeholder="Andrei Mercado"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">Email Address</label>
                      <input
                        type="email"
                        placeholder="you@domain.com"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">Category</label>
                    <select
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                    >
                      <option value="Buying & Applications">Buying & Applications</option>
                      <option value="Seller Listing Support">Seller Listing Support</option>
                      <option value="Financing Inquiries">Financing Inquiries</option>
                      <option value="LTO Transfer Assistance">LTO Transfer Assistance</option>
                      <option value="Account & Security">Account & Security</option>
                    </select>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">Message / Details</label>
                    <textarea
                      rows={4}
                      placeholder="Please describe how our concierge can assist you..."
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Inquiry</span>
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
