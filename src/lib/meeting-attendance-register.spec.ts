import { describe, expect, it } from "vitest";
import { meetingAttendanceRows } from "./meeting-attendance-register";
import type { CellGroupAttendanceRecord } from "@/hooks/use-admin";

const records: CellGroupAttendanceRecord[] = [
  {
    id: "b",
    memberId: "member",
    firstName: "Ada",
    lastName: "Rice",
    status: "present",
    meetingDate: "2026-11-01",
    notes: "Early arrival",
  },
  {
    id: "a",
    visitorId: "visitor",
    firstName: "Beth",
    lastName: "Guest",
    status: "late",
    meetingDate: "2026-11-08",
    notes: null,
  },
  {
    id: "c",
    visitorName: "Chris Walk-in",
    firstName: "",
    lastName: "",
    status: "present",
    meetingDate: "2026-11-08",
    notes: "Early arrival",
  },
];
const defaults = {
  search: "",
  status: "all",
  type: "all",
  sort: "date" as const,
  ascending: false,
};
describe("meeting attendance register", () => {
  it("names linked visitors and walk-ins correctly", () => {
    expect(
      meetingAttendanceRows(records, defaults).map((row) => row.attendee),
    ).toEqual(["Beth Guest", "Chris Walk-in", "Ada Rice"]);
  });
  it("combines multi-term name/notes, type and status filters", () => {
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        search: "ada early",
        type: "Member",
        status: "present",
      }).map((row) => row.id),
    ).toEqual(["b"]);
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        type: "Visitor",
        status: "late",
      }).map((row) => row.id),
    ).toEqual(["a"]);
  });
  it("sorts all filtered records before paging or export without mutating API data", () => {
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        sort: "attendee",
        ascending: true,
      }).map((row) => row.id),
    ).toEqual(["b", "a", "c"]);
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        sort: "attendee",
        ascending: false,
      }).map((row) => row.id),
    ).toEqual(["c", "a", "b"]);
    expect(records.map((row) => row.id)).toEqual(["b", "a", "c"]);
  });
  it("sorts status and attendee type with deterministic ties", () => {
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        sort: "status",
        ascending: true,
      }).map((row) => row.id),
    ).toEqual(["a", "b", "c"]);
    expect(
      meetingAttendanceRows(records, {
        ...defaults,
        sort: "type",
        ascending: true,
      }).map((row) => row.id),
    ).toEqual(["b", "a", "c"]);
  });
});
