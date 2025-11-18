import { useState } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { Card } from "@/components/ui/card";

export default function GuidesConnectingBankCreditCard() {
  const [activeSection, setActiveSection] = useState("guides");
  const navigate = useNavigate();

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section !== "guides") {
      navigate(`/${section}`);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar 
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
      />
      <SidebarInset>
        <Helmet>
          <title>Connecting Bank/Credit Card - Auren</title>
          <meta name="description" content="Learn how to connect your bank and credit card accounts to Auren" />
        </Helmet>
        
        <div className="flex-1 space-y-6 p-4 md:p-6">
          <div className="sticky top-0 z-10 bg-background pb-4">
            <Button
              variant="ghost"
              onClick={() => navigate("/guides")}
              className="mb-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Guides
            </Button>
            <h1 className="text-3xl font-bold">Connecting Bank/Credit Card</h1>
          </div>

          <Card className="p-6">
            <iframe 
              src="https://scribehow.com/embed/Connect_Bankcredit_card__6vrh45DASVC-XDIVTGKtTw?removeLogo=true" 
              width="100%" 
              height="800" 
              allow="fullscreen" 
              style={{ aspectRatio: '1 / 1', border: 0, minHeight: '480px' }}
              title="Connect Bank/Credit Card"
            />
          </Card>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
