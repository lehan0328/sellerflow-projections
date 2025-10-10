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
    <Sidebar className={isCollapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Dashboard</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(section.id)}
                      className={isActive ? "bg-secondary text-secondary-foreground font-medium" : ""}
                    >
                      <Icon className="h-4 w-4" />
                      {!isCollapsed && <span>{section.title}</span>}
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
