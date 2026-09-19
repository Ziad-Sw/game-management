"use client";

import { useState } from "react";
import { NumericInput } from "@/components/ui/numeric-input";
import { useToast } from "@/components/ui/toast";
import { formatCurrency } from "@/lib/format/number";

interface Product {
  id: string;
  name: string;
  price: number;
  is_active: boolean;
}

interface ProductsSettingsFormProps {
  initialProducts: Product[];
  canEdit?: boolean;
}

export default function ProductsSettingsForm({
  initialProducts,
  canEdit = true,
}: ProductsSettingsFormProps) {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [newProductName, setNewProductName] = useState("");
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingPrice, setEditingPrice] = useState(0);

  const handleAddProduct = async () => {
    if (!newProductName.trim() || newProductPrice <= 0) {
      showToast("error", "يجب إدخال اسم المشروب والسعر");
      return;
    }

    const price = newProductPrice;
    if (price < 0) {
      showToast("error", "السعر يجب أن يكون رقمًا موجبًا");
      return;
    }

    setIsAdding(true);
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newProductName.trim(),
          price,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to add product");
      }

      const result = await response.json();
      setProducts([...products, result.product]);
      setNewProductName("");
      setNewProductPrice(0);
      showToast("success", "تم إضافة المشروب بنجاح");
    } catch (err) {
      console.error("Error adding product:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء إضافة المشروب";
      showToast("error", errorMessage);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteProduct = (id: string) => {
    setShowDeleteConfirm(id);
  };

  const handleDeleteConfirm = async () => {
    const id = showDeleteConfirm;
    if (!id) return;

    setShowDeleteConfirm(null);
    setIsDeletingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to delete product");
      }

      setProducts(products.filter((p) => p.id !== id));
      showToast("success", "تم حذف المشروب بنجاح");
    } catch (err) {
      console.error("Error deleting product:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء حذف المشروب";
      showToast("error", errorMessage);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteConfirm(null);
  };

  const handleStartEdit = (product: Product) => {
    setEditingProductId(product.id);
    setEditingName(product.name);
    setEditingPrice(product.price);
  };

  const handleCancelEdit = () => {
    setEditingProductId(null);
    setEditingName("");
    setEditingPrice(0);
  };

  const handleSaveEdit = async () => {
    if (!editingProductId || !editingName.trim() || editingPrice <= 0) {
      showToast("error", "يجب إدخال اسم المشروب والسعر");
      return;
    }

    const price = editingPrice;
    if (price < 0) {
      showToast("error", "السعر يجب أن يكون رقمًا موجبًا");
      return;
    }

    setIsSavingEdit(true);
    try {
      const response = await fetch(`/api/products/${editingProductId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingName.trim(),
          price,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update product");
      }

      const result = await response.json();
      setProducts(
        products.map((p) => (p.id === editingProductId ? result.product : p))
      );
      showToast("success", "تم تحديث المشروب بنجاح");
      handleCancelEdit();
    } catch (err) {
      console.error("Error updating product:", err);
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ أثناء تحديث المشروب";
      showToast("error", errorMessage);
    } finally {
      setIsSavingEdit(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add New Product */}
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground">إضافة مشروب جديد</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          أضف مشروب جديد لقائمة المبيعات
        </p>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <input
            type="text"
            value={newProductName}
            onChange={(e) => setNewProductName(e.target.value)}
            disabled={!canEdit}
            className="w-full sm:flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
            placeholder="اسم المشروب"
          />
          <NumericInput
              min={0}
              step={1}
              value={newProductPrice}
              placeholder="أدخل السعر"
              onChange={(v) => setNewProductPrice(Math.max(0, v))}
              className="sm:w-32"
              disabled={!canEdit || isAdding}
            />
          <button
            onClick={handleAddProduct}
            disabled={!canEdit || isAdding}
            className="w-full sm:w-auto min-h-[44px] sm:min-w-[100px] rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAdding ? "جاري..." : "إضافة"}
          </button>
        </div>
      </div>

      {/* Products List */}
      <div className="rounded-xl bg-surface-card p-6">
        <h2 className="text-lg font-semibold text-foreground">المشروبات الحالية</h2>
        <p className="mt-1 text-sm text-foreground-muted">
          قائمة المشروبات المتاحة للبيع
        </p>

        <div className="mt-4 space-y-3">
          {products.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              لا توجد مشروبات حاليًا
            </div>
          ) : (
            products.map((product) => (
              <div
                key={product.id}
                className="flex items-center gap-3 rounded-lg border border-foreground-muted/20 bg-surface-page p-3"
              >
                <div className="flex-1">
                  {editingProductId === product.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canEdit || isSavingEdit}
                    />
                  ) : (
                    <div className="text-foreground">{product.name}</div>
                  )}
                </div>
                <div className="w-24">
                  {editingProductId === product.id ? (
                    <NumericInput
                      min={0}
                      step={1}
                      value={editingPrice}
                      placeholder="أدخل السعر"
                      onChange={(v) => setEditingPrice(Math.max(0, v))}
                      className="w-full min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-3 py-2 text-foreground placeholder-foreground-muted/50 transition-colors focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                      disabled={!canEdit || isSavingEdit}
                    />
                  ) : (
                    <div className="text-foreground">{formatCurrency(product.price)}</div>
                  )}
                </div>
                {editingProductId === product.id ? (
                  <>
                    <button
                      onClick={handleSaveEdit}
                      disabled={!canEdit || isSavingEdit}
                      className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm font-medium bg-primary text-surface-page transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      حفظ
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      disabled={!canEdit || isSavingEdit}
                      className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm font-medium border border-foreground-muted/20 text-foreground transition-colors hover:border-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      إلغاء
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleStartEdit(product)}
                      disabled={!canEdit || isAdding || isSavingEdit || isDeletingId !== null}
                      className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm font-medium bg-primary/10 text-primary transition-colors hover:bg-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      تعديل
                    </button>
                    <button
                      onClick={() => handleDeleteProduct(product.id)}
                      disabled={!canEdit || isDeletingId === product.id || isAdding || isSavingEdit}
                      className="min-h-[44px] min-w-[44px] rounded-lg px-3 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isDeletingId === product.id ? "جاري..." : "حذف"}
                    </button>
                  </>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-surface-card rounded-xl p-6 max-w-sm w-full mx-4 shadow-2xl border border-foreground-muted/20">
            <h3 className="text-lg font-semibold text-foreground mb-2">تأكيد الحذف</h3>
            <p className="text-sm text-foreground-muted mb-6">
              هل أنت متأكد من حذف هذا المشروب؟ لا يمكن التراجع عن هذا الإجراء.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDeleteCancel}
                className="flex-1 min-h-[44px] rounded-lg border border-foreground-muted/20 bg-surface-page px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-surface-card"
              >
                إلغاء
              </button>
              <button
                onClick={handleDeleteConfirm}
                className="flex-1 min-h-[44px] rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-2 text-sm font-medium text-red-400 transition-colors hover:bg-red-500/20"
              >
                حذف
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
