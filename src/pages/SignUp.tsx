import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    monthlyAmazonRevenue: '',
    referralCode: '',
  });
  const [referralCodeStatus, setReferralCodeStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');

  // Check for referral code in URL parameters
  useEffect(() => {
    const refCode = searchParams.get('ref') || searchParams.get('referral');
    if (refCode) {
      const upperCode = refCode.toUpperCase().trim();
      setSignUpData(prev => ({ ...prev, referralCode: upperCode }));
    }
  }, [searchParams]);

  useEffect(() => {
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate('/dashboard');
      }
    };
    
    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Referral code validation function
  const validateReferralCode = useCallback(async (code: string) => {
    if (!code || code.length < 3) {
      setReferralCodeStatus('idle');
      return;
    }

    setReferralCodeStatus('validating');

    try {
      const { data, error } = await supabase
        .from('referral_codes')
        .select('code')
        .eq('code', code.toUpperCase())
        .single();

      setReferralCodeStatus(data && !error ? 'valid' : 'invalid');
    } catch (err) {
      setReferralCodeStatus('invalid');
    }
  }, []);

  // Debounce the validation
  useEffect(() => {
    if (!signUpData.referralCode) {
      setReferralCodeStatus('idle');
      return;
    }

    const timer = setTimeout(() => {
      validateReferralCode(signUpData.referralCode);
    }, 500);

    return () => clearTimeout(timer);
  }, [signUpData.referralCode, validateReferralCode]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpData.email || !signUpData.password || !signUpData.confirmPassword || !signUpData.firstName || !signUpData.lastName || !signUpData.company || !signUpData.monthlyAmazonRevenue) {
      toast.error('Please fill in all fields');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/auth`;
      
    const metadata: Record<string, any> = {
      first_name: signUpData.firstName,
      last_name: signUpData.lastName,
      company: signUpData.company,
      monthly_amazon_revenue: signUpData.monthlyAmazonRevenue,
    };

    // Only include referral code if it's valid
    if (signUpData.referralCode && referralCodeStatus === 'valid') {
      metadata.referral_code = signUpData.referralCode.toUpperCase();
    }

    const { data, error } = await supabase.auth.signUp({
      email: signUpData.email,
      password: signUpData.password,
      options: {
        emailRedirectTo: redirectUrl,
        data: metadata
      }
    });

      if (error) throw error;

      // Check if email confirmation is required
      if (data.user && !data.session) {
        toast.success('Account created! Please check your email to verify your account before signing in.');
        // Redirect to auth page after a delay
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        // If auto-confirmed (shouldn't happen with our settings)
        toast.success('Account created successfully!');
        navigate('/onboarding');
      }
    } catch (error: any) {
      console.error('Signup error:', error);
      if (error.message.includes('already registered')) {
        toast.error('This email is already registered. Please sign in instead.');
      } else {
        toast.error(error.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      
      <div className="flex-1 flex items-center justify-center p-4 pt-8">
        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center animate-fade-in">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-2xl opacity-30 animate-pulse" />
                <div className="relative">
                  <img src={aurenIcon} alt="Auren" className="h-14 w-auto" />
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Create Your Account
              </h1>
              <p className="text-muted-foreground text-base">
                Start managing your Amazon business cash flow today
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardContent className="p-10 relative z-10">
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName" className="text-base">First Name</Label>
                    <Input
                      id="firstName"
                      type="text"
                      value={signUpData.firstName}
                      onChange={(e) => setSignUpData({ ...signUpData, firstName: e.target.value })}
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName" className="text-base">Last Name</Label>
                    <Input
                      id="lastName"
                      type="text"
                      value={signUpData.lastName}
                      onChange={(e) => setSignUpData({ ...signUpData, lastName: e.target.value })}
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company" className="text-base">Company Name</Label>
                    <Input
                      id="company"
                      type="text"
                      value={signUpData.company}
                      onChange={(e) => setSignUpData({ ...signUpData, company: e.target.value })}
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      disabled={loading}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-base">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={signUpData.email}
                      onChange={(e) => setSignUpData({ ...signUpData, email: e.target.value })}
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-base">Password</Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={signUpData.password}
                        onChange={(e) => setSignUpData({ ...signUpData, password: e.target.value })}
                        className="h-12 pr-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                        disabled={loading}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-base">Confirm Password</Label>
                    <Input
                      id="confirmPassword"
                      type={showPassword ? "text" : "password"}
                      value={signUpData.confirmPassword}
                      onChange={(e) => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      disabled={loading}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="monthlyAmazonRevenue" className="text-base">Monthly Amazon Revenue</Label>
                  <Input
                    id="monthlyAmazonRevenue"
                    type="text"
                    placeholder="e.g., $50,000 or $500k"
                    value={signUpData.monthlyAmazonRevenue}
                    onChange={(e) => setSignUpData({ ...signUpData, monthlyAmazonRevenue: e.target.value })}
                    className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                    disabled={loading}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="referralCode" className="text-base">
                    Referral Code <span className="text-muted-foreground text-sm font-normal">(Optional)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="referralCode"
                      type="text"
                      placeholder="Enter referral code"
                      value={signUpData.referralCode}
                      onChange={(e) => {
                        const value = e.target.value.toUpperCase().trim();
                        setSignUpData({ ...signUpData, referralCode: value });
                      }}
                      className="h-12 pr-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      maxLength={20}
                      disabled={loading}
                    />
                    {referralCodeStatus === 'validating' && (
                      <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 animate-spin text-muted-foreground" />
                    )}
                    {referralCodeStatus === 'valid' && (
                      <Check className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-green-500" />
                    )}
                    {referralCodeStatus === 'invalid' && (
                      <X className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-destructive" />
                    )}
                  </div>
                  {referralCodeStatus === 'valid' && (
                    <Alert className="bg-green-500/10 border-green-500/20">
                      <Check className="h-4 w-4 text-green-500" />
                      <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
                        Valid code! You'll get 10% off for 6 months after your trial ends.
                      </AlertDescription>
                    </Alert>
                  )}
                  {referralCodeStatus === 'invalid' && (
                    <p className="text-xs text-destructive">
                      Invalid referral code. You can still sign up without it.
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium bg-gradient-primary shadow-lg hover:shadow-xl transition-all"
                  disabled={loading}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </Button>
              </form>

              <div className="mt-6 pt-6 border-t border-border/50 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  Already have an account?
                </p>
                <Button
                  onClick={() => navigate('/auth')}
                  variant="outline"
                  className="w-full h-11"
                >
                  Sign In
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};
