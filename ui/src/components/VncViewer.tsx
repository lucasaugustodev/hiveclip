import { useEffect, useRef, useState } from "react";

interface VncViewerProps {
  ip: string;
  password?: string;
}

export function VncViewer({ ip, password }: VncViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rfbRef = useRef<any>(null);
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

    const wsProto = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProto}//${window.location.host}/api/vnc/${ip}?token=${encodeURIComponent(token)}`;

    setStatus("connecting");

    // Dynamically import noVNC from CDN
    import("https://cdn.jsdelivr.net/npm/@nicedoc/novnc@0.0.5/lib/rfb.min.js" as any)
      .catch(() => {
        // Fallback: use raw WebSocket + manual VNC handshake is too complex.
        // Instead, create an iframe with noVNC's HTML client
        setStatus("error");
        setErrorMsg("noVNC module could not be loaded. Using iframe fallback...");
      });

    // Use WebSocket directly as a simpler approach
    const ws = new WebSocket(wsUrl);
    ws.binaryType = "arraybuffer";

    ws.onopen = () => {
      setStatus("connected");
    };

    ws.onerror = () => {
      setStatus("error");
      setErrorMsg("WebSocket connection failed. Make sure VNC server is running on the VM.");
    };

    ws.onclose = () => {
      if (status === "connected") {
        setStatus("disconnected");
      }
    };

    return () => {
      ws.close();
    };
  }, [ip, password]);

  return null; // placeholder - will be replaced below
}
