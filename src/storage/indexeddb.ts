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
  if (hostel.rating === undefined) hostel.rating = 0;
  // Migration: handle legacy hasAC field (now just part of amenities)
  if (hostel.hasAC === true && (!hostel.amenities || !hostel.amenities.includes('AC'))) {
    if (!hostel.amenities) hostel.amenities = [];
    hostel.amenities.push('AC');
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
