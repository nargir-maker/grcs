// Σταθμοί/POI κατά μήκος διαδρομής brevet — κατηγορίες + ταξινόμηση OSM tags.
// Ίδιες κατηγορίες/προεπιλογές με το "Στάσεις" feature του Flutter app, για συνέπεια
// μεταξύ web και mobile (βλ. greek_brevets_tracker/lib/services/resupply_service.dart).

export type PoiCategory =
  | 'water' | 'cafe' | 'first_aid' | 'bike_repair' | 'kiosk' | 'supermarket' | 'fuel'
  | 'bakery' | 'restaurant' | 'ice_cream' | 'toilets' | 'atm' | 'lodging' | 'camping';

export interface PoiCategoryDef {
  id: PoiCategory;
  icon: string;
  label: string;
  color: string;
  defaultEnabled: boolean;
}

// Σειρά εμφάνισης chips == σειρά mobile enum. Πρώτες 7 ενεργές by default.
export const POI_CATEGORIES: PoiCategoryDef[] = [
  { id: 'water',       icon: '💧', label: 'Νερό',        color: '#0EA5E9', defaultEnabled: true },
  { id: 'cafe',        icon: '☕', label: 'Καφέ',         color: '#A16207', defaultEnabled: true },
  { id: 'first_aid',   icon: '➕', label: 'Πρώτες βοήθειες', color: '#DC2626', defaultEnabled: true },
  { id: 'bike_repair', icon: '🔧', label: 'Επισκευή ποδηλάτου', color: '#06B6D4', defaultEnabled: true },
  { id: 'kiosk',       icon: '🏪', label: 'Περίπτερο',    color: '#F59E0B', defaultEnabled: true },
  { id: 'supermarket', icon: '🛒', label: 'Σούπερ μάρκετ', color: '#10B981', defaultEnabled: true },
  { id: 'fuel',        icon: '⛽', label: 'Βενζινάδικο',  color: '#6B7280', defaultEnabled: true },
  { id: 'bakery',      icon: '🥐', label: 'Φούρνος',      color: '#D97706', defaultEnabled: false },
  { id: 'restaurant',  icon: '🍽️', label: 'Εστιατόριο',   color: '#F97316', defaultEnabled: false },
  { id: 'ice_cream',   icon: '🍦', label: 'Παγωτό',       color: '#EC4899', defaultEnabled: false },
  { id: 'toilets',     icon: '🚻', label: 'Τουαλέτες',    color: '#3B82F6', defaultEnabled: false },
  { id: 'atm',         icon: '🏦', label: 'ATM / Τράπεζα', color: '#059669', defaultEnabled: false },
  { id: 'lodging',     icon: '🛏️', label: 'Διαμονή',      color: '#8B5CF6', defaultEnabled: false },
  { id: 'camping',     icon: '⛺', label: 'Κάμπινγκ',     color: '#16A34A', defaultEnabled: false },
];

export const DEFAULT_ENABLED_CATEGORIES: PoiCategory[] =
  POI_CATEGORIES.filter(c => c.defaultEnabled).map(c => c.id);

export function poiCategoryDef(id: PoiCategory): PoiCategoryDef | undefined {
  return POI_CATEGORIES.find(c => c.id === id);
}

type OsmTags = Record<string, string | undefined>;

// Ταξινομεί raw OSM tags σε μία από τις παραπάνω κατηγορίες (ή null αν δεν ταιριάζει καμία).
export function classifyOsmTags(tags: OsmTags): PoiCategory | null {
  const amenity = tags.amenity, shop = tags.shop, tourism = tags.tourism;

  if (amenity === 'drinking_water' || tags.natural === 'spring' || tags.man_made === 'water_tap') return 'water';
  if (amenity === 'cafe') return 'cafe';
  if (
    amenity === 'pharmacy' || amenity === 'hospital' || amenity === 'clinic' || amenity === 'doctors' ||
    !!tags.healthcare || tags.emergency === 'defibrillator'
  ) return 'first_aid';
  if (shop === 'bicycle' || amenity === 'bicycle_repair_station') return 'bike_repair';
  if (shop === 'kiosk') return 'kiosk';
  if (shop === 'supermarket' || shop === 'convenience' || shop === 'general') return 'supermarket';
  if (amenity === 'fuel') return 'fuel';
  if (shop === 'bakery' || shop === 'pastry') return 'bakery';
  if (amenity === 'restaurant' || amenity === 'fast_food') return 'restaurant';
  if (shop === 'ice_cream' || tags.cuisine === 'ice_cream') return 'ice_cream';
  if (amenity === 'toilets') return 'toilets';
  if (amenity === 'atm' || amenity === 'bank') return 'atm';
  if (tourism === 'hotel' || tourism === 'guest_house' || tourism === 'hostel' || tourism === 'motel') return 'lodging';
  if (tourism === 'camp_site') return 'camping';
  return null;
}

// Overpass QL tag alternations — ένα combined query μαζεύει όλες τις κατηγορίες μαζί.
export const OVERPASS_AMENITY = 'drinking_water|cafe|pharmacy|hospital|clinic|doctors|bicycle_repair_station|fuel|restaurant|fast_food|toilets|atm|bank';
export const OVERPASS_SHOP = 'bicycle|kiosk|supermarket|convenience|general|bakery|pastry|ice_cream';
export const OVERPASS_TOURISM = 'hotel|guest_house|hostel|motel|camp_site';
