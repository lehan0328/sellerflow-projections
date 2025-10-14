import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";
import { Loader2, Database } from "lucide-react";

export default function SampleDataGenerator() {
  const [isLoading, setIsLoading] = useState(false);

  const generateSampleData = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-sample-amazon-data');

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sample data created: ${data.data.payouts_created} payouts, ${data.data.transactions_created} transactions`);
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          window.location.href = '/dashboard';
        }, 2000);
      } else {
        throw new Error(data?.error || "Failed to create sample data");
      }
    } catch (error) {
      console.error("Error generating sample data:", error);
      toast.error(error instanceof Error ? error.message : "Failed to generate sample data");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted p-8">
      <div className="max-w-2xl mx-auto mt-20">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="h-6 w-6 text-primary" />
              <CardTitle>Generate Sample Amazon Data</CardTitle>
            </div>
            <CardDescription>
              Create a sample Amazon account with 6 months of historical payout and transaction data for testing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This will create:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>1 sample Amazon seller account</li>
                <li>12 bi-weekly payouts over 6 months</li>
                <li>200+ transaction records</li>
                <li>Realistic sales amounts ($5k-$15k per payout)</li>
              </ul>
            </div>

            <Button 
              onClick={generateSampleData}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Sample Data...
                </>
              ) : (
                "Generate Sample Data"
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}