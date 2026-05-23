import type { Hostel } from '../types';
import { v4 as uuid } from 'uuid';
import { getAllHostels, getHostel, saveHostel, deleteHostel } from './indexeddb';

export async function listHostels(): Promise<Hostel[]> {
  return getAllHostels();
}

export async function getHostelById(id: string): Promise<Hostel | null> {
  return getHostel(id);
}

export async function createHostel(data: Omit<Hostel, 'id' | 'createdAt' | 'updatedAt'>): Promise<Hostel> {
  const now = new Date().toISOString();
  const hostel: Hostel = {
    ...data,
    id: uuid(),
    createdAt: now,
    updatedAt: now,
  };
  await saveHostel(hostel);
  return hostel;
}

export async function updateHostel(id: string, data: Partial<Omit<Hostel, 'id' | 'createdAt'>>): Promise<Hostel | null> {
  const existing = await getHostel(id);
  if (!existing) return null;
  const updated: Hostel = {
    ...existing,
    ...data,
    id,
    createdAt: existing.createdAt,
    updatedAt: new Date().toISOString(),
  };
  await saveHostel(updated);
  return updated;
}

export async function removeHostel(id: string): Promise<void> {
  await deleteHostel(id);
}

/**
 * Converts a File or Blob to a base64 data URL.
 * Used for storing photos directly in IndexedDB.
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
