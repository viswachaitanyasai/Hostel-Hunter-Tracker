export type ElectricityType = 'included' | 'fixed' | 'per_unit';

export type HostelType = 'boys' | 'coliving';

export interface HostelRent {
  shares: number;
  rent: number;
}

export interface Hostel {
  id: string;
  name: string;
  type: HostelType;
  rents: HostelRent[];
  securityFee: number;
  otherFines: string;
  rating: number;
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
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HostelFormData {
  name: string;
  type: HostelType;
  rents: HostelRent[];
  securityFee: string;
  otherFines: string;
  rating: number;
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

export const AMENITIES_LIST = [
  'Food',
  'Wi-Fi',
  'AC',
  'Laundry',
  'Power Backup',
  'Parking',
  'Gym',
  'Kitchen Access',
  'TV',
  'Fridge',
] as const;
