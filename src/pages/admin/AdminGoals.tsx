import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Trash2, Plus } from "lucide-react";
import { monthNames } from "@/lib/payroll";

export default function AdminGoals() {
  const { user } = useAuth();
  const now = new Date();
  const [list, setList] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const { data } = await supabase.from("goals").select("*").order("reference_year", { ascending: false }).order("reference_month", { ascending: false });
    setList(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const create = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    const { error } = await supabase.from("goals").insert({
      title: f.get("title") as string,
      description: f.get("description") as string,
      reference_month: Number(f.get("month")),
      reference_year: Number(f.get("year")),
      target_value: Number(f.get("target")),
      current_value: 0,
      created_by: user?.id,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Meta criada"); (e.target as HTMLFormElement).reset(); load(); }
  };

  const updateCurrent = async (id: string, value: number) => {
    await supabase.from("goals").update({ current_value: value }).eq("id", id);
    load();
  };

  const remove = async (id: string) => {
    await supabase.from("goals").delete().eq("id", id);
    toast.success("Removida"); load();
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Metas</h1>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Nova meta</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>Título</Label><Input name="title" required maxLength={100} /></div>
            <div className="sm:col-span-2"><Label>Descrição</Label><Textarea name="description" rows={2} maxLength={300} /></div>
            <div><Label>Mês</Label>
              <Select name="month" defaultValue={String(now.getMonth() + 1)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{monthNames.map((n, i) => <SelectItem key={i} value={String(i + 1)}>{n}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Ano</Label><Input name="year" type="number" defaultValue={now.getFullYear()} required /></div>
            <div><Label>Valor alvo</Label><Input name="target" type="number" step="0.01" required /></div>
            <div className="flex items-end">
              <Button type="submit" disabled={busy} className="w-full gradient-primary text-primary-foreground border-0">Criar meta</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {list.map((g) => {
          const pct = g.target_value > 0 ? Math.min(100, (Number(g.current_value) / Number(g.target_value)) * 100) : 0;
          return (
            <Card key={g.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">{g.title}</CardTitle>
                  <Button size="icon" variant="ghost" onClick={() => remove(g.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
                <p className="text-xs text-muted-foreground">{monthNames[g.reference_month - 1]}/{g.reference_year}</p>
              </CardHeader>
              <CardContent className="space-y-3">
                {g.description && <p className="text-sm text-muted-foreground">{g.description}</p>}
                <Progress value={pct} className="h-3" />
                <div className="flex items-center gap-2">
                  <Input type="number" defaultValue={g.current_value} className="h-8"
                    onBlur={(e) => updateCurrent(g.id, Number(e.target.value))} />
                  <span className="text-sm text-muted-foreground whitespace-nowrap">/ {Number(g.target_value).toLocaleString("pt-BR")}</span>
                </div>
                <p className="text-right text-sm font-bold text-primary">{pct.toFixed(0)}%</p>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
