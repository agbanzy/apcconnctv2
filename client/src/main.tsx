import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { registerServiceWorker, setupInstallPrompt } from "./lib/registerServiceWorker";

// Register service worker for PWA functionality
registerServiceWorker();
setupInstallPrompt();

createRoot(document.getElementById("root")!).render(<App />);
