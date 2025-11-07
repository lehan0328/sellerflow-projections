import { PublicLayout } from "@/components/PublicLayout";
import { Helmet } from "react-helmet";

const GuidesEarlyPaymentReceived = () => {
  return (
    <PublicLayout>
      <Helmet>
        <title>Early Payment Received Guide - Auren</title>
        <meta name="description" content="Learn how to mark transactions as fully paid when receiving early payment in Auren" />
      </Helmet>
      
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">Early Payment Received</h1>
          <p className="text-lg text-muted-foreground">
            Learn how to mark transactions as fully paid step by step
          </p>
        </div>

        <div className="rounded-lg overflow-hidden shadow-lg">
          <iframe 
            src="https://scribehow.com/embed/Mark_Transactions_as_Fully_Paid__bae7GWLDTMWK9HMF2rRqyQ?removeLogo=true" 
            width="100%" 
            height="800" 
            allow="fullscreen" 
            style={{ aspectRatio: "1 / 1", border: 0, minHeight: "480px" }}
            title="Early Payment Received Guide"
          />
        </div>
      </div>
    </PublicLayout>
  );
};

export default GuidesEarlyPaymentReceived;
