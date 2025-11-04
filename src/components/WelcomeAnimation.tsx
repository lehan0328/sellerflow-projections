import { useEffect, useState } from "react";
import aurenIcon from "@/assets/auren-icon-blue.png";

interface WelcomeAnimationProps {
  onComplete: () => void;
}

export const WelcomeAnimation = ({ onComplete }: WelcomeAnimationProps) => {
  const [stage, setStage] = useState<'spotlight' | 'message' | 'fadeout'>('spotlight');

  useEffect(() => {
    // Stage 1: Spotlight and logo (1.5s)
    const spotlightTimer = setTimeout(() => {
      setStage('message');
    }, 1500);

    // Stage 2: Show message (2.5s)
    const messageTimer = setTimeout(() => {
      setStage('fadeout');
    }, 4000);

    // Stage 3: Fade out and complete (0.8s)
    const completeTimer = setTimeout(() => {
      onComplete();
    }, 4800);

    return () => {
      clearTimeout(spotlightTimer);
      clearTimeout(messageTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-background transition-opacity duration-800 ${
        stage === 'fadeout' ? 'opacity-0' : 'opacity-100'
      }`}
    >
      {/* Animated spotlight effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className={`absolute inset-0 transition-all duration-1500 ${
            stage === 'spotlight' 
              ? 'bg-gradient-radial from-primary/30 via-primary/10 to-transparent scale-0' 
              : 'bg-gradient-radial from-primary/30 via-primary/10 to-transparent scale-150'
          }`}
          style={{
            backgroundImage: 'radial-gradient(circle at center, hsl(var(--primary) / 0.3) 0%, hsl(var(--primary) / 0.1) 40%, transparent 70%)',
          }}
        />
        
        {/* Multiple spotlight beams */}
        <div 
          className={`absolute top-0 left-1/2 -translate-x-1/2 w-96 h-full transition-all duration-1500 ${
            stage === 'spotlight' ? 'opacity-0 scale-y-0' : 'opacity-40 scale-y-100'
          }`}
          style={{
            background: 'linear-gradient(180deg, hsl(var(--primary) / 0.4) 0%, transparent 60%)',
            filter: 'blur(40px)',
            transformOrigin: 'top'
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center gap-8 px-4">
        {/* Logo with animation */}
        <div 
          className={`transition-all duration-1000 ${
            stage === 'spotlight' 
              ? 'opacity-0 scale-50' 
              : stage === 'message'
              ? 'opacity-100 scale-100'
              : 'opacity-0 scale-75'
          }`}
        >
          <div className="relative">
            {/* Glow effect behind logo */}
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full animate-pulse" />
            <img 
              src={aurenIcon} 
              alt="Auren" 
              className="relative h-32 w-auto drop-shadow-2xl"
            />
          </div>
        </div>

        {/* Welcome message */}
        <div 
          className={`text-center space-y-4 max-w-2xl transition-all duration-1000 delay-500 ${
            stage === 'message' 
              ? 'opacity-100 translate-y-0' 
              : stage === 'fadeout'
              ? 'opacity-0 -translate-y-4'
              : 'opacity-0 translate-y-8'
          }`}
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient">
            Get Ready
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground font-medium">
            Your cashflow management is about to change forever
          </p>
        </div>

        {/* Animated particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className={`absolute w-2 h-2 bg-primary/40 rounded-full transition-all duration-2000 ${
                stage !== 'spotlight' ? 'opacity-100' : 'opacity-0'
              }`}
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${3 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 2}s`,
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
          25% {
            transform: translateY(-20px) translateX(10px);
          }
          50% {
            transform: translateY(-40px) translateX(-10px);
          }
          75% {
            transform: translateY(-20px) translateX(5px);
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
          animation: gradient 3s ease infinite;
        }
      `}</style>
    </div>
  );
};
