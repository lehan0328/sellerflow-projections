import { useState } from "react";
import { Helmet } from "react-helmet";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

const GuidesPurchaseOrders = () => {
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
      <div className="min-h-screen flex w-full">
        <AppSidebar activeSection={activeSection} onSectionChange={handleSectionChange} />
        <SidebarInset className="flex-1">
          <Helmet>
            <title>Purchase Order Guides - Auren</title>
            <meta name="description" content="Learn how to create and manage purchase orders in Auren" />
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
            <h1 className="text-xl font-semibold">Purchase Order Guides</h1>
          </header>

          <div className="container mx-auto px-6 py-8">
            <div className="max-w-5xl mx-auto space-y-8">
              {/* Manually Adding a Purchase Order */}
              <Card className="shadow-card">
                <CardContent>
                  <div className="w-full">
                    <iframe 
                      src="https://scribehow.com/embed/Create_a_Purchase_Order_in_Auren_App__pIZzEYloSWSeCeqIdCXHQg?removeLogo=true" 
                      width="100%" 
                      height="800" 
                      allowFullScreen
                      style={{ border: 0, minHeight: '480px', aspectRatio: '1 / 1' }}
                      title="Create a Purchase Order in Auren App"
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Additional guides can be added here */}
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default GuidesPurchaseOrders;
