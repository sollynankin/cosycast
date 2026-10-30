// The seven fishing spots, in the order you unlock them.
import type { LocationDef, LocationId } from './types';

export const LOCATIONS: LocationDef[] = [
  {
    id: 'pond', name: 'Willow Pond', blurb: 'A sleepy pond under willow trees. Small, friendly fish, and the odd golden koi.',
    levelReq: 1, cost: 0, weather: { clear: 70, rain: 20, fog: 10 },
    theme: { sky: ['#8ad4ff', '#d8f4ff'], night: ['#1a2050', '#4a4a90'], water: ['#5ad0d8', '#1a7a9a'], floor: '#6a5a3a', scenery: 'willows' },
  },
  {
    id: 'brook', name: 'Quiet Brook', blurb: 'A chattering stream through mossy rocks. Trout, salmon and rain-loving oddities.',
    levelReq: 3, cost: 300, weather: { clear: 55, rain: 30, fog: 15 },
    theme: { sky: ['#9ae0f8', '#eefcf0'], night: ['#142848', '#3a5a88'], water: ['#68e0c8', '#1a8a7a'], floor: '#7a6a4a', scenery: 'rocks' },
  },
  {
    id: 'lake', name: 'Mirror Lake', blurb: 'A wide still lake with mountains in the water. Bigger fish, and secrets after dark.',
    levelReq: 6, cost: 1200, weather: { clear: 60, rain: 25, fog: 15 },
    theme: { sky: ['#78b8ff', '#e8f0ff'], night: ['#10183c', '#3a3a8a'], water: ['#4aa8e8', '#14407a'], floor: '#5a5a6a', scenery: 'mountains' },
  },
  {
    id: 'frost', name: 'Frostwater Lake', blurb: 'An icy lake under the aurora. Cold-water fish that sparkle when it snows.',
    levelReq: 10, cost: 4000, weather: { clear: 40, snow: 45, fog: 15 },
    theme: { sky: ['#a8c8f0', '#f4f8ff'], night: ['#0a1840', '#2a5a7a'], water: ['#8ad8f0', '#2a6a9a'], floor: '#8a98a8', scenery: 'snowpeaks' },
  },
  {
    id: 'harbour', name: 'Sunset Harbour', blurb: 'Gulls, boats and a lighthouse. Salt-water fish run in schools, and the tuna are huge.',
    levelReq: 14, cost: 12000, weather: { clear: 65, rain: 20, fog: 15 },
    theme: { sky: ['#ffb878', '#ffe8c8'], night: ['#1a1848', '#6a3a7a'], water: ['#3a98d8', '#12386a'], floor: '#8a7a5a', scenery: 'harbour' },
  },
  {
    id: 'reef', name: 'Coral Reef', blurb: 'A bright tropical reef full of colour. Show-off fish worth a fortune.',
    levelReq: 19, cost: 30000, weather: { clear: 100 },
    theme: { sky: ['#68d8f8', '#d8fff0'], night: ['#102050', '#2a5a9a'], water: ['#28d0d0', '#0a5a8a'], floor: '#e8c890', scenery: 'palms' },
  },
  {
    id: 'deep', name: 'Starfall Deep', blurb: 'Dark water where stars fall and lanterns glow. The rarest fish in the world live here.',
    levelReq: 25, cost: 80000, weather: { clear: 100 },
    theme: { sky: ['#1a1860', '#4a3aa0'], night: ['#08082a', '#2a1a6a'], water: ['#1a3a8a', '#040820'], floor: '#1a1a3a', scenery: 'stars' },
  },
];

const byId = new Map(LOCATIONS.map((l) => [l.id, l]));

export function getLocation(id: LocationId): LocationDef {
  const l = byId.get(id);
  if (!l) throw new Error(`unknown location: ${id}`);
  return l;
}
