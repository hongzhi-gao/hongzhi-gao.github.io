import * as T from 'three';
import { installLights, model } from './models';

export function heroWebGL(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({canvas, antialias:true, alpha:true, powerPreference:'low-power'});
  renderer.setClearColor(0x101820,0);
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));
  const scene = new T.Scene();
  scene.fog = new T.FogExp2(0x0a141b,.026);
  installLights(scene);
  const camera = new T.PerspectiveCamera(39,1,.5,100);
  const structure = new T.Group();
  scene.add(structure);
  const grid=new T.GridHelper(68,68,0x30525d,0x233c4a);
  grid.position.set(0,-.13,0);scene.add(grid);
  const core = model('GPU','#8cf9e1').group;
  core.scale.set(3.4,3.8,3.4);structure.add(core);
  const memory = model('ObjectStorage','#839bf4').group;
  memory.position.set(4.5,0,-2.1);memory.scale.setScalar(2.25);structure.add(memory);
  const slab = new T.Mesh(new T.BoxGeometry(13.9,.24,10.7),new T.MeshStandardMaterial({color:0x182d39,metalness:.8,roughness:.36}));
  slab.position.set(0,-.18,0);structure.add(slab);
  for(let row=-1;row<=1;row++){
    for(let col=-2;col<=2;col++){
      if(Math.abs(col)<2 && row===0 || col>0 && row===-1)continue;
      const rack=model(row===-1?'SSD':row===0?'Segment':'ServerNode',col>0?'#8daeff':'#78e9dc').group;
      rack.position.set(col*2.6,0,row*3.65);
      rack.scale.y=1.1+((col+row+5)%4)*.47;
      structure.add(rack);
    }
  }
  const traces=[[-5,0,-3],[0,0,-3],[0,0,0],[4.5,0,0],[4.5,0,-2.1],[-5,0,0],[-.6,0,0],[-.6,0,3.7],[4.9,0,3.7]];
  const routes=[traces.slice(0,5),traces.slice(5),[[-5.2,0,3.7],[-5.2,0,1.15],[5.2,0,1.15],[5.2,0,0]]].map((path,i)=>{
    const points=path.map(([x,,z])=>new T.Vector3(x,.09+i*.045,z));
    structure.add(new T.Line(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:i===1?0x7c95e7:0x57cdbd,transparent:true,opacity:.66})));
    const curve=new T.CurvePath<T.Vector3>();
    points.slice(1).forEach((point,index)=>curve.add(new T.LineCurve3(points[index],point)));
    const packets=Array.from({length:3},()=>{
      const packet=new T.Mesh(new T.BoxGeometry(.22,.08,.17),new T.MeshBasicMaterial({color:i===1?0xb0bcff:0xa5ffeb}));
      structure.add(packet);return packet;
    });
    return {curve,packets};
  });
  let visible=true;
  let frame=0;
  function resize(){
    const {clientWidth:width,clientHeight:height}=canvas;
    renderer.setSize(width,height,false);
    camera.aspect=width/Math.max(height,1);camera.updateProjectionMatrix();
  }
  function draw(now=0){
    frame=0;
    const t=now/1000;
    const mobile=canvas.clientWidth<760;
    camera.position.set(11+Math.sin(t*.25)*2,10.8+Math.sin(t*.3)*.75,18+Math.cos(t*.24));
    camera.lookAt(mobile?-1.1:-5.9,mobile?1.2:.6,0);
    for(const {curve,packets} of routes)packets.forEach((packet,index)=>curve.getPoint((t*.13+index/3)%1,packet.position));
    renderer.render(scene,camera);
    if(visible&&!document.hidden)frame=requestAnimationFrame(draw);
  }
  const resume=()=>{if(visible&&!document.hidden&&!frame)frame=requestAnimationFrame(draw)};
  const resizeObserver=new ResizeObserver(()=>{resize();resume()});resizeObserver.observe(canvas);
  const intersection=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;resume()});intersection.observe(canvas);
  document.addEventListener('visibilitychange',resume);
  window.addEventListener('pagehide',event=>{
    if(event.persisted)return;
    resizeObserver.disconnect();intersection.disconnect();cancelAnimationFrame(frame);
    document.removeEventListener('visibilitychange',resume);
    scene.traverse(object=>{if(object instanceof T.Mesh || object instanceof T.Line){object.geometry.dispose();object.material.dispose()}});
    renderer.dispose();
  },{once:true});
  resize();resume();
}
