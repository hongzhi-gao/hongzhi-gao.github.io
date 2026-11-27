import * as T from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import type { Scenario } from "../architecture-ir/schema";
import { installLights, model } from "./models";
import type { replay } from "./replay";

export type Stage = ReturnType<typeof createStage>;
export function createStage(
  stage: HTMLElement,
  canvas: HTMLCanvasElement,
  scenario: Scenario,
  labels: HTMLButtonElement[],
  tint: string,
  renderSoon: () => void,
  immersive = false,
) {
  const context = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
    powerPreference: "low-power",
  });
  if (!context) throw new Error("WebGL 2 unavailable");
  const renderer = new T.WebGLRenderer({ canvas, context, antialias: true });
  const navy = immersive ? 0x091523 : 0x0c1922;
  renderer.setClearColor(navy);
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(navy, immersive ? 0.032 : 0.018);
  installLights(scene);
  const grid = new T.GridHelper(
    80,
    80,
    0x2b505c,
    immersive ? 0x284659 : 0x1b3543,
  );
  grid.position.y = -0.08;
  scene.add(grid);
  if (immersive) {
    const studio = new T.Mesh(
      new T.PlaneGeometry(80, 80),
      new T.ShaderMaterial({
        uniforms: { accent: { value: new T.Color(tint) } },
        vertexShader: `
          varying vec2 coordinates;
          void main(){coordinates=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
        `,
        fragmentShader: `
          uniform vec3 accent;
          varying vec2 coordinates;
          void main(){
            vec2 center = (coordinates-.5) * vec2(1.,1.6);
            float intensity=exp(-24.*length(center));
            gl_FragColor=vec4(vec3(.036,.080,.132)+accent*intensity*.13,1.);
          }
        `,
      }),
    );
    studio.rotation.x = -Math.PI / 2;
    studio.position.y = -0.13;
    scene.add(studio);
    const softbox = new T.PointLight(tint, 23, 17, 2);
    softbox.position.set(-3.7, 4.4, -4.8);
    scene.add(softbox);
  }
  const camera = new T.PerspectiveCamera(42, 1, 0.1, 170);
  const controls = new OrbitControls(camera, canvas);
  const viewOrigin = new T.Vector3(0, 0.3, -0.1);
  const initial = new T.Vector3(3.7, 7.1, 10.8);
  camera.position.copy(initial);
  controls.target.copy(viewOrigin);
  controls.minDistance = 4.8;
  controls.maxDistance = 30;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.update();
  let manual = false;
  controls.addEventListener("start", () => {
    manual = true;
  });
  controls.addEventListener("change", renderSoon);
  const objects = new Map(
    scenario.components.map((component) => {
      const visual = model(component.kind, tint);
      visual.group.position.fromArray(
        component.initialPosition ?? component.position,
      );
      if (immersive) visual.group.scale.setScalar(1.08);
      scene.add(visual.group);
      return [component.id, visual] as const;
    }),
  );
  const points = (from: string, to: string) => {
    const a = objects.get(from)!.group.position.clone();
    a.y = 0.17;
    const b = objects.get(to)!.group.position.clone();
    b.y = 0.17;
    const center = a.clone().lerp(b, 0.5);
    center.y = 0.68;
    return new T.QuadraticBezierCurve3(a, center, b);
  };
  const moving = scenario.components.some(
    (component) => component.initialPosition,
  );
  const paths = new Map(
    scenario.relationships.map(({ from, to, label }) => {
      const route = points(from, to);
      const control =
        immersive && ["rpc", "state", "lock", "retry"].includes(label);
      const line = new T.Line(
        new T.BufferGeometry().setFromPoints(route.getPoints(32)),
        control
          ? new T.LineDashedMaterial({
              color: 0xa6b5e2,
              transparent: true,
              opacity: 0.24,
              dashSize: 0.27,
              gapSize: 0.18,
            })
          : new T.LineBasicMaterial({
              color: tint,
              transparent: true,
              opacity: 0.24,
            }),
      );
      if (control) line.computeLineDistances();
      scene.add(line);
      const path = { route, line, from, to };
      return [`${from}:${to}`, path] as const;
    }),
  );
  const packet = new T.Mesh(
    new T.IcosahedronGeometry(immersive ? 0.145 : 0.115),
    new T.MeshBasicMaterial({ color: 0xdcfff5 }),
  );
  scene.add(packet);
  const wake = immersive
    ? [0.4, 0.56].map((scale, index) => {
        const tail = new T.Mesh(
          new T.IcosahedronGeometry(0.145),
          new T.MeshBasicMaterial({
            color: new T.Color(tint),
            transparent: true,
            opacity: 0.42 + index * 0.18,
          }),
        );
        tail.scale.setScalar(scale);
        scene.add(tail);
        return tail;
      })
    : [];
  const badgeLayer = stage.querySelector<SVGGElement>("[data-stage-leaders]");
  const leaders =
    badgeLayer &&
    new Map(
      scenario.components.map((component) => {
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        badgeLayer.append(line);
        return [component.id, line] as const;
      }),
    );
  const target = new T.Vector3();
  const desired = new T.Vector3();
  const projected = new T.Vector3();
  let lastFocus = true;
  let previous = 0;
  const resize = () => {
    const width = stage.clientWidth;
    const height = stage.clientHeight;
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    if (immersive) {
      if (camera.aspect > 1.6) initial.set(3.45, 6.05, 8.9);
      else initial.set(3.35, 7.3, 11.8);
    }
    camera.updateProjectionMatrix();
    renderSoon();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(stage);
  resize();
  return {
    render(
      state: ReturnType<typeof replay>,
      selected: string | undefined,
      focus: boolean,
      motion: boolean,
      now: number,
    ) {
      if (focus !== lastFocus) {
        manual = !focus;
        lastFocus = focus;
      }
      let settling = false;
      if (focus && !manual) {
        const frame = scenario.cameraTrack.findLast(
          (item) => item.step <= state.completed,
        );
        const location = objects.get(selected ?? frame?.target ?? "")?.group
          .position;
        const alpha =
          motion && previous && now
            ? Math.min((now - previous) / 420, 0.14)
            : motion
              ? 0.05
              : 1;
        target.copy(viewOrigin);
        if (location) target.lerp(location, selected ? 0.58 : 0.19);
        desired.copy(initial).addScaledVector(target, 0.64);
        if (camera.aspect < 1.2) desired.multiplyScalar(1.12);
        if (selected) desired.lerp(target, 0.16);
        if (frame?.distance)
          desired.sub(target).setLength(frame.distance).add(target);
        camera.position.lerp(desired, alpha);
        controls.target.lerp(target, alpha);
        settling =
          camera.position.distanceToSquared(desired) > 0.0001 ||
          controls.target.distanceToSquared(target) > 0.0001;
      }
      previous = now;
      controls.update();
      const route: `${string}:${string}` | "" = state.active?.from
        ? `${state.active.from}:${state.active.target}`
        : "";
      for (const [key, { line }] of paths)
        line.material.opacity = key === route ? 0.94 : immersive ? 0.32 : 0.22;
      const activePath = route ? paths.get(route) : undefined;
      packet.visible = !!activePath && motion;
      const placed: {
        left: number;
        top: number;
        width: number;
        height: number;
      }[] = [];
      const bounds = { width: stage.clientWidth, height: stage.clientHeight };
      for (const component of scenario.components) {
        const visual = objects.get(component.id)!;
        const componentState = state.states[component.id];
        visual.group.visible = componentState.visible;
        const active =
          component.id === selected || component.id === state.event?.target;
        visual.light.emissiveIntensity = active
          ? 1.42
          : 0.5 + componentState.progress * 0.42;
        visual.light.emissive.set(
          componentState.state === "lagging" || componentState.state === "gap"
            ? "#ff9e70"
            : tint,
        );
        if (component.initialPosition) {
          const progress =
            (state.completed + (motion ? state.fraction : 0)) /
            scenario.timeline.length;
          visual.group.position.set(
            T.MathUtils.lerp(
              component.initialPosition[0],
              component.position[0],
              progress,
            ),
            T.MathUtils.lerp(
              component.initialPosition[1],
              component.position[1],
              progress,
            ),
            T.MathUtils.lerp(
              component.initialPosition[2],
              component.position[2],
              progress,
            ),
          );
        }
        const label = labels.find(
          (button) => button.dataset.node === component.id,
        )!;
        projected.copy(visual.group.position);
        projected.y +=
          component.kind === "Peer" ||
          component.kind === "Master" ||
          component.kind === "ServerNode"
            ? 1.55
            : 1.18;
        projected.project(camera);
        const leader = leaders?.get(component.id);
        if (!componentState.visible) {
          leader?.setAttribute("visibility", "hidden");
          continue;
        }
        const width = label.offsetWidth;
        const height = label.offsetHeight;
        const desiredX = ((projected.x + 1) * bounds.width) / 2;
        const desiredY = ((1 - projected.y) * bounds.height) / 2 - height;
        const left = Math.max(
          6,
          Math.min(desiredX - width / 2, bounds.width - width - 6),
        );
        const ceiling = 54;
        const floor = bounds.height - height - 5;
        const row = height + 5;
        const offsets = [0, -row, row, -2 * row, 2 * row, -3 * row, 3 * row];
        const candidates = offsets.map((offset) =>
          Math.max(ceiling, Math.min(floor, desiredY + offset)),
        );
        const overlaps = (top: number) =>
          placed.some(
            (rect) =>
              left < rect.left + rect.width + 5 &&
              left + width + 5 > rect.left &&
              top < rect.top + rect.height + 5 &&
              top + height + 5 > rect.top,
          );
        const top =
          candidates.find((position) => !overlaps(position)) ?? candidates[0];
        placed.push({ left, top, width, height });
        label.style.left = `${left + width / 2}px`;
        label.style.top = `${top + height}px`;
        if (leader) {
          leader.removeAttribute("visibility");
          leader.classList.toggle("active", active);
          const bottom = top + height;
          const coordinates = {
            x1: left + width / 2,
            y1: bottom,
            x2: desiredX,
            y2: desiredY + height + 13,
          };
          for (const [label, value] of Object.entries(coordinates))
            leader.setAttribute(label, String(value));
        }
      }
      if (moving) {
        for (const path of paths.values()) {
          path.route = points(path.from, path.to);
          const vertices = path.route.getPoints(32);
          path.line.geometry.setFromPoints(vertices);
          const distances = path.line.geometry.getAttribute("lineDistance");
          if (distances) {
            let distance = 0;
            for (let index = 1; index < vertices.length; index++) {
              distance += vertices[index].distanceTo(vertices[index - 1]);
              distances.setX(index, distance);
            }
            distances.needsUpdate = true;
          }
        }
      }
      if (activePath && motion)
        activePath.route.getPoint(state.fraction, packet.position);
      wake.forEach((tail, index) => {
        const offset = (wake.length - index) * 0.034;
        tail.visible = !!activePath && motion && state.fraction > offset;
        if (activePath && tail.visible)
          activePath.route.getPoint(state.fraction - offset, tail.position);
      });
      renderer.render(scene, camera);
      return settling;
    },
    dispose() {
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof T.Mesh || object instanceof T.Line) {
          object.geometry.dispose();
          object.material.dispose();
        }
      });
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
