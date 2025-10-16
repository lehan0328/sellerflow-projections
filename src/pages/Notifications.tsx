import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BellOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Notifications = () => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="space-y-2">
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          Notifications
        </h1>
        <p className="text-muted-foreground">
          Automated notifications feature has been removed
        </p>
      </div>

      <Card className="bg-muted/50 border-muted">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="h-5 w-5 text-muted-foreground" />
            Feature Removed
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            The automated notifications feature has been removed from the application. 
            You can still view important notifications in the app through other means.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default Notifications;
