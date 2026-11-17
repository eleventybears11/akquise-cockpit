import { expect, test } from "@playwright/test";
import { readFileSync } from "node:fs";

test("M2: Tagesliste im Testmodus, Belege, Bearbeiten, Ausschlussliste, Backup ohne API-Key", async ({ page }) => {
  // Ausschlussliste: eine DEMO-Firma, die der Testmodus sonst vorschlagen würde
  await page.goto("/#/einstellungen");
  await page.getByTestId("exclusion-file").setInputFiles({ name: "crm.csv", mimeType: "text/csv", buffer: Buffer.from("Firma\nDEMO Testbetrieb 1 GmbH\nIrgendwas KG\n") });
  await expect(page.getByText("2 Firmen in der Ausschlussliste")).toBeVisible();

  // Tagesliste erzeugen (ohne Key → Testmodus)
  await page.goto("/#/freigabe");
  await expect(page.getByText("Testmodus: erfundene DEMO-Leads")).toBeVisible();
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
