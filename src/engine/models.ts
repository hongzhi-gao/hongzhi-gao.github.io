import * as T from 'three';
import type { Component } from '../architecture-ir/schema';

export function model(kind: Component['kind'], tint: string) {
  const group = new T.Group();
  const color = new T.Color(tint);
  const base = new T.MeshStandardMaterial({color: 0x29404a, metalness:.68, roughness:.28});
  const panel = new T.MeshStandardMaterial({color: color.clone().multiplyScalar(.46), metalness:.58, roughness:.35});
  const light = new T.MeshStandardMaterial({color, emissive:color, emissiveIntensity:.56, metalness:.32, roughness:.32});
  const mesh = (geometry:T.BufferGeometry, material = base, x=0, y=0, z=0) => {
    const object = new T.Mesh(geometry,material);
    object.position.set(x,y,z);
    group.add(object);
    return object;
  };
  const box = (width:number,height:number,depth:number,x=0,y=0,z=0,material=base) => mesh(new T.BoxGeometry(width,height,depth),material,x,y,z);
  const cylinder = (radius:number,height:number,y:number,material=base) => mesh(new T.CylinderGeometry(radius,radius,height,40),material,0,y);
  const shelf = () => {
    for (let i=0;i<5;i++) {
      box(1.25,.21,.83,0,.24+i*.25,0,i%2 ? panel : base);
      box(.22,.027,.023,.32,.24+i*.25,.431,light);
      box(.4,.021,.02,-.27,.24+i*.25,.432,panel);
    }
    box(.075,1.34,.93,-.67,.75);box(.075,1.34,.93,.67,.75);
  };
  const platter = () => {
    for(let i=0;i<4;i++){cylinder(.71,.17,.19+i*.215,i%2 ? panel : base);cylinder(.718,.025,.285+i*.215,light);}
    cylinder(.37,.08,1.02,panel);
  };
  const voxels = () => {
    for(let z=0;z<3;z++) for(let x=0;x<4;x++) {
      box(.29,.16+(x+z<4 ? .28:0),.29,(x-1.5)*.32,.25,(z-1)*.32,x+z<4 ? panel : base);
      if(x+z<4)box(.22,.021,.22,(x-1.5)*.32,.486,(z-1)*.32,light);
    }
    box(1.45,.13,1.08,0,.1);
  };
  const leaves = () => {
    for(let i=0;i<4;i++){
      const leaf=box(1.18,.09,.83,0,.2+i*.20,i*.068,i%2 ? panel : base);
      leaf.rotation.y=i*.075;
      for(let j=0;j<3;j++)box(.76,.017,.031,0,.254+i*.20,(j-1)*.15+i*.069,light);
    }
  };
  const toroid = () => {
    const ring=mesh(new T.TorusGeometry(.48,.08,10,34),light,0,.53);
    ring.rotation.x=Math.PI/2;
    mesh(new T.OctahedronGeometry(.35),panel,0,.58);
    for(let i=0;i<4;i++){const a=i*Math.PI/2;box(.1,.1,.1,Math.cos(a)*.48,.58,Math.sin(a)*.48,light)}
  };
  switch(kind){
    case 'ServerNode':case 'Master':case 'Worker':case 'Peer':case 'ConsensusGroup':case 'InferenceWorker': shelf();break;
    case 'ObjectStorage':case 'SSD':case 'StorageTier':case 'Compaction': platter();break;
    case 'MemoryPool':case 'MemoryBlock':case 'Segment':case 'MemTable':case 'GPU':case 'Tensor':case 'KVCache':case 'CacheBlock': voxels();break;
    case 'File':case 'FileSection':case 'Chunk':case 'Page':case 'WAL':case 'Queue': leaves();break;
    case 'Replica':case 'Object':case 'DataPacket':case 'Metadata':case 'HashTable':case 'Index':case 'StateMachine':case 'Lock': toroid();break;
    default:
      box(1.34,.31,.74,0,.47,0,panel);
      box(1.2,.025,.59,0,.641,0,light);
      for(let i=0;i<3;i++)box(.15,.027,.02,(i-1)*.26,.48,.381,light);
  }
  box(1.55,.09,1.11,0,.047,0,new T.MeshStandardMaterial({color:0x162b35,metalness:.65,roughness:.45}));
  return {group,light};
}

export function installLights(scene:T.Scene){
  scene.add(new T.HemisphereLight(0xcfeaff,0x294054,2));
  const key=new T.DirectionalLight(0xc7faff,2.5);
  key.position.set(-4,9,5);scene.add(key);
  const rim=new T.DirectionalLight(0x72afe8,1.7);
  rim.position.set(7,2,-5);scene.add(rim);
}
