import React, { useState } from 'react';
import { useApp } from '../../context/AppContext.tsx';
import type { PreOrderAccessory, Vehicle } from '../../types.ts';
import { PreOrderPanel } from '../PreOrderPanel.tsx';
import { OFF_ROAD_INCLUSIONS } from '../preorder.ts';
import { uploadFile, dataUrlToBlob } from '../../api.ts';
import { photoDataUrl, MAX_PHOTOS } from '../../media.ts';
import { SectionHeader, FilterTabs, EmptyState, btn, peso } from './ui.tsx';
import { ImagePlus, Trash2, X } from 'lucide-react';

const input = 'w-full px-3 py-2 text-[14px] bg-white border border-[#8C989F] text-[#141517] focus:outline-none focus:border-[#1D5FD1]';
const digits = (v: string) => v.replace(/\D/g, '').slice(0, 9);

// Admin: every pre-order. Open ones can be edited (and priced) until their quotation is sent.
export const PreOrdersList: React.FC = () => {
  const { preorders, applications } = useApp();
  const [show, setShow] = useState<'open' | 'all'>('open');
  const isClosed = (ref?: string) => ['completed', 'declined', 'withdrawn'].includes(applications.find((a) => a.referenceNo === ref)?.status ?? '');
  const rows = preorders.filter((p) => show === 'all' || !isClosed(p.applicationRef));
  return (
    <div className="space-y-6">
      <SectionHeader title="Pre-orders" hint="Set Additional Customization before sending the quotation. The quotation is made from the application, as for any vehicle; once sent, the pre-order is locked until you reopen it.">
        <FilterTabs id="po" value={show} onChange={setShow} options={[{ value: 'open', label: 'Open', count: preorders.filter((p) => !isClosed(p.applicationRef)).length }, { value: 'all', label: 'All', count: preorders.length }]} />
      </SectionHeader>
      {rows.length === 0 ? <EmptyState title="No pre-orders" body="Clients send them from the Pre-Order page." /> : rows.map((p) => <PreOrderPanel key={p.id} p={p} mode="admin" />)}
    </div>
  );
};

// One unit clients can pre-order: name, base price, photos, and whether it shows on the Pre-Order page.
const UnitForm: React.FC<{ unit?: Vehicle; onDone: () => void }> = ({ unit, onDone }) => {
  const { savePreorderUnit, showToast } = useApp();
  const [title, setTitle] = useState(unit?.title ?? '');
  const [price, setPrice] = useState(String(unit?.price ?? ''));
  const [description, setDescription] = useState(unit?.description ?? '');
  const [images, setImages] = useState<string[]>(unit?.images.filter((u) => !u.startsWith('data:')) ?? []);
  const [hidden, setHidden] = useState(unit?.status === 'unpublished');
  const [busy, setBusy] = useState(false);
  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files).slice(0, MAX_PHOTOS - images.length)) {
      try {
        const up = await uploadFile(await dataUrlToBlob(await photoDataUrl(f)), f.name.replace(/\.\w+$/, '.jpg'), 'public');
        setImages((x) => [...x, up.url]);
      } catch (e) {
        showToast('Photo not added', e instanceof Error ? e.message : f.name, 'error');
      }
    }
    setBusy(false);
  };
  return (
    <form
      className="space-y-3 p-4 bg-[#F7F8F8] border border-[#C9D1D6]"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        const ok = await savePreorderUnit(unit?.id ?? null, { title: title.trim(), price: Number(price), images, description: description.trim(), hidden });
        setBusy(false);
        if (ok) onDone();
      }}
    >
      <div className="grid sm:grid-cols-[1fr_12rem] gap-3">
        <label className="block"><span className="gb-label block mb-1.5">Unit name</span><input className={input} maxLength={120} value={title} placeholder="e.g. DA64V Every Van" onChange={(e) => setTitle(e.target.value)} /></label>
        <label className="block"><span className="gb-label block mb-1.5">Base price (₱)</span><input className={`${input} tabular-nums`} inputMode="numeric" value={price} onChange={(e) => setPrice(digits(e.target.value))} /></label>
      </div>
      <label className="block"><span className="gb-label block mb-1.5">Description (optional)</span><textarea rows={2} maxLength={4000} className={input} value={description} onChange={(e) => setDescription(e.target.value)} /></label>
      <div className="flex flex-wrap gap-2">
        {images.map((u, i) => (
          <span key={u} className="relative w-24 h-16 border border-[#C9D1D6]">
            <img src={u} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
            <button type="button" onClick={() => setImages(images.filter((x) => x !== u))} aria-label={`Remove photo ${i + 1}`} className="absolute top-0.5 right-0.5 bg-white/90 p-0.5 cursor-pointer"><X className="w-3.5 h-3.5" /></button>
          </span>
        ))}
        {images.length < MAX_PHOTOS && (
          <label className="w-24 h-16 flex flex-col items-center justify-center border border-dashed border-[#8C989F] text-[11.5px] font-semibold cursor-pointer hover:bg-[#EEF1F2] focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1]">
            <ImagePlus className="w-4 h-4" aria-hidden="true" />{busy ? 'Uploading…' : 'Add photos'}
            <input type="file" accept="image/*" multiple disabled={busy} className="sr-only" onChange={(e) => { addPhotos(e.target.files); e.target.value = ''; }} />
          </label>
        )}
      </div>
      <label className="flex items-center gap-2 text-[13.5px] cursor-pointer">
        <input type="checkbox" className="accent-[#1D5FD1] w-4 h-4" checked={hidden} onChange={(e) => setHidden(e.target.checked)} /> Hidden from the Pre-Order page
      </label>
      <div className="flex gap-2">
        <button type="submit" className={btn.primary} disabled={busy || !title.trim() || !(Number(price) > 0)}>{unit ? 'Save unit' : 'Add unit'}</button>
        <button type="button" onClick={onDone} className="px-3 py-2 text-[13px] text-[#4E585E] hover:text-[#141517] cursor-pointer">Cancel</button>
      </div>
    </form>
  );
};

// Admin: the units on the Pre-Order page, the accessories list, and the Off-Road Set Up price.
export const PreOrderSetup: React.FC = () => {
  const { preorderUnits, preorderSettings, savePreorderSettings, deletePreorderUnit } = useApp();
  const [editing, setEditing] = useState<string | 'new' | null>(null);
  const [accessories, setAccessories] = useState<(Omit<PreOrderAccessory, 'price'> & { price: string })[]>(preorderSettings.accessories.map((a) => ({ ...a, price: String(a.price) })));
  const [offRoad, setOffRoad] = useState(String(preorderSettings.offRoadPrice || ''));
  const [busy, setBusy] = useState(false);
  const setAcc = (i: number, k: 'name' | 'price', v: string) => setAccessories((xs) => xs.map((a, j) => (j === i ? { ...a, [k]: v } : a)));
  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <SectionHeader title="Pre-order units" hint="The units clients choose from on the Pre-Order page. A unit someone pre-ordered can be hidden, not deleted.">
          {editing !== 'new' && <button className={btn.primary} onClick={() => setEditing('new')}>Add unit</button>}
        </SectionHeader>
        {editing === 'new' && <UnitForm onDone={() => setEditing(null)} />}
        {preorderUnits.length === 0 && editing !== 'new' && <EmptyState title="No units yet" body="Add the first unit clients can pre-order." />}
        {preorderUnits.map((u) =>
          editing === u.id ? (
            <UnitForm key={u.id} unit={u} onDone={() => setEditing(null)} />
          ) : (
            <div key={u.id} className="flex flex-wrap items-center gap-4 p-3 bg-white border border-[#C9D1D6]">
              <img src={u.images[0]} alt="" className="w-24 h-16 object-cover bg-[#EEF1F2]" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[14.5px] text-[#141517]">{u.title}</p>
                <p className="text-[13px] tabular-nums text-[#2A2E31]">{peso(u.price)}{u.status === 'unpublished' ? ' · Hidden' : ''}</p>
              </div>
              <button className={btn.outline} onClick={() => setEditing(u.id)}>Edit</button>
              <button className="p-2 text-[#9B2C2C] hover:bg-[#FBEAEA] cursor-pointer" aria-label={`Delete ${u.title}`} onClick={() => window.confirm(`Delete ${u.title}?`) && deletePreorderUnit(u.id)}><Trash2 className="w-4 h-4" /></button>
            </div>
          )
        )}
      </section>

      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          await savePreorderSettings({ accessories: accessories.map((a) => ({ id: a.id, name: a.name.trim(), price: Number(a.price || 0) })), offRoadPrice: Number(offRoad || 0) });
          setBusy(false);
        }}
      >
        <SectionHeader title="Accessories and Off-Road Set Up" hint="New pre-orders use these prices. Pre-orders already sent keep the prices the client saw." />
        <div className="space-y-2">
          {accessories.map((a, i) => (
            <div key={a.id || `new-${i}`} className="grid grid-cols-[1fr_9rem_auto] gap-2 items-center">
              <input aria-label={`Accessory ${i + 1} name`} className={input} maxLength={80} value={a.name} onChange={(e) => setAcc(i, 'name', e.target.value)} />
              <input aria-label={`${a.name || `Accessory ${i + 1}`} price`} className={`${input} tabular-nums`} inputMode="numeric" value={a.price} placeholder="₱" onChange={(e) => setAcc(i, 'price', digits(e.target.value))} />
              <button type="button" className="p-2 text-[#9B2C2C] hover:bg-[#FBEAEA] cursor-pointer" aria-label={`Remove ${a.name || `accessory ${i + 1}`}`} onClick={() => setAccessories(accessories.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}
          <button type="button" className={btn.outline} onClick={() => setAccessories([...accessories, { id: '', name: '', price: '' }])}>Add accessory</button>
        </div>
        <div className="p-4 bg-white border border-[#141517] grid sm:grid-cols-[1fr_12rem] gap-3 items-end">
          <div>
            <p className="font-semibold text-[14.5px] text-[#141517]">Off-Road Set Up</p>
            <p className="text-[12.5px] text-[#4E585E] mt-1">Fixed inclusions: {OFF_ROAD_INCLUSIONS.join(', ')}.</p>
          </div>
          <label className="block"><span className="gb-label block mb-1.5">Price (₱)</span><input className={`${input} tabular-nums`} inputMode="numeric" value={offRoad} onChange={(e) => setOffRoad(digits(e.target.value))} /></label>
        </div>
        <button type="submit" className={btn.primary} disabled={busy || accessories.some((a) => !a.name.trim())}>{busy ? 'Saving…' : 'Save prices'}</button>
      </form>
    </div>
  );
};
