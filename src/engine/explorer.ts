import { shouldAutoload3D } from "./capabilities";
import type { Scenario, Component } from "../architecture-ir/schema";
import { replay, stepDuration } from "./replay";
import type { Stage } from "./stage";

type Link = { label: string; href: string };
customElements.define(
  "architecture-explorer",
  class extends HTMLElement {
    private cleanup = () => {};
    disconnectedCallback() {
      this.cleanup();
    }
    connectedCallback() {
      const get = <T extends HTMLElement = HTMLElement>(selector: string) =>
        this.querySelector<T>(selector)!;
      const {
        scenario,
        links,
        accent,
      }: { scenario: Scenario; links: Record<string, Link>; accent: string } =
        JSON.parse(get("[data-ir]").textContent!);
      const nodes = Array.from(
        this.querySelectorAll<HTMLButtonElement>("[data-node]"),
      );
      const steps = Array.from(
        this.querySelectorAll<HTMLButtonElement>("[data-step]"),
      );
      const reduced = matchMedia("(prefers-reduced-motion: reduce)");
      const controller = new AbortController();
      const listener = { signal: controller.signal };
      const scrub = get<HTMLInputElement>("[data-scrub]");
      const speed = get<HTMLSelectElement>("[data-speed]");
      const loop = get<HTMLInputElement>("[data-loop]");
      const focus = get<HTMLInputElement>("[data-focus]");
      const view = get<HTMLButtonElement>("[data-view]");
      const play = get<HTMLButtonElement>("[data-play]");
      const stageElement = get("[data-stage]");
      const fallbackLinks = this.querySelector<SVGGElement>("[data-links]")!;
      const fallbackPacket =
        this.querySelector<SVGCircleElement>("[data-packet]")!;
      const wireNodes = new Map(
        nodes.map((node) => [node.dataset.node!, node]),
      );
      const wires = scenario.relationships.map((relation) => {
        const line = document.createElementNS(
          "http://www.w3.org/2000/svg",
          "line",
        );
        fallbackLinks.append(line);
        return { line, from: relation.from, to: relation.to };
      });
      let resized = true;
      let stage: Stage | undefined;
      let enabled = false;
      let pending = false;
      let playing = false;
      let visible = true;
      let selected: Component | undefined;
      let time = 0;
      let frame = 0;
      let previous = 0;
      let lastStep = -1;
      let lastState = -1;
      let lastSelected: string | undefined;
      function drawFallback(state: ReturnType<typeof replay>) {
        if (resized) {
          const stageBox = stageElement.getBoundingClientRect();
          const center = (id: string) => {
            const node = wireNodes.get(id)!.getBoundingClientRect();
            return [
              node.left - stageBox.left + node.width / 2,
              node.top - stageBox.top + node.height / 2,
            ];
          };
          for (const { line, from, to } of wires) {
            const [x1, y1] = center(from);
            const [x2, y2] = center(to);
            for (const [key, value] of Object.entries({ x1, y1, x2, y2 }))
              line.setAttribute(key, String(value));
          }
          resized = false;
        }
        fallbackPacket.setAttribute("visibility", "hidden");
        for (const { line, from, to } of wires) {
          const active =
            from === state.active?.from && to === state.active.target;
          line.classList.toggle("hot", active);
          line.classList.toggle(
            "hidden-wire",
            !state.states[from].visible || !state.states[to].visible,
          );
          if (active && !reduced.matches) {
            for (const axis of ["x", "y"]) {
              const start = Number(line.getAttribute(axis + "1"));
              const end = Number(line.getAttribute(axis + "2"));
              fallbackPacket.setAttribute(
                "c" + axis,
                String(start + (end - start) * state.fraction),
              );
            }
            fallbackPacket.setAttribute("visibility", "visible");
          }
        }
      }
      function addLinks(container: HTMLElement, ids: string[]) {
        container.replaceChildren(
          ...ids.map((id) => {
            const anchor = document.createElement("a");
            anchor.href = links[id].href;
            anchor.textContent = links[id].label;
            return anchor;
          }),
        );
      }
      function draw(now = 0) {
        const state = replay(scenario, time);
        const index = Math.min(state.completed, steps.length - 1);
        scrub.value = String(Math.round(time));
        if (index !== lastStep) {
          lastStep = index;
          get("[data-count]").textContent =
            `${String(index + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
          get("[data-event-title]").textContent = state.event?.label ?? "";
          get("[data-event-detail]").textContent = state.event?.detail ?? "";
          addLinks(get("[data-event-sources]"), state.event?.evidence ?? []);
          steps.forEach((step, i) =>
            i === index
              ? step.setAttribute("aria-current", "step")
              : step.removeAttribute("aria-current"),
          );
        }
        if (state.completed !== lastState || selected?.id !== lastSelected) {
          lastState = state.completed;
          lastSelected = selected?.id;
          resized = true;
          nodes.forEach((button) => {
            const id = button.dataset.node!;
            const current = state.states[id];
            button.hidden = !current.visible;
            button.dataset.state = current.state;
            button.setAttribute("aria-pressed", String(id === selected?.id));
            const progress = current.progress
              ? ` · ${Math.round(current.progress * 100)}%`
              : "";
            button.querySelector("[data-node-state]")!.textContent =
              current.state.replaceAll("-", " ") + progress;
          });
          if (selected) {
            get("[data-node-level]").textContent =
              `L${selected.level} / ${selected.kind}`;
            get("[data-node-title]").textContent = selected.label;
            const path = [selected.label];
            let parent = selected.parent;
            while (parent) {
              const ancestor = scenario.components.find(
                (component) => component.id === parent,
              )!;
              path.unshift(ancestor.label);
              parent = ancestor.parent;
            }
            const location = get("[data-node-path]");
            location.hidden = path.length < 2;
            location.textContent = path.join(" / ");
            const structure =
              selected.structure
                ?.map((field) => `${field.name} · ${field.meaning}`)
                .join(" ") ?? "";
            get("[data-node-detail]").textContent = [
              selected.description,
              structure,
            ]
              .filter(Boolean)
              .join(" ");
            addLinks(get("[data-node-sources]"), selected.evidence);
            const jump = get<HTMLAnchorElement>("[data-node-jump]");
            jump.hidden = !selected.jump;
            if (selected.jump) jump.href = `/lab/${selected.jump}/`;
          }
        }
        nodes.forEach((button) =>
          button.classList.toggle(
            "active",
            button.dataset.node === state.event?.target,
          ),
        );
        stageElement.dataset.event = state.event?.type;
        if (enabled)
          return (
            stage?.render(
              state,
              selected?.id,
              focus.checked,
              !reduced.matches,
              now,
            ) ?? false
          );
        drawFallback(state);
        return false;
      }
      const tick = (now: number) => {
        frame = 0;
        if (!visible || document.hidden) return;
        if (playing && previous) {
          time += Math.min(now - previous, 100) * Number(speed.value);
          const end = scenario.timeline.length * stepDuration;
          if (time >= end) {
            if (loop.checked) time %= end;
            else {
              time = end;
              setPlaying(false);
            }
          }
        }
        previous = now;
        const settling = draw(now);
        if (playing || settling) request();
      };
      function request() {
        if (!frame && visible && !document.hidden)
          frame = requestAnimationFrame(tick);
      }
      function setPlaying(active: boolean) {
        if (active && time === scenario.timeline.length * stepDuration)
          time = 0;
        playing = active;
        previous = 0;
        play.textContent = playing ? "Pause" : "Play";
        request();
      }
      function move(value: number) {
        setPlaying(false);
        time = Math.max(
          0,
          Math.min(scenario.timeline.length * stepDuration, value),
        );
        draw();
        request();
      }
      async function changeView(active: boolean) {
        if (pending) return;
        if (active && !stage) {
          pending = true;
          view.disabled = true;
          try {
            const { createStage } = await import("./stage");
            if (controller.signal.aborted) return;
            stage = createStage(
              stageElement,
              get<HTMLCanvasElement>("canvas"),
              scenario,
              nodes,
              accent,
              request,
            );
          } catch {
            get("[data-mode]").textContent = "2D overview · WebGL unavailable";
          } finally {
            pending = false;
            view.disabled = false;
          }
        }
        enabled = active && !!stage;
        stageElement.classList.toggle("is-3d", enabled);
        view.textContent = enabled ? "2D" : "3D";
        view.setAttribute("aria-pressed", String(enabled));
        if (stage)
          get("[data-mode]").textContent = enabled
            ? "3D · Drag to orbit"
            : "2D overview";
        if (!enabled) nodes.forEach((node) => node.removeAttribute("style"));
        resized = true;
        request();
      }
      view.addEventListener("click", () => void changeView(!enabled), listener);
      play.addEventListener("click", () => setPlaying(!playing), listener);
      scrub.addEventListener(
        "input",
        () => move(Number(scrub.value)),
        listener,
      );
      get("[data-next]").addEventListener(
        "click",
        () => move((Math.floor(time / stepDuration) + 1) * stepDuration),
        listener,
      );
      get("[data-previous]").addEventListener(
        "click",
        () => move((Math.ceil(time / stepDuration) - 1) * stepDuration),
        listener,
      );
      focus.addEventListener("change", request, listener);
      this.addEventListener(
        "keydown",
        (event) => {
          if (event.target !== scrub) return;
          if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
            event.preventDefault();
            move(
              (Math.round(time / stepDuration) +
                (event.key === "ArrowRight" ? 1 : -1)) *
                stepDuration,
            );
          }
        },
        listener,
      );
      steps.forEach((step, index) =>
        step.addEventListener(
          "click",
          () => move(index * stepDuration),
          listener,
        ),
      );
      nodes.forEach((button) =>
        button.addEventListener(
          "click",
          () => {
            selected = scenario.components.find(
              (component) => component.id === button.dataset.node,
            );
            draw();
            request();
          },
          listener,
        ),
      );
      document.addEventListener(
        "visibilitychange",
        () => {
          previous = 0;
          request();
        },
        listener,
      );
      const watcher = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        previous = 0;
        if (visible) {
          if (
            shouldAutoload3D() &&
            !pending &&
            !stage &&
            !stageElement.dataset.initialized
          ) {
            stageElement.dataset.initialized = "true";
            void changeView(true);
          }
          request();
        }
      });
      watcher.observe(stageElement);
      const resizeObserver = new ResizeObserver(() => {
        resized = true;
        request();
      });
      resizeObserver.observe(stageElement);
      this.cleanup = () => {
        controller.abort();
        watcher.disconnect();
        resizeObserver.disconnect();
        cancelAnimationFrame(frame);
        stage?.dispose();
      };
      draw();
    }
  },
);
