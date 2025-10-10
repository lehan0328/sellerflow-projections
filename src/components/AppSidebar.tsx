import { NavLink, useLocation } from "react-router-dom";
import { Home, Building2, TrendingUp, CreditCard, Repeat, ShoppingCart, Wallet, Users } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "overview", title: "Overview", icon: Home },
  { id: "vendors", title: "Vendors", icon: Building2 },
  { id: "income", title: "Income", icon: TrendingUp },
  { id: "bank-accounts", title: "Bank Accounts", icon: Wallet },
  { id: "credit-cards", title: "Credit Cards", icon: CreditCard },
  { id: "recurring", title: "Recurring Expenses", icon: Repeat },
  { id: "amazon", title: "Amazon Payouts", icon: ShoppingCart },
  { id: "referrals", title: "Referrals", icon: Users },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-14" : "w-64"} collapsible="icon">
      <SidebarContent className="px-1">
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1 px-1">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(section.id)}
                      className={`
                        relative rounded-lg transition-all duration-200 
                        ${isActive 
                          ? "bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground shadow-md hover:shadow-lg font-semibold" 
                          : "hover:bg-accent/50 hover:translate-x-1"
                        }
                      `}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "animate-pulse" : ""}`} />
                      {!isCollapsed && (
                        <span className="flex items-center justify-between w-full pr-1">
                          <span>{section.title}</span>
                          {section.id === "referrals" && (
                            <Badge 
                              variant="secondary" 
                              className="ml-auto text-[10px] bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 font-bold px-1.5 py-0"
                            >
                              Earn $3k
                            </Badge>
                          )}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
