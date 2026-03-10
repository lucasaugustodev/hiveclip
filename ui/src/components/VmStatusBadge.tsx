import { Badge } from "./ui/badge";

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  provisioning: { label: "Provisionando", variant: "outline" },
  running: { label: "Rodando", variant: "default" },
  stopped: { label: "Parada", variant: "secondary" },
  error: { label: "Erro", variant: "destructive" },
};

export function VmStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || { label: status, variant: "outline" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
