import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, ExternalLink, TrendingUp, DollarSign, Calendar } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useUserSettings } from "@/hooks/useUserSettings";
import { useEffect, useState } from "react";

export const LiveDashboardShowcase = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { amazonPayouts, totalUpcoming, isLoading } = useAmazonPayouts();
  const { forecastsEnabled } = useUserSettings();
  const [forecastStats, setForecastStats] = useState({
    totalForecasted: 0,
    next7Days: 0,
    forecastCount: 0
  });

  useEffect(() => {
    if (!user || !forecastsEnabled) return;

    const forecasted = amazonPayouts.filter(p => p.status === 'forecasted');
    const totalForecasted = forecasted.reduce((sum, p) => sum + p.total_amount, 0);
    
    const next7Days = new Date();
    next7Days.setDate(next7Days.getDate() + 7);
    const next7DaysStr = next7Days.toISOString().split('T')[0];
    
    const next7DaysTotal = forecasted
      .filter(p => p.payout_date <= next7DaysStr)
      .reduce((sum, p) => sum + p.total_amount, 0);

    setForecastStats({
      totalForecasted,
      next7Days: next7DaysTotal,
      forecastCount: forecasted.length
    });
  }, [amazonPayouts, user, forecastsEnabled]);

  return (
    <div className="relative max-w-6xl mx-auto">
      <div className="text-center mb-8">
        <Badge variant="secondary" className="inline-flex items-center space-x-2 mb-4">
          <Monitor className="h-4 w-4" />
          <span>Dashboard Features</span>
        </Badge>
        <h3 className="text-2xl font-bold mb-2">Experience Your Financial Command Center</h3>
        <p className="text-muted-foreground mb-4">
          The dashboard interface that thousands of Amazon sellers use daily
        </p>
        
        {user && forecastsEnabled && !isLoading && forecastStats.forecastCount > 0 && (
          <div className="flex items-center justify-center gap-6 my-6 text-sm">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-semibold">${forecastStats.totalForecasted.toLocaleString()}</span>
              <span className="text-muted-foreground">Forecasted</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              <span className="font-semibold">${forecastStats.next7Days.toLocaleString()}</span>
              <span className="text-muted-foreground">Next 7 Days</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              <span className="font-semibold">{forecastStats.forecastCount}</span>
              <span className="text-muted-foreground">Forecasts</span>
            </div>
          </div>
        )}
        
        <Button 
          variant="outline" 
          onClick={() => navigate('/contact')}
          className="inline-flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Join Waitlist</span>
        </Button>
      </div>

      <Card className="relative overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-accent/5">
        {/* Dashboard Preview */}
        <div className="relative p-4">
          <div className="aspect-video bg-background rounded-lg overflow-hidden border-2 border-primary/20">
            <video 
              src="/Budget_Planning_and_Spending_Projections.mp4" 
              className="w-full h-full object-cover"
              title="Dashboard Demo Video"
              controls
              autoPlay
              muted
              loop
              onError={(e) => {
                // Silently handle video loading errors without logging to console
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        </div>

        <div className="absolute bottom-4 left-4 right-4 pointer-events-none">
          <div className="bg-background/95 backdrop-blur-sm rounded-lg p-4 border shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-success rounded-full animate-pulse" />
                  <span className="text-sm font-medium">Live Dashboard</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Real-time interface
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                Available Now
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