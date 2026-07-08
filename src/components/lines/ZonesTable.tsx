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
import { Skeleton } from "@/components/ui/skeleton";
import { ZoneFormDialog } from "./ZoneFormDialog";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import { useZoneStore, Zone } from "@/store/useZoneStore";

export function ZonesTable() {
  const {
    filteredZones,
    isLoading,
    error,
    fetchZones,
    deleteZone,
    filters,
    setFilters,
  } = useZoneStore();

  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchZones();
  }, []);

  const handleCreate = () => {
    setEditingZone(null);
    setIsFormOpen(true);
  };

  const handleEdit = (zone: Zone) => {
    setEditingZone(zone);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteZone(deletingId);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value });
  };

  if (error) {
    return <div className="p-4 text-center text-red-500">Erreur : {error}</div>;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une zone..."
              value={filters.search}
              onChange={handleSearch}
              className="pl-8 w-64 h-9 text-md"
            />
          </div>
          <span className="text-md text-muted-foreground">
            {filteredZones.length} zone{filteredZones.length > 1 ? "s" : ""}
          </span>
        </div>
        <Button onClick={handleCreate} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle zone
        </Button>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nom</TableHead>
              <TableHead>Statut</TableHead>
              <TableHead>Adresse</TableHead>
              <TableHead>Position</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                </TableRow>
              ))
            ) : filteredZones.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                  Aucune zone configurée.
                </TableCell>
              </TableRow>
            ) : (
              filteredZones.map((zone) => (
                <TableRow key={zone.id}>
                  <TableCell className="font-medium">
                    {zone.name}
                    {zone.is_default && (
                      <span className="ml-2 text-xs text-muted-foreground">(par défaut)</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={zone.is_active ? "success" : "secondary"}>
                      <span
                        className={`mr-1 h-1.5 w-1.5 rounded-full ${
                          zone.is_active ? "bg-green-500" : "bg-gray-400"
                        }`}
                      />
                      {zone.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[280px] text-md text-muted-foreground">
                    {zone.address ? (
                      <p className="truncate" title={zone.address}>{zone.address}</p>
                    ) : (
                      <span className="text-xs text-muted-foreground/70">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-md text-muted-foreground">
                    {zone.latitude.toFixed(4)}, {zone.longitude.toFixed(4)}
                  </TableCell>
                  <TableCell className="text-right">
                    {!zone.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(zone)}
                        className="mr-2"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {!zone.is_default && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(zone.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <ZoneFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingZone}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingZone(null);
        }}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        description="Cette action est irréversible. La zone sera définitivement supprimée."
      />
    </div>
  );
}
