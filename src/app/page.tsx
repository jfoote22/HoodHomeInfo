import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherCard';
import TideChart from '../components/TideChart';
import SkyView from '../components/SkyView';
import EventList from '../components/EventList';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100">
      <Hero />
      
      <div className="container mx-auto px-4 pb-16">
        <div className="mb-8">
          <WeatherCard />
        </div>
        
        <div className="mb-8">
          <TideChart />
        </div>
        
        <div className="mb-8">
          <SkyView />
        </div>
        
        <div className="mb-8">
          <EventList />
        </div>
      </div>
    </main>
  );
}
