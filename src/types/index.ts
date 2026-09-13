export type ElectricityType = 'included' | 'fixed' | 'per_unit';

export type HostelType = 'boys' | 'coliving';

export interface HostelRent {
  shares: number;
  rent: number;
  ac: boolean; // Whether this rent option is for an AC room (AC and Non-AC can exist for the same share count)
}

export interface Hostel {
  id: string;
  name: string;
  type: HostelType;
  rents: HostelRent[];
  securityFee: number;
  otherFines: string;
  // Ratings - replacing the old general "rating" field
  roomRating: number;        // 0-5
  peopleRating: number;      // 0-5
  googleMapsRating: number;  // 0-5
  ownerRating: number;       // 0-3
  // Legacy rating kept for migration
  rating?: number;
  lockInPeriod: number;
  noticePeriod: number;
  foodIncluded: boolean;
  foodCharges: number;
  electricityType: ElectricityType;
  electricityAmount: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  photos: string[]; // base64 encoded image strings
  contactNumber: string;
  description: string;
  amenities: string[]; // "Other" features (New Building, Hot Water, Water Purifier, etc.)
  createdAt: string;
  updatedAt: string;
}

export interface HostelFormData {
  name: string;
  type: HostelType;
  rents: HostelRent[];
  securityFee: string;
  otherFines: string;
  // Ratings
  roomRating: number;
  peopleRating: number;
  googleMapsRating: number;
  ownerRating: number;
  lockInPeriod: string;
  noticePeriod: string;
  foodIncluded: boolean;
  foodCharges: string;
  electricityType: ElectricityType;
  electricityAmount: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  photos: string[];
  contactNumber: string;
  description: string;
  amenities: string[];
}

export const SHARE_OPTIONS = [1, 2, 3, 4, 5] as const;

export const AMENITIES_LIST = [
  'Wi-Fi',
  'Laundry',
  'Power Backup',
  'Parking',
  'Gym',
  'Kitchen Access',
  'TV',
  'Fridge',
  'Sufficient Sockets',
  'Washing Machine',
  'Balcony',
  'New Building',
  'Hot Water',
  'Water Purifier',
] as const;
