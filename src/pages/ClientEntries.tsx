import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

type Status = "pago" | "pedido_aceito" | "pendente" | "recusado" | "cancelado";
type EntryType = "meu_cliente" | "indicacao";
type Gender = "masculino" | "feminino" | "outro";

interface ClientEntry {
  id: string;
  user_id: string;
  entry_type: EntryType;
  cpf: string | null;
  full_name: string;
  gender: Gender | null;
  rg: string | null;
  amount: number;
  send_date: string | null;
  birth_date: string | null;
  phone: string | null;
  age: number | null;
  status: Status;
  bank: string | null;
  praca: string | null;
  indicated_by: string | null;
  notes: string | null;
}

const STATUS_LABEL: Record<Status, string> = {
  pago: "Pago",
  pedido_aceito: "Pedido Aceito",
  pendente: "Pendente",
  recusado: "Recusado",
  cancelado: "Cancelado",
};

const STATUS_COLOR: Record<Status, string> = {
  pago: "bg-green-600 text-white",
  pedido_aceito: "bg-emerald-400 text-white",
  pendente: "bg-amber-400 text-black",
  recusado: "bg-red-600 text-white",
  cancelado: "bg-gray-500 text-white",
};

const TYPE_LABEL: Record<EntryType, string> = {
  meu_cliente: "Meu Cliente",
  indicacao: "Indicação",
};

const empty = (uid: string): Partial<ClientEntry> => ({
  user_id: uid,
  entry_type: "meu_cliente",
  full_name: "",
  status: "pendente",
  amount: 0,
});

export default function ClientEntries() {
  const { user, isAdmin, role } = useAuth();
  const canEdit = !!user && (isAdmin || role === "employee" || (!isAdmin && role !== "supervisor"));
  const [rows, setRows] = useState<ClientEntry[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [filterUser, setFilterUser] = useState<string>("all");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Partial<ClientEntry> | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_entries")
      .select("*")
      .order("send_date", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    if (error) { toast.error(error.message); setLoading(false); return; }
    setRows((data ?? []) as ClientEntry[]);

    const ids = Array.from(new Set((data ?? []).map((r: any) => r.user_id)));
    if (ids.length) {
      const { data: profs } = await supabase
        .from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs ?? []).forEach((p: any) => { map[p.id] = p.full_name; });
      setProfiles(map);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); /* eslint-disable-next-line */ }, [user?.id]);

  const filtered = useMemo(() => {
    if (filterUser === "all") return rows;
    return rows.filter((r) => r.user_id === filterUser);
  }, [rows, filterUser]);

  const totals = useMemo(() => {
    const now = new Date();
    const m = now.getMonth();
    const y = now.getFullYear();
    let totalMonth = 0, totalPaid = 0, totalPending = 0, totalAll = 0;
    for (const r of filtered) {
      const amt = Number(r.amount) || 0;
      totalAll += amt;
      const d = r.send_date ? new Date(r.send_date) : null;
      if (d && d.getMonth() === m && d.getFullYear() === y) totalMonth += amt;
      if (r.status === "pago") totalPaid += amt;
      if (r.status === "pendente" || r.status === "pedido_aceito") totalPending += amt;
    }
    return { totalMonth, totalPaid, totalPending, totalAll };
  }, [filtered]);

  const userOptions = useMemo(() => {
    const ids = Array.from(new Set(rows.map((r) => r.user_id)));
    return ids.map((id) => ({ id, name: profiles[id] ?? "—" }));
  }, [rows, profiles]);

  const fmt = (n: number) =>
    n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const onSave = async () => {
    if (!editing || !user) return;
    if (!editing.full_name) { toast.error("Nome é obrigatório"); return; }
    const payload: any = { ...editing, user_id: editing.user_id ?? user.id };
    payload.amount = Number(payload.amount) || 0;
    payload.age = payload.age ? Number(payload.age) : null;
    if (payload.id) {
      const { id, ...upd } = payload;
      const { error } = await supabase.from("client_entries").update(upd).eq("id", id);
      if (error) return toast.error(error.message);
      toast.success("Atualizado");
    } else {
      const { error } = await supabase.from("client_entries").insert(payload);
      if (error) return toast.error(error.message);
      toast.success("Cliente adicionado");
    }
    setOpen(false); setEditing(null); load();
  };

  const onDelete = async (id: string) => {
    if (!confirm("Excluir este cliente?")) return;
    const { error } = await supabase.from("client_entries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Removido"); load();
  };

  const startNew = () => { if (user) { setEditing(empty(user.id)); setOpen(true); } };
  const startEdit = (r: ClientEntry) => { setEditing(r); setOpen(true); };

  const isSupervisorView = role === "supervisor" && !isAdmin;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold">Acompanhamento de Clientes</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? "Planilha geral de todas as consultoras"
              : isSupervisorView ? "Planilha da sua equipe (somente leitura)"
              : "Sua planilha de clientes"}
          </p>
        </div>
        {!isSupervisorView && (
          <Button onClick={startNew}><Plus className="h-4 w-4 mr-1" />Novo Cliente</Button>
        )}
      </div>

      {/* Totais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total do mês</div>
          <div className="text-xl font-bold">{fmt(totals.totalMonth)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Pago</div>
          <div className="text-xl font-bold text-green-600">{fmt(totals.totalPaid)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total Pendente</div>
          <div className="text-xl font-bold text-amber-600">{fmt(totals.totalPending)}</div>
        </CardContent></Card>
        <Card><CardContent className="p-4">
          <div className="text-xs text-muted-foreground">Total geral</div>
          <div className="text-xl font-bold">{fmt(totals.totalAll)}</div>
        </CardContent></Card>
      </div>

      {/* Filtro consultora (admin/supervisor) */}
      {(isAdmin || isSupervisorView) && userOptions.length > 1 && (
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as consultoras</SelectItem>
              {userOptions.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Tabela */}
      <div className="border rounded-lg overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted">
            <tr className="text-left">
              {(isAdmin || isSupervisorView) && <th className="p-2">Consultora</th>}
              <th className="p-2">Tipo</th>
              <th className="p-2">CPF</th>
              <th className="p-2">Nome</th>
              <th className="p-2">Sexo</th>
              <th className="p-2">RG</th>
              <th className="p-2">Valor</th>
              <th className="p-2">Envio</th>
              <th className="p-2">Nasc.</th>
              <th className="p-2">Telefone</th>
              <th className="p-2">Idade</th>
              <th className="p-2">Status</th>
              <th className="p-2">Banco</th>
              <th className="p-2">Praça</th>
              <th className="p-2">Indicado por</th>
              <th className="p-2">Obs</th>
              {!isSupervisorView && <th className="p-2 w-20">Ações</th>}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td className="p-4 text-center text-muted-foreground" colSpan={20}>Carregando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td className="p-4 text-center text-muted-foreground" colSpan={20}>Nenhum cliente cadastrado.</td></tr>
            ) : filtered.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/40">
                {(isAdmin || isSupervisorView) && <td className="p-2 font-medium">{profiles[r.user_id] ?? "—"}</td>}
                <td className="p-2"><Badge variant="outline">{TYPE_LABEL[r.entry_type]}</Badge></td>
                <td className="p-2">{r.cpf}</td>
                <td className="p-2 font-medium">{r.full_name}</td>
                <td className="p-2 capitalize">{r.gender}</td>
                <td className="p-2">{r.rg}</td>
                <td className="p-2">{fmt(Number(r.amount))}</td>
                <td className="p-2">{r.send_date ? new Date(r.send_date).toLocaleDateString("pt-BR") : ""}</td>
                <td className="p-2">{r.birth_date ? new Date(r.birth_date).toLocaleDateString("pt-BR") : ""}</td>
                <td className="p-2">{r.phone}</td>
                <td className="p-2">{r.age}</td>
                <td className="p-2"><Badge className={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge></td>
                <td className="p-2">{r.bank}</td>
                <td className="p-2">{r.praca}</td>
                <td className="p-2">{r.indicated_by}</td>
                <td className="p-2 max-w-[200px] truncate" title={r.notes ?? ""}>{r.notes}</td>
                {!isSupervisorView && (
                  <td className="p-2">
                    {(isAdmin || r.user_id === user?.id) && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => startEdit(r)}><Pencil className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => onDelete(r.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar cliente" : "Novo cliente"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label>Tipo</Label>
                <Select value={editing.entry_type} onValueChange={(v) => setEditing({ ...editing, entry_type: v as EntryType })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="meu_cliente">Meu Cliente</SelectItem>
                    <SelectItem value="indicacao">Indicação</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={editing.status} onValueChange={(v) => setEditing({ ...editing, status: v as Status })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => (
                      <SelectItem key={k} value={k}>{v}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-2">
                <Label>Nome completo *</Label>
                <Input value={editing.full_name ?? ""} onChange={(e) => setEditing({ ...editing, full_name: e.target.value })} />
              </div>
              <div>
                <Label>CPF</Label>
                <Input value={editing.cpf ?? ""} onChange={(e) => setEditing({ ...editing, cpf: e.target.value })} />
              </div>
              <div>
                <Label>RG</Label>
                <Input value={editing.rg ?? ""} onChange={(e) => setEditing({ ...editing, rg: e.target.value })} />
              </div>
              <div>
                <Label>Sexo</Label>
                <Select value={editing.gender ?? undefined} onValueChange={(v) => setEditing({ ...editing, gender: v as Gender })}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="feminino">Feminino</SelectItem>
                    <SelectItem value="outro">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Telefone</Label>
                <Input value={editing.phone ?? ""} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
              </div>
              <div>
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={editing.amount ?? 0} onChange={(e) => setEditing({ ...editing, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Data de envio</Label>
                <Input type="date" value={editing.send_date ?? ""} onChange={(e) => setEditing({ ...editing, send_date: e.target.value })} />
              </div>
              <div>
                <Label>Nascimento</Label>
                <Input type="date" value={editing.birth_date ?? ""} onChange={(e) => setEditing({ ...editing, birth_date: e.target.value })} />
              </div>
              <div>
                <Label>Idade</Label>
                <Input type="number" value={editing.age ?? ""} onChange={(e) => setEditing({ ...editing, age: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Banco</Label>
                <Input value={editing.bank ?? ""} onChange={(e) => setEditing({ ...editing, bank: e.target.value })} />
              </div>
              <div>
                <Label>Praça</Label>
                <Input value={editing.praca ?? ""} onChange={(e) => setEditing({ ...editing, praca: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Indicado por</Label>
                <Input value={editing.indicated_by ?? ""} onChange={(e) => setEditing({ ...editing, indicated_by: e.target.value })} />
              </div>
              <div className="md:col-span-2">
                <Label>Observações</Label>
                <Textarea value={editing.notes ?? ""} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={onSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
