import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, Moon, Sun, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LiveDashboardShowcase = () => {
  const [isDark, setIsDark] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const interval = setInterval(() => {
      setIsDark(prev => !prev);
    }, 4000); // Switch every 4 seconds

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    // Apply theme changes to the iframe content
    const theme = isDark ? 'dark' : 'light';
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <Badge variant="secondary" className="inline-flex items-center space-x-2 mb-4">
          <Monitor className="h-4 w-4" />
          <span>Live Dashboard Preview</span>
        </Badge>
        <h3 className="text-2xl font-bold mb-2">Experience Your Financial Command Center</h3>
        <p className="text-muted-foreground mb-4">
          See the actual dashboard interface that thousands of Amazon sellers use daily
        </p>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Open Full Dashboard</span>
        </Button>
      </div>

      <Card className="relative overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-accent/5">
        <div className="absolute top-4 right-4 z-10">
          <div className="flex items-center space-x-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-1 border shadow-sm">
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

        {/* Dashboard Preview Frame */}
        <div className="relative">
          <div className="aspect-video bg-background border-8 border-muted rounded-lg overflow-hidden">
            {/* Browser Chrome */}
            <div className="flex items-center justify-between bg-muted px-4 py-2 border-b">
              <div className="flex items-center space-x-2">
                <div className="flex space-x-1">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="text-xs text-muted-foreground ml-4">
                  cashflowpro.com/dashboard
                </div>
              </div>
            </div>

            {/* Dashboard Content Preview */}
            <div className={`h-full transition-all duration-1000 ${isDark ? 'dark bg-background' : 'bg-background'}`}>
              <iframe
                src="/dashboard"
                className="w-full h-full border-0 scale-75 origin-top-left"
                style={{ 
                  width: '133.33%', 
                  height: '133.33%',
                  pointerEvents: 'none'
                }}
                title="Dashboard Preview"
              />
            </div>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live Preview</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Real dashboard interface
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
          <div className="text-2xl font-bold text-primary">Real-time</div>
          <div className="text-sm text-muted-foreground">Data Updates</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">Interactive</div>
          <div className="text-sm text-muted-foreground">Interface</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold text-primary">Responsive</div>
          <div className="text-sm text-muted-foreground">Design</div>
        </div>
      </div>
    </div>
  );
};