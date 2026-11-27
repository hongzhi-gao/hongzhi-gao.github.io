import { z } from 'zod';
import catalog from '../../data/gaming/gallery.json';

const httpsUrl = z.url({ protocol: /^https$/ });
const imageLocation = z.union([httpsUrl, z.string().regex(/^\/images\/gaming\/[\w.-]+\.(?:avif|webp|jpe?g|png)$/i)]);
const sceneSchema = z.object({
  id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  game: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  image: imageLocation,
  preview: imageLocation.optional(),
  source_url: httpsUrl,
  copyright: z.string().min(1),
  aspect_ratio: z.string().regex(/^[1-9]\d*:[1-9]\d*$/),
});

export const galleryPath = '/beyond-code/gaming-worlds/';
export const gallery = z.array(sceneSchema).min(1).parse(catalog);
export type Scene = z.infer<typeof sceneSchema>;

if (new Set(gallery.map(scene => scene.id)).size !== gallery.length) {
  throw new Error('Gaming Worlds scene IDs must be unique.');
}

export const heroScene = gallery[0];
export const gameGroups = new Map<string, Scene[]>();
for (const scene of gallery) {
  const group = gameGroups.get(scene.game) ?? [];
  group.push(scene);
  gameGroups.set(scene.game, group);
}
