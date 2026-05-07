import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type Role = "admin" | "supervisor" | "employee" | null;
type ViewAs = "supervisor" | "employee" | null;

interface AuthCtx {
  session: Session | null;
  user: User | null;
  role: Role;
  isAdmin: boolean;
  isSupervisor: boolean;
  viewAs: ViewAs;
  setViewAs: (v: ViewAs) => void;
  loading: boolean;
  signOut: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  session: null, user: null, role: null, isAdmin: false, isSupervisor: false,
  viewAs: null, setViewAs: () => {}, loading: true, signOut: async () => {},
});

const VIEW_AS_KEY = "tottus_view_as";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [actualRole, setActualRole] = useState<Role>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isSupervisor, setIsSupervisor] = useState(false);
  const [viewAs, setViewAsState] = useState<ViewAs>(() => {
    const v = typeof window !== "undefined" ? localStorage.getItem(VIEW_AS_KEY) : null;
    return v === "supervisor" || v === "employee" ? v : null;
  });
  const [loading, setLoading] = useState(true);

  const setViewAs = (v: ViewAs) => {
    setViewAsState(v);
    if (v) localStorage.setItem(VIEW_AS_KEY, v);
    else localStorage.removeItem(VIEW_AS_KEY);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (s?.user) setTimeout(() => fetchRole(s.user.id), 0);
      else { setActualRole(null); setLoading(false); }
    });
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      if (s?.user) fetchRole(s.user.id);
      else setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function fetchRole(uid: string) {
    const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", uid);
    if (error) console.error("[Auth] fetchRole error:", error);
    const admin = !!data?.some((r) => r.role === "admin");
    const sup = !!data?.some((r) => r.role === "supervisor");
    setIsAdmin(admin);
    setIsSupervisor(sup);
    if (admin) setActualRole("admin");
    else if (sup) setActualRole("supervisor");
    else setActualRole("employee");
    setLoading(false);
  }

  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setActualRole(null);
    setIsAdmin(false);
    setIsSupervisor(false);
    setViewAs(null);
  }

  // Effective role: admins can view as supervisor or employee
  let role: Role = actualRole;
  if (isAdmin && viewAs) role = viewAs;

  return (
    <Ctx.Provider value={{ session, user: session?.user ?? null, role, isAdmin, isSupervisor, viewAs, setViewAs, loading, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
