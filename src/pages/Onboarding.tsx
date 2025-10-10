import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";
import { useSubscription } from "@/hooks/useSubscription";
import aurenIcon from "@/assets/auren-icon-blue.png";

const marketplaces = [
  { id: "ATVPDKIKX0DER", name: "United States", code: "US" },
  { id: "A2Q3Y263D00KWC", name: "Brazil", code: "BR" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", code: "MX" },
  { id: "A1PA6795UKMFR9", name: "Germany", code: "DE" },
  { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES" },
  { id: "A13V1IB3VIYZZH", name: "France", code: "FR" },
  { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK" },
  { id: "A21TJRUUN4KGV", name: "India", code: "IN" },
  { id: "A19VAU5U5O7RUS", name: "Singapore", code: "SG" },
  { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU" },
  { id: "A1VC38T7YXB528", name: "Japan", code: "JP" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addAccount } = useBankAccounts();
  const { addAmazonAccount } = useAmazonAccounts();
  const { product_id } = useSubscription();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'amazon' | 'bank'>('welcome');
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);
  const [amazonSkipped, setAmazonSkipped] = useState(false);
  const [bankSkipped, setBankSkipped] = useState(false);

  const [amazonFormData, setAmazonFormData] = useState({
    seller_id: '',
    marketplace_id: '',
    marketplace_name: '',
    account_name: '',
    refresh_token: '',
    client_id: '',
    client_secret: '',
    payout_frequency: 'bi-weekly' as 'daily' | 'bi-weekly',
  });

  // Check for enterprise parameter and show modal
  useEffect(() => {
    const isEnterprise = searchParams.get('enterprise') === 'true';
    if (isEnterprise) {
      setShowEnterpriseSetup(true);
      searchParams.delete('enterprise');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  // Also check if current product is enterprise tier
  useEffect(() => {
    if (product_id && (
      product_id === 'prod_TBOiOltXIGat2d' || // Enterprise Tier 1
      product_id === 'prod_TBOiz4xSwK3cGV' || // Enterprise Tier 2
      product_id === 'prod_TBOiTlRX4YLU4g'    // Enterprise Tier 3
    )) {
      setShowEnterpriseSetup(true);
    }
  }, [product_id]);

  const handleAddAmazonAccount = async () => {
    if (!amazonFormData.seller_id || !amazonFormData.marketplace_id || !amazonFormData.account_name) {
      toast.error("Please fill in all required fields");
      return;
    }

    const success = await addAmazonAccount(amazonFormData);
    if (success) {
      setCurrentStep('bank');
    }
  };

  const handleAddBankAccount = async () => {
    toast.info("Plaid integration requires backend setup. Skipping for now.");
    navigate('/dashboard');
  };

  const handleSkipAmazon = () => {
    setAmazonSkipped(true);
    setCurrentStep('bank');
  };

  const handleSkipBank = () => {
    setBankSkipped(true);
    navigate('/dashboard');
  };

  const handleFinish = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
      
      <div className="w-full max-w-2xl space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img src={aurenIcon} alt="Auren" className="h-16 w-auto" />
          </div>
          <div>
            <h1 className="text-4xl font-bold">Welcome to Auren!</h1>
            <p className="text-muted-foreground text-lg mt-2">
              Let's get your account set up
            </p>
          </div>
        </div>

        {/* Welcome Step */}
        {currentStep === 'welcome' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <CardTitle className="text-2xl">Get Started</CardTitle>
              <CardDescription>
                Connect your accounts to start managing your cash flow
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <ShoppingCart className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Amazon Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Amazon Seller account to track payouts and expenses
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Building2 className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Bank Account Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your bank accounts to track all your transactions
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={() => setCurrentStep('amazon')}
                className="w-full bg-gradient-primary h-12 text-base font-semibold"
              >
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Amazon Step */}
        {currentStep === 'amazon' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Connect Amazon Account</CardTitle>
              </div>
              <CardDescription>
                Enter your Amazon Seller Central credentials
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="text-center py-8 space-y-4">
                <ShoppingCart className="h-16 w-16 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold text-lg mb-2">One-Click Store Connection</h3>
                  <p className="text-muted-foreground mb-4">
                    Securely connect your Amazon store to automatically sync:
                  </p>
                  <div className="text-left max-w-md mx-auto space-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Amazon payout schedules and amounts</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Order transactions and fees</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Settlement reports</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>Refunds and chargebacks</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                      <span>FBA fees and storage costs</span>
                    </div>
                  </div>
                </div>
                
                <div className="max-w-md mx-auto pt-4">
                  <Label htmlFor="payout-frequency" className="text-left block mb-2">
                    Payout Schedule
                  </Label>
                  <Select 
                    value={amazonFormData.payout_frequency} 
                    onValueChange={(value: 'daily' | 'bi-weekly') => 
                      setAmazonFormData({...amazonFormData, payout_frequency: value})
                    }
                  >
                    <SelectTrigger id="payout-frequency" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bi-weekly">Bi-Weekly (Every 14 days)</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-2">
                    This helps us forecast your payouts accurately. You can change this later in settings.
                  </p>
                </div>
              </div>

              <Button 
                onClick={() => {
                  toast.info("Store connection API coming soon!");
                  setCurrentStep('bank');
                }}
                className="w-full bg-gradient-primary h-12 text-base font-semibold"
              >
                Connect Your Store
              </Button>

              <Button 
                onClick={handleSkipAmazon}
                variant="outline"
                className="w-full"
              >
                Skip for now
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Bank Step */}
        {currentStep === 'bank' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Building2 className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Connect Bank Account</CardTitle>
              </div>
              <CardDescription>
                Securely connect your bank account via Plaid
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {amazonSkipped && (
                <div className="p-4 bg-muted rounded-lg text-sm text-muted-foreground">
                  You skipped the Amazon connection. You can add it later in Settings.
                </div>
              )}

              <div className="text-center space-y-3">
                <Building2 className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold mb-1">Secure Bank Connection</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect your bank account securely with industry-leading protection
                  </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-xs text-left pt-2">
                  <div className="flex items-start gap-2 p-2 rounded bg-primary/5">
                    <div className="text-primary mt-0.5 text-sm">✓</div>
                    <div>
                      <div className="font-medium">Bank-Level Security</div>
                      <div className="text-muted-foreground">256-bit encryption</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded bg-primary/5">
                    <div className="text-primary mt-0.5 text-sm">✓</div>
                    <div>
                      <div className="font-medium">Read-Only Access</div>
                      <div className="text-muted-foreground">Cannot move money</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded bg-primary/5">
                    <div className="text-primary mt-0.5 text-sm">✓</div>
                    <div>
                      <div className="font-medium">Your Login Stays Private</div>
                      <div className="text-muted-foreground">We never see credentials</div>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-2 p-2 rounded bg-primary/5">
                    <div className="text-primary mt-0.5 text-sm">✓</div>
                    <div>
                      <div className="font-medium">11,000+ Banks</div>
                      <div className="text-muted-foreground">All major institutions</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSkipBank}
                  variant="outline"
                  className="flex-1"
                >
                  Skip for now
                </Button>
                <Button 
                  onClick={handleAddBankAccount}
                  className="flex-1 bg-gradient-primary"
                >
                  Connect Bank Account
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Enterprise Setup Modal */}
      <EnterpriseSetupModal 
        open={showEnterpriseSetup} 
        onOpenChange={setShowEnterpriseSetup}
      />
    </div>
  );
}
