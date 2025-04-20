import Hero from '../components/Hero';
import WeatherCard from '../components/WeatherCard';
import TideChart from '../components/TideChart';
import SkyView from '../components/SkyView';
import EventList from '../components/EventList';
import HomeChatBot from '../components/HomeChatBot';
import LunarPhase from '../components/LunarPhase';

export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 overflow-x-hidden">
      {/* Hero and Weather Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mx-2 mb-8 items-start pt-4">
        <div className="flex flex-col justify-start h-full">
          <Hero />
        </div>
        <div className="flex items-center justify-center h-full pt-2">
          <div className="w-full">
            <WeatherCard />
          </div>
        </div>
      </div>
      
      {/* Information and Events Section */}
      <div className="max-w-[98%] mx-auto px-2 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/90 backdrop-blur-sm rounded-xl shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-indigo-900 mb-4">Need More Information?</h2>
            <HomeChatBot />
          </div>
          
          <div>
            <EventList />
          </div>
        </div>
      </div>
      
      {/* Full-width Tide Chart */}
      <div className="w-full mb-6">
        <TideChart />
      </div>
      
      {/* Lunar and Sky Section */}
      <div className="max-w-[98%] mx-auto px-2 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <LunarPhase />
          </div>
          <div>
            <SkyView />
          </div>
        </div>
      </div>
    </main>
  );
}
