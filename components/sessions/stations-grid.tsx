"use client";

import { useState, useEffect, useCallback } from "react";
import { Station, Session } from "@/types/database";
import { StationCard } from "./station-card";
import { EmptyState } from "@/components/ui/empty-state";

interface StationsGridProps {
  canManageSessions?: boolean;
}

export function StationsGrid({ canManageSessions = true }: StationsGridProps) {
  const [stations, setStations] = useState<Station[]>([]);
  const [activeSessions, setActiveSessions] = useState<Record<string, Session>>({});
  const [loading, setLoading] = useState(true);

  const fetchStations = useCallback(async () => {
    try {
      const response = await fetch("/api/stations/list");
      if (response.ok) {
        const data = await response.json();
        setStations(data.stations || []);
      }
    } catch (error) {
      console.error("Failed to fetch stations:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchActiveSessions = useCallback(async () => {
    try {
      const response = await fetch("/api/sessions/active");
      if (response.ok) {
        const data = await response.json();
        const sessionsMap: Record<string, Session> = {};
        data.sessions?.forEach((session: Session) => {
          sessionsMap[session.station_id] = session;
        });
        setActiveSessions(sessionsMap);
      }
    } catch (error) {
      console.error("Failed to fetch active sessions:", error);
    }
  }, []);

  useEffect(() => {
    const loadData = () => {
      fetchStations();
      fetchActiveSessions();
    };
    loadData();
  }, [fetchStations, fetchActiveSessions]);

  const handleSessionStarted = () => {
    fetchActiveSessions();
  };

  const handleSessionClosed = () => {
    fetchActiveSessions();
  };

  const handleStationNameUpdated = (stationId: string, newName: string) => {
    setStations((prev) =>
      prev.map((station) =>
        station.id === stationId ? { ...station, name: newName } : station
      )
    );
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-surface-card animate-pulse"
          />
        ))}
      </div>
    );
  }

  if (stations.length === 0) {
    return (
      <EmptyState message="لا توجد أجهزة مفعلة. قم بإضافة أجهزة من الإعدادات." />
    );
  }

  const sections: { type: Station["station_type"]; label: string }[] = [
    { type: "playstation", label: "الأجهزة" },
    { type: "billiard", label: "بلياردو" },
    { type: "pingpong", label: "بينج بونج" },
  ];

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        const sectionStations = stations.filter(
          (s) => s.station_type === section.type
        );
        if (sectionStations.length === 0) return null;

        return (
          <div key={section.type}>
            <h2 className="mb-4 text-xl font-semibold text-foreground">
              {section.label}
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {sectionStations.map((station) => (
                <StationCard
                  key={station.id}
                  station={station}
                  activeSession={activeSessions[station.id] || null}
                  onSessionStarted={handleSessionStarted}
                  onSessionClosed={handleSessionClosed}
                  onStationNameUpdated={(newName) => handleStationNameUpdated(station.id, newName)}
                  canManageSessions={canManageSessions}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
