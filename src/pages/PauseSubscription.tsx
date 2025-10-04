import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Pause, Clock, Shield, RefreshCcw, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function PauseSubscription() {
  const navigate = useNavigate();
  const [isPausing, setIsPausing] = useState(false);

  const handlePauseSubscription = async () => {
    setIsPausing(true);
    
    // Simulate pause action
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    toast.success('Subscription paused for 30 days. You won\'t be charged during this time.');
    setIsPausing(false);
    
    // Navigate back after success
    setTimeout(() => navigate('/subscription'), 1500);
  };

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-3xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Pause className="h-8 w-8 text-orange-600" />
            <h1 className="text-4xl font-bold">Pause Subscription</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Take a break without losing your data
          </p>
        </div>

        <Alert className="border-orange-500/50 bg-orange-500/10">
          <AlertCircle className="h-4 w-4 text-orange-600" />
          <AlertDescription>
            <strong>Important:</strong> This will pause your subscription for 30 days. You won't be charged during this time.
          </AlertDescription>
        </Alert>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>How Pause Works</CardTitle>
            <CardDescription>
              Your subscription will be temporarily paused while keeping all your data safe
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">30-Day Pause</h3>
                  <p className="text-sm text-muted-foreground">
                    Your subscription will be paused for 30 days with no charges
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="p-2 bg-green-500/10 rounded-lg">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Data Preserved</h3>
                  <p className="text-sm text-muted-foreground">
                    All your data, connections, and settings remain intact
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="p-2 bg-purple-500/10 rounded-lg">
                  <RefreshCcw className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Easy Resume</h3>
                  <p className="text-sm text-muted-foreground">
                    Resume anytime during or after the pause period
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg">
                <div className="p-2 bg-orange-500/10 rounded-lg">
                  <Pause className="h-5 w-5 text-orange-600" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Read-Only Access</h3>
                  <p className="text-sm text-muted-foreground">
                    View your data during the pause, but no new transactions
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <h3 className="font-semibold mb-3">What happens when you pause:</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Billing is paused for 30 days - no charges during this time</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>All your data remains safe and accessible in read-only mode</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>Bank and Amazon connections stay linked (no re-authentication needed)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-primary">✓</span>
                  <span>You can resume your subscription anytime with one click</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-orange-600">⚠</span>
                  <span>Live transaction syncing is paused (resumes when you unpause)</span>
                </li>
              </ul>
            </div>

            <div className="pt-4 border-t flex gap-3">
              <Button
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handlePauseSubscription}
                disabled={isPausing}
                className="flex-1"
                variant="default"
              >
                {isPausing ? (
                  <>
                    <Pause className="h-4 w-4 mr-2 animate-pulse" />
                    Pausing...
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause for 30 Days
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
