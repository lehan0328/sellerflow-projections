import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { AuthProvider } from "@/contexts/AuthContext";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
    <AuthProvider>
      <App />
    </AuthProvider>
  </ThemeProvider>
);
