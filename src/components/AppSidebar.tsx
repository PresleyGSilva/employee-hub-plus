import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarHeader, SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Clock, FileText, Bell, Target, Users, FolderOpen, LogOut, Shield, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const employeeItems = [
  { title: "Início", url: "/app", icon: LayoutDashboard },
  { title: "Bater Ponto", url: "/app/ponto", icon: Clock },
  { title: "Holerites", url: "/app/holerites", icon: FileText },
  { title: "Documentos", url: "/app/documentos", icon: FolderOpen },
  { title: "Notificações", url: "/app/notificacoes", icon: Bell },
  { title: "Metas", url: "/app/metas", icon: Target },
];

const adminItems = [
  { title: "Painel Admin", url: "/admin", icon: LayoutDashboard },
  { title: "Funcionários", url: "/admin/funcionarios", icon: Users },
  { title: "Pontos", url: "/admin/pontos", icon: Clock },
  { title: "Holerites", url: "/admin/holerites", icon: FileText },
  { title: "Notificações", url: "/admin/notificacoes", icon: Bell },
  { title: "Metas", url: "/admin/metas", icon: Target },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const { role, signOut, user } = useAuth();
  const navigate = useNavigate();

  const isAdminArea = pathname.startsWith("/admin");
  const items = isAdminArea ? adminItems : employeeItems;

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="border-b border-sidebar-border px-4 py-5">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-lg gradient-accent flex items-center justify-center font-bold text-accent-foreground shadow-md">
            T
          </div>
          {!collapsed && (
            <div className="flex flex-col leading-tight">
              <span className="font-bold text-sidebar-foreground" style={{ fontFamily: "Sora" }}>Tottus Cred</span>
              <span className="text-[10px] uppercase tracking-wider text-sidebar-foreground/60">
                {isAdminArea ? "Administrador" : role === "admin" ? "Modo Funcionário" : "Funcionário"}
              </span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <NavLink to={item.url} end>
                      <item.icon className="h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        {role === "admin" && (
          <Button variant="outline" size="sm" onClick={() => navigate(isAdminArea ? "/app" : "/admin")}
            className="w-full justify-start">
            {isAdminArea ? <User className="h-4 w-4" /> : <Shield className="h-4 w-4" />}
            {!collapsed && <span className="ml-2">{isAdminArea ? "Ver como funcionário" : "Painel Admin"}</span>}
          </Button>
        )}
        {!collapsed && user && (
          <div className="text-xs text-sidebar-foreground/70 px-2 truncate">
            {user.email}
          </div>
        )}
        <Button variant="ghost" size="sm" onClick={handleSignOut}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent">
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sair</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
