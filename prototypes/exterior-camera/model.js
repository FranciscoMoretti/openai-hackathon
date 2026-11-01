import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Exterior study: deliberately simplified geometry, no interior or cutaway meshes.
export function buildLandmark() {
  const root=new T.Group(), buckets=new Map();
  const mats={stone:new T.MeshStandardMaterial({color:0xc7b592,roughness:.85}), trim:new T.MeshStandardMaterial({color:0xe5d5b3,roughness:.78}), dark:new T.MeshStandardMaterial({color:0x46535a,roughness:.8}), gold:new T.MeshStandardMaterial({color:0xc89e4b,metalness:.55,roughness:.35}), window:new T.MeshStandardMaterial({color:0x374645,roughness:.65}), base:new T.MeshStandardMaterial({color:0xd6d4c5,roughness:1})};
  function put(geo,mat,x,y,z,rotation=0){geo.rotateY(rotation);geo.translate(x,y,z);if(!buckets.has(mat))buckets.set(mat,[]);buckets.get(mat).push(geo);}
  const box=(w,h,d,x,y,z,mat='stone',r=0)=>put(new T.BoxGeometry(w,h,d),mat,x,y,z,r);
  const roof=(radius,height,x,y,z,mat='dark')=>put(new T.ConeGeometry(radius,height,4),mat,x,y,z,Math.PI/4);
  function spire(x,y,z,scale=1){box(.35*scale,2*scale,.35*scale,x,y,z,'trim');roof(.5*scale,2*scale,x,y+2*scale,z,'gold');}
  box(12,1.5,12,0,.75,0,'base'); box(10,44,10,0,23,0);
  for(let y=4;y<44;y+=7.5){box(10.5,.5,10.5,0,y,0,'trim');}
  for(const sign of [-1,1]) {
    for(const x of [-4.5,4.5]) box(.55,45,.6,x,23,sign*5.12,'trim');
    for(let j=0;j<4;j++) {
      const x=-2.85+j*1.9;
      for(let row=0;row<5;row++) {
        const y=7+row*7.4;
        box(.83,4.8,.16,x,y,sign*5.08,'window');
        box(.12,5.2,.25,x-.53,y,sign*5.17,'trim');box(.12,5.2,.25,x+.53,y,sign*5.17,'trim');
        box(1.2,.24,.3,x,y+2.6,sign*5.17,'trim');
        box(.09,4.8,.3,x,y,sign*5.23,'stone');
        box(.16,4.8,.83,sign*5.08,y,x,'window');
        box(.25,5.2,.12,sign*5.17,y,x-.53,'trim');box(.25,5.2,.12,sign*5.17,y,x+.53,'trim');
        box(.3,.24,1.2,sign*5.17,y+2.6,x,'trim');
      }
    }
  }
  // Clock stage with projecting cornices and corner pinnacles.
  box(11.3,1.2,11.3,0,46,0,'trim'); box(10.8,11.2,10.8,0,52,0);
  for(const y of [47.1,57.2,58.3]) box(11.8,.6,11.8,0,y,0,'trim');
  for(const x of [-5.3,5.3])for(const z of [-5.3,5.3]){box(.6,13,.6,x,52,z,'trim');spire(x,59,z,1.15);}
  // Belfry: exterior louvres between stone columns.
  box(9.8,8,9.8,0,62.8,0,'window');
  for(const sign of [-1,1])for(let i=-4;i<=4;i+=1.6){box(.38,8.8,.45,i,62.8,sign*5,'trim');box(.45,8.8,.38,sign*5,62.8,i,'trim');}
  for(let y=59;y<67;y+=.85){box(9.7,.13,10,0,y,0,'stone');box(10,.13,9.7,0,y,0,'stone');}
  box(10.9,.8,10.9,0,67.5,0,'trim');
  roof(7.5,12,0,73.8,0);
  // Gold roof seams and upper lantern, kept bold enough to read at map scale.
  for(const x of [-2.4,0,2.4])for(const s of [-1,1]){
    const curve=new T.LineCurve3(new T.Vector3(x,68,s*5),new T.Vector3(x*.23,79,s*1.1));
    put(new T.TubeGeometry(curve,1,.07,4,false),'gold',0,0,0);
    const curve2=new T.LineCurve3(new T.Vector3(s*5,68,x),new T.Vector3(s*1.1,79,x*.23));
    put(new T.TubeGeometry(curve2,1,.07,4,false),'gold',0,0,0);
  }
  box(3.1,4,3.1,0,80,0,'dark');
  for(const x of [-1.55,0,1.55])for(const s of [-1,1]){box(.17,4.2,.18,x,80,s*1.6,'gold');box(.18,4.2,.17,s*1.6,80,x,'gold');}
  roof(2.8,7,0,85,0); put(new T.CylinderGeometry(.08,.12,4,8),'gold',0,90,0);put(new T.SphereGeometry(.35,10,8),'gold',0,89.4,0);
  box(1.5,.13,.13,0,91,0,'gold');
  // Four real textured clock faces; texture is drawn locally, no remote assets.
  const texture=clockTexture();
  for(let i=0;i<4;i++){
    const group=new T.Group();group.rotation.y=i*Math.PI/2;
    const face=new T.Mesh(new T.CircleGeometry(4.35,80),new T.MeshStandardMaterial({map:texture,roughness:.7}));face.position.set(0,52.1,5.43);group.add(face);
    const rim=new T.Mesh(new T.TorusGeometry(4.4,.16,8,80),mats.gold);rim.position.set(0,52.1,5.5);group.add(rim);root.add(group);
  }
  // Recognizable, simplified Palace wing extending away from tower.
  box(38,14,14,-25,7,-2);box(39,.7,15,-25,14.4,-2,'trim');
  box(38,1,14,-25,1,-2,'trim');
  for(let x=-43;x<-7;x+=3){
    for(const z of [-9.1,5.1]) {box(1.2,6,.15,x,8,z,'window');box(.18,9,.3,x-1.2,9,z,'trim');spire(x-1.2,15,z,.7);}
  }
  box(36,2,8,-25,16,-2,'dark');
  for(const x of [-44,-6]) {box(4,21,5,x,10.5,-2);roof(3.6,5,x,23.5,-2);spire(x,27,-2,.7);}
  for(const [key,geos] of buckets){const mesh=new T.Mesh(mergeGeometries(geos),mats[key]);mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);geos.forEach(g=>g.dispose());}
  return root;
}
function clockTexture(){
  const c=document.createElement('canvas');c.width=c.height=1024;const x=c.getContext('2d');x.fillStyle='#f4efdb';x.fillRect(0,0,1024,1024);x.translate(512,512);
  x.strokeStyle='#ab873f';x.lineWidth=13;for(const r of [480,455,330]){x.beginPath();x.arc(0,0,r,0,Math.PI*2);x.stroke();}
  for(let i=0;i<60;i++){x.save();x.rotate(i*Math.PI/30);x.strokeStyle=i%5===0?'#314849':'#8e7c54';x.lineWidth=i%5===0?9:3;x.beginPath();x.moveTo(0,-442);x.lineTo(0,i%5===0?-418:-432);x.stroke();x.restore();}
  const roman=['XII','I','II','III','IV','V','VI','VII','VIII','IX','X','XI'];x.fillStyle='#293d3e';x.textAlign='center';x.textBaseline='middle';x.font='bold 71px Georgia';
  roman.forEach((n,i)=>{const a=i*Math.PI/6;x.fillText(n,Math.sin(a)*380,-Math.cos(a)*380);});
  x.strokeStyle='#b7a575';x.lineWidth=2;for(let i=0;i<16;i++){x.beginPath();x.moveTo(0,0);const a=i*Math.PI/8;x.lineTo(Math.cos(a)*325,Math.sin(a)*325);x.stroke();}
  for(const [a,len,w] of [[-.65,235,20],[1.05,310,13]]){x.save();x.rotate(a);x.fillStyle='#173936';x.beginPath();x.moveTo(-w,25);x.lineTo(-w*.5,-len+35);x.lineTo(0,-len);x.lineTo(w*.5,-len+35);x.lineTo(w,25);x.fill();x.restore();}
  x.fillStyle='#bf9645';x.beginPath();x.arc(0,0,24,0,Math.PI*2);x.fill();const t=new T.CanvasTexture(c);t.colorSpace=T.SRGBColorSpace;return t;
}
export function buildSetting(scene){
  const floor=new T.Mesh(new T.CylinderGeometry(65,66,1.5,100),new T.MeshStandardMaterial({color:0xe7e7db,roughness:1}));floor.position.set(-12,-.9,0);floor.receiveShadow=true;scene.add(floor);
  const river=new T.Mesh(new T.BoxGeometry(11,.12,75),new T.MeshStandardMaterial({color:0xaecbc9,roughness:.45}));river.position.set(28,0,-4);scene.add(river);
  const bank=new T.Mesh(new T.BoxGeometry(1.5,.25,75),new T.MeshStandardMaterial({color:0xf5f0dd}));bank.position.set(21.3,.1,-4);scene.add(bank);
  for(let i=0;i<12;i++){
    const x=-52+(i%6)*9,z=i<6?-27:23;const h=3+(i%3)*2;
    const b=new T.Mesh(new T.BoxGeometry(6,h,7),new T.MeshStandardMaterial({color:0xdcded2,roughness:1}));b.position.set(x,h/2,z);b.castShadow=true;b.receiveShadow=true;scene.add(b);
  }
  for(let i=0;i<11;i++){
    const x=13,z=-32+i*6;const tree=new T.Mesh(new T.IcosahedronGeometry(1.8,1),new T.MeshStandardMaterial({color:i%2?0x9eae8c:0x8ea684,roughness:1}));tree.position.set(x,2.6,z);tree.castShadow=true;scene.add(tree);
  }
}
