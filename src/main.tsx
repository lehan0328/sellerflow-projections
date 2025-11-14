import { createRoot } from "react-dom/client";
import { ThemeProvider } from "next-themes";
import { GoogleReCaptchaProvider } from "react-google-recaptcha-v3";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <GoogleReCaptchaProvider reCaptchaKey="6Lf5AA0sAAAAAJgWKTxuUy40FjcIVEm17I3Zrmq0">
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <App />
    </ThemeProvider>
  </GoogleReCaptchaProvider>
);
