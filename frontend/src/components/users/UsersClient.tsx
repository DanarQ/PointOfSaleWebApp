"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { KeyRound, MoreHorizontal, Plus, Search, ShieldCheck, UserRoundCog } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/app-shell/PageHeader";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UserAccount,
  createUser,
  deleteUser,
  listUsers,
  resetUserPassword,
  updateUser,
} from "@/lib/pos-api";
import { saveStoredAuth } from "@/lib/session";
import { useAuthSession } from "@/lib/use-auth-session";
import { UserRole, getRoleLabel } from "@/types/auth";

const ALL_ROLES = "__all__";
const PAGE_LIMIT = 10;

type UserFormState = {
  email: string;
  password: string;
  role: UserRole;
};

const emptyForm: UserFormState = {
  email: "",
  password: "",
  role: "user",
};

function userToForm(user: UserAccount): UserFormState {
  return {
    email: user.email,
    password: "",
    role: user.role,
  };
}

function formatCount(value: number) {
  return new Intl.NumberFormat("id-ID").format(value);
}

export function UsersClient() {
  const auth = useAuthSession();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalUsers, setTotalUsers] = useState(0);
  const [search, setSearch] = useState("");
  const [submittedSearch, setSubmittedSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(ALL_ROLES);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserAccount | null>(null);
  const [form, setForm] = useState<UserFormState>(emptyForm);
  const [isSaving, setIsSaving] = useState(false);
  const [resettingUser, setResettingUser] = useState<UserAccount | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState("");
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const currentUserId = auth?.user.id ?? 0;

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setError("");

    try {
      const response = await listUsers({
        page,
        limit: PAGE_LIMIT,
        search: submittedSearch || undefined,
        role: roleFilter === ALL_ROLES ? undefined : roleFilter as UserRole,
      });

      setUsers(response.data);
      setTotalPages(response.pagination.totalPages || 1);
      setTotalUsers(response.pagination.total);
    } catch (loadError) {
      const message = loadError instanceof Error ? loadError.message : "Failed to load users.";
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  }, [page, roleFilter, submittedSearch]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadUsers();
    }, 0);

    return () => window.clearTimeout(timer);
  }, [loadUsers]);

  function openCreateDialog() {
    setEditingUser(null);
    setForm(emptyForm);
    setIsDialogOpen(true);
  }

  function openEditDialog(user: UserAccount) {
    setEditingUser(user);
    setForm(userToForm(user));
    setIsDialogOpen(true);
  }

  function openResetDialog(user: UserAccount) {
    setResettingUser(user);
    setResetPasswordValue("");
  }

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setSubmittedSearch(search.trim());
  }

  function handleRoleFilterChange(value: string) {
    setPage(1);
    setRoleFilter(value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const email = form.email.trim().toLowerCase();

    if (!email || !email.includes("@")) {
      toast.error("Valid email is required.");
      return;
    }

    if (!editingUser && form.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    if (editingUser?.id === currentUserId && form.role !== "admin") {
      toast.error("Current admin account cannot be demoted.");
      return;
    }

    setIsSaving(true);

    try {
      const savedUser = editingUser
        ? await updateUser(editingUser.id, { email, role: form.role })
        : await createUser({ email, password: form.password, role: form.role });

      if (auth && savedUser.id === auth.user.id) {
        saveStoredAuth({ ...auth, user: savedUser });
      }

      toast.success(editingUser ? "User updated." : "User created.");
      setIsDialogOpen(false);
      await loadUsers();
    } catch (saveError) {
      toast.error(saveError instanceof Error ? saveError.message : "User could not be saved.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleResetPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!resettingUser) {
      return;
    }

    if (resetPasswordValue.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setIsResettingPassword(true);

    try {
      await resetUserPassword(resettingUser.id, { password: resetPasswordValue });
      toast.success("Password updated.");
      setResettingUser(null);
      setResetPasswordValue("");
    } catch (resetError) {
      toast.error(resetError instanceof Error ? resetError.message : "Password could not be updated.");
    } finally {
      setIsResettingPassword(false);
    }
  }

  async function handleDelete(user: UserAccount) {
    if (user.id === currentUserId) {
      toast.error("Current admin account cannot be deleted.");
      return;
    }

    if (!window.confirm(`Delete user ${user.email}?`)) {
      return;
    }

    try {
      await deleteUser(user.id);
      toast.success("User deleted.");
      await loadUsers();
    } catch (deleteError) {
      toast.error(deleteError instanceof Error ? deleteError.message : "User could not be deleted.");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin Access"
        title="Users"
        description="Kelola akun staf, role admin/kasir, dan reset password untuk akses operasional POS."
      />

      <Card className="mt-5 rounded-lg">
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg font-black">
                <UserRoundCog className="size-5 text-emerald-700" />
                Staff access control
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatCount(totalUsers)} account records available for admin management.
              </p>
            </div>
            <Button type="button" onClick={openCreateDialog}>
              <Plus />
              Add User
            </Button>
          </div>
          <Separator />
          <div className="grid gap-3 lg:grid-cols-[1fr_180px]">
            <form className="flex gap-2" onSubmit={handleSearchSubmit}>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search staff email"
              />
              <Button type="submit" variant="outline">
                <Search />
                Search
              </Button>
            </form>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_ROLES}>All roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">Kasir</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {error ? (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Users unavailable</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          ) : null}

          <div className="overflow-hidden rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff account</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">ID</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? Array.from({ length: 5 }).map((_, index) => (
                      <TableRow key={index}>
                        <TableCell colSpan={4}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      </TableRow>
                    ))
                  : null}

                {!isLoading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-28 text-center">
                      <div className="font-bold">No users found.</div>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Adjust search or add the first staff account from this page.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : null}

                {!isLoading
                  ? users.map((user) => {
                      const isCurrentUser = user.id === currentUserId;

                      return (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex min-w-0 flex-col gap-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="font-black text-emerald-950">{user.email}</span>
                                {isCurrentUser ? (
                                  <Badge variant="secondary">Current session</Badge>
                                ) : null}
                              </div>
                              <span className="text-xs font-bold uppercase text-stone-500">
                                POS staff credential
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                              {getRoleLabel(user.role)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-stone-600">{user.id}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon-sm" aria-label={`Actions for ${user.email}`}>
                                  <MoreHorizontal />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onSelect={() => openEditDialog(user)}>
                                  <ShieldCheck />
                                  Edit access
                                </DropdownMenuItem>
                                <DropdownMenuItem disabled={isCurrentUser} onSelect={() => openResetDialog(user)}>
                                  <KeyRound />
                                  Reset password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  disabled={isCurrentUser}
                                  variant="destructive"
                                  onSelect={() => void handleDelete(user)}
                                >
                                  Delete user
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  : null}
              </TableBody>
            </Table>
          </div>

          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={page <= 1 || isLoading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Previous
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={page >= totalPages || isLoading}
                onClick={() => setPage((current) => current + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? "Edit staff access" : "Add staff account"}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? "Update staff email and role access."
                : "Create a POS staff credential with an initial password."}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                placeholder="staff@toko.com"
              />
            </div>
            {!editingUser ? (
              <div className="space-y-2">
                <Label htmlFor="user-password">Initial password</Label>
                <Input
                  id="user-password"
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
                  placeholder="Minimum 6 characters"
                />
              </div>
            ) : null}
            <div className="space-y-2">
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(value) => setForm((current) => ({ ...current, role: value as UserRole }))}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem
                    value="user"
                    disabled={editingUser?.id === currentUserId}
                  >
                    Kasir
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? "Saving..." : "Save User"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(resettingUser)} onOpenChange={(open) => !open && setResettingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Set a new password for {resettingUser?.email ?? "this staff account"}.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleResetPassword}>
            <div className="space-y-2">
              <Label htmlFor="reset-password">New password</Label>
              <Input
                id="reset-password"
                type="password"
                value={resetPasswordValue}
                onChange={(event) => setResetPasswordValue(event.target.value)}
                placeholder="Minimum 6 characters"
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setResettingUser(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isResettingPassword}>
                {isResettingPassword ? "Updating..." : "Update Password"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
