import { FleetTableRow, type FleetRowData } from "./FleetTableRow";

const COLUMNS = ["Véhicule", "Chauffeur", "Ligne", "Progression", "Statut"];

interface FleetTableProps {
  rows: FleetRowData[];
  isLoading: boolean;
}

export function FleetTable({ rows, isLoading }: FleetTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-border">
            {COLUMNS.map((col) => (
              <th
                key={col}
                className="px-5 py-3 text-md font-semibold uppercase tracking-widest text-text-muted"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <tr key={i} className="border-b border-border last:border-0">
                {COLUMNS.map((col) => (
                  <td key={col} className="px-5 py-3.5">
                    <div className="h-3.5 w-20 animate-pulse rounded bg-[#f0f0f0]" />
                  </td>
                ))}
              </tr>
            ))
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length} className="px-5 py-8 text-center text-sm text-text-muted">
                Aucun véhicule enregistré.
              </td>
            </tr>
          ) : (
            rows.map((row) => <FleetTableRow key={row.vehicle.id} {...row} />)
          )}
        </tbody>
      </table>
    </div>
  );
}
