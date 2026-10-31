import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { ChoiceSelect, PriceBreakdown } from '../components/PreOrderPanel.tsx';
import { OFF_ROAD_INCLUSIONS, PREORDER_CHOICES, PREORDER_DOWN_PCTS, PREORDER_MONTHLY_ADD_ON } from '../components/preorder.ts';
import { peso } from '../components/admin/ui.tsx';
import { photoDataUrl } from '../media.ts';
import { dataUrlToBlob } from '../api.ts';
import { ChevronLeft, ChevronRight, ImagePlus, X } from 'lucide-react';

const input = 'w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] focus:outline-none focus:border-[#1D5FD1]';

// Client: order a unit built to their choices. After sending, the first agent to take it (or their agent) messages
// them with the application link; the admin prices any extra suggestions in the quotation.
export const PreOrderView: React.FC = () => {
  const { preorderUnits, preorderSettings, currentUser, setAuthModalOpen, submitPreorder, navigateTo, showToast } = useApp();
  const units = preorderUnits.filter((u) => u.status === 'available');
  const [unitId, setUnitId] = useState(units[0]?.id ?? '');
  const unit = units.find((u) => u.id === unitId) ?? units[0];
  const [variant, setVariant] = useState<string>(PREORDER_CHOICES.variant[0]);
  const [transmission, setTransmission] = useState<string>(PREORDER_CHOICES.transmission[0]);
  const [seat, setSeat] = useState<string>(PREORDER_CHOICES.seat[0]);
  const [color, setColor] = useState('');
  const [note, setNote] = useState('');
  const [suggestions, setSuggestions] = useState('');
  const [accessoryIds, setAccessoryIds] = useState<string[]>([]);
  const [offRoad, setOffRoad] = useState(false);
  const [photo, setPhoto] = useState<File | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  if (!unit)
    return (
      <div className="bg-[#F7F8F8] min-h-[60vh]">
        <div className="gb-container py-16">
          <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517]">Pre-Order</h1>
          <p className="mt-5 text-[16px] text-[#4E585E] max-w-[52ch]">No units are open for pre-order right now. Check back soon, or browse the marketplace.</p>
        </div>
      </div>
    );

  const index = units.indexOf(unit);
  const step = (d: number) => setUnitId(units[(index + d + units.length) % units.length].id);
  const picked = preorderSettings.accessories.filter((a) => accessoryIds.includes(a.id));
  const draft = { unitPrice: unit.price, accessories: picked, offRoad, offRoadPrice: preorderSettings.offRoadPrice, additionalAmount: 0 };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return setAuthModalOpen(true);
    if (![variant, transmission, seat].every((x) => x.trim())) return setError('Type your choice where you picked “Others”.');
    if (!color.trim()) return setError('Enter the color you want.');
    setError('');
    setBusy(true);
    // The photo is shrunk like listing photos; one that cannot be read in the browser goes up as it is.
    let file = photo;
    if (photo) {
      try {
        file = new File([await dataUrlToBlob(await photoDataUrl(photo))], photo.name.replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' });
      } catch {}
    }
    const p = await submitPreorder({ unitId: unit.id, variant, transmission, seat, color: color.trim(), note: note.trim(), suggestions: suggestions.trim(), accessoryIds, offRoad }, file);
    setBusy(false);
    if (p) navigateTo('account', { accountTab: 'preorders' });
  };

  return (
    <div className="bg-[#F7F8F8] pb-24">
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-12 sm:pt-16 pb-10">
          <h1 className="font-display text-[clamp(2.4rem,5.4vw,4.4rem)] leading-[0.95] text-[#141517]">Pre-Order</h1>
          <p className="mt-5 text-[16px] sm:text-[17px] leading-relaxed text-[#4E585E] max-w-[56ch]">
            Choose your preferred unit and how you want it built. Your agent confirms the details with you, then Broom Broom sends your quotation.
          </p>
        </div>
      </section>

      <form onSubmit={submit} className="gb-container pt-10 grid lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 space-y-9">
          {/* Preferred unit */}
          <section aria-labelledby="unit-h">
            <h2 id="unit-h" className="font-display text-[20px] text-[#141517] pb-3 border-b-2 border-[#141517]">Preferred unit</h2>
            <div className="relative mt-4 aspect-[16/10] bg-[#EEF1F2] border border-[#C9D1D6] overflow-hidden">
              <img src={unit.images[0]} alt={unit.title} className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-x-0 bottom-0 p-4 bg-gradient-to-t from-black/75 to-transparent text-white">
                <p className="font-display text-[22px] leading-tight">{unit.title}</p>
                <p className="text-[15px] tabular-nums mt-0.5">{peso(unit.price)}</p>
              </div>
            </div>
            {units.length > 1 && (
              <div className="mt-3 flex items-center gap-2">
                <button type="button" onClick={() => step(-1)} aria-label="Previous unit" className="p-2 border border-[#8C989F] hover:bg-[#EEF1F2] cursor-pointer shrink-0"><ChevronLeft className="w-4 h-4" /></button>
                <div className="flex gap-2 overflow-x-auto flex-1 min-w-0" role="radiogroup" aria-label="Units">
                  {units.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      role="radio"
                      aria-checked={u.id === unit.id}
                      aria-label={`${u.title}, ${peso(u.price)}`}
                      onClick={() => setUnitId(u.id)}
                      className={`shrink-0 w-24 h-16 border-2 overflow-hidden cursor-pointer ${u.id === unit.id ? 'border-[#1D5FD1]' : 'border-transparent opacity-75 hover:opacity-100'}`}
                    >
                      <img src={u.images[0]} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
                <button type="button" onClick={() => step(1)} aria-label="Next unit" className="p-2 border border-[#8C989F] hover:bg-[#EEF1F2] cursor-pointer shrink-0"><ChevronRight className="w-4 h-4" /></button>
              </div>
            )}
            {unit.description && <p className="mt-3 text-[14px] text-[#2A2E31] whitespace-pre-line">{unit.description}</p>}

            <div className="mt-5 grid sm:grid-cols-2 gap-4">
              <div>
                <span className="gb-label block mb-1.5">Upload photo of your preferred unit (optional)</span>
                {photo ? (
                  <span className="inline-flex items-center gap-2 px-3 py-2 border border-[#1B7F35] bg-white text-[13px] max-w-full">
                    <span className="truncate">{photo.name}</span>
                    <button type="button" onClick={() => setPhoto(undefined)} aria-label="Remove the photo" className="cursor-pointer text-[#4E585E]"><X className="w-4 h-4" /></button>
                  </span>
                ) : (
                  <label className="flex items-center justify-center gap-2 px-3 py-2.5 border border-dashed border-[#8C989F] bg-white text-[13px] font-semibold text-[#141517] hover:bg-[#EEF1F2] cursor-pointer focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]">
                    <ImagePlus className="w-4 h-4" aria-hidden="true" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="sr-only"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        e.target.value = '';
                        if (f && f.size > 10 * 1024 * 1024) return showToast('Photo too large', 'Use a photo under 10 MB.', 'error');
                        setPhoto(f);
                      }}
                    />
                  </label>
                )}
              </div>
              <label className="block">
                <span className="gb-label block mb-1.5">Note</span>
                <textarea rows={2} maxLength={1000} className={input} value={note} onChange={(e) => setNote(e.target.value)} />
              </label>
            </div>
          </section>

          {/* Descriptions */}
          <section aria-labelledby="desc-h">
            <h2 id="desc-h" className="font-display text-[20px] text-[#141517] pb-3 border-b-2 border-[#141517]">Descriptions</h2>
            <div className="mt-4 grid sm:grid-cols-2 gap-4">
              <ChoiceSelect id="po-variant" label="Variant" options={PREORDER_CHOICES.variant} value={variant} onChange={setVariant} />
              <ChoiceSelect id="po-trans" label="Transmission" options={PREORDER_CHOICES.transmission} value={transmission} onChange={setTransmission} />
              <ChoiceSelect id="po-seat" label="Seat" options={PREORDER_CHOICES.seat} value={seat} onChange={setSeat} />
              <label className="block">
                <span className="gb-label block mb-1.5">Color</span>
                <input className={input} maxLength={60} value={color} placeholder="e.g. Pearl White" onChange={(e) => setColor(e.target.value)} />
              </label>
            </div>
          </section>

          {/* Accessories */}
          <section aria-labelledby="acc-h">
            <h2 id="acc-h" className="font-display text-[20px] text-[#141517] pb-3 border-b-2 border-[#141517]">Accessories</h2>
            <p className="mt-2 text-[13px] text-[#4E585E]">Check the box for each add-on you want.</p>
            {preorderSettings.accessories.length === 0 ? (
              <p className="mt-3 text-[14px] text-[#4E585E]">No accessories listed yet. Write what you want under Others / suggestions.</p>
            ) : (
              <div className="mt-3 border border-[#C9D1D6] bg-white divide-y divide-[#DDE3E6]">
                {preorderSettings.accessories.map((a) => (
                  <label key={a.id} className="flex items-center gap-3 px-3.5 py-3 text-[14px] cursor-pointer hover:bg-[#F7F8F8]">
                    <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={accessoryIds.includes(a.id)} onChange={(e) => setAccessoryIds(e.target.checked ? [...accessoryIds, a.id] : accessoryIds.filter((x) => x !== a.id))} />
                    <span className="flex-1 text-[#141517]">{a.name}</span>
                    <span className="tabular-nums text-[#2A2E31]">{peso(a.price)}</span>
                  </label>
                ))}
              </div>
            )}
            <label className="block mt-5">
              <span className="gb-label block mb-1.5">Others / suggestions</span>
              <textarea rows={3} maxLength={1000} className={input} value={suggestions} placeholder="Anything else you want on the unit. Broom Broom prices it in your quotation." onChange={(e) => setSuggestions(e.target.value)} />
            </label>
          </section>

          {/* Off-road */}
          <section aria-labelledby="off-h">
            <h2 id="off-h" className="sr-only">Off-Road Set Up</h2>
            <label className="flex gap-3 p-4 border border-[#141517] bg-white cursor-pointer">
              <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4 mt-1" checked={offRoad} onChange={(e) => setOffRoad(e.target.checked)} />
              <span className="flex-1">
                <span className="flex justify-between gap-3 font-semibold text-[15px] text-[#141517]">
                  Off-Road Set Up <span className="tabular-nums">{peso(preorderSettings.offRoadPrice)}</span>
                </span>
                <span className="block mt-1.5 text-[13px] text-[#4E585E]">Inclusions: {OFF_ROAD_INCLUSIONS.join(', ')}.</span>
              </span>
            </label>
          </section>
        </div>

        {/* Summary */}
        <aside className="lg:col-span-5">
          <div className="lg:sticky lg:top-24 space-y-4">
            <h2 className="font-display text-[20px] text-[#141517]">Price breakdown</h2>
            <PriceBreakdown p={draft} pendingAdditional />
            <p className="text-[12.5px] text-[#4E585E]">
              Financing: down payment of {PREORDER_DOWN_PCTS.join('%, ')}%, then {PREORDER_MONTHLY_ADD_ON}% a month (add-on) over the term. Your quotation shows the final figures.
            </p>
            {error && <p role="alert" className="text-[13px] text-[#9B2C2C]">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[14px] cursor-pointer disabled:bg-[#8C989F]">
              {busy ? 'Sending…' : currentUser ? 'Send pre-order' : 'Sign in to send your pre-order'}
            </button>
            <p className="text-[12.5px] text-[#4E585E]">After you send it, you cannot change it yourself: tell your agent and they update it for you.</p>
          </div>
        </aside>
      </form>
    </div>
  );
};
