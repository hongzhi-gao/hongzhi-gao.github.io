import { z } from "zod";

const id = z.string().regex(/^[a-z0-9-]+$/);
const repo = z.string().regex(/^[\w.-]+\/[\w.-]+$/);
const sha = z.string().regex(/^[a-f0-9]{40}$/);
const position = z.tuple([z.number(), z.number(), z.number()]);
export const componentKinds = [
  "ServerNode",
  "Client",
  "Master",
  "Worker",
  "Peer",
  "ConsensusGroup",
  "NetworkLink",
  "RPC",
  "DataPacket",
  "DataStream",
  "MemoryPool",
  "MemoryBlock",
  "Segment",
  "Replica",
  "StorageTier",
  "SSD",
  "ObjectStorage",
  "File",
  "WAL",
  "MemTable",
  "Compaction",
  "HashTable",
  "Index",
  "Queue",
  "ThreadPool",
  "Lock",
  "StateMachine",
  "Metadata",
  "Object",
  "FileSection",
  "Chunk",
  "Page",
  "GPU",
  "Tensor",
  "KVCache",
  "CacheBlock",
  "InferenceWorker",
  "TransferEngine",
] as const;
export const eventKinds = [
  "rpc",
  "transfer",
  "create",
  "destroy",
  "allocate",
  "release",
  "replica",
  "state",
  "lock",
  "unlock",
  "concurrent",
  "log",
  "progress",
  "flush",
  "compaction",
  "failure",
  "retry",
  "recovery",
  "reclamation",
] as const;
const evidence = z
  .object({
    id,
    repo,
    sha,
    path: z.string().min(1),
    lines: z
      .tuple([z.number().int().positive(), z.number().int().positive()])
      .optional(),
    label: z.string().min(1),
  })
  .strict();
const component = z
  .object({
    id,
    kind: z.enum(componentKinds),
    label: z.string().min(1),
    description: z.string().min(1),
    position,
    initialPosition: position.optional(),
    level: z.number().int().min(1).max(5),
    parent: id.optional(),
    jump: id.optional(),
    evidence: z.array(id).min(1),
    structure: z
      .array(z.object({ name: z.string(), meaning: z.string() }).strict())
      .optional(),
    stateMachine: z
      .object({ initial: id, transitions: z.record(z.string(), z.array(id)) })
      .strict()
      .optional(),
  })
  .strict();
const event = z
  .object({
    type: z.enum(eventKinds),
    label: z.string().min(1),
    detail: z.string().min(1),
    from: id.optional(),
    target: id,
    state: id,
    progress: z.number().min(0).max(1).optional(),
    evidence: z.array(id).min(1),
  })
  .strict();
const scenario = z
  .object({
    id,
    title: z.string(),
    summary: z.string(),
    category: z.enum(["source", "teaching", "trace"]),
    status: z.enum(["upstream", "proposal", "historical"]),
    components: z.array(component).min(1),
    relationships: z.array(
      z.object({ from: id, to: id, label: z.string() }).strict(),
    ),
    timeline: z.array(event).min(1),
    cameraTrack: z
      .array(
        z
          .object({
            step: z.number().int().nonnegative(),
            target: id,
            distance: z.number().positive().optional(),
          })
          .strict(),
      )
      .default([]),
    version: id,
    contribution: id.optional(),
  })
  .strict();
const contribution = z
  .object({
    id,
    title: z.string(),
    repository: repo,
    number: z.number().int().positive(),
    role: z.enum([
      "author",
      "co-author",
      "reviewer",
      "design-contributor",
      "maintainer",
    ]),
    status: z.enum(["open", "closed", "merged"]),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    problem: z.string(),
    design: z.string(),
    module: id,
    scenario: id,
    evidence: z.array(id).min(1),
    impact: z
      .enum(["architecture", "correctness", "maintenance"])
      .default("correctness"),
  })
  .strict();
export const projectSchema = z
  .object({
    schemaVersion: z.literal(1),
    id,
    name: z.string(),
    short: z.string(),
    domain: z.string(),
    description: z.string(),
    accent: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    repos: z.array(repo).min(1),
    evidence: z.array(evidence).min(1),
    versions: z
      .array(
        z
          .object({
            id,
            label: z.string(),
            repo,
            sha,
            note: z.string(),
            scenario: id,
            compareWith: id.optional(),
          })
          .strict(),
      )
      .min(1),
    modules: z
      .array(
        z
          .object({
            id,
            title: z.string(),
            description: z.string(),
            scenarios: z.array(id).min(1),
          })
          .strict(),
      )
      .min(1),
    scenarios: z.array(scenario).min(1),
    contributions: z.array(contribution),
  })
  .strict();
export type Project = z.infer<typeof projectSchema>;
export type Scenario = z.infer<typeof scenario>;
export type Component = z.infer<typeof component>;
export type Evidence = z.infer<typeof evidence>;
