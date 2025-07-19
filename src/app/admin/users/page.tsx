"use client";

import { useSupabase } from "@/components/session-context-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, User, PlusCircle, Pencil, Trash2 } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { getSupabaseFunctionUrl } from "@/lib/utils"; // Import the utility function
import { StatusCard } from "@/components/common/status-card"; // Import StatusCard
import { showErrorToast, showSuccessToast } from "@/lib/toast"; // Import from new utility
import { IconButton } from "@/components/common/icon-button"; // Import IconButton
import { useIsMobile } from "@/hooks/use-mobile"; // Import useIsMobile
import { supabase } from "@/lib/supabaseClient"; // Import supabase client directly

interface UserProfile {
  id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  class_taught: string | null;
}

export default function AdminUsersPage() {
  const { session } = useSupabase(); // Still need session for auth context
  const router = useRouter();
  const isMobile = useIsMobile(); // Use the hook
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);

    if (!session?.user?.id) {
      setError("Anda harus login untuk melihat data pengguna.");
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("list-users-by-admin"), {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`, // Use session token for authorization
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal memuat data pengguna.");
      }

      setUsers(data.users || []);
    } catch (err: any) {
      setError(err.message);
      showErrorToast("Gagal memuat data pengguna: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [session]); // Removed supabase from dependencies

  const handleDeleteClick = (user: UserProfile) => {
    setUserToDelete(user);
    setIsDeleteDialogOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (!userToDelete || !session?.user?.id) {
      showErrorToast("Terjadi kesalahan saat menghapus pengguna.");
      return;
    }

    // Prevent admin from deleting their own account
    if (userToDelete.id === session.user.id) {
      showErrorToast("Anda tidak dapat menghapus akun Anda sendiri.");
      setIsDeleteDialogOpen(false);
      return;
    }

    // Ensure only admin can delete users (this check is also done in the Edge Function)
    const { data: adminProfile, error: adminProfileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (adminProfileError || adminProfile?.role !== "admin") {
      showErrorToast("Akses ditolak. Anda tidak memiliki izin untuk menghapus pengguna.");
      setIsDeleteDialogOpen(false);
      return;
    }

    try {
      const response = await fetch(getSupabaseFunctionUrl("delete-user-by-admin"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          "Authorization": `Bearer ${session.access_token}`, // Use session token for authorization
        },
        body: JSON.stringify({ userId: userToDelete.id }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Gagal menghapus pengguna.");
      }

      showSuccessToast(`Pengguna ${userToDelete.email} berhasil dihapus.`);
      fetchUsers(); // Re-fetch the user list
    } catch (err: any) {
      showErrorToast("Gagal menghapus pengguna: " + err.message);
    } finally {
      setIsDeleteDialogOpen(false);
      setUserToDelete(null);
    }
  };

  if (loading) {
    return <StatusCard status="loading" title="Memuat Data Pengguna..." />;
  }

  if (error) {
    return <StatusCard status="error" message={error} backButtonHref="/admin/dashboard" backButtonText="Kembali ke Dashboard Admin" />;
  }

  return (
    <Card className="w-full mx-auto max-w-6xl">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-2xl">Manajemen Pengguna</CardTitle>
        <div className="flex space-x-2">
          <Button onClick={() => router.push("/admin/users/add")} size="sm">
            <PlusCircle className="mr-2 h-4 w-4" /> {!isMobile && "Tambah Pengguna"}
          </Button>
          <IconButton
            icon={ArrowLeft}
            tooltip="Kembali"
            onClick={() => router.push("/admin/dashboard")}
            variant="outline"
          >
            {!isMobile && "Kembali"}
          </IconButton>
        </div>
      </CardHeader>
      <CardContent>
        {users.length === 0 ? (
          <p className="text-center text-muted-foreground">Belum ada pengguna yang terdaftar.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">Nama Lengkap</TableHead>
                  <TableHead className="whitespace-nowrap">Email</TableHead>
                  <TableHead className="whitespace-nowrap">Peran</TableHead>
                  <TableHead className="whitespace-nowrap">Kelas Diajar</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium whitespace-nowrap">
                      {user.first_name || '-'} {user.last_name || ''}
                    </TableCell>
                    <TableCell className="whitespace-nowrap">{user.email}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.role}</TableCell>
                    <TableCell className="whitespace-nowrap">{user.role === 'teacher' ? (user.class_taught || '-') : '-'}</TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <div className="flex justify-end space-x-2">
                        <IconButton
                          icon={Pencil}
                          tooltip="Edit Pengguna"
                          onClick={() => router.push(`/admin/users/${user.id}/edit`)}
                          variant="outline"
                        />
                        <IconButton
                          icon={Trash2}
                          tooltip="Hapus Pengguna"
                          onClick={() => handleDeleteClick(user)}
                          variant="destructive"
                          disabled={user.id === session?.user?.id}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apakah Anda yakin ingin menghapus pengguna ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Ini akan menghapus akun pengguna{" "}
              <span className="font-semibold">{userToDelete?.email}</span> secara permanen dan menghapus data profil terkait.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDeleteUser} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}