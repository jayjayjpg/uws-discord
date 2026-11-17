import { describe, it, expect, vi, beforeEach } from "vitest";
import type { GuildMember } from "discord.js";
import * as serverMap from "../config/serverMap.js";
import { ROLE_BLUEPRINT } from "../config/blueprint.js";
import {
  highestManagedRank,
  memberMeetsRole,
  isModeratorOrAbove,
  isAdministratorOrAbove,
  isEventProposer,
  isEventApprover,
} from "./permissions.js";
import type { ServerMap } from "../config/serverMap.js";

vi.mock("../config/serverMap.js", () => ({ loadServerMap: vi.fn() }));

const FAKE_MAP: ServerMap = {
  guildId: "guild-1",
  categories: {},
  channels: {},
  updatedAt: new Date().toISOString(),
  roles: {
    founder: "role-founder",
    administrator: "role-admin",
    moderator: "role-mod",
    communityManager: "role-cm",
    eventHost: "role-eh",
    facilitator: "role-fac",
    communityGuide: "role-guide",
    member: "role-member",
    newMember: "role-new",
  },
};

function fakeMember(roleIds: string[], hasAdminPermission = false): GuildMember {
  return {
    permissions: { has: () => hasAdminPermission },
    roles: { cache: new Set(roleIds) },
  } as unknown as GuildMember;
}

describe("role hierarchy permission checks", () => {
  beforeEach(() => {
    vi.mocked(serverMap.loadServerMap).mockReturnValue(FAKE_MAP);
  });

  it("returns -1 for a member with no managed roles", () => {
    expect(highestManagedRank(fakeMember([]))).toBe(-1);
  });

  it("returns -1 (not a crash) when server-map.json hasn't been generated yet", () => {
    vi.mocked(serverMap.loadServerMap).mockReturnValue(null);
    expect(highestManagedRank(fakeMember(["role-founder"]))).toBe(-1);
  });

  it("ranks a Moderator above a Member", () => {
    const mod = fakeMember(["role-mod"]);
    const member = fakeMember(["role-member"]);
    expect(highestManagedRank(mod)).toBeGreaterThan(highestManagedRank(member));
  });

  it("isModeratorOrAbove: true for Moderator and Founder, false for Member", () => {
    expect(isModeratorOrAbove(fakeMember(["role-mod"]))).toBe(true);
    expect(isModeratorOrAbove(fakeMember(["role-founder"]))).toBe(true);
    expect(isModeratorOrAbove(fakeMember(["role-member"]))).toBe(false);
  });

  it("isAdministratorOrAbove: false for Moderator (moderator is not administrator+)", () => {
    expect(isAdministratorOrAbove(fakeMember(["role-mod"]))).toBe(false);
    expect(isAdministratorOrAbove(fakeMember(["role-admin"]))).toBe(true);
  });

  it("native Discord Administrator permission always passes, independent of blueprint roles", () => {
    const noManagedRoles = fakeMember([], true);
    expect(memberMeetsRole(noManagedRoles, "founder")).toBe(true);
  });

  it("isEventProposer: true for Event Host, Facilitator, Community Manager+; false for Moderator or Member", () => {
    expect(isEventProposer(fakeMember(["role-eh"]))).toBe(true);
    expect(isEventProposer(fakeMember(["role-fac"]))).toBe(true);
    expect(isEventProposer(fakeMember(["role-cm"]))).toBe(true);
    expect(isEventProposer(fakeMember(["role-mod"]))).toBe(false);
    expect(isEventProposer(fakeMember(["role-member"]))).toBe(false);
  });

  it("isEventApprover: true for Community Manager+; false for Event Host/Facilitator", () => {
    expect(isEventApprover(fakeMember(["role-cm"]))).toBe(true);
    expect(isEventApprover(fakeMember(["role-admin"]))).toBe(true);
    expect(isEventApprover(fakeMember(["role-eh"]))).toBe(false);
    expect(isEventApprover(fakeMember(["role-fac"]))).toBe(false);
  });
});

describe("role blueprint invariant: interest/notification roles never carry permissions", () => {
  it("every non-hierarchy role (rank < 9) has an empty permissions array", () => {
    const cosmeticRoles = ROLE_BLUEPRINT.filter((r) => r.rank < 9);
    expect(cosmeticRoles.length).toBeGreaterThan(0); // sanity: we actually found the interest/notification roles
    for (const role of cosmeticRoles) {
      expect(role.permissions).toEqual([]);
    }
  });
});
