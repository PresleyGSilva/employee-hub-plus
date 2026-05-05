import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MessageCircle } from "lucide-react";

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
    const playBeep = () => {
      try {
        const Ctx = (window.AudioContext || (window as any).webkitAudioContext);
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        o.type = "sine";
        g.gain.setValueAtTime(0.001, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.3, ctx.currentTime + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + 0.45);
      } catch {}
    };

    const shake = () => {
      const el = document.documentElement;
      el.classList.add("screen-shake");
      setTimeout(() => el.classList.remove("screen-shake"), 700);
    };

    const ch = supabase
      .channel(`alert-${user.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${user.id}` },
        async (payload) => {
          const m = payload.new as any;
          // don't re-alert when user is already viewing this chat
          if (pathname === "/chat" || pathname === "/admin/chat") return;

          // get sender name
          const { data: prof } = await supabase.from("profiles").select("full_name, email").eq("id", m.sender_id).single();
          const name = prof?.full_name || prof?.email || "Alguém";

          shake();
          playBeep();
          toast.message(`💬 ${name}`, {
            description: m.content.slice(0, 100),
            duration: 6000,
            action: {
              label: "Abrir",
              onClick: () => navigate("/chat"),
            },
            icon: <MessageCircle className="h-4 w-4" />,
          });
        })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user, pathname, navigate]);

  return <audio ref={audioRef} />;
}
