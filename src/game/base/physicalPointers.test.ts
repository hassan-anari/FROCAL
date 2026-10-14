import { expect, it } from "vitest";
import { PhysicalPointers } from "./physicalPointers";

const finger = (pointerId: number) => ({ pointerId, pointerType: "touch", button: 0, isTrusted: true });

it("counts simultaneous fingers separately and rejects repeated downs until release", () => {
  const input = new PhysicalPointers();
  expect(input.down(finger(1))).toBe(true);
  expect(input.down(finger(2))).toBe(true);
  expect(input.down(finger(1))).toBe(false);
  input.up(1);
  expect(input.down(finger(1))).toBe(true);
});

it("rejects synthetic, unknown, secondary and touch-emulated mouse input", () => {
  const input = new PhysicalPointers();
  expect(input.down({ ...finger(1), isTrusted: false })).toBe(false);
  expect(input.down({ ...finger(1), pointerType: "" })).toBe(false);
  expect(input.down({ ...finger(1), pointerType: "mouse", button: 2 })).toBe(false);
  expect(input.down({ ...finger(1), pointerType: "mouse", emulatedMouse: true })).toBe(false);
  expect(input.down(finger(1))).toBe(true);
  expect(input.down({ ...finger(2), pointerType: "mouse" })).toBe(false);
  input.reset();
  expect(input.down({ ...finger(2), pointerType: "mouse" })).toBe(true);
});
