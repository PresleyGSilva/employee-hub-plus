import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, BellRing } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Notifications() {
  const { user } = useAuth();
  const [list, setList] = useState<any[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase.from("notifications").select("*")
      .or(`user_id.eq.${user.id},is_broadcast.eq.true`)
      .order("created_at", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, [user]);

  const markAll = async () => {
    if (!user) return;
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Notificações</h1>
        <Button variant="outline" size="sm" onClick={markAll}>Marcar todas como lidas</Button>
      </div>
      <div className="space-y-3">
        {list.map((n) => (
          <Card key={n.id} className={!n.is_read ? "border-primary/40 bg-primary/5" : ""}>
            <CardContent className="p-4 flex gap-3">
              <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${!n.is_read ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {!n.is_read ? <BellRing className="h-4 w-4" /> : <Bell className="h-4 w-4" />}
              </div>
              <div className="flex-1">
                <p className="font-semibold">{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="text-xs text-muted-foreground mt-1">{new Date(n.created_at).toLocaleString("pt-BR")}</p>
              </div>
            </CardContent>
          </Card>
        ))}
        {list.length === 0 && (
          <Card><CardContent className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-2 opacity-30" /> Nenhuma notificação
          </CardContent></Card>
        )}
      </div>
    </div>
  );
}
