import { Button } from "@/components/ui/button";
import { Calendar, Settings, Building2, LogOut, Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FloatingMenuProps {
  onAddVendor: () => void;
  onAddAccount: () => void;
}

export function FloatingMenu({ onAddVendor, onAddAccount }: FloatingMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    const error = await signOut();
    if (!error) {
      toast.success('Signed out successfully');
      navigate('/');
    } else {
      toast.error('Failed to sign out');
    }
  };

  return (
    <div className="fixed top-6 right-6 z-50">
      <div className="flex items-center space-x-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 shadow-elevated">
        
        <Button variant="ghost" size="sm" className="rounded-full" onClick={() => navigate('/settings')}>
          <Settings className="h-4 w-4" />
          <span className="ml-2 hidden md:inline">Settings</span>
        </Button>
        
        <Button variant="ghost" size="sm" className="rounded-full" onClick={onAddVendor}>
          <Building2 className="h-4 w-4" />
          <span className="ml-2 hidden md:inline">Add Vendor</span>
        </Button>
        
        <Button size="sm" className="bg-gradient-primary rounded-full" onClick={onAddAccount}>
          <Plus className="h-4 w-4" />
          <span className="ml-2 hidden sm:inline">Add Account</span>
        </Button>
        
        <div className="w-px h-6 bg-border/50" />
        
        <Button variant="ghost" size="sm" className="rounded-full" onClick={handleSignOut}>
          <LogOut className="h-4 w-4" />
          <span className="ml-2 hidden lg:inline">Sign Out</span>
        </Button>
      </div>
    </div>
  );
}