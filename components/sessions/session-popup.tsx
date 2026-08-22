"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Station, Session, Product, BilliardGameEntry, StationGameEntry } from "@/types/database";
import type { BillingMode, PlayType, PlaySubtype, PricingMode } from "@/types/database";
import { calculateGameEntrySubtotal, calculateBilliardGameEntriesCost, calculateStationGameEntriesCost, calculateGameEntriesCount } from "@/lib/pricing/calculation";
import { formatCurrency, formatCount } from "@/lib/format/number";
import { ReceiptPopup } from "./receipt-popup";
import { useToast } from "@/components/ui/toast";
import { NumericInput } from "@/components/ui/numeric-input";
import { ModeToggle } from "./mode-toggle";

interface SessionPopupProps {
  station: Station;
  activeSession: Session | null;
  onClose: () => void;
  onSessionStarted: () => void;
  onSessionClosed: () => void;
}

export function SessionPopup({
  station,
  activeSession,
  onClose,
  onSessionStarted,
  onSessionClosed,
}: SessionPopupProps) {
  const { showToast } = useToast();
  const [mode, setMode] = useState<"single" | "multi">("single");
  const [billingMode, setBillingMode] = useState<BillingMode>("time");
  const [isStarting, setIsStarting] = useState(false);
  const [showReceipt, setShowReceipt] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [isProductMenuOpen, setIsProductMenuOpen] = useState(false);
  const productMenuRef = useRef<HTMLDivElement>(null);
  const productMenuListRef = useRef<HTMLDivElement>(null);
  const [productMenuPosition, setProductMenuPosition] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const [selectedQuantity, setSelectedQuantity] = useState(1);
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [removingItemId, setRemovingItemId] = useState<string | null>(null);
  const [removingEntryId, setRemovingEntryId] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState<string>("");
  const [saleItems, setSaleItems] = useState<
    Array<{
      id: string;
      product_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }>
  >([]);
  const [gamesCount, setGamesCount] = useState<number>(
    activeSession?.games_count ?? 0
  );
  const [gamesCountInput, setGamesCountInput] = useState<number>(
    activeSession?.games_count ?? 0
  );

  // Billiard game entries
  const [gameEntries, setGameEntries] = useState<BilliardGameEntry[]>([]);
  const [newEntryPlayType, setNewEntryPlayType] = useState<PlayType>("normal");
  const [newEntryPlaySubtype, setNewEntryPlaySubtype] = useState<PlaySubtype>("single");
  const [newEntryGamesCount, setNewEntryGamesCount] = useState(1);
  const [isAddingGameEntry, setIsAddingGameEntry] = useState(false);
  const [isSavingGames, setIsSavingGames] = useState(false);
  const [isPreviewingClose, setIsPreviewingClose] = useState(false);

  // Billiard start-session play_type/subtype (used when creating a billiard+time session)
  const [startPlayType, setStartPlayType] = useState<PlayType>("normal");
  const [startPlaySubtype, setStartPlaySubtype] = useState<PlaySubtype>("single");

  // Billiard+games start play type/subtype (defaults match the time-mode selector; the start button works either way)
  const [startGamesPlayType, setStartGamesPlayType] = useState<PlayType>("normal");
  const [startGamesPlaySubtype, setStartGamesPlaySubtype] = useState<PlaySubtype>("single");
  const [startGamesCount, setStartGamesCount] = useState(0);

  // Station game entries (PS/pingpong + games billing mode)
  const [stationGameEntries, setStationGameEntries] = useState<StationGameEntry[]>([]);
  const [startStationMode, setStartStationMode] = useState<PricingMode>("single");
  const [startStationGamesCount, setStartStationGamesCount] = useState(0);
  const [newStationEntryMode, setNewStationEntryMode] = useState<PricingMode>("single");
  const [newStationEntryGamesCount, setNewStationEntryGamesCount] = useState(1);
  const [isAddingStationGameEntry, setIsAddingStationGameEntry] = useState(false);
  const [removingStationEntryId, setRemovingStationEntryId] = useState<string | null>(null);

  const activeBillingMode = activeSession?.billing_mode ?? billingMode;
  const isGameBased = activeBillingMode === "games";
  const isLegacyStationGames =
    activeSession?.games_model === "legacy" &&
    station.station_type !== "billiard" &&
    isGameBased;
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  // Stable fetch helpers (only call state setters, so an empty dep array is safe)
  const fetchProducts = useCallback(async () => {
    try {
      const response = await fetch("/api/products");
      if (response.ok) {
        const data = await response.json();
        setProducts(data.products || []);
      }
    } catch (error) {
      console.error("Failed to fetch products:", error);
    }
  }, []);

  // Position the product menu list relative to the trigger (ported to document.body)
  const updateProductMenuPosition = useCallback(() => {
    const trigger = productMenuRef.current;
    if (!trigger) return;
    const rect = trigger.getBoundingClientRect();
    const listHeight = 280;
    const gap = 4;
    const spaceBelow = window.innerHeight - rect.bottom;
    const opensAbove = spaceBelow < listHeight + gap;
    setProductMenuPosition({
      top: opensAbove ? rect.top - listHeight - gap : rect.bottom + gap,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  // Close the product menu when clicking outside of it
  useEffect(() => {
    if (!isProductMenuOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideTrigger = productMenuRef.current?.contains(target);
      const isInsideList = productMenuListRef.current?.contains(target);
      if (!isInsideTrigger && !isInsideList) {
        setIsProductMenuOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsProductMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isProductMenuOpen]);

  // Recalculate the menu position when the page or popup scrolls / resizes while open
  useEffect(() => {
    if (!isProductMenuOpen) return;

    const handleReposition = () => {
      updateProductMenuPosition();
    };

    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [isProductMenuOpen, updateProductMenuPosition]);

  const fetchSaleItems = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/sale-items?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setSaleItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to fetch sale items:", error);
    }
  }, []);

  const fetchGameEntries = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/game-entries?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        setGameEntries(data.entries || []);
      }
    } catch (error) {
      console.error("Failed to fetch game entries:", error);
    }
  }, []);

  const fetchStationGameEntries = useCallback(async (sessionId: string) => {
    try {
      const response = await fetch(`/api/sessions/station-game-entries?session_id=${sessionId}`);
      if (response.ok) {
        const data = await response.json();
        const entries = data.entries || [];
        setStationGameEntries(entries);
      }
    } catch (error) {
      console.error("Failed to fetch station game entries:", error);
    }
  }, []);

  // Adjust state during render when the active session changes (avoids synchronous setState in effects)
  const [prevActiveSession, setPrevActiveSession] = useState(activeSession);
  if (activeSession !== prevActiveSession) {
    setPrevActiveSession(activeSession);
    if (activeSession) {
      const g = activeSession.games_count ?? 0;
      setGamesCount(g);
      setGamesCountInput(g);
    } else {
      setSaleItems([]);
      setGameEntries([]);
      setStationGameEntries([]);
    }
    if (!activeSession || activeSession.billing_mode !== "time") {
      setElapsedTime("");
    }
  }

  // Fetch products on mount
  useEffect(() => {
    const loadProducts = () => fetchProducts();
    loadProducts();
  }, [fetchProducts]);

  // Fetch existing sale items / game entries when activeSession changes
  useEffect(() => {
    if (!activeSession) return;

    const loadSessionData = () => {
      fetchSaleItems(activeSession.id);
      if (station.station_type === "billiard" && activeSession.billing_mode === "games") {
        fetchGameEntries(activeSession.id);
      } else if (station.station_type !== "billiard" && activeSession.billing_mode === "games") {
        fetchStationGameEntries(activeSession.id);
      }
    };

    loadSessionData();
  }, [activeSession, station.station_type, fetchSaleItems, fetchGameEntries, fetchStationGameEntries]);

  // Update elapsed time for active time-based sessions
  useEffect(() => {
    if (!activeSession || activeSession.billing_mode !== "time") {
      return;
    }

    const updateElapsedTime = () => {
      const startTime = new Date(activeSession.start_time);
      const now = new Date();
      const diffMs = now.getTime() - startTime.getTime();
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(diffMinutes / 60);
      const minutes = diffMinutes % 60;

      if (hours > 0) {
        setElapsedTime(`${formatCount(hours)}س ${formatCount(minutes)}د`);
      } else {
        setElapsedTime(`${formatCount(minutes)}د`);
      }
    };

    updateElapsedTime();
    const interval = setInterval(updateElapsedTime, 1000);

    return () => clearInterval(interval);
  }, [activeSession]);

  const handleStartSession = async () => {
    setIsStarting(true);
    try {
      const body: Record<string, unknown> = {
        station_id: station.id,
        billing_mode: billingMode,
      };

      if (station.station_type === "billiard") {
        if (billingMode === "time") {
          body.play_type = startPlayType;
          body.play_subtype = startPlaySubtype;
        }
      } else if (billingMode === "time") {
        body.mode = mode;
      }

      const response = await fetch("/api/sessions/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (response.ok) {
        let hasAutoEntry = false;

        if (
          station.station_type === "billiard" &&
          billingMode === "games" &&
          startGamesPlayType !== null &&
          startGamesCount > 0
        ) {
          const addRes = await fetch("/api/sessions/add-game-entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: data.session.id,
              play_type: startGamesPlayType,
              play_subtype: startGamesPlaySubtype,
              games_count: startGamesCount,
            }),
          });

          if (!addRes.ok) {
            const addData = await addRes.json();
            showToast("warning", addData.error || "تم بدء الجلسة لكن فشل إضافة أول جيم");
          } else {
            hasAutoEntry = true;
          }
        } else if (
          station.station_type !== "billiard" &&
          billingMode === "games" &&
          startStationMode !== null &&
          startStationGamesCount > 0
        ) {
          const addRes = await fetch("/api/sessions/add-station-game-entry", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: data.session.id,
              mode: startStationMode,
              games_count: startStationGamesCount,
            }),
          });

          if (!addRes.ok) {
            const addData = await addRes.json();
            showToast("warning", addData.error || "تم بدء الجلسة لكن فشل إضافة أول جيم");
          } else {
            hasAutoEntry = true;
          }
        }

        if (hasAutoEntry) {
          showToast("success", "تم بدء الجلسة مع أول جيم بنجاح");
        } else {
          showToast("success", "تم بدء الجلسة بنجاح");
        }
        onSessionStarted();
      } else {
        showToast("error", data.error || "فشل بدء الجلسة");
      }
    } catch (error) {
      console.error("Failed to start session:", error);
      showToast("error", "حدث خطأ أثناء بدء الجلسة");
    } finally {
      setIsStarting(false);
    }
  };

  const handleRemoveProduct = async (saleItemId: string) => {
    setRemovingItemId(saleItemId);
    try {
      const response = await fetch(
        `/api/sessions/remove-product?sale_item_id=${saleItemId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setSaleItems((prev) => prev.filter((item) => item.id !== saleItemId));
        showToast("success", "تم حذف المشروب بنجاح");
      } else {
        const data = await response.json();
        showToast("error", data.error || "فشل حذف المشروب");
      }
    } catch (error) {
      console.error("Failed to remove product:", error);
      showToast("error", "حدث خطأ أثناء حذف المشروب");
    } finally {
      setRemovingItemId(null);
    }
  };

  const handleRemoveGameEntry = async (entryId: string) => {
    setRemovingEntryId(entryId);
    try {
      const response = await fetch(
        `/api/sessions/remove-game-entry?entry_id=${entryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setGameEntries((prev) => prev.filter((e) => e.id !== entryId));
        showToast("success", "تم حذف إدخال الجيم بنجاح");
      } else {
        const data = await response.json();
        showToast("error", data.error || "فشل حذف إدخال الجيم");
      }
    } catch (error) {
      console.error("Failed to remove game entry:", error);
      showToast("error", "حدث خطأ أثناء حذف إدخال الجيم");
    } finally {
      setRemovingEntryId(null);
    }
  };

  const handleAddProduct = async () => {
    if (!selectedProductId || !activeSession) return;

    setIsAddingProduct(true);
    try {
      const selectedProduct = products.find((p) => p.id === selectedProductId);
      const response = await fetch("/api/sessions/add-product", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          product_id: selectedProductId,
          quantity: selectedQuantity,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSaleItems((prev) => [
          ...prev,
          {
            id: data.sale_item.id,
            product_name: selectedProduct?.name ?? "",
            quantity: selectedQuantity,
            unit_price: Number(data.sale_item.unit_price),
            total_price: Number(data.sale_item.total_price),
          },
        ]);
        setSelectedProductId("");
        setSelectedQuantity(1);
        showToast("success", "تم إضافة المشروب بنجاح");
      } else {
        showToast("error", data.error || "فشل إضافة المشروب");
      }
    } catch (error) {
      console.error("Failed to add product:", error);
      showToast("error", "حدث خطأ أثناء إضافة المشروب");
    } finally {
      setIsAddingProduct(false);
    }
  };

  const handleSaveGames = async () => {
    if (!activeSession) return;

    setIsSavingGames(true);
    try {
      const response = await fetch("/api/sessions/update-games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          games_count: gamesCountInput,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setGamesCount(gamesCountInput);
        showToast("success", "تم تحديث عدد الجيمات");
      } else {
        showToast("error", data.error || "فشل تحديث عدد الجيمات");
      }
    } catch (error) {
      console.error("Failed to update games count:", error);
      showToast("error", "حدث خطأ أثناء تحديث عدد الجيمات");
    } finally {
      setIsSavingGames(false);
    }
  };

  const handleAddStationGameEntry = async () => {
    if (!activeSession) return;
    setIsAddingStationGameEntry(true);
    try {
      const response = await fetch("/api/sessions/add-station-game-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          mode: newStationEntryMode,
          games_count: newStationEntryGamesCount,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("success", "تم إضافة الجيمات بنجاح");
        setNewStationEntryGamesCount(1);
        fetchStationGameEntries(activeSession.id);
      } else {
        showToast("error", data.error || "فشل إضافة الجيمات");
      }
    } catch (error) {
      console.error("Failed to add station game entry:", error);
      showToast("error", "حدث خطأ أثناء إضافة الجيمات");
    } finally {
      setIsAddingStationGameEntry(false);
    }
  };

  const handleRemoveStationGameEntry = async (entryId: string) => {
    setRemovingStationEntryId(entryId);
    try {
      const response = await fetch(
        `/api/sessions/remove-station-game-entry?entry_id=${entryId}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        setStationGameEntries((prev) => prev.filter((e) => e.id !== entryId));
        showToast("success", "تم حذف إدخال الجيم بنجاح");
      } else {
        const data = await response.json();
        showToast("error", data.error || "فشل حذف إدخال الجيم");
      }
    } catch (error) {
      console.error("Failed to remove station game entry:", error);
      showToast("error", "حدث خطأ أثناء حذف إدخال الجيم");
    } finally {
      setRemovingStationEntryId(null);
    }
  };

  const handleAddGameEntry = async () => {
    if (!activeSession) return;
    setIsAddingGameEntry(true);
    try {
      const response = await fetch("/api/sessions/add-game-entry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
          games_count: newEntryGamesCount,
          play_type: newEntryPlayType,
          play_subtype: newEntryPlaySubtype,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        showToast("success", "تم إضافة الجيمات بنجاح");
        setNewEntryGamesCount(1);
        fetchGameEntries(activeSession.id);
      } else {
        showToast("error", data.error || "فشل إضافة الجيمات");
      }
    } catch (error) {
      console.error("Failed to add game entry:", error);
      showToast("error", "حدث خطأ أثناء إضافة الجيمات");
    } finally {
      setIsAddingGameEntry(false);
    }
  };

  const hasGamesChanged = gamesCountInput !== gamesCount;

  const handlePreviewClose = async () => {
    if (!activeSession) return;

    setIsPreviewingClose(true);
    try {
      const response = await fetch("/api/sessions/preview-close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id: activeSession.id,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setShowReceipt(true);
      } else {
        showToast("error", data.error || "فشل حساب الإيصال");
      }
    } catch (error) {
      console.error("Failed to preview close:", error);
      showToast("error", "حدث خطأ أثناء حساب الإيصال");
    } finally {
      setIsPreviewingClose(false);
    }
  };

  const isAvailable = !activeSession;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div
            dir="ltr"
            className="w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl bg-surface-card shadow-none scrollbar-dark"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-surface-card px-6 pt-6 pb-0 flex items-center justify-between">
              <h2 className="text-xl font-semibold text-foreground">
                {isAvailable ? "بدء جلسة جديدة" : "الجلسة الحالية"}
              </h2>
              <button
                onClick={onClose}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-muted hover:bg-surface-page hover:text-foreground"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M18 6 6 18" />
                  <path d="m6 6 12 12" />
                </svg>
              </button>
            </div>

            <div dir="rtl" className="px-6 pb-6">
            {/* Station Info */}
            <div className="mt-4 mb-6 rounded-lg bg-surface-page/50 p-4">
            <div className="text-sm text-foreground-muted">
              {station.station_type === "billiard"
                ? "بلياردو"
                : station.station_type === "playstation"
                  ? "بلايستيشن"
                  : "بينغ بونغ"}
            </div>
            <div className="mt-1 text-lg font-semibold text-foreground">{station.name}</div>

            {!isAvailable && (
              <>
                {isGameBased && station.station_type === "billiard" ? (
                  <div className="mt-3 text-sm text-green-400">
                    عدد الجيمات: {formatCount(calculateGameEntriesCount(gameEntries))}
                  </div>
                ) : isGameBased && isLegacyStationGames ? (
                  <div className="mt-3 text-sm text-green-400">
                    عدد الجيمات: {formatCount(gamesCount)}
                  </div>
                ) : isGameBased && station.station_type !== "billiard" ? (
                  <div className="mt-3 text-sm text-green-400">
                    عدد الجيمات: {formatCount(calculateGameEntriesCount(stationGameEntries))}
                  </div>
                ) : isGameBased ? (
                  <div className="mt-3 text-sm text-green-400">
                    عدد الجيمات: {formatCount(gamesCount)}
                  </div>
                ) : (
                  elapsedTime && (
                    <div className="mt-3 flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-sm text-green-400">شغال من {elapsedTime}</span>
                    </div>
                  )
                )}
              </>
            )}

          {isAvailable ? (
            /* Available Station - Start Session */
            <div className="space-y-4">
              {/* Billing Mode Toggle */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  طريقة الفوترة
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBillingMode("time")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      billingMode === "time"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                    }`}
                  >
                    بالوقت
                  </button>
                  <button
                    onClick={() => setBillingMode("games")}
                    className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                      billingMode === "games"
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                    }`}
                  >
                    بعدد الجيمات
                  </button>
                </div>
              </div>

              {/* Billiard + Time: Play Type + Play Subtype selectors */}
              {station.station_type === "billiard" && billingMode === "time" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      نوع اللعب
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setStartPlayType("normal");
                          setStartPlaySubtype("single");
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startPlayType === "normal"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        عادي
                      </button>
                      <button
                        onClick={() => {
                          setStartPlayType("combo");
                          setStartPlaySubtype("single");
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startPlayType === "combo"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        كومب
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      النوع الفرعي
                    </label>
                    <div className={`grid gap-3 ${
                      startPlayType === "combo" ? "grid-cols-3" : "grid-cols-2"
                    }`}>
                      {startPlayType === "normal" ? (
                        <>
                          <button
                            onClick={() => setStartPlaySubtype("single")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startPlaySubtype === "single"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            فردي
                          </button>
                          <button
                            onClick={() => setStartPlaySubtype("multi")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startPlaySubtype === "multi"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            مالتي
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setStartPlaySubtype("single")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startPlaySubtype === "single"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            فردي
                          </button>
                          <button
                            onClick={() => setStartPlaySubtype("triple")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startPlaySubtype === "triple"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            متولتة
                          </button>
                          <button
                            onClick={() => setStartPlaySubtype("quad")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startPlaySubtype === "quad"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            مربعة
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Billiard + Games: Optional pre-start entry selection */}
              {station.station_type === "billiard" && billingMode === "games" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      نوع اللعب <span className="text-xs text-foreground-muted">(اختياري)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => {
                          setStartGamesPlayType("normal");
                          setStartGamesPlaySubtype("single");
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startGamesPlayType === "normal"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        عادي
                      </button>
                      <button
                        onClick={() => {
                          setStartGamesPlayType("combo");
                          setStartGamesPlaySubtype("single");
                        }}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startGamesPlayType === "combo"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        كومب
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      النوع الفرعي
                    </label>
                    <div className={`grid gap-3 ${
                      startGamesPlayType === "combo" ? "grid-cols-3" : "grid-cols-2"
                    }`}>
                      {startGamesPlayType === "normal" ? (
                        <>
                          <button
                            onClick={() => setStartGamesPlaySubtype("single")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startGamesPlaySubtype === "single"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            فردي
                          </button>
                          <button
                            onClick={() => setStartGamesPlaySubtype("multi")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startGamesPlaySubtype === "multi"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            مالتي
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setStartGamesPlaySubtype("single")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startGamesPlaySubtype === "single"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            فردي
                          </button>
                          <button
                            onClick={() => setStartGamesPlaySubtype("triple")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startGamesPlaySubtype === "triple"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            متولتة
                          </button>
                          <button
                            onClick={() => setStartGamesPlaySubtype("quad")}
                            className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                              startGamesPlaySubtype === "quad"
                                ? "border-primary bg-primary/10 text-primary"
                                : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                            }`}
                          >
                            مربعة
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      عدد الجيمات
                    </label>
                    <NumericInput
                      min={1}
                      value={startGamesCount}
                      onChange={(v) => setStartGamesCount(Math.max(1, v))}
                      placeholder="أدخل عدد الجيمات"
                    />
                  </div>
                </>
              )}

              {/* PS / Pingpong: Mode Selection — optional for games, required for time */}
              {station.station_type !== "billiard" && billingMode === "time" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    وضع اللعب
                  </label>
                  <ModeToggle value={mode} onChange={setMode} />
                </div>
              )}

              {station.station_type !== "billiard" && billingMode === "games" && (
                <>
                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      وضع اللعب <span className="text-xs text-foreground-muted">(اختياري)</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setStartStationMode("single")}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startStationMode === "single"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        فردي
                      </button>
                      <button
                        type="button"
                        onClick={() => setStartStationMode("multi")}
                        className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${
                          startStationMode === "multi"
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                        }`}
                      >
                        مالتي
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-medium text-foreground">
                      عدد الجيمات
                    </label>
                    <NumericInput
                      min={0}
                      value={startStationGamesCount}
                      onChange={(v) => setStartStationGamesCount(Math.max(0, v))}
                      placeholder="أدخل عدد الجيمات"
                    />
                  </div>
                </>
              )}

              <button
                onClick={handleStartSession}
                disabled={isStarting}
                className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStarting ? "جاري البدء..." : "ابدأ الجلسة"}
              </button>
            </div>
          ) : (
            /* Active Session - Add Products / End Session */
            <div className="space-y-4">
              {/* PS / Pingpong Game Entries (games billing mode) */}
              {isGameBased && station.station_type !== "billiard" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    الجيمات المسجلة
                  </label>

                  {/* Legacy: single games_count mode (pre-migration sessions) */}
                  {isLegacyStationGames ? (
                    <div>
                      <div className="mb-2 rounded-lg bg-yellow-500/10 p-2">
                        <p className="text-xs text-yellow-400">
                          هذه الجلسة بدأت قبل التحديث. استخدم الحقل أدناه لتعديل عدد الجيمات.
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <NumericInput
                          min={0}
                          value={gamesCountInput}
                          onChange={(v) => setGamesCountInput(Math.max(0, v))}
                          placeholder="أدخل عدد الجيمات"
                          className="flex-1"
                        />
                        <button
                          onClick={handleSaveGames}
                          disabled={!hasGamesChanged || isSavingGames}
                          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {isSavingGames ? "جاري حفظ..." : "حفظ"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Entries List */}
                      {stationGameEntries.length > 0 ? (
                        <div className="mb-3 rounded-lg bg-surface-page/50 p-3 space-y-1.5">
                          {stationGameEntries.map((entry) => (
                            <div key={entry.id} className="flex items-center justify-between text-sm">
                              <span className="text-foreground-muted">
                                {entry.mode === "single" ? "فردي" : "مالتي"} × {formatCount(entry.games_count)}
                              </span>
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">
                                  {formatCurrency(calculateGameEntrySubtotal(entry.games_count, entry.price_per_game))}
                                </span>
                                <button
                                  onClick={() => handleRemoveStationGameEntry(entry.id)}
                                  disabled={removingStationEntryId === entry.id}
                                  className="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                                >
                                  {removingStationEntryId === entry.id ? (
                                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                  ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                      <path d="M18 6 6 18" />
                                      <path d="m6 6 12 12" />
                                    </svg>
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div className="flex justify-between border-t border-foreground-muted/20 pt-2 text-sm font-medium">
                            <span className="text-foreground-muted">إجمالي الجيمات</span>
                            <span className="text-foreground">
                              {formatCurrency(calculateStationGameEntriesCost(stationGameEntries))}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <p className="mb-3 text-sm text-foreground-muted">لا توجد جيمات مسجلة بعد</p>
                      )}

                      {/* Add Entry Form */}
                      <div className="space-y-2 rounded-lg border border-foreground-muted/20 p-3">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground">وضع اللعب</label>
                          <ModeToggle
                            value={newStationEntryMode}
                            onChange={setNewStationEntryMode}
                            size="sm"
                          />
                        </div>

                        <div className="flex gap-2">
                          <NumericInput
                            min={1}
                            value={newStationEntryGamesCount}
                            onChange={(v) => setNewStationEntryGamesCount(Math.max(1, v))}
                            placeholder="أدخل عدد الجيمات"
                            className="flex-1 px-2 py-2 text-xs"
                          />
                          <button
                            onClick={handleAddStationGameEntry}
                            disabled={isAddingStationGameEntry}
                            className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                          >
                            {isAddingStationGameEntry ? "جاري..." : "إضافة جيمات"}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Billiard Game Entries (billiard/games only) */}
              {isGameBased && station.station_type === "billiard" && (
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    الجيمات المسجلة
                  </label>

                  {/* Entries Table */}
                  {gameEntries.length > 0 ? (
                    <div className="mb-3 rounded-lg bg-surface-page/50 p-3 space-y-1.5">
                      {gameEntries.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between text-sm">
                          <span className="text-foreground-muted">
                            {entry.play_type === "combo" ? "كومب" : "عادي"} /{" "}
                            {entry.play_subtype === "single"
                              ? "فردي"
                              : entry.play_subtype === "multi"
                                ? "مالتي"
                                : entry.play_subtype === "triple"
                                  ? "متولتة"
                                  : "مربعة"}{" "}
                            × {formatCount(entry.games_count)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-foreground">
                              {formatCurrency(calculateGameEntrySubtotal(entry.games_count, entry.price_per_game))}
                            </span>
                            <button
                              onClick={() => handleRemoveGameEntry(entry.id)}
                              disabled={removingEntryId === entry.id}
                              className="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                            >
                              {removingEntryId === entry.id ? (
                                <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M18 6 6 18" />
                                  <path d="m6 6 12 12" />
                                </svg>
                              )}
                            </button>
                          </div>
                        </div>
                      ))}
                      <div className="flex justify-between border-t border-foreground-muted/20 pt-2 text-sm font-medium">
                        <span className="text-foreground-muted">إجمالي الجيمات</span>
                        <span className="text-foreground">
                          {formatCurrency(calculateBilliardGameEntriesCost(gameEntries))}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <p className="mb-3 text-sm text-foreground-muted">لا توجد جيمات مسجلة بعد</p>
                  )}

                  {/* Add Entry Form */}
                  <div className="space-y-2 rounded-lg border border-foreground-muted/20 p-3">
                    {/* Play Type Buttons */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">نوع اللعب</label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => {
                            setNewEntryPlayType("normal");
                            setNewEntryPlaySubtype("single");
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            newEntryPlayType === "normal"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                          }`}
                        >
                          عادي
                        </button>
                        <button
                          onClick={() => {
                            setNewEntryPlayType("combo");
                            setNewEntryPlaySubtype("single");
                          }}
                          className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                            newEntryPlayType === "combo"
                              ? "border-primary bg-primary/10 text-primary"
                              : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                          }`}
                        >
                          كومب
                        </button>
                      </div>
                    </div>

                    {/* Play Subtype Buttons (single row) */}
                    <div>
                      <label className="mb-1 block text-xs font-medium text-foreground">النوع الفرعي</label>
                      <div className={`grid gap-2 ${
                        newEntryPlayType === "combo" ? "grid-cols-3" : "grid-cols-2"
                      }`}>
                        {newEntryPlayType === "normal" ? (
                          <>
                            <button
                              onClick={() => setNewEntryPlaySubtype("single")}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                newEntryPlaySubtype === "single"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                              }`}
                            >
                              فردي
                            </button>
                            <button
                              onClick={() => setNewEntryPlaySubtype("multi")}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                newEntryPlaySubtype === "multi"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                              }`}
                            >
                              مالتي
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => setNewEntryPlaySubtype("single")}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                newEntryPlaySubtype === "single"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                              }`}
                            >
                              فردي
                            </button>
                            <button
                              onClick={() => setNewEntryPlaySubtype("triple")}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                newEntryPlaySubtype === "triple"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                              }`}
                            >
                              متولتة
                            </button>
                            <button
                              onClick={() => setNewEntryPlaySubtype("quad")}
                              className={`rounded-lg border px-2 py-2 text-xs font-medium transition-colors ${
                                newEntryPlaySubtype === "quad"
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-foreground-muted/30 text-foreground hover:bg-surface-page"
                              }`}
                            >
                              مربعة
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Games Count + Submit */}
                    <div className="flex gap-2">
                      <NumericInput
                        min={1}
                        value={newEntryGamesCount}
                        onChange={(v) => setNewEntryGamesCount(Math.max(1, v))}
                        placeholder="أدخل عدد الجيمات"
                        className="flex-1 px-2 py-2 text-xs"
                      />
                      <button
                        onClick={handleAddGameEntry}
                        disabled={isAddingGameEntry}
                        className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50"
                      >
                        {isAddingGameEntry ? "جاري..." : "إضافة جيمات"}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Add Product Section */}
              <div>
                <label className="mb-2 block text-sm font-medium text-foreground">
                  إضافة مشروب
                </label>
                <div className="space-y-3">
                  <div ref={productMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isProductMenuOpen) {
                          updateProductMenuPosition();
                        }
                        setIsProductMenuOpen((v) => !v);
                      }}
                      className="w-full appearance-none rounded-lg bg-surface-page py-2 pr-3 pl-8 text-right text-foreground outline-none focus:ring-2 focus:ring-primary"
                    >
                      {selectedProduct
                        ? `${selectedProduct.name} - ${formatCurrency(selectedProduct.price)}`
                        : "اختر مشروب"}
                    </button>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-foreground-muted"
                    >
                      <path d="m6 9 6 6 6-6" />
                    </svg>
                    {isProductMenuOpen &&
                      productMenuPosition &&
                      createPortal(
                        <div
                          ref={productMenuListRef}
                          className="fixed z-[60] max-h-[280px] overflow-y-auto rounded-lg border border-foreground-muted/20 bg-surface-card shadow-2xl scrollbar-dark"
                          style={{
                            top: productMenuPosition.top,
                            left: productMenuPosition.left,
                            width: productMenuPosition.width,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedProductId("");
                              setIsProductMenuOpen(false);
                            }}
                            className={`w-full px-3 py-2 text-right hover:bg-surface-page ${
                              !selectedProduct
                                ? "bg-surface-page text-foreground"
                                : "text-foreground-muted"
                            }`}
                          >
                            اختر مشروب
                          </button>
                          {products.map((product) => (
                            <button
                              key={product.id}
                              type="button"
                              onClick={() => {
                                setSelectedProductId(product.id);
                                setIsProductMenuOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-right hover:bg-surface-page ${
                                product.id === selectedProductId
                                  ? "bg-surface-page text-foreground"
                                  : "text-foreground-muted"
                              }`}
                            >
                              {product.name} - {formatCurrency(product.price)}
                            </button>
                          ))}
                        </div>,
                        document.body
                      )}
                  </div>

                  <div className="flex gap-3">
                    <NumericInput
                      min={1}
                      value={selectedQuantity}
                      onChange={(v) => setSelectedQuantity(v)}
                      placeholder="أدخل الكمية"
                      className="w-24"
                    />
                    <button
                      onClick={handleAddProduct}
                      disabled={!selectedProductId || isAddingProduct}
                      className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-surface-page hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isAddingProduct ? "جاري الإضافة..." : "إضافة"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Added Products List */}
              {saleItems.length > 0 && (
                <div className="rounded-lg bg-surface-page/50 p-3">
                  <div className="mb-2 text-sm font-medium text-foreground">المشروبات المضافة</div>
                  <div className="space-y-1.5">
                    {saleItems.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-sm">
                        <span className="text-foreground-muted">
                          {item.product_name} × {formatCount(item.quantity)}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-foreground">{formatCurrency(item.total_price)}</span>
                          <button
                            onClick={() => handleRemoveProduct(item.id)}
                            disabled={removingItemId === item.id}
                            className="flex h-5 w-5 items-center justify-center rounded text-red-400 hover:bg-red-500/10 disabled:opacity-30"
                          >
                            {removingItemId === item.id ? (
                              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6 6 18" />
                                <path d="m6 6 12 12" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-2 flex justify-between border-t border-foreground-muted/20 pt-2 text-sm font-medium">
                    <span className="text-foreground-muted">إجمالي المشروبات</span>
                    <span className="text-foreground">
                      {formatCurrency(saleItems.reduce((sum, item) => sum + item.total_price, 0))}
                    </span>
                  </div>
                </div>
              )}

              <div className="border-t border-foreground-muted/20 pt-4">
                <button
                  onClick={handlePreviewClose}
                  disabled={isPreviewingClose}
                  className="w-full rounded-lg bg-red-500 px-4 py-3 text-sm font-medium text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPreviewingClose ? "جاري احتساب..." : isGameBased ? "إنهاء الجيمات" : "إنهاء الوقت"}
                </button>
              </div>
            </div>
          )}
            </div>
          </div>
        </div>
      </div>

      {/* Receipt Popup */}
      {showReceipt && activeSession && (
        <ReceiptPopup
          session={activeSession}
          station={station}
          onClose={() => setShowReceipt(false)}
          onConfirm={() => {
            setShowReceipt(false);
            onSessionClosed();
          }}
        />
      )}
    </>
  );
}
