import { useEffect, useRef, useState } from 'react';
import { TRANSPORT_MODES } from '../utils/carbonUtils';

// We use Leaflet directly to avoid SSR issues
let L = null;

export default function TripMap({ trips = [], selectedTripId = null, height = 400 }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layersRef = useRef({});
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (mapInstanceRef.current) return;

    // Dynamic import of Leaflet
    import('leaflet').then(leaflet => {
      L = leaflet.default;

      const map = L.map(mapRef.current, {
        center: [20, 10],
        zoom: 2,
        zoomControl: true,
        attributionControl: false,
      });

      // Dark tile layer (CartoDB Dark)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 18,
        subdomains: 'abcd',
      }).addTo(map);

      // Attribution
      L.control.attribution({ prefix: '© OpenStreetMap / CartoDB' }).addTo(map);

      mapInstanceRef.current = map;
      setMapReady(true);
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapReady || !L) return;
    const map = mapInstanceRef.current;

    // Clear existing layers
    Object.values(layersRef.current).forEach(layer => {
      if (map.hasLayer(layer)) map.removeLayer(layer);
    });
    layersRef.current = {};

    trips.forEach(trip => {
      if (!trip.departure || !trip.arrival) return;

      const mode = TRANSPORT_MODES[trip.transport];
      const color = mode?.color || '#e8a020';
      const isSelected = selectedTripId === trip.id;
      const isVisible = !selectedTripId || isSelected;

      if (!isVisible) return;

      // Draw curved line
      const dep = [trip.departure.lat, trip.departure.lon];
      const arr = [trip.arrival.lat, trip.arrival.lon];

      // Great circle approximation with intermediate points
      const points = interpolateGreatCircle(dep, arr, 50);

      const polyline = L.polyline(points, {
        color: color,
        weight: isSelected ? 3 : 1.5,
        opacity: isSelected ? 0.9 : 0.6,
        dashArray: isSelected ? null : '6 4',
      });

      // Popup content
      const popupContent = `
        <div style="font-family: 'DM Sans', sans-serif; color: #e8edf5; background: #162032; padding: 12px; border-radius: 8px; min-width: 200px;">
          <div style="font-weight: 700; margin-bottom: 6px; font-size: 0.9rem;">
            ${mode?.icon || ''} ${trip.departure.shortName || ''} → ${trip.arrival.shortName || ''}
          </div>
          <div style="font-size: 0.78rem; color: #8fa3bc; line-height: 1.8;">
            <div>🚌 ${mode?.label || trip.transport}</div>
            <div>📏 ${trip.distance?.toLocaleString('fr-FR') || '?'} km</div>
            <div>💨 ${trip.emissions?.perYear?.toFixed(1) || '?'} kgCO₂e/an</div>
            ${trip.notes ? `<div>📝 ${trip.notes}</div>` : ''}
          </div>
        </div>
      `;

      polyline.bindPopup(popupContent, { className: 'dark-popup' });
      polyline.addTo(map);
      layersRef.current[trip.id] = polyline;

      // Markers for departure and arrival
      const depIcon = L.divIcon({
        html: `<div style="width:8px;height:8px;border-radius:50%;background:${color};border:2px solid rgba(255,255,255,0.4);box-shadow:0 0 6px ${color};"></div>`,
        className: '',
        iconSize: [8, 8],
        iconAnchor: [4, 4],
      });

      const arrIcon = L.divIcon({
        html: `<div style="width:10px;height:10px;border-radius:50%;background:${color};border:2px solid #fff;box-shadow:0 0 8px ${color};"></div>`,
        className: '',
        iconSize: [10, 10],
        iconAnchor: [5, 5],
      });

      if (isVisible) {
        L.marker(dep, { icon: depIcon }).addTo(map);
        L.marker(arr, { icon: arrIcon }).addTo(map);
      }
    });

    // Fit bounds if trips visible
    const visibleTrips = selectedTripId
      ? trips.filter(t => t.id === selectedTripId)
      : trips;

    if (visibleTrips.length > 0) {
      const bounds = [];
      visibleTrips.forEach(t => {
        if (t.departure) bounds.push([t.departure.lat, t.departure.lon]);
        if (t.arrival) bounds.push([t.arrival.lat, t.arrival.lon]);
      });
      if (bounds.length > 0) {
        try {
          map.fitBounds(bounds, { padding: [40, 40] });
        } catch (e) {}
      }
    }
  }, [trips, selectedTripId, mapReady]);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: 12, overflow: 'hidden' }}
    />
  );
}

// Interpolate great circle path between two points
function interpolateGreatCircle(start, end, numPoints) {
  const points = [];
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const lat = start[0] + (end[0] - start[0]) * t;
    const lon = start[1] + (end[1] - start[1]) * t;
    points.push([lat, lon]);
  }
  return points;
}
