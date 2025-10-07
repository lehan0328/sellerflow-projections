import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Pause, TrendingDown, AlertCircle, MessageSquare, DollarSign, Zap, Video } from "lucide-react";
import { toast } from "sonner";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface CancellationFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type CancellationStep = 'reason' | 'feedback' | 'alternatives' | 'discount_offer' | 'confirmation';

const CANCELLATION_REASONS = [
  { value: 'too_expensive', label: 'Too expensive', icon: DollarSign },
  { value: 'not_using', label: "Not using it enough", icon: Pause },
  { value: 'missing_features', label: 'Missing features I need', icon: Zap },
  { value: 'found_alternative', label: 'Found a better alternative', icon: TrendingDown },
  { value: 'technical_issues', label: 'Technical issues', icon: AlertCircle },
  { value: 'temporary_pause', label: 'Need to pause temporarily', icon: Calendar },
  { value: 'other', label: 'Other reason', icon: MessageSquare },
];

export const CancellationFlow = ({ open, onOpenChange }: CancellationFlowProps) => {
  const { openCustomerPortal, discount, discount_ever_redeemed } = useSubscription();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState<CancellationStep>('reason');
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [feedback, setFeedback] = useState('');
  const [improvementFeedback, setImprovementFeedback] = useState('');
  const [loading, setLoading] = useState(false);

  const handleClose = () => {
    setCurrentStep('reason');
    setSelectedReason('');
    setFeedback('');
    setImprovementFeedback('');
    onOpenChange(false);
  };

  const handleReasonSubmit = () => {
    if (!selectedReason) {
      toast.error('Please select a reason for canceling');
      return;
    }
    setCurrentStep('alternatives');
  };

  const handleScheduleDemo = () => {
    handleClose();
    navigate('/schedule-demo');
  };

  const handleDowngrade = () => {
    toast.info('Redirecting to plan selection...');
    handleClose();
    // Could navigate to upgrade plan page
  };

  const proceedToCancel = () => {
    // Skip discount offer if user has ever redeemed it before
    if (discount_ever_redeemed) {
      setCurrentStep('feedback');
    } else {
      setCurrentStep('discount_offer');
    }
  };

  const handleAcceptDiscount = async () => {
    // Double-check if discount was ever redeemed
    if (discount_ever_redeemed) {
      toast.error('You have already redeemed the discount promotion');
      handleClose();
      return;
    }

    // Check if discount already exists
    if (discount) {
      toast.error('You already have an active discount on your subscription');
      handleClose();
      return;
    }

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const { data, error } = await supabase.functions.invoke('apply-retention-discount', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success('Great! 10% discount applied for the next 3 months 🎉');
      handleClose();
      // Add a small delay before refreshing to allow Stripe to process
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (error: any) {
      console.error('Error applying discount:', error);
      if (error.message?.includes('already been applied')) {
        toast.error('This discount has already been redeemed');
      } else {
        toast.error('Failed to apply discount. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const declineDiscountAndCancel = () => {
    setCurrentStep('feedback');
  };

  const handleFinalCancel = async () => {
    if (!improvementFeedback.trim()) {
      toast.error('Please share what we can improve before canceling');
      return;
    }

    setLoading(true);
    
    // Submit feedback
    console.log('Cancellation feedback:', {
      reason: selectedReason,
      feedback,
      improvementFeedback,
    });

    toast.success('Thank you for your feedback. Opening Stripe portal to complete cancellation...');
    
    // Open Stripe customer portal for actual cancellation
    await openCustomerPortal();
    
    setLoading(false);
    handleClose();
  };

  const getReasonIcon = (reason: string) => {
    const reasonObj = CANCELLATION_REASONS.find(r => r.value === reason);
    if (!reasonObj) return MessageSquare;
    return reasonObj.icon;
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Step 1: Select Reason */}
        {currentStep === 'reason' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">We're sorry to see you go</DialogTitle>
              <DialogDescription>
                Help us improve by letting us know why you're canceling
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
                <div className="space-y-3">
                  {CANCELLATION_REASONS.map((reason) => {
                    const Icon = reason.icon;
                    return (
                      <Label
                        key={reason.value}
                        htmlFor={reason.value}
                        className={`flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-all ${
                          selectedReason === reason.value 
                            ? 'border-primary bg-primary/5' 
                            : 'hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value={reason.value} id={reason.value} />
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="flex-1">{reason.label}</span>
                      </Label>
                    );
                  })}
                </div>
              </RadioGroup>

              {selectedReason === 'other' && (
                <div className="space-y-2">
                  <Label htmlFor="other-reason">Please tell us more</Label>
                  <Textarea
                    id="other-reason"
                    placeholder="What's your reason for canceling?"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    rows={4}
                  />
                </div>
              )}

              <div className="flex justify-end gap-2">
                <Button onClick={handleClose}>
                  Keep Subscription
                </Button>
                <Button variant="outline" onClick={handleReasonSubmit}>
                  Continue
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 2: Alternatives */}
        {currentStep === 'alternatives' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Before you go...</DialogTitle>
              <DialogDescription>
                We'd love to help address your concerns. Here are some alternatives to canceling:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Schedule Demo Option */}
              <Card className="border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Schedule a Free Demo</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Let our team show you how to get the most value from your subscription. 
                        We can address your specific concerns and show you features you might have missed.
                      </p>
                      <Button 
                        className="w-full bg-gradient-primary" 
                        onClick={handleScheduleDemo}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Demo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep('reason')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button onClick={handleClose}>
                    Keep Subscription
                  </Button>
                  <Button variant="destructive" onClick={proceedToCancel}>
                    My cashflow is perfect, cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Discount Offer */}
        {currentStep === 'discount_offer' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Before you go...</DialogTitle>
              <DialogDescription>
                We'd love to help address your concerns. Here are some alternatives to canceling:
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {/* Schedule Demo Option */}
              <Card className="border-primary/30">
                <CardContent className="p-6">
                  <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Video className="h-6 w-6 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg mb-1">Schedule a Free Demo</h3>
                      <p className="text-sm text-muted-foreground mb-3">
                        Let our team show you how to get the most value from your subscription. 
                        We can address your specific concerns and show you features you might have missed.
                      </p>
                      <Button 
                        className="w-full bg-gradient-primary" 
                        onClick={handleScheduleDemo}
                      >
                        <Calendar className="h-4 w-4 mr-2" />
                        Schedule Demo
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => setCurrentStep('alternatives')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button onClick={handleClose}>
                    Keep Subscription
                  </Button>
                  <Button variant="destructive" onClick={proceedToCancel}>
                    My cashflow is perfect, cancel
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Discount Offer */}
        {currentStep === 'discount_offer' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">Wait! Here's a Special Offer 🎁</DialogTitle>
              <DialogDescription>
                We'd love to keep you as a customer. How about 10% off for the next 3 months?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary rounded-full">
                      <DollarSign className="h-8 w-8 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-2xl">10% Off for 3 Months</h3>
                      <p className="text-muted-foreground">Keep all your features at a reduced price</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 pt-4">
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>All premium features included</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Keep all your data and connections</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>Cancel anytime during or after the discount period</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-primary">✓</span>
                      <span>No commitment required</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => setCurrentStep('alternatives')}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button 
                    variant="destructive" 
                    onClick={declineDiscountAndCancel}
                  >
                    No thanks, i dont have cashflow problems
                  </Button>
                  <Button 
                    onClick={handleAcceptDiscount}
                    disabled={loading || !!discount || !!discount_ever_redeemed}
                    className="bg-gradient-primary"
                  >
                    {loading ? 'Applying...' : (discount || discount_ever_redeemed) ? 'Discount Already Redeemed' : 'Yes! Apply 10% Discount'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 4: Final Improvement Feedback */}
        {currentStep === 'feedback' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <MessageSquare className="h-6 w-6 text-primary" />
                One Last Thing Before You Go
              </DialogTitle>
              <DialogDescription>
                Your feedback helps us improve. What would make you reconsider?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {selectedReason && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Your cancellation reason:</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getReasonIcon(selectedReason);
                      return <Icon className="h-4 w-4" />;
                    })()}
                    <span className="text-sm">
                      {CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label}
                    </span>
                  </div>
                  {feedback && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{feedback}"</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="improvement-feedback">
                  What specific improvements would keep you as a customer? *
                </Label>
                <Textarea
                  id="improvement-feedback"
                  placeholder="For example: Better mobile app, lower pricing, more integrations, faster support response times, specific features..."
                  value={improvementFeedback}
                  onChange={(e) => setImprovementFeedback(e.target.value)}
                  rows={6}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  This helps us prioritize what matters most to our customers
                </p>
              </div>

              <Card className="border-blue-500/30 bg-blue-50 dark:bg-blue-950/20">
                <CardContent className="p-4">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    💡 <strong>We're listening:</strong> Every piece of feedback is reviewed by our team and directly influences our product roadmap.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-4">
                  <p className="text-sm">
                    <strong>What happens next:</strong> After submitting, you'll be redirected to Stripe to complete the cancellation. Your access will continue until the end of your billing period.
                  </p>
                </CardContent>
              </Card>

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  // Go back to discount offer or alternatives depending on if discount was already redeemed
                  if (discount_ever_redeemed) {
                    setCurrentStep('alternatives');
                  } else {
                    setCurrentStep('discount_offer');
                  }
                }}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Keep My Subscription
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleFinalCancel}
                    disabled={loading || !improvementFeedback.trim()}
                  >
                    {loading ? 'Processing...' : 'Submit & Cancel Subscription'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Step 5: Confirmation (Legacy - keeping for back navigation) */}
        {currentStep === 'confirmation' && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-destructive" />
                Final Confirmation
              </DialogTitle>
              <DialogDescription>
                Are you absolutely sure you want to cancel your subscription?
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              <Card className="border-destructive/30 bg-destructive/5">
                <CardContent className="p-6 space-y-3">
                  <h3 className="font-semibold text-lg">What happens when you cancel:</h3>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>You'll lose access to all premium features at the end of your billing period</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Your data will be retained for 30 days, then permanently deleted</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>Bank and Amazon connections will be disconnected</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>All forecasts, reports, and historical data will be lost</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="border-primary/30 bg-primary/5">
                <CardContent className="p-4">
                  <p className="text-sm font-medium">
                    💡 <strong>Pro tip:</strong> Consider pausing your subscription instead. 
                    You'll keep all your data and can resume anytime without losing progress.
                  </p>
                </CardContent>
              </Card>

              {selectedReason && (
                <div className="space-y-2 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium">Your cancellation reason:</p>
                  <div className="flex items-center gap-2">
                    {(() => {
                      const Icon = getReasonIcon(selectedReason);
                      return <Icon className="h-4 w-4" />;
                    })()}
                    <span className="text-sm">
                      {CANCELLATION_REASONS.find(r => r.value === selectedReason)?.label}
                    </span>
                  </div>
                  {feedback && (
                    <p className="text-sm text-muted-foreground mt-2 italic">"{feedback}"</p>
                  )}
                </div>
              )}

              <div className="flex justify-between gap-2 pt-4">
                <Button variant="outline" onClick={() => {
                  // Go back to alternatives or reason depending on if discount was already redeemed
                  if (discount_ever_redeemed) {
                    setCurrentStep('alternatives');
                  } else {
                    setCurrentStep('discount_offer');
                  }
                }}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={handleClose}>
                    Keep My Subscription
                  </Button>
                  <Button 
                    variant="destructive" 
                    onClick={handleFinalCancel}
                    disabled={loading}
                  >
                    {loading ? 'Processing...' : 'Yes, Cancel Subscription'}
                  </Button>
                </div>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};
