import { CheckCircle2, Trash2 } from "lucide-react";
import type { Alert } from "@/store/useAlertStore";
import { iconFor, formatTime, SEVERITY_STYLE } from "./alertConfig";

interface AlertRowProps {
  alert: Alert;
  vehiclePlate: string | null;
  onResolve: (id: string) => void;
  onDelete: (id: string) => void;
}

export function AlertRow({ alert, vehiclePlate, onResolve, onDelete }: AlertRowProps) {
  const Icon = iconFor(alert);
  const style = SEVERITY_STYLE[alert.severity] || SEVERITY_STYLE.info;

  return (
    <li className="flex items-start gap-3.5 px-5 py-3.5 hover:bg-[#fafafa] transition-colors">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${style.icon}`} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-text-primary truncate">{alert.message}</p>
          <span className="shrink-0 text-md text-text-muted">{formatTime(alert.created_at)}</span>
        </div>
        <p className="mt-0.5 text-[12px] text-text-muted">{alert.type || "Alerte système"}</p>
        <div className="mt-1.5 flex items-center gap-2">
          <span className={`inline-block rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
            {style.label}
          </span>
          <span className="text-md text-text-muted">{vehiclePlate ?? "Non assigné"}</span>
          {alert.status === "resolved" && (
            <span className="text-md text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Résolue</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {alert.status === "open" && (
          <button
            onClick={() => onResolve(alert.id)}
            title="Marquer comme résolue"
            className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-[#f5f5f5] hover:text-success transition-colors"
          >
            <CheckCircle2 className="h-4 w-4" />
          </button>
        )}
        <button
          onClick={() => onDelete(alert.id)}
          title="Supprimer"
          className="flex h-7 w-7 items-center justify-center rounded-[6px] text-text-muted hover:bg-danger-soft hover:text-danger transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}
