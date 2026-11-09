import { describe, expect, it } from "vitest";
import { givingSource } from "./giving-source";

describe("giving source labels", () => {
  it("represents a non-member collection as general giving", () => {
    expect(givingSource({})).toEqual({
      kind: "general",
      label: "General giving",
      typeLabel: "General collection",
      context: "",
    });
  });
  it("keeps service and event collection context without inventing a person", () => {
    expect(
      givingSource({ serviceId: "service", serviceName: " Sunday Worship " }),
    ).toMatchObject({
      label: "General giving",
      typeLabel: "Service collection",
      context: "Sunday Worship",
    });
    expect(
      givingSource({ eventId: "event", eventName: "Harvest" }),
    ).toMatchObject({
      label: "General giving",
      typeLabel: "Event collection",
      context: "Harvest",
    });
  });
  it("identifies combined group giving before member fallbacks", () => {
    expect(
      givingSource({
        givingType: "cell_group",
        cellGroupName: "West home",
        memberName: "Recorder",
        title: "West home — Meeting Giving",
      }),
    ).toMatchObject({
      kind: "cell_group",
      label: "West home",
      typeLabel: "Cell group giving",
    });
  });
  it("handles legacy group metadata with no display name", () => {
    expect(givingSource({ cellGroupId: "group" }).label).toBe(
      "Cell group giving",
    );
    expect(
      givingSource({ givingType: "cell_group", title: "Group collection" })
        .label,
    ).toBe("Group collection");
  });
  it("retains named individuals and missing-name member references", () => {
    expect(
      givingSource({ memberId: "member", memberName: " Ada Rice " }),
    ).toMatchObject({ kind: "member", label: "Ada Rice" });
    expect(
      givingSource({ memberId: "member", memberName: "  " }),
    ).toMatchObject({ kind: "member", label: "Member giving" });
  });
  it("preserves an authored general collection title and ignores blank names", () => {
    expect(
      givingSource({ title: "Harvest collection", memberName: " " }),
    ).toMatchObject({ kind: "general", label: "Harvest collection" });
    expect(givingSource({ title: " ", cellGroupName: " " }).label).toBe(
      "General giving",
    );
  });
});
