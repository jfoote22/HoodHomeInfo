// Durable store for the document Hermes pushes to POST /api/hermes/events.
//
// On Vercel the filesystem is read-only and every deployment is immutable, so the pushed
// document lives in Vercel Blob (created once in the project's Storage tab; that injects
// BLOB_READ_WRITE_TOKEN). When no Blob token is present (local dev) we fall back to a file
// under data/ so the whole flow still works on a laptop.

import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';

export type HermesKind = 'json' | 'html';

export interface HermesDocument {
  kind: HermesKind;
  body: string;
  uploadedAt: string; // ISO
  bytes: number;
  source: 'blob' | 'file';
}

const BLOB_PREFIX = 'hermes/';
const BLOB_PATH: Record<HermesKind, string> = { json: `${BLOB_PREFIX}events.json`, html: `${BLOB_PREFIX}events.html` };
const LOCAL_DIR = path.join(process.cwd(), 'data');
const LOCAL_PATH: Record<HermesKind, string> = {
  json: path.join(LOCAL_DIR, 'hermes-events.json'),
  html: path.join(LOCAL_DIR, 'hermes-events.html'),
};
const LOCAL_META = path.join(LOCAL_DIR, 'hermes-events.meta.json');

export function blobConfigured(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

export async function saveHermesDocument(kind: HermesKind, body: string): Promise<{ storage: 'blob' | 'file'; url: string | null }> {
  if (blobConfigured()) {
    const { put, del, list } = await import('@vercel/blob');
    const res = await put(BLOB_PATH[kind], body, {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: kind === 'json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      cacheControlMaxAge: 60,
    });
    // Keep only the newest kind so the reader never picks up a stale sibling.
    const other = kind === 'json' ? 'html' : 'json';
    try {
      const existing = await list({ prefix: BLOB_PATH[other], limit: 5 });
      await Promise.all(existing.blobs.map((b) => del(b.url)));
    } catch {
      /* best effort */
    }
    return { storage: 'blob', url: res.url };
  }
  await mkdir(LOCAL_DIR, { recursive: true });
  await writeFile(LOCAL_PATH[kind], body, 'utf-8');
  await writeFile(LOCAL_META, JSON.stringify({ kind, uploadedAt: new Date().toISOString(), bytes: Buffer.byteLength(body) }), 'utf-8');
  return { storage: 'file', url: null };
}

export async function loadHermesDocument(): Promise<HermesDocument | null> {
  if (blobConfigured()) {
    const { list } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 10 });
    if (!blobs.length) return null;
    const newest = [...blobs].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    const res = await fetch(`${newest.url}${newest.url.includes('?') ? '&' : '?'}t=${Date.now()}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Blob fetch HTTP ${res.status}`);
    const body = await res.text();
    return {
      kind: newest.pathname.endsWith('.html') ? 'html' : 'json',
      body,
      uploadedAt: new Date(newest.uploadedAt).toISOString(),
      bytes: newest.size,
      source: 'blob',
    };
  }
  // Local fallback: whichever file is newer per the meta record (default json).
  let kind: HermesKind = 'json';
  let uploadedAt = '';
  try {
    const meta = JSON.parse(await readFile(LOCAL_META, 'utf-8'));
    if (meta.kind === 'html' || meta.kind === 'json') kind = meta.kind;
    uploadedAt = meta.uploadedAt || '';
  } catch {
    /* no meta yet */
  }
  try {
    const body = await readFile(LOCAL_PATH[kind], 'utf-8');
    return { kind, body, uploadedAt, bytes: Buffer.byteLength(body), source: 'file' };
  } catch {
    return null;
  }
}
