const gallery = document.querySelector<HTMLElement>('[data-gaming-gallery]')!;
const filters = gallery.querySelector<HTMLElement>('[data-gaming-filters]')!;
const groups = Array.from(gallery.querySelectorAll<HTMLElement>('[data-game]'));
const dialog = gallery.querySelector('dialog')!;
const image = dialog.querySelector<HTMLImageElement>('[data-slide-image]')!;
const title = dialog.querySelector<HTMLElement>('#gaming-slide-title')!;
const game = dialog.querySelector<HTMLElement>('[data-slide-game]')!;
const source = dialog.querySelector<HTMLAnchorElement>('[data-slide-source]')!;
const copyright = dialog.querySelector<HTMLElement>('[data-slide-copyright]')!;
const count = dialog.querySelector<HTMLElement>('[data-slide-count]')!;
const steps = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-slide-step]'));
const scenes = groups.flatMap(group => Array.from(group.querySelectorAll<HTMLElement>('[data-scene]')).map(frame => {
  return {
    id: frame.dataset.scene!,
    game: group.dataset.game!,
    title: frame.querySelector('figcaption > span')!.textContent!,
    image: frame.dataset.fullImage!,
    alt: frame.dataset.description!,
    source: frame.querySelector('a')!.href,
    copyright: frame.dataset.copyright!,
  };
}));
let visibleScenes = scenes;
let activeScenes = scenes;
let current = 0;

function renderScene(index: number) {
  current = (index + activeScenes.length) % activeScenes.length;
  const scene = activeScenes[current];
  delete image.dataset.unavailable;
  image.dataset.gamingImage = scene.id;
  image.alt = scene.alt;
  image.dataset.loading = 'true';
  image.src = scene.image;
  if (image.complete && image.naturalWidth) delete image.dataset.loading;
  title.textContent = scene.title;
  game.textContent = scene.game;
  source.href = scene.source;
  copyright.textContent = scene.copyright;
  count.textContent = `${current + 1} / ${activeScenes.length}`;
  for (const step of steps) step.disabled = activeScenes.length < 2;
}

image.addEventListener('load', () => { delete image.dataset.loading; });

filters.hidden = false;
filters.addEventListener('click', event => {
  const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-game-filter]');
  if (!button) return;
  const selected = button.dataset.gameFilter;
  for (const filter of filters.querySelectorAll('button')) filter.setAttribute('aria-pressed', String(filter === button));
  for (const group of groups) group.hidden = Boolean(selected && group.dataset.game !== selected);
  visibleScenes = scenes.filter(scene => !selected || scene.game === selected);
});

gallery.addEventListener('click', event => {
  if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const opener = (event.target as HTMLElement).closest<HTMLAnchorElement>('[data-open-scene]');
  if (!opener || !dialog.showModal) return;
  const id = opener.dataset.openScene;
  activeScenes = visibleScenes.some(scene => scene.id === id) ? visibleScenes : scenes;
  const index = activeScenes.findIndex(scene => scene.id === id);
  if (index < 0) return;
  event.preventDefault();
  renderScene(index);
  dialog.showModal();
});

dialog.querySelector('[data-slide-close]')!.addEventListener('click', () => dialog.close());
for (const step of steps) step.addEventListener('click', () => renderScene(current + Number(step.dataset.slideStep)));
dialog.addEventListener('click', event => {
  if (event.target === dialog) dialog.close();
});
dialog.addEventListener('keydown', event => {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
  event.preventDefault();
  if (activeScenes.length > 1) renderScene(current + (event.key === 'ArrowLeft' ? -1 : 1));
});
