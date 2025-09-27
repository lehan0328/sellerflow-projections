import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  User, 
  Download, 
  Palette, 
  CreditCard, 
  Shield, 
  Building2,
  Bell,
  Settings,
  ShoppingCart
} from "lucide-react";

const navigationItems = [
  {
    id: 'profile',
    label: 'Profile Settings',
    icon: User,
  },
  {
    id: 'bank-accounts',
    label: 'Bank Accounts',
    icon: Building2,
  },
  {
    id: 'vendors',
    label: 'Vendor Management',
    icon: Building2,
  },
  {
    id: 'amazon',
    label: 'Amazon Integration',
    icon: ShoppingCart,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
  },
  {
    id: 'credit-cards',
    label: 'Credit Cards',
    icon: CreditCard,
  },
  {
    id: 'financial',
    label: 'Financial Settings',
    icon: Settings,
  },
  {
    id: 'notifications',
    label: 'Notifications',
    icon: Bell,
  },
  {
    id: 'export',
    label: 'Data Export',
    icon: Download,
  },
  {
    id: 'security',
    label: 'Security',
    icon: Shield,
  },
];

interface SidebarNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

export function SidebarNavigation({ activeSection, onSectionChange }: SidebarNavigationProps) {
  return (
    <nav className="space-y-1">
      {navigationItems.map((item) => {
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start",
              activeSection === item.id && "bg-secondary text-secondary-foreground"
            )}
            onClick={() => onSectionChange(item.id)}
          >
            <Icon className="mr-3 h-4 w-4" />
            {item.label}
          </Button>
        );
      })}
    </nav>
  );
}