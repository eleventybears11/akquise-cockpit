import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";
import type { Page } from "@playwright/test";

async function testmodusAn(page: Page) {
  await page.goto("/#/einstellungen");
  await page.getByLabel(/Testmodus: erfundene DEMO-Leads/).check();
  await page.getByRole("button", { name: "Speichern", exact: true }).first().click();
  await expect(page.getByText("Einstellungen gespeichert")).toBeVisible();
}

test("M2: Tagesliste im Testmodus, Belege, Bearbeiten, Ausschlussliste, Backup ohne API-Key", async ({ page }) => {
  // Ausschlussliste: eine DEMO-Firma, die der Testmodus sonst vorschlagen würde
  await page.goto("/#/einstellungen");
  await page.getByTestId("exclusion-file").setInputFiles({ name: "crm.csv", mimeType: "text/csv", buffer: Buffer.from("Firma\nDEMO Testbetrieb 1 GmbH\nIrgendwas KG\n") });
  await expect(page.getByText("2 Firmen in der Ausschlussliste")).toBeVisible();

  // Ohne Key und ohne Testmodus: keine Recherche, keine DEMO-Daten
  await page.goto("/#/freigabe");
  await expect(page.getByText("Für die automatische Recherche fehlt der API-Key")).toBeVisible();
  await expect(page.getByRole("button", { name: /Tagesliste erzeugen/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "API-Key eintragen" })).toBeVisible();

  // Testmodus ausdrücklich einschalten
  await testmodusAn(page);
  await page.goto("/#/freigabe");
  await expect(page.getByText("Testmodus ist eingeschaltet")).toBeVisible();
  await page.getByRole("button", { name: "Tagesliste erzeugen (18)" }).click();
  await expect(page.getByTestId("run-progress")).toBeVisible();
  await expect(page.getByTestId("run-summary")).toContainText("18 von 18 Leads", { timeout: 20_000 });
  const rows = page.getByTestId("freigabe-tabelle").locator("tbody tr");
  await expect(rows).toHaveCount(18);
  await expect(page.getByTestId("freigabe-tabelle")).not.toContainText("DEMO Testbetrieb 1 GmbH");

  // Log zeigt verworfene Kandidaten mit Grund
  await page.getByTestId("run-summary").locator("summary").click();
  await expect(page.getByTestId("run-log")).toContainText("verworfen");

  // Startpaket-Knopf nur vor dem ersten Lauf
  await expect(page.getByRole("button", { name: /Startpaket/ })).toHaveCount(0);

  // Alle rein, erste Rundown-Karte: Belege, Score-Begründung, Break-even
  await page.keyboard.press("Shift+A");
  await page.goto("/#/anrufen");
  const rundown = page.getByTestId("rundown");
  await expect(rundown).toContainText("Fakt");
  await expect(rundown.getByTestId("break-even")).toContainText("konservativ");
  await rundown.getByTestId("score-details").locator("summary").click();
  await expect(rundown.getByTestId("score-details")).toContainText("Wachstumssignal");
  await expect(rundown).toContainText("Lead von David Parikyan");

  // Bearbeiten
  const firma = await page.getByTestId("firma").textContent();
  await page.keyboard.press("b");
  const form = page.getByRole("form", { name: "Lead bearbeiten" });
  await form.getByLabel("Telefon").fill("0732 999999");
  await form.getByRole("button", { name: "Speichern" }).click();
  await expect(page.getByTestId("firma")).toHaveText(firma!);
  await expect(rundown.locator('a[href="tel:+43732999999"]')).toBeVisible();
  await expect(rundown).toContainText("Fakt");

  // API-Key landet nie im Backup
  await page.evaluate(() => localStorage.setItem("lead-cockpit:anthropic-api-key", "sk-ant-test-geheim-1234"));
  await page.goto("/#/einstellungen");
  const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: "Backup herunterladen (JSON)" }).click()]);
  const text = readFileSync(await download.path(), "utf8");
  expect(text).not.toContain("sk-ant-test-geheim");
  const backup = JSON.parse(text);
  expect(backup.runs).toHaveLength(1);
  expect(backup.exclusions).toHaveLength(2);
  expect(backup.companies).toHaveLength(18);
});

test("DEMO-Leads gesammelt löschen, echte Leads bleiben", async ({ page }) => {
  await page.goto("/#/import");
  await page.getByTestId("csv-file").setInputFiles({ name: "echt.csv", mimeType: "text/csv", buffer: Buffer.from('"Firma","Freigabe"\n"Muster Installationen GmbH","Offen"\n') });
  await page.getByRole("button", { name: "1 Leads importieren" }).click();
  await expect(page).toHaveURL(/#\/freigabe/);
  await testmodusAn(page);
  await page.goto("/#/freigabe");
  await page.getByRole("button", { name: "Tagesliste erzeugen (18)" }).click();
  await expect(page.getByTestId("run-summary")).toContainText("18 von 18 Leads", { timeout: 20_000 });
  await page.goto("/#/leads");
  await expect(page.getByText("19 Leads in der App")).toBeVisible();
  page.once("dialog", (d) => void d.accept());
  await page.getByRole("button", { name: "Alle DEMO-Leads löschen (18)" }).click();
  await expect(page.getByText("18 DEMO-Leads gelöscht")).toBeVisible();
  await expect(page.getByText("1 Leads in der App")).toBeVisible();
  await expect(page.getByTestId("leads-tabelle")).toContainText("Muster Installationen GmbH");
  await expect(page.getByRole("button", { name: /DEMO-Leads löschen/ })).toHaveCount(0);
});


test("Neue Leads: Knopf überall sichtbar, Recherche-Auftrag für Claude kopieren", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/#/import");
  await page.getByTestId("csv-file").setInputFiles({ name: "echt.csv", mimeType: "text/csv", buffer: Buffer.from('"Nr","Firma","Freigabe"\n"7","Muster Installationen GmbH","Offen"\n') });
  await page.getByRole("button", { name: "1 Leads importieren" }).click();
  await expect(page).toHaveURL(/#\/freigabe/);

  for (const view of ["freigabe", "anrufen", "leads", "einstellungen"]) {
    await page.goto(`/#/${view}`);
    await expect(page.getByTestId("neue-leads").first()).toBeVisible();
  }

  await page.goto("/#/leads");
  await page.getByTestId("neue-leads").first().click();
  const dialog = page.getByRole("dialog", { name: "Neue Leads" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "API-Key eintragen" })).toBeVisible();
  await dialog.getByLabel("Anzahl Leads").fill("5");
  await dialog.getByTestId("auftrag-kopieren").click();
  await expect(page.getByText("Recherche-Auftrag kopiert")).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toContain("Recherchiere 5 neue B2B-Leads");
  expect(text).toContain("Muster Installationen GmbH");
  expect(text).toContain('"Nr","Firma","Freigabe","Score"');
  expect(text).toContain("Nr fortlaufend ab 8");
  expect(text).toContain("Lead-Inhaber: David Parikyan");

  await dialog.getByRole("button", { name: "Zum Import" }).click();
  await expect(page).toHaveURL(/#\/import/);
  await expect(dialog).toHaveCount(0);
});
