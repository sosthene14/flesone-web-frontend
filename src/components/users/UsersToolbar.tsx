import { useState } from "react";
import { Search, ChevronDown, UserPlus } from "lucide-react";
import type { UserRole } from "@/store/userStore";
import { ROLE_LABELS } from "./userRoleConfig";

const ROLE_FILTERS: (UserRole | "")[] = ["", "driver", "admin", "user"];

interface UsersToolbarProps {
  total: number;
  search: string;
  onSearchChange: (value: string) => void;
  role: string;
  onRoleChange: (role: string) => void;
  onAdd: () => void;
}

export function UsersToolbar({ total, search, onSearchChange, role, onRoleChange, onAdd }: UsersToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="flex flex-col gap-3 border-b border-border px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-sm font-semibold text-text-primary">Gestion des utilisateurs</h2>
        <p className="text-md text-text-muted mt-0.5">
          {total} utilisateur{total !== 1 ? "s" : ""} au total
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 rounded-[6px] bg-[#f5f5f5] px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-text-muted shrink-0" />
          <input
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Rechercher…"
            className="w-36 bg-transparent text-[12px] text-text-primary outline-none placeholder:text-text-muted"
          />
        </div>

        <div className="relative">
          <button
            onClick={() => setFilterOpen((p) => !p)}
            className="flex items-center gap-1.5 rounded-[6px] border border-border px-3 py-1.5 text-[12px] text-text-secondary hover:bg-[#f5f5f5] transition-colors"
          >
            {role === "" ? "Tous les rôles" : ROLE_LABELS[role as UserRole]}
            <ChevronDown className="h-3 w-3 text-text-muted" />
          </button>
          {filterOpen && (
            <div className="absolute right-0 top-full z-10 mt-1 w-48 rounded-[6px] border border-border bg-card shadow-lg">
              {ROLE_FILTERS.map((r) => (
                <button
                  key={r || "all"}
                  onClick={() => {
                    onRoleChange(r);
                    setFilterOpen(false);
                  }}
                  className={`flex w-full items-center px-3 py-2.5 text-[12px] transition-colors hover:bg-[#f5f5f5] ${
                    role === r ? "text-text-primary font-semibold" : "text-text-secondary"
                  }`}
                >
                  {r === "" ? "Tous les rôles" : ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={onAdd}
          className="flex items-center gap-2 rounded-[6px] bg-accent px-3.5 py-2 text-[12px] font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Ajouter
        </button>
      </div>
    </div>
  );
}
