import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, ShoppingCart, CheckCircle2, ArrowRight, Sparkles, TrendingUp, Brain, Search, FileText, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useBankAccounts } from "@/hooks/useBankAccounts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";
import { useSubscription } from "@/hooks/useSubscription";
import { usePlanLimits } from "@/hooks/usePlanLimits";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { usePlaidLink } from "react-plaid-link";
import { useQueryClient } from "@tanstack/react-query";
import { PlaidAccountConfirmationDialog } from "@/components/cash-flow/plaid-account-confirmation-dialog";

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
  const { planLimits, currentPlan, isInTrial } = usePlanLimits();
  const queryClient = useQueryClient();
  
  const [currentStep, setCurrentStep] = useState<'welcome' | 'amazon' | 'bank' | 'reserve' | 'forecasting' | 'guides'>('welcome');
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);
  const [amazonSkipped, setAmazonSkipped] = useState(false);
  const [bankSkipped, setBankSkipped] = useState(false);
  const [forecastingEnabled, setForecastingEnabled] = useState(false);
  const [reserveAmount, setReserveAmount] = useState<string>('0');
  const [safetyNet, setSafetyNet] = useState<number>(8); // Default to Moderate (8)
  const [linkToken, setLinkToken] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isAmazonSyncComplete, setIsAmazonSyncComplete] = useState(false);
  const [isCheckingSyncStatus, setIsCheckingSyncStatus] = useState(false);
  const [showPlaidConfirmation, setShowPlaidConfirmation] = useState(false);
  const [plaidMetadata, setPlaidMetadata] = useState<any>(null);
  const [plaidPublicToken, setPlaidPublicToken] = useState<string | null>(null);

  // Handle step navigation from URL params (for Amazon OAuth return)
  useEffect(() => {
    const step = searchParams.get('step');
    if (step === 'bank') {
      setCurrentStep('bank');
      // Clear the param to avoid confusion
      searchParams.delete('step');
      setSearchParams(searchParams, { replace: true });
    }
  }, [searchParams, setSearchParams]);

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
    receivedRedirectUri: sessionStorage.getItem('plaid_oauth_redirect_uri') || undefined,
    onSuccess: async (public_token: string, metadata: any) => {
      // Clear the stored redirect URI
      sessionStorage.removeItem('plaid_oauth_redirect_uri');
      try {
        console.log("Plaid Link success:", metadata);
        
        // Show confirmation dialog with account selection
        setPlaidPublicToken(public_token);
        setPlaidMetadata(metadata);
        setShowPlaidConfirmation(true);
        setLinkToken(null);
      } catch (error) {
        console.error("Error handling Plaid success:", error);
        toast.error("Failed to process account connection");
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
    // Move to reserve step
    setCurrentStep('reserve');
  };

  const handleSkipReserve = async () => {
    // Only show forecasting if Amazon was connected
    if (!amazonSkipped) {
      await checkAmazonSyncStatus();
      setCurrentStep('forecasting');
    } else {
      setCurrentStep('guides');
    }
  };

  // Check if Amazon account has completed sync
  const checkAmazonSyncStatus = async () => {
    try {
      setIsCheckingSyncStatus(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: amazonAccounts } = await supabase
        .from('amazon_accounts')
        .select('initial_sync_complete')
        .eq('user_id', user.id)
        .eq('is_active', true);

      const accountReady = amazonAccounts?.some(acc => acc.initial_sync_complete);

      setIsAmazonSyncComplete(accountReady || false);
    } catch (error) {
      console.error('Error checking Amazon sync status:', error);
      setIsAmazonSyncComplete(false);
    } finally {
      setIsCheckingSyncStatus(false);
    }
  };

  // Handle confirmed Plaid accounts
  const handleConfirmPlaidAccounts = async (
    selectedAccounts: string[], 
    priorities: Record<string, number>,
    creditCardData: Record<string, { statementBalance?: string; dueDate?: string }>
  ) => {
    if (!plaidPublicToken || !plaidMetadata) return;
    
    try {
      setIsConnecting(true);
      
      // Exchange the public token for an access token via edge function
      const { data, error } = await supabase.functions.invoke('exchange-plaid-token', {
        body: { 
          publicToken: plaidPublicToken, 
          metadata: plaidMetadata,
          selectedAccountIds: selectedAccounts,
          priorities,
          creditCardData
        }
      });

      // Check for network error
      if (error) {
        console.error("Network error:", error);
        throw new Error("Network error connecting to bank");
      }
      
      // Check if edge function returned an error
      if (data?.error) {
        console.error("Edge function error:", data.error);
        throw new Error(data.error);
      }
      
      // Handle partial success
      if (data?.success) {
        if (data.failedAccounts?.length > 0) {
          const failedNames = data.failedAccounts.map((f: any) => f.name).join(', ');
          toast.success(data.message, {
            description: `Warning: Could not add ${failedNames}`,
          });
        } else {
          toast.success(data.message || "Bank accounts connected successfully!");
        }
        
        setShowPlaidConfirmation(false);
        setPlaidPublicToken(null);
        setPlaidMetadata(null);
        setCurrentStep('reserve');
      } else {
        throw new Error("Failed to connect accounts");
      }
    } catch (error: any) {
      console.error("Error exchanging token:", error);
      toast.error(error.message || "Failed to connect accounts");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSaveReserve = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please log in to continue");
        return;
      }

      // Get account_id from profile
      const { data: profile } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!profile?.account_id) {
        toast.error("Account not found");
        return;
      }

      // Save reserve amount
      const reserveValue = Number(reserveAmount) || 0;
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          account_id: profile.account_id,
          safe_spending_reserve: reserveValue,
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving reserve:', error);
        toast.error('Failed to save reserve amount');
        return;
      }

      toast.success(reserveValue > 0 
        ? `Reserve set to $${reserveValue.toLocaleString()}` 
        : 'Reserve set to $0'
      );

      // Move to forecasting step if Amazon was connected, otherwise guides
      if (!amazonSkipped) {
        await checkAmazonSyncStatus();
        setCurrentStep('forecasting');
      } else {
        setCurrentStep('guides');
      }
    } catch (error) {
      console.error('Error saving reserve:', error);
      toast.error('An error occurred');
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
        
        // If forecasting is requested, verify Amazon account has sufficient data
        if (forecastingEnabled && !amazonSkipped && !isAmazonSyncComplete) {
          toast.error("Cannot enable forecasting: Amazon sync is not complete. Please wait for sync to finish.");
          return;
        }
        
        // Save forecasting preference and reserve amount
        const { data: settingsData, error: settingsError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            account_id: profile.account_id,
            forecasts_enabled: forecastingEnabled,
            forecast_confidence_threshold: safetyNet,
            default_reserve_lag_days: 7,
            safe_spending_reserve: Number(reserveAmount) || 0,
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

        // Invalidate cache to ensure sidebar and components show updated state
        await queryClient.invalidateQueries({ queryKey: ['user-settings'] });

        // If enabled, generate initial forecasts
        if (forecastingEnabled) {
          toast.loading("Setting up your forecasts...");
          const { error: forecastError } = await supabase.functions.invoke('forecast-amazon-payouts', {
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
      // Move to guides step instead of dashboard
      setCurrentStep('guides');
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
                    <h3 className="font-semibold">Step 1: Amazon Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your Amazon Seller account to track payouts and expenses
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Building2 className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Step 2: Bank Account Connection</h3>
                    <p className="text-sm text-muted-foreground">
                      Connect your bank accounts to track all your transactions
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <Building2 className="h-6 w-6 text-primary mt-1" />
                  <div>
                    <h3 className="font-semibold">Step 3: Set Reserve Amount</h3>
                    <p className="text-sm text-muted-foreground">
                      Configure your minimum cash reserve for safe spending calculations
                    </p>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-4 rounded-lg bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border-2 border-blue-200 dark:border-blue-800">
                  <Sparkles className="h-6 w-6 text-purple-600 mt-1" />
                  <div>
                    <h3 className="font-semibold">Step 4: Mathematical Forecasting</h3>
                    <p className="text-sm text-muted-foreground">
                      Enable mathematical payout predictions based on your Amazon transaction history (requires Amazon connection)
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
                  <Label className="text-left block mb-2 text-sm font-medium">
                    Payout Schedule (Auto-Detected)
                  </Label>
                  <div className="space-y-2 p-4 bg-muted/30 rounded-lg border border-border/50">
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">Bi-Weekly (Every 14 days)</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <div className="h-2 w-2 rounded-full bg-primary" />
                      <span className="font-medium">Daily</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    We'll automatically detect your actual payout schedule from your Amazon payout history after connecting.
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
                    
                    // Include onboarding flag in redirect URI so callback knows to return to onboarding
                    const redirectUri = `${window.location.origin}/amazon-oauth-callback?from=onboarding`;
                    console.log('Step 3: Building authorization URL...');
                    console.log('Redirect URI:', redirectUri);
                    console.log('Selected marketplace:', selectedMarketplace);
                    console.log('Region:', region);
                    console.log('Consent URL:', consentBaseUrl);
                    
                    // Construct Amazon authorization URL with region-specific consent URL
                    // IMPORTANT: Use application_id (SP-API App ID), not client_id
                    // State contains marketplace_id (needed by backend)
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
                <span className="block mt-2 text-primary font-medium">
                  {isInTrial ? (
                    <>Your trial includes unlimited bank accounts</>
                  ) : (
                    <>Your {planLimits.name} plan includes {planLimits.bankConnections} bank account{planLimits.bankConnections !== 1 ? 's' : ''}</>
                  )}
                </span>
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

        {/* Reserve Amount Step */}
        {currentStep === 'reserve' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-6 w-6 text-primary" />
                <CardTitle className="text-2xl">Set Your Reserve Amount</CardTitle>
              </div>
              <CardDescription>
                Your reserve is a safety buffer - money you never want to dip below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 rounded-lg p-6 border-2 border-amber-200 dark:border-amber-800">
                <div className="flex items-start gap-3 mb-4">
                  <Brain className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Why Having a Reserve is Important</h3>
                    <p className="text-sm text-muted-foreground mb-3">
                      A reserve amount acts as your financial safety net:
                    </p>
                  </div>
                </div>
                
                <div className="space-y-3 ml-9 text-sm">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">Emergency Protection:</strong>
                      <span className="text-muted-foreground ml-1">Covers unexpected expenses without disrupting your business</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">Cash Crunch Prevention:</strong>
                      <span className="text-muted-foreground ml-1">Prevents overdrafts when payouts are delayed or returns spike</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">Accurate Safe Spending:</strong>
                      <span className="text-muted-foreground ml-1">Your "safe to spend" calculations will respect this minimum balance</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">Peace of Mind:</strong>
                      <span className="text-muted-foreground ml-1">Sleep better knowing you have a cushion for your business</span>
                    </div>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-amber-600 mt-1.5 flex-shrink-0" />
                    <div>
                      <strong className="text-amber-900 dark:text-amber-100">Seasonal Stability:</strong>
                      <span className="text-muted-foreground ml-1">Maintains stability during slow periods or seasonal dips</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <p className="text-sm text-blue-900 dark:text-blue-100 font-medium mb-2">
                    💡 Recommended Reserve Amount
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    Most sellers keep 1-2 months of operating expenses as a reserve. Common amounts range from $5,000 to $25,000 depending on business size.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reserve" className="text-sm font-medium">
                    Reserve Amount (Optional)
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      id="reserve"
                      type="number"
                      min="0"
                      step="100"
                      value={reserveAmount}
                      onChange={(e) => setReserveAmount(e.target.value)}
                      placeholder="0"
                      className="pl-8 h-12 text-lg"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can set this to $0 now and adjust it anytime in Settings.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReserveAmount('5000')}
                    className="text-xs"
                  >
                    $5,000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReserveAmount('10000')}
                    className="text-xs"
                  >
                    $10,000
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setReserveAmount('25000')}
                    className="text-xs"
                  >
                    $25,000
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={handleSkipReserve}
                  variant="outline"
                  className="flex-1"
                >
                  Skip (Set to $0)
                </Button>
                <Button 
                  onClick={handleSaveReserve}
                  className="flex-1 bg-gradient-primary"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
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
                      Our forecasting system analyzes your recent transaction data to predict future payouts:
                    </p>
                  </div>
                </div>
                
                <div className="space-y-2 ml-9 text-sm">
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Recent Transaction Analysis:</strong> Uses last 30 days of sales, fees, and activity as the primary data source</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <TrendingUp className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span><strong>Open Settlement Data:</strong> Integrates Amazon's pending payout estimates when available</span>
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

                <div className="mt-4 p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded border border-amber-300 dark:border-amber-700">
                  <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-2">
                    ⚠️ Important Limitations
                  </p>
                  <p className="text-xs text-amber-800 dark:text-amber-200">
                    Forecasts are based on historical data patterns and do not factor in sudden sale spikes or extreme drops. Our v2 model (coming soon) will include advanced anomaly detection.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    💡 Forecasting requires your Amazon account to complete its initial sync and works best with at least 30 days of recent sales activity.
                  </p>
                </div>
              </div>

              {!isAmazonSyncComplete && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                  <p className="text-sm text-amber-900 dark:text-amber-100 font-medium mb-1">
                    ⏳ Amazon Sync In Progress
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-300">
                    Mathematical forecasting will be available once your Amazon account completes its initial sync. This typically takes 15-30 minutes. You can enable it later from Settings.
                  </p>
                </div>
              )}

              {isAmazonSyncComplete && (
                <div className="space-y-2">
                  <Label htmlFor="safety-net" className="text-sm font-medium">
                    Choose Safety Net Level
                  </Label>
                  <Select
                    value={safetyNet.toString()}
                    onValueChange={(value) => setSafetyNet(Number(value))}
                  >
                    <SelectTrigger id="safety-net">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Aggressive (−3%)</span>
                          <span className="text-xs text-muted-foreground">Minimal buffer - stable sales, low returns</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="8">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Moderate (−8%) • Recommended</span>
                          <span className="text-xs text-muted-foreground">Balanced protection - typical delays & returns</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="15">
                        <div className="flex flex-col items-start">
                          <span className="font-medium">Conservative (−15%)</span>
                          <span className="text-xs text-muted-foreground">Maximum safety - volatile sales or high returns</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    The safety net reduces forecasts to account for returns, chargebacks, and reserve delays
                  </p>
                </div>
              )}

              <div className="space-y-3">
                <Button 
                  onClick={() => {
                    setForecastingEnabled(true);
                    handleFinish();
                  }}
                  disabled={!isAmazonSyncComplete}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 h-12 text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Sparkles className="h-5 w-5 mr-2" />
                  {isAmazonSyncComplete ? 'Yes, Enable Forecasting' : 'Waiting for Amazon Sync...'}
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

        {/* Guides Step */}
        {currentStep === 'guides' && (
          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/95">
            <CardHeader>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-green-600" />
                <CardTitle className="text-2xl">Setup Complete!</CardTitle>
              </div>
              <CardDescription>
                Do you want to learn our core features before we start?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent animate-gradient" style={{ backgroundSize: '200% auto' }}>
                    Signature Features
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Explore Auren's core capabilities with visual step-by-step guides
                  </p>
                </div>
                
                {/* Signature Features Preview */}
                <div className="grid gap-3">
                  <div className="group">
                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-cyan-500 to-sky-500 flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">Scenario Planning</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Plan out your cash balance projection no matter the scenario fully customizable
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-purple-500 to-violet-500 flex-shrink-0">
                          <ShoppingCart className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">Advanced PO Planning</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Project pending POs & buying opportunities
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-500 to-purple-500 flex-shrink-0">
                          <Search className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">Advanced Spending Lookup</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Find earliest date to spend any amount
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-500 flex-shrink-0">
                          <FileText className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">Spending Search by Date</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Know what you can spend on any date
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="group">
                    <div className="relative overflow-hidden rounded-lg border bg-card p-4 hover:shadow-md transition-all duration-300">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-orange-500 to-amber-500 flex-shrink-0">
                          <TrendingUp className="h-4 w-4 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">Advanced Payout Forecasting (Amazon Connection Required)</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            Forecast payouts 3 months in advance based on direct Amazon data connection
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => navigate('/dashboard')}
                  variant="outline"
                  className="flex-1"
                >
                  Skip for Now
                </Button>
                <Button 
                  onClick={() => navigate('/guides')}
                  className="flex-1 bg-gradient-primary"
                >
                  Start Learning
                  <ArrowRight className="ml-2 h-4 w-4" />
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

      {/* Plaid Account Confirmation */}
      <PlaidAccountConfirmationDialog
        open={showPlaidConfirmation}
        onOpenChange={setShowPlaidConfirmation}
        accounts={plaidMetadata?.accounts?.map((acc: any) => ({
          ...acc,
          account_id: acc.id || acc.account_id
        })) || []}
        institutionName={plaidMetadata?.institution?.name || ''}
        onConfirm={handleConfirmPlaidAccounts}
      />
    </div>
  );
}
