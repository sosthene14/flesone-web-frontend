import { useEffect, useState } from "react";
import { Plus, Edit, Trash2, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LineFormDialog } from "./LineFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { ZonesTable } from "./ZonesTable";
import { Skeleton } from "@/components/ui/skeleton";
import { useLineStore } from "@/store/useLineStore";
import { cn } from "@/lib/utils";

export function LinesView() {
  const [tab, setTab] = useState<"lines" | "zones">("zones");

  const {
    filteredLines,
    isLoading,
    error,
    fetchAll,
    deleteLine,
    filters,
    setFilters,
  } = useLineStore();

  const [editingLine, setEditingLine] = useState<any>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  console.log(filteredLines)

  useEffect(() => {
    fetchAll();
  }, []);

  const handleCreate = () => {
    setEditingLine(null);
    setIsFormOpen(true);
  };

  const handleEdit = (line: any) => {
    setEditingLine(line);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteLine(deletingId);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  // Formatage de la date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (error) {
    return <div className="p-4 text-center text-red-500">Erreur : {error}</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Onglets Lignes / Zones */}
      <div className="flex items-center gap-1 border-b border-border">
        <button
          type="button"
          onClick={() => setTab("zones")}
          className={cn(
            "px-3 py-2 text-md font-medium border-b-2 -mb-px transition-colors",
            tab === "zones"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Zones
        </button>
        <button
          type="button"
          onClick={() => setTab("lines")}
          className={cn(
            "px-3 py-2 text-md font-medium border-b-2 -mb-px transition-colors",
            tab === "lines"
              ? "border-primary text-primary"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Lignes
        </button>
      </div>

      {tab === "zones" ? (
        <ZonesTable />
      ) : (
      <>
      {/* En-tête avec recherche et bouton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une ligne..."
              value={filters.search}
              onChange={handleSearch}
              className="pl-8 w-64 h-9 text-md"
            />
          </div>
          <span className="text-md text-muted-foreground">
            {filteredLines.length} ligne{filteredLines.length > 1 ? "s" : ""}
          </span>
        </div>
        <Button  onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle ligne
        </Button>
      </div>

      {/* Tableau */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Zones</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Créée le</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              // Lignes de chargement
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredLines.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                  Aucune ligne configurée.
                </TableCell>
              </TableRow>
            ) : (
              filteredLines.map((line) => (
                <TableRow key={line.id}>
                  <TableCell className="font-medium">
                    <span className="flex items-center gap-2">
                      <span
                        className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/5"
                        style={{ backgroundColor: line.color || "#9CA3AF" }}
                      />
                      {line.name}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={line.status === "active" ? "success" : "secondary"}>
                      <span
                        className={`mr-1 h-1.5 w-1.5 rounded-full ${
                          line.status === "active" ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      {line.status === "active" ? "Active" : line.status === "inactive" ? "Inactive" : "Archivée"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[220px]">
                    {line.zones && line.zones.length > 0 ? (
                      <div className="flex flex-wrap items-center gap-1">
                        {line.zones.slice(0, 3).map((zone, index) => (
                          <span
                            key={zone.id}
                            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-md text-muted-foreground"
                          >
                            <span className="text-[10px] text-muted-foreground/70">{index + 1}.</span>
                            {zone.name}
                          </span>
                        ))}
                        {line.zones.length > 3 && (
                          <span className="text-md text-muted-foreground">
                            +{line.zones.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">—</span>
                    )}
                  </TableCell>
                  <TableCell className="max-w-xs truncate">
                    {line.description || "—"}
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    {formatDate(line.created_at)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(line)}
                      className="mr-2"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(line.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Dialogues */}
      <LineFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingLine}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingLine(null);
        }}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
      />
      </>
      )}
    </div>
  );
}