import { useEffect, useState } from "react";
import { useUserStore, type User } from "@/store/userStore";
import { useVehicleStore } from "@/store/useVehicleStore";
import { UsersStatsCards } from "./users/UsersStatsCards";
import { UsersToolbar } from "./users/UsersToolbar";
import { UsersTable } from "./users/UsersTable";
import { UserFormDialog } from "./users/UserFormDialog";
import { DeleteConfirmDialog } from "./lines/DeleteConfirmDialog";
import { Pagination } from "./ui/Pagination";

export function UsersView() {
  const {
    filteredUsers,
    isLoading,
    filters,
    pagination,
    stats,
    setFilters,
    setPage,
    fetchAll,
    fetchStats,
    deleteUser,
    toggleActive,
  } = useUserStore();
  const fetchVehicles = useVehicleStore((s) => s.fetchAll);

  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  useEffect(() => {
    fetchAll();
    fetchStats();
    fetchVehicles();
  }, []);

  const handleCreate = () => {
    setEditingUser(null);
    setIsFormOpen(true);
  };

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsFormOpen(true);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setIsDeleteOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingId) {
      await deleteUser(deletingId);
      setDeletingId(null);
      setIsDeleteOpen(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <UsersStatsCards stats={stats} />

      <div className="rounded-[8px] border border-border bg-card">
        <UsersToolbar
          total={pagination.total}
          search={filters.search}
          onSearchChange={(value) => setFilters({ search: value })}
          role={filters.role}
          onRoleChange={(role) => setFilters({ role })}
          onAdd={handleCreate}
        />

        <UsersTable
          users={filteredUsers}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleStatus={toggleActive}
        />

        <Pagination
          page={pagination.page}
          totalPages={pagination.total_pages}
          total={pagination.total}
          limit={pagination.limit}
          onPageChange={setPage}
        />
      </div>

      <UserFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        initialData={editingUser}
        onSuccess={() => {
          setIsFormOpen(false);
          setEditingUser(null);
        }}
      />

      <DeleteConfirmDialog
        open={isDeleteOpen}
        onOpenChange={setIsDeleteOpen}
        onConfirm={confirmDelete}
        description="Cette action est irréversible. L'utilisateur sera définitivement supprimé."
      />
    </div>
  );
}
