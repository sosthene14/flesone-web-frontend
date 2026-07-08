import { Pencil, Trash2, Mail, Phone, Bus } from "lucide-react";
import type { User } from "@/store/userStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { ROLE_CONFIG, ROLE_LABELS, STATUS_CONFIG, getInitials } from "./userRoleConfig";
import { RowActionsMenu } from "@/components/ui/RowActionsMenu";

interface UsersTableRowProps {
  user: User;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });
}

export function UsersTableRow({ user, onEdit, onDelete, onToggleStatus }: UsersTableRowProps) {
  // La relation est portée par user.vehicle_id (pas vehicle.driver_id, qui peut
  // ne pas être synchronisé côté backend selon comment l'assignation a été faite).
  const vehicle = useVehicleStore((s) =>
    s.vehicles.find((v) => v.id === user.vehicle_id || v.driver_id === user.id)
  );

  const rc = ROLE_CONFIG[user.role];
  const RoleIcon = rc.icon;
  const sc = STATUS_CONFIG[user.status];
  const fullName = `${user.first_name} ${user.last_name}`;

  return (
    <tr className="border-b border-border last:border-0 hover:bg-[#fafafa] transition-colors">
      <td className="px-5 py-3.5">
        <div className="flex items-center gap-3">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#f0f0f0] text-[10px] font-semibold text-text-secondary">
            {getInitials(user.first_name, user.last_name)}
          </div>
          <span className="text-sm font-medium text-text-primary">{fullName}</span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <div className="flex flex-col gap-0.5">
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Mail className="h-3 w-3 text-text-muted shrink-0" />{user.email || "—"}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-text-muted">
            <Phone className="h-3 w-3 shrink-0" />{user.phone || "—"}
          </span>
        </div>
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${rc.color}`}>
          <RoleIcon className="h-3.5 w-3.5" />
          {ROLE_LABELS[user.role]}
        </span>
      </td>
      <td className="px-5 py-3.5">
        {vehicle ? (
          <span className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Bus className="h-3 w-3 text-text-muted" />{vehicle.plate}
          </span>
        ) : (
          <span className="text-xs text-text-muted">—</span>
        )}
      </td>
      <td className="px-5 py-3.5">
        <span className={`inline-flex items-center gap-1.5 text-xs font-medium ${sc.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${sc.dot}`} />
          {sc.label}
        </span>
      </td>
      <td className="px-5 py-3.5 text-xs text-text-muted">{formatDate(user.created_at)}</td>
      <td className="px-5 py-3.5">
        <RowActionsMenu>
          {(close) => (
            <>
              <button
                onClick={() => { onEdit(user); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-text-muted" />
                Modifier
              </button>
              <button
                onClick={() => { onToggleStatus(user.id); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-text-secondary hover:bg-[#f5f5f5] hover:text-text-primary transition-colors"
              >
                <Pencil className="h-3.5 w-3.5 text-text-muted" />
                {user.status === "actif" ? "Désactiver" : "Activer"}
              </button>
              <div className="my-1 border-t border-border" />
              <button
                onClick={() => { onDelete(user.id); close(); }}
                className="flex w-full items-center gap-2 px-3 py-2 text-xs text-danger hover:bg-danger-soft transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Supprimer
              </button>
            </>
          )}
        </RowActionsMenu>
      </td>
    </tr>
  );
}
