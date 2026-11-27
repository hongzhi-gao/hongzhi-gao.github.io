import { readFile } from 'node:fs/promises';
const {pending}=JSON.parse(await readFile('config/discovery.json','utf8'));
console.log('# Architecture candidates\n\nEach public change below requires source review before an architecture scenario can be published.');
if(!process.argv.includes('--has-model'))console.log('\nThe hosted model key is unavailable. This branch records evidence for review.');
console.log('');
for(const {repo,base,head} of pending){
  console.log(`- [${repo} · ${head.slice(0,12)}](https://github.com/${repo}/compare/${base}...${head})`);
}
