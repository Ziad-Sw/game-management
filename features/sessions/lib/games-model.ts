export type SessionGamesModel = "entries" | "legacy" | null;

interface DatabaseErrorLike {
  code?: string;
  message?: string;
}

export function isMissingGamesModelColumn(
  error: DatabaseErrorLike | null | undefined
): boolean {
  if (!error) {
    return false;
  }

  const message = error.message ?? "";
  return (
    (error.code === "42703" || error.code === "PGRST204") &&
    message.includes("games_model")
  );
}

export function stationSessionUsesEntriesModel(
  gamesModel: SessionGamesModel,
  entryCount: number
): boolean {
  if (gamesModel === "legacy") {
    return false;
  }

  return gamesModel === "entries" || entryCount > 0;
}
