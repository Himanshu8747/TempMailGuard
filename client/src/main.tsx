import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import "./index.css";
import { queryClient } from "./lib/queryClient";

const savedTheme = localStorage.getItem("theme") || "dark"
document.documentElement.classList.add(savedTheme)

const rootElement = document.getElementById("root")!;
const root = createRoot(rootElement);

root.render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);