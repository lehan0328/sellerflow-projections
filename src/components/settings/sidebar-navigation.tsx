import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  User, 
  Download, 
  Palette, 
  CreditCard, 
  Shield, 
  Building2,
  Bell
} from "lucide-react";

const navigationItems = [
  {
    id: 'profile',
    label: 'Profile Settings',
    icon: User,
  },
  {
    id: 'vendors',
    label: 'Vendor Management',
    icon: Building2,
  },
  {
    id: 'appearance',
    label: 'Appearance',
    icon: Palette,
  },
  {
    id: 'financial',
    label: 'Financial Settings',
    icon: CreditCard,
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