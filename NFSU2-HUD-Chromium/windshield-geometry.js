(() => {
'use strict';
const add=(a,b)=>a.map((v,i)=>v+b[i]), sub=(a,b)=>a.map((v,i)=>v-b[i]), scale=(a,s)=>a.map(v=>v*s), dot=(a,b)=>a.reduce((s,v,i)=>s+v*b[i],0), len=a=>Math.hypot(...a);
const mul=(v,m)=>[0,1,2,3].map(c=>v.reduce((s,x,r)=>s+x*m[r*4+c],0));
function inverse(m){const a=Array.from({length:4},(_,i)=>[...m.slice(i*4,i*4+4),...Array.from({length:4},(_,j)=>+(i===j))]);for(let i=0;i<4;i++){let k=i;for(let j=i+1;j<4;j++)if(Math.abs(a[j][i])>Math.abs(a[k][i]))k=j;[a[i],a[k]]=[a[k],a[i]];const p=a[i][i];if(Math.abs(p)<1e-10)return null;a[i]=a[i].map(v=>v/p);for(let j=0;j<4;j++)if(j!==i){const f=a[j][i];a[j]=a[j].map((v,k)=>v-f*a[i][k]);}}return a.flatMap(r=>r.slice(4));}
function axes(c){const y=c.yaw,p=c.pitch,r=c.roll,cy=Math.cos(y),sy=Math.sin(y),cp=Math.cos(p),sp=Math.sin(p),cr=Math.cos(r),sr=Math.sin(r);return [[cy*cp,sy*cp,-sp],[cy*sp*sr-sy*cr,sy*sp*sr+cy*cr,cp*sr],[cy*sp*cr+sy*sr,sy*sp*cr-cy*sr,cp*cr]];}
function local(c,p){return axes(c).map(a=>dot(sub(p,c.pos),a));}
function world(c,p){return axes(c).reduce((v,a,i)=>add(v,scale(a,p[i])),c.pos.slice());}
function cam(v,c){const m=v.view, t=m.slice(12,15), basis=[[m[0],m[4],m[8]],[m[1],m[5],m[9]],[m[2],m[6],m[10]]];const p=basis.reduce((a,b,i)=>add(a,scale(b,-t[i])),[0,0,0]);return {pos:local(c,p),forward:axes(c).map(a=>dot(a,basis[2]))};}
function ray(v,c,uv){const ip=inverse(v.proj),iv=inverse(v.view);if(!ip||!iv)return null;const unproject=z=>{let q=mul(mul([uv[0]*2-1,1-uv[1]*2,z,1],ip),iv);return Math.abs(q[3])>1e-10?local(c,q.slice(0,3).map(x=>x/q[3])):null;};const a=unproject(0),b=unproject(.8);if(!a||!b)return null;const d=sub(b,a),n=len(d);return n>0?{a, d:scale(d,1/n)}:null;}
function calibrate(v,c,uvs,depth,tilt){const camera=cam(v,c), slope=Math.tan(tilt*Math.PI/180),normal=[1,0,slope], plane=dot(normal,add(camera.pos,[depth,0,0]));const points=[];for(const uv of uvs){const r=ray(v,c,uv);if(!r)return null;const denom=dot(normal,r.d);if(Math.abs(denom)<.001)return null;const t=(plane-dot(normal,r.a))/denom;if(t<0||t>15)return null;points.push(add(r.a,scale(r.d,t)));}return {points,camera,uvs:uvs.map(p=>p.slice()),depth,tilt};}
function project(v,c,p){const q=mul(mul([...world(c,p),1],v.view),v.proj);if(!q.every(Number.isFinite)||q[3]<=0||q[2]<0)return null;return [(q[0]/q[3]+1)/2,(1-q[1]/q[3])/2];}
function compatible(a,b){return len(sub(a.pos,b.pos))<.85&&dot(a.forward,b.forward)>Math.cos(25*Math.PI/180);}
// Interpolate screen coordinates; 100% = original car-local projection.
function tracking(v,c,p,method,strength){
 const base=p.uvs;
 if(method==='camera')return base.map(q=>q.slice());
 const k=method==='hybrid'?Math.max(0,Math.min(2,strength/100)):1;
 if(k===0)return base.map(q=>q.slice());
 const projected=p.points.map(q=>project(v,c,q));
 if(projected.some(q=>!q))return null;
 return projected.map((q,i)=>q.map((n,j)=>base[i][j]+(n-base[i][j])*k));
}
// Scale the virtual plane around the calibration camera (same reference rays).
// This preserves the parked reference while changing translation parallax.
function adaptive(v,c,p,opts){
 const depth=opts.depth/100;
 const points=p.points.map(q=>add(p.camera.pos,scale(sub(q,p.camera.pos),depth)));
 const projected=points.map(q=>project(v,c,q));
 if(projected.some(q=>!q))return null;
 return projected.map((q,i)=>q.map((n,j)=>{
  const b=p.uvs[i][j], a=opts.points[i];
  return b+(n-b)*(j===0?opts.x:opts.y)/100*a[j]/100+a[j+2]/100;
 }));
}
globalThis.FrontvexWindshieldGeometry={axes,local,world,cam,calibrate,project,compatible,tracking,adaptive};
})();
