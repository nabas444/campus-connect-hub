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
import Projects from "./pages/dashboard/Projects";
import ProjectDetail from "./pages/dashboard/ProjectDetail";
import Messages from "./pages/dashboard/Messages";
import Billing from "./pages/dashboard/Billing";
import Earnings from "./pages/dashboard/Earnings";
import AdminPayments from "./pages/dashboard/AdminPayments";
import ExpertDirectory from "./pages/dashboard/ExpertDirectory";
import ExpertProfileView from "./pages/dashboard/ExpertProfileView";
import ExpertProfileEdit from "./pages/dashboard/ExpertProfileEdit";

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
                <Route path="assignments" element={<Projects />} />
                <Route path="assignments/:id" element={<ProjectDetail />} />
                <Route path="messages" element={<Messages />} />
                <Route path="billing" element={<Billing />} />
                <Route path="earnings" element={<ProtectedRoute allowedRoles={["expert","admin"]}><Earnings /></ProtectedRoute>} />
                <Route path="payments" element={<ProtectedRoute allowedRoles={["admin"]}><AdminPayments /></ProtectedRoute>} />
                <Route path="experts" element={<ExpertDirectory />} />
                <Route path="experts/:id" element={<ExpertProfileView />} />
                <Route path="profile" element={<ProtectedRoute allowedRoles={["expert","admin"]}><ExpertProfileEdit /></ProtectedRoute>} />
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
