import { defineConfig } from 'astro/config';
import { unified } from '@astrojs/markdown-remark';
import mdx from '@astrojs/mdx';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
export default defineConfig({
  site: 'https://hongzhi-gao.github.io',
  redirects: { '/projects/mooncake-store': '/projects/mooncake/' },
  integrations: [mdx()],
  markdown: { processor: unified({ remarkPlugins: [remarkMath], rehypePlugins: [rehypeKatex] }), shikiConfig: { theme: 'github-dark' } },
  vite: { json: { stringify: true } }
});
