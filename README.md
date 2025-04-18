# Hood Canal Local Information Hub

A stylish, modern personal website that serves as a central hub for local area information around Hood Canal, Washington. The site provides real-time data about weather, tides, celestial events, and local happenings.

![Hood Canal Information Hub](https://source.unsplash.com/random/1200x600/?hood,canal,washington)

## ✅ Features

### Weather Module
- Current conditions (temperature, humidity, wind)
- 7-day forecast with visual indicators
- Uses OpenWeatherMap API for real weather data
- Responsive design for all devices

### Tide & Ocean Data
- High/low tide information with times and heights
- Visual tide chart showing the day's tidal patterns
- Powered by NOAA CO-OPS API with real-time tide predictions
- Moon phase information (phase, illumination percentage, age)

### Celestial Information
- Daily astronomy picture with detailed explanation
- Planet visibility information (which planets are visible, when and where)
- Information about upcoming celestial events

### Local Events
- Curated list of events in the Hood Canal area
- Filter by category (Music, Arts, Sports, Food, Community)
- Details on date, time, location, and description

### AI Assistant
- Interactive chat with Claude 3.5 Sonnet
- Ask questions about local information, get recommendations
- Natural language understanding of complex queries about the area

## 🚀 Getting Started

1. Clone this repository
2. Install dependencies
   ```
   npm install
   ```
3. Create a `.env.local` file with your API keys
   ```
   cp .env.local.example .env.local
   ```
4. Add your API keys to the `.env.local` file
5. Start the development server
   ```
   npm run dev
   ```
6. Open [http://localhost:3000](http://localhost:3000) in your browser

## 🔑 Environment Variables

- `ANTHROPIC_API_KEY`: Required for the AI assistant (Claude)
- `NEXT_PUBLIC_WEATHER_API_KEY`: OpenWeatherMap API key (already configured with a valid key)
- `NEXT_PUBLIC_NOAA_STATION_ID`: NOAA station ID for tide data (default: 9445958 - Port Townsend)
- `NASA_API_KEY`: For astronomy picture of the day
- `EVENTBRITE_API_KEY`: For real event data
- `NEXT_PUBLIC_LOCATION_LAT`, `NEXT_PUBLIC_LOCATION_LON`, `NEXT_PUBLIC_LOCATION_NAME`: Location coordinates for the area

Note: The app will work with simulated data for features where API keys are not provided.

## 🧰 Technologies Used

- **Frontend**: Next.js 14, React, Tailwind CSS
- **Weather Data**: OpenWeatherMap API
- **Tide Data**: NOAA CO-OPS API (free and reliable)
- **AI**: Claude 3.5 Sonnet via Anthropic API
- **Data Visualization**: Custom SVG charts
- **Image Optimization**: Next.js Image component
- **Icons**: Lucide React
- **Responsive Design**: Mobile-first approach with Tailwind

## 🛠️ Production Setup

For a production deployment, you'll want to:

1. Obtain API keys for all services
2. Deploy to Vercel or similar platform that supports Next.js
3. Set up environment variables in your hosting platform
4. Configure a domain name and SSL

## 🧩 Future Enhancements

- Real-time weather radar integration
- Historical tide and weather data
- User accounts to save preferences
- Push notifications for extreme weather or interesting celestial events
- Voice control and accessibility improvements