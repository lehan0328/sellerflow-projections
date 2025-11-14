import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { GoogleReCaptchaProvider, useGoogleReCaptcha } from 'react-google-recaptcha-v3';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Eye, EyeOff, Check, X, Loader2 } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SignUpComponent = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { executeRecaptcha } = useGoogleReCaptcha();
  
  // Check if we're in production environment
  const isProduction = window.location.hostname === 'aurenapp.com' || 
                       window.location.hostname === 'www.aurenapp.com';
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    monthlyAmazonRevenue: '',
    referralCode: '',
    hearAboutUs: '',
  });
  const [referralCodeStatus, setReferralCodeStatus] = useState<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  const [referralCodeType, setReferralCodeType] = useState<'user' | 'affiliate' | 'custom' | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState<number>(10);
  const [durationMonths, setDurationMonths] = useState<number>(3);
  const [passwordRequirements, setPasswordRequirements] = useState({
    minLength: false,
    hasLower: false,
    hasUpper: false,
  });

  // Check for referral code or affiliate code in URL parameters
  useEffect(() => {
    const refCode = searchParams.get('ref') || searchParams.get('referral');
    const affCode = searchParams.get('aff');
    
    if (affCode) {
      // Affiliate code takes priority
      const upperCode = affCode.toUpperCase().trim();
      setSignUpData(prev => ({ ...prev, referralCode: upperCode }));
    } else if (refCode) {
      // Regular referral code
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
      setReferralCodeType(null);
      setDiscountPercentage(10);
      setDurationMonths(3);
      return;
    }

    setReferralCodeStatus('validating');

    try {
      const upperCode = code.toUpperCase();
      
      // Check unified referral_codes table (includes user, affiliate, and custom codes)
      const { data: referralCode, error } = await supabase
        .from("referral_codes")
        .select("code, code_type, discount_percentage, duration_months, current_uses, max_uses")
        .eq("code", upperCode)
        .eq("is_active", true)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No matching code found
          setReferralCodeStatus('invalid');
          setReferralCodeType(null);
          setDiscountPercentage(10);
          setDurationMonths(3);
        } else {
          console.error("Error validating referral code:", error);
          setReferralCodeStatus('invalid');
          setReferralCodeType(null);
          setDiscountPercentage(10);
          setDurationMonths(3);
        }
        return;
      }

      // Check if code has reached max uses
      if (referralCode.max_uses !== null && referralCode.current_uses >= referralCode.max_uses) {
        setReferralCodeStatus('invalid');
        setReferralCodeType(null);
        setDiscountPercentage(10);
        setDurationMonths(3);
        toast.error(`This referral code has reached its maximum usage limit (${referralCode.max_uses}/${referralCode.max_uses} uses)`);
        return;
      }

      // Code found and valid
      setReferralCodeStatus('valid');
      const validTypes = ['user', 'affiliate', 'custom'];
      const codeType = validTypes.includes(referralCode.code_type) 
        ? referralCode.code_type as 'user' | 'affiliate' | 'custom'
        : 'custom';
      setReferralCodeType(codeType);
      setDiscountPercentage(referralCode.discount_percentage || 10);
      setDurationMonths(referralCode.duration_months || 3);
    } catch (err) {
      console.error('Unexpected error validating referral code:', err);
      setReferralCodeStatus('invalid');
      setReferralCodeType(null);
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
    
    if (!signUpData.email || !signUpData.password || !signUpData.confirmPassword || !signUpData.firstName || !signUpData.lastName || !signUpData.company || !signUpData.monthlyAmazonRevenue || !signUpData.hearAboutUs) {
      toast.error('Please fill in all fields');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (signUpData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    if (!/[a-z]/.test(signUpData.password)) {
      toast.error('Password must contain at least one lowercase letter');
      return;
    }

    if (!/[A-Z]/.test(signUpData.password)) {
      toast.error('Password must contain at least one uppercase letter');
      return;
    }

    if (!acceptedTerms) {
      toast.error('Please accept the Terms of Service and Privacy Policy');
      return;
    }

    setLoading(true);
    try {
      // Only verify reCAPTCHA in production
      if (isProduction) {
        if (!executeRecaptcha) {
          toast.error('reCAPTCHA not ready. Please try again.');
          setLoading(false);
          return;
        }

        // Generate reCAPTCHA token
        const recaptchaToken = await executeRecaptcha('signup');

        // Verify reCAPTCHA token with edge function
        const { data: verifyData, error: verifyError } = await supabase.functions.invoke('verify-recaptcha', {
          body: { token: recaptchaToken }
        });

        if (verifyError || !verifyData?.success) {
          toast.error('Security verification failed. Please try again.');
          setLoading(false);
          return;
        }
      }

      const redirectUrl = `${window.location.origin}/auth`;
      
    const metadata: Record<string, any> = {
      first_name: signUpData.firstName,
      last_name: signUpData.lastName,
      company: signUpData.company,
      monthly_amazon_revenue: signUpData.monthlyAmazonRevenue,
      hear_about_us: signUpData.hearAboutUs,
    };

    // Store the referral code based on its validated type
    if (signUpData.referralCode && referralCodeStatus === 'valid' && referralCodeType) {
      const upperCode = signUpData.referralCode.toUpperCase();
      
      if (referralCodeType === 'affiliate') {
        metadata.affiliate_code = upperCode;
      } else if (referralCodeType === 'user' || referralCodeType === 'custom') {
        // Both user referral codes and custom codes go to referral_code field
        metadata.referral_code = upperCode;
      }
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
        <div className="w-full max-w-2xl space-y-6 relative z-10">
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
                        onChange={(e) => {
                          const password = e.target.value;
                          setSignUpData({ ...signUpData, password });
                          setPasswordRequirements({
                            minLength: password.length >= 8,
                            hasLower: /[a-z]/.test(password),
                            hasUpper: /[A-Z]/.test(password),
                          });
                        }}
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
                
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div className={`flex items-center gap-1.5 ${passwordRequirements.minLength ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {passwordRequirements.minLength ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 inline-block">•</span>}
                    Minimum 8 characters
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRequirements.hasLower ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {passwordRequirements.hasLower ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 inline-block">•</span>}
                    At least one lowercase letter
                  </div>
                  <div className={`flex items-center gap-1.5 ${passwordRequirements.hasUpper ? 'text-green-600 dark:text-green-400' : ''}`}>
                    {passwordRequirements.hasUpper ? <Check className="h-3 w-3" /> : <span className="h-3 w-3 inline-block">•</span>}
                    At least one uppercase letter
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="monthlyAmazonRevenue" className="text-base">Monthly Amazon Revenue</Label>
                    <Select
                      value={signUpData.monthlyAmazonRevenue}
                      onValueChange={(value) => setSignUpData({ ...signUpData, monthlyAmazonRevenue: value })}
                      disabled={loading}
                      required
                    >
                      <SelectTrigger className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all">
                        <SelectValue placeholder="Select revenue range" />
                      </SelectTrigger>
                      <SelectContent className="bg-background">
                        <SelectItem value="0-10k">$0 - $10k</SelectItem>
                        <SelectItem value="10-25k">$10k - $25k</SelectItem>
                        <SelectItem value="25-50k">$25k - $50k</SelectItem>
                        <SelectItem value="50-100k">$50k - $100k</SelectItem>
                        <SelectItem value="100-200k">$100k - $200k</SelectItem>
                        <SelectItem value="200-500k">$200k - $500k</SelectItem>
                        <SelectItem value="500k-1m">$500k - $1M</SelectItem>
                        <SelectItem value="1m+">$1M+</SelectItem>
                      </SelectContent>
                    </Select>
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
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="hearAboutUs" className="text-base">Where did you hear about us?</Label>
                  <Select
                    value={signUpData.hearAboutUs}
                    onValueChange={(value) => setSignUpData({ ...signUpData, hearAboutUs: value })}
                    disabled={loading}
                    required
                  >
                    <SelectTrigger className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all">
                      <SelectValue placeholder="Select an option" />
                    </SelectTrigger>
                    <SelectContent className="bg-background">
                      <SelectItem value="word-of-mouth">Word of mouth</SelectItem>
                      <SelectItem value="friend">Friend</SelectItem>
                      <SelectItem value="influencer">Influencer</SelectItem>
                      <SelectItem value="facebook-instagram">Facebook/Instagram</SelectItem>
                      <SelectItem value="linkedin">LinkedIn</SelectItem>
                      <SelectItem value="twitter-x">Twitter/X</SelectItem>
                      <SelectItem value="reddit">Reddit</SelectItem>
                      <SelectItem value="youtube">YouTube</SelectItem>
                      <SelectItem value="google-search">Google Search</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="amazon-app-store">Amazon App Store</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {referralCodeStatus === 'valid' && (
                  <Alert className="bg-green-500/10 border-green-500/20">
                    <Check className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-600 dark:text-green-400 text-sm">
                      {discountPercentage === 100 
                        ? `Valid code! You'll get 100% off (FREE) for ${durationMonths} ${durationMonths === 1 ? 'month' : 'months'} after your trial ends.`
                        : `Valid code! You'll get ${discountPercentage}% off for ${durationMonths} ${durationMonths === 1 ? 'month' : 'months'} after your trial ends.`
                      }
                    </AlertDescription>
                  </Alert>
                )}
                {referralCodeStatus === 'invalid' && (
                  <p className="text-xs text-destructive">
                    Invalid referral code. You can still sign up without it.
                  </p>
                )}

                <div className="flex items-start space-x-3 py-2">
                  <Checkbox
                    id="terms"
                    checked={acceptedTerms}
                    onCheckedChange={(checked) => setAcceptedTerms(checked as boolean)}
                    disabled={loading}
                    className="mt-1"
                  />
                  <Label
                    htmlFor="terms"
                    className="text-sm text-muted-foreground leading-relaxed cursor-pointer"
                  >
                    I agree to the{' '}
                    <Link
                      to="/terms-of-service"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Terms of Service
                    </Link>
                    {' '}and{' '}
                    <Link
                      to="/privacy-policy"
                      target="_blank"
                      className="text-primary hover:underline font-medium"
                    >
                      Privacy Policy
                    </Link>
                  </Label>
                </div>

                <Button
                  type="submit"
                  className="w-full h-12 text-base font-medium bg-gradient-primary shadow-lg hover:shadow-xl transition-all"
                  disabled={loading}
                >
                  {loading ? 'Starting Trial...' : 'Start 7 Day Trial - No Card Required'}
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

export const SignUp = () => {
  const isProduction = window.location.hostname === 'aurenapp.com' || 
                       window.location.hostname === 'www.aurenapp.com';
  
  if (isProduction) {
    return (
      <GoogleReCaptchaProvider reCaptchaKey="6Lf5AA0sAAAAAJgWKTxuUy40FjcIVEm17I3Zrmq0">
        <SignUpComponent />
      </GoogleReCaptchaProvider>
    );
  }
  
  return <SignUpComponent />;
};
