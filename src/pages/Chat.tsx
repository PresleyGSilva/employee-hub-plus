import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle, Search } from "lucide-react";
import { toast } from "sonner";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

interface Contact {
  id: string;
  full_name: string | null;
  email: string;
  avatar_url?: string | null;
  team_id?: string | null;
}

export default function Chat() {
  const { user, role, isAdmin } = useAuth();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [active, setActive] = useState<Contact | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [search, setSearch] = useState("");
  const [lastMsgs, setLastMsgs] = useState<Record<string, Msg>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const endRef = useRef<HTMLDivElement>(null);

  const loadContacts = async () => {
    if (!user) return;
    let list: Contact[] = [];

    if (isAdmin || role === "admin") {
      // Admin sees everyone
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, team_id")
        .eq("active", true)
        .neq("id", user.id)
        .order("full_name");
      list = data ?? [];
    } else {
      // Get my team
      const { data: me } = await supabase.from("profiles").select("team_id").eq("id", user.id).maybeSingle();
      const teamId = me?.team_id;
      // Always allow chatting with admins
      const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const adminIds = (adminRoles ?? []).map((r) => r.user_id);

      const ids = new Set<string>(adminIds);

      if (teamId) {
        const { data: mates } = await supabase
          .from("profiles")
          .select("id")
          .eq("team_id", teamId)
          .eq("active", true);
        mates?.forEach((m) => ids.add(m.id));
      }
      ids.delete(user.id);
      if (ids.size === 0) { setContacts([]); return; }
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, team_id")
        .in("id", Array.from(ids))
        .order("full_name");
      list = data ?? [];
    }

    setContacts(list);

    // Load last message + unread per contact
    if (list.length > 0) {
      const ids = list.map((c) => c.id);
      const { data: msgs } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.in.(${ids.join(",")}),recipient_id.in.(${ids.join(",")})`)
        .order("created_at", { ascending: false })
        .limit(500);

      const lm: Record<string, Msg> = {};
      const un: Record<string, number> = {};
      (msgs ?? []).forEach((m: any) => {
        const other = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (!ids.includes(other)) return;
        if (!lm[other]) lm[other] = m;
        if (m.recipient_id === user.id && !m.is_read) un[other] = (un[other] ?? 0) + 1;
      });
      setLastMsgs(lm); setUnread(un);
    }
  };

  const loadMessages = async () => {
    if (!user || !active) return;
    const { data } = await supabase
      .from("messages")
      .select("*")
      .or(`and(sender_id.eq.${user.id},recipient_id.eq.${active.id}),and(sender_id.eq.${active.id},recipient_id.eq.${user.id})`)
      .order("created_at");
    setMessages((data ?? []) as Msg[]);
    await supabase.from("messages").update({ is_read: true }).eq("recipient_id", user.id).eq("sender_id", active.id).eq("is_read", false);
    setUnread((u) => ({ ...u, [active.id]: 0 }));
  };

  useEffect(() => { loadContacts(); }, [user, role, isAdmin]);
  useEffect(() => { loadMessages(); }, [active, user]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as Msg;
          setLastMsgs((prev) => ({ ...prev, [m.sender_id]: m }));
          if (active && m.sender_id === active.id) {
            setMessages((prev) => [...prev, m]);
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then();
          } else {
            setUnread((u) => ({ ...u, [m.sender_id]: (u[m.sender_id] ?? 0) + 1 }));
          }
        })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user, active]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const send = async () => {
    if (!text.trim() || !user || !active) return;
    const content = text.trim();
    setText("");
    const { data, error } = await supabase.from("messages")
      .insert({ sender_id: user.id, recipient_id: active.id, content })
      .select().single();
    if (error) { toast.error(error.message); return; }
    setMessages((prev) => [...prev, data as Msg]);
    setLastMsgs((prev) => ({ ...prev, [active.id]: data as Msg }));
  };

  const sortedFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = contacts.filter((c) => {
      if (!q) return true;
      return (c.full_name || "").toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => {
      const ta = lastMsgs[a.id]?.created_at ?? "";
      const tb = lastMsgs[b.id]?.created_at ?? "";
      if (ta && tb) return tb.localeCompare(ta);
      if (ta) return -1;
      if (tb) return 1;
      return (a.full_name || a.email).localeCompare(b.full_name || b.email);
    });
  }, [contacts, search, lastMsgs]);

  const initials = (c: Contact) =>
    (c.full_name || c.email).split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();

  const fmtTime = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    if (d.toDateString() === today.toDateString())
      return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
    return d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold">Chat</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
        <Card className={`overflow-hidden ${active ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          <CardHeader className="py-3 space-y-2">
            <CardTitle className="text-sm">Conversas</CardTitle>
            <div className="relative">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome..."
                className="pl-8 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {sortedFiltered.map((c) => {
              const lm = lastMsgs[c.id];
              const u = unread[c.id] ?? 0;
              return (
                <button key={c.id}
                  onClick={() => setActive(c)}
                  className={`w-full text-left px-3 py-3 border-b hover:bg-muted/50 transition flex items-center gap-3 ${active?.id === c.id ? "bg-muted" : ""}`}>
                  <div className="h-10 w-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-sm shrink-0 overflow-hidden">
                    {c.avatar_url ? <img src={c.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(c)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-sm truncate">{c.full_name || c.email}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(lm?.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-muted-foreground truncate">
                        {lm ? (lm.sender_id === user?.id ? "Você: " : "") + lm.content : c.email}
                      </span>
                      {u > 0 && <Badge className="h-5 min-w-5 px-1.5 text-[10px] bg-success text-success-foreground">{u}</Badge>}
                    </div>
                  </div>
                </button>
              );
            })}
            {sortedFiltered.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum contato</p>}
          </CardContent>
        </Card>

        <Card className={`flex-col overflow-hidden ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <CardHeader className="py-3 border-b flex-row items-center gap-2 space-y-0">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setActive(null)} aria-label="Voltar">
                  ←
                </Button>
                <div className="h-9 w-9 rounded-full bg-primary/15 text-primary flex items-center justify-center font-semibold text-xs overflow-hidden shrink-0">
                  {active.avatar_url ? <img src={active.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(active)}
                </div>
                <CardTitle className="text-base truncate">{active.full_name || active.email}</CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 bg-muted/20">
                {messages.map((m) => {
                  const mine = m.sender_id === user?.id;
                  return (
                    <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                      <div className={`max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2 text-sm shadow-sm ${
                        mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-card rounded-bl-sm border"
                      }`}>
                        <p className="whitespace-pre-wrap break-words">{m.content}</p>
                        <p className={`text-[10px] mt-1 ${mine ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {new Date(m.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <p className="text-center text-sm text-muted-foreground py-8">Nenhuma mensagem ainda. Envie a primeira!</p>}
                <div ref={endRef} />
              </CardContent>
              <div className="p-3 border-t flex gap-2">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder="Digite sua mensagem..."
                />
                <Button onClick={send} className="gradient-primary text-primary-foreground border-0 shrink-0">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">Selecione um contato</div>
          )}
        </Card>
      </div>
    </div>
  );
}
