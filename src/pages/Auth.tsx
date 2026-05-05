import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const signInSchema = z.object({
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(100),
});

const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Nome muito curto").max(120),
});

export default function Auth() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { session, role, loading } = useAuth();
  const [tab, setTab] = useState(params.get("mode") === "signup" ? "signup" : "signin");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && session) navigate(role === "admin" ? "/admin" : "/app", { replace: true });
  }, [session, role, loading, navigate]);

  const onSignIn = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signInSchema.safeParse({
      email: form.get("email"), password: form.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setBusy(false);
    if (error) toast.error(error.message === "Invalid login credentials" ? "E-mail ou senha incorretos" : error.message);
    else toast.success("Bem-vindo!");
  };

  const onSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const parsed = signUpSchema.safeParse({
      fullName: form.get("fullName"),
      email: form.get("email"),
      password: form.get("password"),
    });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: `${window.location.origin}/app`,
        data: { full_name: parsed.data.fullName },
      },
    });
    setBusy(false);
    if (error) toast.error(error.message.includes("registered") ? "E-mail já cadastrado" : error.message);
    else toast.success("Conta criada! Você já pode entrar.");
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* left brand */}
      <div className="md:w-1/2 gradient-hero text-white p-8 md:p-14 flex flex-col justify-between relative overflow-hidden">
        <div className="absolute -top-20 -right-20 w-96 h-96 rounded-full blur-3xl opacity-30" style={{ background: "hsl(var(--accent))" }} />
        <Link to="/" className="flex items-center gap-2 relative">
          <div className="h-10 w-10 rounded-lg gradient-accent flex items-center justify-center font-bold text-accent-foreground">W</div>
          <span className="font-bold text-xl" style={{ fontFamily: "Sora" }}>WorkFlow</span>
        </Link>
        <div className="relative">
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            Sua equipe, <br/><span className="text-accent">organizada.</span>
          </h1>
          <p className="text-white/80 text-lg max-w-md">
            Ponto, holerite, metas e comunicação — tudo em um só lugar.
          </p>
        </div>
        <p className="text-xs text-white/60 relative">© {new Date().getFullYear()} WorkFlow</p>
      </div>

      {/* right form */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-background">
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold mb-1">Acesse sua conta</h2>
          <p className="text-muted-foreground mb-6 text-sm">Use seu e-mail corporativo para entrar.</p>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="signin">Entrar</TabsTrigger>
              <TabsTrigger value="signup">Cadastrar</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form onSubmit={onSignIn} className="space-y-4">
                <div><Label htmlFor="email">E-mail</Label><Input id="email" name="email" type="email" required autoComplete="email" /></div>
                <div><Label htmlFor="password">Senha</Label><Input id="password" name="password" type="password" required autoComplete="current-password" /></div>
                <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Entrar
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form onSubmit={onSignUp} className="space-y-4">
                <div><Label htmlFor="fullName">Nome completo</Label><Input id="fullName" name="fullName" required /></div>
                <div><Label htmlFor="email2">E-mail</Label><Input id="email2" name="email" type="email" required autoComplete="email" /></div>
                <div><Label htmlFor="password2">Senha</Label><Input id="password2" name="password" type="password" required minLength={6} autoComplete="new-password" /></div>
                <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">
                  {busy && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Criar conta
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Você entrará como funcionário. Para virar admin, peça a um administrador existente.
                </p>
              </form>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
