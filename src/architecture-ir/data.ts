import { validateProject } from './validate';
import type { Evidence } from './schema';
const files = import.meta.glob('../../projects/*.json', { eager: true, import: 'default' });
export const projects = Object.values(files).map(validateProject).sort((first, second) => first.id.localeCompare(second.id));
export const exhibits = projects.flatMap(project => project.scenarios.map(scenario => ({project, scenario})));
export function sourceUrl(source: Evidence) {
  const path = source.path.split('/').map(encodeURIComponent).join('/');
  const lines = source.lines ? `#L${source.lines[0]}-L${source.lines[1]}` : '';
  return `https://github.com/${source.repo}/blob/${source.sha}/${path}${lines}`;
}
