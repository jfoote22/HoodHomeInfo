import { NextResponse } from 'next/server';

async function testAPI(url: string, name: string, timeout: number = 10000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const startTime = Date.now();
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Hood-Canal-Status-Check' }
    });
    
    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;
    
    const isHealthy = response.ok;
    const data = isHealthy ? await response.json() : null;
    
    return {
      name,
      url,
      status: isHealthy ? 'healthy' : 'degraded',
      responseTime: `${responseTime}ms`,
      statusCode: response.status,
      hasData: data ? Object.keys(data).length > 0 : false,
      lastChecked: new Date().toISOString()
    };
  } catch (error) {
    return {
      name,
      url,
      status: 'unhealthy',
      responseTime: 'timeout',
      statusCode: 0,
      hasData: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      lastChecked: new Date().toISOString()
    };
  }
}

export async function GET() {
  try {
    const baseUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:3000' 
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // Test all Hood Canal APIs
    const apiTests = await Promise.all([
      testAPI(`${baseUrl}/api/tides/reliable?days=1`, 'Tides (Reliable)', 15000),
      testAPI(`${baseUrl}/api/weather/reliable`, 'Weather (Reliable)', 15000),
      testAPI(`${baseUrl}/api/events/live`, 'Events', 10000),
      testAPI(`${baseUrl}/api/orca-sightings/live`, 'Orca Sightings', 10000),
    ]);

    // Test external APIs directly (for diagnostic purposes)
    const externalTests = await Promise.all([
      testAPI('https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&station=9445478&begin_date=20241201&end_date=20241201&datum=MLLW&time_zone=lst_ldt&units=english&format=json&application=NOS.COOPS.TAC.WL', 'NOAA Tides Direct', 10000),
      testAPI(`https://api.openweathermap.org/data/2.5/weather?q=Seattle&appid=${process.env.NEXT_PUBLIC_WEATHER_API_KEY || '210dd970bfe8fb78e5bb5f8573c4716f'}`, 'OpenWeather Direct', 10000),
    ]);

    const allTests = [...apiTests, ...externalTests];
    
    // Calculate overall health
    const healthyAPIs = allTests.filter(test => test.status === 'healthy').length;
    const totalAPIs = allTests.length;
    const overallHealth = healthyAPIs === totalAPIs ? 'healthy' : 
                         healthyAPIs >= totalAPIs * 0.75 ? 'degraded' : 'unhealthy';

    // Calculate average response time for healthy APIs
    const healthyResponseTimes = allTests
      .filter(test => test.status === 'healthy' && test.responseTime !== 'timeout')
      .map(test => parseInt(test.responseTime.replace('ms', '')));
    
    const avgResponseTime = healthyResponseTimes.length > 0 
      ? Math.round(healthyResponseTimes.reduce((a, b) => a + b, 0) / healthyResponseTimes.length)
      : 0;

    const statusReport = {
      overall: {
        status: overallHealth,
        uptime: `${healthyAPIs}/${totalAPIs} APIs healthy`,
        averageResponseTime: `${avgResponseTime}ms`,
        lastChecked: new Date().toISOString()
      },
      hoodCanalAPIs: apiTests,
      externalAPIs: externalTests,
      fallbacksActive: apiTests.some(api => 
        api.status === 'healthy' && 
        api.hasData && 
        externalTests.some(ext => ext.name.includes(api.name.split(' ')[0]) && ext.status !== 'healthy')
      ),
      recommendations: [] as string[]
    };

    // Add recommendations based on status
    if (overallHealth === 'unhealthy') {
      statusReport.recommendations.push('Multiple critical APIs are down. Check network connectivity and API keys.');
    }
    
    if (externalTests.some(test => test.status !== 'healthy')) {
      statusReport.recommendations.push('External APIs are experiencing issues. Fallback data is being used.');
    }

    if (avgResponseTime > 5000) {
      statusReport.recommendations.push('API response times are high. Consider implementing additional caching.');
    }

    return NextResponse.json(statusReport, { 
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });
    
  } catch (error) {
    return NextResponse.json(
      { 
        error: 'Failed to check API status',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }, 
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';