export interface HostelRent {
  shares: number;
  rent: number;
}

export interface Hostel {
  id: string;
  name: string;
  rents: HostelRent[];
  securityFee: number;
  otherFines: string;
  rating: number;
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
  rents: HostelRent[];
  securityFee: string;
  otherFines: string;
  rating: number;
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
  'Electricity Included',
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
