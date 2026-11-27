type Point = { x:number; y:number };
type Edge = {id:string;from:string;to:string;label:string};
type NodeInfo = {id:string;label:string;detail:string;fields:string[];proposal?:boolean;links:{href:string;label:string}[]};
type Config = {tracks:{id:string;edges:string[]}[];edges:Edge[];nodes:NodeInfo[]};

class ArchitectureCanvas extends HTMLElement {
  connectedCallback() {
    const get = <T extends Element = HTMLElement>(selector:string) => this.querySelector<T>(selector)!;
    const config:Config=JSON.parse(get("[data-structure]").textContent!);
    const descriptions=new Map(config.nodes.map(node=>[node.id,node]));
    const viewport=get("[data-viewport]");
    const drawing=get<SVGSVGElement>("[data-drawing]");
    const camera=get<SVGGElement>("[data-camera]");
    const panel=get("#contribution-panel");
    const contributions=Array.from(panel.querySelectorAll<HTMLElement>("[data-contribution]"));
    const controls=Array.from(this.querySelectorAll<HTMLButtonElement>("[data-track]"));
    const nodes=new Map(Array.from(drawing.querySelectorAll<SVGGElement>("[data-node-id]")).map(node=>[node.dataset.nodeId!,node]));
    const edges=new Map(Array.from(drawing.querySelectorAll<SVGGElement>("[data-edge]")).map(edge=>[edge.dataset.edge!,edge]));
    const pointers=new Map<number,Point>();
    const panelControl=get<HTMLButtonElement>(".diagram-panel-toggle");
    const fsToggle=get<HTMLButtonElement>("[data-view=fullscreen]");
    let position={x:0,y:0};
    let scale=1;
    let focus:string|undefined;
    let hover:string|undefined;
    let entry:string[]= [];
    let track:string|undefined;
    let moved=false;
    let dragPoint:Point|undefined;
    let pinch:{center:Point;distance:number}|undefined;
    const box=drawing.viewBox.baseVal;
    const origin={x:box.width/2,y:box.height/2};
    const transform=() => {
      camera.setAttribute("transform",`translate(${position.x.toFixed(2)} ${position.y.toFixed(2)}) scale(${scale.toFixed(4)})`);
      drawing.dataset.zoomLevel=scale>=1.55?"detail":scale>=.88?"standard":"overview";
      get("[data-zoom]").textContent=`${Math.round(scale*100)}%`;
    };
    const fit=() => {position={x:0,y:0};scale=1;transform()};
    const initial=() => {
      if (viewport.clientWidth<600) {
        scale=2.25;
        position={x:15,y:(1-scale)*origin.y};
        transform();
      } else fit();
    };
    const svgPoint=(x:number,y:number) => new DOMPoint(x,y).matrixTransform(drawing.getScreenCTM()!.inverse());
    const zoom=(ratio:number,at:Point) => {
      const next=Math.max(.55,Math.min(6,scale*ratio));
      position={x:at.x-(at.x-position.x)*next/scale,y:at.y-(at.y-position.y)*next/scale};
      scale=next;
      transform();
    };
    function highlight() {
      const selected = entry.length ? entry : hover ? [hover] : focus ? [focus] : [];
      const neighbors=new Set(selected);
      const triggered=config.tracks.find(item=>item.id===track);
      const trace=new Set(triggered?.edges??config.tracks[0]?.edges.slice(0,3));
      for (const edge of config.edges) {
        const related=selected.includes(edge.from)||selected.includes(edge.to);
        if (related) {neighbors.add(edge.from);neighbors.add(edge.to)}
        const path=edges.get(edge.id)!;
        path.classList.toggle("related",related);
        path.classList.toggle("flowing",selected.length>0 ? related : trace.has(edge.id));
      }
      drawing.classList.toggle("has-selection",selected.length>0);
      for (const [id,node] of nodes) {
        node.classList.toggle("selected",selected.includes(id));
        node.classList.toggle("neighbor",neighbors.has(id));
        node.setAttribute("aria-pressed",String(id===focus));
      }
    }
    function select(id?:string) {
      focus=id;
      const info=focus&&descriptions.get(focus);
      const inspector=get("[data-inspector]");
      inspector.hidden=!info;
      if (info) {
        if(panel.hidden&&viewport.clientWidth<750) collapse(false);
        get("[data-inspector-title]").textContent=info.label+(info.proposal?" · Proposal":"");
        get("[data-inspector-detail]").textContent=info.detail;
        get("[data-inspector-fields]").replaceChildren(...info.fields.map(field=>{
          const li=document.createElement("li");li.textContent=field;return li;
        }));
        const related=config.edges.filter(edge=>edge.from===id||edge.to===id);
        get("[data-inspector-paths]").replaceChildren(...related.map(edge=>{
          const li=document.createElement("li");
          const incoming=edge.to===id;
          const neighbor=descriptions.get(incoming?edge.from:edge.to)!;
          li.textContent=`${incoming?"←":"→"} ${neighbor.label} · ${edge.label}`;
          return li;
        }));
        get("[data-inspector-links]").replaceChildren(...info.links.map(link=>{
          const a=document.createElement("a"); a.href=link.href;a.textContent=link.label;return a;
        }));
      }
      let visible=0;
      for (const item of contributions) {
        item.hidden=!!focus&&!item.dataset.nodeLinks?.split(" ").includes(focus);
        if (!item.hidden) visible++;
      }
      get("[data-no-contributions]").hidden=visible>0;
      highlight();
    }
    const collapse=(closed:boolean) => {
      this.classList.toggle("panel-closed",closed);
      panel.hidden=closed;
      if(closed){entry=[];highlight()}
      panelControl.setAttribute("aria-expanded",String(!closed));
    };
    if(matchMedia("(max-width: 750px)").matches) collapse(true);
    for(const button of this.querySelectorAll("[data-panel-toggle]")) button.addEventListener("click",()=>collapse(!panel.hidden));
    for(const button of controls) button.addEventListener("click",()=>{
      track=track===button.dataset.track?undefined:button.dataset.track;
      for(const current of controls) current.setAttribute("aria-pressed",String(current.dataset.track===track));
      highlight();
    });
    for (const [id,node] of nodes) {
      node.addEventListener("pointerenter",event=>{if(event.pointerType==="mouse"){hover=id;highlight()}});
      node.addEventListener("pointerleave",()=>{hover=undefined;highlight()});
      node.addEventListener("click",event=>{event.stopPropagation();if(!moved)select(focus===id?undefined:id)});
      node.addEventListener("keydown",event=>{
        if (event.key==="Enter"||event.key===" ") {event.preventDefault();select(focus===id?undefined:id)}
      });
    }
    for(const item of contributions) {
      const on=()=>{entry=item.dataset.nodeLinks?.split(" ").filter(Boolean)??[];highlight()};
      const off=()=>{entry=[];highlight()};
      item.addEventListener("pointerenter",on);item.addEventListener("pointerleave",off);
      item.addEventListener("focusin",on);item.addEventListener("focusout",off);
    }
    get("[data-clear]").addEventListener("click",()=>select());
    viewport.addEventListener("click",()=>{if(!moved)select()});
    viewport.addEventListener("wheel",event=>{
      event.preventDefault();
      zoom(Math.exp(-event.deltaY*.00125),svgPoint(event.clientX,event.clientY));
    },{passive:false});
    viewport.addEventListener("pointerdown",event=>{
      if(event.button!==0&&event.pointerType==="mouse") return;
      if(!pointers.size){moved=false;pinch=undefined;dragPoint=svgPoint(event.clientX,event.clientY)}
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointers.size===2){moved=true;viewport.setPointerCapture(event.pointerId)}
    });
    viewport.addEventListener("pointermove",event=>{
      if(!pointers.has(event.pointerId)) return;
      const last=pointers.get(event.pointerId)!;
      pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});
      if(pointers.size>1) {
        const [a,b]=[...pointers.values()];
        const center=svgPoint((a.x+b.x)/2,(a.y+b.y)/2);
        const distance=Math.hypot(a.x-b.x,a.y-b.y);
        if (pinch&&distance>0&&pinch.distance>0) {
          zoom(distance/pinch.distance,pinch.center);
          position.x+=center.x-pinch.center.x;position.y+=center.y-pinch.center.y;transform();
        }
        pinch={center,distance};
        return;
      }
      if(!moved && Math.hypot(event.clientX-last.x,event.clientY-last.y)>2) {
        moved=true;viewport.setPointerCapture(event.pointerId);
      }
      if(!moved)return;
      const point=svgPoint(event.clientX,event.clientY);
      if(dragPoint){position.x+=point.x-dragPoint.x;position.y+=point.y-dragPoint.y;transform()}
      dragPoint=point;
    });
    const end=(event:PointerEvent)=>{
      pointers.delete(event.pointerId);
      pinch=undefined;
      const remaining=[...pointers.values()][0];
      dragPoint=remaining?svgPoint(remaining.x,remaining.y):undefined;
    };
    viewport.addEventListener("pointerup",end);
    viewport.addEventListener("pointercancel",end);
    viewport.addEventListener("pointerleave",event=>{if(!viewport.hasPointerCapture(event.pointerId))end(event)});
    viewport.addEventListener("keydown",event=>{
      if (event.key==="Escape") {select();return}
      if (event.target!==viewport)return;
      const shifts:Record<string,[number,number]>={ArrowUp:[0,62],ArrowDown:[0,-62],ArrowLeft:[62,0],ArrowRight:[-62,0]};
      const shift=shifts[event.key];
      if(shift){event.preventDefault(); position.x+=shift[0];position.y+=shift[1];transform()}
      if(event.key==="+"||event.key==="="||event.key==="-"){event.preventDefault();zoom(event.key==="-"?.8:1.25,origin)}
      if(event.key==="0"){event.preventDefault();fit()}
    });
    get("[data-view=minus]").addEventListener("click",()=>zoom(.8,origin));
    get("[data-view=plus]").addEventListener("click",()=>zoom(1.25,origin));
    get("[data-view=fit]").addEventListener("click",fit);
    get("[data-view=reset]").addEventListener("click",initial);
    const fullscreenState=()=>{
      const active=document.fullscreenElement===this||this.classList.contains("diagram-fullscreen");
      fsToggle.setAttribute("aria-pressed",String(active));
      fsToggle.textContent=active?"Exit fullscreen":"Fullscreen";
    };
    fsToggle.addEventListener("click",async()=>{
      if(document.fullscreenElement===this) await document.exitFullscreen();
      else if(this.classList.contains("diagram-fullscreen")) this.classList.remove("diagram-fullscreen");
      else if(this.requestFullscreen) {
        try {await this.requestFullscreen()} catch {this.classList.add("diagram-fullscreen")}
      } else this.classList.add("diagram-fullscreen");
      fullscreenState();
    });
    document.addEventListener("fullscreenchange",fullscreenState);
    this.addEventListener("keydown",event=>{
      if(event.key==="Escape"&&this.classList.contains("diagram-fullscreen")){
        this.classList.remove("diagram-fullscreen");fullscreenState();
      }
    });
    const watcher=new IntersectionObserver(([item])=>this.classList.toggle("diagram-visible",item.isIntersecting));
    watcher.observe(this);
    document.addEventListener("visibilitychange",()=>this.classList.toggle("diagram-paused",document.hidden));
    initial();
    highlight();
  }
}
customElements.define("architecture-canvas",ArchitectureCanvas);
