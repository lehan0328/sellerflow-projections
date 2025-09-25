import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, ShoppingCart, DollarSign } from "lucide-react";

interface FloatingMenuProps {
  onAddPurchaseOrder: () => void;
  onAddIncome: () => void;
  onAddRecurringIncome: () => void;
}

export function FloatingMenu({ onAddPurchaseOrder, onAddIncome, onAddRecurringIncome }: FloatingMenuProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const toggleMenu = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50">
      {/* Main + Button */}
      <div 
        className={`flex items-center justify-center w-14 h-14 bg-gradient-primary rounded-full shadow-elevated cursor-pointer transition-all duration-300 ${isExpanded ? 'scale-110' : 'hover:scale-105'}`}
        onClick={toggleMenu}
      >
        <Plus className={`h-6 w-6 text-primary-foreground transition-transform duration-300 ${isExpanded ? 'rotate-45' : ''}`} />
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
                onAddPurchaseOrder();
              }}
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
                onAddIncome();
              }}
            >
              <DollarSign className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Add Income</span>
            </Button>

            <Button 
              variant="ghost" 
              size="sm" 
              className="rounded-full" 
              onClick={(e) => {
                e.stopPropagation();
                onAddRecurringIncome();
              }}
            >
              <Plus className="h-4 w-4" />
              <span className="ml-2 hidden lg:inline">Add Recurring</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}