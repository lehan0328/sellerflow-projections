import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Eye, EyeOff } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { EnterpriseSetupModal } from "@/components/EnterpriseSetupModal";

export const Auth = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showNewPasswordForm, setShowNewPasswordForm] = useState(false);
  const [showEnterpriseSetup, setShowEnterpriseSetup] = useState(false);

  // Sign in form data
  const [signInData, setSignInData] = useState({
    email: '',
    password: ''
  });

  const [resetEmail, setResetEmail] = useState('');
  const [newPasswordData, setNewPasswordData] = useState({
    password: '',
    confirmPassword: ''
  });

  useEffect(() => {
    // Check if we're in password reset mode
    const mode = searchParams.get('mode');
    if (mode === 'reset') {
      setShowNewPasswordForm(true);
      return;
    }

    // Check if user is already authenticated
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        // Existing users go to dashboard
        navigate('/dashboard');
      }
    };
    
    checkAuth();

    // Listen for auth changes - redirect existing users to dashboard
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        navigate('/dashboard');
      }
      
      // Handle password recovery
      if (event === 'PASSWORD_RECOVERY') {
        setShowNewPasswordForm(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, searchParams]);

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
      // Send our custom branded email with password reset link
      const { error } = await supabase.functions.invoke('send-password-reset', {
        body: {
          email: resetEmail,
          resetUrl: `${window.location.origin}/auth?mode=reset`
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

  const handleNewPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newPasswordData.password || !newPasswordData.confirmPassword) {
      toast.error('Please fill in all fields');
      return;
    }

    if (newPasswordData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (newPasswordData.password !== newPasswordData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPasswordData.password
      });

      if (error) {
        console.error('Password update error:', error);
        toast.error('Failed to update password. Please try again.');
      } else {
        toast.success('Password updated successfully! You can now sign in.');
        setShowNewPasswordForm(false);
        setNewPasswordData({ password: '', confirmPassword: '' });
        navigate('/auth');
      }
    } catch (error) {
      console.error('Password update error:', error);
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-gradient-to-r from-primary/10 to-accent/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" style={{ animationDelay: '2s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      
      {/* Back button - fixed position */}
      <div className="relative z-10 p-4 md:p-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/')}
          className="backdrop-blur-sm bg-background/50 border border-primary/10 hover:bg-background/80 hover:border-primary/20 transition-all"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Button>
      </div>
      
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Header */}
          <div className="text-center space-y-6">
          
          <div className="flex items-center justify-center animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-primary rounded-2xl blur-2xl opacity-30 animate-pulse" />
              <div className="relative">
                <img src={aurenIcon} alt="Auren" className="h-20 w-auto" />
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h1 className="text-4xl font-bold tracking-tight">
              {showNewPasswordForm ? 'Set New Password' : showResetForm ? 'Reset Password' : 'Welcome Back'}
            </h1>
            <p className="text-muted-foreground text-lg">
              {showNewPasswordForm 
                ? 'Enter your new password below'
                : showResetForm 
                ? 'Enter your email to receive a password reset link'
                : 'Sign in to manage your Amazon business cash flow'
              }
            </p>
          </div>
        </div>

        <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/60 relative overflow-hidden group">
          {/* Card glow effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          
          <CardContent className="p-10 relative z-10">
            {showNewPasswordForm ? (
              <div className="space-y-4">
                <form onSubmit={handleNewPasswordSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="newPassword" className="text-base">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showPassword ? "text" : "password"}
                        value={newPasswordData.password}
                        onChange={(e) => setNewPasswordData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="h-12 pr-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                        placeholder="Enter new password"
                        minLength={6}
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
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={newPasswordData.confirmPassword}
                        onChange={(e) => setNewPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        required
                        className="h-12 pr-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                        placeholder="Confirm new password"
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-primary h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all" disabled={loading}>
                    {loading ? 'Updating Password...' : 'Update Password'}
                  </Button>
                </form>
              </div>
            ) : showResetForm ? (
              <div className="space-y-4">
                <form onSubmit={handlePasswordReset} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-base">Email Address</Label>
                    <Input
                      id="resetEmail"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      required
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                      placeholder="you@example.com"
                    />
                  </div>
                  
                  <Button type="submit" className="w-full bg-gradient-primary h-12 text-base font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all" disabled={loading}>
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
              <div className="space-y-6">
                <form onSubmit={handleSignIn} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="signInEmail" className="text-base font-medium">Email Address</Label>
                    <Input
                      id="signInEmail"
                      type="email"
                      placeholder="you@example.com"
                      value={signInData.email}
                      onChange={(e) => setSignInData(prev => ({ ...prev, email: e.target.value }))}
                      required
                      className="h-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="signInPassword" className="text-base font-medium">Password</Label>
                    <div className="relative">
                      <Input
                        id="signInPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={signInData.password}
                        onChange={(e) => setSignInData(prev => ({ ...prev, password: e.target.value }))}
                        required
                        className="h-12 pr-12 border-primary/20 bg-background/50 backdrop-blur-sm focus:border-primary focus:ring-primary/20 transition-all"
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

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setShowResetForm(true)}
                      className="text-sm text-primary hover:text-primary/80 font-medium transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                    >
                      Forgot your password?
                    </button>
                  </div>

                  <Button 
                    type="submit" 
                    className="w-full bg-gradient-primary h-13 text-base font-semibold shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all relative overflow-hidden group" 
                    disabled={loading}
                  >
                    <span className="relative z-10">{loading ? 'Signing In...' : 'Sign In'}</span>
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                  </Button>
                </form>


                <div className="text-center mt-8">
                  <p className="text-base text-muted-foreground">
                    Don't have an account?{' '}
                    <button
                      type="button"
                      onClick={() => navigate('/')}
                      className="text-primary hover:text-primary/80 font-semibold transition-colors relative after:absolute after:bottom-0 after:left-0 after:h-px after:w-0 after:bg-primary after:transition-all hover:after:w-full"
                    >
                      Start free trial
                    </button>
                  </p>
                </div>
              </div>
          )}
        </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
};

export default Auth;
