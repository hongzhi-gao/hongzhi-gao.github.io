import { shouldAutoload3D } from "./capabilities";

export function mountHero(canvas: HTMLCanvasElement) {
  if (!shouldAutoload3D()) return;
  void import("./hero-webgl")
    .then(({ heroWebGL }) => heroWebGL(canvas))
    .catch(() => {});
}
