import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { 
  User, 
  Download, 
  Palette, 
  CreditCard, 
  Building2,
  ShoppingCart,
  Users,
  Database,
  Repeat,
  Tags,
  MessageSquare
} from "lucide-react";

const navigationItems = [
  {
    id: 'profile',
    label: 'Profile Settings',
    icon: User,
  },
  {
    id: 'team',
    label: 'Team Management',
    icon: Users,
  },
  {
    id: 'bank-accounts',
    label: 'Bank Accounts',
    icon: Building2,
  },
  {
    id: 'credit-cards',
    label: 'Credit Cards',
    icon: CreditCard,
  },
  {
    id: 'vendors',
    label: 'Vendor Management',
    icon: Building2,
  },
  {
    id: 'customers',
    label: 'Customer Management',
    icon: Users,
  },
  {
    id: 'recurring-expenses',
    label: 'Recurring Transactions',
    icon: Repeat,
  },
  {
    id: 'categories',
    label: 'Category Management',
    icon: Tags,
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
    id: 'feature-request',
    label: 'Feature Request',
    icon: MessageSquare,
  },
  {
    id: 'export',
    label: 'Data Export',
    icon: Download,
  },
  {
    id: 'data-management',
    label: 'Data Management',
    icon: Database,
  },
];

interface SidebarNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isAdmin: boolean; // This represents isAccountAdmin (owner or admin role)
}

// Sections that require account admin access (owner or admin role)
const adminOnlySections = [
  'team',
  'bank-accounts',
  'credit-cards',
  'vendors',
  'customers',
  'recurring-expenses',
  'categories',
  'amazon',
  'export',
  'data-management'
];

export function SidebarNavigation({ activeSection, onSectionChange, isAdmin }: SidebarNavigationProps) {
  return (
    <nav className="space-y-1 relative z-10">
      {navigationItems.map((item) => {
        // Hide admin-only sections from staff users
        if (!isAdmin && adminOnlySections.includes(item.id)) {
          return null;
        }
        
        const Icon = item.icon;
        return (
          <Button
            key={item.id}
            variant={activeSection === item.id ? "secondary" : "ghost"}
            className={cn(
              "w-full justify-start relative z-10",
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