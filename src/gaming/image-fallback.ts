const fallback = '/images/gaming/unavailable.svg';

function showFallback(image: HTMLImageElement) {
  if (image.dataset.unavailable || !image.getAttribute('src')) return;
  console.warn('[Gaming Worlds] Image unavailable:', image.dataset.gamingImage, image.currentSrc || image.src);
  image.dataset.unavailable = 'true';
  image.alt = 'Image unavailable';
  image.src = fallback;
}

document.addEventListener('error', event => {
  const image = event.target;
  if (image instanceof HTMLImageElement && image.hasAttribute('data-gaming-image')) showFallback(image);
}, true);

for (const image of document.querySelectorAll<HTMLImageElement>('img[data-gaming-image]')) {
  if (image.complete && !image.naturalWidth) showFallback(image);
}
