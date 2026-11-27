export function mountHero(canvas:HTMLCanvasElement) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  void import('./hero-webgl').then(({heroWebGL}) => heroWebGL(canvas)).catch(() => {});
}
