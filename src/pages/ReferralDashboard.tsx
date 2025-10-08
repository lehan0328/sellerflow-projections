import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Copy, Gift, TrendingUp, Users, ArrowLeft, Sparkles, Target, DollarSign, AlertCircle } from "lucide-react";
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

export default function ReferralDashboard() {
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
  
  // Only show tier if user has active referrals
  const currentTier = activeReferrals > 0 
    ? REWARD_TIERS.find((tier, index) => {
        const nextTier = REWARD_TIERS[index + 1];
        return activeReferrals >= tier.referrals && (!nextTier || activeReferrals < nextTier.referrals);
      })
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 border-b">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative max-w-7xl mx-auto px-6 py-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="mb-4 hover-scale"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-gradient-primary">
              <Gift className="h-8 w-8 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-foreground to-muted-foreground bg-clip-text text-transparent">
                Auren Rewards
              </h1>
              <p className="text-muted-foreground mt-1">Refer friends and earn amazing rewards!</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-8">
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

        {/* Partners Highlight Banner - LOUD VERSION */}
        <Card className="relative overflow-hidden border-primary shadow-2xl shadow-primary/30">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary animate-gradient-xy opacity-90" />
          <div className="absolute inset-0 bg-grid-pattern opacity-20" />
          
          {/* Floating Orbs */}
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-accent/50 rounded-full blur-3xl animate-glow-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-primary/50 rounded-full blur-3xl animate-glow-pulse" style={{ animationDelay: "1s" }} />
          
          <CardContent className="relative p-10 md:p-12">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Left Side - Main Message */}
              <div className="flex-1 text-center md:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/20 backdrop-blur mb-4 animate-bounce">
                  <Sparkles className="h-5 w-5 text-primary-foreground animate-pulse" />
                  <span className="text-sm font-bold text-primary-foreground uppercase tracking-wider">
                    Limited Time Bonus
                  </span>
                </div>
                
                <h2 className="text-5xl md:text-7xl font-black mb-4 text-primary-foreground leading-none animate-scale-in">
                  EARN UP TO
                  <span className="block text-6xl md:text-8xl bg-gradient-to-r from-yellow-300 via-yellow-100 to-yellow-300 bg-clip-text text-transparent animate-pulse mt-2">
                    $3,000!
                  </span>
                </h2>
                
                <p className="text-xl md:text-2xl text-primary-foreground/90 font-semibold mb-2">
                  💰 Refer 100 friends with active subscriptions = 6 months FREE + $3,000 cash!
                </p>
                <p className="text-lg text-primary-foreground/80">
                  Start earning rewards at just 1 active subscription referral!
                </p>
              </div>

              {/* Right Side - CTA */}
              <div className="flex flex-col gap-4 items-center md:items-end">
                <Button 
                  size="lg" 
                  onClick={() => navigate("/partners")}
                  className="bg-primary-foreground text-primary hover:bg-primary-foreground/90 hover-scale group relative overflow-hidden text-lg px-8 py-6 h-auto shadow-2xl"
                >
                  <span className="relative z-10 flex items-center gap-3 font-bold">
                    <Target className="h-6 w-6" />
                    See All Reward Tiers
                  </span>
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                </Button>
                
                <div className="flex items-center gap-2 text-primary-foreground/80 text-sm">
                  <Gift className="h-4 w-4" />
                  <span className="font-medium">Rewards for active paid subscriptions</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                  
                  <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex gap-2 text-sm text-blue-600 dark:text-blue-400">
                      <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-medium">⚠️ Important:</p>
                        <ul className="list-disc list-inside space-y-1 text-xs">
                          <li>Your code cannot be changed once created</li>
                          <li>Choose something memorable and unique</li>
                          <li>Anyone using your code gets 10% off instantly</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Reward Tiers */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Reward Tiers</CardTitle>
            <CardDescription>Unlock bigger rewards as you refer more users</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {REWARD_TIERS.map((tier, index) => {
                const isUnlocked = activeReferrals >= tier.referrals;
                const isHighValue = tier.bonus >= 1000;
                return (
                  <div 
                    key={index}
                    className={`relative p-5 rounded-xl border transition-all duration-300 hover-scale ${
                      isUnlocked 
                        ? 'border-primary bg-gradient-to-r from-primary/10 to-accent/10 shadow-lg shadow-primary/10' 
                        : 'border-border/50 bg-card/50'
                    } ${isHighValue ? 'ring-2 ring-primary/50' : ''}`}
                  >
                    {isHighValue && (
                      <div className="absolute top-2 right-2">
                        <div className="px-2 py-1 rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                          TOP TIER
                        </div>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <div className={`h-2 w-2 rounded-full ${isUnlocked ? 'bg-primary animate-glow-pulse' : 'bg-muted'}`} />
                          <p className="font-semibold text-lg">
                            {tier.referrals} Referral{tier.referrals > 1 ? 's' : ''}
                          </p>
                        </div>
                        <p className="text-sm text-muted-foreground ml-4">
                          {tier.special || `${tier.discount}% off next ${tier.duration} months`}
                          {tier.bonus > 0 && (
                            <span className="ml-1 font-semibold text-primary">
                              + ${tier.bonus.toLocaleString()} cash
                            </span>
                          )}
                        </p>
                      </div>
                      {isUnlocked && (
                        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-primary">
                          <span className="text-sm font-bold text-primary-foreground">✓ Unlocked</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent Referrals */}
        <Card className="relative overflow-hidden border-primary/20 bg-gradient-to-br from-card to-card/50 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-xl">Recent Referrals</CardTitle>
            <CardDescription>Track your referral conversions</CardDescription>
          </CardHeader>
          <CardContent>
            {referrals.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-flex p-4 rounded-full bg-muted/50 mb-4">
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">
                  No referrals yet. Start sharing your link!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {referrals.slice(0, 10).map((referral) => (
                  <div 
                    key={referral.id} 
                    className="flex items-center justify-between p-4 border border-border/50 rounded-xl hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        referral.status === 'active' 
                          ? 'bg-gradient-to-br from-green-500/20 to-green-600/20' 
                          : 'bg-gradient-to-br from-yellow-500/20 to-yellow-600/20'
                      }`}>
                        <Users className={`h-5 w-5 ${
                          referral.status === 'active' ? 'text-green-600' : 'text-yellow-600'
                        }`} />
                      </div>
                      <div>
                        <p className="font-medium">Referral</p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(referral.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className={`px-4 py-1.5 rounded-full text-sm font-medium ${
                      referral.status === 'active' 
                        ? 'bg-green-500/10 text-green-600 border border-green-500/20' 
                        : 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20'
                    }`}>
                      {referral.status}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}