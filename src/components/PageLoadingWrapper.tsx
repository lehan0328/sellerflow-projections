import { LoadingScreen } from "./LoadingScreen";

interface PageLoadingWrapperProps {
  isLoading: boolean;
  loadingMessage?: string;
  children: React.ReactNode;
}

export const PageLoadingWrapper = ({ 
  isLoading, 
  loadingMessage = "Loading your data...", 
  children 
}: PageLoadingWrapperProps) => {
  if (isLoading) {
    return <LoadingScreen message={loadingMessage} />;
  }

  return <div className="animate-fade-in">{children}</div>;
};
