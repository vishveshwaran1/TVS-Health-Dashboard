import { FC, useEffect, useState } from 'react';

const Footer: FC = () => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Show footer when scrolled to bottom
      const scrolledToBottom = 
        window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 10;
      setIsVisible(scrolledToBottom);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <footer className={`
      fixed bottom-0 left-0 right-0
      bg-gradient-to-br from-gray-50 to-gray-100 
      border-t border-gray-200 
      transition-all duration-300 ease-in-out
      transform ${isVisible ? 'translate-y-0' : 'translate-y-full'}
      z-50
    `}>
      <div className="max-w-7xl mx-auto px-2 py-1">
        <div className="grid grid-cols-5 gap-4 items-center justify-items-center">
          <div className="hover:scale-105 transition-transform duration-200">
            <img 
              src="/Delphi_logo.png"
              alt="Delphi TVS Logo"
              className="h-7 w-auto object-contain"
            />
          </div>
          <div className="hover:scale-105 transition-transform duration-200">
            <img 
              src="/sairam logo.png"
              alt="Sairam Logo"
              className="h-14 w-auto object-contain"
            />
          </div>
          <div className="hover:scale-105 transition-transform duration-200">
            <img 
              src="/spark logo.png"
              alt="Spark Logo"
              className="h-9 w-auto object-contain"
            />
          </div>
          <div className="hover:scale-105 transition-transform duration-200">
            <img 
              src="/incubator logo.png"
              alt="Incubator Logo"
              className="h-11 w-auto object-contain"
            />
          </div>

           <div className="hover:scale-105 transition-transform duration-200">
            <img 
              src="/Chairman-Logo.png"
              alt="Chairman Logo"
              className="h-11 w-auto object-contain"
            />
          </div>
        </div>
        
        <div className="mt-1 pt-1 border-t border-gray-200">
          <p className="text-[8px] text-center text-gray-500">
            © {new Date().getFullYear()} TVS Cold Chamber Health Monitoring System
            <span className="mx-1 text-gray-400">|</span>
            <span className="text-blue-600">Team SPARK</span>
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;