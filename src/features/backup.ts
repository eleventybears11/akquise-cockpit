import { exportBackup, updateSettings } from "../data/repo";
import { db } from "../data/db";
import { companiesToCsv } from "../lib/csv";
import { isoDate } from "../lib/dates";
import { downloadFile } from "../components/ui";
import { toast } from "../lib/toast";

export async function downloadBackup(): Promise<void> {
  const backup = await exportBackup();
  downloadFile(`lead-cockpit-backup-${isoDate()}.json`, JSON.stringify(backup, null, 2), "application/json");
  await updateSettings({ lastBackupAt: new Date().toISOString() });
  toast({ text: `Backup gespeichert (${backup.companies.length} Leads, ${backup.calls.length} Anrufe)`, tone: "ok" });
}

export async function downloadCsv(): Promise<void> {
  const companies = await db.companies.toArray();
  companies.sort((a, b) => (a.nr ?? 9999) - (b.nr ?? 9999));
  // BOM, damit Excel die Umlaute richtig liest
  downloadFile(`lead-cockpit-leads-${isoDate()}.csv`, `\uFEFF${companiesToCsv(companies)}`, "text/csv;charset=utf-8");
}
