import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, TrendingUp, CreditCard, Repeat, ShoppingCart, Wallet, Users, Calculator, BarChart3, FolderOpen, MessageSquare, Calendar, FileBarChart } from "lucide-react";
import { Separator } from "@/components/ui/separator";
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
  { id: "book-call", title: "Book a Demo", icon: Calendar, isExternal: true, url: "https://app.usemotion.com/meet/andy-chu/AurenDemo" },
  { id: "flex-report", title: "Flex Report", icon: FileBarChart, isExternal: true, isFlexReport: true },
];

export function AppSidebar({ activeSection, onSectionChange, onFlexReportClick }: AppSidebarProps) {
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
              {sections.map((section, index) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                const isExternal = 'isExternal' in section && section.isExternal;
                const isBookCall = section.id === "book-call";
                const isFlexReport = 'isFlexReport' in section && section.isFlexReport;
                
                // Show separator after Analytics (before Document Storage)
                const showSeparator = section.id === "analytics";
                
                return (
                  <React.Fragment key={section.id}>
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        onClick={() => {
                          if (isFlexReport && onFlexReportClick) {
                            onFlexReportClick();
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
                    {showSeparator && (
                      <Separator className="my-2" />
                    )}
                  </React.Fragment>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
