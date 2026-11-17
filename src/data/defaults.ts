import type { Profile, Settings } from "./types";

/** Erstes Profil. Weitere Auftraggeber/Produkte kommen als weitere Profile dazu. */
export const DEFAULT_PROFILE: Profile = {
  id: "webformance-auftragsplus",
  name: "Webformance – AuftragsPlus",
  produkt: "AuftragsPlus",
  mindestinvestition: 10970,
  erstfrage: "Inwieweit hat das bisher so geklappt, wie Sie sich das vorgestellt haben?",
  terminEmpfaenger: ["Jan Grimm", "Leon Haider"],
  leadOwner: "David Parikyan",
};

export const DEFAULT_SETTINGS: Settings = {
  aktivesProfil: DEFAULT_PROFILE.id,
  tageszielVersuche: 60,
  tageszielNeueLeads: 18,
  startpaket: 60,
  theme: "system",
};
