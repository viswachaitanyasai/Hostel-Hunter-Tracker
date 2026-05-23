export interface Hostel {
  id: string;
  name: string;
  rent: number;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  hasAC: boolean;
  photos: string[]; // base64 encoded image strings
  contactNumber: string;
  description: string;
  amenities: string[];
  createdAt: string;
  updatedAt: string;
}

export interface HostelFormData {
  name: string;
  rent: string;
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  hasAC: boolean;
  photos: string[];
  contactNumber: string;
  description: string;
  amenities: string[];
}

export const AMENITIES_LIST = [
  'WiFi',
  'Parking',
  'Meals',
  'Laundry',
  'Gym',
  'Study Room',
  'Common Room',
  'Security',
  'Power Backup',
  'Water Supply',
  'Kitchen Access',
  'AC',
  'Heater',
  'TV',
  'Fridge',
] as const;
