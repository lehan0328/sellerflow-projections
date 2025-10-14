import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserMenu } from "./user-menu";
import { DemoUserMenu } from "./demo-user-menu";
import { PendingNotificationsPanel } from "./pending-notifications-panel";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSidebar } from "@/components/ui/sidebar";
interface DashboardHeaderProps {
  onRefresh?: () => void;
  isRefreshing?: boolean;
  lastRefreshTime?: Date | null;
  isDemo?: boolean;
  vendors?: any[];
  incomeItems?: any[];
  onVendorClick?: (vendor: any) => void;
  onIncomeClick?: (income: any) => void;
}
export function DashboardHeader({
  onRefresh,
  isRefreshing = false,
  lastRefreshTime,
  isDemo = false,
  vendors = [],
  incomeItems = [],
  onVendorClick,
  onIncomeClick
}: DashboardHeaderProps) {
  const {
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    state
  } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";

  // Fetch user profile for display name
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, company')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Dashboard] Error fetching profile:', error);
        return null;
      }
      console.log('[Dashboard] Profile data loaded:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0, // Don't use cached data
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });

  // Get user display name for dashboard title
  const getUserDisplayName = () => {
    if (isDemo) {
      return 'Demo';
    }
    
    // Show loading state to prevent flicker
    if (profileLoading) {
      return 'Loading';
    }
    
    // If user has a company name, use the first word capitalized
    if (profile?.company) {
      const firstWord = profile.company.trim().split(/\s+/)[0];
      return firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
    }
    
    if (profile?.first_name) {
      return profile.first_name;
    }
    
    if (user?.email) {
      const userName = user.email.split('@')[0];
      return userName.charAt(0).toUpperCase() + userName.slice(1);
    }
    
    return 'User';
  };
  return <div className="relative w-full">
      {/* Logo - Top Left - Only show when sidebar is collapsed */}
      {isSidebarCollapsed && <div className="absolute top-6 left-6 z-40">
          <div className="flex flex-col items-center">
            <img src={aurenIcon} alt="Auren" className="h-14 w-auto mb-1" />
            <span className="text-lg font-bold bg-gradient-primary bg-clip-text text-transparent">
              Auren
            </span>
          </div>
        </div>}

      {/* Navigation and User Menu - Top Right */}
      <div className="absolute top-6 right-6 z-40 flex items-center space-x-3">
        {!isDemo && <Button variant="outline" size="sm" onClick={() => navigate('/referral-dashboard')} className="relative h-10 px-4 bg-blue-500/20 backdrop-blur-sm border-blue-500/50 hover:border-blue-500 hover:bg-blue-500/30 hover:shadow-lg hover:shadow-blue-500/30 transition-all duration-300 group overflow-hidden" title="Referral Rewards - Earn up to $3,000">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <div className="relative flex items-center gap-2">
              <Gift className="h-4 w-4 text-blue-500 animate-pulse" />
              <span className="font-semibold text-blue-600 dark:text-blue-400">Referrals</span>
              <span className="hidden lg:inline text-xs font-bold text-blue-600 dark:text-blue-400">• Earn $2K</span>
            </div>
          </Button>}
        {!isDemo && <PendingNotificationsPanel 
          vendors={vendors}
          incomeItems={incomeItems}
          onVendorClick={onVendorClick}
          onIncomeClick={onIncomeClick}
        />}
        {isDemo ? <DemoUserMenu /> : <UserMenu />}
      </div>

      {/* Centered Dashboard Title */}
      <div className="flex justify-center items-center pt-8 pb-6">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            {isDemo ? 'Demo Dashboard' : `${getUserDisplayName()}'s Dashboard`}
          </h1>
          <p className="text-muted-foreground mt-2">
            Real-time insights and financial management
          </p>
        </div>
      </div>
    </div>;
}