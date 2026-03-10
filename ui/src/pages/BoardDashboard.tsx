import { useParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBoard } from "../api/boards";
import { fetchVm, provisionVm, startVm, stopVm, reprovisionVm } from "../api/vms";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { VmStatusBadge } from "../components/VmStatusBadge";
import { Monitor, Play, Square, Server, ArrowLeft, Terminal } from "lucide-react";

export function BoardDashboard() {
  const { boardId } = useParams<{ boardId: string }>();
  const queryClient = useQueryClient();

  const { data: board, isLoading } = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => fetchBoard(boardId!),
    enabled: !!boardId,
  });

  const { data: vm } = useQuery({
    queryKey: ["vm", boardId],
    queryFn: () => fetchVm(boardId!),
    enabled: !!boardId,
    refetchInterval: 5000,
  });

  const provision = useMutation({
    mutationFn: () => provisionVm(boardId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vm", boardId] }),
  });
  const start = useMutation({
    mutationFn: () => startVm(boardId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vm", boardId] }),
  });
  const stop = useMutation({
    mutationFn: () => stopVm(boardId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vm", boardId] }),
  });
  const reprovision = useMutation({
    mutationFn: () => reprovisionVm(boardId!),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vm", boardId] }),
  });

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando board...</div>;
  if (!board) return <div className="p-6 text-destructive">Board nao encontrado</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link to="/">
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{board.name}</h1>
          {board.description && <p className="text-sm text-muted-foreground">{board.description}</p>}
        </div>
        <VmStatusBadge status={board.status} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="h-4 w-4" />
              Controles da VM
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {!vm ? (
              <Button onClick={() => provision.mutate()} disabled={provision.isPending} className="w-full">
                {provision.isPending ? "Provisionando..." : "Provisionar VM"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Button onClick={() => start.mutate()} disabled={start.isPending || vm.powerStatus === "running"} variant="outline" className="flex-1">
                  <Play className="mr-2 h-4 w-4" />Iniciar
                </Button>
                <Button onClick={() => stop.mutate()} disabled={stop.isPending || vm.powerStatus === "stopped"} variant="outline" className="flex-1">
                  <Square className="mr-2 h-4 w-4" />Parar
                </Button>
              </div>
            )}
            {vm && (
              <div className="text-xs text-muted-foreground space-y-1">
                <p>Regiao: {vm.region}</p>
                <p>Plano: {vm.plan}</p>
                <p>IP: {vm.ipAddress || "Pendente..."}</p>
                <p>Energia: {vm.powerStatus || "desconhecido"}</p>
                <p>Servidor: {vm.serverStatus || "desconhecido"}</p>
                <p>Vultr: {vm.vultrStatus || "desconhecido"}</p>
                {vm.vncHealthy && <p>VNC: port {vm.vncPort || 5900}</p>}
                {vm.provisioningStep && vm.provisioningStep !== "ready" && vm.provisioningStep !== "error" && (
                  <div className="mt-2 space-y-1 p-2 rounded bg-muted/50 border border-border">
                    <p className="text-xs font-medium text-primary">
                      {vm.provisioningStep === "wait_boot" && "Aguardando a VM iniciar..."}
                      {vm.provisioningStep === "wait_winrm" && "Aguardando gerenciamento remoto..."}
                      {vm.provisioningStep === "install_software" && "Instalando software (VNC, Launcher, CLIs)..."}
                      {vm.provisioningStep === "install_vnc" && "Instalando servidor VNC..."}
                      {vm.provisioningStep === "health_check" && "Verificando conexao VNC..."}
                      {!["wait_boot", "wait_winrm", "install_software", "install_vnc", "health_check"].includes(vm.provisioningStep) && `Etapa: ${vm.provisioningStep}`}
                    </p>
                    <div className="w-full bg-muted rounded-full h-1.5">
                      <div
                        className="bg-primary h-1.5 rounded-full transition-all"
                        style={{ width: `${((vm.provisioningProgress || 0) / 12) * 100}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-muted-foreground">Etapa {vm.provisioningProgress || 0} de 12</p>
                  </div>
                )}
                {vm.provisioningStep === "ready" && (
                  <p className="text-xs font-medium text-green-500 mt-1">VNC pronto</p>
                )}
                {vm.provisioningStep === "error" && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-medium text-destructive">Erro no provisionamento</p>
                    <Button size="sm" variant="outline" onClick={() => reprovision.mutate()} disabled={reprovision.isPending} className="text-xs h-7">
                      {reprovision.isPending ? "Tentando novamente..." : "Tentar novamente"}
                    </Button>
                  </div>
                )}
                {!vm.provisioningStep && vm.ipAddress && vm.powerStatus === "running" && !vm.vncHealthy && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs text-muted-foreground">VNC ainda nao instalado</p>
                    <Button size="sm" variant="outline" onClick={() => reprovision.mutate()} disabled={reprovision.isPending} className="text-xs h-7">
                      {reprovision.isPending ? "Instalando..." : "Instalar VNC"}
                    </Button>
                  </div>
                )}
                {!vm.provisioningStep && vm.ipAddress && vm.powerStatus === "running" && vm.vncHealthy && (
                  <p className="text-xs font-medium text-green-500 mt-1">VNC pronto</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Monitor className="h-4 w-4" />
              Acesso ao Desktop
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vm?.powerStatus === "running" ? (
              <Link to={`/boards/${boardId}/desktop`}>
                <Button className="w-full">
                  <Monitor className="mr-2 h-4 w-4" />Abrir Desktop
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">A VM precisa estar ligada para acessar o desktop.</p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Terminal className="h-4 w-4" />
              Claude Launcher
            </CardTitle>
          </CardHeader>
          <CardContent>
            {vm?.powerStatus === "running" ? (
              <Link to={`/boards/${boardId}/launcher`}>
                <Button className="w-full" variant="outline">
                  <Terminal className="mr-2 h-4 w-4" />Abrir Launcher
                </Button>
              </Link>
            ) : (
              <p className="text-sm text-muted-foreground">A VM precisa estar ligada para acessar o Claude Launcher.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
