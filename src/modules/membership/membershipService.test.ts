import { describe, it, expect, vi, afterAll } from "vitest";
import type { Guild } from "discord.js";
import * as serverMap from "../../config/serverMap.js";
import { prisma } from "../../db/client.js";
import { getMembershipView, setTierAndSyncRole } from "./membershipService.js";
import type { ServerMap } from "../../config/serverMap.js";

vi.mock("../../config/serverMap.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../config/serverMap.js")>();
  return { ...actual, loadServerMap: vi.fn() };
});

// Integration test — requires a reachable Postgres with migrations applied.
const GUILD_ID = "vitest-membership-guild";

afterAll(async () => {
  await prisma.membership.deleteMany({ where: { guildId: GUILD_ID } });
});

describe("membership tier (real Postgres)", () => {
  it("defaults to free when no record exists", async () => {
    const view = await getMembershipView(GUILD_ID, "member-with-no-record");
    expect(view).toEqual({ tier: "free", status: "active", currentPeriodEnd: null });
  });
});

describe("setTierAndSyncRole — keeps the Discord role in sync with the DB", () => {
  const FAKE_MAP: ServerMap = {
    guildId: GUILD_ID,
    categories: {},
    channels: {},
    updatedAt: new Date().toISOString(),
    roles: { premiumMember: "role-premium" },
  };

  function fakeGuild(initiallyHasRole: boolean) {
    const roleIds = new Set(initiallyHasRole ? ["role-premium"] : []);
    const add = vi.fn(async (id: string) => roleIds.add(id));
    const remove = vi.fn(async (id: string) => roleIds.delete(id));
    const member = { roles: { cache: { has: (id: string) => roleIds.has(id) }, add, remove } };
    const guild = { id: GUILD_ID, members: { fetch: vi.fn(async () => member) } } as unknown as Guild;
    return { guild, add, remove };
  }

  it("adds the Premium Member role when upgrading from free", async () => {
    vi.mocked(serverMap.loadServerMap).mockReturnValue(FAKE_MAP);
    const { guild, add, remove } = fakeGuild(false);

    await setTierAndSyncRole(guild, "member-upgrade", "premium");

    expect(add).toHaveBeenCalledWith("role-premium", expect.any(String));
    expect(remove).not.toHaveBeenCalled();
  });

  it("removes the Premium Member role when downgrading to free", async () => {
    vi.mocked(serverMap.loadServerMap).mockReturnValue(FAKE_MAP);
    const { guild, add, remove } = fakeGuild(true);

    await setTierAndSyncRole(guild, "member-downgrade", "free");

    expect(remove).toHaveBeenCalledWith("role-premium", expect.any(String));
    expect(add).not.toHaveBeenCalled();
  });

  it("is a no-op on the role (but still updates the DB) if the member already has the right role", async () => {
    vi.mocked(serverMap.loadServerMap).mockReturnValue(FAKE_MAP);
    const { guild, add, remove } = fakeGuild(true);

    await setTierAndSyncRole(guild, "member-already-premium", "premium");

    expect(add).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
    expect((await getMembershipView(GUILD_ID, "member-already-premium")).tier).toBe("premium");
  });
});
