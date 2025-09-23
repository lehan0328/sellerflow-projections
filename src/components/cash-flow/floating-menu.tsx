import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Settings, Building2, LogOut, Plus, ShoppingCart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface FloatingMenuProps {
  onAddVendor: () => void;
  onAddAccount: () => void;
  onAddPurchaseOrder: () => void;
}

export function FloatingMenu({ onAddVendor, onAddAccount, onAddPurchaseOrder }: FloatingMenuProps) {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const [position, setPosition] = useState({ x: 24, y: 24 }); // Default top-right position
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<HTMLDivElement>(null);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const menuStartPos = useRef({ x: 0, y: 0 });

  const handleSignOut = async () => {
    const error = await signOut();
    if (!error) {
      toast.success('Signed out successfully');
      navigate('/');
    } else {
      toast.error('Failed to sign out');
    }
  };

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    menuStartPos.current = { ...position };
    e.preventDefault();
  }, [position]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    const deltaX = e.clientX - dragStartPos.current.x;
    const deltaY = e.clientY - dragStartPos.current.y;
    
    const newX = Math.max(0, Math.min(window.innerWidth - 300, menuStartPos.current.x + deltaX));
    const newY = Math.max(0, Math.min(window.innerHeight - 100, menuStartPos.current.y + deltaY));
    
    setPosition({ x: newX, y: newY });
  }, [isDragging]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Add global mouse event listeners
  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <div 
      ref={dragRef}
      className={`fixed z-50 group ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        userSelect: 'none'
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Main + Button */}
      <div className="flex items-center justify-center w-12 h-12 bg-gradient-primary rounded-full shadow-elevated transition-all duration-300 hover:scale-110">
        <Plus className="h-5 w-5 text-primary-foreground transition-transform duration-300 group-hover:rotate-45 pointer-events-none" />
      </div>
      
      {/* Expanded Menu */}
      <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 translate-x-4 pointer-events-none group-hover:pointer-events-auto">
        <div className="flex items-center space-x-2 bg-card/95 backdrop-blur-sm border border-border/50 rounded-full px-4 py-2 shadow-elevated pr-14">
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full" 
            onClick={(e) => {
              e.stopPropagation();
              navigate('/settings');
            }}
            onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
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
            onMouseDown={(e) => e.stopPropagation()}
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="ml-2 hidden lg:inline">Purchase Order</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="rounded-full" 
            onClick={(e) => {
              e.stopPropagation();
              onAddAccount();
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <Plus className="h-4 w-4" />
            <span className="ml-2 hidden sm:inline">Add Account</span>
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
            onMouseDown={(e) => e.stopPropagation()}
          >
            <LogOut className="h-4 w-4" />
            <span className="ml-2 hidden lg:inline">Sign Out</span>
          </Button>
        </div>
      </div>
    </div>
  );
}