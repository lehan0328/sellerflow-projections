import { ReactNode } from "react";
import { PublicHeader } from "./PublicHeader";
import { PublicFooter } from "./PublicFooter";

interface PublicLayoutProps {
  children: ReactNode;
  activePage?: string;
}

export const PublicLayout = ({ children, activePage }: PublicLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      <PublicHeader activePage={activePage} />
      <main className="flex-1">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
};
