import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";

const featureRequestSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100, "Name must be less than 100 characters"),
  email: z.string().trim().email("Invalid email address").max(255, "Email must be less than 255 characters"),
  subject: z.string().trim().min(1, "Subject is required").max(200, "Subject must be less than 200 characters"),
  message: z.string().trim().min(10, "Message must be at least 10 characters").max(2000, "Message must be less than 2000 characters"),
  priority: z.enum(["low", "medium", "high"], { required_error: "Please select a priority level" }),
  category: z.enum(["feature", "improvement", "bug", "integration"], { required_error: "Please select a category" })
});

type FeatureRequestForm = z.infer<typeof featureRequestSchema>;

export const FeatureRequest = () => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<FeatureRequestForm>({
    name: "",
    email: user?.email || "",
    subject: "",
    message: "",
    priority: "medium",
    category: "feature"
  });
  const [errors, setErrors] = useState<Partial<Record<keyof FeatureRequestForm, string>>>({});

  const handleInputChange = (field: keyof FeatureRequestForm, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validateForm = (): boolean => {
    try {
      featureRequestSchema.parse(formData);
      setErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const formErrors: Partial<Record<keyof FeatureRequestForm, string>> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            formErrors[err.path[0] as keyof FeatureRequestForm] = err.message;
          }
        });
        setErrors(formErrors);
      }
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast.error("Please fix the form errors before submitting");
      return;
    }

    setIsSubmitting(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-feature-request', {
        body: formData
      });

      if (error) {
        console.error("Error sending feature request:", error);
        toast.error("Failed to send feature request. Please try again.");
        return;
      }

      toast.success("Feature request sent successfully! We'll review it and get back to you.");
      
      // Reset form
      setFormData({
        name: "",
        email: user?.email || "",
        subject: "",
        message: "",
        priority: "medium",
        category: "feature"
      });
      
    } catch (error) {
      console.error("Error:", error);
      toast.error("Failed to send feature request. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'text-destructive';
      case 'medium': return 'text-yellow-600';
      case 'low': return 'text-green-600';
      default: return 'text-muted-foreground';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feature': return '✨';
      case 'improvement': return '📈';
      case 'bug': return '🐛';
      case 'integration': return '🔗';
      default: return '💡';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <MessageSquare className="h-5 w-5" />
          <span>Feature Request</span>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Help us improve by sharing your ideas, reporting issues, or suggesting enhancements.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Your Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter your full name"
                className={errors.name ? "border-destructive" : ""}
              />
              {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
            </div>
            <div>
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="your.email@example.com"
                className={errors.email ? "border-destructive" : ""}
              />
              {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => handleInputChange('category', value)}>
                <SelectTrigger className={errors.category ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="feature">
                    <span className="flex items-center space-x-2">
                      <span>{getCategoryIcon('feature')}</span>
                      <span>New Feature</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="improvement">
                    <span className="flex items-center space-x-2">
                      <span>{getCategoryIcon('improvement')}</span>
                      <span>Improvement</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="bug">
                    <span className="flex items-center space-x-2">
                      <span>{getCategoryIcon('bug')}</span>
                      <span>Bug Report</span>
                    </span>
                  </SelectItem>
                  <SelectItem value="integration">
                    <span className="flex items-center space-x-2">
                      <span>{getCategoryIcon('integration')}</span>
                      <span>Integration Request</span>
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.category && <p className="text-xs text-destructive mt-1">{errors.category}</p>}
            </div>
            <div>
              <Label htmlFor="priority">Priority Level *</Label>
              <Select value={formData.priority} onValueChange={(value) => handleInputChange('priority', value)}>
                <SelectTrigger className={errors.priority ? "border-destructive" : ""}>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">
                    <span className={getPriorityColor('low')}>Low Priority</span>
                  </SelectItem>
                  <SelectItem value="medium">
                    <span className={getPriorityColor('medium')}>Medium Priority</span>
                  </SelectItem>
                  <SelectItem value="high">
                    <span className={getPriorityColor('high')}>High Priority</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              {errors.priority && <p className="text-xs text-destructive mt-1">{errors.priority}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input
              id="subject"
              value={formData.subject}
              onChange={(e) => handleInputChange('subject', e.target.value)}
              placeholder="Brief description of your request"
              className={errors.subject ? "border-destructive" : ""}
            />
            {errors.subject && <p className="text-xs text-destructive mt-1">{errors.subject}</p>}
          </div>

          <div>
            <Label htmlFor="message">Detailed Description *</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              placeholder="Please provide as much detail as possible about your request, including any specific use cases or expected behavior..."
              rows={6}
              className={errors.message ? "border-destructive" : ""}
            />
            {errors.message && <p className="text-xs text-destructive mt-1">{errors.message}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {formData.message.length}/2000 characters
            </p>
          </div>

          <div className="flex items-center justify-between pt-4">
            <p className="text-xs text-muted-foreground">
              * Required fields. Your request will be sent directly to our development team.
            </p>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Request
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-muted/50 rounded-lg">
          <h4 className="font-medium mb-2 text-sm">What happens next?</h4>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• Your request will be reviewed by our development team</li>
            <li>• We'll prioritize based on user impact and technical feasibility</li>
            <li>• You'll receive updates on the status via email</li>
            <li>• Feature releases are typically included in our monthly updates</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};