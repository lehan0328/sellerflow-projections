import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, TrendingUp, CreditCard, Repeat, ShoppingCart, Wallet, Users, Calculator, BarChart3, FolderOpen, MessageSquare, Calendar, FileBarChart, Building2, Brain, Bell, Clock } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { useNotifications } from "@/hooks/useNotifications";
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
  onFlexReportClick?: () => void;
}

const overviewSections = [
  { id: "overview", title: "Overview", icon: Home },
  { id: "analytics", title: "Analytics", icon: BarChart3 },
  { id: "scenario-planning", title: "Scenario Planning", icon: Calculator },
  { id: "notifications", title: "Automated Notifications", icon: Clock, showBadge: true },
];

const transactionSections = [
  { id: "transactions", title: "Transactions", icon: TrendingUp },
  { id: "bank-transactions", title: "Bank Transactions", icon: Building2 },
  { id: "financials", title: "Financials", icon: Wallet },
  { id: "recurring", title: "Recurring Expenses", icon: Repeat },
  { id: "amazon", title: "Amazon Payouts", icon: ShoppingCart },
];

const resourceSections = [
  { id: "document-storage", title: "Document Storage", icon: FolderOpen },
  { id: "support", title: "Support", icon: MessageSquare },
  { id: "referrals", title: "Referrals", icon: Users },
  { id: "book-call", title: "Book a Demo", icon: Calendar, isExternal: true, url: "https://app.usemotion.com/meet/andy-chu/AurenDemo" },
  { id: "flex-report", title: "Flex Report", icon: FileBarChart, isExternal: true, isFlexReport: true },
];

export function AppSidebar({ activeSection, onSectionChange, onFlexReportClick }: AppSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";
  const { unreadCount } = useNotifications();

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
        {/* Overview Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 mt-2">
            Dashboard
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? "px-0" : "px-1"}`}>
              {overviewSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(section.id)}
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
                          {'showBadge' in section && section.showBadge && unreadCount > 0 && (
                            <Badge 
                              variant="destructive" 
                              className="ml-auto text-[10px] font-bold px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center"
                            >
                              {unreadCount}
                            </Badge>
                          )}
                        </span>
                      )}
                      {isCollapsed && 'showBadge' in section && section.showBadge && unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center text-[10px] font-bold">
                          {unreadCount}
                        </div>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Transactions Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2">
            Transactions
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? "px-0" : "px-1"}`}>
              {transactionSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => onSectionChange(section.id)}
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
                      {!isCollapsed && <span>{section.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <Separator className="my-2" />

        {/* Resources Section */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 py-2 mt-2">
            Resources
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className={`space-y-1 ${isCollapsed ? "px-0" : "px-1"}`}>
              {resourceSections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isExternal = 'isExternal' in section && section.isExternal;
                const isRoute = 'isRoute' in section && section.isRoute;
                const isBookCall = section.id === "book-call";
                const isFlexReport = 'isFlexReport' in section && section.isFlexReport;
                
                return (
                  <SidebarMenuItem key={section.id}>
                    <SidebarMenuButton
                      onClick={() => {
                        if (isFlexReport && onFlexReportClick) {
                          onFlexReportClick();
                        } else if (isRoute && 'url' in section) {
                          window.location.href = section.url;
                        } else if (isExternal && 'url' in section) {
                          window.open(section.url, '_blank', 'noopener,noreferrer');
                        } else {
                          onSectionChange(section.id);
                        }
                      }}
                      className={`
                        relative rounded-lg transition-all duration-200
                        ${isCollapsed ? "justify-center h-12 w-12" : ""}
                        ${isBookCall 
                          ? "bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-lg hover:shadow-xl hover:from-green-700 hover:to-emerald-700 font-bold justify-center"
                          : isFlexReport
                            ? "bg-gradient-to-r from-purple-600 to-violet-600 text-white shadow-lg hover:shadow-xl hover:from-purple-700 hover:to-violet-700 font-bold justify-center"
                            : isActive 
                              ? "bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground shadow-md hover:shadow-lg font-semibold" 
                              : "hover:bg-accent/50 hover:translate-x-1"
                        }
                      `}
                    >
                      <Icon className={`${isCollapsed ? "h-5 w-5" : "h-4 w-4"} ${isActive || isBookCall || isFlexReport ? "animate-pulse" : ""} ${isCollapsed || isBookCall || isFlexReport ? "mx-auto" : ""}`} />
                      {!isCollapsed && (
                        <span className={`flex items-center ${isBookCall || isFlexReport ? "justify-center w-full" : "justify-between w-full pr-1"}`}>
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
