import React, { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { AFFIRMATION, PURPOSES, SHEET, cleanInfoSheet, type Dependent, type SheetField } from '../components/infoSheet.ts';
import { checkUpload } from '../components/admin/ui.tsx';
import { photoDataUrl } from '../media.ts';
import { dataUrlToBlob } from '../api.ts';
import { ArrowLeft, Paperclip, Plus, Trash2, X } from 'lucide-react';

const field = 'w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]';

// Client: the Applicant's Information Sheet, after the admin reserved the vehicle. Follows the paper form.
export const InfoSheetView: React.FC = () => {
  const { applications, selectedApplicationId, currentUser, submitInfoSheet, navigateTo, showToast } = useApp();
  const app = applications.find((a) => a.id === selectedApplicationId);

  // Start from what the client already gave us.
  const initial = useMemo(() => {
    const parts = (currentUser?.name ?? '').trim().split(/\s+/);
    const addr = app?.address;
    return {
      'applicant.firstName': parts.length > 1 ? parts.slice(0, -1).join(' ') : parts[0] ?? '',
      'applicant.lastName': parts.length > 1 ? parts[parts.length - 1] : '',
      'applicant.presentAddress': addr ? [addr.street, addr.barangay, addr.city, addr.province, addr.postalCode].filter(Boolean).join(', ') : '',
      'residence.cellphone': app?.applicantPhone ?? currentUser?.phone ?? '',
    } as Record<string, string>;
  }, [app?.id]);
  const [answers, setAnswers] = useState<Record<string, string>>(initial);
  const [dependents, setDependents] = useState<Dependent[]>([]);
  const [purposes, setPurposes] = useState<string[]>([]);
  const [purposeOther, setPurposeOther] = useState('');
  const [affirmed, setAffirmed] = useState(false);
  const [signature, setSignature] = useState('');
  const [spouseSignature, setSpouseSignature] = useState('');
  const [sketch, setSketch] = useState<{ blob: Blob; name: string } | undefined>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const back = () => navigateTo('account', { accountTab: 'applications' });
  if (!app || app.status !== 'reserved') {
    return (
      <section className="gb-container py-16">
        <div className="max-w-md border-t-2 border-[#141517] pt-6">
          <p className="text-[16px] font-semibold text-[#141517]">
            {app?.infoSheet ? 'Your information sheet is already in.' : 'The information sheet opens once the vehicle is reserved for you.'}
          </p>
          <button onClick={back} className="mt-5 px-6 py-3 bg-[#141517] text-white text-[14px] font-semibold cursor-pointer">My Applications</button>
        </div>
      </section>
    );
  }

  const set = (k: string, v: string) => setAnswers((a) => ({ ...a, [k]: v }));
  const input = (f: SheetField) => {
    const common = { id: `sheet-${f.key}`, value: answers[f.key] ?? '', required: f.required, className: field };
    if (f.type === 'textarea') return <textarea {...common} rows={2} maxLength={1000} onChange={(e) => set(f.key, e.target.value)} />;
    if (f.type === 'select')
      return (
        <select {...common} onChange={(e) => set(f.key, e.target.value)} className={`${field} cursor-pointer`}>
          <option value="">Choose…</option>
          {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    return (
      <input
        {...common}
        type={f.type === 'date' ? 'date' : 'text'}
        inputMode={f.type === 'number' ? 'numeric' : undefined}
        maxLength={f.type === 'number' ? 3 : 200}
        onChange={(e) => set(f.key, f.type === 'number' ? e.target.value.replace(/\D/g, '') : e.target.value)}
      />
    );
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const sheet = { answers, dependents: dependents.filter((d) => d.name.trim()), purposes, purposeOther, affirmed: affirmed as true, signature, spouseSignature };
    const checked = cleanInfoSheet(sheet); // the same checks the server does, so mistakes show here first
    if (typeof checked === 'string') {
      setError(checked);
      return;
    }
    setError('');
    setBusy(true);
    const ok = await submitInfoSheet(app.id, checked, sketch ? Object.assign(sketch.blob, { name: sketch.name }) : undefined);
    setBusy(false);
    if (ok) back();
  };

  return (
    <div className="bg-[#F7F8F8]">
      <section className="border-b border-[#141517]">
        <div className="gb-container pt-8 pb-8">
          <button onClick={back} className="inline-flex items-center gap-2 text-[13px] font-semibold text-[#2A2E31] hover:text-[#141517] cursor-pointer">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> My Applications
          </button>
          <h1 className="mt-4 font-display text-[clamp(2rem,4.6vw,3.4rem)] leading-[0.95] text-[#141517]">Applicant's Information Sheet</h1>
          <p className="mt-3 text-[15px] text-[#4E585E] max-w-[60ch]">
            For {app.referenceNo} · {app.vehicleTitle}. Fields marked * are required; fill in the rest as far as they apply to you.
          </p>
        </div>
      </section>

      <form onSubmit={submit} noValidate className="gb-container py-10 space-y-10 max-w-4xl">
        {SHEET.map((s) => (
          <fieldset key={s.id} className="border-t-2 border-[#141517] pt-5">
            <legend className="sr-only">{s.title}</legend>
            <h2 className="font-display text-[20px] leading-tight text-[#141517]">{s.title}</h2>
            {s.note && <p className="mt-1 text-[13px] text-[#4E585E]">{s.note}</p>}

            {s.fields && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
                {s.fields.map((f) => (
                  <label key={f.key} htmlFor={`sheet-${f.key}`} className={`block ${f.wide ? 'sm:col-span-2' : ''}`}>
                    <span className="gb-label block mb-1.5">{f.label}{f.required ? ' *' : ''}</span>
                    {input(f)}
                  </label>
                ))}
              </div>
            )}

            {s.kind === 'dependents' && (
              <div className="mt-4 space-y-2">
                {dependents.map((d, i) => (
                  <div key={i} className="grid grid-cols-[1fr_70px_1fr_auto] gap-2 items-center">
                    <input value={d.name} onChange={(e) => setDependents((ds) => ds.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} placeholder="Name" aria-label={`Dependent ${i + 1} name`} className={field} />
                    <input value={d.age} inputMode="numeric" maxLength={3} onChange={(e) => setDependents((ds) => ds.map((x, j) => (j === i ? { ...x, age: e.target.value.replace(/\D/g, '') } : x)))} placeholder="Age" aria-label={`Dependent ${i + 1} age`} className={field} />
                    <input value={d.studying} onChange={(e) => setDependents((ds) => ds.map((x, j) => (j === i ? { ...x, studying: e.target.value } : x)))} placeholder="Where studying, year & course" aria-label={`Dependent ${i + 1} school`} className={field} />
                    <button type="button" onClick={() => setDependents((ds) => ds.filter((_, j) => j !== i))} aria-label={`Remove dependent ${i + 1}`} className="p-2 text-[#4E585E] hover:text-[#B42318] cursor-pointer">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {dependents.length < 8 && (
                  <button type="button" onClick={() => setDependents((ds) => [...ds, { name: '', age: '', studying: '' }])} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#1D5FD1] cursor-pointer">
                    <Plus className="w-4 h-4" aria-hidden="true" /> Add a dependent
                  </button>
                )}
              </div>
            )}

            {s.kind === 'purpose' && (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-x-5 gap-y-2">
                  {PURPOSES.map((p) => (
                    <label key={p} className="inline-flex items-center gap-2 text-[14px] text-[#141517] cursor-pointer">
                      <input type="checkbox" checked={purposes.includes(p)} onChange={(e) => setPurposes((ps) => (e.target.checked ? [...ps, p] : ps.filter((x) => x !== p)))} className="w-4 h-4 accent-[#1D5FD1]" />
                      {p}
                    </label>
                  ))}
                </div>
                {purposes.includes('Others') && <input value={purposeOther} onChange={(e) => setPurposeOther(e.target.value)} placeholder="Please state" aria-label="Other purpose" maxLength={200} className={field} />}
              </div>
            )}

            {s.kind === 'affirm' && (
              <div className="mt-4 space-y-4">
                <div>
                  <span className="gb-label block mb-1.5">Sketch or map photo (optional)</span>
                  {sketch ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-2 border border-[#1B7F35] text-[12.5px] max-w-full">
                      <Paperclip className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> <span className="truncate">{sketch.name}</span>
                      <button type="button" onClick={() => setSketch(undefined)} aria-label="Remove sketch" className="cursor-pointer text-[#4E585E]"><X className="w-3.5 h-3.5" /></button>
                    </span>
                  ) : (
                    <label className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-[#141517] text-[13px] font-semibold text-[#141517] hover:bg-[#EEF1F2] cursor-pointer">
                      <Paperclip className="w-4 h-4" aria-hidden="true" /> Attach a photo
                      <input
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          e.target.value = '';
                          if (!f) return;
                          const problem = checkUpload(f);
                          if (problem || !f.type.startsWith('image/')) return showToast('Cannot attach', problem || `${f.name} is not an image.`, 'error');
                          setSketch({ blob: await dataUrlToBlob(await photoDataUrl(f, 1600)), name: f.name.replace(/\.\w+$/, '.jpg') });
                        }}
                      />
                    </label>
                  )}
                </div>
                <p className="text-[13.5px] leading-relaxed text-[#2A2E31] max-w-[70ch]">{AFFIRMATION}</p>
                <label className="flex items-start gap-2 text-[14px] text-[#141517] cursor-pointer">
                  <input type="checkbox" checked={affirmed} onChange={(e) => setAffirmed(e.target.checked)} className="mt-0.5 w-4 h-4 accent-[#1D5FD1]" />
                  I affirm that my answers are true and correct. *
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="block">
                    <span className="gb-label block mb-1.5">Applicant's signature (type your full name) *</span>
                    <input value={signature} onChange={(e) => setSignature(e.target.value)} maxLength={120} className={field} />
                  </label>
                  <label className="block">
                    <span className="gb-label block mb-1.5">Spouse / surety signature (full name)</span>
                    <input value={spouseSignature} onChange={(e) => setSpouseSignature(e.target.value)} maxLength={120} className={field} />
                  </label>
                </div>
              </div>
            )}
          </fieldset>
        ))}

        {error && <p role="alert" className="text-[14px] text-[#B42318] border-l-2 border-[#B42318] pl-3">{error}</p>}
        <div className="flex flex-wrap gap-3 border-t-2 border-[#141517] pt-6">
          <button type="submit" disabled={busy} className="px-6 py-3 bg-[#1D5FD1] hover:bg-[#174CA8] disabled:bg-[#8C989F] text-white text-[14px] font-semibold cursor-pointer">
            {busy ? 'Sending…' : 'Send information sheet'}
          </button>
          <button type="button" onClick={back} className="px-5 py-3 border border-[#141517] text-[14px] font-semibold text-[#141517] hover:bg-[#EEF1F2] cursor-pointer">Cancel</button>
        </div>
      </form>
    </div>
  );
};
