import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { PlaceholderPage } from "@/components/dashboard/PlaceholderPage";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import Overview from "./pages/dashboard/Overview";
import Tickets from "./pages/dashboard/Tickets";
import TicketDetail from "./pages/dashboard/TicketDetail";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />

              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Overview />} />
                <Route path="tickets" element={<Tickets />} />
                <Route path="tickets/:id" element={<TicketDetail />} />
                <Route path="assignments" element={<PlaceholderPage title="Assignments" description="Academic projects and milestones." />} />
                <Route path="messages" element={<PlaceholderPage title="Messages" description="Real-time chat with experts." />} />
                <Route path="billing" element={<PlaceholderPage title="Billing" description="Invoices and payments." />} />
                <Route path="reviews" element={<PlaceholderPage title="Reviews" description="Ratings and feedback." />} />
                <Route
                  path="users"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <PlaceholderPage title="Users" description="Manage all platform users." />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="analytics"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <PlaceholderPage title="Analytics" description="Platform-wide insights." />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="settings"
                  element={
                    <ProtectedRoute allowedRoles={["admin"]}>
                      <PlaceholderPage title="Settings" description="Platform configuration." />
                    </ProtectedRoute>
                  }
                />
              </Route>

              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
