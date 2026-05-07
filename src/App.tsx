import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
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
import AdminVacations from "./pages/admin/AdminVacations";
import Vacations from "./pages/employee/Vacations";
import EmployeeFolders from "./pages/admin/EmployeeFolders";
import Teams from "./pages/admin/Teams";
import Chat from "./pages/Chat";
import ClientEntries from "./pages/ClientEntries";
import { MessageAlert } from "./components/MessageAlert";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <MessageAlert />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/chat" element={<AppLayout />}>
              <Route index element={<Chat />} />
            </Route>

            <Route path="/app" element={<AppLayout />}>
              <Route index element={<EmployeeHome />} />
              <Route path="ponto" element={<ClockIn />} />
              <Route path="holerites" element={<Payslips />} />
              <Route path="documentos" element={<Documents />} />
              <Route path="notificacoes" element={<Notifications />} />
              <Route path="metas" element={<Goals />} />
              <Route path="ferias" element={<Vacations />} />
              <Route path="clientes" element={<ClientEntries />} />
              <Route path="pontos-equipe" element={<AdminTimeEntries />} />
              <Route path="chat" element={<Chat />} />
            </Route>

            <Route path="/admin" element={<AppLayout requireAdmin />}>
              <Route index element={<AdminHome />} />
              <Route path="funcionarios" element={<Employees />} />
              <Route path="pastas" element={<EmployeeFolders />} />
              <Route path="equipes" element={<Teams />} />
              <Route path="pontos" element={<AdminTimeEntries />} />
              <Route path="holerites" element={<AdminPayslips />} />
              <Route path="notificacoes" element={<AdminNotifications />} />
              <Route path="metas" element={<AdminGoals />} />
              <Route path="ferias" element={<AdminVacations />} />
              <Route path="clientes" element={<ClientEntries />} />
              <Route path="chat" element={<Chat />} />
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
