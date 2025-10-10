import { NavLink, useLocation } from "react-router-dom";
import { Home, TrendingUp, CreditCard, Repeat, ShoppingCart, Wallet, Users, Calculator, BarChart3, FolderOpen, MessageSquare, Calendar } from "lucide-react";
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
  SidebarHeader,
} from "@/components/ui/sidebar";
import { Badge } from "@/components/ui/badge";
import aurenIcon from "@/assets/auren-icon-blue.png";

interface AppSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
}

const sections = [
  { id: "overview", title: "Overview", icon: Home },
  { id: "transactions", title: "Transactions", icon: TrendingUp },
  { id: "financials", title: "Financials", icon: Wallet },
  { id: "recurring", title: "Recurring Expenses", icon: Repeat },
  { id: "amazon", title: "Amazon Payouts", icon: ShoppingCart },
  { id: "scenario-planning", title: "Scenario Planning", icon: Calculator },
  { id: "analytics", title: "Analytics", icon: BarChart3 },
  { id: "document-storage", title: "Document Storage", icon: FolderOpen },
  { id: "support", title: "Support", icon: MessageSquare },
  { id: "referrals", title: "Referrals", icon: Users },
  { id: "book-call", title: "Book a Call", icon: Calendar, isExternal: true, url: "https://app.usemotion.com/meet/andy-chu/AurenDemo" },
];

export function AppSidebar({ activeSection, onSectionChange }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar className={isCollapsed ? "w-16" : "w-64"} collapsible="icon">
      <SidebarHeader className="border-b border-border/50 py-4">
        {!isCollapsed && (
          <div className="flex items-center justify-center gap-2 px-2">
            <img 
              src={aurenIcon} 
              alt="Auren" 
              className="h-8 w-8 object-contain"
              style={{ imageRendering: 'crisp-edges' }}
            />
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Auren
            </span>
          </div>
        )}
      </SidebarHeader>
      <SidebarContent className={isCollapsed ? "px-0" : "px-1"}>
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 mt-2">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? "px-0" : "px-1"}`}>
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isExternal = 'isExternal' in section && section.isExternal;
                
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (isExternal && 'url' in section) {
                          window.open(section.url, '_blank', 'noopener,noreferrer');
                        } else {
                          onSectionChange(section.id);
                        }
                      }}
                      className={`
                        relative rounded-lg transition-all duration-200
                        ${isCollapsed ? "justify-center h-12 w-12" : ""}
                        ${isActive 
                          ? "bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground shadow-md hover:shadow-lg font-semibold" 
                          : "hover:bg-accent/50 hover:translate-x-1"
                        }
                      `}
                    >
                      <Icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} ${isActive ? "animate-pulse" : ""} ${isCollapsed ? "mx-auto" : ""}`} />
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
