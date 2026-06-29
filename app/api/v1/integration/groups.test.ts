import { describe, expect, it } from "vitest";
import {
  createGroup,
  ctx,
  getGroup,
  getInvite,
  getRequest,
  joinGroup,
  jsonRequest,
  listGroups,
  listMembers,
  patchGroup,
  removeMember,
  signupWithProfile,
} from "./setup";

describe("group membership and authorization", () => {
  it("creates groups, exposes invite data only to admins, and lets another profiled user join by code", async () => {
    const owner = await signupWithProfile("owner@example.com", "Owner");
    const guest = await signupWithProfile("guest@example.com", "Guest");

    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Trampo", description: "Mesa do trabalho" }, owner.auth),
    );
    expect(createdRes.status).toBe(201);
    const created = await createdRes.json();
    expect(created.group.memberIds).toEqual([owner.profile.id]);
    expect(created.group.adminPlayerIds).toEqual([owner.profile.id]);

    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId: created.group.id }));
    expect(inviteRes.status).toBe(200);
    const invite = await inviteRes.json();

    const joinedRes = await joinGroup(
      jsonRequest({ inviteCode: invite.inviteCode.toLowerCase() }, guest.auth),
    );
    expect(joinedRes.status).toBe(200);
    const joinedJson = await joinedRes.json();
    expect(joinedJson.group.memberIds).toEqual([owner.profile.id, guest.profile.id]);
    expect(joinedJson.group.inviteCode).toBeUndefined();

    const memberInviteRes = await getInvite(
      getRequest(guest.auth),
      ctx({ groupId: created.group.id }),
    );
    expect(memberInviteRes.status).toBe(403);

    const membersRes = await listMembers(
      getRequest(owner.auth),
      ctx({ groupId: created.group.id }),
    );
    expect(membersRes.status).toBe(200);
    const members = (await membersRes.json()).members;
    const guestMember = members.find(
      (member: { playerId: string }) => member.playerId === guest.profile.id,
    );
    expect(guestMember).toBeDefined();

    const removedRes = await removeMember(
      getRequest(owner.auth),
      ctx({ groupId: created.group.id, memberId: guestMember.id }),
    );
    expect(removedRes.status).toBe(204);
  });

  it("lists only the groups the authenticated user belongs to", async () => {
    const owner = await signupWithProfile("list-owner@example.com", "Owner");
    const other = await signupWithProfile("list-other@example.com", "Other");

    const ownerGroupRes = await createGroup(
      jsonRequest({ name: "Grupo do Owner", description: "A" }, owner.auth),
    );
    const ownerGroup = await ownerGroupRes.json();
    await createGroup(jsonRequest({ name: "Grupo do Other", description: "B" }, other.auth));

    const ownerListRes = await listGroups(getRequest(owner.auth));
    expect(ownerListRes.status).toBe(200);
    const ownerList = await ownerListRes.json();
    expect(ownerList.groups).toHaveLength(1);
    expect(ownerList.groups[0].id).toBe(ownerGroup.group.id);
  });

  it("blocks cross-group access and admin-only updates for regular members", async () => {
    const owner = await signupWithProfile("owner@example.com", "Owner");
    const guest = await signupWithProfile("guest@example.com", "Guest");
    const outsider = await signupWithProfile("outsider@example.com", "Outsider");

    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Trampo", description: "Mesa do trabalho" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;
    const inviteRes = await getInvite(getRequest(owner.auth), ctx({ groupId }));
    const invite = await inviteRes.json();
    await joinGroup(jsonRequest({ inviteCode: invite.inviteCode }, guest.auth));

    const outsiderRead = await getGroup(getRequest(outsider.auth), ctx({ groupId }));
    expect(outsiderRead.status).toBe(403);

    const memberPatch = await patchGroup(
      jsonRequest({ name: "Tentativa" }, guest.auth),
      ctx({ groupId }),
    );
    expect(memberPatch.status).toBe(403);

    const adminPatch = await patchGroup(
      jsonRequest({ name: "Pimbas Oficial" }, owner.auth),
      ctx({ groupId }),
    );
    expect(adminPatch.status).toBe(200);
    expect((await adminPatch.json()).group.name).toBe("Pimbas Oficial");
  });

  it("lets group admins update default match settings with domain validation", async () => {
    const owner = await signupWithProfile("settings-owner@example.com", "Owner");
    const createdRes = await createGroup(
      jsonRequest({ name: "Pimbas Settings", description: "Mesa" }, owner.auth),
    );
    const groupId = (await createdRes.json()).group.id;

    const patchRes = await patchGroup(
      jsonRequest(
        {
          defaultMatchSettings: {
            goalLimit: 7,
            timeLimitMinutes: 12,
            goldenGoal: false,
          },
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(patchRes.status).toBe(200);
    expect((await patchRes.json()).group.defaultMatchSettings).toEqual({
      goalLimit: 7,
      timeLimitMinutes: 12,
      goldenGoal: false,
    });

    const invalidPatchRes = await patchGroup(
      jsonRequest(
        {
          defaultMatchSettings: {
            goalLimit: 0,
            timeLimitMinutes: 12,
            goldenGoal: false,
          },
        },
        owner.auth,
      ),
      ctx({ groupId }),
    );
    expect(invalidPatchRes.status).toBe(400);
  });
});
