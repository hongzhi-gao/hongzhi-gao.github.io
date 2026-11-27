import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { validateProject } from '../src/architecture-ir/validate';
import { replay,stepDuration } from '../src/engine/replay';
import { discoverySchema,updateDiscovery } from '../automation/sync';

const load=(id:string)=>JSON.parse(readFileSync(`projects/${id}.json`,'utf8'));
test('source pins and scenario relationships validate for both project tracks',()=>{
  for(const id of ['iotdb-tsfile','mooncake-store'])assert.equal(validateProject(load(id)).id,id);
  const invalid=load('iotdb-tsfile');
  invalid.scenarios[0].timeline[0].evidence=['missing-ref'];
  assert.throws(()=>validateProject(invalid),/Missing evidence/);
  invalid.scenarios[0].timeline[0].evidence=['config'];
  invalid.scenarios[0].timeline[0].target='missing-node';
  assert.throws(()=>validateProject(invalid),/Unknown event endpoint/);
});
test('seek, rewind and end restore a deterministic replica stage',()=>{
  const scenario=validateProject(load('mooncake-store')).scenarios.find(item=>item.id==='object-replica-sync')!;
  const commit=stepDuration*6;
  assert.equal(replay(scenario,commit).states.object.state,'readable');
  assert.equal(replay(scenario,stepDuration*3).states.object.state,'uploaded');
  assert.equal(replay(scenario,0).states.object.state,'ready');
  assert.equal(replay(scenario,Infinity).states.object.state,'reclaimed');
  assert.deepEqual(replay(scenario,commit),replay(scenario,commit));
});
test('incremental replay updates an existing record and ignores a processed candidate on rerun',()=>{
  const prior=discoverySchema.parse({version:1,repositories:{},records:[{key:'apache/iotdb:pull:19268',repo:'apache/iotdb',title:'WAL retention',date:'2026-11-17',status:'open',role:'author',url:'https://github.com/apache/iotdb/pull/19268',module:null}],pending:[],processed:['apache/iotdb:19268']});
  const input={records:[{...prior.records[0],status:'merged',module:'iotconsensus-v1'}],repositories:{'apache/iotdb':{head:'a'.repeat(40),scannedAt:'2026-11-18T00:00:00Z'}},pending:[{id:'apache/iotdb:19268',project:'iotdb-tsfile',repo:'apache/iotdb',base:'a'.repeat(40),head:'b'.repeat(40),number:19268,kind:'high-risk' as const,paths:[]}]};
  const actual=updateDiscovery(prior,input);
  assert.equal(actual.records[0].status,'merged');
  assert.equal(actual.records[0].module,'iotconsensus-v1');
  assert.equal(actual.pending.length,0);
  assert.deepEqual(updateDiscovery(actual,input),actual);
});
