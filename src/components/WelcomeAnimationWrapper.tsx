import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { WelcomeAnimation } from "./WelcomeAnimation";
import Dashboard from "@/pages/Dashboard";

export const WelcomeAnimationWrapper = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAnimation, setShowAnimation] = useState<boolean | null>(null);

  // Check welcome animation flag
  const { data: userSettings, isLoading } = useQuery({
    queryKey: ['user-settings', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('user_settings')
        .select('welcome_animation_shown')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) {
        console.error('Error fetching user settings:', error);
        return null;
      }
      return data;
    },
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000, // 10 minutes - user settings rarely change
  });

  // Set animation state when settings load
  useEffect(() => {
    if (isLoading) return;
    
    if (userSettings === null) {
      setShowAnimation(false);
    } else if (userSettings?.welcome_animation_shown === false) {
      setShowAnimation(true);
    } else {
      setShowAnimation(false);
    }
  }, [userSettings, isLoading]);

  // Handle animation completion
  const handleAnimationComplete = async () => {
    setShowAnimation(false);
    
    if (user?.id) {
      try {
        await supabase
          .from('user_settings')
          .update({ welcome_animation_shown: true })
          .eq('user_id', user.id);
        
        queryClient.invalidateQueries({ queryKey: ['user-settings', user.id] });
      } catch (error) {
        console.error('Error updating welcome animation flag:', error);
      }
    }
  };

  // Loading state with watermark that matches dashboard
  if (showAnimation === null) {
    return (
      <div className="h-screen w-full bg-background flex items-center justify-center relative overflow-hidden">
        {/* Watermark that matches dashboard */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <img 
            src="/auren-icon-blue.png" 
            alt="" 
            className="w-[600px] h-auto pointer-events-none"
          />
        </div>
      </div>
    );
  }

  // Show animation
  if (showAnimation === true) {
    return <WelcomeAnimation onComplete={handleAnimationComplete} />;
  }

  // Only now render the Dashboard component
  return <Dashboard />;
};
