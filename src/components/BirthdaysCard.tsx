import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Cake, PartyPopper } from "lucide-react";

interface Birthday {
  id: string;
  full_name: string;
  avatar_url: string | null;
  birth_date: string;
}

const monthsPt = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function BirthdaysCard() {
  const [list, setList] = useState<Birthday[]>([]);

  useEffect(() => {
    supabase.rpc("get_birthdays_this_month").then(({ data }) => {
      setList((data as Birthday[]) ?? []);
    });
  }, []);

  if (list.length === 0) return null;

  const today = new Date();
  const todayDay = today.getDate();
  const todayMonth = today.getMonth();
  const todayBdays = list.filter((b) => {
    const d = new Date(b.birth_date + "T00:00:00");
    return d.getDate() === todayDay && d.getMonth() === todayMonth;
  });

  return (
    <Card className="overflow-hidden border-0 shadow-elegant relative">
      <div className="absolute inset-0 bg-gradient-to-br from-accent/15 via-transparent to-primary/15 pointer-events-none" />
      <CardHeader className="relative pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-accent to-warning flex items-center justify-center text-accent-foreground shadow-md">
            <Cake className="h-4 w-4" />
          </div>
          Aniversariantes do mês
          <span className="text-xs font-normal text-muted-foreground ml-auto">{list.length}</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="relative space-y-2">
        {todayBdays.length > 0 && (
          <div className="rounded-xl bg-gradient-to-r from-accent/20 via-warning/10 to-accent/20 border border-accent/30 p-3 mb-3">
            <p className="text-sm font-semibold flex items-center gap-2 text-accent-foreground">
              <PartyPopper className="h-4 w-4 text-accent" />
              Hoje é aniversário de {todayBdays.map((b) => b.full_name.split(" ")[0]).join(", ")}! 🎉
            </p>
          </div>
        )}
        <div className="space-y-1.5 max-h-72 overflow-y-auto">
          {list.map((b) => {
            const d = new Date(b.birth_date + "T00:00:00");
            const isToday = d.getDate() === todayDay && d.getMonth() === todayMonth;
            const initials = b.full_name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
            return (
              <div
                key={b.id}
                className={`flex items-center gap-3 p-2 rounded-lg transition-smooth ${
                  isToday ? "bg-accent/15 border border-accent/30" : "hover:bg-muted/50"
                }`}
              >
                <Avatar className="h-9 w-9">
                  {b.avatar_url && <AvatarImage src={b.avatar_url} alt={b.full_name} />}
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-xs">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{b.full_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {d.getDate().toString().padStart(2, "0")} de {monthsPt[d.getMonth()]}
                  </p>
                </div>
                {isToday && (
                  <span className="text-xs font-semibold text-accent flex items-center gap-1">
                    <Cake className="h-3 w-3" /> hoje
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
