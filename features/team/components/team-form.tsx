"use client";

import { useState } from "react";
import type { User, StaffPermissions } from "@/types/database";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { SectionCard } from "@/components/ui/section-card";
import { useMutation, errorMessageFrom } from "@/hooks/use-mutation";
import { formatCount } from "@/lib/format/number";

interface TeamManagementFormProps {
  initialTeamMembers: User[];
  canEdit?: boolean;
}

const PERMISSION_LABELS: Record<keyof StaffPermissions, string> = {
  manage_sessions: "تشغيل الجلسات",
  manage_shifts: "إدارة الورديات",
  record_sales: "تسجيل المبيعات",
  manage_settings: "تعديل الإعدادات",
  manage_team: "إدارة الفريق",
};

export default function TeamManagementForm({
  initialTeamMembers,
  canEdit = true,
}: TeamManagementFormProps) {
  const { showToast } = useToast();
  const [teamMembers, setTeamMembers] = useState(initialTeamMembers);
  const [inviteEmail, setInviteEmail] = useState("");
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editLoginId, setEditLoginId] = useState("");
  const [editDisplayName, setEditDisplayName] = useState("");
  const [editPermissions, setEditPermissions] = useState<StaffPermissions | null>(null);
  const [editEmail, setEditEmail] = useState("");
  const [deleteConfirmUserId, setDeleteConfirmUserId] = useState<string | null>(
    null
  );

  const { mutate: inviteMember, isPending: isInviting } = useMutation();
  const { mutate: saveMember, isPending: isSavingEdit } = useMutation();
  const { mutate: deleteMember, isPending: isDeleting } = useMutation();

  const handleInvite = async () => {
    if (!inviteEmail.trim()) {
      showToast("error", "يرجى إدخال البريد الإلكتروني");
      return;
    }

    await inviteMember({
      context: "Error inviting user",
      successMessage: "تمت إضافة العضو بنجاح",
      fallbackError: "حدث خطأ أثناء إضافة العضو",
      getErrorMessage: errorMessageFrom,
      onSuccess: (data) => {
        setTeamMembers((prev) => [...prev, data.user]);
        setInviteEmail("");
      },
      action: async (): Promise<{ user: User }> => {
        const response = await fetch("/api/team/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: inviteEmail.trim() }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "فشلت إضافة العضو");
        }

        return data;
      },
    });
  };

  const startEditing = (member: User) => {
    setEditingUserId(member.id);
    setEditLoginId(member.login_id);
    setEditDisplayName(member.display_name);
    setEditEmail(member.email || "");
    setEditPermissions({ ...member.permissions });
  };

  const cancelEditing = () => {
    setEditingUserId(null);
    setEditLoginId("");
    setEditDisplayName("");
    setEditEmail("");
    setEditPermissions(null);
  };

  const handleSaveEdit = async () => {
    if (!editingUserId || !editPermissions) return;

    if (!editLoginId.trim()) {
      showToast("error", "معرّف الدخول لا يمكن أن يكون فارغًا");
      return;
    }

    if (!editDisplayName.trim()) {
      showToast("error", "الاسم لا يمكن أن يكون فارغًا");
      return;
    }

    await saveMember({
      context: "Error saving edit",
      successMessage: "تم تحديث العضو بنجاح",
      fallbackError: "حدث خطأ أثناء تحديث العضو",
      getErrorMessage: errorMessageFrom,
      onSuccess: (data) => {
        setTeamMembers((prev) =>
          prev.map((m) => (m.id === editingUserId ? data.user : m))
        );
        cancelEditing();
      },
      action: async (): Promise<{ user: User }> => {
        const response = await fetch(`/api/team/${editingUserId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            login_id: editLoginId.trim(),
            display_name: editDisplayName.trim(),
            email: editEmail.trim() || undefined,
            permissions: editPermissions,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "فشل تحديث العضو");
        }

        return data;
      },
    });
  };

  const handleDelete = async () => {
    if (!deleteConfirmUserId) return;

    await deleteMember({
      context: "Error deleting user",
      successMessage: "تم حذف العضو وفقد صلاحية الدخول",
      fallbackError: "حدث خطأ أثناء حذف العضو",
      getErrorMessage: errorMessageFrom,
      onSuccess: () => {
        setTeamMembers((prev) => prev.filter((m) => m.id !== deleteConfirmUserId));
        setDeleteConfirmUserId(null);
      },
      action: async () => {
        const response = await fetch(`/api/team/${deleteConfirmUserId}`, {
          method: "DELETE",
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "فشل حذف العضو");
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Invite Section */}
      <SectionCard
        title="إضافة عضو جديد"
        description="أدخل البريد الإلكتروني للموظف لإرسال دعوة. النظام سيولّد معرّف دخول تلقائيًا."
      >

        <div className="mt-4 flex gap-2">
          <Input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") handleInvite(); }}
            disabled={!canEdit}
            className="flex-1"
            placeholder="example@email.com"
            dir="ltr"
          />
            <button
              type="button"
            onClick={handleInvite}
            disabled={!canEdit || isInviting}
            className="min-h-[44px] min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isInviting ? "جاري..." : "تأكيد"}
          </button>
        </div>
      </SectionCard>

      {/* Active Members Section */}
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          الأعضاء النشطون ({formatCount(teamMembers.length)})
        </h2>

        {teamMembers.length === 0 ? (
          <p className="text-sm text-foreground-muted">لا يوجد أعضاء نشطون. قم بإضافة أول عضو.</p>
        ) : (
          <div className="space-y-4">
            {teamMembers.map((member) => (
              <div key={member.id}>
                {editingUserId === member.id ? (
                  /* Edit Mode */
                  <div className="rounded-lg bg-surface-page/50 p-4 space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        معرّف الدخول
                      </label>
                      <Input
                        type="text"
                        value={editLoginId}
                        onChange={(e) => setEditLoginId(e.target.value)}
                        disabled={!canEdit}
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        الاسم
                      </label>
                      <Input
                        type="text"
                        value={editDisplayName}
                        onChange={(e) => setEditDisplayName(e.target.value)}
                        disabled={!canEdit}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        البريد الإلكتروني
                      </label>
                      <Input
                        type="email"
                        value={editEmail}
                        onChange={(e) => setEditEmail(e.target.value)}
                        disabled={!canEdit}
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        الصلاحيات
                      </label>
                      <div className="space-y-2">
                        {(Object.keys(PERMISSION_LABELS) as (keyof StaffPermissions)[]).map((key) => (
                          <label
                            key={key}
                            className="flex items-center gap-3 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={editPermissions?.[key] ?? false}
                              onChange={(e) => {
                                if (!editPermissions) return;
                                setEditPermissions({
                                  ...editPermissions,
                                  [key]: e.target.checked,
                                });
                              }}
                              disabled={!canEdit}
                              className="h-5 w-5 rounded border-foreground-muted/30 bg-surface-page text-primary focus:ring-primary/30 disabled:opacity-50"
                            />
                            <span className="text-sm text-foreground">
                              {PERMISSION_LABELS[key]}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveEdit}
                        disabled={!canEdit || isSavingEdit}
                        className="flex-1 min-h-[44px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSavingEdit ? "جاري الحفظ..." : "حفظ التغييرات"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEditing}
                        disabled={!canEdit}
                        className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/30 px-4 py-2 text-sm font-medium text-foreground hover:bg-surface-page disabled:opacity-50"
                      >
                        إلغاء
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View Mode */
                  <div className="flex items-center justify-between rounded-lg bg-surface-page/50 p-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground truncate">
                          {member.display_name}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          member.role === "owner"
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {member.role === "owner" ? "مدير" : "موظف"}
                        </span>
                      </div>
                      <div className="mt-1 text-xs text-foreground-muted" dir="ltr">
                        {member.email || ""}
                      </div>
                    </div>
                    {member.role !== "owner" && (
                      <div className="flex items-center gap-2 mr-4">
                        <button
                          type="button"
                          onClick={() => startEditing(member)}
                          disabled={!canEdit}
                          className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-primary hover:bg-primary/10 transition-colors disabled:opacity-30"
                        >
                          تعديل
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmUserId(member.id)}
                          disabled={!canEdit}
                          className="min-h-[44px] rounded-lg px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-30"
                        >
                          حذف
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmUserId && (
        <ConfirmDialog
          title="تأكيد حذف العضو"
          message="هل أنت متأكد من حذف هذا العضو؟ العضو سيفقد صلاحية الدخول فورًا."
          confirmLabel={isDeleting ? "جاري الحذف..." : "حذف"}
          onConfirm={handleDelete}
          onCancel={() => setDeleteConfirmUserId(null)}
          confirmDisabled={isDeleting}
          cancelDisabled={isDeleting}
        />
      )}
    </div>
  );
}
