import { createAdminClient } from "@/lib/supabase/admin";

export interface CleanupCounts {
  shifts: number;
  sessions: number;
  sale_items: number;
  expenses: number;
  products: number;
  users: number;
}

export interface ExpiredShiftRow {
  id: string;
  shop_id: string;
  shift_number: number;
  opened_at: string;
  closed_at: string;
  responsible_name: string;
}

export async function getExpiredShiftIds(): Promise<ExpiredShiftRow[]> {
  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { data, error } = await supabase
    .from("shifts")
    .select("id, shop_id, shift_number, opened_at, closed_at, responsible_name")
    .eq("status", "closed")
    .not("closed_at", "is", null)
    .lt("closed_at", cutoff.toISOString())
    .order("closed_at", { ascending: true });

  if (error) {
    console.error("[cleanup] Failed to query expired shifts:", error);
    throw error;
  }

  return (data ?? []) as ExpiredShiftRow[];
}

interface DeleteResult {
  sessions: number;
  sale_items: number;
  expenses: number;
  shifts: number;
}

export async function deleteShiftData(
  shiftIds: string[],
  dryRun: boolean
): Promise<DeleteResult> {
  if (shiftIds.length === 0) {
    return { sessions: 0, sale_items: 0, expenses: 0, shifts: 0 };
  }

  const supabase = createAdminClient();

  const { count: sessionsCount, error: sErr } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .in("shift_id", shiftIds);
  if (sErr) throw sErr;

  const { count: saleItemsCount, error: siErr } = await supabase
    .from("sale_items")
    .select("id", { count: "exact", head: true })
    .in("shift_id", shiftIds);
  if (siErr) throw siErr;

  const { count: expensesCount, error: eErr } = await supabase
    .from("expenses")
    .select("id", { count: "exact", head: true })
    .in("shift_id", shiftIds);
  if (eErr) throw eErr;

  if (!dryRun) {
    const { error: delSessErr } = await supabase
      .from("sessions")
      .delete()
      .in("shift_id", shiftIds);
    if (delSessErr) throw delSessErr;

    const { error: delSaleErr } = await supabase
      .from("sale_items")
      .delete()
      .in("shift_id", shiftIds);
    if (delSaleErr) throw delSaleErr;

    const { error: delExpErr } = await supabase
      .from("expenses")
      .delete()
      .in("shift_id", shiftIds);
    if (delExpErr) throw delExpErr;

    const { error: delShiftErr } = await supabase
      .from("shifts")
      .delete()
      .in("id", shiftIds);
    if (delShiftErr) throw delShiftErr;
  }

  return {
    sessions: sessionsCount ?? 0,
    sale_items: saleItemsCount ?? 0,
    expenses: expensesCount ?? 0,
    shifts: shiftIds.length,
  };
}

export async function deleteOrphanProducts(dryRun: boolean): Promise<number> {
  const supabase = createAdminClient();

  const { data: inactiveProducts, error: prodErr } = await supabase
    .from("products")
    .select("id, name")
    .eq("is_active", false);
  if (prodErr) throw prodErr;

  if (!inactiveProducts || inactiveProducts.length === 0) return 0;

  const orphanIds: string[] = [];
  const orphanNames: string[] = [];

  for (const product of inactiveProducts) {
    const { count, error: countErr } = await supabase
      .from("sale_items")
      .select("id", { count: "exact", head: true })
      .eq("product_id", product.id);
    if (countErr) throw countErr;

    if (count === 0) {
      orphanIds.push(product.id);
      orphanNames.push(product.name);
    }
  }

  if (orphanIds.length === 0) return 0;

  if (!dryRun) {
    const { error: delErr } = await supabase
      .from("products")
      .delete()
      .in("id", orphanIds);
    if (delErr) throw delErr;
  }

  console.log(
    `[cleanup] ${dryRun ? "DRY RUN — would delete" : "Deleted"} ${orphanIds.length} orphan product(s): ${orphanNames.join(", ")}`
  );

  return orphanIds.length;
}

export async function deleteExpiredDeactivatedUsers(
  dryRun: boolean
): Promise<number> {
  const supabase = createAdminClient();
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 30);

  const { data: deactivatedUsers, error: userErr } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("is_active", false)
    .not("deactivated_at", "is", null)
    .lt("deactivated_at", cutoff.toISOString());
  if (userErr) throw userErr;

  if (!deactivatedUsers || deactivatedUsers.length === 0) return 0;

  const deletableIds: string[] = [];

  for (const user of deactivatedUsers) {
    const { count, error: shiftErr } = await supabase
      .from("shifts")
      .select("id", { count: "exact", head: true })
      .eq("opened_by_user_id", user.id);
    if (shiftErr) throw shiftErr;

    if (count === 0) {
      deletableIds.push(user.id);
    }
  }

  if (deletableIds.length === 0) return 0;

  if (!dryRun) {
    const { error: delErr } = await supabase
      .from("users")
      .delete()
      .in("id", deletableIds);
    if (delErr) throw delErr;
  }

  return deletableIds.length;
}

export async function runCleanup(
  dryRun: boolean
): Promise<{ counts: CleanupCounts; expiredShifts: ExpiredShiftRow[] }> {
  console.log(
    `[cleanup] Starting ${dryRun ? "DRY RUN" : "LIVE"} — finding expired shifts...`
  );

  const expiredShifts = await getExpiredShiftIds();
  const shiftIds = expiredShifts.map((s) => s.id);

  console.log(
    `[cleanup] Found ${shiftIds.length} expired shift(s) past 30-day cutoff.`
  );
  if (shiftIds.length > 0) {
    console.log(
      `[cleanup] Shift IDs: ${shiftIds.join(", ")}`
    );
  }

  const shiftResult = await deleteShiftData(shiftIds, dryRun);

  const productsDeleted = await deleteOrphanProducts(dryRun);

  const usersDeleted = await deleteExpiredDeactivatedUsers(dryRun);

  const counts: CleanupCounts = {
    shifts: shiftResult.shifts,
    sessions: shiftResult.sessions,
    sale_items: shiftResult.sale_items,
    expenses: shiftResult.expenses,
    products: productsDeleted,
    users: usersDeleted,
  };

  console.log(
    `[cleanup] ${dryRun ? "DRY RUN" : "LIVE"} complete: ` +
      `${counts.shifts} shifts, ${counts.sessions} sessions, ` +
      `${counts.sale_items} sale items, ${counts.expenses} expenses, ` +
      `${counts.products} products, ${counts.users} users ` +
      `${dryRun ? "would be deleted" : "deleted"}.`
  );

  return { counts, expiredShifts };
}
