import type { Hostel } from '../types';

const DB_NAME = 'hostel-finder';
const DB_VERSION = 1;
const STORE_NAME = 'hostels';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

export async function getAllHostels(): Promise<Hostel[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      let hostels = request.result as Hostel[];
      hostels = hostels.map(migrateHostel);
      resolve(hostels.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };
    tx.oncomplete = () => db.close();
  });
}

function migrateHostel(h: Hostel): Hostel {
  const hostel = { ...h } as any;
  if (hostel.rent !== undefined && (!hostel.rents || hostel.rents.length === 0)) {
    hostel.rents = [{ shares: 1, rent: hostel.rent }];
    delete hostel.rent;
  }
  if (!hostel.rents || hostel.rents.length === 0) {
    hostel.rents = [{ shares: 1, rent: 0 }];
  }
  if (hostel.securityFee === undefined) hostel.securityFee = 0;
  if (hostel.otherFines === undefined) hostel.otherFines = '';
  if (hostel.type === undefined) hostel.type = 'coliving';
  if (hostel.lockInPeriod === undefined) hostel.lockInPeriod = 0;
  if (hostel.noticePeriod === undefined) hostel.noticePeriod = 0;

  // Migrate: old general rating → new specific ratings
  if (hostel.roomRating === undefined) hostel.roomRating = hostel.rating || 0;
  if (hostel.peopleRating === undefined) hostel.peopleRating = hostel.rating || 0;
  if (hostel.googleMapsRating === undefined) hostel.googleMapsRating = 0;
  if (hostel.ownerRating === undefined) hostel.ownerRating = hostel.rating ? Math.min(3, Math.round(hostel.rating * 3 / 5)) : 0;
  // Keep old rating for backward compatibility
  if (hostel.rating === undefined) hostel.rating = 0;

  // Migrate: old dedicated boolean check fields → amenities array
  if (!hostel.amenities) hostel.amenities = [];
  if (hostel.sufficientSockets === true && !hostel.amenities.includes('Sufficient Sockets')) {
    hostel.amenities.push('Sufficient Sockets');
  }
  if (hostel.hasWashingMachine === true && !hostel.amenities.includes('Washing Machine')) {
    hostel.amenities.push('Washing Machine');
  }
  if (hostel.hasBalcony === true && !hostel.amenities.includes('Balcony')) {
    hostel.amenities.push('Balcony');
  }
  // Clean up old boolean fields if they exist
  delete hostel.sufficientSockets;
  delete hostel.hasWashingMachine;
  delete hostel.washingMachineCount;
  delete hostel.hasBalcony;

  // Migration: handle legacy hasAC field (now just part of amenities)
  if (hostel.hasAC === true && !hostel.amenities.includes('AC')) {
    hostel.amenities.push('AC');
  }
  // Migrate: remove 'Electricity Included' from amenities (now handled as dedicated fields)
  hostel.amenities = hostel.amenities.filter((a: string) => a !== 'Electricity Included');
  // Migrate food/electricity from per-rent level (old schema) to hostel level
  if (hostel.foodIncluded === undefined) {
    // Check if any rent row has food data (legacy per-rent schema)
    const firstRent = hostel.rents?.[0];
    if (firstRent && firstRent.foodIncluded !== undefined) {
      hostel.foodIncluded = firstRent.foodIncluded;
      hostel.foodCharges = firstRent.foodCharges ?? 0;
      hostel.electricityType = firstRent.electricityType ?? 'included';
      hostel.electricityAmount = firstRent.electricityAmount ?? 0;
    } else {
      hostel.foodIncluded = true;
      hostel.foodCharges = 0;
      hostel.electricityType = 'included';
      hostel.electricityAmount = 0;
    }
    // Strip legacy per-rent food/electricity fields
    if (hostel.rents) {
      hostel.rents = hostel.rents.map((r: any) => {
        const { foodIncluded, foodCharges, electricityType, electricityAmount, ...rest } = r;
        return rest;
      });
    }
  }
  delete hostel.hasAC;
  return hostel as Hostel;
}

export async function getHostel(id: string): Promise<Hostel | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const result = request.result as Hostel | null;
      resolve(result ? migrateHostel(result) : null);
    };
    tx.oncomplete = () => db.close();
  });
}

export async function saveHostel(hostel: Hostel): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(hostel);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}

export async function deleteHostel(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
    tx.oncomplete = () => db.close();
  });
}
