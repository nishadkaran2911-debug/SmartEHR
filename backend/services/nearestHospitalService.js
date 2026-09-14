const HOSPITALS = [
  { name: 'City General Hospital', address: '221 Main St, Downtown', lat: 28.6139, lng: 77.209 },
  { name: 'Sunrise Medical Center', address: '88 Lakeview Ave, Midtown', lat: 28.6328, lng: 77.2197 },
  { name: 'St. Mary Care Hospital', address: '45 Green Park Rd, Central Zone', lat: 28.5494, lng: 77.1853 },
  { name: 'Apollo Community Hospital', address: '17 Ring Road, East District', lat: 28.6201, lng: 77.3066 }
];

const toRad = (value) => (value * Math.PI) / 180;

const distanceKm = (lat1, lng1, lat2, lng2) => {
  const earthRadiusKm = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return earthRadiusKm * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

export const findNearestHospital = ({ latitude, longitude }) => {
  const lat = Number(latitude);
  const lng = Number(longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || HOSPITALS.length === 0) {
    return {
      name: 'Hospital information unavailable',
      address: 'Unable to determine nearest hospital'
    };
  }

  let nearest = HOSPITALS[0];
  let bestDistance = distanceKm(lat, lng, nearest.lat, nearest.lng);

  for (let i = 1; i < HOSPITALS.length; i += 1) {
    const hospital = HOSPITALS[i];
    const currentDistance = distanceKm(lat, lng, hospital.lat, hospital.lng);
    if (currentDistance < bestDistance) {
      nearest = hospital;
      bestDistance = currentDistance;
    }
  }

  return {
    name: nearest.name,
    address: nearest.address,
    distanceKm: Number(bestDistance.toFixed(2))
  };
};
