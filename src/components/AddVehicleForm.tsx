import React, { useState } from 'react';
import { useApp } from '../context/AppContext.tsx';
import { VehicleCategory, VehicleCondition, TransmissionType, FuelType } from '../types.ts';


// Admin-only: posting new inventory to the marketplace.
export const AddVehicleForm: React.FC = () => {
  const { createVehicleListing, navigateTo, showToast } = useApp();

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
  const [location, setLocation] = useState('Bonifacio Global City, Taguig');
  const [description, setDescription] = useState('');
  const [financingAvailable, setFinancingAvailable] = useState(true);


  const handleCreateVehicle = (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!title.trim() || !brand.trim()) {
      showToast('Validation Error', 'Vehicle title and brand are required.', 'error');
      return;
    }

    createVehicleListing({
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
      location,
      description: description.trim() || 'Comprehensive service records, pristine condition, ready for LTO transfer.',
      financingAvailable,
      status: isDraft ? 'unpublished' : 'available',
    });

    // Reset and route to vehicles list
    setTitle('');
    setModel('');
    setDescription('');
    navigateTo('admin', { adminTab: 'vehicles' });
  };

  return (
              <div className="border-t-2 border-[#141517] pt-6 space-y-6">
                <div>
                  <h2 className="font-display text-[22px] leading-tight text-[#141517]">Post a Vehicle for Sale</h2>
                  <p className="text-xs text-[#4E585E] mt-1">
                    Your listing will be indexed across the Groom Broom automotive inventory.
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
                        <option value="Certified Pre-Owned">Certified Pre-Owned</option>
                        <option value="Used">Used</option>
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
                      <label className="gb-label block mb-2">Location</label>
                      <input
                        type="text"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="gb-label block mb-2">
                      Full Description & Vehicle Condition Notes
                    </label>
                    <textarea
                      rows={3}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Detail maintenance records, tire health, registered OR/CR status..."
                      className="w-full px-3 py-2.5 text-[14px] bg-white border border-[#8C989F] text-[#141517]"
                    />
                  </div>

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
                    <button
                      type="button"
                      onClick={(e) => handleCreateVehicle(e, true)}
                      className="py-3 px-5 border border-[#C9D1D6] hover:bg-[#F7F8F8] text-[#2A2E31] font-semibold text-xs rounded-[2px] cursor-pointer transition-colors"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="submit"
                      className="py-3 px-6 bg-[#1D5FD1] hover:bg-[#174CA8] text-white font-bold text-xs rounded-[2px] transition-colors cursor-pointer"
                    >
                      Publish Listing Now
                    </button>
                  </div>
                </form>
              </div>
  );
};
