import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { Stamp } from '../components/Stamp.tsx';
import { VehicleApplication } from '../types.ts';
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Edit2,
  CreditCard,
  Sparkles,
  ShieldCheck,
  Building,
  User,
  Mail,
  Phone,
  MapPin,
} from 'lucide-react';

export const ApplicationWizardView: React.FC = () => {
  const {
    vehicles,
    selectedVehicleId,
    currentUser,
    createApplication,
    navigateTo,
  } = useApp();

  const vehicle = vehicles.find((v) => v.id === selectedVehicleId) || vehicles[0];

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [confirmedApp, setConfirmedApp] = useState<VehicleApplication | null>(null);

  // Form Fields
  const [fullName, setFullName] = useState(currentUser?.name || 'Andrei Mercado');
  const [email, setEmail] = useState(currentUser?.email || 'ajjandreimercado@gmail.com');
  const [phone, setPhone] = useState(currentUser?.phone || '+63 917 842 9918');

  // Address
  const [street, setStreet] = useState(currentUser?.address?.street || '28th Street, High Street South Block');
  const [barangay, setBarangay] = useState(currentUser?.address?.barangay || 'Fort Bonifacio');
  const [city, setCity] = useState(currentUser?.address?.city || 'Taguig City');
  const [province, setProvince] = useState(currentUser?.address?.province || 'Metro Manila');
  const [region, setRegion] = useState(currentUser?.address?.region || 'NCR');
  const [postalCode, setPostalCode] = useState(currentUser?.address?.postalCode || '1634');
  const country = 'Philippines';

  // Purchase Method
  const [purchaseMethod, setPurchaseMethod] = useState<'cash' | 'financing'>('financing');
  const [financingTerm, setFinancingTerm] = useState(36);
  const [downPayment, setDownPayment] = useState(Math.round(vehicle ? vehicle.price * 0.25 : 500000));
  const [notes, setNotes] = useState('Interested in viewing this weekend. Documents ready.');

  const [error, setError] = useState('');

  if (!vehicle) {
    return (
      <div className="min-h-screen bg-[#F7F8F8] flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <p className="text-base font-semibold text-[#141517]">No vehicle selected</p>
          <button
            onClick={() => navigateTo('marketplace')}
            className="mt-4 px-5 py-2.5 bg-[#141517] text-white rounded-[2px] text-xs font-semibold hover:bg-[#2A2E31] transition-colors cursor-pointer"
          >
            Browse Inventory
          </button>
        </div>
      </div>
    );
  }

  const handleStep1Continue = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim() || !email.trim() || !phone.trim() || !street.trim() || !city.trim()) {
      setError('Please complete all required fields.');
      return;
    }
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStep2Continue = () => {
    setStep(3);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmitApplication = () => {
    const created = createApplication({
      vehicleId: vehicle.id,
      vehicleTitle: vehicle.title,
      vehiclePrice: vehicle.price,
      vehicleImage: vehicle.images[0],
      vehicleLocation: vehicle.location,
      sellerId: vehicle.sellerId,
      sellerName: vehicle.sellerName,
      applicantId: currentUser?.id || 'usr-guest',
      applicantName: fullName.trim(),
      applicantEmail: email.trim(),
      applicantPhone: phone.trim(),
      address: {
        street: street.trim(),
        barangay: barangay.trim(),
        city: city.trim(),
        province: province.trim(),
        region: region.trim(),
        postalCode: postalCode.trim(),
        country,
      },
      purchaseMethod,
      financingTermMonths: purchaseMethod === 'financing' ? financingTerm : undefined,
      downPayment: purchaseMethod === 'financing' ? downPayment : undefined,
      notes: notes.trim(),
    });

    setConfirmedApp(created);
    setStep(4);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const formattedPrice = new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    maximumFractionDigits: 0,
  }).format(vehicle.price);

  return (
    <div className="min-h-screen bg-[#F7F8F8] pb-24">
      {/* Sub-Navigation Bar */}
      <div className="sticky top-[65px] z-20 bg-[#F7F8F8] border-b border-[#C9D1D6]">
        <div className="gb-container py-3 flex items-center justify-between text-xs">
          <button
            onClick={() => navigateTo('vehicle_detail', { vehicleId: vehicle.id })}
            className="inline-flex items-center gap-1.5 py-1.5 text-[13px] font-medium text-[#141517] group cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span>Cancel Application</span>
          </button>
          <span className="gb-label">Purchase application</span>
        </div>
      </div>

      <div className="gb-container max-w-5xl pt-8 sm:pt-10">
        {/* Steps, as booklet intervals: finished ones get stamped */}
        <ol className="mb-10 grid grid-cols-4 border-y-2 border-[#141517]" aria-label="Application progress">
          {['Contact & address', 'Review details', 'Payment method', 'Confirmation'].map((name, idx) => {
            const n = idx + 1;
            const done = step > n || (n === 4 && step === 4);
            const current = step === n;
            return (
              <li
                key={name}
                aria-current={current ? 'step' : undefined}
                className={`relative py-4 pr-3 ${idx > 0 ? 'pl-3 border-l border-[#C9D1D6]' : ''}`}
              >
                <span className={`gb-label tabular-nums ${current || done ? '!text-[#141517]' : ''}`}>Step {n}</span>
                <span className={`hidden sm:block mt-1.5 text-[14px] ${current ? 'font-semibold text-[#141517]' : done ? 'text-[#141517]' : 'text-[#4E585E]'}`}>
                  {name}
                </span>
                {current && <span className="absolute left-0 right-0 -bottom-[2px] h-[3px] bg-[#1B7F35] animate-rule-in" aria-hidden="true" />}
                <span className="absolute right-2 top-1/2 -translate-y-1/2">
                  <Stamp label="Done" show={done && !current} size="sm" />
                </span>
              </li>
            );
          })}
        </ol>
        <p className="sm:hidden -mt-6 mb-8 text-[14px] font-semibold text-[#141517]">
          {step === 1 ? 'Contact & address' : step === 2 ? 'Review details' : step === 3 ? 'Payment method' : 'Confirmation'}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Wizard Form (7 cols) */}
          <div className="lg:col-span-7">
            {error && (
              <div className="mb-4 p-4 bg-white border border-[#B42318] text-[#B42318] rounded-[2px] text-xs font-semibold">
                {error}
              </div>
            )}

            {/* STEP 1: CONTACT & ADDRESS */}
            {step === 1 && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-5">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Contact & Address</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    The verified seller will use these credentials to coordinate vehicle viewing and test-drive scheduling.
                  </p>
                </div>

                <form onSubmit={handleStep1Continue} className="space-y-4 text-xs">
                  <div>
                    <label className="gb-label block mb-2">Full Legal Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">Email Address *</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                    <div>
                      <label className="gb-label block mb-2">Mobile Phone *</label>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#DDE3E6] space-y-4">
                    <span className="text-[11px] font-bold text-[#6B767D] uppercase tracking-wider block tabular-nums">
                      Residential Address (Philippines)
                    </span>

                    <div>
                      <label className="gb-label block mb-2">Street Address *</label>
                      <input
                        type="text"
                        value={street}
                        onChange={(e) => setStreet(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="gb-label block mb-2">Barangay *</label>
                        <input
                          type="text"
                          value={barangay}
                          onChange={(e) => setBarangay(e.target.value)}
                          className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                          required
                        />
                      </div>
                      <div>
                        <label className="gb-label block mb-2">City / Municipality *</label>
                        <input
                          type="text"
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="gb-label block mb-2">Province</label>
                        <input
                          type="text"
                          value={province}
                          onChange={(e) => setProvince(e.target.value)}
                          className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        />
                      </div>
                      <div>
                        <label className="gb-label block mb-2">Region</label>
                        <input
                          type="text"
                          value={region}
                          onChange={(e) => setRegion(e.target.value)}
                          className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        />
                      </div>
                      <div>
                        <label className="gb-label block mb-2">Postal Code</label>
                        <input
                          type="text"
                          value={postalCode}
                          onChange={(e) => setPostalCode(e.target.value)}
                          className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full mt-4 py-3.5 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Continue to Review</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            )}

            {/* STEP 2: REVIEW */}
            {step === 2 && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Review Application</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Please verify your contact and delivery address before choosing payment structure.
                  </p>
                </div>

                <div className="p-4 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6B767D] text-[10px] uppercase tracking-wider tabular-nums">Applicant</span>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-[#1D5FD1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="font-bold text-[#141517] text-sm">{fullName}</p>
                  <p className="text-[#4E585E] tabular-nums">{email} · {phone}</p>
                </div>

                <div className="p-4 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[#6B767D] text-[10px] uppercase tracking-wider tabular-nums">Address</span>
                    <button
                      onClick={() => setStep(1)}
                      className="text-xs font-bold text-[#1D5FD1] hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                  <p className="text-[#202426] leading-relaxed font-normal">
                    {street}, {barangay}, {city}, {province} {postalCode}, Philippines
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="w-1/3 py-3 border border-[#C9D1D6] hover:border-[#141517] hover:bg-[#F7F8F8] text-[#2A2E31] font-bold text-xs rounded-[2px] cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleStep2Continue}
                    className="w-2/3 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 3: PURCHASE METHOD */}
            {step === 3 && (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Purchase Method</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Select your settlement preference. No online charges are made through this application.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setPurchaseMethod('cash')}
                    className={`cursor-pointer p-4 rounded-[2px] border text-left transition-all ${
                      purchaseMethod === 'cash'
                        ? 'border-[#141517] bg-[#F7F8F8] ring-2 ring-gray-950/10'
                        : 'border-[#C9D1D6] hover:border-[#141517] bg-white'
                    }`}
                  >
                    <CreditCard className={`w-5 h-5 mb-2 ${purchaseMethod === 'cash' ? 'text-[#141517]' : 'text-[#6B767D]'}`} />
                    <p className="text-sm font-bold text-[#141517]">Cash Settlement</p>
                    <p className="text-[11px] text-[#4E585E] mt-1">Direct wire transfer or cashier check</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPurchaseMethod('financing')}
                    className={`cursor-pointer p-4 rounded-[2px] border text-left transition-all ${
                      purchaseMethod === 'financing'
                        ? 'border-[#1D5FD1] bg-[#E8F0FC]/40 ring-2 ring-[#1D5FD1]/20'
                        : 'border-[#C9D1D6] hover:border-[#141517] bg-white'
                    }`}
                  >
                    <Sparkles className={`w-5 h-5 mb-2 ${purchaseMethod === 'financing' ? 'text-[#1D5FD1]' : 'text-[#6B767D]'}`} />
                    <p className="text-sm font-bold text-[#141517]">Auto Financing</p>
                    <p className="text-[11px] text-[#4E585E] mt-1">Partner bank installment terms</p>
                  </button>
                </div>

                {purchaseMethod === 'financing' && (
                  <div className="p-5 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] space-y-4 text-xs">
                    <div>
                      <label className="block font-bold text-[#2A2E31] mb-2">Preferred Loan Term</label>
                      <div className="grid grid-cols-4 gap-2">
                        {[12, 24, 36, 48].map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setFinancingTerm(m)}
                            className={`py-2 rounded-[2px] text-xs font-bold transition-all cursor-pointer ${
                              financingTerm === m
                                ? 'bg-[#141517] text-white'
                                : 'bg-white border border-[#C9D1D6] text-[#2A2E31] hover:border-[#141517]'
                            }`}
                          >
                            {m} mo
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between font-medium text-[#2A2E31] mb-1.5">
                        <span>Down Payment Target</span>
                        <span className="tabular-nums font-bold text-[#141517]">₱{downPayment.toLocaleString()}</span>
                      </div>
                      <input
                        type="range"
                        min={Math.round(vehicle.price * 0.15)}
                        max={Math.round(vehicle.price * 0.5)}
                        step={10000}
                        value={downPayment}
                        onChange={(e) => setDownPayment(Number(e.target.value))}
                        className="w-full accent-[#1D5FD1] cursor-pointer"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="gb-label block mb-2">
                    Viewing Schedule / Special Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Preferred date/time for physical viewing..."
                    className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setStep(2)}
                    className="w-1/3 py-3 border border-[#C9D1D6] hover:border-[#141517] hover:bg-[#F7F8F8] text-[#2A2E31] font-bold text-xs rounded-[2px] cursor-pointer transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitApplication}
                    className="w-2/3 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer flex items-center justify-center gap-2"
                  >
                    <span>Submit Application</span>
                    <CheckCircle2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 4: CONFIRMATION */}
            {step === 4 && confirmedApp && (
              <div className="border-t-2 border-[#141517] pt-6 text-center space-y-6">
                <div className="w-14 h-14 rounded-full bg-white text-[#141517] flex items-center justify-center mx-auto border border-[#8C989F]">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h2 className="text-2xl font-bold text-[#141517]">Application Dispatched</h2>
                  <p className="text-xs text-[#4E585E] mt-1 max-w-sm mx-auto">
                    Your interest application has been logged directly with {confirmedApp.sellerName}.
                  </p>
                </div>

                <div className="p-4 bg-[#F7F8F8] border border-[#C9D1D6] rounded-[2px] max-w-sm mx-auto text-left text-xs space-y-2">
                  <div className="flex justify-between border-b border-[#DDE3E6] pb-2 tabular-nums">
                    <span className="text-[#6B767D]">Reference:</span>
                    <span className="font-bold text-[#1D5FD1]">{confirmedApp.referenceNo}</span>
                  </div>
                  <div className="flex justify-between text-[#2A2E31]">
                    <span className="text-[#6B767D]">Vehicle:</span>
                    <span className="font-bold truncate max-w-[180px]">{confirmedApp.vehicleTitle}</span>
                  </div>
                  <div className="flex justify-between text-[#2A2E31]">
                    <span className="text-[#6B767D]">Status:</span>
                    <span className="font-bold uppercase text-[#141517]">SUBMITTED</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 max-w-sm mx-auto pt-2">
                  <button
                    onClick={() => navigateTo('account', { accountTab: 'applications' })}
                    className="flex-1 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    View My Applications
                  </button>
                  <button
                    onClick={() => navigateTo('marketplace')}
                    className="flex-1 py-3 border border-[#C9D1D6] hover:border-[#141517] hover:bg-[#F7F8F8] text-[#202426] font-semibold text-xs rounded-[2px] transition-colors cursor-pointer"
                  >
                    Back to Marketplace
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Attached Vehicle Summary (5 cols) */}
          <div className="lg:col-span-5">
            <div className="border-t-2 border-[#141517] pt-6 space-y-4 sticky top-32 text-xs">
              <div className="aspect-[16/10] overflow-hidden bg-[#EEF1F2]">
                <img
                  src={vehicle.images[0]}
                  alt={vehicle.title}
                  className="w-full h-full object-cover"
                />
              </div>

              <div>
                <h3 className="font-semibold text-[#141517] leading-snug text-[16px]">{vehicle.title}</h3>
                <div className="font-display text-[24px] leading-none text-[#141517] tabular-nums mt-2">
                  {formattedPrice}
                </div>
              </div>

              <div className="pt-3 border-t border-[#DDE3E6] space-y-2 text-[#4E585E]">
                <div className="flex justify-between">
                  <span className="text-[#6B767D]">Seller:</span>
                  <span className="font-semibold text-[#141517]">{vehicle.sellerName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B767D]">Mileage:</span>
                  <span className="tabular-nums text-[#141517]">{vehicle.mileage.toLocaleString()} km</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B767D]">Location:</span>
                  <span className="text-[#141517]">{vehicle.location.split(',')[0]}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#DDE3E6]">
                <div className="flex items-center gap-1.5 text-[#141517] text-[11px] font-semibold">
                  <ShieldCheck className="w-4 h-4 text-[#141517]" />
                  <span>Verified Clean Documentation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
