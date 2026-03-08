import { useParams, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { fetchBoard } from "../api/boards";
import { fetchVm } from "../api/vms";
import { Button } from "../components/ui/button";
import { ArrowLeft, Maximize2 } from "lucide-react";

export function DesktopPage() {
  const { boardId } = useParams<{ boardId: string }>();

  const { data: board } = useQuery({
    queryKey: ["boards", boardId],
    queryFn: () => fetchBoard(boardId!),
    enabled: !!boardId,
  });

  const { data: vm } = useQuery({
    queryKey: ["vm", boardId],
    queryFn: () => fetchVm(boardId!),
    enabled: !!boardId,
  });

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 px-4 py-2 border-b border-border bg-sidebar">
        <Link to={`/boards/${boardId}`}>
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <span className="text-sm font-medium">{board?.name} — Desktop</span>
        <div className="ml-auto">
          <Button variant="ghost" size="icon" className="h-7 w-7">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center bg-black/90 text-muted-foreground">
        {vm?.status === "running" ? (
          <div className="text-center space-y-2">
            <p className="text-lg">noVNC Viewer</p>
            <p className="text-sm">WebSocket connection to {vm.mainIp || "VM"}:5900</p>
            <p className="text-xs">(VNC integration will be connected here)</p>
          </div>
        ) : (
          <p>VM is not running. Start it from the dashboard first.</p>
        )}
      </div>
    </div>
  );
}
