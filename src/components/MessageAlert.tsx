import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle, BellRing } from "lucide-react";

/**
 * Listens for new chat messages addressed to the logged-in user
 * and shows an alert + shakes the screen + plays a beep.
 */
export function MessageAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (!user) return;

    // simple beep using WebAudio (no external file)
    const playBeep = (freq = 880, duration = 0.45) => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = freq;
        o.type = "sine";
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + duration + 0.05);
      } catch {}
    };

    const playNotifSound = () => {
      // two-tone ding for notifications
      playBeep(660, 0.25);
      setTimeout(() => playBeep(990, 0.35), 180);
    };

    const shake = () => {
      const el = document.documentElement;
      el.classList.add("screen-shake");
      setTimeout(() => el.classList.remove("screen-shake"), 700);
    };

    const inChat = pathname.endsWith("/chat");

    const ch = supabase
      .channel(`alert-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        async (payload) => {
          const m = payload.new as any;
          if (inChat) return;

          const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", m.sender_id).single();
          const name = prof?.full_name || prof?.email || "Alguém";

          shake();
          playBeep();
          toast.message(`💬 ${name}`, {
            description: m.content.slice(0, 100),
            duration: 6000,
            action: { label: "Abrir", onClick: () => navigate("/app/chat") },
            icon: <MessageCircle className="h-4 w-4" />,
          });
        })
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications" },
        async (payload) => {
          const n = payload.new as any;
          // only alert if it's broadcast or directed at this user
          if (!n.is_broadcast && n.user_id !== user.id) return;

          playNotifSound();
          toast.message(`🔔 ${n.title || "Nova notificação"}`, {
            description: (n.message || "").slice(0, 120),
            duration: 6000,
            action: { label: "Ver", onClick: () => navigate("/app/notificacoes") },
            icon: <BellRing className="h-4 w-4" />,
          });
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, pathname, navigate]);

  return <audio ref={audioRef} />;
}
