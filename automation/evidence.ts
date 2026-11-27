import { readdir,readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { publicFetch } from './http';
import { validateProject } from '../src/architecture-ir/validate';
import type { Evidence,Project } from '../src/architecture-ir/schema';
export async function rawEvidence(evidence:Evidence,timeout=15000):Promise<string>{
  const path=evidence.path.split('/').map(encodeURIComponent).join('/');
  const url=`https://raw.githubusercontent.com/${evidence.repo}/${evidence.sha}/${path}`;
  const response=await publicFetch(url,{},timeout);
  if(!response.ok)throw new Error(`${response.status} ${url}`);
  const source=await response.text();
  if(evidence.lines&&source.split('\n').length<evidence.lines[1])throw new Error(`Source lines exceed file size: ${url}`);
  return source;
}
export async function verifyEvidence(projects:Project[]){
  const queue=projects.flatMap(project=>project.evidence);
  const workers=Array.from({length:Math.min(6,queue.length)},async()=>{
    for(let source=queue.pop();source;source=queue.pop())await rawEvidence(source);
  });
  await Promise.all(workers);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const files=(await readdir('projects')).filter(file=>file.endsWith('.json'));
  const projects=await Promise.all(files.map(async file=>validateProject(JSON.parse(await readFile(`projects/${file}`,'utf8')))));
  await verifyEvidence(projects);
  console.log(`Verified ${projects.reduce((count,project)=>count+project.evidence.length,0)} immutable file references across ${projects.length} projects`);
}
