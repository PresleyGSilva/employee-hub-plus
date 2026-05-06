import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Send, MessageCircle } from "lucide-react";
import { toast } from "sonner";

interface Msg {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

export default function Chat() {
  const { user, role } = useAuth();
  const [contacts, setContacts] = useState<any[]>([]);
  const [active, setActive] = useState<any>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Load contacts: employees see admins; admins see all employees
  const loadContacts = async () => {
    if (!user) return;
    if (role === "admin") {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "employee");
      const ids = (roles ?? []).map((r) => r.user_id).filter((id) => id !== user.id);
      if (ids.length === 0) { setContacts([]); return; }
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids).eq("active", true).order("full_name");
      setContacts(data ?? []);
      if (!active && data?.length) setActive(data[0]);
    } else {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
      const ids = (roles ?? []).map((r) => r.user_id).filter((id) => id !== user.id);
      if (ids.length === 0) { setContacts([]); return; }
      const { data } = await supabase.from("profiles").select("id, full_name, email").in("id", ids);
      setContacts(data ?? []);
      if (!active && data?.length) setActive(data[0]);
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
    // mark received as read
    await supabase.from("messages").update({ is_read: true }).eq("recipient_id", user.id).eq("sender_id", active.id).eq("is_read", false);
  };

  useEffect(() => { loadContacts(); }, [user, role]);
  useEffect(() => { loadMessages(); }, [active, user]);

  // Realtime subscribe to incoming messages
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`chat-${user.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        (payload) => {
          const m = payload.new as Msg;
          if (active && m.sender_id === active.id) {
            setMessages((prev) => [...prev, m]);
            supabase.from("messages").update({ is_read: true }).eq("id", m.id).then();
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
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <MessageCircle className="h-6 w-6 md:h-7 md:w-7 text-primary" />
        <h1 className="text-2xl md:text-3xl font-bold">Chat</h1>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4 h-[calc(100vh-180px)] md:h-[calc(100vh-200px)]">
        {/* Contacts list — hidden on mobile when a chat is open */}
        <Card className={`overflow-hidden ${active ? "hidden md:flex md:flex-col" : "flex flex-col"}`}>
          <CardHeader className="py-3"><CardTitle className="text-sm">{role === "admin" ? "Funcionários" : "Gerência"}</CardTitle></CardHeader>
          <CardContent className="p-0 overflow-y-auto flex-1">
            {contacts.map((c) => (
              <button key={c.id}
                onClick={() => setActive(c)}
                className={`w-full text-left px-4 py-3 border-b hover:bg-muted/50 transition ${active?.id === c.id ? "bg-muted" : ""}`}>
                <div className="font-medium text-sm">{c.full_name || c.email}</div>
                <div className="text-xs text-muted-foreground truncate">{c.email}</div>
              </button>
            ))}
            {contacts.length === 0 && <p className="p-4 text-sm text-muted-foreground">Nenhum contato</p>}
          </CardContent>
        </Card>

        {/* Conversation — hidden on mobile when no chat is open */}
        <Card className={`flex-col overflow-hidden ${active ? "flex" : "hidden md:flex"}`}>
          {active ? (
            <>
              <CardHeader className="py-3 border-b flex-row items-center gap-2 space-y-0">
                <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setActive(null)} aria-label="Voltar">
                  ←
                </Button>
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
