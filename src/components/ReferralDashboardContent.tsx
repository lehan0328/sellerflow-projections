import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, TrendingUp, Users, Sparkles, Target, DollarSign, AlertCircle } from "lucide-react";
import { useReferrals } from "@/hooks/useReferrals";
import { LoadingScreen } from "@/components/LoadingScreen";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const REWARD_TIERS = [
  { referrals: 1, discount: 15, bonus: 0, duration: 3 },
  { referrals: 2, discount: 20, bonus: 0, duration: 3 },
  { referrals: 5, discount: 25, bonus: 50, duration: 3 },
  { referrals: 10, discount: 30, bonus: 100, duration: 3 },
  { referrals: 20, discount: 40, bonus: 200, duration: 3 },
  { referrals: 50, discount: 50, bonus: 1000, duration: 3 },
  { referrals: 100, discount: 0, bonus: 3000, duration: 6, special: "Free for 6 months" },
];

export function ReferralDashboardContent() {
  const { loading, referralCode, referrals, rewards, copyReferralLink, createReferralCode } = useReferrals();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [customCode, setCustomCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreateCode = async () => {
    if (!customCode.trim()) {
      setCodeError('Please enter a referral code');
      return;
    }

    setCreating(true);
    setCodeError('');
    
    const result = await createReferralCode(customCode.toUpperCase().trim());
    
    if (!result.success) {
      setCodeError(result.error || 'Failed to create code');
    } else {
      setCustomCode('');
    }
    
    setCreating(false);
  };

  const handleApplyDiscount = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("apply-referral-discount");
      
      if (error) throw error;

      toast({
        title: "Success!",
        description: data.message || "Discount applied to your subscription",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to apply discount",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <LoadingScreen message="Loading referral dashboard..." />;
  }

  const activeReferrals = referrals.filter(r => r.status === 'active').length;
  
  const currentTier = activeReferrals > 0 
    ? REWARD_TIERS.find((tier, index) => {
        const nextTier = REWARD_TIERS[index + 1];
        return activeReferrals >= tier.referrals && (!nextTier || activeReferrals < nextTier.referrals);
      })
    : null;

  return (
    <div className="space-y-6">
      {/* Important Info Alert */}
      <Alert className="border-blue-500/50 bg-blue-500/10">
        <AlertCircle className="h-4 w-4 text-blue-600" />
        <AlertTitle className="text-blue-600">Active Subscriptions Only</AlertTitle>
        <AlertDescription className="text-blue-600/80">
          Referral rewards are only earned when your friends sign up for an <strong>active paid subscription</strong>. 
          Free trial signups do not count toward your referral rewards until they convert to a paid plan.
        </AlertDescription>
      </Alert>

      {/* Pending Cash Bonus Alert */}
      {rewards && rewards.pending_cash_bonus > 0 && (
        <Alert className="border-yellow-500/50 bg-yellow-500/10">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertTitle className="text-yellow-600">Cash Bonus Available!</AlertTitle>
          <AlertDescription className="text-yellow-600/80">
            You have ${rewards.pending_cash_bonus} in pending cash bonuses. A support ticket has been created for you to redeem these rewards.
            <Button 
              variant="link" 
              className="text-yellow-600 underline pl-1 h-auto py-0"
              onClick={() => navigate('/support')}
            >
              View Support Tickets →
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Apply Discount Button */}
      {rewards && rewards.discount_percentage > 0 && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-accent/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-gradient-primary">
                  <DollarSign className="h-6 w-6 text-primary-foreground" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Referral Discount Available</h3>
                  <p className="text-sm text-muted-foreground">
                    Apply your {rewards.discount_percentage}% discount to your active subscription
                  </p>
                </div>
              </div>
              <Button 
                onClick={handleApplyDiscount}
                className="bg-gradient-primary hover-scale"
              >
                Apply Discount
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Referrals</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <Users className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {activeReferrals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {referrals.length - activeReferrals} pending (trial accounts)
            </p>
          </CardContent>
        </Card>

        <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Reward</CardTitle>
            <div className="p-2 rounded-lg bg-accent/10">
              <Gift className="h-4 w-4 text-accent-foreground" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              {currentTier ? (currentTier.special || `${currentTier.discount}% off`) : "No rewards yet"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentTier && currentTier.bonus > 0 ? `+ $${currentTier.bonus} bonus` : (currentTier ? "" : "Get 1 active referral to unlock")}
            </p>
          </CardContent>
        </Card>

        <Card className="relative group hover-scale border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <CardHeader className="relative flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <div className="p-2 rounded-lg bg-primary/10">
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="relative">
            <div className="text-3xl font-bold bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent">
              ${rewards?.total_cash_earned || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Cash bonuses earned</p>
          </CardContent>
        </Card>
      </div>

      {/* Referral Code */}
      <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card via-card/80 to-primary/5 backdrop-blur">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-primary/20 to-transparent blur-2xl" />
        <CardHeader className="relative">
          <CardTitle className="text-xl">
            {referralCode ? 'Your Referral Code' : 'Create Your Referral Code'}
          </CardTitle>
          <CardDescription>
            {referralCode 
              ? 'Share this code with fellow Amazon sellers - they\'ll enter it during signup' 
              : 'Choose a unique code that your friends will use during signup (cannot be changed later)'}
          </CardDescription>
        </CardHeader>
        <CardContent className="relative space-y-4">
          {referralCode ? (
            <>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 p-6 bg-gradient-to-r from-primary/20 to-accent/20 backdrop-blur rounded-lg border-2 border-primary/40 flex items-center justify-center">
                  <span className="font-mono text-4xl font-bold tracking-wider text-primary">
                    {referralCode}
                  </span>
                </div>
                <Button onClick={copyReferralLink} className="bg-gradient-primary hover-scale h-auto py-4">
                  <Copy className="h-5 w-5 mr-2" />
                  Copy Code
                </Button>
              </div>
              <div className="text-sm text-muted-foreground text-center sm:text-left">
                💡 Your friends enter this code during signup to unlock rewards for both of you!
              </div>
              <div className="text-xs text-muted-foreground text-center sm:text-left pt-2 border-t border-border/50">
                🎁 <strong>New user benefit:</strong> Anyone who signs up with your code gets an instant 10% discount!
              </div>
            </>
          ) : (
            <>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter your custom code (e.g., JOHN2024)"
                      value={customCode}
                      onChange={(e) => {
                        setCustomCode(e.target.value.toUpperCase());
                        setCodeError('');
                      }}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateCode()}
                      maxLength={20}
                      className="h-12 text-lg font-mono uppercase"
                      disabled={creating}
                    />
                    <p className="text-xs text-muted-foreground mt-2">
                      3-20 characters, uppercase letters and numbers only
                    </p>
                  </div>
                  <Button 
                    onClick={handleCreateCode} 
                    className="bg-gradient-primary hover-scale h-12"
                    disabled={creating || !customCode.trim()}
                  >
                    {creating ? 'Creating...' : 'Create Code'}
                  </Button>
                </div>
                
                {codeError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{codeError}</AlertDescription>
                  </Alert>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
