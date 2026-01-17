"use client";

import React, { useEffect, useState } from "react";
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminDeleteUser,
} from "@/services/admin-users";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2 } from "lucide-react";

const roles = [
  { id: "role_admin", name: "Admin" },
  { id: "role_teacher", name: "Teacher" },
  { id: "role_student", name: "Student" },
];

export default function UserManagement() {
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [items, setItems] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const { toast } = useToast();

  const fetch = async () => {
    try {
      const res = await adminListUsers({
        q,
        roleId: role,
        status,
        page,
        pageSize,
      });
      const normalized = (res.items || []).map((it: any) => ({
        Id: it.Id || it.id,
        Email: it.Email || it.email,
        DisplayName: it.DisplayName || it.displayName,
        RoleId: it.RoleId || it.roleId,
        Status: it.Status || it.status,
        OmniChatEnabled:
          typeof it.OmniChatEnabled === "boolean"
            ? it.OmniChatEnabled
            : typeof it.omniChatEnabled === "boolean"
            ? it.omniChatEnabled
            : it.OmniChatEnabled === 1,
        CreatedAt: it.CreatedAt || it.createdAt,
      }));
      setItems(normalized);
      setTotal(res.total || 0);
    } catch (err: any) {
      console.error("Failed to fetch users", err);
      toast({ variant: "destructive", title: "Failed to load users" });
    }
  };

  useEffect(() => {
    fetch();
  }, [q, role, status, page, pageSize]);
  const [createOpen, setCreateOpen] = useState(false);
  const [newId, setNewId] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newDisplayName, setNewDisplayName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRoleId, setNewRoleId] = useState("role_student");
  const [isCreating, setIsCreating] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<any | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editRoleId, setEditRoleId] = useState("role_student");
  const [editStatus, setEditStatus] = useState("pending");
  const [isUpdating, setIsUpdating] = useState(false);

  const handleCreate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!newId || !newEmail || !newPassword) {
      toast({ variant: "destructive", title: "Please fill required fields" });
      return;
    }
    setIsCreating(true);
    try {
      await adminCreateUser({
        id: newId,
        email: newEmail,
        displayName: newDisplayName,
        password: newPassword,
        roleId: newRoleId,
      });
      toast({ title: "Created" });
      setCreateOpen(false);
      setNewId("");
      setNewEmail("");
      setNewDisplayName("");
      setNewPassword("");
      setNewRoleId("role_student");
      fetch();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Create failed" });
    } finally {
      setIsCreating(false);
    }
  };

  const getNextUserId = (): string => {
    try {
      const regex = /^user_(\d+)$/;
      const nums = items
        .map((it) => {
          const id = it.Id || it.id || "";
          const m = regex.exec(id);
          return m ? parseInt(m[1], 10) : null;
        })
        .filter((n) => n !== null) as number[];
      const max = nums.length ? Math.max(...nums) : 0;
      const next = max + 1;
      return `user_${String(next).padStart(6, "0")}`;
    } catch (err) {
      return "user_000001";
    }
  };

  const handleCreateOpenChange = (open: boolean) => {
    setCreateOpen(open);
    if (open) {
      setNewId(getNextUserId());
    }
  };

  const openEdit = (item: any) => {
    if ((item.RoleId || "") === "role_admin") return;
    setEditTarget(item);
    setEditEmail(item.Email || "");
    setEditDisplayName(item.DisplayName || "");
    setEditRoleId(item.RoleId || "role_student");
    setEditStatus(item.Status || "pending");
    setEditOpen(true);
  };

  const handleEditSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!editTarget) return;
    setIsUpdating(true);
    try {
      await adminUpdateUser(editTarget.Id, {
        email: editEmail,
        displayName: editDisplayName,
        roleId: editRoleId,
        status: editStatus,
      });
      toast({ title: "Updated" });
      setEditOpen(false);
      setEditTarget(null);
      fetch();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Update failed" });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (item: any) => {
    if ((item.RoleId || "") === "role_admin") return;
    if (!confirm(`Delete user ${item.Email}?`)) return;
    try {
      await adminDeleteUser(item.Id);
      toast({ title: "Deleted" });
      fetch();
    } catch (err: any) {
      console.error(err);
      toast({ variant: "destructive", title: "Delete failed" });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          placeholder="Search by email or name"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Select
          value={role}
          onValueChange={(v) => setRole(v === "ALL" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All roles</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r.id} value={r.id}>
                {r.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v === "ALL" ? "" : v)}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={() => {
            setPage(1);
            fetch();
          }}
        >
          Search
        </Button>
        <div className="ml-auto">
          <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
            <DialogTrigger asChild>
              <Button onClick={() => setCreateOpen(true)}>
                Tạo người dùng mới
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tạo người dùng mới</DialogTitle>
                <DialogDescription>
                  Thêm tài khoản người dùng mới vào hệ thống.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4 mt-2">
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Id</label>
                  <Input
                    value={newId}
                    onChange={(e) => setNewId(e.target.value)}
                    placeholder="user_123"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Email</label>
                  <Input
                    type="email"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Display name</label>
                  <Input
                    value={newDisplayName}
                    onChange={(e) => setNewDisplayName(e.target.value)}
                    placeholder="Full name"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Password"
                  />
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <label className="text-sm">Role</label>
                  <Select
                    value={newRoleId}
                    onValueChange={(v) => setNewRoleId(v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="role_admin">Admin</SelectItem>
                      <SelectItem value="role_teacher">Teacher</SelectItem>
                      <SelectItem value="role_student">Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Hủy
                    </Button>
                  </DialogClose>
                  <Button type="submit" disabled={isCreating}>
                    {isCreating ? "Đang tạo..." : "Tạo"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">STT</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>OmniChat</TableHead>
            <TableHead>Created</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((it, idx) => {
            const isAdmin = (it.RoleId || "") === "role_admin";
            const index = (page - 1) * pageSize + idx + 1;

            return (
              <TableRow key={it.Id}>
                <TableCell className="text-center">{index}</TableCell>
                <TableCell>{it.Email}</TableCell>
                <TableCell>{it.DisplayName}</TableCell>
                <TableCell>{it.RoleId}</TableCell>
                <TableCell>
                  <Select
                    value={it.Status || "pending"}
                    disabled={isAdmin}
                    onValueChange={async (val) => {
                      if (isAdmin) return;
                      try {
                        await adminUpdateUser(it.Id, { status: val });
                        setItems((prev) =>
                          prev.map((row) =>
                            row.Id === it.Id ? { ...row, Status: val } : row
                          )
                        );
                        toast({ title: "Status updated" });
                      } catch (err: any) {
                        console.error(err);
                        toast({
                          variant: "destructive",
                          title: "Update failed",
                        });
                      }
                    }}
                  >
                    <SelectTrigger className="h-9 w-[150px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Switch
                    disabled={isAdmin}
                    checked={!!it.OmniChatEnabled}
                    onCheckedChange={async (val) => {
                      if (isAdmin) return;
                      try {
                        await adminUpdateUser(it.Id, {
                          omniChatEnabled: val,
                        });
                        setItems((prev) =>
                          prev.map((row) =>
                            row.Id === it.Id
                              ? { ...row, OmniChatEnabled: val }
                              : row
                          )
                        );
                        toast({ title: "OmniChat updated" });
                      } catch (err) {
                        console.error(err);
                        toast({
                          variant: "destructive",
                          title: "Update failed",
                        });
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  {it.CreatedAt ? new Date(it.CreatedAt).toLocaleString() : "-"}
                </TableCell>
                <TableCell className="space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(it)}
                    aria-label="Edit user"
                    disabled={isAdmin}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(it)}
                    aria-label="Delete user"
                    disabled={isAdmin}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Chỉnh sửa người dùng</DialogTitle>
            <DialogDescription>Cập nhật thông tin tài khoản.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-4 mt-2">
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm">Email</label>
              <Input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm">Display name</label>
              <Input
                value={editDisplayName}
                onChange={(e) => setEditDisplayName(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm">Role</label>
              <Select
                value={editRoleId}
                onValueChange={(v) => setEditRoleId(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="role_admin">Admin</SelectItem>
                  <SelectItem value="role_teacher">Teacher</SelectItem>
                  <SelectItem value="role_student">Student</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <label className="text-sm">Status</label>
              <Select
                value={editStatus}
                onValueChange={(v) => setEditStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Hủy
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? "Đang lưu..." : "Lưu"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          Showing {items.length} of {total}
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setPage((p) => Math.max(1, p - 1))}>
            Prev
          </Button>
          <div>Page {page}</div>
          <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </div>
  );
}
