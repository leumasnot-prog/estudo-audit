import { prisma } from "@auditor-ai/db";
import { getDemoUser } from "@/lib/analytics";
import { updateUserSettings, triggerExtraSession } from "@/lib/actions/user";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata = { title: "Hermes (WhatsApp)" };
export const dynamic = "force-dynamic";

export default async function HermesPage() {
  const user = await getDemoUser();
  if (!user) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center border border-dashed border-destructive/50 bg-destructive/5 p-6 text-center font-sans">
        <p className="text-sm text-destructive font-bold uppercase tracking-widest">
          [!] ERRO CRÍTICO DE SISTEMA
        </p>
        <p className="mt-2 text-xs text-muted-foreground max-w-md">
          Nenhum usuário cadastrado. Rode o seed do banco de dados primeiro.
        </p>
      </div>
    );
  }

  const [dueCount, lastWhatsapp] = await Promise.all([
    prisma.spacedRepetitionCard.count({
      where: { userId: user.id, dueAt: { lte: new Date() } },
    }),
    prisma.answerLog.findFirst({
      where: { userId: user.id, channel: "WHATSAPP" },
      orderBy: { answeredAt: "desc" },
      select: { answeredAt: true },
    }),
  ]);

  const info = [
    { label: "WhatsApp ID / Telefone", value: user.phone, code: "TELEMETRY_PHONE" },
    { label: "Horário de envio automático", value: `${user.sendHour}h (${user.timezone})`, code: "SCHEDULER_CRON" },
    { label: "Meta diária / Rodada", value: `${user.dailyGoal} questões`, code: "TARGET_METRICS" },
    { label: "Revisões vencidas agora", value: String(dueCount), code: "PENDING_REVIEWS" },
    {
      label: "Última resposta via WhatsApp",
      value: lastWhatsapp
        ? lastWhatsapp.answeredAt.toLocaleString("pt-BR", {
            timeZone: user.timezone,
          })
        : "NUNCA",
      code: "LAST_HEARTBEAT_ACK"
    },
  ] as const;

  return (
    <div className="stagger max-w-3xl space-y-6">
      {/* Page Header */}
      <div className="border-b border-border pb-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">
              Hermes Console
            </h1>
            <p className="mt-1 text-xs text-muted-foreground">
              Gerenciamento do robô de repetição espaçada via WhatsApp.
            </p>
          </div>
          <Badge variant="outline" className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono text-xs px-2.5 py-1">
            BOT: ATIVO & ONLINE
          </Badge>
        </div>
      </div>

      {/* Main status card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center justify-between">
            <span>Status da Conexão & Fila</span>
            <span className="text-[10px] text-muted-foreground font-mono font-normal">GATEWAY_v1.0</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 font-sans text-xs">
          <dl className="space-y-3">
            {info.map(({ label, value, code }) => (
              <div key={label} className="flex flex-wrap items-baseline justify-between gap-4 border-b border-border/30 pb-2.5 last:border-0 last:pb-0">
                <dt className="text-muted-foreground flex items-center gap-2">
                  <span className="text-primary font-bold">›</span>
                  <span>{label}</span>
                  <span className="font-mono text-[9px] text-muted-foreground/40">[{code}]</span>
                </dt>
                <dd className="font-semibold text-foreground tabular-nums bg-muted/40 px-2 py-1 rounded border border-border/50">
                  {value}
                </dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      {/* Card de Disparo / Desbloqueio Instantâneo de Rodadas Extra */}
      <Card className="bg-card border-primary/40 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center justify-between">
            <span>⚡ Desbloqueio & Comandos do WhatsApp</span>
            <span className="text-[10px] text-muted-foreground font-mono font-normal">COMMAND_CONSOLE</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4 font-sans text-xs">
          <p className="text-muted-foreground leading-relaxed">
            Controle o robô diretamente pelo WhatsApp enviando comandos no chat ou disparando uma nova rodada pelo painel:
          </p>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Ação no Painel */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-3">
              <span className="font-semibold text-foreground block text-xs">Disparo Direto pelo Painel</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Força o vencimento dos cards e dispara uma nova rodada de questões no WhatsApp imediatamente.
              </p>
              <form action={triggerExtraSession}>
                <button
                  type="submit"
                  className="w-full px-3 py-2 bg-primary text-primary-foreground font-semibold text-xs rounded shadow hover:bg-primary/90 transition-all cursor-pointer"
                >
                  ⚡ Disparar Rodada Extra Agora
                </button>
              </form>
            </div>

            {/* Ação no WhatsApp */}
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-2">
              <span className="font-semibold text-foreground block text-xs">Comandos no WhatsApp</span>
              <p className="text-[11px] text-muted-foreground leading-normal">
                Envie qualquer um dos comandos no chat do robô:
              </p>
              <div className="font-mono text-[11px] bg-background border border-border p-2 rounded text-primary space-y-1">
                <div>• <span className="font-bold text-emerald-600 dark:text-emerald-400">!extra</span> ou <span className="font-bold text-emerald-600 dark:text-emerald-400">!mais</span> (Rodada extra)</div>
                <div>• <span className="font-bold text-rose-600 dark:text-rose-400">!encerrar</span> ou <span className="font-bold text-rose-600 dark:text-rose-400">!parar</span> (Cancela a sessão)</div>
                <div>• <span className="font-bold text-amber-600 dark:text-amber-400">!pular</span> (Pula a questão atual)</div>
                <div>• <span className="font-bold text-blue-600 dark:text-blue-400">!status</span> (Resumo de acertos de hoje)</div>
                <div>• <span className="font-bold">!ajuda</span> (Menu de ajuda)</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Form Card */}
      <Card className="bg-card border-border shadow-sm">
        <CardHeader className="pb-3 border-b border-border/60">
          <CardTitle className="text-xs font-semibold uppercase tracking-wider text-foreground flex items-center justify-between">
            <span>Configuração de Metas e Horário</span>
            <span className="text-[10px] text-muted-foreground font-mono font-normal">CONFIG_MANAGER</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 font-sans text-xs">
          <form action={updateUserSettings} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-foreground block text-xs font-medium">
                  Meta Diária (Questões por Rodada)
                </label>
                <input
                  type="number"
                  name="dailyGoal"
                  min="1"
                  max="100"
                  defaultValue={user.dailyGoal}
                  className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground font-sans focus:border-primary focus:outline-none rounded tabular-nums"
                  required
                />
                <span className="text-[10px] text-muted-foreground block">
                  Número de questões enviadas em cada rodada (até 100).
                </span>
              </div>

              <div className="space-y-2">
                <label className="text-foreground block text-xs font-medium">
                  Horário de Envio Automático
                </label>
                <select
                  name="sendHour"
                  defaultValue={user.sendHour}
                  className="w-full bg-background border border-border px-3 py-2 text-xs text-foreground font-sans focus:border-primary focus:outline-none rounded"
                  required
                >
                  {Array.from({ length: 24 }).map((_, i) => (
                    <option key={i} value={i}>
                      {String(i).padStart(2, "0")}:00
                    </option>
                  ))}
                </select>
                <span className="text-[10px] text-muted-foreground block">
                  Fuso horário ativo: {user.timezone}.
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end border-t border-border/40">
              <button
                type="submit"
                className="px-4 py-2 border border-primary bg-primary/10 text-primary font-semibold text-xs hover:bg-primary hover:text-primary-foreground transition-all rounded select-none cursor-pointer"
              >
                Salvar Alterações
              </button>
            </div>
          </form>
        </CardContent>
      </Card>
      
      {/* Visual Diagnostic Panel */}
      <Card className="bg-card border-border/60">
        <CardContent className="p-4 font-mono text-[10px] text-muted-foreground space-y-1">
          <div className="text-emerald-500 font-bold uppercase tracking-wider text-[11px] mb-1">LOGS DO SISTEMA HERMES:</div>
          <div>[STATUS] EvolutionAPI Gateway: <span className="text-emerald-500 font-semibold">ONLINE / PRONTO</span></div>
          <div>[DISPATCH] Sessão para <span className="text-primary font-semibold">{user.phone ?? "DESCONHECIDO"}</span> ativa</div>
          <div>[CONFIG] Meta: {user.dailyGoal} questões | Envio automático: {user.sendHour}:00 ({user.timezone})</div>
          <div>[COMANDOS NO WHATSAPP] !extra, !encerrar, !pular, !status, !ajuda, !reset</div>
        </CardContent>
      </Card>
    </div>
  );
}
