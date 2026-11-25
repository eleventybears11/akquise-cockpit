import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "demo-leads.csv");

async function importFixture(page: Page) {
  await page.goto("/#/import");
  await page.getByTestId("csv-file").setInputFiles(FIXTURE);
  await expect(page.getByTestId("import-summary")).toHaveText("6 neue Leads, 0 Dubletten");
  await page.getByRole("button", { name: "6 Leads importieren" }).click();
  await expect(page).toHaveURL(/#\/freigabe/);
}

test("M1: importieren, freigeben, telefonieren, rückgängig, neu laden, sichern", async ({ page }) => {
  await importFixture(page);

  // Freigabe-Tabelle: 4 offene Leads, nach Score sortiert, fällige Wiedervorlage oben angezeigt
  const rows = page.getByTestId("freigabe-tabelle").locator("tbody tr");
  await expect(rows).toHaveCount(4);
  await expect(rows.first()).toContainText("DEMO Alpen Haustechnik");
  await expect(page.getByText("Fällige Wiedervorlagen (1)")).toBeVisible();

  // r = rein, x = raus, Shift+A = alle übrigen rein
  await page.keyboard.press("r");
  await expect(rows).toHaveCount(3);
  await expect(rows.first()).toContainText("DEMO Donau Elektro");
  await page.keyboard.press("x");
  await expect(rows).toHaveCount(2);
  await page.keyboard.press("Shift+A");
  await expect(page.getByText("Keine Leads zur Freigabe")).toBeVisible();

  // Erneuter Import: alles Dubletten
  await page.goto("/#/import");
  await page.getByTestId("csv-file").setInputFiles(FIXTURE);
  await expect(page.getByTestId("import-summary")).toHaveText("0 neue Leads, 6 Dubletten");

  // Anrufliste: fällige Wiedervorlage zuerst, dann Score
  await page.keyboard.press("g");
  await page.keyboard.press("a");
  await expect(page).toHaveURL(/#\/anrufen/);
  const list = page.getByTestId("anrufliste").locator("li");
  await expect(list).toHaveCount(4);
  await expect(page.getByTestId("firma")).toHaveText("DEMO Wiedervorlage Installationen GmbH");

  // 1 = nicht erreicht → nächster Lead, Lead wandert ans Ende
  await page.keyboard.press("1");
  await expect(page.getByTestId("firma")).toHaveText("DEMO Alpen Haustechnik GmbH");
  await expect(page.getByTestId("versuche")).toHaveText("1");
  await expect(list.last()).toContainText("DEMO Wiedervorlage");

  // 3 = Wiedervorlage mit Datum, Enter speichert
  await page.keyboard.press("3");
  await page.getByRole("button", { name: "+1 Monat" }).click();
  await page.getByRole("button", { name: /Speichern/ }).click();
  await expect(page.getByTestId("firma")).toHaveText("DEMO Sonnen PV GmbH");
  await expect(page.getByRole("alert").filter({ hasText: "Demo-Warnhinweis" })).toBeVisible();

  // Notiz schreiben, dann 4 = Termin
  await page.keyboard.press("n");
  await page.keyboard.type("GF will Potenzialanalyse vor Ort");
  await page.keyboard.press("Escape");
  await page.keyboard.press("4");
  await expect(page.getByTestId("termine")).toHaveText("1");
  await expect(page.getByTestId("firma")).toHaveText("DEMO Kälte & Klima KG");

  // u = letzten Anruf rückgängig
  await page.keyboard.press("u");
  await expect(page.getByTestId("termine")).toHaveText("0");
  await expect(page.getByTestId("firma")).toHaveText("DEMO Sonnen PV GmbH");
  await page.keyboard.press("4");
  await expect(page.getByTestId("termine")).toHaveText("1");

  // Neu laden: alles noch da
  await page.reload();
  await expect(page.getByTestId("versuche")).toHaveText("3");
  await expect(page.getByTestId("termine")).toHaveText("1");
  await page.goto("/#/wiedervorlagen");
  await expect(page.getByTestId("wv-tabelle").locator("tbody tr")).toHaveCount(2);
  await page.goto("/#/leads");
  await page.getByRole("tab", { name: /^Termin/ }).click();
  await expect(page.getByTestId("leads-tabelle")).toContainText("DEMO Sonnen PV GmbH");

  // Backup herunterladen, alles löschen, Backup einspielen
  await page.goto("/#/einstellungen");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Backup herunterladen (JSON)" }).click()]);
  const backupPath = await download.path();
  const backup = JSON.parse(readFileSync(backupPath, "utf8"));
  expect(backup.companies).toHaveLength(6);
  expect(backup.calls).toHaveLength(3);
  expect(JSON.stringify(backup)).not.toMatch(/sk-ant/);

  await page.getByLabel("Bestätigung").fill("LÖSCHEN");
  await page.getByRole("button", { name: "Endgültig löschen" }).click();
  await page.goto("/#/leads");
  await expect(page.getByText("0 Leads in der App")).toBeVisible();

  await page.goto("/#/einstellungen");
  page.once("dialog", (d) => void d.accept());
  await page.getByTestId("backup-file").setInputFiles(backupPath);
  await expect(page.getByText("Backup eingespielt")).toBeVisible();
  await page.goto("/#/leads");
  await expect(page.getByText("6 Leads in der App")).toBeVisible();
});

test("CSV-Export enthält die importierten Spalten", async ({ page }) => {
  await importFixture(page);
  await page.goto("/#/einstellungen");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Leads als CSV exportieren" }).click()]);
  const csv = readFileSync(await download.path(), "utf8");
  expect(csv.split("\n")[0]).toContain('"Anlass + Datum","Einstiegssatz","GF","Telefon"');
  expect(csv).toContain("DEMO Kälte & Klima KG");
});
