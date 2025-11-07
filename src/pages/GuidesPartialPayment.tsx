import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";

const GuidesPartialPayment = () => {
  return (
    <PublicLayout>
      <Helmet>
        <title>Partial Payment Guide - Auren</title>
        <meta name="description" content="Learn how to process partial payments for transactions in Auren" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Partial Payment</h1>
          <p className="text-lg text-muted-foreground">
            Learn how to handle partially paid transactions step by step
          </p>
        </div>

        <div className="rounded-lg overflow-hidden shadow-lg">
          <iframe 
            src="https://scribehow.com/embed/Partially_Paid_Transaction__84jOvqs-RLuUDRlFDDOBwA?removeLogo=true" 
            width="100%" 
            height="800" 
            allow="fullscreen" 
            style={{ aspectRatio: "1 / 1", border: 0, minHeight: "480px" }}
            title="Partial Payment Guide"
          />
        </div>
      </div>
    </PublicLayout>
  );
};

export default GuidesPartialPayment;
