import type { User } from "@/store/userStore";
import { UsersTableRow } from "./UsersTableRow";

const COLUMNS = ["Utilisateur", "Contact", "Rôle", "Véhicule", "Statut", "Depuis", ""];

interface UsersTableProps {
  users: User[];
  isLoading: boolean;
  onEdit: (user: User) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}

export function UsersTable({ users, isLoading, onEdit, onDelete, onToggleStatus }: UsersTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-left">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col, i) => (
              <th key={i} className="px-5 py-3 text-xs font-semibold uppercase tracking-widest text-text-muted">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {COLUMNS.map((col, j) => (
                  <td key={j} className="px-5 py-3.5">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-[#f0f0f0]" />
                  </td>
                ))}
              </tr>
            ))
          ) : users.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-5 py-12 text-center text-sm text-text-muted">
                Aucun utilisateur trouvé
              </td>
            </tr>
          ) : (
            users.map((u) => (
              <UsersTableRow key={u.id} user={u} onEdit={onEdit} onDelete={onDelete} onToggleStatus={onToggleStatus} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
