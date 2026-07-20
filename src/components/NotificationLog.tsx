import { Bell } from "lucide-react";
import { useAlertStore } from "@/store/useAlertStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { SEVERITY_STYLE } from "./alerts/alertConfig";

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

interface NotificationLogProps {
  limit?: number;
}

// Ne déclenche aucun fetch : les alertes et véhicules sont déjà chargés
// globalement (useFetchDatas au login) ou par la vue parente qui monte ce
// composant (AlertsPanel, FleetView, ...). On ne fait que lire le store.
export function NotificationLog({ limit = 8 }: NotificationLogProps) {
  // recentAlerts : flux non filtré/non paginé (voir useAlertStore.fetchRecent),
  // déjà trié le plus récent d'abord côté serveur — indépendant de ce que
  // l'admin regarde sur la page /alerts.
  const { recentAlerts, isLoadingRecent: isLoading } = useAlertStore();
  const { vehicles } = useVehicleStore();

  const items = recentAlerts.slice(0, limit);

  const vehiclePlate = (vehicleId?: string | null) =>
    vehicleId ? vehicles.find((v) => v.id === vehicleId)?.plate : undefined;

  return (
    <div className="rounded-[8px] border border-border bg-card">
      <div className="flex items-center gap-2.5 border-b border-border px-5 py-3.5">
        <Bell className="h-4 w-4 text-text-muted" />
        <h2 className="text-sm font-semibold text-text-primary">Journal des notifications</h2>
      </div>

      {isLoading ? (
        <ul className="divide-y divide-border">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="px-5 py-3">
              <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#f0f0f0]" />
            </li>
          ))}
        </ul>
      ) : items.length === 0 ? (
        <div className="px-5 py-8 text-center text-md text-text-muted">Aucune notification récente</div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((n) => {
            const style = SEVERITY_STYLE[n.severity] || SEVERITY_STYLE.info;
            const plate = vehiclePlate(n.vehicle_id);
            return (
              <li key={n.id} className="flex items-start gap-4 px-5 py-3 hover:bg-[#fafafa] transition-colors">
                <span className="mt-0.5 w-10 shrink-0 text-md font-medium text-text-muted tabular-nums">
                  {formatTime(n.created_at)}
                </span>
                <span className={`mt-0.5 shrink-0 rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${style.badge}`}>
                  {style.label}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary truncate">{n.message}</p>
                  <p className="mt-0.5 text-md text-text-muted">
                    {plate ? `Véhicule ${plate}` : n.type || "Système"}
                    {n.status === "resolved" ? " · Résolue" : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
