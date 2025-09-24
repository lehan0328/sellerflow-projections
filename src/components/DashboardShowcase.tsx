import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Monitor, Moon, Sun } from "lucide-react";
import dashboardLight from "@/assets/dashboard-light.jpg";
import dashboardDark from "@/assets/dashboard-dark.jpg";

export const DashboardShowcase = () => {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDark(prev => !prev);
    }, 3000); // Switch every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <Badge variant="secondary" className="inline-flex items-center space-x-2 mb-4">
          <Monitor className="h-4 w-4" />
          <span>Live Dashboard Preview</span>
        </Badge>
        <h3 className="text-2xl font-bold mb-2">See Your Financial Future</h3>
        <p className="text-muted-foreground">
          Beautiful, intuitive dashboard that works perfectly in both light and dark modes
        </p>
      </div>

      <Card className="relative overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center space-x-2 bg-background/80 backdrop-blur-sm rounded-full px-3 py-1 border">
            <Sun className={`h-4 w-4 transition-colors ${!isDark ? 'text-yellow-500' : 'text-muted-foreground'}`} />
            <div className="relative w-8 h-4 bg-muted rounded-full">
              <div 
                className={`absolute top-0.5 w-3 h-3 bg-primary rounded-full transition-transform duration-500 ${
                  isDark ? 'translate-x-4' : 'translate-x-0.5'
                }`} 
              />
            </div>
            <Moon className={`h-4 w-4 transition-colors ${isDark ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
        </div>

        <div className="relative aspect-video overflow-hidden">
          <img
            src={dashboardLight}
            alt="Dashboard Light Mode"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              isDark ? 'opacity-0' : 'opacity-100'
            }`}
          />
          <img
            src={dashboardDark}
            alt="Dashboard Dark Mode"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
              isDark ? 'opacity-100' : 'opacity-0'
            }`}
          />
          
          {/* Overlay gradient for better text readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-background/90 backdrop-blur-sm rounded-lg p-4 border">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live Data</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Updates every hour
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                {isDark ? 'Dark Mode' : 'Light Mode'}
              </div>
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-4 mt-6">
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">95%</div>
          <div className="text-sm text-muted-foreground">Forecast Accuracy</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">5min</div>
          <div className="text-sm text-muted-foreground">Setup Time</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">24/7</div>
          <div className="text-sm text-muted-foreground">Real-time Sync</div>
        </div>
      </div>
    </div>
  );
};