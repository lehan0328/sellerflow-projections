import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, CreditCard } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { CreateTicketDialog } from "@/components/CreateTicketDialog";

export default function PaymentRequired() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [paymentFailureDate, setPaymentFailureDate] = useState<string | null>(null);
  const [showTicketDialog, setShowTicketDialog] = useState(false);

  useEffect(() => {
    fetchPaymentInfo();
  }, []);

  const fetchPaymentInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/auth');
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('payment_failure_date, account_status')
        .eq('user_id', session.user.id)
        .single();

      if (profile?.account_status === 'active') {
        navigate('/dashboard');
        return;
      }

      setPaymentFailureDate(profile?.payment_failure_date);
    } catch (error) {
      console.error('Error fetching payment info:', error);
    }
  };

  const handleUpdatePayment = async () => {
    setIsLoading(true);
    try {
      // Try customer portal first (for existing customers)
      const { data, error } = await supabase.functions.invoke('customer-portal');
      
      if (error) {
        // If no Stripe customer exists, redirect to upgrade page to start subscription
        console.log('No customer portal available, redirecting to upgrade page');
        navigate('/upgrade');
        return;
      }
      
      if (data?.url) {
        window.open(data.url, '_blank');
        toast({
          title: "Payment Portal Opened",
          description: "Please update your payment method in the new window.",
        });
      }
    } catch (error: any) {
      console.error('Error opening payment portal:', error);
      // Redirect to upgrade page as fallback
      navigate('/upgrade');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSupport = () => {
    setShowTicketDialog(true);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mb-4">
            <AlertCircle className="h-6 w-6 text-destructive" />
          </div>
          <CardTitle className="text-2xl">Payment Required</CardTitle>
          <CardDescription>
            Your account access has been suspended due to a payment issue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {paymentFailureDate && (
            <div className="text-sm text-muted-foreground text-center">
              Payment failed on {new Date(paymentFailureDate).toLocaleDateString()}
            </div>
          )}

          <div className="space-y-3">
            <Button 
              onClick={handleUpdatePayment}
              disabled={isLoading}
              className="w-full"
              size="lg"
            >
              <CreditCard className="h-4 w-4 mr-2" />
              {isLoading ? 'Opening Payment Portal...' : 'Update Payment Method'}
            </Button>

            <Button 
              onClick={handleContactSupport}
              variant="outline"
              className="w-full"
              size="lg"
            >
              Contact Support
            </Button>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            After updating your payment method, your account will be reactivated automatically.
          </div>
        </CardContent>
      </Card>
      
      <CreateTicketDialog
        open={showTicketDialog}
        onOpenChange={setShowTicketDialog}
        defaultSubject="Payment Issue - Account Suspended"
        defaultCategory="billing"
        defaultMessage="I'm experiencing a payment issue with my account. My account has been suspended and I need assistance resolving this."
      />
    </div>
  );
}
