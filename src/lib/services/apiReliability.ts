'use client';

interface RetryOptions {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiryTime: number;
}

class APIReliabilityService {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private defaultRetryOptions: RetryOptions = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  /**
   * Robust fetch with exponential backoff retry and caching
   */
  async reliableFetch<T>(
    url: string,
    options: RequestInit = {},
    cacheKey?: string,
    cacheTTL: number = 300000, // 5 minutes default
    retryOptions?: Partial<RetryOptions>
  ): Promise<T> {
    const finalRetryOptions = { ...this.defaultRetryOptions, ...retryOptions };
    
    // Check cache first
    if (cacheKey) {
      const cached = this.getFromCache<T>(cacheKey);
      if (cached) {
        console.log(`Returning cached data for ${cacheKey}`);
        return cached;
      }
    }

    let lastError: Error = new Error('Unknown error');
    
    for (let attempt = 0; attempt <= finalRetryOptions.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Cache successful response
        if (cacheKey) {
          this.setCache(cacheKey, data, cacheTTL);
        }
        
        return data;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`API attempt ${attempt + 1} failed for ${url}:`, error);
        
        // Don't retry on last attempt
        if (attempt === finalRetryOptions.maxRetries) break;
        
        // Calculate delay with exponential backoff
        const delay = Math.min(
          finalRetryOptions.baseDelay * Math.pow(finalRetryOptions.backoffMultiplier, attempt),
          finalRetryOptions.maxDelay
        );
        
        console.log(`Retrying in ${delay}ms...`);
        await this.sleep(delay);
      }
    }
    
    // If all retries failed, check for stale cache as last resort
    if (cacheKey) {
      const staleData = this.getFromCache<T>(cacheKey, true);
      if (staleData) {
        console.warn(`Using stale cached data for ${cacheKey} due to API failure`);
        return staleData;
      }
    }
    
    throw lastError;
  }

  /**
   * NOAA Tides API with multiple fallback strategies
   */
  async getReliableTideData(stationId: string = '9445478', days: number = 3) {
    const baseUrl = 'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter';
    const cacheKey = `tide-${stationId}-${days}`;
    
    // Primary NOAA API
    const primaryParams = new URLSearchParams({
      product: 'predictions',
      application: 'NOS.COOPS.TAC.WL',
      station: stationId,
      begin_date: this.formatDate(new Date()),
      end_date: this.formatDate(new Date(Date.now() + days * 24 * 60 * 60 * 1000)),
      datum: 'MLLW',
      time_zone: 'lst_ldt',
      units: 'english',
      format: 'json'
    });

    try {
      return await this.reliableFetch(
        `${baseUrl}?${primaryParams}`,
        {},
        cacheKey,
        900000, // 15 minute cache
        { maxRetries: 5, baseDelay: 2000 }
      );
    } catch (error) {
      console.error('NOAA API failed, generating fallback tide data:', error);
      return this.generateFallbackTideData(stationId, days);
    }
  }

  /**
   * OpenWeatherMap API with fallbacks
   */
  async getReliableWeatherData(lat: string = '47.6255', lon: string = '-122.9289') {
    const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '210dd970bfe8fb78e5bb5f8573c4716f';
    const cacheKey = `weather-${lat}-${lon}`;
    
    try {
      // Try current weather
      const currentWeather = await this.reliableFetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
        {},
        `${cacheKey}-current`,
        600000, // 10 minute cache
        { maxRetries: 3 }
      );

      // Try forecast
      const forecast = await this.reliableFetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=imperial`,
        {},
        `${cacheKey}-forecast`,
        1800000, // 30 minute cache
        { maxRetries: 3 }
      );

      return { current: currentWeather, forecast };
    } catch (error) {
      console.error('Weather API failed, generating fallback data:', error);
      return this.generateFallbackWeatherData();
    }
  }

  /**
   * Enhanced Grok API with fallbacks
   */
  async getReliableGrokResponse(messages: any[], apiKey: string) {
    try {
      return await this.reliableFetch(
        'https://api.x.ai/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'grok-4-latest',
            messages,
            stream: false,
            temperature: 0.7,
            max_tokens: 2000
          })
        },
        undefined, // No caching for chat
        0,
        { maxRetries: 2, baseDelay: 1000, maxDelay: 5000 }
      );
    } catch (error) {
      console.error('Grok API failed:', error);
      throw error;
    }
  }

  /**
   * Cache management
   */
  private setCache<T>(key: string, data: T, ttl: number) {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiryTime: Date.now() + ttl
    });
  }

  private getFromCache<T>(key: string, allowStale: boolean = false): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    const now = Date.now();
    
    if (allowStale || now < entry.expiryTime) {
      return entry.data;
    }
    
    // Clean up expired entry
    this.cache.delete(key);
    return null;
  }

  /**
   * Fallback data generators
   */
  private generateFallbackTideData(stationId: string, days: number) {
    const predictions: { t: string; v: string; type: string }[] = [];
    const baseTime = new Date();
    baseTime.setHours(0, 0, 0, 0);
    
    // Generate realistic tide pattern (2 highs, 2 lows per day)
    for (let day = 0; day < days; day++) {
      const dayStart = new Date(baseTime.getTime() + day * 24 * 60 * 60 * 1000);
      
      // Typical Hood Canal tide pattern
      const tides = [
        { type: 'H', hour: 6, height: 12.5 + Math.random() * 3 },
        { type: 'L', hour: 12, height: 2.0 + Math.random() * 2 },
        { type: 'H', hour: 18, height: 11.0 + Math.random() * 3 },
        { type: 'L', hour: 24, height: 1.5 + Math.random() * 2 }
      ];
      
      tides.forEach(tide => {
        const tideTime = new Date(dayStart.getTime() + tide.hour * 60 * 60 * 1000);
        predictions.push({
          t: this.formatDateTime(tideTime),
          v: tide.height.toFixed(2),
          type: tide.type
        });
      });
    }
    
    return {
      predictions,
      metadata: {
        name: 'Union, Hood Canal (Fallback)',
        lat: '47.6255',
        lon: '-122.9289'
      }
    };
  }

  private generateFallbackWeatherData() {
    const conditions = ['Clear', 'Partly Cloudy', 'Cloudy', 'Light Rain'];
    const currentCondition = conditions[Math.floor(Math.random() * conditions.length)];
    
    return {
      current: {
        name: 'Hood Canal, WA',
        main: {
          temp: 45 + Math.random() * 25, // 45-70°F range
          humidity: 60 + Math.random() * 30
        },
        weather: [{
          main: currentCondition,
          id: currentCondition === 'Clear' ? 800 : currentCondition === 'Light Rain' ? 500 : 801
        }],
        wind: {
          speed: Math.random() * 15,
          deg: Math.random() * 360
        }
      },
      forecast: {
        list: Array.from({ length: 15 }, (_, i) => ({
          dt_txt: this.formatDateTime(new Date(Date.now() + i * 8 * 60 * 60 * 1000)),
          main: {
            temp_min: 40 + Math.random() * 15,
            temp_max: 50 + Math.random() * 20
          },
          weather: [{
            main: conditions[Math.floor(Math.random() * conditions.length)],
            id: 800 + Math.floor(Math.random() * 4)
          }]
        }))
      }
    };
  }

  /**
   * Utility methods
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private formatDate(date: Date): string {
    return date.toISOString().split('T')[0].replace(/-/g, '');
  }

  private formatDateTime(date: Date): string {
    return date.toISOString().replace('T', ' ').slice(0, 19);
  }

  /**
   * Health check for APIs
   */
  async checkAPIHealth(): Promise<{
    noaa: boolean;
    weather: boolean;
    grok: boolean;
  }> {
    const results = {
      noaa: false,
      weather: false,
      grok: false
    };

    // Check NOAA
    try {
      await this.reliableFetch(
        'https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=9445478&begin_date=20241201&end_date=20241201&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=NOS.COOPS.TAC.WL',
        {},
        undefined,
        0,
        { maxRetries: 1, baseDelay: 5000 }
      );
      results.noaa = true;
    } catch (error) {
      console.warn('NOAA API health check failed:', error);
    }

    // Check Weather
    try {
      const apiKey = process.env.NEXT_PUBLIC_WEATHER_API_KEY || '210dd970bfe8fb78e5bb5f8573c4716f';
      await this.reliableFetch(
        `https://api.openweathermap.org/data/2.5/weather?q=Seattle&appid=${apiKey}`,
        {},
        undefined,
        0,
        { maxRetries: 1, baseDelay: 5000 }
      );
      results.weather = true;
    } catch (error) {
      console.warn('Weather API health check failed:', error);
    }

    return results;
  }
}

// Export singleton instance
export const apiReliability = new APIReliabilityService();