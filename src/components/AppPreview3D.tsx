import { useState } from 'react';
import { ChevronLeft, ChevronRight, Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import dashboardImg from '@/assets/screenshots/dashboard.png';
import aiChatImg from '@/assets/screenshots/ai-chat.png';
import readinessImg from '@/assets/screenshots/readiness.png';
import plannerWeeklyImg from '@/assets/screenshots/planner-weekly.png';
import plannerDayImg from '@/assets/screenshots/planner-day.png';
import mockSelectionImg from '@/assets/screenshots/mock-selection.png';
import mockExamImg from '@/assets/screenshots/mock-exam.png';
import examCompleteImg from '@/assets/screenshots/exam-complete.png';
import aiChatLightImg from '@/assets/screenshots/ai-chat-light.png';
import readinessEditLightImg from '@/assets/screenshots/readiness-edit-light.png';
import resourcesLightImg from '@/assets/screenshots/resources-light.png';
import resourcesListLightImg from '@/assets/screenshots/resources-list-light.png';
import plannerModalLightImg from '@/assets/screenshots/planner-modal-light.png';

interface AppPreview3DProps {
  screenshots?: string[];
}

export function AppPreview3D({ screenshots = [] }: AppPreview3DProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Use provided screenshots or default app screenshots
  const images = screenshots.length > 0 ? screenshots : [
    dashboardImg,
    readinessImg,
    aiChatImg,
    mockSelectionImg,
    mockExamImg,
    examCompleteImg,
    plannerWeeklyImg,
    plannerDayImg,
    aiChatLightImg,
    readinessEditLightImg,
    resourcesLightImg,
    resourcesListLightImg,
    plannerModalLightImg,
  ];

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const getCardStyle = (index: number) => {
    const diff = index - currentIndex;
    const absIndex = ((index - currentIndex + images.length) % images.length);
    
    if (absIndex === 0) {
      // Center card
      return {
        transform: 'translateX(0%) translateZ(0px) rotateY(0deg) scale(1)',
        opacity: 1,
        zIndex: 30,
      };
    } else if (absIndex === 1 || absIndex === images.length - 1) {
      // Adjacent cards
      const direction = absIndex === 1 ? 1 : -1;
      return {
        transform: `translateX(${direction * 35}%) translateZ(-200px) rotateY(${-direction * 25}deg) scale(0.85)`,
        opacity: 0.7,
        zIndex: 20,
      };
    } else if (absIndex === 2 || absIndex === images.length - 2) {
      // Far cards
      const direction = absIndex === 2 ? 1 : -1;
      return {
        transform: `translateX(${direction * 60}%) translateZ(-350px) rotateY(${-direction * 35}deg) scale(0.7)`,
        opacity: 0.4,
        zIndex: 10,
      };
    } else {
      // Hidden cards
      return {
        transform: 'translateX(0%) translateZ(-500px) scale(0.5)',
        opacity: 0,
        zIndex: 0,
      };
    }
  };

  return (
    <section className="light py-8 sm:py-16 md:py-24 relative overflow-hidden bg-gradient-to-b from-gray-50 via-gray-50/95 to-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(59,130,246,0.1)_0%,transparent_70%)]" />
      
      <div className="container mx-auto px-3 sm:px-4 relative z-10">
        <div className="text-center mb-8 sm:mb-12 md:mb-16">
          <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-2 sm:mb-3 md:mb-4 text-gray-900">
            See Gradlify in Action
          </h2>
          <p className="text-sm sm:text-base md:text-lg text-gray-600 max-w-2xl mx-auto px-4">
            Explore our powerful features designed to help you master your GCSE Maths
          </p>
        </div>

        {/* 3D Carousel */}
        <div className="relative h-[300px] sm:h-[400px] md:h-[500px] lg:h-[600px] flex items-center justify-center">
          <div 
            className="relative w-full h-full flex items-center justify-center"
            style={{ perspective: '2000px' }}
          >
            {images.map((image, index) => (
              <div
                key={index}
                className="absolute w-[280px] h-[180px] sm:w-[450px] sm:h-[290px] md:w-[600px] md:h-[380px] lg:w-[700px] lg:h-[450px] transition-all duration-700 ease-out cursor-pointer"
                style={getCardStyle(index)}
                onClick={() => setCurrentIndex(index)}
              >
                <div className="w-full h-full rounded-lg sm:rounded-xl overflow-hidden shadow-2xl bg-white border border-gray-200/50 backdrop-blur-sm">
                  <img
                    src={image}
                    alt={`App screenshot ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Navigation Controls */}
          <div className="absolute bottom-4 sm:bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 sm:gap-4 z-40">
            <Button
              variant="outline"
              size="icon"
              onClick={handlePrevious}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white border-gray-300"
            >
              <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
            
            <div className="flex gap-1.5 sm:gap-2">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-1.5 sm:h-2 rounded-full transition-all ${
                    index === currentIndex
                      ? 'w-6 sm:w-8 bg-blue-600'
                      : 'w-1.5 sm:w-2 bg-gray-400/30 hover:bg-gray-400/50'
                  }`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={handleNext}
              className="h-8 w-8 sm:h-10 sm:w-10 rounded-full bg-white/80 backdrop-blur-sm hover:bg-white border-gray-300"
            >
              <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" />
            </Button>
          </div>
        </div>

        <div className="text-center mt-6 sm:mt-8 md:mt-12 space-y-2 sm:space-y-3 px-4">
          <p className="text-xs sm:text-sm text-gray-600">
            Click any screenshot to view it • Use arrows to navigate
          </p>
          <div className="flex items-center justify-center gap-2 text-xs sm:text-sm text-gray-600">
            <Sun className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">Switch between night and day modes seamlessly</span>
            <span className="sm:hidden">Night & day modes</span>
            <Moon className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
        </div>
      </div>
    </section>
  );
}
