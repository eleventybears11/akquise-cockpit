import Dexie, { type EntityTable } from "dexie";
import type { Call, Company, Profile, Settings } from "./types";

export interface MetaRow {
  key: "settings";
  value: Settings;
}

export class CockpitDB extends Dexie {
  companies!: EntityTable<Company, "id">;
  calls!: EntityTable<Call, "id">;
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
  }
}

export const db = new CockpitDB();
