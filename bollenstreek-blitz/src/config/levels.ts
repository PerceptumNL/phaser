export interface LevelConfig {
  level: number;
  deliveries: number;
  timePerDelivery: number;
  obstacles: string[];
  description: string;
}

export const LEVELS: LevelConfig[] = [
  { level: 1, deliveries: 2, timePerDelivery: 45, obstacles: [], description: 'Eerste ritjes!' },
  { level: 2, deliveries: 2, timePerDelivery: 40, obstacles: [], description: 'Iets sneller nu!' },
  { level: 3, deliveries: 3, timePerDelivery: 40, obstacles: ['tourists'], description: 'Toeristen op de boulevard!' },
  { level: 4, deliveries: 3, timePerDelivery: 35, obstacles: ['tourists', 'wind'], description: 'Wind vanaf zee!' },
  { level: 5, deliveries: 3, timePerDelivery: 35, obstacles: ['tourists', 'drawbridge'], description: 'De brug gaat open!' },
  { level: 6, deliveries: 4, timePerDelivery: 30, obstacles: ['tourists', 'vans'], description: 'Bestelwagens in de straat!' },
  { level: 7, deliveries: 4, timePerDelivery: 30, obstacles: ['rain', 'wind'], description: 'Regen en wind!' },
  { level: 8, deliveries: 4, timePerDelivery: 25, obstacles: ['tourists', 'wind', 'drawbridge', 'vans', 'rain'], description: 'Alles tegelijk!' },
  { level: 9, deliveries: 5, timePerDelivery: 25, obstacles: ['tourists', 'wind', 'drawbridge', 'vans', 'rain'], description: 'Bijna daar!' },
  { level: 10, deliveries: 5, timePerDelivery: 20, obstacles: ['tourists', 'wind', 'drawbridge', 'vans', 'rain'], description: 'De ultieme bezorging!' },
];
