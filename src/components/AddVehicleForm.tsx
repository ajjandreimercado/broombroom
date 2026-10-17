import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { VehicleCategory, VehicleCondition, TransmissionType, FuelType, Vehicle } from '../types.ts';
import { MAX_PHOTOS, MAX_VIDEOS, MAX_VIDEO_BYTES, photoDataUrl } from '../media.ts';
import { uploadFile, dataUrlToBlob } from '../api.ts';
import { StoredVideo } from './StoredVideo.tsx';
import { ImagePlus, X } from 'lucide-react';


// Admins post listings straight to the marketplace; agents use the same form to request one.
export const AddVehicleForm: React.FC<{ mode?: 'admin' | 'request'; onDone?: () => void }> = ({ mode = 'admin', onDone }) => {
  const { createVehicleListing, submitListingRequest, navigateTo, showToast } = useApp();
  const isRequest = mode === 'request';
  const [note, setNote] = useState('');

  // Add Vehicle Form state
  const [title, setTitle] = useState('');
  const [brand, setBrand] = useState('Honda');
  const [model, setModel] = useState('');
  const [year, setYear] = useState(2025);
  const [category, setCategory] = useState<Exclude<VehicleCategory, 'all'>>('cars');
  const [price, setPrice] = useState<number>(1200000);
  const [mileage, setMileage] = useState<number>(5000);
  const [condition, setCondition] = useState<VehicleCondition>('New');
  const [transmission, setTransmission] = useState<TransmissionType>('Automatic');
  const [fuel, setFuel] = useState<FuelType>('Gasoline');
  const [bodyType, setBodyType] = useState('Sedan');
  const [color, setColor] = useState('Obsidian Black');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [financingAvailable, setFinancingAvailable] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [videos, setVideos] = useState<string[]>([]);
  const [mediaBusy, setMediaBusy] = useState(false);
  const [mediaError, setMediaError] = useState('');

  const [saving, setSaving] = useState(false);

  // Photos are shrunk, then both photos and videos upload to the server as public listing media.
  const addMedia = async (files: FileList | null) => {
    if (!files?.length) return;
    setMediaBusy(true);
    const problems: string[] = [];
    let nPhotos = photos.length;
    let nVideos = videos.length;
    for (const file of Array.from(files)) {
      try {
        if (file.type.startsWith('image/')) {
          if (nPhotos >= MAX_PHOTOS) { problems.push(`Up to ${MAX_PHOTOS} photos. ${file.name} was skipped.`); continue; }
          nPhotos++;
          const blob = await dataUrlToBlob(await photoDataUrl(file));
          const up = await uploadFile(blob, file.name.replace(/\.\w+$/, '.jpg'), 'public');
          setPhotos((p) => [...p, up.url]);
        } else if (file.type.startsWith('video/')) {
          if (nVideos >= MAX_VIDEOS) { problems.push(`Up to ${MAX_VIDEOS} videos. ${file.name} was skipped.`); continue; }
          if (file.size > MAX_VIDEO_BYTES) { problems.push(`${file.name} is over 100 MB. Use a shorter or smaller video.`); continue; }
          nVideos++;
          const up = await uploadFile(file, file.name, 'public');
          setVideos((v) => [...v, up.url]);
        } else {
          problems.push(`${file.name} is not a photo or video.`);
        }
      } catch (e) {
        problems.push(e instanceof Error && e.message ? `${file.name}: ${e.message}` : `${file.name} could not be uploaded. Try another file.`);
      }
    }
    setMediaError(problems.join(' '));
    setMediaBusy(false);
  };


  const handleCreateVehicle = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (saving || mediaBusy) return;
    if (!title.trim() || !brand.trim()) {
      showToast('Validation Error', 'Vehicle title and brand are required.', 'error');
      return;
    }

    const data: Partial<Vehicle> = {
      title: title.trim(),
      brand: brand.trim(),
      model: model.trim() || title.trim(),
      year: Number(year),
      category,
      price: Number(price),
      mileage: Number(mileage),
      condition,
      transmission,
      fuel,
      bodyType,
      color,
      location: location.trim() || undefined,
      description: description.trim(),
      financingAvailable,
      images: photos.length ? photos : undefined,
      videos: videos.length ? videos : undefined,
      status: isDraft ? 'unpublished' : 'available',
    };

    setSaving(true);
    if (isRequest) {
      const sent = await submitListingRequest({ type: 'add', vehicleTitle: data.title!, changes: data, note: note.trim() });
      setSaving(false);
      if (sent) onDone?.();
      return;
    }
    const created = await createVehicleListing(data);
    setSaving(false);
    if (!created) return;

    // Reset and route to vehicles list
    setTitle('');
    setModel('');
    setDescription('');
    setLocation('');
    setPhotos([]);
    setVideos([]);
    navigateTo('admin', { adminTab: 'vehicles' });
  };

  return (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">{isRequest ? 'Request a new listing' : 'Add a listing'}</h2>
                  <p className="text-[13px] text-[#4E585E] mt-1">
                    {isRequest
                      ? 'The admin team reviews your request before anything is posted.'
                      : 'Publishes to the marketplace for the whole sales team.'}
                  </p>
                </div>

                <form onSubmit={(e) => handleCreateVehicle(e, false)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="listing-field-1" className="gb-label block mb-2">
                        Vehicle Headline Title *
                      </label>
                      <input id="listing-field-1"
                        type="text"
                        placeholder="e.g. 2025 Honda Civic RS Turbo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="listing-field-2" className="gb-label block mb-2">
                        Category *
                      </label>
                      <select id="listing-field-2"
                        value={category}
                        onChange={(e) => setCategory(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="cars">Cars & Sedans</option>
                        <option value="motorcycles">Motorcycles & Superbikes</option>
                        <option value="trucks">Trucks & Pickups</option>
                        <option value="ebikes">Smart E-Bikes</option>
                        <option value="scooters">Scooters & Maxi-Scooters</option>
                        <option value="atvs">ATVs & Buggies</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="listing-field-3" className="gb-label block mb-2">Brand *</label>
                      <input id="listing-field-3"
                        type="text"
                        placeholder="e.g. Honda, Porsche, Toyota"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="listing-field-4" className="gb-label block mb-2">Model *</label>
                      <input id="listing-field-4"
                        type="text"
                        placeholder="e.g. Civic RS, 911 Carrera"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label htmlFor="listing-field-5" className="gb-label block mb-2">Year *</label>
                      <input id="listing-field-5"
                        type="number"
                        value={year}
                        onChange={(e) => setYear(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="listing-field-6" className="gb-label block mb-2">Price (₱) *</label>
                      <input id="listing-field-6"
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="listing-field-7" className="gb-label block mb-2">Mileage (km)</label>
                      <input id="listing-field-7"
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label htmlFor="listing-field-8" className="gb-label block mb-2">Condition</label>
                      <select id="listing-field-8"
                        value={condition}
                        onChange={(e) => setCondition(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="New">New</option>
                        <option value="Surplus / 2nd hand">Surplus / 2nd hand</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label htmlFor="listing-field-9" className="gb-label block mb-2">Transmission</label>
                      <select id="listing-field-9"
                        value={transmission}
                        onChange={(e) => setTransmission(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="Automatic">Automatic</option>
                        <option value="Manual">Manual</option>
                        <option value="CVT">CVT</option>
                        <option value="Dual-Clutch">Dual-Clutch</option>
                        <option value="Direct Drive">Direct Drive (Electric)</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="listing-field-10" className="gb-label block mb-2">Fuel Type</label>
                      <select id="listing-field-10"
                        value={fuel}
                        onChange={(e) => setFuel(e.target.value as any)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        <option value="Gasoline">Gasoline</option>
                        <option value="Diesel">Diesel</option>
                        <option value="Hybrid">Hybrid</option>
                        <option value="Electric">Electric</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="listing-field-11" className="gb-label block mb-2">Location <span className="normal-case tracking-normal font-normal">(optional)</span></label>
                      <input id="listing-field-11"
                        type="text"
                        value={location}
                        placeholder="e.g. Taguig City"
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="listing-field-12" className="gb-label block mb-2">
                      Description <span className="normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <textarea id="listing-field-12"
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail maintenance records, tire health, registered OR/CR status..."
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                    />
                  </div>

                  <div>
                    <span className="gb-label block mb-2">
                      Photos and videos <span className="normal-case tracking-normal font-normal">(optional, first photo is the cover)</span>
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                      {photos.map((src, i) => (
                        <div key={src.slice(-40) + i} className="relative aspect-[4/3] bg-[#EEF1F2]">
                          <img src={src} alt={`Photo ${i + 1}`} className="w-full h-full object-cover" />
                          {i === 0 && <span className="absolute left-1 bottom-1 px-1.5 py-0.5 bg-white text-[10px] font-semibold uppercase tracking-[0.06em] text-[#141517]">Cover</span>}
                          <button type="button" onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))} aria-label={`Remove photo ${i + 1}`} className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-white text-[#141517] cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {videos.map((ref, i) => (
                        <div key={ref} className="relative aspect-[4/3]">
                          <StoredVideo id={ref} className="w-full h-full object-cover" label={`Video ${i + 1}`} />
                          <span className="absolute left-1 bottom-1 px-1.5 py-0.5 bg-white text-[10px] font-semibold uppercase tracking-[0.06em] text-[#141517]">Video</span>
                          <button type="button" onClick={() => setVideos((v) => v.filter((r) => r !== ref))} aria-label={`Remove video ${i + 1}`} className="absolute top-1 right-1 p-1 bg-white/90 hover:bg-white text-[#141517] cursor-pointer">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                      {(photos.length < MAX_PHOTOS || videos.length < MAX_VIDEOS) && (
                        <label className={`aspect-[4/3] flex flex-col items-center justify-center gap-1 border border-dashed border-[#8C989F] text-[12px] font-semibold text-[#141517] transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-[#1D5FD1] ${mediaBusy ? 'opacity-60' : 'hover:bg-[#EEF1F2] cursor-pointer'}`}>
                          <ImagePlus className="w-5 h-5" aria-hidden="true" />
                          {mediaBusy ? 'Uploading…' : 'Add files'}
                          <input
                            type="file"
                            accept="image/*,video/*"
                            multiple
                            disabled={mediaBusy}
                            className="sr-only"
                            onChange={(e) => { addMedia(e.target.files); e.target.value = ''; }}
                          />
                        </label>
                      )}
                    </div>
                    <p className="mt-1.5 text-[12px] text-[#4E585E]">Up to {MAX_PHOTOS} photos and {MAX_VIDEOS} videos (MP4, MOV or WebM, 100 MB each). Without photos the listing uses a drawn placeholder.</p>
                    {mediaError && <p role="alert" className="mt-1 text-[12px] text-[#B42318]">{mediaError}</p>}
                  </div>

                  {isRequest ? (
                    <div>
                      <label htmlFor="listing-field-13" className="gb-label block mb-2">Note to the admin team</label>
                      <textarea id="listing-field-13"
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Where the unit is from, papers, anything the admin should know"
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  ) : (
                    <p className="text-[12.5px] text-[#4E585E] border-l-2 border-[#1D5FD1] pl-3">
                      Every agent can sell this listing. A client belongs to the agent whose link they used, or to the first agent who claims them in Open leads.
                    </p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <input
                      type="checkbox"
                      id="sellerFinancing"
                      checked={financingAvailable}
                      onChange={(e) => setFinancingAvailable(e.target.checked)}
                      className="w-4 h-4 accent-[#1D5FD1]"
                    />
                    <label htmlFor="sellerFinancing" className="text-xs font-semibold text-[#2A2E31] cursor-pointer">
                      Financing available for this vehicle
                    </label>
                  </div>

                  <div className="flex gap-3 pt-3">
                    {!isRequest && (
                      <button
                        type="button"
                        onClick={(e) => handleCreateVehicle(e, true)}
                        className="py-3 px-5 border border-[#141517] hover:bg-[#EEF1F2] text-[#141517] font-semibold text-[13px] cursor-pointer transition-colors"
                      >
                        Save hidden (disapproved)
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={mediaBusy || saving}
                      className="disabled:opacity-60 py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[13px] transition-colors cursor-pointer"
                    >
                      {isRequest ? 'Send request' : 'Publish listing'}
                    </button>
                  </div>
                </form>
              </div>
  );
};
