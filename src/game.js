import { geoContains, geoDistance } from 'd3-geo';
import { feature, mesh } from 'topojson-client';
import geography from './data/places.json' with { type: 'json' };
import atlas from 'world-atlas/countries-110m.json' with { type: 'json' };

export const countries = feature(atlas, atlas.objects.countries).features;
export const borders = mesh(atlas, atlas.objects.countries).coordinates;
export const ROUND_COUNT = 10;
export const CAPITAL_RADIUS = 300;
export const atlasPlaces = geography;
export const places = geography.filter((place) => place.study);

export const regions = [
  { id: 'world', name: 'Mundo', lat: 15, lng: -28, altitude: 2.15 },
  { id: 'middle-east', name: 'Oriente Médio', lat: 28, lng: 44, altitude: 1.35 },
  { id: 'latin-america', name: 'América Latina', lat: -5, lng: -70, altitude: 1.9 },
  { id: 'south-america', name: 'América do Sul', lat: -20, lng: -60, altitude: 1.65 },
  { id: 'north-america', name: 'América do Norte', lat: 42, lng: -102, altitude: 1.8 },
  { id: 'central-america', name: 'América Central', lat: 16, lng: -88, altitude: 1.15 },
  { id: 'caribbean', name: 'Caribe', lat: 19, lng: -73, altitude: 1.1 },
  { id: 'europe', name: 'Europa', lat: 51, lng: 16, altitude: 1.45 },
  { id: 'africa', name: 'África', lat: 1, lng: 20, altitude: 1.8 },
  { id: 'asia', name: 'Ásia', lat: 32, lng: 95, altitude: 1.9 },
  { id: 'east-asia', name: 'Leste Asiático', lat: 36, lng: 117, altitude: 1.5 },
  { id: 'southeast-asia', name: 'Sudeste Asiático', lat: 8, lng: 110, altitude: 1.4 },
  { id: 'oceania', name: 'Oceania', lat: -25, lng: 150, altitude: 1.8 },
];

const middleEast = new Set(['AE', 'BH', 'CY', 'EG', 'IR', 'IQ', 'IL', 'JO', 'KW', 'LB', 'OM', 'PS', 'QA', 'SA', 'SY', 'TR', 'YE']);
const latinAmerica = new Set(['AR', 'BO', 'BR', 'CL', 'CO', 'CR', 'CU', 'DO', 'EC', 'SV', 'GT', 'HT', 'HN', 'MX', 'NI', 'PA', 'PY', 'PE', 'UY', 'VE']);

export function inRegion(place, region = 'world') {
  switch (region) {
    case 'middle-east': return middleEast.has(place.code);
    case 'latin-america': return latinAmerica.has(place.code);
    case 'south-america': return place.subregion === 'South America';
    case 'north-america': return place.region === 'Americas' && place.subregion !== 'South America';
    case 'central-america': return place.subregion === 'Central America';
    case 'caribbean': return place.subregion === 'Caribbean';
    case 'europe': return place.region === 'Europe';
    case 'africa': return place.region === 'Africa';
    case 'asia': return place.region === 'Asia';
    case 'east-asia': return place.subregion === 'Eastern Asia';
    case 'southeast-asia': return place.subregion === 'South-Eastern Asia';
    case 'oceania': return place.region === 'Oceania';
    default: return true;
  }
}

export function placeAt(point) {
  const shape = countries.find((country) => geoContains(country, [point.lng, point.lat]));
  return shape ? atlasPlaces.find((place) => place.shapeName === shape.properties.name) : null;
}

export function createGame(mode, region = 'world') {
  const pool = places.filter((place) => inRegion(place, region));
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, ROUND_COUNT).map((place, i) => ({
    ...place,
    kind: mode === 'mixed' ? (i % 2 === 0 ? 'country' : 'capital') : mode,
    ...(mode === 'country' || (mode === 'mixed' && i % 2 === 0) ? { lat: place.countryLat, lng: place.countryLng } : {}),
  }));
}

export function evaluateGuess(question, guess) {
  const distance = Math.round(geoDistance([guess.lng, guess.lat], [question.lng, question.lat]) * 6371);
  const correct = question.kind === 'country'
    ? geoContains(countries.find((c) => c.id === question.id), [guess.lng, guess.lat])
    : distance <= CAPITAL_RADIUS;
  return { correct, distance, points: correct ? (question.kind === 'country' ? 1000 : Math.max(500, 1000 - Math.round(distance / CAPITAL_RADIUS * 500))) : 0 };
}

export function coordinates({ lat, lng }) {
  return `${Math.abs(lat).toFixed(1)}° ${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lng).toFixed(1)}° ${lng >= 0 ? 'L' : 'O'}`;
}
