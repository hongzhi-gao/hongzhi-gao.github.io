import type { Scenario } from "../architecture-ir/schema";
export const stepDuration = 2200;

export function replay(scenario: Scenario, time: number) {
  const end = scenario.timeline.length * stepDuration;
  const elapsed = Math.max(0, Math.min(time, end));
  const completed = Math.min(
    Math.floor(elapsed / stepDuration),
    scenario.timeline.length,
  );
  const states = Object.fromEntries(
    scenario.components.map((component) => [
      component.id,
      {
        state: component.stateMachine?.initial ?? "ready",
        progress: 0,
        visible: true,
      },
    ]),
  );
  for (const event of scenario.timeline.slice(0, completed)) {
    const previous = states[event.target];
    states[event.target] = {
      state: event.state,
      progress: event.progress ?? previous.progress,
      visible:
        event.type === "destroy"
          ? false
          : event.type === "create" || previous.visible,
    };
  }
  const active = scenario.timeline[completed];
  const event = active ?? scenario.timeline.at(-1);
  return {
    elapsed,
    end,
    completed,
    states,
    event,
    active,
    fraction: active ? (elapsed % stepDuration) / stepDuration : 1,
  };
}
