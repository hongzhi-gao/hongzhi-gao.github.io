import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import settings from '../config/automation.json';
import profile from '../config/profile.json';
import registration from '../config/projects.json';
import { z } from 'zod';
import { publicFetch } from './http';
import { validateProject } from '../src/architecture-ir/validate';

const recordSchema=z.object({key:z.string(),repo:z.string(),title:z.string(),date:z.string(),status:z.string(),role:z.string(),url:z.url(),module:z.string().nullable()}).strict();
export const candidateSchema=z.object({id:z.string(),project:z.string().regex(/^[a-z0-9-]+$/),repo:z.string().regex(/^[\w.-]+\/[\w.-]+$/),base:z.string().regex(/^[a-f0-9]{40}$/),head:z.string().regex(/^[a-f0-9]{40}$/),number:z.number().int().positive().optional(),kind:z.enum(['architecture','high-risk']),paths:z.array(z.string())}).strict();
export const discoverySchema=z.object({version:z.literal(1),repositories:z.record(z.string(),z.object({head:z.string(),scannedAt:z.string()})),records:z.array(recordSchema),pending:z.array(candidateSchema),processed:z.array(z.string()).default([])}).strict();
export type Discovery=z.infer<typeof discoverySchema>;
export type Candidate=z.infer<typeof candidateSchema>;
type RecordItem=z.infer<typeof recordSchema>;
type FileChange={filename:string;patch?:string;status:string};
type Login={login:string};
type SearchHit={number:number;title:string;html_url:string;created_at:string;updated_at:string;state:string;user:Login;pull_request?:{merged_at:string|null}};
type Pull={number:number;title:string;html_url:string;created_at:string;merged_at:string|null;state:string;base:{sha:string};head:{sha:string};merge_commit_sha:string|null};
type Checkpoint=Discovery['repositories'][string];
type Repo=typeof registration[number]['repositories'][number];
type Review={id:number;user:Login;submitted_at:string;html_url:string};
type Commit={sha:string;html_url:string;author:Login|null;commit:{message:string;author:{date:string}}};
type Compare={status:string;files?:FileChange[];total_commits:number};
type CommitParents={parents:{sha:string}[]};
type Fixture={repositories:Discovery['repositories'];records:RecordItem[];pending:Candidate[]};
export const readDiscovery=async()=>discoverySchema.parse(JSON.parse(await readFile('config/discovery.json','utf8')));
const matchPath=(path:string,prefix:string)=>path===prefix || path.startsWith(prefix+'/');
const sortNewest=(a:RecordItem,b:RecordItem)=>b.date.localeCompare(a.date)||a.key.localeCompare(b.key);
const byKey=<T>(previous:T[],incoming:T[],key:(entry:T)=>string)=>[...new Map([...previous,...incoming].map(entry=>[key(entry),entry])).values()];
const highRisk=/consensus|replica|metadata|lifecycle|recover|snapshot|wal|lease/i;
const documentation=/([/\\]test[s]?[/\\]|^docs[/\\]|\.mdx?$|\.yml$)/i;
const candidate=(project:string,repo:string,base:string,head:string,changed:FileChange[],paths:string[],number?:number):Candidate|undefined=>{
  const inspected=changed.filter(file=>paths.some(prefix=>matchPath(file.filename,prefix))&&!documentation.test(file.filename));
  if(!inspected.length||base===head)return;
  return {id:`${repo}:${number??head}`,project,repo,base,head,number,kind:inspected.some(file=>file.status==='removed'||highRisk.test(file.filename))?'high-risk':'architecture',paths:inspected.slice(0,40).map(file=>file.filename).sort()};
};
export function updateDiscovery(previous:Discovery,incoming:Fixture):Discovery{
  return discoverySchema.parse({version:1,repositories:{...previous.repositories,...incoming.repositories},
    records:byKey(previous.records,incoming.records,item=>item.key).sort(sortNewest),
    pending:byKey(previous.pending,incoming.pending,item=>item.id).filter(item=>!previous.processed.includes(item.id)).sort((a,b)=>a.id.localeCompare(b.id)),
    processed:previous.processed
  });
}
class GitHub {
  constructor(private token:string){}
  async request<T>(path:string){
    const headers={authorization:`Bearer ${this.token}`,accept:'application/vnd.github+json','x-github-api-version':'2022-11-28'};
    const response=await publicFetch(`https://api.github.com/${path}`,{headers});
    if(!response.ok)throw new Error(`GitHub ${response.status} for ${path}`);
    return {value:await response.json() as T,more:response.headers.get('link')?.includes('rel="next"')??false};
  }
  async pages<T>(path:string){
    const items:T[]=[];
    for(let page=1;page<=settings.pageLimit;page++){
      const join=path.includes('?')?'&':'?';
      const result=await this.request<T[]|{items:T[];incomplete_results:boolean;total_count:number}>(`${path}${join}per_page=100&page=${page}`);
      if(!Array.isArray(result.value)&&(result.value.incomplete_results||result.value.total_count>1000))throw new Error(`Incomplete search window: ${path}`);
      items.push(...(Array.isArray(result.value)?result.value:result.value.items));
      if(!result.more)return items;
    }
    throw new Error(`Page budget exceeded: ${path}`);
  }
}
async function scanRepo(api:GitHub,project:string,registered:Repo,previous:Checkpoint|undefined,now:string,modules:Record<string,string>){
  const {repo,paths}=registered;
  const prefix=`repos/${repo}`;
  const since=new Date(previous?Date.parse(previous.scannedAt)-60*60*1000:Date.parse(now)-settings.initialLookbackDays*86400000).toISOString();
  const github=profile.github;
  const records:RecordItem[]=[];
  const candidates:Candidate[]=[];
  const lookupModule=(files:FileChange[])=>{
    const ranked=files.map(file=>Object.entries(modules).filter(([prefix])=>matchPath(file.filename,prefix)).sort((a,b)=>b[0].length-a[0].length)[0]?.[1]).filter(Boolean);
    const distinct=[...new Set(ranked)];
    return distinct.length===1?distinct[0]:null;
  };
  const authorQuery=`repo:${repo} author:${github} updated:${since}..${now}`;
  const reviewerQuery=`repo:${repo} is:pr reviewed-by:${github} updated:${since}..${now}`;
  const search=(query:string)=>`search/issues?q=${encodeURIComponent(query)}&sort=updated&order=asc`;
  const [authors,reviewed,head,commits]=await Promise.all([
    api.pages<SearchHit>(search(authorQuery)),api.pages<SearchHit>(search(reviewerQuery)),api.request<{sha:string}>(`${prefix}/commits/HEAD`),
    api.pages<Commit>(`${prefix}/commits?author=${encodeURIComponent(github)}&since=${encodeURIComponent(since)}&until=${encodeURIComponent(now)}`)
  ]);
  for(const hit of authors){
    if(hit.user.login.toLowerCase()!==github.toLowerCase())continue;
    const key=`${repo}:${hit.pull_request?'pull':'issue'}:${hit.number}`;
    const basic={key,repo,title:hit.title,date:hit.created_at,url:hit.html_url,role:hit.title.toLowerCase().includes('rfc')?'design-contributor':'author'};
    if(!hit.pull_request){records.push({...basic,status:hit.state,module:null});continue}
    const [{value:pr},files]=await Promise.all([api.request<Pull>(`${prefix}/pulls/${hit.number}`),api.pages<FileChange>(`${prefix}/pulls/${hit.number}/files`)]);
    records.push({...basic,status:pr.merged_at?'merged':pr.state,module:lookupModule(files)});
    if(pr.merged_at&&pr.merge_commit_sha){
      const {value:merge}=await api.request<CommitParents>(`${prefix}/commits/${pr.merge_commit_sha}`);
      const baseline=merge.parents[0]?.sha;
      const change=baseline&&candidate(project,repo,baseline,pr.merge_commit_sha,files,paths,pr.number);
      if(change)candidates.push(change);
    }
  }
  for(const hit of reviewed){
    const reviews=await api.pages<Review>(`${prefix}/pulls/${hit.number}/reviews`);
    for(const review of reviews.filter(item=>item.user.login.toLowerCase()===github.toLowerCase()&&item.submitted_at>=since&&item.submitted_at<=now)){
      records.push({key:`${repo}:review:${review.id}`,repo,title:hit.title,date:review.submitted_at,url:review.html_url,role:'reviewer',status:'reviewed',module:null});
    }
  }
  for(const commit of commits.filter(item=>item.author?.login.toLowerCase()===github.toLowerCase())){
    records.push({key:`${repo}:commit:${commit.sha}`,repo,title:commit.commit.message.split('\n')[0],date:commit.commit.author.date,url:commit.html_url,role:'author',status:'committed',module:null});
  }
  if(previous&&previous.head!==head.value.sha){
    const {value:diff}=await api.request<Compare>(`${prefix}/compare/${previous.head}...${head.value.sha}?per_page=1`);
    if(!diff.files||diff.files.length>=300||diff.status!=='ahead'){
      candidates.push({id:`${repo}:${head.value.sha}`,project,repo,base:previous.head,head:head.value.sha,kind:'high-risk',paths:[]});
    }else{
      const change=candidate(project,repo,previous.head,head.value.sha,diff.files,paths);
      if(change)candidates.push(change);
    }
  }
  return {records,candidates,checkpoint:{head:head.value.sha,scannedAt:now}};
}
export async function sync(fixture?:Fixture){
  const previous=await readDiscovery();
  if(fixture)return updateDiscovery(previous,fixture);
  if(!settings.enabled||!profile.verified)throw new Error('Automatic sync is disabled or identity is unverified');
  if(!process.env.GH_TOKEN)throw new Error('GH_TOKEN is required for the GitHub rate limit');
  const github=new GitHub(process.env.GH_TOKEN);
  const now=new Date().toISOString();
  const incoming:Fixture={repositories:{},records:[],pending:[]};
  for(const project of registration){
    const architecture=validateProject(JSON.parse(await readFile(`projects/${project.id}.json`,'utf8')));
    for(const definition of project.repositories){
      const checkpoint=previous.repositories[definition.repo];
      if(checkpoint&&Date.parse(now)-Date.parse(checkpoint.scannedAt)<settings.minimumHours*3600000&&!process.argv.includes('--force'))continue;
      const rules='modulePaths' in definition?definition.modulePaths as Record<string,string>:{};
      const merged=await scanRepo(github,project.id,definition,checkpoint,now,rules);
      incoming.repositories[definition.repo]=merged.checkpoint;
      incoming.records.push(...merged.records);
      const known=new Set(architecture.contributions.filter(item=>item.status==='merged').map(item=>`${item.repository}:${item.number}`));
      incoming.pending.push(...merged.candidates.filter(item=>!known.has(item.id)));
    }
  }
  return updateDiscovery(previous,incoming);
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const dry=process.argv.includes('--dry-run');
  const fixtureName=process.argv[process.argv.indexOf('--fixture')+1];
  const fixture=process.argv.includes('--fixture')?JSON.parse(await readFile(fixtureName,'utf8')):undefined;
  const updated=await sync(fixture);
  const validUrls=updated.records.every(entry=>new URL(entry.url).origin==='https://github.com'&&new URL(entry.url).pathname.toLowerCase().startsWith('/'+entry.repo.toLowerCase()+'/'));
  if(!validUrls)throw new Error('Contribution links must be public GitHub URLs under their registered repository');
  const serialized=JSON.stringify(updated,null,2)+'\n';
  if(!dry)await writeFile('config/discovery.json',serialized);
  console.log(`${dry?'Dry run · ':''}${updated.records.length} evidence records, ${updated.pending.length} queued architecture candidates`);
}
