import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { VehicleCategory, VehicleCondition, TransmissionType, FuelType, Vehicle } from '../types.ts';
import { AGENTS } from '../data/mockData.ts';


// Admins post listings straight to the marketplace; agents use the same form to request one.
export const AddVehicleForm: React.FC<{ mode?: 'admin' | 'request'; onDone?: () => void }> = ({ mode = 'admin', onDone }) => {
  const { createVehicleListing, submitListingRequest, navigateTo, showToast } = useApp();
  const isRequest = mode === 'request';
  const [agent, setAgent] = useState(AGENTS[0]);
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


  const handleCreateVehicle = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
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
      status: isDraft ? 'unpublished' : 'available',
    };

    if (isRequest) {
      submitListingRequest({ type: 'add', vehicleTitle: data.title!, changes: data, note: note.trim() });
      onDone?.();
      return;
    }
    createVehicleListing(data, agent);

    // Reset and route to vehicles list
    setTitle('');
    setModel('');
    setDescription('');
    setLocation('');
    navigateTo('admin', { adminTab: 'vehicles' });
  };

  return (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">{isRequest ? 'Request a new listing' : 'Add a listing'}</h2>
                  <p className="text-[13px] text-[#4E585E] mt-1">
                    {isRequest
                      ? 'The admin team reviews your request before anything is posted.'
                      : 'Publishes to the marketplace and assigns the listing to an agent.'}
                  </p>
                </div>

                <form onSubmit={(e) => handleCreateVehicle(e, false)} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="gb-label block mb-2">
                        Vehicle Headline Title *
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 2025 Honda Civic RS Turbo"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">
                        Category *
                      </label>
                      <select
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
                      <label className="gb-label block mb-2">Brand *</label>
                      <input
                        type="text"
                        placeholder="e.g. Honda, Porsche, Toyota"
                        value={brand}
                        onChange={(e) => setBrand(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Model *</label>
                      <input
                        type="text"
                        placeholder="e.g. Civic RS, 911 Carrera"
                        value={model}
                        onChange={(e) => setModel(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Year *</label>
                      <input
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
                      <label className="gb-label block mb-2">Price (₱) *</label>
                      <input
                        type="number"
                        value={price}
                        onChange={(e) => setPrice(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                        required
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Mileage (km)</label>
                      <input
                        type="number"
                        value={mileage}
                        onChange={(e) => setMileage(Number(e.target.value))}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>

                    <div>
                      <label className="gb-label block mb-2">Condition</label>
                      <select
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
                      <label className="gb-label block mb-2">Transmission</label>
                      <select
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
                      <label className="gb-label block mb-2">Fuel Type</label>
                      <select
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
                      <label className="gb-label block mb-2">Location <span className="normal-case tracking-normal font-normal">(optional)</span></label>
                      <input
                        type="text"
                        value={location}
                        placeholder="e.g. Taguig City"
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">
                      Description <span className="normal-case tracking-normal font-normal">(optional)</span>
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail maintenance records, tire health, registered OR/CR status..."
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                    />
                  </div>

                  {isRequest ? (
                    <div>
                      <label className="gb-label block mb-2">Note to the admin team</label>
                      <textarea
                        rows={2}
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Where the unit is from, papers, anything the admin should know"
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  ) : (
                    <div className="max-w-sm">
                      <label className="gb-label block mb-2">Assigned agent</label>
                      <select
                        value={agent}
                        onChange={(e) => setAgent(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517] cursor-pointer"
                      >
                        {AGENTS.map((a) => <option key={a} value={a}>{a}</option>)}
                      </select>
                      <p className="mt-1.5 text-[12px] text-[#4E585E]">This agent handles clients for the listing and earns its commission.</p>
                    </div>
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
                      Offer low-downpayment partner financing on this vehicle
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
                      className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-semibold text-[13px] transition-colors cursor-pointer"
                    >
                      {isRequest ? 'Send request' : 'Publish listing'}
                    </button>
                  </div>
                </form>
              </div>
  );
};
