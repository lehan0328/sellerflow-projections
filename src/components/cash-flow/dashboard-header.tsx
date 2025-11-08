import { Gift, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { UserMenu } from "./user-menu";
import { DemoUserMenu } from "./demo-user-menu";
import { PendingNotificationsPanel } from "./pending-notifications-panel";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { useSidebar } from "@/components/ui/sidebar";
import { useTheme } from "next-themes";
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
  const { is_trialing, trial_end } = useSubscription();
  const {
    state
  } = useSidebar();
  const isSidebarCollapsed = state === "collapsed";
  const { theme, setTheme } = useTheme();

  // Fetch user profile for display name - only fetch company
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('company')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('[Dashboard] Error fetching profile:', error);
        return null;
      }
      console.log('[Dashboard] Company data loaded:', data);
      return data;
    },
    enabled: !!user?.id,
    staleTime: 0,
    refetchOnMount: 'always',
    refetchOnWindowFocus: true,
  });

  // Get user display name for dashboard title
  const getUserDisplayName = () => {
    if (isDemo) {
      return 'Demo Dashboard';
    }
    
    // Only use company name - first word + "'s Dashboard"
    if (profile?.company) {
      const firstWord = profile.company.trim().split(/\s+/)[0];
      const capitalized = firstWord.charAt(0).toUpperCase() + firstWord.slice(1).toLowerCase();
      return `${capitalized}'s Dashboard`;
    }
    
    return 'Dashboard';
  };
  return <div className="relative w-full">
      {/* Logo - Top Left - Only show when sidebar is collapsed */}
      {isSidebarCollapsed && <div className="absolute top-4 left-4 z-40">
          <div className="flex flex-col items-center">
            <img src={aurenIcon} alt="Auren" className="h-10 w-auto mb-0.5" />
            <span className="text-sm font-bold bg-gradient-primary bg-clip-text text-transparent">
              Auren
            </span>
          </div>
        </div>}

      {/* Navigation and User Menu - Top Right */}
      <div className="absolute top-4 right-4 z-40 flex items-center space-x-3">
        {!isDemo && is_trialing && trial_end && (
          <Badge variant="outline" className="bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400 px-3 py-1">
            Professional Plan Trial - Ends {new Date(trial_end).toLocaleDateString()}
          </Badge>
        )}
        <Button
          variant="outline"
          size="icon"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="h-10 w-10"
          title="Toggle theme"
        >
          <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
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
    </div>;
}