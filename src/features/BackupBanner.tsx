import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../data/db";
import { useNow, useSettings } from "../lib/hooks";
import { Button } from "../components/ui";
import { downloadBackup } from "./backup";

const SEVEN_DAYS = 7 * 24 * 60 * 60 * 1000;

/** Erinnert an ein Backup, weil die Daten nur in diesem Browser liegen. */
export function BackupBanner() {
  const settings = useSettings();
  const now = useNow();
  const count = useLiveQuery(() => db.companies.count(), [], 0);
  const last = settings.lastBackupAt ? new Date(settings.lastBackupAt).getTime() : 0;
  if (count === 0 || now.getTime() - last < SEVEN_DAYS) return null;
  return (
    <div className="border-b border-line bg-warn-soft" role="alert">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm text-warn">
        <span>
          {last ? "Dein letztes Backup ist älter als 7 Tage." : "Noch kein Backup."} Die Daten liegen nur in diesem Browser. Wird er zurückgesetzt, sind sie weg.
        </span>
        <Button variant="secondary" className="!py-1" onClick={() => void downloadBackup()}>Jetzt sichern</Button>
      </div>
    </div>
  );
}
