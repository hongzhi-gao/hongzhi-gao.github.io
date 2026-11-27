const hues = [16, 341, 42, 258, 188];
type Point = { x: number; y: number; z: number; radius: number; hue: number };
type Wake = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  created: number;
  life: number;
  strength: number;
  hue: number;
};
type Star = { x: number; y: number; depth: number; hue: number };
const clamp = (value: number, min: number, max: number) =>
  Math.max(min, Math.min(value, max));
const color = (
  hue: number,
  saturation: number,
  lightness: number,
  opacity: number,
) => `hsla(${hue},${saturation}%,${lightness}%,${clamp(opacity, 0, 1)})`;

export function mountEnvironment(stage: HTMLElement) {
  const canvas = stage.querySelector<HTMLCanvasElement>("[data-holo-canvas]")!;
  const context = canvas.getContext("2d", { alpha: true });
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const fine = matchMedia("(hover: hover) and (pointer: fine)");
  if (!context) return;
  const ctx = context;
  const home = stage.dataset.room === "home";
  const listeners = new AbortController();
  const options = { signal: listeners.signal };
  const passive = { ...options, passive: true };
  const trail: Wake[] = [];
  const sparks: Wake[] = [];
  const points: Point[] = [];
  const stars: Star[] = [];
  const pointer = {
    x: 0,
    y: 0,
    lastTime: 0,
    strength: 0,
    vx: 0,
    vy: 0,
    active: false,
  };
  const light = { x: 0, y: 0 };
  const lightStyles = new Map<string, string>();
  let width = 1;
  let height = 1;
  let scroll = 0;
  let frame = 0;
  let prior = 0;
  let clock = 0;
  let hovered: HTMLElement | null = null;

  const animated = () => !reduced.matches;
  const interactive = () => animated() && fine.matches;

  function createField() {
    let seed = 0x318f1;
    function random() {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    }
    points.length = 0;
    stars.length = 0;
    const crowd = home ? (fine.matches ? 69 : 22) : fine.matches ? 25 : 11;
    for (let index = 0; index < crowd; index++) {
      points.push({
        x: (random() - 0.5) * 1830,
        y: (random() - 0.5) * 1180,
        z: 160 + random() * 1250,
        radius: 0.35 + random() * 1.15,
        hue: hues[index % hues.length],
      });
      stars.push({ x: 0, y: 0, depth: 0, hue: hues[index % hues.length] });
    }
  }

  function drawField() {
    const parallaxX = pointer.active ? (light.x - width * 0.5) * 0.08 : 0;
    const parallaxY = pointer.active ? (light.y - height * 0.5) * 0.07 : 0;
    const focal = Math.min(width, height) * 0.91;
    for (const [index, point] of points.entries()) {
      const z =
        160 +
        ((((point.z - 160 - clock * (home ? 23 : 9)) % 1250) + 1250) % 1250);
      const projection = focal / (focal + z);
      let x = width * 0.54 + (point.x - (parallaxX * z) / 600) * projection;
      let y =
        height * 0.53 +
        (point.y - (parallaxY * z) / 600 - ((scroll * 0.12) % 100)) *
          projection;
      const proximity = Math.hypot(x - light.x, y - light.y);
      if (pointer.active && proximity < 135 && proximity > 0.1) {
        const impulse = (1 - proximity / 135) * 18 * projection;
        x += ((x - light.x) * impulse) / proximity;
        y += ((y - light.y) * impulse) / proximity;
      }
      const depth = 1 - z / 1410;
      const size = point.radius * (0.6 + depth * 0.91);
      const star = stars[index];
      star.x = x;
      star.y = y;
      star.depth = depth;
      ctx.fillStyle = color(
        point.hue,
        home ? 43 : 16,
        home ? 73 : 58,
        (0.09 + 0.28 * depth) * (home ? 1 : 0.62),
      );
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fill();
    }
    let connected = 0;
    if (!home || !fine.matches) return;
    for (let index = 0; index < stars.length && connected < 25; index++) {
      const point = stars[index];
      for (let target = index + 1; target < stars.length; target++) {
        const remote = stars[target];
        const distance = Math.hypot(point.x - remote.x, point.y - remote.y);
        if (distance < 94 && Math.abs(point.depth - remote.depth) < 0.2) {
          ctx.strokeStyle = color(
            point.hue,
            53,
            64,
            0.14 * (1 - distance / 94),
          );
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(point.x, point.y);
          ctx.lineTo(remote.x, remote.y);
          ctx.stroke();
          connected++;
          break;
        }
      }
    }
  }

  function prune(list: Wake[], now: number, max: number) {
    const expired = list.findIndex((item) => now - item.created < item.life);
    if (expired === -1) list.length = 0;
    else if (expired > 0) list.splice(0, expired);
    if (list.length > max) list.splice(0, list.length - max);
  }

  function drawTrail(now: number) {
    prune(trail, now, 130);
    prune(sparks, now, 105);
    ctx.lineCap = "round";
    for (let index = 1; index < trail.length; index++) {
      const first = trail[index - 1];
      const second = trail[index];
      const age = now - second.created;
      if (age > second.life || second.created - first.created > 100) continue;
      const fade = Math.pow(clamp(1 - age / second.life, 0, 1), 1.65);
      const expansion = age * 0.035;
      const dx = second.vx * (0.012 * age + expansion);
      const dy = second.vy * (0.012 * age + expansion);
      const size = (0.9 + second.strength * 9.5) * (1 + age / 820);
      const fromX = first.x + first.vx * age * 0.024;
      const fromY = first.y + first.vy * age * 0.024;
      const x = second.x + dx;
      const y = second.y + dy;
      const tone = second.hue;
      ctx.beginPath();
      ctx.moveTo(fromX, fromY);
      ctx.lineTo(x, y);
      ctx.lineWidth = size * 2.7;
      ctx.strokeStyle = color(tone, 99, 67, fade * 0.09 * (home ? 1 : 0.56));
      ctx.stroke();
      ctx.lineWidth = size;
      ctx.strokeStyle = color(
        tone,
        95,
        67,
        fade * (0.35 + 0.25 * second.strength) * (home ? 1 : 0.68),
      );
      ctx.stroke();
      ctx.lineWidth = Math.max(0.7, size * 0.19);
      ctx.strokeStyle = color(tone, 96, 86, fade * 0.77);
      ctx.stroke();
    }
    for (const spark of sparks) {
      const age = now - spark.created;
      const fade = clamp(1 - age / spark.life, 0, 1) ** 1.6;
      if (!fade) continue;
      const dx = spark.vx * age * 0.33;
      const dy = spark.vy * age * 0.33;
      ctx.fillStyle = color(spark.hue, 96, 70, fade * 0.67);
      ctx.beginPath();
      ctx.arc(
        spark.x + dx,
        spark.y + dy,
        0.55 + spark.strength * 2.05,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  function updateLight() {
    const originX = width * (home ? 0.67 : 0.76);
    const originY = height * 0.38;
    const targetX = pointer.active ? pointer.x : originX;
    const targetY = pointer.active ? pointer.y : originY;
    light.x += (targetX - light.x) * 0.1;
    light.y += (targetY - light.y) * 0.1;
    for (const [name, value] of [
      ["--holo-x", `${light.x.toFixed(1)}px`],
      ["--holo-y", `${light.y.toFixed(1)}px`],
      ["--holo-scroll", `${(Math.min(scroll, 1500) * 0.045).toFixed(1)}px`],
      ["--holo-energy", (0.78 + pointer.strength * 0.28).toFixed(3)],
    ]) {
      if (lightStyles.get(name) === value) continue;
      stage.style.setProperty(name, value);
      lightStyles.set(name, value);
    }
  }

  function paint(now: number) {
    frame = 0;
    if (document.hidden) return;
    if (prior) clock += Math.min((now - prior) / 1000, 0.035);
    prior = now;
    if (pointer.active && now - pointer.lastTime > 1600) pointer.active = false;
    ctx.clearRect(0, 0, width, height);
    updateLight();
    drawField();
    if (interactive()) drawTrail(now);
    pointer.strength *= 0.94;
    if (animated() && fine.matches) request();
  }

  function request() {
    if (!frame && !document.hidden) frame = requestAnimationFrame(paint);
  }

  function resize() {
    width = innerWidth;
    height = innerHeight;
    // Keep the decorative canvas near a fixed raster cost on ultrawide and high-DPI screens.
    const ratio = Math.min(
      devicePixelRatio,
      1.4,
      Math.sqrt(1350000 / (width * height)),
    );
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    if (!pointer.active) {
      light.x = width * (home ? 0.67 : 0.76);
      light.y = height * 0.38;
    }
    request();
  }

  function magnet(event: PointerEvent) {
    const next = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-magnetic]",
    );
    if (next !== hovered) {
      hovered?.style.removeProperty("--magnet-x");
      hovered?.style.removeProperty("--magnet-y");
      hovered?.style.removeProperty("--magnet-light");
      hovered = next;
    }
    if (!hovered) return;
    const bounds = hovered.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    hovered.style.setProperty(
      "--magnet-x",
      `${clamp(x * 0.12, -6, 6).toFixed(1)}px`,
    );
    hovered.style.setProperty(
      "--magnet-y",
      `${clamp(y * 0.16, -4, 4).toFixed(1)}px`,
    );
    hovered.style.setProperty(
      "--magnet-light",
      `${event.clientX - bounds.left}px ${event.clientY - bounds.top}px`,
    );
  }

  function move(event: PointerEvent) {
    if (!interactive() || event.pointerType === "touch") return;
    magnet(event);
    const now = performance.now();
    const x = event.clientX;
    const y = event.clientY;
    if (!pointer.active || now - pointer.lastTime > 145) {
      Object.assign(pointer, {
        x,
        y,
        lastTime: now,
        active: true,
        vx: 0,
        vy: 0,
      });
      request();
      return;
    }
    const elapsed = Math.max(now - pointer.lastTime, 8);
    const dx = x - pointer.x;
    const dy = y - pointer.y;
    const distance = Math.hypot(dx, dy);
    if (distance < 1) return;
    const velocity = distance / elapsed;
    const strength = clamp((velocity - 0.12) / 2.65, 0.08, 1);
    pointer.strength = Math.max(pointer.strength, strength);
    const vx = pointer.vx * 0.43 + (dx / elapsed) * 0.57;
    const vy = pointer.vy * 0.43 + (dy / elapsed) * 0.57;
    const count = Math.ceil(clamp(distance / (8 - 5 * strength), 1, 16));
    for (let index = 1; index <= count; index++) {
      const fraction = index / count;
      const hue = hues[Math.floor((now * 0.011 + index * 0.13) % hues.length)];
      const sample = {
        x: pointer.x + dx * fraction,
        y: pointer.y + dy * fraction,
        vx,
        vy,
        created: pointer.lastTime + (now - pointer.lastTime) * fraction,
        life: 170 + strength * 590,
        strength,
        hue,
      };
      trail.push(sample);
      if (index % 4 === 0 && strength > 0.26) {
        const dispersion = 0.22 + strength * 0.52;
        const heading = Math.atan2(vy, vx) + (index % 8 === 0 ? 0.82 : -0.82);
        sparks.push({
          ...sample,
          vx: Math.cos(heading) * dispersion - vx * 0.16,
          vy: Math.sin(heading) * dispersion - vy * 0.16,
          life: 220 + strength * 450,
        });
      }
    }
    Object.assign(pointer, { x, y, lastTime: now, vx, vy });
  }

  function deactivate() {
    pointer.active = false;
    hovered?.style.removeProperty("--magnet-x");
    hovered?.style.removeProperty("--magnet-y");
    hovered?.style.removeProperty("--magnet-light");
    hovered = null;
  }

  function modeChange() {
    if (!interactive()) {
      deactivate();
      trail.length = 0;
      sparks.length = 0;
    }
    createField();
    resize();
  }

  window.addEventListener("resize", resize, passive);
  window.addEventListener(
    "scroll",
    () => {
      scroll = window.scrollY;
      request();
    },
    passive,
  );
  window.addEventListener("pointermove", move, passive);
  document.addEventListener(
    "pointerout",
    (event) => {
      if (!event.relatedTarget) deactivate();
    },
    passive,
  );
  document.addEventListener(
    "visibilitychange",
    () => {
      prior = 0;
      if (document.hidden) {
        cancelAnimationFrame(frame);
        frame = 0;
        deactivate();
      } else request();
    },
    options,
  );
  reduced.addEventListener("change", modeChange, options);
  fine.addEventListener("change", modeChange, options);
  window.addEventListener(
    "pagehide",
    (event) => {
      cancelAnimationFrame(frame);
      frame = 0;
      if (!event.persisted) listeners.abort();
    },
    options,
  );
  window.addEventListener("pageshow", request, options);
  modeChange();
}
