with open('src/data/mockData.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace veh-00 images
content = content.replace(
'''    images: [
      generateVehicleSvg('car', '#1D4ED8', 'Suzuki Every Kei Van 4WD'),
      generateVehicleSvg('car', '#2563EB', 'Suzuki Every Cargo Profile'),
      generateVehicleSvg('car', '#1E3A8A', 'Suzuki Every High Roof Interior'),
    ],''',
'''    images: [
      '/vehicles/suzuki-every-microvan.jpg',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-01 images
content = content.replace(
'''    images: [
      generateVehicleSvg('car', '#111827', 'Porsche 911 Carrera S'),
      generateVehicleSvg('car', '#1e293b', '911 Side Profile'),
      generateVehicleSvg('car', '#ea580c', '911 Sport Chrono Track'),
    ],''',
'''    images: [
      '/vehicles/porsche-911-carrera.jpg',
      'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-02 images
content = content.replace(
'''    images: [
      generateVehicleSvg('bike', '#b91c1c', 'Panigale V4 S'),
      generateVehicleSvg('bike', '#0f172a', 'Ducati Cockpit View'),
      generateVehicleSvg('bike', '#ea580c', 'Ohlins Suspension Detail'),
    ],''',
'''    images: [
      '/vehicles/ducati-panigale-v4s.jpg',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-03 images
content = content.replace(
'''    images: [
      generateVehicleSvg('truck', '#334155', 'Ranger Raptor V6'),
      generateVehicleSvg('truck', '#1e293b', 'Raptor Fox Suspension'),
      generateVehicleSvg('truck', '#ea580c', 'Raptor Bed & Tow Hook'),
    ],''',
'''    images: [
      '/vehicles/ford-ranger-raptor.jpg',
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-04 images
content = content.replace(
'''    images: [
      generateVehicleSvg('car', '#f8fafc', 'Civic Type R FL5'),
      generateVehicleSvg('car', '#dc2626', 'Type R Cockpit Red'),
      generateVehicleSvg('car', '#111827', 'Brembo Calipers & Wing'),
    ],''',
'''    images: [
      '/vehicles/honda-civic-type-r.jpg',
      'https://images.unsplash.com/photo-1590362891991-f776e747a588?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-05 images
content = content.replace(
'''    images: [
      generateVehicleSvg('scooter', '#0e7490', 'Yamaha TMAX 560'),
      generateVehicleSvg('scooter', '#155e75', 'TMAX 7-inch TFT Display'),
      generateVehicleSvg('scooter', '#ea580c', 'Tech MAX Gold Wheels'),
    ],''',
'''    images: [
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-06 images
content = content.replace(
'''    images: [
      generateVehicleSvg('ebike', '#1e293b', 'Specialized Turbo Vado'),
      generateVehicleSvg('ebike', '#334155', 'Mission Control MasterMind'),
      generateVehicleSvg('ebike', '#ea580c', 'Gates Carbon Drive Detail'),
    ],''',
'''    images: [
      'https://images.unsplash.com/photo-1485965120184-e220f721d03e?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1571068316344-75bc76f77890?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-07 images
content = content.replace(
'''    images: [
      generateVehicleSvg('atv', '#ea580c', 'Can-Am Maverick X3'),
      generateVehicleSvg('atv', '#0f172a', 'Fox 3.0 Bypass Shocks'),
      generateVehicleSvg('atv', '#475569', 'Rollcage & Smart-Lok Diff'),
    ],''',
'''    images: [
      '/vehicles/canam-maverick-x3.jpg',
      'https://images.unsplash.com/photo-1551524559-8af4e6624178?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-08 images
content = content.replace(
'''    images: [
      generateVehicleSvg('car', '#1e3a8a', 'Land Cruiser Prado 250'),
      generateVehicleSvg('car', '#3b82f6', 'Prado 250 Heritage Front'),
      generateVehicleSvg('car', '#0f172a', 'Cabin & 7-Passenger Layout'),
    ],''',
'''    images: [
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-09 images
content = content.replace(
'''    images: [
      generateVehicleSvg('scooter', '#475569', 'NIU MQi GT EVO'),
      generateVehicleSvg('scooter', '#ea580c', 'NIU Smart Halo LED'),
      generateVehicleSvg('scooter', '#0f172a', 'Twin Battery Bay'),
    ],''',
'''    images: [
      'https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace veh-10 images
content = content.replace(
'''    images: [
      generateVehicleSvg('truck', '#dc2626', 'Toyota Hilux GR Sport'),
      generateVehicleSvg('truck', '#111827', 'GR Front Grille'),
      generateVehicleSvg('truck', '#ea580c', 'GR Sport Calipers'),
    ],''',
'''    images: [
      'https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=1200&q=80',
      'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=1200&q=80',
    ],'''
)

# Replace guide images
content = content.replace(
    "heroImage: generateVehicleSvg('car', '#1e293b', 'Car Buyer Guide'),",
    "heroImage: 'https://images.unsplash.com/photo-1560179707-f14e90ef3623?auto=format&fit=crop&w=1200&q=80',"
)
content = content.replace(
    "heroImage: generateVehicleSvg('car', '#ea580c', 'Auto Financing Guide'),",
    "heroImage: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80',"
)

with open('src/data/mockData.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print('Updated mockData.ts with authentic vehicle photography!')
