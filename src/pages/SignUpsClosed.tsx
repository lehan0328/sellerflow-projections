import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Lock, Mail } from "lucide-react";
import aurenIcon from "@/assets/auren-icon-blue.png";

export const SignUpsClosed = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 flex flex-col relative overflow-hidden">
      {/* Animated gradient orbs */}
      <div className="absolute top-0 left-0 w-[600px] h-[600px] bg-gradient-to-br from-primary/20 via-primary/10 to-transparent rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-gradient-to-tl from-accent/20 via-accent/10 to-transparent rounded-full blur-3xl translate-x-1/2 translate-y-1/2 animate-pulse" style={{ animationDelay: '1s' }} />
      
      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--primary)/0.03)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--primary)/0.03)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_50%,#000_70%,transparent_110%)]" />
      
      {/* Back button */}
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
              <div className="flex items-center justify-center">
                <Lock className="h-12 w-12 text-primary" />
              </div>
              <h1 className="text-4xl font-bold tracking-tight">
                Sign-Ups Temporarily Closed
              </h1>
              <p className="text-muted-foreground text-lg">
                We're preparing for our official launch and not accepting new sign-ups at this time.
              </p>
            </div>
          </div>

          <Card className="shadow-2xl border border-primary/20 backdrop-blur-xl bg-card/60 relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-accent/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardContent className="p-10 relative z-10 space-y-6">
              <div className="space-y-4 text-center">
                <div className="flex items-center justify-center">
                  <Mail className="h-16 w-16 text-primary/60" />
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold">Get Notified When We Launch</h3>
                  <p className="text-muted-foreground">
                    Join our waitlist to be among the first to know when we open registration.
                  </p>
                </div>

                <Button
                  onClick={() => navigate('/contact')}
                  className="w-full bg-gradient-primary h-12 text-base font-medium shadow-lg hover:shadow-xl transition-all"
                >
                  Join Waitlist
                </Button>
              </div>

              <div className="pt-6 border-t border-border/50 space-y-3">
                <p className="text-sm text-muted-foreground text-center">
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
