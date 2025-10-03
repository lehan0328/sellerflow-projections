import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle, DollarSign, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);

  // Sign up form data
  const [signUpData, setSignUpData] = useState({
    email: '',
    password: '',
    firstName: '',
    lastName: '',
    company: '',
    monthlyRevenue: '',
    marketplaces: ''
  });

  // Sign in form data
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  // Reset password form data
  const [resetEmail, setResetEmail] = useState('');

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
            amazon_marketplaces: signUpData.marketplaces ? [signUpData.marketplaces] : []
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
        toast.success('Please check your email to confirm your account!');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInData.email || !signInData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: signInData.email,
        password: signInData.password,
      });

      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Invalid email or password');
        } else {
          toast.error(error.message);
        }
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      toast.error('Please enter your email address');
      return;
    }

    setLoading(true);
    try {
      // Call our custom edge function for password reset
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail,
          resetUrl: `${window.location.origin}/auth?mode=reset&email=${encodeURIComponent(resetEmail)}`
        }
      });

      if (error) {
        console.error('Password reset error:', error);
        toast.error('Failed to send reset email. Please try again.');
      } else {
        toast.success('Password reset email sent! Check your inbox for instructions.');
        setShowResetForm(false);
        setResetEmail('');
      }
    } catch (error) {
      console.error('Password reset error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`
        }
      });

      if (error) {
        toast.error(error.message);
      }
    } catch (error) {
      toast.error('Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        {/* Header */}
        <div className="text-center space-y-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/')}
            className="absolute top-4 left-4 md:top-8 md:left-8"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          
          <div className="flex items-center justify-center space-x-2">
            <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
              <DollarSign className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              CashFlow Pro
            </span>
          </div>
          
          <div>
            <h1 className="text-2xl font-bold">
              {showResetForm ? 'Reset Password' : (isSignUp ? 'Start Your Free Trial' : 'Welcome Back')}
            </h1>
            <p className="text-muted-foreground">
              {showResetForm 
                ? 'Enter your email to receive a password reset link'
                : (isSignUp 
                  ? 'Start your 7-day free trial. Credit card required, but you won\'t be charged until your trial ends.' 
                  : 'Sign in to your account to continue'
                )
              }
            </p>
            {!showResetForm && (
              <div className="mt-2 text-sm text-muted-foreground">
                {isSignUp ? (
                  <span>
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(false)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in instead
                    </button>
                  </span>
                ) : (
                  <span>
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => setIsSignUp(true)}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign up for free
                    </button>
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        <Card className="shadow-elevated">
          <CardContent className="p-6">
            {showResetForm ? (
              <div className="space-y-4">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail">Email Address</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                  </Button>
                  
                  <Button
                    type="button"
                    variant="ghost"
                    className="w-full"
                    onClick={() => setShowResetForm(false)}
                  >
                    Back to Sign In
                  </Button>
                </form>
              </div>
            ) : (
              <>
                <Tabs value={isSignUp ? 'signup' : 'signin'} onValueChange={(value) => setIsSignUp(value === 'signup')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="signin">Sign In</TabsTrigger>
                    <TabsTrigger value="signup">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-4">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signInEmail">Email Address</Label>
                        <Input
                          id="signInEmail"
                          type="email"
                          value={signInData.email}
                          onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signInPassword">Password</Label>
                        <Input
                          id="signInPassword"
                          type="password"
                          value={signInData.password}
                          onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setShowResetForm(true)}
                          className="text-sm text-primary hover:underline"
                        >
                          Forgot your password?
                        </button>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-4">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="firstName">First Name *</Label>
                          <Input
                            id="firstName"
                            value={signUpData.firstName}
                            onChange={(e) => setSignUpData(prev => ({ ...prev, firstName: e.target.value }))}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="lastName">Last Name *</Label>
                          <Input
                            id="lastName"
                            value={signUpData.lastName}
                            onChange={(e) => setSignUpData(prev => ({ ...prev, lastName: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <Input
                          id="email"
                          type="email"
                          value={signUpData.email}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, email: e.target.value }))}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password">Password *</Label>
                        <div className="relative">
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            value={signUpData.password}
                            onChange={(e) => setSignUpData(prev => ({ ...prev, password: e.target.value }))}
                            required
                            minLength={7}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          >
                            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Must be at least 7 characters with at least one letter and one number
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="company">Company/Brand Name</Label>
                        <Input
                          id="company"
                          value={signUpData.company}
                          onChange={(e) => setSignUpData(prev => ({ ...prev, company: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="monthlyRevenue">Monthly Amazon Revenue</Label>
                        <Select onValueChange={(value) => setSignUpData(prev => ({ ...prev, monthlyRevenue: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select revenue range" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="0-9k">$0 - $9,000 (Free Plan)</SelectItem>
                            <SelectItem value="10k-50k">$10,000 - $50,000 (Starter - $39/mo)</SelectItem>
                            <SelectItem value="51k-99k">$51,000 - $99,000 (Professional - $79/mo)</SelectItem>
                            <SelectItem value="100k-199k">$100,000 - $199,000 (Scale - $149/mo)</SelectItem>
                            <SelectItem value="200k+">$200,000+ (Enterprise - $279/mo)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="marketplaces">Primary Amazon Marketplace</Label>
                        <Select onValueChange={(value) => setSignUpData(prev => ({ ...prev, marketplaces: value }))}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select primary marketplace" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="us">Amazon US</SelectItem>
                            <SelectItem value="uk">Amazon UK</SelectItem>
                            <SelectItem value="ca">Amazon Canada</SelectItem>
                            <SelectItem value="eu">Amazon EU (Germany, France, Italy, Spain)</SelectItem>
                            <SelectItem value="multiple">Multiple Marketplaces</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3 pt-2">
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                          <span>7-day free trial with credit card</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                          <span>Setup takes less than 5 minutes</span>
                        </div>
                        <div className="flex items-center space-x-3 text-sm text-muted-foreground">
                          <CheckCircle className="h-4 w-4 text-success flex-shrink-0" />
                          <span>Cancel anytime, no charge if you cancel during trial</span>
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-gradient-primary" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Start Free Trial'}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Google OAuth */}
                <div className="mt-4">
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                    </div>
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full mt-4"
                    onClick={handleGoogleAuth}
                    disabled={loading}
                  >
                    <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    {loading ? 'Connecting...' : 'Continue with Google'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};