import { describe, expect, it } from "vitest";
import { notificationContext, notificationLink } from "./notification-details";
import { flattenPaperNav, PAPER_AREAS } from "./paper-nav";

describe("notification details", () => {
  it("keeps one canonical notification destination in navigation", () => {
    expect(flattenPaperNav(PAPER_AREAS).filter(({ leaf }) => leaf.title === "Notifications").map(({ leaf }) => leaf.href)).toEqual(["/notifications"]);
  });
  it("shows known context without dumping raw audit or provider payloads", () => {
    expect(notificationContext({ entity: 'giving_category', action: 'UPDATE', receiptNumber: '2026/OFF/21', newValues: { password: 'private' }, highRiskMembers: ['private'], apiKey: 'private' })).toEqual([
      { label: 'Record type', value: 'Giving category' }, { label: 'Action', value: 'Update' }, { label: 'Receipt number', value: '2026/OFF/21' },
    ]);
    expect(notificationContext()).toEqual([]);
  });
  it.each(['https://example.test', '//example.test', '/\\example.test', '/home\n', 'javascript:alert(1)', '/unmapped-destination'])('rejects unsafe or unknown record links: %s', link => {
    expect(notificationLink({ link }, () => true, true)).toBeNull();
  });
  it("preserves authorized internal queries and refuses destinations without access", () => {
    expect(notificationLink({ link: '/people/members/member-a?view=history#notes' }, name => name === 'members:all:read', false)).toBe('/people/members/member-a?view=history#notes');
    expect(notificationLink({ link: '/people/members/member-a' }, () => false, true)).toBeNull();
  });
  it("retains both role and permission gates for billing links", () => {
    expect(notificationLink({ url: '/subscription' }, () => true, false)).toBeNull();
    expect(notificationLink({ url: '/subscription' }, () => false, true)).toBeNull();
    expect(notificationLink({ url: '/subscription' }, name => name === 'billing:read', true)).toBe('/subscription');
  });
});
