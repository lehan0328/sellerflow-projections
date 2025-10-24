import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useEffect } from "react";
import { Loader2, Database, Clock, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

export default function SampleDataGenerator() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [canGenerate, setCanGenerate] = useState(true);
  const [timeRemaining, setTimeRemaining] = useState<string>("");

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('last_sample_data_generated')
        .eq('user_id', user.id)
        .single();

      if (data?.last_sample_data_generated) {
        const lastGen = new Date(data.last_sample_data_generated);
        setLastGenerated(lastGen);
        updateTimeRemaining(lastGen);
      }
    };

    fetchProfile();
  }, [user]);

  useEffect(() => {
    if (!lastGenerated) {
      setCanGenerate(true);
      return;
    }

    const interval = setInterval(() => {
      updateTimeRemaining(lastGenerated);
    }, 1000);

    return () => clearInterval(interval);
  }, [lastGenerated]);

  const updateTimeRemaining = (lastGen: Date) => {
    const now = new Date();
    const hoursSinceLastGeneration = (now.getTime() - lastGen.getTime()) / (1000 * 60 * 60);
    
    if (hoursSinceLastGeneration >= 3) {
      setCanGenerate(true);
      setTimeRemaining("");
    } else {
      setCanGenerate(false);
      const remainingMs = (3 * 60 * 60 * 1000) - (now.getTime() - lastGen.getTime());
      const hours = Math.floor(remainingMs / (1000 * 60 * 60));
      const minutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((remainingMs % (1000 * 60)) / 1000);
      setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
    }
  };

  const generateSampleData = async () => {
    if (!canGenerate) {
      toast.error("Please wait for the cooldown period to end");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-sample-amazon-data');

      if (error) throw error;

      if (data?.success) {
        toast.success(`Sample data created: ${data.data.payouts_created} payouts, ${data.data.transactions_created} transactions`);
        setLastGenerated(new Date());
        
        // Redirect to dashboard after 2 seconds
        setTimeout(() => {
          navigate('/dashboard');
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
      <div className="max-w-2xl mx-auto mt-20 space-y-6">
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
            {!canGenerate && timeRemaining && (
              <Alert variant="destructive">
                <Clock className="h-4 w-4" />
                <AlertDescription>
                  <strong>Rate Limit Active:</strong> You can generate new sample data in {timeRemaining}
                  {lastGenerated && (
                    <div className="text-xs mt-1 opacity-80">
                      Last generated: {lastGenerated.toLocaleString()}
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <div className="space-y-2 text-sm text-muted-foreground">
              <p>This will create:</p>
              <ul className="list-disc list-inside ml-2 space-y-1">
                <li>1 sample Amazon seller account</li>
                <li>12 bi-weekly payouts over 6 months</li>
                <li>1,800+ transaction records</li>
                <li>Realistic 5-figure sales amounts ($50k-$99k per payout)</li>
              </ul>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                <strong>Rate Limit:</strong> Sample data can only be generated once every 3 hours to prevent abuse.
              </AlertDescription>
            </Alert>

            <Button 
              onClick={generateSampleData}
              disabled={isLoading || !canGenerate}
              className="w-full"
              size="lg"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Sample Data...
                </>
              ) : !canGenerate ? (
                <>
                  <Clock className="h-4 w-4 mr-2" />
                  Cooldown Active ({timeRemaining})
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