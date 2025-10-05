import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Video } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function ScheduleDemo() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col items-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2">
            <Video className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold">Schedule a Demo</h1>
          </div>
          <p className="text-muted-foreground text-lg">
            Let our team show you how to get the most value from Auren
          </p>
        </div>

        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle>Book Your Free Demo</CardTitle>
            <CardDescription>
              Our team will walk you through the features and answer any questions you have
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full h-[700px] rounded-lg overflow-hidden border">
              <iframe
                src="https://app.usemotion.com/meet/andy-chu/aurendemo"
                className="w-full h-full"
                frameBorder="0"
                title="Schedule Demo"
              />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-primary/5 border-primary/30">
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-2">What to expect in your demo:</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Personalized walkthrough of Auren features</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Solutions to your specific cash flow challenges</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Tips and best practices for getting the most value</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Q&A session with our product experts</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
