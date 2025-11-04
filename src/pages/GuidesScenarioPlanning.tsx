import { useState } from "react";
import { Helmet } from "react-helmet";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GuidesScenarioPlanning = () => {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  const handleSectionChange = (section: string) => {
    if (section === 'guides') {
      navigate('/guides');
    } else {
      navigate('/dashboard', { state: { activeSection: section } });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <SidebarInset className="flex-1 bg-background">
          <Helmet>
            <title>Scenario Planning - Auren Guides</title>
            <meta name="description" content="Plan out your cash balance projection no matter the scenario fully customizable" />
          </Helmet>

          <header className="sticky top-0 z-10 flex h-16 items-center gap-4 border-b bg-background px-6">
            <SidebarTrigger />
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => navigate('/guides')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Guides
            </Button>
            <h1 className="text-xl font-semibold">Scenario Planning</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-6xl mx-auto">
              <iframe 
                src="https://scribehow.com/embed/Scenario_Planning__u-0egx6-Sfm-XgbhoxvxTg?removeLogo=true" 
                width="100%" 
                height="800" 
                allow="fullscreen" 
                style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
                title="Scenario Planning Guide"
              />
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesScenarioPlanning;
