import { describe, expect, it } from "vitest";
import { mergeById } from "./merge";

describe("mergeById", () => {
  it("unions disjoint sets", () => {
    const local = [{ id: "a", n: 1 }];
    const remote = [{ id: "b", n: 2 }];
    const merged = mergeById(local, remote);
    expect(merged.map((x) => x.id).sort()).toEqual(["a", "b"]);
  });

  it("remote wins on id collision", () => {
    const local = [{ id: "a", n: 1 }];
    const remote = [{ id: "a", n: 99 }];
    expect(mergeById(local, remote)).toEqual([{ id: "a", n: 99 }]);
  });

  it("handles empty inputs", () => {
    expect(mergeById([], [])).toEqual([]);
    expect(mergeById([{ id: "a", n: 1 }], [])).toEqual([{ id: "a", n: 1 }]);
    expect(mergeById([], [{ id: "b", n: 2 }])).toEqual([{ id: "b", n: 2 }]);
  });
});
