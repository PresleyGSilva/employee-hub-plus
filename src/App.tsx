import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AppLayout from "./components/AppLayout";
import EmployeeHome from "./pages/employee/EmployeeHome";
import ClockIn from "./pages/employee/ClockIn";
import Payslips from "./pages/employee/Payslips";
import Documents from "./pages/employee/Documents";
import Notifications from "./pages/employee/Notifications";
import Goals from "./pages/employee/Goals";
import AdminHome from "./pages/admin/AdminHome";
import Employees from "./pages/admin/Employees";
import AdminTimeEntries from "./pages/admin/AdminTimeEntries";
import AdminPayslips from "./pages/admin/AdminPayslips";
import AdminNotifications from "./pages/admin/AdminNotifications";
import AdminGoals from "./pages/admin/AdminGoals";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<EmployeeHome />} />
              <Route path="ponto" element={<ClockIn />} />
              <Route path="holerites" element={<Payslips />} />
              <Route path="documentos" element={<Documents />} />
              <Route path="notificacoes" element={<Notifications />} />
              <Route path="metas" element={<Goals />} />
            </Route>

            <Route path="/admin" element={<AppLayout requireAdmin />}>
              <Route index element={<AdminHome />} />
              <Route path="funcionarios" element={<Employees />} />
              <Route path="pontos" element={<AdminTimeEntries />} />
              <Route path="holerites" element={<AdminPayslips />} />
              <Route path="notificacoes" element={<AdminNotifications />} />
              <Route path="metas" element={<AdminGoals />} />
            </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
