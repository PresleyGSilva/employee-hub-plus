import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Send } from "lucide-react";

export default function AdminNotifications() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [target, setTarget] = useState("all");
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [{ data: n }, { data: p }] = await Promise.all([
      supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(50),
      supabase.from("profiles").select("id, full_name, email").eq("active", true).order("full_name"),
    ]);
    setList(n ?? []); setProfiles(p ?? []);
  };
  useEffect(() => { load(); }, []);

  const send = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const title = (f.get("title") as string).trim();
    const message = (f.get("message") as string).trim();
    if (!title || !message) { toast.error("Preencha título e mensagem"); return; }
    setBusy(true);
    if (target === "all") {
      await supabase.from("notifications").insert({ title, message, is_broadcast: true });
    } else {
      await supabase.from("notifications").insert({ title, message, user_id: target });
    }
    setBusy(false);
    toast.success("Notificação enviada");
    (e.target as HTMLFormElement).reset();
    load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Notificações</h1>
      <Card>
        <CardHeader><CardTitle>Enviar comunicado</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={send} className="space-y-3">
            <div><Label>Destinatário</Label>
              <Select value={target} onValueChange={setTarget}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">📢 Toda a equipe</SelectItem>
                  {profiles.map((p) => <SelectItem key={p.id} value={p.id}>{p.full_name || p.email}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Título</Label><Input name="title" maxLength={100} required /></div>
            <div><Label>Mensagem</Label><Textarea name="message" maxLength={500} required rows={3} /></div>
            <Button type="submit" disabled={busy} className="gradient-primary text-primary-foreground border-0">
              <Send className="h-4 w-4 mr-2" /> Enviar
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Enviadas recentemente</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {list.map((n) => (
            <div key={n.id} className="p-3 rounded-lg border">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold">{n.title}</p>
                {n.is_broadcast ? <Badge>Equipe toda</Badge> : <Badge variant="outline">Individual</Badge>}
              </div>
              <p className="text-sm text-muted-foreground">{n.message}</p>
              <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
            </div>
          ))}
          {list.length === 0 && <p className="text-center text-sm text-muted-foreground py-4">Nenhuma enviada</p>}
        </CardContent>
      </Card>
    </div>
  );
}
