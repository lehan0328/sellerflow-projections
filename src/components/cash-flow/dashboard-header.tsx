import { DollarSign, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

export function DashboardHeader() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Fetch user profile for display name
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching profile:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
  });
  
  // Get user display name for dashboard title
  const getUserDisplayName = () => {
    if (profile?.first_name) {
      return profile.first_name;
    }
    if (user?.email) {
      return user.email.split('@')[0];
    }
    return 'Your';
  };

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

      {/* Navigation and User Menu - Top Right */}
      <div className="absolute top-6 right-6 z-40 flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/analytics')}
          className="h-10 px-4 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent hover:text-accent-foreground"
          title="View Analytics"
        >
          <DollarSign className="h-4 w-4 mr-2" />
          Analytics
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/transactions')}
          className="h-10 w-10 p-0 bg-background/80 backdrop-blur-sm border-border/50 hover:bg-accent hover:text-accent-foreground"
          title="View Transaction Log"
        >
          <History className="h-4 w-4" />
        </Button>
        <UserMenu />
      </div>

      {/* Centered Dashboard Title */}
      <div className="flex justify-center items-center pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {getUserDisplayName()}'s Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and financial management
          </p>
        </div>
      </div>
    </div>
  );
}