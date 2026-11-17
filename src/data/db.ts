import Dexie, { type EntityTable } from "dexie";
import type { Call, Company, Enrichment, Exclusion, Profile, ResearchRun, Settings } from "./types";

export interface MetaRow {
  key: "settings";
  value: Settings;
}

export class CockpitDB extends Dexie {
  companies!: EntityTable<Company, "id">;
  calls!: EntityTable<Call, "id">;
  enrichments!: EntityTable<Enrichment, "id">;
  runs!: EntityTable<ResearchRun, "id">;
  exclusions!: EntityTable<Exclusion, "normName">;
  profiles!: EntityTable<Profile, "id">;
  meta!: EntityTable<MetaRow, "key">;

  constructor() {
    super("lead-cockpit");
    // Schema-Änderungen immer als neue Version anhängen (Migration), nie bestehende ändern.
    this.version(1).stores({
      companies: "id, normName, freigabe, status, wiedervorlage, updatedAt",
      calls: "id, companyId, ts",
      profiles: "id",
      meta: "key",
    });
    this.version(2).stores({
      enrichments: "id, companyId",
    });
    this.version(3).stores({
      runs: "id, startedAt",
      exclusions: "normName",
    });
  }
}

export const db = new CockpitDB();
