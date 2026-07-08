import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { AlertSeverity, AlertStatus } from "@/store/useAlertStore";
import { SEVERITY_OPTIONS, STATUS_OPTIONS } from "./alertConfig";

interface AlertsToolbarProps {
  count: number;
  status: AlertStatus | "";
  onStatusChange: (status: AlertStatus | "") => void;
  severity: AlertSeverity | "";
  onSeverityChange: (severity: AlertSeverity | "") => void;
}

export function AlertsToolbar({ count, status, onStatusChange, severity, onSeverityChange }: AlertsToolbarProps) {
  const [statusOpen, setStatusOpen] = useState(false);
  const [severityOpen, setSeverityOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Alertes</h2>
        <p className="text-md text-text-muted mt-0.5">
          {count} alerte{count !== 1 ? "s" : ""} affichée{count !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setStatusOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-[#f5f5f5] transition-colors"
          >
            {status === "" ? "Tous les statuts" : STATUS_OPTIONS.find((s) => s.value === status)?.label}
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>
          {statusOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-[6px] border border-border bg-card shadow-lg py-1">
              <button
                onClick={() => { onStatusChange(""); setStatusOpen(false); }}
                className={`flex w-full px-3 py-2 text-[12px] hover:bg-[#f5f5f5] ${status === "" ? "font-semibold text-text-primary" : "text-text-secondary"}`}
              >
                Tous les statuts
              </button>
              {STATUS_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onStatusChange(s.value); setStatusOpen(false); }}
                  className={`flex w-full px-3 py-2 text-[12px] hover:bg-[#f5f5f5] ${status === s.value ? "font-semibold text-text-primary" : "text-text-secondary"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setSeverityOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-[#f5f5f5] transition-colors"
          >
            {severity === "" ? "Toutes sévérités" : SEVERITY_OPTIONS.find((s) => s.value === severity)?.label}
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>
          {severityOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-44 rounded-[6px] border border-border bg-card shadow-lg py-1">
              <button
                onClick={() => { onSeverityChange(""); setSeverityOpen(false); }}
                className={`flex w-full px-3 py-2 text-[12px] hover:bg-[#f5f5f5] ${severity === "" ? "font-semibold text-text-primary" : "text-text-secondary"}`}
              >
                Toutes sévérités
              </button>
              {SEVERITY_OPTIONS.map((s) => (
                <button
                  key={s.value}
                  onClick={() => { onSeverityChange(s.value); setSeverityOpen(false); }}
                  className={`flex w-full px-3 py-2 text-[12px] hover:bg-[#f5f5f5] ${severity === s.value ? "font-semibold text-text-primary" : "text-text-secondary"}`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
