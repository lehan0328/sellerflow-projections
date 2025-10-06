import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, Eye, EyeOff } from "lucide-react";
import aurenIcon from "@/assets/auren-icon.png";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";

export const SignUp = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);

  const [signUpData, setSignUpData] = useState({
    email: searchParams.get('email') || '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    company: '',
    monthlyRevenue: '',
    marketplaces: [] as string[]
  });

  const ecommerceMarketplaces = [
    { id: 'amazon', label: 'Amazon' },
    { id: 'walmart', label: 'Walmart' },
    { id: 'shopify', label: 'Shopify' },
    { id: 'ebay', label: 'eBay' },
    { id: 'etsy', label: 'Etsy' },
    { id: 'target', label: 'Target' },
    { id: 'facebook', label: 'Facebook Marketplace' },
    { id: 'mercari', label: 'Mercari' },
    { id: 'other', label: 'Other' }
  ];

  const toggleMarketplace = (marketplaceId: string) => {
    setSignUpData(prev => ({
      ...prev,
      marketplaces: prev.marketplaces.includes(marketplaceId)
        ? prev.marketplaces.filter(m => m !== marketplaceId)
        : [...prev.marketplaces, marketplaceId]
    }));
  };

  useEffect(() => {
    // Check for enterprise parameter from checkout
    const isEnterprise = searchParams.get('enterprise') === 'true';
    
    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Navigate to manage-accounts and pass enterprise parameter
        if (isEnterprise) {
          navigate('/manage-accounts?enterprise=true');
        } else {
          navigate('/manage-accounts');
        }
      }
    };
    
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        // Navigate to manage-accounts and pass enterprise parameter
        if (isEnterprise) {
          navigate('/manage-accounts?enterprise=true');
        } else {
          navigate('/manage-accounts');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

  const validatePassword = (password: string) => {
    const hasMinLength = password.length >= 7;
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    return hasMinLength && hasLetter && hasNumber;
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUpData.email || !signUpData.password || !signUpData.firstName || !signUpData.lastName) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (signUpData.password !== signUpData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (!validatePassword(signUpData.password)) {
      toast.error('Password must be at least 7 characters long and contain at least one letter and one number');
      return;
    }

    setLoading(true);
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signUp({
        email: signUpData.email,
        password: signUpData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: signUpData.firstName,
            last_name: signUpData.lastName,
            company: signUpData.company,
            monthly_revenue: signUpData.monthlyRevenue,
            ecommerce_marketplaces: signUpData.marketplaces
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          toast.error('This email is already registered. Please sign in instead.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Account created! Please check your email to confirm.');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      
      <div className="w-full max-w-md space-y-6 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center">
            <img src={aurenIcon} alt="Auren" className="h-20 w-auto" />
          </div>
          
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Complete Your Account
            </h1>
            <p className="text-muted-foreground mt-2">
              Your payment method is saved! Create your account to get started.
            </p>
          </div>

          <div className="p-4 bg-success/10 border border-success/20 rounded-lg">
            <p className="text-sm text-success font-medium flex items-center justify-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Payment method secured! Complete your registration below.
            </p>
          </div>
        </div>

        <Card className="shadow-elevated border-2 backdrop-blur-sm bg-card/95">
          <CardContent className="p-8">
            <form onSubmit={handleSignUp} className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-sm font-medium">First Name *</Label>
                  <Input
                    id="firstName"
                    placeholder="John"
                    value={signUpData.firstName}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, firstName: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-sm font-medium">Last Name *</Label>
                  <Input
                    id="lastName"
                    placeholder="Doe"
                    value={signUpData.lastName}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, lastName: e.target.value }))}
                    required
                    className="h-11"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={signUpData.email}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                  required
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">Password *</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signUpData.password}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                    required
                    minLength={7}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Must be at least 7 characters with at least one letter and one number
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password *</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={signUpData.confirmPassword}
                    onChange={(e) => setSignUpData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    required
                    minLength={7}
                    className="h-11 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {signUpData.confirmPassword && signUpData.password !== signUpData.confirmPassword && (
                  <p className="text-xs text-destructive">
                    Passwords do not match
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="company" className="text-sm font-medium">Company/Brand Name</Label>
                <Input
                  id="company"
                  placeholder="Your Company"
                  value={signUpData.company}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, company: e.target.value }))}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="monthlyRevenue" className="text-sm font-medium">Monthly Amazon Revenue</Label>
                <Input
                  id="monthlyRevenue"
                  placeholder="e.g., $50,000"
                  value={signUpData.monthlyRevenue}
                  onChange={(e) => setSignUpData(prev => ({ ...prev, monthlyRevenue: e.target.value }))}
                  className="h-11"
                />
              </div>

              <div className="space-y-3">
                <Label className="text-sm font-medium">What other marketplaces do you sell on? (Select all that apply)</Label>
                <div className="grid grid-cols-2 gap-3">
                  {ecommerceMarketplaces.map((marketplace) => (
                    <div key={marketplace.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={marketplace.id}
                        checked={signUpData.marketplaces.includes(marketplace.id)}
                        onCheckedChange={() => toggleMarketplace(marketplace.id)}
                      />
                      <Label
                        htmlFor={marketplace.id}
                        className="text-sm font-normal cursor-pointer"
                      >
                        {marketplace.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full bg-gradient-primary h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all" disabled={loading}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Button>

              <p className="text-xs text-center text-muted-foreground">
                By creating an account, you agree to our Terms of Service and Privacy Policy
              </p>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/auth')}
              className="text-primary hover:underline font-semibold"
            >
              Sign in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
};
