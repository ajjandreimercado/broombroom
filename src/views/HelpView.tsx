import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { api, ApiError } from '../api.ts';
import { CONTACT_EMAIL } from '../data/constants.ts';
import { ChevronDown, Mail, MessageSquare, Send, CheckCircle2 } from 'lucide-react';

export const HelpView: React.FC = () => {
  const { showToast, currentUser } = useApp();

  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Contact support form
  const [supportName, setSupportName] = useState(currentUser?.name ?? '');
  const [supportEmail, setSupportEmail] = useState(currentUser?.email ?? '');
  const [sending, setSending] = useState(false);
  const [supportCategory, setSupportCategory] = useState('Buying & Applications');
  const [supportMessage, setSupportMessage] = useState('');
  const [ticketSent, setTicketSent] = useState(false);

  const faqs = [
    {
      q: 'Does applying cost anything or charge my card?',
      a: 'No. Applying is free and nothing is charged online. After you apply, the admin team reviews your application and documents, and your agent contacts you about the viewing, payment and paperwork.',
    },
    {
      q: 'What documents do I need for financing?',
      a: 'A valid ID for you and your co-makers, a proof of billing, and proof of income: a payslip and certificate of employment if you are employed, or your DTI registration, business permit and sales records if you own a business. Upload at least two when you apply; you can hand the rest to the admin team later.',
    },
    {
      q: 'One of my documents was rejected. What now?',
      a: 'We email you the reason with a link. Open it (or go to My Applications), and upload a clearer copy of that document. The admin team reviews it again.',
    },
    {
      q: 'Can I compare cash and financing before applying?',
      a: 'Yes. Request a quotation from the listing. It shows the unit price, down payment, term and estimated monthly amortization. Financing is still subject to the bank or financing company’s approval.',
    },
    {
      q: 'How do I talk to an agent?',
      a: 'Use Message on any listing. An agent answers in My Account under Messages, and you are notified when they reply.',
    },
    {
      q: 'How do I become an agent?',
      a: `Agent accounts are created by the Broom Broom admin team. Email ${CONTACT_EMAIL} to ask.`,
    },
  ];

  const handleSupportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (sending || !supportName.trim() || !supportEmail.trim() || !supportMessage.trim()) return;
    setSending(true);
    try {
      await api('/support', { body: { name: supportName.trim(), email: supportEmail.trim(), topic: supportCategory, message: supportMessage.trim() } });
      setTicketSent(true);
      setSupportMessage('');
    } catch (err) {
      showToast('Message not sent', err instanceof ApiError ? err.message : `Please email ${CONTACT_EMAIL} directly.`, 'error');
    } finally {
      setSending(false);
    }
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
            Answers about applications, documents, quotations and financing, or send the team a message.
          </p>
        </div>
      </section>

      <div className="gb-container max-w-5xl pt-10 sm:pt-14 space-y-12">
        {/* FAQs Section */}
        <div className="border-t-2 border-[#141517] pt-6 space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-[#DDE3E6]">
            <h2 className="font-display text-[22px] leading-tight text-[#141517]">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-[#DDE3E6]">
            {faqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div key={idx} className="py-4">
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between text-left text-[15px] font-semibold text-[#141517] hover:text-[#1D5FD1] transition-colors cursor-pointer gap-4"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180 text-[#1D5FD1]' : 'text-[#6B767D]'}`} />
                  </button>
                  {/* 0fr -> 1fr grid rows: an accordion with no height measuring */}
                  <div className={`grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                      <p className="pt-3 text-[14px] text-[#4E585E] leading-relaxed max-w-[68ch]">{faq.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Contact Support Form & Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-5 space-y-5">
            <h2 className="font-display text-[22px] leading-tight text-[#141517]">
              Direct Assistance
            </h2>

            <div className="p-6 bg-white rounded-[2px] border border-[#C9D1D6] space-y-5 text-xs">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" aria-hidden="true" />
                </div>
                <div className="min-w-0">
                  <p className="font-bold text-[#141517] text-sm">Email</p>
                  <a href={`mailto:${CONTACT_EMAIL}`} className="text-[#1D5FD1] underline underline-offset-4 mt-0.5 inline-block [overflow-wrap:anywhere]">{CONTACT_EMAIL}</a>
                </div>
              </div>

              <div className="flex items-center gap-3.5 pt-4 border-t border-[#DDE3E6]">
                <div className="w-10 h-10 rounded-[2px] bg-[#E8F0FC] text-[#1D5FD1] flex items-center justify-center shrink-0">
                  <MessageSquare className="w-4 h-4" aria-hidden="true" />
                </div>
                <div>
                  <p className="font-bold text-[#141517] text-sm">Chat with an agent</p>
                  <p className="text-[#4E585E] mt-0.5">Use Message on any vehicle listing</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="border-t-2 border-[#141517] pt-6 space-y-5">
              <h2 className="font-display text-[22px] leading-tight text-[#141517]">Send us a message</h2>

              {ticketSent ? (
                <div className="p-8 bg-white border border-[#8C989F] rounded-[2px] text-center space-y-3">
                  <CheckCircle2 className="w-10 h-10 text-[#141517] mx-auto" />
                  <p className="font-bold text-[#141517] text-base">Message sent</p>
                  <p className="text-xs text-[#141517] max-w-sm mx-auto">
                    The Broom Broom team will reply to <strong>{supportEmail}</strong>.
                  </p>
                  <button
                    onClick={() => setTicketSent(false)}
                    className="mt-3 px-4 py-2 bg-[#141517] text-white rounded-[2px] text-xs font-semibold cursor-pointer hover:bg-[#141517] transition-colors"
                  >
                    Send another message
                  </button>
                </div>
              ) : (
                <form onSubmit={handleSupportSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="support-name" className="gb-label block mb-2">Your full name</label>
                      <input
                        id="support-name"
                        type="text"
                        maxLength={120}
                        autoComplete="name"
                        value={supportName}
                        onChange={(e) => setSupportName(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                    <div>
                      <label htmlFor="support-email" className="gb-label block mb-2">Email address</label>
                      <input
                        id="support-email"
                        type="email"
                        maxLength={200}
                        autoComplete="email"
                        value={supportEmail}
                        onChange={(e) => setSupportEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="support-topic" className="gb-label block mb-2">Topic</label>
                    <select
                      id="support-topic"
                      value={supportCategory}
                      onChange={(e) => setSupportCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                    >
                      <option value="Buying & Applications">Buying & Applications</option>
                      <option value="Documents">Documents</option>
                      <option value="Quotations & Financing">Quotations & Financing</option>
                      <option value="Account & Sign-in">Account & Sign-in</option>
                      <option value="Something else">Something else</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="support-message" className="gb-label block mb-2">Message</label>
                    <textarea
                      id="support-message"
                      rows={4}
                      maxLength={4000}
                      placeholder="How can we help?"
                      value={supportMessage}
                      onChange={(e) => setSupportMessage(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={sending}
                    className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:bg-[#8C989F] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer flex items-center gap-2"
                  >
                    <Send className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>{sending ? 'Sending…' : 'Send message'}</span>
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
