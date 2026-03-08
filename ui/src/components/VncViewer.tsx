import { useEffect, useRef, useState } from "react";
import RFB from "@novnc/novnc/core/rfb.js";

interface VncViewerProps {
  ip: string;
  password?: string;
}

export function VncViewer({ ip, password }: VncViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<RFB | null>(null);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("connecting");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!containerRef.current || !ip) return;

    const token = localStorage.getItem("hiveclip.token");
    if (!token) {
      setStatus("error");
      setErrorMsg("Not authenticated");
      return;
    }

    // Connect via our WebSocket proxy
    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${window.location.host}/api/vnc/${ip}?token=${encodeURIComponent(token)}`;

    setStatus("connecting");

    try {
      const rfb = new RFB(containerRef.current, wsUrl, {
        credentials: { password: password || "" },
        wsProtocols: [],
      });

      rfb.scaleViewport = true;
      rfb.resizeSession = true;
      rfb.showDotCursor = true;

      rfb.addEventListener("connect", () => {
        setStatus("connected");
      });

      rfb.addEventListener("disconnect", (e: any) => {
        if (e.detail?.clean) {
          setStatus("disconnected");
        } else {
          setStatus("error");
          setErrorMsg("Connection lost");
        }
      });

      rfb.addEventListener("credentialsrequired", () => {
        if (password) {
          rfb.sendCredentials({ password });
        } else {
          setStatus("error");
          setErrorMsg("VNC password required");
        }
      });

      rfbRef.current = rfb;
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Failed to connect");
    }

    return () => {
      if (rfbRef.current) {
        rfbRef.current.disconnect();
        rfbRef.current = null;
      }
    };
  }, [ip, password]);

  return (
    <div className="relative flex-1 flex flex-col">
      {status === "connecting" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center space-y-2">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="text-sm text-muted-foreground">Connecting to {ip}...</p>
          </div>
        </div>
      )}
      {status === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center space-y-2">
            <p className="text-sm text-destructive">{errorMsg}</p>
            <p className="text-xs text-muted-foreground">Make sure VNC server is running on the VM</p>
          </div>
        </div>
      )}
      {status === "disconnected" && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <p className="text-sm text-muted-foreground">Disconnected from remote desktop</p>
        </div>
      )}
      <div ref={containerRef} className="flex-1" />
    </div>
  );
}
