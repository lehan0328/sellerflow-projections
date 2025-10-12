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
  ShoppingCart,
  MessageSquare,
  Users,
  Database,
  Repeat,
  FileText
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
    id: 'invoices',
    label: 'Billing & Invoices',
    icon: FileText,
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
  {
    id: 'data-management',
    label: 'Data Management',
    icon: Database,
  },
  {
    id: 'feature-request',
    label: 'Feature Request',
    icon: MessageSquare,
  },
];

interface SidebarNavigationProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isAdmin: boolean;
}

// Sections that require admin access (owner or admin role)
const adminOnlySections = [
  'team',
  'bank-accounts',
  'credit-cards',
  'vendors',
  'customers',
  'recurring-expenses',
  'amazon',
  'financial',
  'invoices',
  'export',
  'data-management'
];

export function SidebarNavigation({ activeSection, onSectionChange, isAdmin }: SidebarNavigationProps) {
  return (
    <nav className="space-y-1">
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