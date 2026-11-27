/** Prefer the readable fallback until the visitor selects 3D on a constrained device. */
export function shouldAutoload3D() {
  const navigatorWithMemory = navigator as Navigator & {
    deviceMemory?: number;
  };
  const memory = navigatorWithMemory.deviceMemory;
  return (
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    !matchMedia("(update: slow)").matches &&
    !(
      navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 2
    ) &&
    !(memory !== undefined && memory <= 2)
  );
}
