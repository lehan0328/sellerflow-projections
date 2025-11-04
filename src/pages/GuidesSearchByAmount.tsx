import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const GuidesSearchByAmount = () => {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <SidebarInset className="flex-1 bg-background">
          <Helmet>
            <title>Search by Amount Guide - Auren</title>
            <meta name="description" content="Learn how to search opportunities by amount in Auren" />
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
            <h1 className="text-xl font-semibold">Search by Amount</h1>
          </header>

          <div className="container mx-auto px-6 py-8 bg-background">
            <div className="max-w-4xl mx-auto">
              <div className="rounded-lg border bg-card overflow-hidden">
                <iframe 
                  src="https://scribehow.com/embed/Search_Opportunities_by_Amount__oVVmOr3oQ9KiW2SkOo0kew?removeLogo=true" 
                  width="100%" 
                  height="800" 
                  allow="fullscreen" 
                  style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
                  title="Search by Amount Guide"
                />
              </div>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesSearchByAmount;
