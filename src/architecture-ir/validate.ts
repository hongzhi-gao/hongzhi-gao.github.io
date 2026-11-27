import { projectSchema } from "./schema";
import type { Project } from "./schema";

export function validateProject(input: unknown): Project {
  const project = projectSchema.parse(input);
  const check = (value: unknown, message: string) => {
    if (!value) throw new Error(`${project.id}: ${message}`);
  };
  function index<T extends { id: string }>(items: T[]) {
    const indexed = new Map(items.map((item) => [item.id, item]));
    check(indexed.size === items.length, "Duplicate identifiers");
    return indexed;
  }
  const evidence = index(project.evidence);
  const modules = index(project.modules);
  const versions = index(project.versions);
  const scenarios = index(project.scenarios);
  const contributions = index(project.contributions);
  const references = (ids: string[]) =>
    ids.forEach((id) => check(evidence.has(id), `Missing evidence ${id}`));
  for (const source of evidence.values()) {
    check(
      project.repos.includes(source.repo),
      `Evidence outside registered repository: ${source.repo}`,
    );
    check(
      !source.path
        .split("/")
        .some(
          (part) =>
            !part || part === "." || part === ".." || part.includes("\\"),
        ),
      `Invalid evidence path ${source.path}`,
    );
    check(
      !source.lines || source.lines[0] <= source.lines[1],
      `Reversed source lines: ${source.id}`,
    );
  }
  for (const version of versions.values()) {
    check(
      project.repos.includes(version.repo),
      `Version outside registered repository: ${version.repo}`,
    );
    check(
      scenarios.get(version.scenario)?.version === version.id,
      `Invalid version scenario ${version.scenario}`,
    );
    check(
      !version.compareWith ||
        (versions.has(version.compareWith) &&
          version.compareWith !== version.id),
      `Invalid comparison ${version.id}`,
    );
  }
  for (const module of modules.values())
    module.scenarios.forEach((id) =>
      check(scenarios.has(id), `Unknown module scenario ${id}`),
    );
  for (const entry of contributions.values()) {
    check(
      project.repos.includes(entry.repository) &&
        modules.has(entry.module) &&
        scenarios.has(entry.scenario),
      `Broken contribution ${entry.id}`,
    );
    references(entry.evidence);
  }
  for (const scenario of scenarios.values()) {
    const version = versions.get(scenario.version);
    const components = index(scenario.components);
    check(
      version &&
        (!scenario.contribution || contributions.has(scenario.contribution)),
      `Unlinked scenario ${scenario.id}`,
    );
    check(
      [...modules.values()].some((module) =>
        module.scenarios.includes(scenario.id),
      ),
      `Unlisted scenario ${scenario.id}`,
    );
    for (const component of components.values()) {
      const parent = component.parent && components.get(component.parent);
      check(
        !component.parent || (parent && parent.level < component.level),
        `Invalid parent for ${component.id}`,
      );
      check(
        !component.jump || scenarios.has(component.jump),
        `Unknown drill-down ${component.jump}`,
      );
      references(component.evidence);
    }
    for (const relation of scenario.relationships)
      check(
        components.has(relation.from) && components.has(relation.to),
        "Unknown relationship endpoint",
      );
    const states = new Map(
      scenario.components.map((component) => [
        component.id,
        component.stateMachine?.initial,
      ]),
    );
    for (const event of scenario.timeline) {
      const component = components.get(event.target);
      check(
        component && (!event.from || components.has(event.from)),
        `Unknown event endpoint ${event.target}`,
      );
      references(event.evidence);
      const current = states.get(event.target);
      if (component?.stateMachine && current && current !== event.state) {
        check(
          component.stateMachine.transitions[current]?.includes(event.state),
          `Invalid transition ${current} to ${event.state}`,
        );
      }
      states.set(event.target, event.state);
    }
    for (const frame of scenario.cameraTrack)
      check(
        frame.step <= scenario.timeline.length && components.has(frame.target),
        "Invalid camera frame",
      );
    check(
      scenario.timeline.some((event) =>
        event.evidence.some((id) => evidence.get(id)?.sha === version?.sha),
      ),
      `No matching snapshot evidence for ${scenario.id}`,
    );
  }
  return project;
}
