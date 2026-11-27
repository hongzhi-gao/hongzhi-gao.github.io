import { getCollection } from 'astro:content';
import type { APIContext } from 'astro';
import { exhibits, projects } from '../architecture-ir/data';
export async function GET(context:APIContext){
  const posts=await getCollection('posts',({data})=>!data.draft);
  const paths=['/','/lab/','/contributions/','/evolution/','/blog/',...exhibits.map(({scenario})=>`/lab/${scenario.id}/`),...projects.map(project=>`/projects/${project.id}/`),...posts.map(post=>`/blog/${post.id}/`)];
  const urls=paths.map(path=>`<url><loc>${new URL(path,context.site).href.replaceAll('&','&amp;')}</loc></url>`).join('');
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`,{headers:{'content-type':'application/xml; charset=utf-8'}});
}
