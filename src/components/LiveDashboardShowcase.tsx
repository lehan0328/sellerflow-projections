import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Monitor, ExternalLink } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const LiveDashboardShowcase = () => {
  const navigate = useNavigate();

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
        <Button 
          variant="outline" 
          onClick={() => navigate('/signup')}
          className="inline-flex items-center space-x-2"
        >
          <ExternalLink className="h-4 w-4" />
          <span>Get Started</span>
        </Button>
      </div>

      <Card className="relative overflow-hidden shadow-2xl border-0 bg-gradient-to-br from-primary/5 to-accent/5">
        {/* Dashboard Preview */}
        <div className="relative p-4">
          <div className="aspect-video bg-background rounded-lg overflow-hidden border-2 border-primary/20">
            <iframe 
              src="/demo" 
              className="w-full h-full"
              title="Live Dashboard Demo"
              sandbox="allow-same-origin allow-scripts"
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