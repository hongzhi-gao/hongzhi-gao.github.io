import rss from '@astrojs/rss';
import {getCollection} from 'astro:content';
import type {APIContext} from 'astro';
export async function GET(context:APIContext){
  const posts=await getCollection('posts',({data})=>!data.draft);
  return rss({title:'Engineering notes · Hongzhi Gao',description:'Distributed storage, databases and caching',site:context.site!,items:posts.map(post=>({title:post.data.title,description:post.data.description,pubDate:post.data.date,link:`/blog/${post.id}/`}))});
}
