// ============================================================
// UTILITAIRES : CALCUL CARBONE, DISTANCES, TRANSPORTS
// ============================================================

// Facteurs d'émission en kgCO2 par km par personne
// Sources : ADEME Base Carbone 2023
export const TRANSPORT_MODES = {
  voiture_essence: {
    label: 'Voiture (Essence)',
    icon: '🚗',
    color: '#e74c3c',
    emissionFactor: 0.218, // kgCO2/km
    needsFuel: true,
    fuelTypes: ['essence', 'diesel', 'hybride', 'electrique'],
    fuelFactors: {
      essence: 0.218,
      diesel: 0.195,
      hybride: 0.103,
      electrique: 0.047,
    }
  },
  moto: {
    label: 'Moto / Scooter',
    icon: '🏍️',
    color: '#e67e22',
    emissionFactor: 0.168,
    needsFuel: false,
  },
  bus: {
    label: 'Bus / Car',
    icon: '🚌',
    color: '#f39c12',
    emissionFactor: 0.029,
    needsFuel: false,
  },
  train: {
    label: 'Train',
    icon: '🚆',
    color: '#27ae60',
    emissionFactor: 0.004,
    needsFuel: false,
  },
  tgv: {
    label: 'TGV / Train grande vitesse',
    icon: '🚄',
    color: '#2ecc71',
    emissionFactor: 0.003,
    needsFuel: false,
  },
  metro: {
    label: 'Métro / Tramway',
    icon: '🚇',
    color: '#3498db',
    emissionFactor: 0.004,
    needsFuel: false,
  },
  avion_court: {
    label: 'Avion (court courrier < 3h)',
    icon: '✈️',
    color: '#c0392b',
    emissionFactor: 0.258,
    needsFuel: false,
  },
  avion_moyen: {
    label: 'Avion (moyen courrier 3-6h)',
    icon: '✈️',
    color: '#c0392b',
    emissionFactor: 0.187,
    needsFuel: false,
  },
  avion_long: {
    label: 'Avion (long courrier > 6h)',
    icon: '✈️',
    color: '#e74c3c',
    emissionFactor: 0.152,
    needsFuel: false,
  },
  velo: {
    label: 'Vélo / Trottinette',
    icon: '🚲',
    color: '#1abc9c',
    emissionFactor: 0.000,
    needsFuel: false,
  },
  velo_electrique: {
    label: 'Vélo électrique',
    icon: '⚡',
    color: '#16a085',
    emissionFactor: 0.002,
    needsFuel: false,
  },
  marche: {
    label: 'Marche à pied',
    icon: '🚶',
    color: '#2ecc71',
    emissionFactor: 0.000,
    needsFuel: false,
  },
  bateau: {
    label: 'Ferry / Bateau',
    icon: '🚢',
    color: '#2980b9',
    emissionFactor: 0.113,
    needsFuel: false,
  },
  teletravail: {
    label: 'Télétravail (pas de trajet)',
    icon: '🏠',
    color: '#95a5a6',
    emissionFactor: 0.000,
    needsFuel: false,
  },
};

export const FREQUENCY_OPTIONS = [
  { value: 'unique', label: 'Trajet unique', multiplierPerYear: 1 },
  { value: 'quotidien_5j', label: 'Tous les jours (5j/sem)', multiplierPerYear: 215 },
  { value: 'quotidien_7j', label: 'Tous les jours (7j/sem)', multiplierPerYear: 365 },
  { value: 'hebdo', label: '1 fois par semaine', multiplierPerYear: 52 },
  { value: 'bi_hebdo', label: '2 fois par semaine', multiplierPerYear: 104 },
  { value: 'mensuel', label: '1 fois par mois', multiplierPerYear: 12 },
  { value: 'trimestriel', label: 'Tous les 3 mois', multiplierPerYear: 4 },
  { value: 'semestriel', label: '2 fois par an', multiplierPerYear: 2 },
  { value: 'annuel', label: '1 fois par an', multiplierPerYear: 1 },
  { value: 'custom', label: 'Personnalisé...', multiplierPerYear: null },
];

// Calcul de la distance haversine entre deux coordonnées GPS
export function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // rayon Terre en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

function toRad(deg) {
  return deg * (Math.PI / 180);
}

// Calcul des émissions carbone pour un trajet
export function calculateEmissions(distanceKm, transportMode, fuelType, frequency, customFrequency) {
  const mode = TRANSPORT_MODES[transportMode];
  if (!mode) return { perTrip: 0, perYear: 0 };

  let factor = mode.emissionFactor;
  if (mode.needsFuel && fuelType && mode.fuelFactors[fuelType]) {
    factor = mode.fuelFactors[fuelType];
  }

  const emissionsPerTrip = distanceKm * factor; // kgCO2 aller simple

  let yearlyMultiplier = 1;
  const freq = FREQUENCY_OPTIONS.find(f => f.value === frequency);
  if (freq && freq.multiplierPerYear !== null) {
    yearlyMultiplier = freq.multiplierPerYear;
  } else if (frequency === 'custom' && customFrequency) {
    yearlyMultiplier = customFrequency;
  }

  return {
    perTrip: Math.round(emissionsPerTrip * 10) / 10,
    perYear: Math.round(emissionsPerTrip * yearlyMultiplier * 10) / 10,
    distancePerYear: Math.round(distanceKm * yearlyMultiplier),
  };
}

// Géocodage via Nominatim (OpenStreetMap, gratuit)
export async function geocodeLocation(query) {
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`;
  const response = await fetch(url, {
    headers: { 'Accept-Language': 'fr' }
  });
  const data = await response.json();
  return data.map(item => ({
    name: item.display_name,
    lat: parseFloat(item.lat),
    lon: parseFloat(item.lon),
    country: item.address?.country || '',
    city: item.address?.city || item.address?.town || item.address?.village || '',
    shortName: [
      item.address?.city || item.address?.town || item.address?.village || item.address?.county,
      item.address?.country
    ].filter(Boolean).join(', '),
  }));
}

// Formatage des émissions pour affichage
export function formatEmissions(kgCO2) {
  if (kgCO2 >= 1000) {
    return `${(kgCO2 / 1000).toFixed(2)} tCO₂e`;
  }
  return `${kgCO2.toFixed(1)} kgCO₂e`;
}

export function formatDistance(km) {
  if (km >= 1000) {
    return `${(km / 1000).toFixed(1)} 000 km`;
  }
  return `${km} km`;
}

// Couleur selon niveau d'émissions
export function getEmissionColor(kgCO2PerYear) {
  if (kgCO2PerYear === 0) return '#2ecc71';
  if (kgCO2PerYear < 100) return '#27ae60';
  if (kgCO2PerYear < 500) return '#f39c12';
  if (kgCO2PerYear < 2000) return '#e67e22';
  return '#e74c3c';
}
