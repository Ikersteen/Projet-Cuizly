import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

import { I18nextProvider } from "react-i18next";
import i18n from "@/lib/i18n";
import Header from "@/components/Header";
import ScrollToTop from "@/components/ScrollToTop";
import CookieBanner from "@/components/CookieBanner";

import Index from "./pages/Index";
import VoiceChat from "./pages/VoiceChat";
import Team from "./pages/Team";
import Legal from "./pages/Legal";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Mentions from "./pages/Mentions";
import Cookies from "./pages/Cookies";
import NotFound from "./pages/NotFound";
import RestaurantSite from "./pages/RestaurantSite";

const queryClient = new QueryClient();

const AppContent = () => {
  return (
    <div className="min-h-screen bg-background">
      <ScrollToTop />
      <Routes>
        {/* Homepage */}
        <Route path="/" element={
          <>
            <Header />
            <Index />
          </>
        } />
        
        {/* Cuizly Assistant */}
        <Route path="/cuizlyassistant" element={
          <>
            <Header />
            <VoiceChat />
          </>
        } />
        
        {/* English routes */}
        <Route path="/team" element={
          <>
            <Header />
            <Team />
          </>
        } />
        <Route path="/legal" element={
          <>
            <Header />
            <Legal />
          </>
        } />
        <Route path="/privacy" element={
          <>
            <Header />
            <Privacy />
          </>
        } />
        <Route path="/terms" element={
          <>
            <Header />
            <Terms />
          </>
        } />
        <Route path="/mentions" element={
          <>
            <Header />
            <Mentions />
          </>
        } />
        <Route path="/cookies" element={
          <>
            <Header />
            <Cookies />
          </>
        } />

        {/* French routes */}
        <Route path="/equipe" element={
          <>
            <Header />
            <Team />
          </>
        } />
        <Route path="/mentions-legales" element={
          <>
            <Header />
            <Mentions />
          </>
        } />
        <Route path="/politique-confidentialite" element={
          <>
            <Header />
            <Privacy />
          </>
        } />
        <Route path="/confidentialite" element={
          <>
            <Header />
            <Privacy />
          </>
        } />
        <Route path="/conditions-utilisation" element={
          <>
            <Header />
            <Terms />
          </>
        } />
        <Route path="/conditions" element={
          <>
            <Header />
            <Terms />
          </>
        } />
        <Route path="/politique-de-cookies" element={
          <>
            <Header />
            <Cookies />
          </>
        } />
        
        {/* Restaurant public websites */}
        <Route path="/site/:subdomain" element={<RestaurantSite />} />
        
        <Route path="*" element={<NotFound />} />
      </Routes>
    </div>
  );
};

const App = () => (
  <HelmetProvider>
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppContent />
            <CookieBanner />
          </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </I18nextProvider>
  </HelmetProvider>
);


export default App;
