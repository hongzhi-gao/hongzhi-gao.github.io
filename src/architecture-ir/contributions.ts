import rawDiscovery from "../../config/discovery.json";
import type { Discovery } from "../../automation/sync";
import type { Project } from "./schema";
const discovery = rawDiscovery as Discovery;
export const publicActivity = discovery.records;

export function contributionEntries(project: Project) {
  return project.contributions.map((entry) => {
    const latest = publicActivity.find(
      (item) => item.key === `${entry.repository}:pull:${entry.number}`,
    );
    const state = latest?.status;
    const status =
      state === "merged" || state === "closed" || state === "open"
        ? state
        : entry.status;
    return { ...entry, status };
  });
}
export function moduleActivity(project: Project, module: string) {
  return publicActivity.filter(
    (entry) => entry.module === module && project.repos.includes(entry.repo),
  );
}

const impactRank = { architecture: 3, correctness: 2, maintenance: 1 };
export function featuredContributions(project: Project) {
  return contributionEntries(project)
    .sort(
      (first, second) =>
        impactRank[second.impact] - impactRank[first.impact] ||
        second.date.localeCompare(first.date) ||
        first.id.localeCompare(second.id),
    )
    .slice(0, 2);
}
