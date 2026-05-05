import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Clock, FileText, Users, Bell, Target, ShieldCheck } from "lucide-react";

const features = [
  { icon: Clock, title: "Ponto Eletrônico", desc: "Bata o ponto em segundos. Cálculo automático de horas, atrasos e extras." },
  { icon: FileText, title: "Holerite Digital", desc: "Gerado automaticamente a partir do ponto e assinado digitalmente pelo funcionário." },
  { icon: Users, title: "Gestão de Equipe", desc: "Cadastre colaboradores, controle documentos e acompanhe a jornada." },
  { icon: Target, title: "Metas Mensais", desc: "Defina objetivos para a equipe e acompanhe o progresso em tempo real." },
  { icon: Bell, title: "Notificações", desc: "Comunicados internos chegam diretamente aos seus funcionários." },
  { icon: ShieldCheck, title: "Seguro", desc: "Login protegido, criptografia ponta-a-ponta e backup automático." },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-lg gradient-primary flex items-center justify-center font-bold text-primary-foreground shadow-md">T</div>
            <span className="font-bold text-lg" style={{ fontFamily: "Sora" }}>Tottus Cred</span>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/auth"><Button variant="ghost">Entrar</Button></Link>
            <Link to="/auth?mode=signup"><Button className="gradient-primary text-primary-foreground border-0 shadow-md">Começar grátis</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-95" />
        <div className="absolute top-0 right-0 w-[500px] h-[500px] rounded-full blur-3xl opacity-30" style={{ background: "hsl(var(--accent))" }} />
        <div className="container relative py-24 md:py-32 text-center">
          <span className="inline-block px-4 py-1.5 rounded-full text-xs font-medium bg-accent/20 text-accent border border-accent/30 mb-6">
            ✨ Sistema completo para sua empresa
          </span>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 max-w-4xl mx-auto leading-tight">
            Gestão de funcionários <span className="text-accent">simplificada</span>
          </h1>
          <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto mb-10">
            Ponto eletrônico, folha de pagamento e gestão de equipe — tudo em um app moderno que funciona no navegador e no Windows.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-accent text-accent-foreground border-0 shadow-glow hover:scale-105 transition-smooth">
                Criar conta grátis
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                Já tenho conta
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="container py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Tudo o que sua equipe precisa</h2>
          <p className="text-muted-foreground text-lg">
            Da batida do ponto à assinatura do holerite — sem planilhas, sem retrabalho.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-card border shadow-sm hover:shadow-elegant transition-smooth hover:-translate-y-1">
              <div className="h-11 w-11 rounded-xl gradient-primary flex items-center justify-center text-primary-foreground mb-4 shadow-md">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="container pb-24">
        <div className="rounded-3xl gradient-hero p-12 md:p-16 text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(circle at 30% 50%, hsl(var(--accent)) 0%, transparent 50%)" }} />
          <div className="relative">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-4">Pronto para começar?</h2>
            <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
              Cadastre-se em menos de 1 minuto e comece a gerenciar sua equipe agora.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-accent text-accent-foreground border-0 shadow-glow">
                Criar conta agora
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Tottus Cred — Gestão de Funcionários
      </footer>
    </div>
  );
}
