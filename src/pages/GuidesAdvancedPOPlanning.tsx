import { useState } from "react";
import { Helmet } from "react-helmet";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const GuidesAdvancedPOPlanning = () => {
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
            <title>Advanced PO planning - Auren</title>
            <meta name="description" content="Project your pending POs and view updated buying opportunities" />
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
            <h1 className="text-xl font-semibold">Advanced PO planning</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-5xl mx-auto">
              <div className="rounded-lg overflow-hidden border bg-card">
                <iframe 
                  src="https://scribehow.com/embed/Advanced_PO_planning__YHybragnTCGw6JBXuziMWA?removeLogo=true" 
                  width="100%" 
                  height="800" 
                  allow="fullscreen" 
                  style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
                  title="Advanced PO planning Guide"
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesAdvancedPOPlanning;
