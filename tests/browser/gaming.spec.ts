import { expect, test } from '@playwright/test';
import { readFileSync } from 'node:fs';
import type { Scene } from '../../src/gaming/data';

const gallery: Scene[] = JSON.parse(readFileSync(new URL('../../data/gaming/gallery.json', import.meta.url), 'utf8'));

const path = '/beyond-code/gaming-worlds/';
const picture = '<svg xmlns="http://www.w3.org/2000/svg" width="1600" height="900"><rect width="100%" height="100%" fill="navy"/></svg>';

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.fulfill({ contentType: 'image/svg+xml', body: picture }));
});

test('the header opens the gallery and the lightbox follows the active game', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('main').getByRole('heading', { name: 'Gaming Worlds' })).toHaveCount(0);
  const galleryLink = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Gaming Worlds' });
  await galleryLink.click();
  await expect(galleryLink).toHaveAttribute('aria-current', 'page');
  await expect(page).toHaveURL(new RegExp(path + '$'));
  await expect(page.getByRole('heading', { name: 'Gaming Worlds' })).toBeVisible();

  const gameName = 'Forza Horizon 6';
  const [first, second, ...remaining] = gallery.filter(scene => scene.game === gameName);
  await page.getByRole('button', { name: gameName, exact: true }).click();
  await expect(page.getByRole('button', { name: gameName, exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.gaming-game:visible')).toHaveCount(1);
  const opener = page.getByRole('link', { name: `View ${first.title}`, exact: true });
  await opener.click();

  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('heading')).toHaveText(first.title);
  await expect(dialog.getByRole('link', { name: 'View source' })).toHaveAttribute('href', first.source_url);
  await expect(dialog.locator('[data-slide-copyright]')).toHaveText(first.copyright);
  await page.keyboard.press('ArrowRight');
  await expect(dialog.getByRole('heading')).toHaveText(second.title);
  await dialog.getByRole('button', { name: 'Previous image' }).click();
  await dialog.getByRole('button', { name: 'Previous image' }).click();
  await expect(dialog.getByRole('heading')).toHaveText(remaining.at(-1)!.title);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(opener).toBeFocused();
  await page.getByRole('button', { name: 'All worlds' }).click();
  await expect(page.locator('.gaming-game:visible')).toHaveCount(3);
});

test('a missing image is logged and keeps its source on a 390px screen', async ({ page }) => {
  const broken = gallery[0];
  const faults: string[] = [];
  page.on('console', message => {
    if (message.type() === 'warning') faults.push(message.text());
  });
  await page.route(broken.image, route => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  const galleryLink = page.getByRole('navigation', { name: 'Main navigation' }).getByRole('link', { name: 'Gaming Worlds' });
  await expect(galleryLink).toBeInViewport({ ratio: 1 });
  await galleryLink.click();
  const hero = page.locator('.gaming-hero img');
  await expect(hero).toHaveAttribute('src', '/images/gaming/unavailable.svg');
  expect(faults.some(message => message.includes(broken.id) && message.includes(broken.image))).toBe(true);
  await expect(page.locator('.gaming-hero-scene')).toHaveAttribute('href', broken.source_url);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await expect(page.getByRole('button', { name: 'All worlds' })).toBeVisible();
  await page.locator('.gaming-hero-scene').click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.locator('[data-slide-image]')).toHaveAttribute('src', '/images/gaming/unavailable.svg');
  await dialog.getByRole('button', { name: 'Next image' }).click();
  await expect(dialog.getByRole('heading')).toHaveText(gallery[1].title);
  await expect(dialog.locator('[data-slide-image]')).toHaveAttribute('src', gallery[1].image);
  await dialog.getByRole('button', { name: 'Close image' }).click();
  await expect(dialog).toBeHidden();
});
