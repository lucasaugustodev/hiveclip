import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBoard } from "../api/boards";
import { fetchVm } from "../api/vms";
import { Button } from "../components/ui/button";
import { VncViewer } from "../components/VncViewer";
import { ArrowLeft, Maximize2, Minimize2 } from "lucide-react";
import { useState } from "react";

export function DesktopPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [fullscreen, setFullscreen] = useState(false);

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

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setFullscreen(true);
    } else {
      document.exitFullscreen();
      setFullscreen(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-sidebar shrink-0">
        <Link to={`/boards/${boardId}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm font-medium">{board?.name} — Desktop</span>
        {vm?.ipAddress && (
          <span className="text-xs text-muted-foreground ml-2">{vm.ipAddress}</span>
        )}
        <div className="ml-auto flex items-center gap-2">
          {vm?.adminPassword && (
            <span className="text-xs text-muted-foreground">
              Pass: <code className="bg-muted px-1 rounded">{vm.adminPassword}</code>
            </span>
          )}
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={toggleFullscreen}>
            {fullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          </Button>
        </div>
      </div>
      <div className="flex-1 bg-black flex">
        {vm?.ipAddress && vm.ipAddress !== "0.0.0.0" ? (
          <VncViewer ip={vm.ipAddress} password={vm.adminPassword || undefined} />
        ) : vm?.vultrStatus === "pending" || vm?.serverStatus !== "ok" ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center space-y-2">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
              <p>VM is still booting... ({vm?.vultrStatus || "pending"})</p>
              <p className="text-xs">This can take 5-10 minutes for Windows</p>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>No VM IP available. Provision a VM from the dashboard first.</p>
          </div>
        )}
      </div>
    </div>
  );
}
