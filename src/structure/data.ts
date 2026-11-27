import { z } from "zod";
import { projects } from "../architecture-ir/data";
import type { Project } from "../architecture-ir/schema";

const rect = z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]);
const point = z.tuple([z.number(), z.number()]);
const shapes = z.enum(["interface", "service", "map", "queue", "tree", "cluster", "log", "memory", "merge", "levels", "file"]);
const graphSchema = z.object({
  version: z.literal(1),
  id: z.string(),
  width: z.number().positive(),
  height: z.number().positive(),
  overview: z.string(),
  pins: z.array(z.string()).min(1),
  groups: z.array(z.object({id:z.string(), title:z.string(), note:z.string(), rect, parent:z.string().optional(), ecosystem:z.boolean().optional()})),
  nodes: z.array(z.object({id:z.string(), label:z.string(), caption:z.string(), shape:shapes, group:z.string(), rect, evidence:z.array(z.string()).min(1), detail:z.string(), fields:z.array(z.string()), proposal:z.boolean().optional()})),
  edges: z.array(z.object({id:z.string(), from:z.string(), to:z.string(), kind:z.enum(["control","data","replica","storage","ecosystem"]), label:z.string(), via:z.array(point)})),
  tracks: z.array(z.object({id:z.string(), label:z.string(), edges:z.array(z.string()).min(1)})),
  contributions: z.record(z.string(), z.array(z.string()).min(1)),
  modules: z.record(z.string(), z.array(z.string()).min(1)),
});
export type Graph = z.infer<typeof graphSchema>;
export type GraphNode = Graph["nodes"][number];
type Point = z.infer<typeof point>;
type Rect = z.infer<typeof rect>;
const contains = (outer: Rect, inner: Rect) => inner[0]>=outer[0] && inner[1]>=outer[1] &&
  inner[0]+inner[2]<=outer[0]+outer[2] && inner[1]+inner[3]<=outer[1]+outer[3];

export function validateGraph(input: unknown, project: Project): Graph {
  const graph = graphSchema.parse(input);
  const invariant = (valid: unknown, message: string) => {
    if (!valid) throw new Error(`${graph.id}: ${message}`);
  };
  const index = <T extends {id:string}>(items:T[]) => {
    const map = new Map(items.map(item => [item.id,item]));
    invariant(map.size === items.length, "Duplicate graph ID");
    return map;
  };
  const groups = index(graph.groups);
  const nodes = index(graph.nodes);
  const edges = index(graph.edges);
  index(graph.tracks);
  invariant(graph.id === project.id, "Unregistered project");
  for (const group of graph.groups) {
    const parent = group.parent && groups.get(group.parent);
    invariant(contains([0,0,graph.width,graph.height],group.rect), `Boundary outside canvas: ${group.id}`);
    invariant(!group.parent || (parent && parent.id !== group.id && contains(parent.rect,group.rect)), `Invalid parent: ${group.id}`);
  }
  const evidence = new Set(project.evidence.map(item=>item.id));
  invariant(graph.pins.every(id=>evidence.has(id)), "Unknown snapshot pin");
  for (const node of graph.nodes) {
    const group = groups.get(node.group);
    invariant(group && contains(group.rect,node.rect), `Node outside boundary: ${node.id}`);
    invariant(node.evidence.every(id=>evidence.has(id)), `Unknown source for ${node.id}`);
  }
  for (const edge of graph.edges) invariant(nodes.has(edge.from)&&nodes.has(edge.to)&&edge.from!==edge.to,`Invalid path: ${edge.id}`);
  for (const track of graph.tracks) invariant(track.edges.every(id=>edges.has(id)),`Unknown path in ${track.id}`);
  for (const [entry, ids] of Object.entries(graph.contributions)) {
    invariant(project.contributions.some(item=>item.id===entry) && ids.every(id=>nodes.has(id)), `Invalid contribution mapping: ${entry}`);
  }
  for (const [module,ids] of Object.entries(graph.modules)) {
    invariant(project.modules.some(item=>item.id===module)&&ids.every(id=>nodes.has(id)),`Invalid module mapping: ${module}`);
  }
  return graph;
}

const files = import.meta.glob("../../architecture/*.json", {eager:true,import:"default"});
export const graphs = projects.flatMap(project => {
  const data = files[`../../architecture/${project.id}.json`];
  return data ? [validateGraph(data,project)] : [];
});
export const graphFor = (id:string) => graphs.find(graph=>graph.id===id);

const center = ([x,y,w,h]:Rect):Point => [x+w/2,y+h/2];
function port(rect:Rect, towards:Point):Point {
  const [x,y] = center(rect);
  const dx=towards[0]-x, dy=towards[1]-y;
  if (!dx && !dy) return [x,y];
  const ratio = Math.min(dx ? rect[2]/2/Math.abs(dx):Infinity,dy ? rect[3]/2/Math.abs(dy):Infinity);
  return [x+dx*ratio,y+dy*ratio];
}
export function route(edge:Graph["edges"][number],nodes:Map<string,GraphNode>) {
  const a=nodes.get(edge.from)!.rect,b=nodes.get(edge.to)!.rect;
  const points=[port(a,edge.via[0]??center(b)),...edge.via,port(b,edge.via.at(-1)??center(a))];
  const location = (point:Point) => point.map(value=>value.toFixed(1)).join(" ");
  return "M"+points.map(location).join(" L");
}
