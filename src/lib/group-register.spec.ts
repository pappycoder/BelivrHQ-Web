import { describe, expect, it } from "vitest";
import {
  filterGroupRegister,
  type GroupRegisterRecord,
} from "./group-register";

const rows: GroupRegisterRecord[] = [
  {
    id: "b",
    name: "Worship",
    branchId: "west",
    branchName: "West Branch",
    headMemberId: "m",
    headFirstName: "Ada",
    headLastName: "Rice",
    createdAt: "2026-01-01",
  },
  {
    id: "a",
    name: "Welcome",
    branchId: "east",
    branchName: "East Branch",
    description: "Hospitality team",
    createdAt: "2026-02-01",
  },
  {
    id: "c",
    name: "Home circle",
    branchId: "west",
    branchName: "West Branch",
    leaderId: "m",
    leaderFirstName: "Ada",
    meetingDay: "monday",
    createdAt: "2026-03-01",
  },
];
const defaults = {
  search: "",
  branch: "all",
  leadership: "all",
  day: "all",
  sort: "name" as const,
  ascending: true,
};
describe("group registers", () => {
  it("combines name, leader and branch search terms across all returned records", () => {
    expect(
      filterGroupRegister(rows, { ...defaults, search: "ada west" }).map(
        (row) => row.id,
      ),
    ).toEqual(["c", "b"]);
    expect(
      filterGroupRegister(rows, { ...defaults, search: "hospitality" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a"]);
  });
  it("combines branch, leadership and case-insensitive meeting-day filters", () => {
    expect(
      filterGroupRegister(rows, {
        ...defaults,
        branch: "west",
        leadership: "assigned",
        day: "Monday",
      }).map((row) => row.id),
    ).toEqual(["c"]);
    expect(
      filterGroupRegister(rows, { ...defaults, leadership: "unassigned" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a"]);
  });
  it("sorts by date and direction without mutating API data", () => {
    const original = rows.map((row) => row.id);
    expect(
      filterGroupRegister(rows, {
        ...defaults,
        sort: "createdAt",
        ascending: false,
      }).map((row) => row.id),
    ).toEqual(["c", "a", "b"]);
    expect(rows.map((row) => row.id)).toEqual(original);
  });
  it("sorts leadership and stabilizes ties by name and id", () => {
    expect(
      filterGroupRegister(rows, { ...defaults, sort: "leadership" }).map(
        (row) => row.id,
      ),
    ).toEqual(["a", "c", "b"]);
    expect(
      filterGroupRegister([{ ...rows[0], id: "z" }, rows[0]], defaults).map(
        (row) => row.id,
      ),
    ).toEqual(["b", "z"]);
  });
});
