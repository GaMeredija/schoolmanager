import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Router as WouterRouter } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import Router from "@/components/Router";
import DemoRouter from "@/components/DemoRouter";
import { isStaticDemo } from "@/lib/runtime";

function App() {
  const content = (
    <TooltipProvider>
      <Toaster />
      <SonnerToaster richColors position="top-right" />
      {isStaticDemo ? <DemoRouter /> : <Router />}
    </TooltipProvider>
  );

  if (isStaticDemo) {
    return <WouterRouter hook={useHashLocation}>{content}</WouterRouter>;
  }

  return content;
}

export default App;
