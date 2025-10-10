import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";

interface DashboardHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshTime?: Date | null;
}

export function DashboardHeader({ onRefresh, isRefreshing = false, lastRefreshTime }: DashboardHeaderProps) {
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
        <div className="flex items-center">
          <img src={aurenIcon} alt="Auren" className="h-14 w-auto" />
        </div>
      </div>

      {/* Navigation and User Menu - Top Right */}
      <div className="absolute top-6 right-6 z-40 flex items-center space-x-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/referral-dashboard')}
          className="relative h-10 px-4 bg-blue-500/20 backdrop-blur-sm border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/30 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 group overflow-hidden"
          title="Referral Rewards - Earn up to $3,000"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          <div className="relative flex items-center gap-2">
            <Gift className="h-4 w-4 text-blue-500 animate-pulse" />
            <span className="font-semibold text-blue-600 dark:text-blue-400">Referrals</span>
            <span className="hidden lg:inline text-xs font-bold text-blue-600 dark:text-blue-400">
              • Earn $3K
            </span>
          </div>
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