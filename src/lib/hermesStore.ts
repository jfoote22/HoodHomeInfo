// Durable store for the document Hermes pushes to POST /api/hermes/events.
//
// On Vercel the filesystem is read-only and every deployment is immutable, so the pushed
// document lives in Vercel Blob (created once in the project's Storage tab; that injects
// BLOB_READ_WRITE_TOKEN). The store is PRIVATE: blobs are written and read through the SDK
// with the token (never via a public URL). When no Blob token is present (local dev) we
// fall back to files under data/ so the whole flow still works on a laptop.

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

// Match the store's access mode. Private is the default (and what the owner's store uses);
// set HERMES_BLOB_ACCESS=public only if the store was created as a public one.
const BLOB_ACCESS: 'private' | 'public' = process.env.HERMES_BLOB_ACCESS === 'public' ? 'public' : 'private';

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

export function blobAccessMode(): 'private' | 'public' {
  return BLOB_ACCESS;
}

export async function saveHermesDocument(kind: HermesKind, body: string): Promise<{ storage: 'blob' | 'file'; url: string | null }> {
  if (blobConfigured()) {
    const { put, del, list } = await import('@vercel/blob');
    const res = await put(BLOB_PATH[kind], body, {
      access: BLOB_ACCESS,
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: kind === 'json' ? 'application/json; charset=utf-8' : 'text/html; charset=utf-8',
      cacheControlMaxAge: 60,
    });
    // Keep only the newest kind so the reader never picks up a stale sibling.
    const other = kind === 'json' ? 'html' : 'json';
    try {
      const existing = await list({ prefix: BLOB_PATH[other], limit: 5 });
      if (existing.blobs.length) await del(existing.blobs.map((b) => b.url));
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

async function streamToString(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }
  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf-8');
}

export async function loadHermesDocument(): Promise<HermesDocument | null> {
  if (blobConfigured()) {
    const { list, get } = await import('@vercel/blob');
    const { blobs } = await list({ prefix: BLOB_PREFIX, limit: 10 });
    if (!blobs.length) return null;
    const newest = [...blobs].sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())[0];
    // Authenticated read (works for private and public stores); bypass CDN cache so a fresh
    // push shows up immediately.
    const result = await get(newest.pathname, { access: BLOB_ACCESS, useCache: false });
    if (!result || result.statusCode !== 200 || !result.stream) throw new Error(`Blob get returned ${result ? result.statusCode : 'null'}`);
    const body = await streamToString(result.stream);
    return {
      kind: newest.pathname.endsWith('.html') ? 'html' : 'json',
      body,
      uploadedAt: new Date(newest.uploadedAt).toISOString(),
      bytes: result.blob.size ?? newest.size,
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
