"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/numeric-input";
import { Modal } from "@/components/ui/modal";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { useToast } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { useMutation, errorMessageFrom } from "@/hooks/use-mutation";
import { formatCurrency } from "@/lib/format/number";
import { formatDate } from "@/lib/format/time";
import { ENDPOINTS } from "@/lib/constants/endpoints";
import { DatePicker } from "@/components/ui/date-picker";

interface Expense {
  id: string;
  shop_id: string;
  shift_id: string | null;
  description: string;
  amount: number;
  category: string | null;
  expense_date: string;
  created_at: string;
  shift_number: number | null;
  responsible_name: string | null;
}

interface ExpensesListProps {
  initialExpenses: Expense[];
  canEdit?: boolean;
}

export default function ExpensesList({
  initialExpenses,
  canEdit = true,
}: ExpensesListProps) {
  const { showToast } = useToast();
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const saveMutation = useMutation();
  const deleteMutation = useMutation();

  const [formDescription, setFormDescription] = useState("");
  const [formAmount, setFormAmount] = useState(0);
  const [formCategory, setFormCategory] = useState("");
  const [formDate, setFormDate] = useState("");

  const handleOpenAdd = () => {
    setEditingExpense(null);
    setFormDescription("");
    setFormAmount(0);
    setFormCategory("");
    setFormDate(new Date().toISOString().split("T")[0]);
    setShowModal(true);
  };

  const handleOpenEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setFormDescription(expense.description);
    setFormAmount(expense.amount);
    setFormCategory(expense.category ?? "");
    setFormDate(expense.expense_date);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingExpense(null);
  };

  const handleSave = () => {
    if (!formDescription.trim()) {
      showToast("error", "الوصف مطلوب.");
      return;
    }

    const amount = formAmount;
    if (amount <= 0) {
      showToast("error", "المبلغ يجب أن يكون رقمًا موجبًا.");
      return;
    }

    if (!formDate) {
      showToast("error", "التاريخ مطلوب.");
      return;
    }

    void saveMutation.mutate({
      action: async () => {
        const body: {
          description: string;
          amount: number;
          expense_date: string;
          category?: string;
        } = {
          description: formDescription.trim(),
          amount,
          expense_date: formDate,
        };

        if (formCategory.trim()) {
          body.category = formCategory.trim();
        }

        let response: Response;
        if (editingExpense) {
          response = await fetch(ENDPOINTS.expenses.byId(editingExpense.id), {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } else {
          response = await fetch(ENDPOINTS.expenses.list, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        }

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "فشل العملية");
        }

        const result = await response.json();
        return result.expense as Expense;
      },
      context: "Failed to save expense",
      fallbackError: "حدث خطأ",
      getErrorMessage: errorMessageFrom,
      onSuccess: (expense) => {
        if (editingExpense) {
          setExpenses(
            expenses.map((e) =>
              e.id === editingExpense.id
                ? { ...expense, shift_number: e.shift_number, responsible_name: e.responsible_name }
                : e
            )
          );
          showToast("success", "تم تحديث المصروف بنجاح");
        } else {
          setExpenses([expense, ...expenses]);
          showToast("success", "تم إضافة المصروف بنجاح");
        }

        handleCloseModal();
      },
    });
  };

  const handleDeleteClick = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const handleDeleteConfirm = () => {
    const id = showDeleteConfirm;
    if (!id) return;

    setShowDeleteConfirm(null);
    void deleteMutation.mutate({
      action: async () => {
        const response = await fetch(ENDPOINTS.expenses.byId(id), {
          method: "DELETE",
        });

        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "فشل الحذف");
        }
      },
      context: "Failed to delete expense",
      successMessage: "تم حذف المصروف بنجاح",
      fallbackError: "حدث خطأ",
      getErrorMessage: errorMessageFrom,
      onSuccess: () => setExpenses(expenses.filter((e) => e.id !== id)),
    });
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-foreground">المصاريف المسجلة</h2>
        {canEdit && (
          <Button
            variant="primary"
            size="none"
            className="min-h-[44px] px-5 py-2"
            onClick={handleOpenAdd}
          >
            + إضافة مصروف
          </Button>
        )}
      </div>

      {expenses.length === 0 ? (
        <EmptyState message="لا توجد مصاريف مسجلة حتى الآن." />
      ) : (
        <div className="overflow-x-auto rounded-xl bg-surface-card">
          <table className="w-full border-collapse text-right">
            <thead>
              <tr className="border-b border-foreground-muted/10 text-sm text-foreground-muted">
                <th className="px-4 py-3 font-medium">التاريخ</th>
                <th className="px-4 py-3 font-medium">الوصف</th>
                <th className="px-4 py-3 font-medium">الفئة</th>
                <th className="px-4 py-3 font-medium">مسؤول الوردية</th>
                <th className="px-4 py-3 font-medium">المبلغ</th>
                {canEdit && <th className="px-4 py-3 font-medium"></th>}
              </tr>
            </thead>
            <tbody>
              {expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-b border-foreground-muted/5 last:border-b-0 transition-colors hover:bg-surface-page/50"
                >
                  <td className="px-4 py-3 text-sm text-foreground">
                    {formatDate(expense.expense_date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">
                    {expense.description}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {expense.category || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground-muted">
                    {expense.responsible_name || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground font-medium">
                    {formatCurrency(Number(expense.amount))}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleOpenEdit(expense)}
                          className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium bg-primary/10 text-primary transition-colors hover:bg-primary/20"
                        >
                          تعديل
                        </button>
                        <button
                          onClick={() => handleDeleteClick(expense.id)}
                          className="min-h-[36px] rounded-lg px-3 py-1.5 text-xs font-medium text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          حذف
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <Modal className="bg-surface-card rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl border border-foreground-muted/20 max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-semibold text-foreground mb-4">
              {editingExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  الوصف <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  placeholder="مثال: فاتورة كهرباء"
                  style={{ direction: "rtl" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  المبلغ <span className="text-red-400">*</span>
                </label>
                <NumericInput
                  min={1}
                  step={1}
                  value={formAmount}
                  onChange={(v) => setFormAmount(Math.max(1, v))}
                  className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  placeholder="أدخل المبلغ"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  الفئة
                </label>
                <input
                  type="text"
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 text-right"
                  placeholder="مثال: فواتير، صيانة، رواتب"
                  style={{ direction: "rtl" }}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  التاريخ <span className="text-red-400">*</span>
                </label>
                <DatePicker
                  value={formDate}
                  onChange={(value) => setFormDate(value)}
                  className="text-right"
                />
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <Button variant="secondary" size="md" fill onClick={handleCloseModal}>
                إلغاء
              </Button>
              <Button
                variant="primary"
                size="md"
                fill
                onClick={handleSave}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? "جاري الحفظ..." : editingExpense ? "تحديث" : "إضافة"}
              </Button>
            </div>
        </Modal>
      )}

      {showDeleteConfirm && (
        <ConfirmDialog
          title="تأكيد الحذف"
          message="هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء."
          confirmLabel={deleteMutation.isPending ? "جاري..." : "حذف"}
          onConfirm={handleDeleteConfirm}
          onCancel={handleDeleteCancel}
          confirmDisabled={deleteMutation.isPending}
        />
      )}
    </div>
  );
}
