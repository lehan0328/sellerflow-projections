import { Button } from "@/components/ui/button";
import { DollarSign, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DashboardHeaderProps {
  userName?: string;
}

export function DashboardHeader({ userName = "Andy" }: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="relative w-full">
      {/* Logo - Top Left */}
      <div className="absolute top-6 left-6 z-40">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
            <DollarSign className="h-6 w-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            CashFlow Pro
          </span>
        </div>
      </div>

      {/* Settings - Top Right */}
      <div className="absolute top-6 right-6 z-40">
        <Button 
          variant="outline" 
          size="sm"
          onClick={() => navigate('/settings')}
          className="rounded-full"
        >
          <Settings className="h-4 w-4 mr-2" />
          Settings
        </Button>
      </div>

      {/* Centered Dashboard Title */}
      <div className="flex justify-center items-center pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {userName}'s Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and financial management
          </p>
        </div>
      </div>
    </div>
  );
}