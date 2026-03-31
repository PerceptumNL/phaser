export interface Business {
  id: string;
  name: string;
  icon: string;
  area: string;
  mapX: number;
  mapY: number;
}

export const BUSINESSES: Business[] = [
  { id: 'bloemen', name: 'Bloemen van Dijk', icon: '🌷', area: 'fields', mapX: 35, mapY: 10 },
  { id: 'hotel', name: 'Hotel Zeezicht', icon: '🏨', area: 'boulevard', mapX: 5, mapY: 8 },
  { id: 'viswinkel', name: 'Verse Vis Katwijk', icon: '🐟', area: 'coast', mapX: 3, mapY: 20 },
  { id: 'bakker', name: 'Bakkerij de Bollenstreek', icon: '🍞', area: 'center', mapX: 18, mapY: 14 },
  { id: 'fietsenmaker', name: 'Fietshoek Noordwijk', icon: '🔧', area: 'center', mapX: 22, mapY: 16 },
  { id: 'strandtent', name: 'Strandpaviljoen Zuid', icon: '⛱️', area: 'beach', mapX: 2, mapY: 25 },
  { id: 'kaaswinkel', name: 'Kaas & Meer', icon: '🧀', area: 'center', mapX: 20, mapY: 12 },
  { id: 'surfschool', name: 'Surfschool de Kust', icon: '🏄', area: 'coast', mapX: 4, mapY: 4 },
];
