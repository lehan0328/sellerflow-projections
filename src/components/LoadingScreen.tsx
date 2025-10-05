import { Shield } from "lucide-react";

interface LoadingScreenProps {
  message?: string;
}

export const LoadingScreen = ({ message = "Loading..." }: LoadingScreenProps) => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background animate-fade-in">
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="relative">
            <Shield className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 rounded-full animate-ping opacity-20">
              <Shield className="h-16 w-16 text-primary" />
            </div>
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex justify-center gap-1">
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
            <div className="h-2 w-2 rounded-full bg-primary animate-bounce"></div>
          </div>
          <p className="text-muted-foreground animate-pulse">{message}</p>
        </div>
      </div>
    </div>
  );
};
