import { useEffect, useState, type ReactNode } from "react";
import type { Profile, Settings } from "../data/types";
import { deleteAll, isBackup, restoreBackup, saveProfile, updateSettings } from "../data/repo";
import { formatDateTime } from "../lib/dates";
import { useProfile, useSettings } from "../lib/hooks";
import { toast } from "../lib/toast";
import { Button, Card, PageHeader } from "../components/ui";
import { downloadBackup, downloadCsv } from "./backup";

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block text-sm">
      <span className="font-medium">{label}</span>
      {hint && <span className="ml-2 text-xs text-muted">{hint}</span>}
      <div className="mt-1">{children}</div>
    </label>
  );
}

const input = "w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm";

export function Einstellungen() {
  const profile = useProfile();
  const settings = useSettings();
  const [p, setP] = useState<Profile>(profile);
  const [s, setS] = useState<Settings>(settings);
  const [confirm, setConfirm] = useState("");

  useEffect(() => setP(profile), [profile]);
  useEffect(() => setS(settings), [settings]);

  const save = async () => {
    await saveProfile({ ...p, terminEmpfaenger: p.terminEmpfaenger.map((x) => x.trim()).filter(Boolean) });
    await updateSettings({
      tageszielVersuche: s.tageszielVersuche,
      tageszielNeueLeads: s.tageszielNeueLeads,
      startpaket: s.startpaket,
      theme: s.theme,
    });
    toast({ text: "Einstellungen gespeichert", tone: "ok" });
  };

  const restore = async (file: File) => {
    try {
      const data: unknown = JSON.parse(await file.text());
      if (!isBackup(data)) throw new Error("Das ist keine Lead-Cockpit-Sicherung.");
      if (!window.confirm(`Alle aktuellen Daten durch das Backup vom ${formatDateTime(data.exportedAt)} ersetzen (${data.companies.length} Leads, ${data.calls.length} Anrufe)?`)) return;
      await restoreBackup(data);
      toast({ text: "Backup eingespielt", tone: "ok" });
    } catch (err) {
      toast({ text: `Backup nicht eingespielt: ${(err as Error).message}`, tone: "danger" });
    }
  };

  const num = (v: string) => Math.max(0, Number.parseInt(v, 10) || 0);

  return (
    <div className="max-w-4xl space-y-6">
      <PageHeader title="Einstellungen" actions={<Button variant="primary" onClick={() => void save()}>Speichern</Button>} />

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Profil: Auftraggeber & Produkt</h2>
        <p className="mb-4 text-sm text-muted">Weitere Auftraggeber kommen später als eigene Profile dazu.</p>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Profilname"><input className={input} value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Field>
          <Field label="Produkt"><input className={input} value={p.produkt} onChange={(e) => setP({ ...p, produkt: e.target.value })} /></Field>
          <Field label="Mindestinvestition" hint="€ netto, für den Break-even">
            <input className={input} type="number" min={0} value={p.mindestinvestition} onChange={(e) => setP({ ...p, mindestinvestition: num(e.target.value) })} />
          </Field>
          <Field label="Lead-Inhaber" hint="wird bei jedem Lead vermerkt">
            <input className={input} value={p.leadOwner} onChange={(e) => setP({ ...p, leadOwner: e.target.value })} />
          </Field>
          <Field label="Termine für" hint="kommagetrennt">
            <input className={input} value={p.terminEmpfaenger.join(", ")} onChange={(e) => setP({ ...p, terminEmpfaenger: e.target.value.split(",") })} />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Erstfrage" hint="steht auf jeder Rundown-Karte">
              <input className={input} value={p.erstfrage} onChange={(e) => setP({ ...p, erstfrage: e.target.value })} />
            </Field>
          </div>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-4 font-semibold">Tagesziele & Darstellung</h2>
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Anrufversuche/Tag">
            <input className={input} type="number" min={1} value={s.tageszielVersuche} onChange={(e) => setS({ ...s, tageszielVersuche: num(e.target.value) })} />
          </Field>
          <Field label="Neue Leads/Tag" hint="ab M2">
            <input className={input} type="number" min={0} value={s.tageszielNeueLeads} onChange={(e) => setS({ ...s, tageszielNeueLeads: num(e.target.value) })} />
          </Field>
          <Field label="Startpaket" hint="ab M2">
            <input className={input} type="number" min={0} value={s.startpaket} onChange={(e) => setS({ ...s, startpaket: num(e.target.value) })} />
          </Field>
          <Field label="Farbschema">
            <select className={input} value={s.theme} onChange={(e) => setS({ ...s, theme: e.target.value as Settings["theme"] })}>
              <option value="system">wie System</option>
              <option value="hell">hell</option>
              <option value="dunkel">dunkel</option>
            </select>
          </Field>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">Daten sichern</h2>
        <p className="mb-4 text-sm text-muted">
          Alle Daten liegen nur in diesem Browser. Sichere regelmäßig, z. B. in deinen OneDrive- oder Dokumente-Ordner.
          {settings.lastBackupAt ? ` Letztes Backup: ${formatDateTime(settings.lastBackupAt)}.` : " Noch kein Backup."}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => void downloadBackup()}>Backup herunterladen (JSON)</Button>
          <label className="inline-flex cursor-pointer items-center rounded-lg border border-line bg-surface px-3.5 py-2 text-sm font-medium hover:bg-surface-2">
            Backup einspielen
            <input
              type="file"
              accept=".json,application/json"
              className="sr-only"
              data-testid="backup-file"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void restore(f);
                e.target.value = "";
              }}
            />
          </label>
          <Button onClick={() => void downloadCsv()}>Leads als CSV exportieren</Button>
        </div>
      </Card>

      <Card className="p-5">
        <h2 className="mb-1 font-semibold">KI-Recherche</h2>
        <p className="text-sm text-muted">Kommt mit Meilenstein M2: API-Key, Modellwahl und Kostenanzeige.</p>
      </Card>

      <Card className="border-danger/40 p-5">
        <h2 className="mb-1 font-semibold text-danger">Alle Leads und Anrufe löschen</h2>
        <p className="mb-3 text-sm text-muted">Profil und Einstellungen bleiben erhalten. Vorher ein Backup machen. Zum Bestätigen LÖSCHEN eintippen.</p>
        <div className="flex flex-wrap gap-2">
          <input className={`${input} max-w-48`} value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="LÖSCHEN" aria-label="Bestätigung" />
          <Button
            variant="danger"
            disabled={confirm !== "LÖSCHEN"}
            onClick={async () => {
              await deleteAll();
              setConfirm("");
              toast({ text: "Alle Leads und Anrufe gelöscht" });
            }}
          >
            Endgültig löschen
          </Button>
        </div>
      </Card>
    </div>
  );
}
