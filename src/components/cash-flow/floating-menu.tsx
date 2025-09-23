import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Building2, LogOut, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FloatingMenuProps {
  onAddVendor: () => void;
  onAddPurchaseOrder: () => void;
}

export function FloatingMenu({ onAddVendor, onAddPurchaseOrder }: FloatingMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSignOut = async () => {
    const error = await signOut();
    if (!error) {
      toast.success('Signed out successfully');
      navigate('/');
    } else {
      toast.error('Failed to sign out');
    }
  };

  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Main + Button */}
      <div 
        className={`flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-full shadow-elevated cursor-pointer transition-all duration-300 ${isExpanded ? 'scale-110' : 'hover:scale-105'}`}
        onClick={toggleMenu}
      >
        <Plus className={`h-5 w-5 text-primary-foreground transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
      </div>
      
      {/* Expanded Menu */}
      {isExpanded && (
        <div className="absolute bottom-0 left-16 transform transition-all duration-300 animate-in slide-in-from-left-2">
          <div className="flex items-center space-x-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 shadow-elevated">
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={(e) => {
                e.stopPropagation();
                navigate('/settings');
              }}
            >
              <Settings className="h-4 w-4" />
              <span className="ml-2 hidden md:inline">Settings</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={(e) => {
                e.stopPropagation();
                onAddVendor();
              }}
            >
              <Building2 className="h-4 w-4" />
              <span className="ml-2 hidden md:inline">Add Vendor</span>
            </Button>
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={(e) => {
                e.stopPropagation();
                onAddPurchaseOrder();
              }}
            >
              <ShoppingCart className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Purchase Order</span>
            </Button>
            
            <div className="w-px h-6 bg-border/50" />
            
            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={(e) => {
                e.stopPropagation();
                handleSignOut();
              }}
            >
              <LogOut className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Sign Out</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}