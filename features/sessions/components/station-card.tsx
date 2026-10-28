"use client";

import { useState } from "react";
import { Station, Session } from "@/types/database";
import { SessionPopup } from "./session-popup";
import { useToast } from "@/components/ui/toast";
import { Input } from "@/components/ui/input";
import { ENDPOINTS } from "@/lib/constants/endpoints";

interface StationCardProps {
  station: Station;
  activeSession: Session | null;
  onSessionStarted?: () => void;
  onSessionClosed?: () => void;
  onStationNameUpdated?: (newName: string) => void;
  canManageSessions?: boolean;
}

export function StationCard({
  station,
  activeSession,
  onSessionStarted,
  onSessionClosed,
  onStationNameUpdated,
  canManageSessions = true,
}: StationCardProps) {
  const { showToast } = useToast();
  const [showNameEdit, setShowNameEdit] = useState(false);
  const [editingName, setEditingName] = useState(station.name);
  const [showSessionPopup, setShowSessionPopup] = useState(false);

  const isAvailable = !activeSession;

  const handleNameEdit = () => {
    setShowNameEdit(true);
    setEditingName(station.name);
  };

  const handleNameSave = async () => {
    if (editingName.trim() === "") return;
    
    try {
      const response = await fetch(ENDPOINTS.stations.updateName, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          station_id: station.id,
          new_name: editingName.trim(),
        }),
      });

      if (response.ok) {
        showToast("success", "تم تحديث اسم الجهاز بنجاح");
        onStationNameUpdated?.(editingName.trim());
        setShowNameEdit(false);
      } else {
        const error = await response.json();
        showToast("error", error.error || "فشل تحديث اسم الجهاز");
      }
    } catch (error) {
      console.error("Failed to update station name:", error);
      showToast("error", "حدث خطأ أثناء تحديث اسم الجهاز");
    }
  };

  const handleNameCancel = () => {
    setShowNameEdit(false);
    setEditingName(station.name);
  };

  const handleCardClick = () => {
    if (!showNameEdit && canManageSessions) {
      setShowSessionPopup(true);
    }
  };

  const getStationTypeLabel = () => {
    switch (station.station_type) {
      case "playstation":
        return "بلايستيشن";
      case "billiard":
        return "بلياردو";
      case "pingpong":
        return "بينغ بونغ";
      default:
        return "";
    }
  };

  const getStationTypeColor = () => {
    switch (station.station_type) {
      case "playstation":
        return "bg-blue-500/10 text-blue-400";
      case "billiard":
        return "bg-green-500/10 text-green-400";
      case "pingpong":
        return "bg-purple-500/10 text-purple-400";
      default:
        return "bg-gray-500/10 text-gray-400";
    }
  };

  return (
    <>
      <div
        className={`relative rounded-xl bg-surface-card p-4 shadow-none transition-all hover:shadow-lg ${
          isAvailable && canManageSessions ? "cursor-pointer hover:border-primary/30" : ""
        }`}
        onClick={handleCardClick}
      >
        {/* Station Type Badge */}
        <div className={`absolute right-3 top-3 rounded-full px-2 py-1 text-xs font-medium ${getStationTypeColor()}`}>
          {getStationTypeLabel()}
        </div>

        {/* Edit Name Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNameEdit();
          }}
          disabled={!canManageSessions}
          className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-lg bg-surface-page/50 text-foreground-muted hover:bg-surface-page hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed"
          title="تعديل اسم الجهاز"
        >
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
          >
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
          </svg>
        </button>

        {/* Station Name */}
        {showNameEdit ? (
          <div className="mt-8" onClick={(e) => e.stopPropagation()}>
            <Input
              type="text"
              value={editingName}
              onChange={(e) => setEditingName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameSave();
                if (e.key === "Escape") handleNameCancel();
              }}
              autoFocus
            />
            <div className="mt-2 flex gap-2">
              <button
                onClick={handleNameSave}
                className="flex-1 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-surface-page hover:bg-primary/90"
              >
                تأكيد
              </button>
              <button
                onClick={handleNameCancel}
                className="flex-1 rounded-lg border border-foreground-muted/30 px-3 py-1.5 text-sm text-foreground hover:bg-surface-page"
              >
                إلغاء
              </button>
            </div>
          </div>
        ) : (
          <h3 className="mt-8 text-lg font-semibold text-foreground">{station.name}</h3>
        )}

        {/* Status */}
        <div className="mt-4 flex items-center gap-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              isAvailable ? "bg-green-500" : "bg-red-500"
            }`}
          />
          <span className={`text-sm ${isAvailable ? "text-green-400" : "text-red-400"}`}>
            {isAvailable ? "متاح" : "نشط"}
          </span>
        </div>

        {/* Active Session Info */}
        {activeSession && (
          <div className="mt-3 text-sm text-foreground-muted space-y-1">
            <div>وضع: {activeSession.mode === "single" ? "فردي" : "مالتي"}</div>
            <div>الفوترة: {activeSession.billing_mode === "time" ? "بالوقت" : "بالجيمات"}</div>
          </div>
        )}
      </div>

      {/* Session Popup */}
      {showSessionPopup && (
        <SessionPopup
          station={station}
          activeSession={activeSession}
          onClose={() => setShowSessionPopup(false)}
          onSessionStarted={() => {
            setShowSessionPopup(false);
            onSessionStarted?.();
          }}
          onSessionClosed={() => {
            setShowSessionPopup(false);
            onSessionClosed?.();
          }}
        />
      )}
    </>
  );
}
