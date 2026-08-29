import { NextResponse } from 'next/server';
import { dayKey, hourLabel, DASHBOARD_TZ } from '../../../../lib/time';
import { parseHermesWeather, weatherTextToIcon, type HermesWeather } from '../../../../lib/hermesParse';
import { loadHermesDocument } from '../../../../lib/hermesStore';

const HERMES_EVENTS_URL = (process.env.HERMES_EVENTS_URL || '').trim();

/**
 * Hermes (the local agent) publishes a "Union Wa Weather" section on its page - current
 * conditions and a 3-day forecast straight from the National Weather Service for Union.
 * That is a better local reading than OpenWeatherMap's grid cell, so it wins when present.
 */
async function loadHermesWeather(): Promise<HermesWeather | null> {
  const parse = (html: string) => {
    const w = parseHermesWeather(html);
    return w.now || w.days.length ? w : null;
  };
  try {
    const doc = await loadHermesDocument();
    if (doc) {
      if (doc.kind === 'html') {
        const w = parse(doc.body);
        if (w) return w;
      } else {
        try {
          const parsed = JSON.parse(doc.body);
          if (typeof parsed.html === 'string') {
            const w = parse(parsed.html);
            if (w) return w;
          }
        } catch {
          /* not JSON we understand */
        }
      }
    }
  } catch (err) {
    console.warn('weather: hermes document unreadable', err);
  }
  if (HERMES_EVENTS_URL) {
    try {
      const controller = new AbortController();
      const t = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(HERMES_EVENTS_URL, { cache: 'no-store', signal: controller.signal });
      clearTimeout(t);
      if (res.ok) return parse(await res.text());
    } catch {
      /* LAN page not reachable from here - fine */
    }
  }
  return null;
}

async function reliableFetch(url: string, options: RequestInit = {}, maxRetries = 3) {
  let lastError: Error = new Error('Unknown error');
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error) {
      lastError = error as Error;
      console.error(`API attempt ${attempt + 1} failed for ${url}:`, error);
      
      if (attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// Built-in OpenWeatherMap key used when NEXT_PUBLIC_WEATHER_API_KEY is unset - or is still the
// placeholder copied from .env.local.example, which OpenWeather rejects with a 401 and would
// otherwise silently push the panel onto fallback data.
const BUILT_IN_KEY = '210dd970bfe8fb78e5bb5f8573c4716f';
function weatherApiKey(): string {
  const k = (process.env.NEXT_PUBLIC_WEATHER_API_KEY || '').trim();
  const placeholder = !k || k.length < 20 || /your[_-]|_here$|placeholder|changeme|xxxx/i.test(k);
  return placeholder ? BUILT_IN_KEY : k;
}

function generateFallbackWeatherData() {
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'];
  
  // Use current hour as deterministic seed to avoid hydration issues
  const currentHour = new Date().getHours();
  const conditionIndex = currentHour % conditions.length;
  const currentCondition = conditions[conditionIndex];
  
  // Use deterministic values based on current day
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  const tempVariance = (dayOfYear % 20) - 10; // -10 to +10 degree variance
  
  return {
    current: {
      name: 'Hood Canal, WA',
      main: {
        temp: 55 + tempVariance,
        humidity: 65 + (dayOfYear % 20)
      },
      weather: [{
        main: currentCondition,
        id: currentCondition === 'Clear' ? 800 : currentCondition === 'Light Rain' ? 500 : 801
      }],
      wind: {
        speed: 5 + (dayOfYear % 10),
        deg: (currentHour * 15) % 360
      }
    },
    forecast: {
      list: Array.from({ length: 15 }, (_, i) => ({
        dt: Math.floor((Date.now() + i * 8 * 60 * 60 * 1000) / 1000),
        dt_txt: new Date(Date.now() + i * 8 * 60 * 60 * 1000).toISOString().replace('T', ' ').slice(0, 19),
        main: {
          temp_min: 45 + ((dayOfYear + i) % 15),
          temp_max: 65 + ((dayOfYear + i) % 20)
        },
        weather: [{
          main: conditions[(i + conditionIndex) % conditions.length],
          id: 800 + (i % 4)
        }]
      }))
    }
  };
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const lat = searchParams.get('lat') || process.env.DASHBOARD_LAT || '47.3583';
    const lon = searchParams.get('lon') || process.env.DASHBOARD_LON || '-123.0953';

    console.log(`Fetching reliable weather data for coordinates ${lat}, ${lon}`);
    
    // Hermes runs on the LAN and answers fast; fetch it alongside OpenWeatherMap.
    const hermesPromise = loadHermesWeather();

    let weatherData;
    let usedFallback = false;
    try {
      const apiKey = weatherApiKey();
      
      // Try current weather
      const currentWeather = await reliableFetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
        {}, 3
      );

      // Try forecast
      const forecast = await reliableFetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
        {}, 3
      );

      weatherData = { current: currentWeather, forecast };
    } catch (error) {
      console.error('Weather API failed, generating fallback data:', error);
      weatherData = generateFallbackWeatherData();
      usedFallback = true;
    }
    
    // Transform current weather data
    const current = weatherData.current ? {
      temp: Math.round(weatherData.current.main?.temp || 55),
      condition: describeCondition(weatherData.current.weather?.[0]?.id ?? 800, weatherData.current.weather?.[0]?.main),
      humidity: weatherData.current.main?.humidity || 65,
      windSpeed: Math.round(weatherData.current.wind?.speed || 5),
      windDirection: getWindDirection(weatherData.current.wind?.deg || 0),
      icon: mapWeatherToIcon(weatherData.current.weather?.[0]?.id || 800)
    } : {
      temp: 55,
      condition: 'Clear',
      humidity: 65,
      windSpeed: 5,
      windDirection: 'NW',
      icon: 'sun'
    };

    // Transform forecast data
    const forecast = weatherData.forecast?.list ?
      processForecastData(weatherData.forecast.list) :
      generateDefaultForecast();

    // Near-term hourly strip (OpenWeatherMap's free forecast tier is 3-hour resolution,
    // so these are real forecast points at their actual times, not fabricated hourly data).
    // item.dt is unix UTC; dt_txt is ALSO UTC (not local), so never parse dt_txt naively.
    const hourly = (weatherData.forecast?.list || [])
      .filter((item: any) => (item.dt ? item.dt * 1000 : 0) > Date.now() - 90 * 60 * 1000)
      .slice(0, 4)
      .map((item: any) => {
        const dt = new Date((item.dt || 0) * 1000);
        return {
          label: hourLabel(dt),
          tempF: Math.round(item.main?.temp ?? item.main?.temp_max ?? current.temp),
          icon: mapWeatherToIcon(item.weather?.[0]?.id ?? 800)
        };
      });

    // Overlay the National Weather Service numbers Hermes publishes for Union: they are the
    // local observation, so they win for the headline conditions and the daily highs.
    let hermes: HermesWeather | null = null;
    try {
      hermes = await hermesPromise;
    } catch {
      hermes = null;
    }

    let hourlyOut = hourly;
    let forecastOut = forecast;
    if (hermes?.now) {
      current.temp = hermes.now.tempF;
      current.condition = hermes.now.condition;
      current.icon = weatherTextToIcon(hermes.now.condition);
      if (hermes.now.windMph !== null) current.windSpeed = hermes.now.windMph;
      if (hermes.now.windDir) current.windDirection = hermes.now.windDir;
    }
    if (hermes?.days.length) {
      const shortDay = (d: Date) => d.toLocaleDateString('en-US', { weekday: 'short', timeZone: DASHBOARD_TZ });
      if (usedFallback) {
        // OpenWeatherMap is unavailable: show only what the NWS actually told us rather than
        // OpenWeather's synthetic fill-ins (no invented lows, no invented hourly points).
        forecastOut = hermes.days.map((d) => ({
          day: shortDay(d.date),
          temp: { min: d.hiF, max: d.hiF },
          condition: d.condition,
          icon: weatherTextToIcon(d.condition),
          weatherId: 800
        }));
        hourlyOut = [];
      } else {
        const byDay = new Map(hermes.days.map((d) => [shortDay(d.date), d]));
        forecastOut = forecast.map((f: any) => {
          const h = byDay.get(f.day);
          if (!h) return f;
          return { ...f, temp: { ...f.temp, max: h.hiF }, condition: h.condition, icon: weatherTextToIcon(h.condition) };
        });
      }
    }

    // Synthetic only when neither source could be reached.
    const isReliable = !usedFallback || Boolean(hermes?.now);

    const response = {
      current,
      forecast: forecastOut,
      hourly: hourlyOut,
      location: 'Union, WA',
      // false = the numbers above are synthetic placeholders, not a real observation
      isReliable,
      weatherSource: hermes?.now ? (usedFallback ? 'hermes-nws' : 'hermes-nws+openweather') : usedFallback ? 'fallback' : 'openweather',
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Reliable weather API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to fetch reliable weather data',
        details: error instanceof Error ? error.message : 'Unknown error',
        fallbackAvailable: true
      }, 
      { status: 500 }
    );
  }
}

// Helper functions
function getWindDirection(degrees: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return directions[Math.round(degrees / 45) % 8];
}

function describeCondition(weatherId: number, main?: string): string {
  if (weatherId >= 200 && weatherId < 300) return 'Thunderstorms';
  if (weatherId >= 300 && weatherId < 400) return 'Drizzle';
  if (weatherId >= 500 && weatherId < 600) return weatherId === 500 ? 'Light Rain' : 'Rain';
  if (weatherId >= 600 && weatherId < 700) return 'Snow';
  if (weatherId === 741) return 'Fog';
  if (weatherId >= 700 && weatherId < 800) return 'Hazy';
  if (weatherId === 800) return 'Sunny';
  if (weatherId === 801) return 'Mostly Sunny';
  if (weatherId === 802) return 'Partly Cloudy';
  if (weatherId === 803) return 'Mostly Cloudy';
  if (weatherId === 804) return 'Overcast';
  return main || 'Clear';
}

function mapWeatherToIcon(weatherId: number): string {
  if (weatherId >= 200 && weatherId < 300) return 'cloud-lightning';
  if (weatherId >= 300 && weatherId < 400) return 'cloud-rain';
  if (weatherId >= 500 && weatherId < 600) return 'cloud-rain';
  if (weatherId >= 600 && weatherId < 700) return 'cloud-snow';
  if (weatherId >= 700 && weatherId < 800) return 'cloud-fog';
  if (weatherId === 800 || weatherId === 801) return 'sun';
  if (weatherId > 801) return 'cloud';
  return 'sun';
}

function processForecastData(forecastList: any[]): any[] {
  const dailyData = new Map();
  
  forecastList.forEach(item => {
    const date = new Date((item.dt || 0) * 1000);
    const day = dayKey(date);
    
    if (!dailyData.has(day)) {
      dailyData.set(day, {
        day: date.toLocaleDateString('en-US', { weekday: 'short', timeZone: DASHBOARD_TZ }),
        temp: { min: item.main.temp_min, max: item.main.temp_max },
        condition: item.weather[0].main,
        icon: mapWeatherToIcon(item.weather[0].id),
        weatherId: item.weather[0].id
      });
    } else {
      const existing = dailyData.get(day);
      existing.temp.min = Math.min(existing.temp.min, item.main.temp_min);
      existing.temp.max = Math.max(existing.temp.max, item.main.temp_max);
    }
  });
  
  return Array.from(dailyData.values()).slice(0, 5).map(day => ({
    ...day,
    temp: {
      min: Math.round(day.temp.min),
      max: Math.round(day.temp.max)
    }
  }));
}

function generateDefaultForecast(): any[] {
  const days = ['Today', 'Tomorrow', 'Wed', 'Thu', 'Fri'];
  const conditions = ['Clear', 'Partly Cloudy', 'Cloudy'];
  
  return days.map(day => ({
    day,
    temp: { 
      min: 40 + Math.floor(Math.random() * 15), 
      max: 55 + Math.floor(Math.random() * 20) 
    },
    condition: conditions[Math.floor(Math.random() * conditions.length)],
    icon: 'sun'
  }));
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';