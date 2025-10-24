import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ShoppingCart, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Brain } from "lucide-react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";
import { useSubscription } from "@/hooks/useSubscription";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { usePlaidLink } from "react-plaid-link";

const SELLER_CENTRAL_CONSENT_URLS: Record<string, string> = {
  'NA': 'https://sellercentral.amazon.com/apps/authorize/consent',
  'EU': 'https://sellercentral-europe.amazon.com/apps/authorize/consent',
  'UK': 'https://sellercentral.amazon.co.uk/apps/authorize/consent',
  'JP': 'https://sellercentral.amazon.co.jp/apps/authorize/consent',
  'FE': 'https://sellercentral.amazon.sg/apps/authorize/consent', // Far East (SG, AU)
};

const marketplaces = [
  { id: "ATVPDKIKX0DER", name: "United States", code: "US", region: "NA" },
  { id: "A2Q3Y263D00KWC", name: "Brazil", code: "BR", region: "NA" },
  { id: "A2EUQ1WTGCTBG2", name: "Canada", code: "CA", region: "NA" },
  { id: "A1AM78C64UM0Y8", name: "Mexico", code: "MX", region: "NA" },
  { id: "A1PA6795UKMFR9", name: "Germany", code: "DE", region: "EU" },
  { id: "A1RKKUPIHCS9HS", name: "Spain", code: "ES", region: "EU" },
  { id: "A13V1IB3VIYZZH", name: "France", code: "FR", region: "EU" },
  { id: "APJ6JRA9NG5V4", name: "Italy", code: "IT", region: "EU" },
  { id: "A1F83G8C2ARO7P", name: "United Kingdom", code: "UK", region: "UK" },
  { id: "A21TJRUUN4KGV", name: "India", code: "IN", region: "EU" },
  { id: "A19VAU5U5O7RUS", name: "Singapore", code: "SG", region: "FE" },
  { id: "A39IBJ37TRP1C6", name: "Australia", code: "AU", region: "FE" },
  { id: "A1VC38T7YXB528", name: "Japan", code: "JP", region: "JP" },
];

export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { addAccount } = useBankAccounts();
  const { addAmazonAccount } = useAmazonAccounts();
  const { product_id } = useSubscription();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'amazon' | 'bank' | 'forecasting'>('welcome');
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);
  const [amazonSkipped, setAmazonSkipped] = useState(false);
  const [bankSkipped, setBankSkipped] = useState(false);
  const [forecastingEnabled, setForecastingEnabled] = useState(false);
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

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

  // Plaid Link configuration
  const plaidConfig = {
    token: linkToken,
    receivedRedirectUri: window.location.href,
    onSuccess: async (public_token: string, metadata: any) => {
      try {
        console.log("Plaid Link success:", metadata);
        
        // Exchange the public token for an access token via edge function
        const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
          body: { publicToken: public_token, metadata }
        });

        if (error) throw error;

        toast.success(data.message || "Bank account connected successfully!");
        setIsConnecting(false);
        setLinkToken(null);
        
        // Move to forecasting step if Amazon was connected
        if (!amazonSkipped) {
          setCurrentStep('forecasting');
        } else {
          navigate('/dashboard');
        }
      } catch (error) {
        console.error("Error exchanging token:", error);
        toast.error("Failed to connect account");
        setIsConnecting(false);
      }
    },
    onExit: (err: any, metadata: any) => {
      console.log("Plaid Link exit:", { err, metadata });
      if (err) {
        toast.error("Failed to connect account");
      }
      setIsConnecting(false);
    },
  };

  const { open: openPlaid, ready: plaidReady } = usePlaidLink(plaidConfig);

  // Open Plaid Link when token is available
  useEffect(() => {
    if (linkToken && plaidReady) {
      openPlaid();
    }
  }, [linkToken, plaidReady, openPlaid]);

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
    try {
      setIsConnecting(true);
      
      // Get link token from edge function
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to connect accounts");
        setIsConnecting(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-plaid-link-token', {
        body: { userId: user.id }
      });

      if (error) throw error;

      setLinkToken(data.link_token);
    } catch (error) {
      console.error("Error creating link token:", error);
      toast.error("Failed to initialize bank connection");
      setIsConnecting(false);
    }
  };

  const handleSkipAmazon = () => {
    setAmazonSkipped(true);
    setCurrentStep('bank');
  };

  const handleSkipBank = () => {
    setBankSkipped(true);
    // Only show forecasting if Amazon was connected
    if (!amazonSkipped) {
      setCurrentStep('forecasting');
    } else {
      navigate('/dashboard');
    }
  };

  const handleFinish = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/dashboard');
        return;
      }

      // Get account_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (profile?.account_id) {
        console.log('💾 Saving forecast preference:', forecastingEnabled);
        
        // If forecasting is requested, check if Amazon account has sufficient data
        if (forecastingEnabled && !amazonSkipped) {
          const { data: amazonAccounts } = await supabase
            .from('amazon_accounts')
            .select('initial_sync_complete, transaction_count')
            .eq('user_id', user.id)
            .eq('is_active', true);

          const hasAmazonAccount = amazonAccounts && amazonAccounts.length > 0;
          const accountReady = amazonAccounts?.some(acc => acc.initial_sync_complete && (acc.transaction_count || 0) >= 50);

          if (!hasAmazonAccount || !accountReady) {
            toast.warning("Amazon account needs more data before enabling forecasting. Forecasts will be enabled automatically once you sync 50+ transactions.");
            // Don't enable forecasting yet, but save the preference
            await supabase
              .from('user_settings')
              .upsert({
                user_id: user.id,
                account_id: profile.account_id,
                forecasts_enabled: false, // Will be enabled after sync completes
                forecast_confidence_threshold: 8,
                default_reserve_lag_days: 7
              }, {
                onConflict: 'user_id'
              });
            
            navigate('/dashboard');
            return;
          }
        }
        
        // Save forecasting preference
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            account_id: profile.account_id,
            forecasts_enabled: forecastingEnabled,
            forecast_confidence_threshold: 8, // Default to Moderate
            default_reserve_lag_days: 7
          }, {
            onConflict: 'user_id'
          })
          .select();

        if (settingsError) {
          console.error('❌ Error saving settings:', settingsError);
          toast.error('Failed to save forecast settings');
          return;
        }

        console.log('✅ Settings saved successfully:', settingsData);

        // If enabled, generate initial forecasts
        if (forecastingEnabled) {
          toast.loading("Setting up your forecasts...");
          const { error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts-math', {
            body: { userId: user.id }
          });
          
          if (forecastError) {
            console.error('❌ Error generating forecasts:', forecastError);
            toast.error('Forecasts enabled but initial generation failed');
          } else {
            toast.success('Forecasts enabled successfully!');
          }
        } else {
          toast.success('Onboarding complete!');
        }
      }
    } catch (error) {
      console.error('Error saving onboarding preferences:', error);
      toast.error('An error occurred during onboarding');
    } finally {
      // Small delay to ensure database writes complete
      setTimeout(() => {
        navigate('/dashboard');
      }, 1000);
    }
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
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800">
                  <Sparkles className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Mathematical Forecasting</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable AI-powered payout predictions based on your Amazon transaction history (requires Amazon connection)
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
            <CardContent className="space-y-4">
              <div className="text-center py-4 space-y-3">
                <ShoppingCart className="h-12 w-12 text-primary mx-auto" />
                <div>
                  <h3 className="font-semibold text-base mb-1">One-Click Store Connection</h3>
                  <p className="text-muted-foreground text-sm mb-3">
                    Securely connect your Amazon store to automatically sync:
                  </p>
                  <div className="text-left max-w-md mx-auto space-y-1.5 text-sm">
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
                
                <div className="max-w-md mx-auto pt-2">
                  <Label htmlFor="payout-frequency" className="text-left block mb-1.5 text-sm">
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
                onClick={async () => {
                  console.log('=== STARTING AMAZON CONNECTION FLOW (Onboarding) ===');
                  try {
                    // Get current session
                    console.log('Step 1: Getting session...');
                    const { data: { session } } = await supabase.auth.getSession();
                    console.log('Session:', session ? 'Found' : 'Not found');
                    
                    if (!session) {
                      console.error('No session found');
                      toast.error('Please log in to connect your Amazon account.');
                      return;
                    }

                    console.log('Step 2: Fetching Amazon SP-API Application ID from edge function...');
                    toast.info('Fetching Amazon connection details...');

                    // Get Amazon SP-API Application ID from backend with auth token
                    const { data, error } = await supabase.functions.invoke('get-amazon-client-id', {
                      headers: {
                        Authorization: `Bearer ${session.access_token}`,
                      },
                    });
                    
                    console.log('Edge function response:', { data, error });
                    
                    if (error) {
                      console.error('Error fetching SP-API Application ID:', error);
                      toast.error(`Failed to get Amazon credentials: ${error.message}`);
                      return;
                    }
                    
                    const applicationId = data?.clientId; // This should be SP-API Application ID
                    
                    console.log('Amazon SP-API Application ID received:', applicationId);
                    
                    if (!applicationId || applicationId === 'undefined' || applicationId === '') {
                      console.error('Invalid SP-API Application ID:', applicationId);
                      toast.error('Amazon SP-API Application ID is not configured. Please contact support.');
                      return;
                    }
                    
                    // Get the selected marketplace region
                    const selectedMarketplace = amazonFormData.marketplace_id || 'ATVPDKIKX0DER';
                    const marketplace = marketplaces.find(m => m.id === selectedMarketplace);
                    const region = marketplace?.region || 'NA';
                    const consentBaseUrl = SELLER_CENTRAL_CONSENT_URLS[region];
                    
                    const redirectUri = `${window.location.origin}/amazon-oauth-callback`;
                    console.log('Step 3: Building authorization URL...');
                    console.log('Redirect URI:', redirectUri);
                    console.log('Selected marketplace:', selectedMarketplace);
                    console.log('Region:', region);
                    console.log('Consent URL:', consentBaseUrl);
                    
                    // Construct Amazon authorization URL with region-specific consent URL
                    // IMPORTANT: Use application_id (SP-API App ID), not client_id
                    const authUrl = `${consentBaseUrl}?application_id=${applicationId}&state=${selectedMarketplace}&redirect_uri=${encodeURIComponent(redirectUri)}`;
                    
                    console.log('Amazon OAuth URL:', authUrl);
                    
                    toast.info('Redirecting to Amazon Seller Central...');
                    console.log('Step 4: Redirecting to Amazon...');
                    
                    // Open in same window to preserve session and avoid popup blockers
                    window.location.href = authUrl;
                  } catch (error) {
                    console.error('Error in Amazon connection flow:', error);
                    toast.error('Failed to initiate Amazon connection. Please try again.');
                  }
                }}
                className="w-full bg-gradient-primary h-10"
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
                  disabled={isConnecting}
                >
                  {isConnecting ? "Connecting..." : "Connect Bank Account"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Forecasting Step */}
        {currentStep === 'forecasting' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sparkles className="h-6 w-6 text-purple-600" />
                <CardTitle className="text-2xl">Mathematical Forecasting</CardTitle>
              </div>
              <CardDescription>
                Would you like to enable mathematical payout forecasting?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-lg p-6 border-2 border-blue-200 dark:border-blue-800">
                <div className="flex items-start gap-3 mb-4">
                  <Brain className="h-6 w-6 text-purple-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Mathematical Payout Forecasting</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      Our forecasting system uses sophisticated mathematical models to predict your Amazon payouts based on:
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 ml-9 text-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Transaction History:</strong> Analyzes your sales, fees, and settlement patterns</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Reserve Modeling:</strong> Calculates held reserves based on Amazon's DD+7 schedule</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Risk Adjustment:</strong> Accounts for returns, chargebacks, and seasonal variations</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Configurable Safety Nets:</strong> Choose between aggressive, moderate, or conservative forecasts</span>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-white/50 dark:bg-black/20 rounded border border-blue-300 dark:border-blue-700">
                  <p className="text-sm text-muted-foreground font-medium">
                    <strong>Note:</strong> You can enable or disable forecasts anytime from Settings. The system works best when you have at least 3 confirmed payouts for accurate predictions.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setForecastingEnabled(true);
                    handleFinish();
                  }}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base font-semibold"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  Yes, Enable Forecasting
                </Button>
                
                <Button 
                  onClick={() => {
                    setForecastingEnabled(false);
                    handleFinish();
                  }}
                  variant="outline"
                  className="w-full"
                >
                  No, I'll Enable Later
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
