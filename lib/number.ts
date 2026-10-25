/** Checks a digits-only decimal string against inclusive safe-integer bounds. */
export function isUnsignedIntegerInRange(
  value: string,
  min: number,
  max = Number.MAX_SAFE_INTEGER,
): boolean {
  const number = Number(value);
  return (
    /^\d+$/.test(value) &&
    Number.isSafeInteger(number) &&
    number >= min &&
    number <= max
  );
}
