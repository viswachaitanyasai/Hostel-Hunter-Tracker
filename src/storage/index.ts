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

const EXPORT_VERSION = 1;

export interface ExportData {
  version: number;
  exportedAt: string;
  hostelCount: number;
  hostels: Hostel[];
}

/**
 * Exports hostels as a JSON blob for download.
 * Optionally pass specific hostels to export; otherwise exports all.
 */
export function exportHostels(hostels: Hostel[]): Blob {
  const data: ExportData = {
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    hostelCount: hostels.length,
    hostels,
  };
  return new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
}

/**
 * Triggers a browser file download for a Blob.
 */
export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an export file and returns the hostels if valid.
 * Throws on invalid format.
 */
export function parseImportFile(text: string): { hostels: Hostel[] } {
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Invalid file format. Please select a valid hostel export file.');
  }

  if (!data || data.version !== EXPORT_VERSION || !Array.isArray(data.hostels)) {
    throw new Error('Invalid hostel data format. The file may be corrupted.');
  }

  return { hostels: data.hostels as Hostel[] };
}

/**
 * Imports hostels from parsed export data into storage.
 * Generates new IDs and timestamps so they don't overwrite existing data.
 */
export async function importHostels(hostels: Hostel[]): Promise<number> {
  let count = 0;
  for (const h of hostels) {
    const now = new Date().toISOString();
    const hostel: Hostel = {
      ...h,
      id: uuid(),
      createdAt: now,
      updatedAt: now,
    };
    await saveHostel(hostel);
    count++;
  }
  return count;
}
