import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next = "/dashboard", error } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center terminal-grid bg-background p-6 font-mono">
      <Card className="w-full max-w-sm border border-border bg-card/30 backdrop-blur-md hover:border-primary/40 transition-colors rounded-none">
        <CardHeader className="pb-3 border-b border-border/50 text-center">
          <div className="flex items-center justify-center gap-1.5 mb-1">
            <span className="font-orbitron text-xl font-black tracking-widest text-primary text-glow-cyan uppercase">
              Auditor-AI
            </span>
            <span className="h-4 w-2 bg-primary animate-pulse inline-block" />
          </div>
          <p className="font-mono text-[10px] text-muted-foreground uppercase tracking-wider">
            SYSTEM ACCESS GATEWAY
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form action="/api/login" method="POST" className="space-y-4 text-xs">
            <input type="hidden" name="next" value={next} />
            
            <div className="space-y-1.5">
              <label className="text-muted-foreground font-semibold uppercase text-[10px]" htmlFor="password">
                Senha do Operador
              </label>
              <Input
                id="password"
                type="password"
                name="password"
                autoFocus
                required
                placeholder="Insira a chave de acesso..."
                className="bg-background/50 border-border text-foreground font-mono focus-visible:ring-primary rounded-none h-10 text-xs"
              />
            </div>

            {error && (
              <div className="rounded-none border border-destructive/50 bg-destructive/10 p-2.5 font-mono text-[10px] text-destructive flex items-center gap-1.5">
                <span>[!]</span>
                <span>ERRO: Senha de acesso inválida.</span>
              </div>
            )}

            <Button
              type="submit"
              className="bg-primary text-primary-foreground font-mono text-xs uppercase font-bold tracking-wider rounded-none hover:bg-primary/90 hover:glow-cyan w-full h-10"
            >
              Autenticar &gt;&gt;
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
