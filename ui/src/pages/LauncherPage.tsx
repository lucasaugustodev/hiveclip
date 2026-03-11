import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBoard } from "../api/boards";
import { fetchVm } from "../api/vms";
import { Button } from "../components/ui/button";
import { ArrowLeft, Maximize2, Minimize2, Terminal } from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "../lib/supabase";

export function LauncherPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [fullscreen, setFullscreen] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setToken(session?.access_token ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const { data: board } = useQuery({
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

  // Build the proxied launcher URL
  const launcherUrl = useMemo(() => {
    if (!vm?.ipAddress || vm.ipAddress === "0.0.0.0" || !token) return null;
    // The iframe loads from our own server's proxy endpoint
    return `/api/launcher/${vm.ipAddress}/?token=${encodeURIComponent(token)}`;
  }, [vm?.ipAddress, token]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  const isReady = vm?.provisioningStep === "ready" || (vm?.ipAddress && vm.powerStatus === "running");

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-sidebar shrink-0">
        <Link to={`/boards/${boardId}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <Terminal className="h-4 w-4 text-muted-foreground" />
        <span className="text-sm font-medium">{board?.name} — Claude Launcher</span>
        {vm?.ipAddress && (
          <span className="text-xs text-muted-foreground ml-2">{vm.ipAddress}:3001</span>
        )}
        <div className="ml-auto">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-[#1e1e2e] flex">
        {isReady && launcherUrl ? (
          <iframe
            src={launcherUrl}
            className="w-full h-full border-0"
            title="Claude Launcher"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        ) : vm && vm.provisioningStep && vm.provisioningStep !== "error" && vm.provisioningStep !== "ready" ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-3">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p className="font-medium">A VM ainda esta sendo provisionada...</p>
              <p className="text-xs">O Claude Launcher estara disponivel quando a configuracao terminar</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <Terminal className="h-12 w-12 mx-auto opacity-30" />
              <p>Nenhuma VM provisionada. Va ao painel para provisionar uma primeiro.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
