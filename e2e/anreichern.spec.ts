import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import Papa from "papaparse";

const FIXTURE = path.join(import.meta.dirname, "fixtures", "demo-leads.csv");

test("FullEnrich: exportieren, Ergebnis importieren, auf der Rundown-Karte anrufen", async ({ page }) => {
  await page.goto("/#/import");
  await page.getByTestId("csv-file").setInputFiles(FIXTURE);
  await page.getByRole("button", { name: "6 Leads importieren" }).click();
  await expect(page).toHaveURL(/#\/freigabe/);
  await expect(page.getByTestId("freigabe-tabelle")).toBeVisible();
  await page.keyboard.press("Shift+A");
  await expect(page.getByText("Keine Leads zur Freigabe")).toBeVisible();

  // Export: Neu/Anrufliste/Wiedervorlage, eine Zeile pro GF-Person
  await page.goto("/#/anreichern");
  const exportRows = page.getByTestId("fe-export-tabelle").locator("tbody tr");
  await expect(exportRows).toHaveCount(5);
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: /CSV für FullEnrich herunterladen \(5\)/ }).click()]);
  const exported = Papa.parse<Record<string, string>>(readFileSync(await download.path(), "utf8").replace(/^\uFEFF/, ""), { header: true, skipEmptyLines: true }).data;
  expect(exported.find((r) => r["Company Name"] === "DEMO Wiedervorlage Installationen GmbH")).toMatchObject({ "First Name": "Erika", "Last Name": "Demo", "Company Domain": "example.com" });
  const alpen = exported.find((r) => r["Company Name"] === "DEMO Alpen Haustechnik GmbH")!;
  expect(alpen).toMatchObject({ "First Name": "Anna", "Last Name": "Beispiel" });

  // FullEnrich-Ergebnis simulieren (erfundene Nummer)
  const result = Papa.unparse(
    exported.map((r) => ({ ...r, "Mobile Phone": r === alpen ? "+43 664 0000099" : "", "Work Email": r === alpen ? "anna@example.com" : "" })),
  );
  await page.getByTestId("fe-file").setInputFiles({ name: "fullenrich-result.csv", mimeType: "text/csv", buffer: Buffer.from(result) });
  await expect(page.getByTestId("fe-summary")).toContainText("2 neue Angaben");
  await page.getByRole("button", { name: "2 Angaben übernehmen" }).click();
  await expect(page.getByText("2 Kontaktdaten übernommen")).toBeVisible();

  // Gleiche Datei nochmal: nichts Neues
  await page.getByTestId("fe-file").setInputFiles({ name: "fullenrich-result.csv", mimeType: "text/csv", buffer: Buffer.from(result) });
  await expect(page.getByTestId("fe-summary")).toContainText("0 neue Angaben");
  await expect(page.getByTestId("fe-summary")).toContainText("2 schon bekannt");
  await page.getByRole("button", { name: "Abbrechen" }).click();

  // Rundown: Firmennummer + FullEnrich-Handy + E-Mail
  await page.goto("/#/leads");
  await page.getByRole("link", { name: "DEMO Alpen Haustechnik GmbH" }).click();
  const rundown = page.getByTestId("rundown");
  await expect(rundown.locator('a[href="tel:+436640000099"]')).toContainText("FullEnrich · Anna Beispiel");
  await expect(rundown.locator('a[href="tel:+437242000001"]')).toBeVisible();
  await expect(rundown.locator('a[href="mailto:anna@example.com"]')).toBeVisible();

  // Backup enthält die Angaben
  await page.goto("/#/einstellungen");
  const [backup] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Backup herunterladen (JSON)" }).click()]);
  const data = JSON.parse(readFileSync(await backup.path(), "utf8"));
  expect(data.enrichments).toHaveLength(2);
});
