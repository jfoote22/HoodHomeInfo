import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';
import type { CheerioAPI } from 'cheerio';

const SIGHTINGS_URL = 'https://www.orcanetwork.org/Main/index.php?categories_file=Sightings';

export async function GET() {
  try {
    const res = await fetch(SIGHTINGS_URL, { cache: 'no-store' });
    const html = await res.text();
    const $: CheerioAPI = cheerio.load(html);

    // The sightings are in a table with class 'sightings-table' or similar
    // We'll look for table rows or list items with date, pod, and location
    // This selector may need to be adjusted if the site structure changes
    const sightings: any[] = [];
    $('table[cellpadding="2"] tr').each((i: number, el: any) => {
      const tds = $(el).find('td');
      if (tds.length >= 3) {
        const date = $(tds[0]).text().trim();
        const location = $(tds[1]).text().trim();
        const details = $(tds[2]).text().trim();
        if (date && location) {
          sightings.push({ date, location, details });
        }
      }
    });

    return NextResponse.json({ sightings });
  } catch (err) {
    return NextResponse.json({ error: 'Failed to fetch or parse sightings', details: String(err) }, { status: 500 });
  }
} 