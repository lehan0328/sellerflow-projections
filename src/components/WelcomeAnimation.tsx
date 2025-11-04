import { useEffect, useState } from "react";
import aurenIcon from "@/assets/auren-icon-blue.png";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [stage, setStage] = useState<'spotlight' | 'message' | 'fadeout'>('spotlight');

  useEffect(() => {
    // Stage 1: Spotlight and logo (1s)
    const spotlightTimer = setTimeout(() => {
      setStage('message');
    }, 1000);

    // Stage 2: Show message (1.5s)
    const messageTimer = setTimeout(() => {
      setStage('fadeout');
    }, 2500);

    // Stage 3: Fade out and complete (1s)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 3500);

    return () => {
      clearTimeout(spotlightTimer);
      clearTimeout(messageTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-[9999] flex items-center justify-center bg-background transition-opacity duration-2000 ${
        stage === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Watermark background - visible during fadeout to match dashboard */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div 
          className={`absolute inset-0 flex items-center justify-center transition-opacity duration-2000 ${
            stage === 'fadeout' ? 'opacity-[0.03]' : 'opacity-0'
          }`}
        >
          <img 
            src="/auren-icon-blue.png" 
            alt="" 
            className="w-[600px] h-auto"
          />
        </div>
      </div>

      {/* Animated spotlight effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className={`absolute inset-0 transition-all duration-1000 ease-out ${
            stage === 'spotlight' 
              ? 'bg-gradient-radial from-primary/20 via-primary/5 to-transparent scale-50 opacity-0' 
              : 'bg-gradient-radial from-primary/20 via-primary/5 to-transparent scale-150 opacity-100'
          }`}
          style={{
            backgroundImage: 'radial-gradient(circle at center, hsl(var(--primary) / 0.2) 0%, hsl(var(--primary) / 0.05) 40%, transparent 70%)',
          }}
        />
        
        {/* Spotlight beam */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full transition-all duration-1000 ease-out ${
            stage === 'spotlight' ? 'opacity-0 scale-y-0' : 'opacity-30 scale-y-100'
          }`}
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary) / 0.3) 0%, transparent 60%)',
            filter: 'blur(40px)',
            transformOrigin: 'top'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-6 px-4 max-w-2xl">
        {/* Logo with animation */}
        <div 
          className={`transition-all duration-700 ease-out ${
            stage === 'spotlight' 
              ? 'opacity-0 scale-50' 
              : stage === 'message'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75'
          }`}
        >
          <div className="relative">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <img 
              src={aurenIcon} 
              alt="Auren" 
              className="relative h-24 w-auto drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Welcome message */}
        <div 
          className={`text-center space-y-3 transition-all duration-700 delay-300 ease-out ${
            stage === 'message' 
              ? 'opacity-100 translate-y-0' 
              : stage === 'fadeout'
              ? 'opacity-0 -translate-y-4'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            Get Ready
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground font-medium px-4">
            Your cashflow management is about to change forever
          </p>
        </div>

        {/* Animated particles - reduced count for performance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(12)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-1.5 h-1.5 bg-primary/30 rounded-full transition-opacity duration-1000 ${
                stage !== 'spotlight' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${2 + Math.random() * 2}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 1.5}s`,
              }}
            />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% {
            transform: translateY(0) translateX(0);
          }
          50% {
            transform: translateY(-30px) translateX(10px);
          }
        }

        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }

        .animate-gradient {
          background-size: 200% auto;
          animation: gradient 2s ease infinite;
        }
      `}</style>
    </div>
  );
};
