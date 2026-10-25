import { describe, expect, it } from "vitest";
import { isUnsignedIntegerInRange } from "./number";

describe("isUnsignedIntegerInRange", () => {
  it("accepts inclusive bounds and digits with leading zeroes", () => {
    expect(isUnsignedIntegerInRange("0", 0, 59)).toBe(true);
    expect(isUnsignedIntegerInRange("59", 0, 59)).toBe(true);
    expect(isUnsignedIntegerInRange("007", 1, 10)).toBe(true);
  });

  it("defaults to the maximum safe integer", () => {
    expect(isUnsignedIntegerInRange("9007199254740991", 0)).toBe(true);
    expect(isUnsignedIntegerInRange("9007199254740992", 0)).toBe(false);
  });

  it("rejects numbers outside the requested bounds", () => {
    expect(isUnsignedIntegerInRange("0", 1)).toBe(false);
    expect(isUnsignedIntegerInRange("60", 0, 59)).toBe(false);
  });

  it.each([
    "",
    " ",
    " 2",
    "2 ",
    "-1",
    "+1",
    "1.5",
    "1.0",
    "1e2",
    "0x10",
    "NaN",
    "Infinity",
  ])("rejects non-digit input %j", (value) => {
    expect(isUnsignedIntegerInRange(value, 0)).toBe(false);
  });
});
