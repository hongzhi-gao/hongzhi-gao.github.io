import * as T from "three";
import type { Component } from "../architecture-ir/schema";

export function model(kind: Component["kind"], tint: string) {
  const group = new T.Group();
  const color = new T.Color(tint);
  const base = new T.MeshStandardMaterial({
    color: 0x29404a,
    metalness: 0.68,
    roughness: 0.28,
  });
  const panel = new T.MeshStandardMaterial({
    color: color.clone().multiplyScalar(0.46),
    metalness: 0.58,
    roughness: 0.35,
  });
  const light = new T.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.56,
    metalness: 0.32,
    roughness: 0.32,
  });
  const mesh = (
    geometry: T.BufferGeometry,
    material = base,
    x = 0,
    y = 0,
    z = 0,
  ) => {
    const object = new T.Mesh(geometry, material);
    object.position.set(x, y, z);
    group.add(object);
    return object;
  };
  const box = (
    width: number,
    height: number,
    depth: number,
    x = 0,
    y = 0,
    z = 0,
    material = base,
  ) => mesh(new T.BoxGeometry(width, height, depth), material, x, y, z);
  const cylinder = (
    radius: number,
    height: number,
    y: number,
    material = base,
  ) => mesh(new T.CylinderGeometry(radius, radius, height, 40), material, 0, y);
  const shelf = () => {
    for (let i = 0; i < 5; i++) {
      box(1.25, 0.21, 0.83, 0, 0.24 + i * 0.25, 0, i % 2 ? panel : base);
      box(0.22, 0.027, 0.023, 0.32, 0.24 + i * 0.25, 0.431, light);
      box(0.4, 0.021, 0.02, -0.27, 0.24 + i * 0.25, 0.432, panel);
    }
    box(0.075, 1.34, 0.93, -0.67, 0.75);
    box(0.075, 1.34, 0.93, 0.67, 0.75);
  };
  const platter = () => {
    for (let i = 0; i < 4; i++) {
      cylinder(0.71, 0.17, 0.19 + i * 0.215, i % 2 ? panel : base);
      cylinder(0.718, 0.025, 0.285 + i * 0.215, light);
    }
    cylinder(0.37, 0.08, 1.02, panel);
  };
  const voxels = () => {
    for (let z = 0; z < 3; z++)
      for (let x = 0; x < 4; x++) {
        box(
          0.29,
          0.16 + (x + z < 4 ? 0.28 : 0),
          0.29,
          (x - 1.5) * 0.32,
          0.25,
          (z - 1) * 0.32,
          x + z < 4 ? panel : base,
        );
        if (x + z < 4)
          box(
            0.22,
            0.021,
            0.22,
            (x - 1.5) * 0.32,
            0.486,
            (z - 1) * 0.32,
            light,
          );
      }
    box(1.45, 0.13, 1.08, 0, 0.1);
  };
  const leaves = () => {
    for (let i = 0; i < 4; i++) {
      const leaf = box(
        1.18,
        0.09,
        0.83,
        0,
        0.2 + i * 0.2,
        i * 0.068,
        i % 2 ? panel : base,
      );
      leaf.rotation.y = i * 0.075;
      for (let j = 0; j < 3; j++)
        box(
          0.76,
          0.017,
          0.031,
          0,
          0.254 + i * 0.2,
          (j - 1) * 0.15 + i * 0.069,
          light,
        );
    }
  };
  const toroid = () => {
    const ring = mesh(new T.TorusGeometry(0.48, 0.08, 10, 34), light, 0, 0.53);
    ring.rotation.x = Math.PI / 2;
    mesh(new T.OctahedronGeometry(0.35), panel, 0, 0.58);
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      box(0.1, 0.1, 0.1, Math.cos(a) * 0.48, 0.58, Math.sin(a) * 0.48, light);
    }
  };
  switch (kind) {
    case "ServerNode":
    case "Master":
    case "Worker":
    case "Peer":
    case "ConsensusGroup":
    case "InferenceWorker":
      shelf();
      break;
    case "ObjectStorage":
    case "SSD":
    case "StorageTier":
    case "Compaction":
      platter();
      break;
    case "MemoryPool":
    case "MemoryBlock":
    case "Segment":
    case "MemTable":
    case "GPU":
    case "Tensor":
    case "KVCache":
    case "CacheBlock":
      voxels();
      break;
    case "File":
    case "FileSection":
    case "Chunk":
    case "Page":
    case "WAL":
    case "Queue":
      leaves();
      break;
    case "Replica":
    case "Object":
    case "DataPacket":
    case "Metadata":
    case "HashTable":
    case "Index":
    case "StateMachine":
    case "Lock":
      toroid();
      break;
    default:
      box(1.34, 0.31, 0.74, 0, 0.47, 0, panel);
      box(1.2, 0.025, 0.59, 0, 0.641, 0, light);
      for (let i = 0; i < 3; i++)
        box(0.15, 0.027, 0.02, (i - 1) * 0.26, 0.48, 0.381, light);
  }
  box(
    1.55,
    0.09,
    1.11,
    0,
    0.047,
    0,
    new T.MeshStandardMaterial({
      color: 0x162b35,
      metalness: 0.65,
      roughness: 0.45,
    }),
  );
  return { group, light };
}

export function installLights(scene: T.Scene) {
  scene.add(new T.HemisphereLight(0xcfeaff, 0x294054, 2));
  const key = new T.DirectionalLight(0xc7faff, 2.5);
  key.position.set(-4, 9, 5);
  scene.add(key);
  const rim = new T.DirectionalLight(0x72afe8, 1.7);
  rim.position.set(7, 2, -5);
  scene.add(rim);
}
