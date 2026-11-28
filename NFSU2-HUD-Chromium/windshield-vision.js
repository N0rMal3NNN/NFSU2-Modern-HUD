(() => {
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const mean=a=>a.reduce((s,x)=>s+x,0)/a.length;
const median=a=>a.slice().sort((x,y)=>x-y)[Math.floor(a.length/2)];
// A clipped boundary belongs to the viewport, not the car. Preserve the
// slopes of the adjacent top/bottom edges when intersecting x=1.
function rightMode(calibration,mode='auto'){
 return mode==='viewport'||(mode==='auto'&&calibration?.length===6&&[2,3].every(i=>calibration[i][0]>=.97));
}
function clipRight(points){
 if(!points||points.length!==6)return points;
 const out=points.map(q=>q.slice());
 for(const [i,j] of [[2,1],[3,4]]){
  const a=points[i],b=points[j],dx=a[0]-b[0];
  const y=Math.abs(dx)>.08?a[1]+(1-a[0])*(a[1]-b[1])/dx:a[1];
  out[i]=[1,clamp(y,0,1)];
 }
 return out;
}
function detect(image,prior,range=12,excluded=[],memory=null,options={}){
 const {width:w,height:h,data}=image, lum=new Float32Array(w*h), bad=new Uint8Array(w*h);let lo=0,hi=0;
 for(let i=0,j=0;i<lum.length;i++,j+=4){const r=data[j],g=data[j+1],b=data[j+2],v=.2126*r+.7152*g+.0722*b;lum[i]=v;if(v<10)lo++;if(v>38)hi++;if(options.tab&&((g>180&&g>r*1.55&&g>b*1.2)||(b>180&&b>r*1.6&&g>100)||(r>190&&g>90&&b<r*.45)||(r>170&&b>170&&g<r*.75)))bad[i]=1;}
 if(hi/lum.length<.025||lo/lum.length>.985)return {reason:'Frame blank or too dark'};
 const p=prior.map(q=>[q[0]*w,q[1]*h]),center=[mean(p.map(q=>q[0])),mean(p.map(q=>q[1]))];
 const sample=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<1||y<1||x>=w-1||y>=h-1||bad[y*w+x]||excluded.some(b=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]))return NaN;return lum[y*w+x];};
 const lines=[],scores=[],samples=[];let attempted=0;
 for(let i=0;i<p.length;i++){
  const a=p[i],b=p[(i+1)%p.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy);
  if(length<12){lines.push(null);continue;}
  let nx=-dy/length,ny=dx/length;if((center[0]-(a[0]+b[0])/2)*nx+(center[1]-(a[1]+b[1])/2)*ny<0){nx=-nx;ny=-ny;}
  // A viewport-clipped right edge is not a physical windshield boundary.
  if((i===2&&options.viewportRight)||(a[0]>=w*.985&&b[0]>=w*.985)){lines.push(null);continue;}
  const er=Math.max(2,Math.min(range,Math.round(i===2?w*.022:i===3||i===4?h*.045:w*.05))),count=clamp(Math.round(length/7),8,24),hits=[];attempted+=count;
  for(let k=0;k<count;k++){
   const t=.10+.80*(k+.5)/count,x=a[0]+dx*t,y=a[1]+dy*t;let best=null;
   const old=memory?.[i],expected=old?clamp(old.s0+(old.s1-old.s0)*t,-er,er):0;
   for(let s=-er;s<=er;s++){
    const at=d=>sample(x+nx*(s+d),y+ny*(s+d));
    const outside=[at(-3),at(-5),at(-8)],inside=[at(3),at(5),at(8)];if(![...outside,...inside].every(Number.isFinite))continue;
    const out=mean(outside),inn=mean(inside),delta=inn-out,relative=delta/(inn+out+18);
    // Interior is consistently dark relative to the glass. Bottom is stricter: headlights/hood can create false edges.
    if(out>Math.min(95,inn*.74+5)||delta<Math.max(10,inn*.15)||relative<.17||inn<20)continue;
    if(i===2&&(out>52||relative<.30))continue;
    if((i===3||i===4)&&(relative<.23||out>65))continue;
    const near=at(1.5)-at(-1.5),texture=Math.max(...outside)-Math.min(...outside);
    const score=delta*.36+relative*48+(Number.isFinite(near)?Math.max(0,near)*.25:0)-texture*.45-Math.abs(s)*1.4-Math.abs(s-expected)*(old?1.8:0);
    if(!best||score>best.score)best={t,s,score,x:x+nx*s,y:y+ny*s};
   }
   if(best)hits.push(best);
  }
  const minHits=Math.max(5,Math.ceil(count*(i===2?.72:.55)));if(hits.length<minHits){lines.push(null);continue;}
  let bestSet=[],bestError=Infinity;
  for(let j=0;j<hits.length;j++)for(let k=j+1;k<hits.length;k++){
   const u=hits[j],v=hits[k];if(v.t-u.t<.25)continue;const slope=(v.s-u.s)/(v.t-u.t);if(Math.abs(slope)>er*1.25)continue;const offset=u.s-slope*u.t;
   const set=hits.filter(q=>Math.abs(q.s-offset-slope*q.t)<=2);const error=set.reduce((z,q)=>z+Math.abs(q.s-offset-slope*q.t),0);
   if(set.length>bestSet.length||(set.length===bestSet.length&&error<bestError)){bestSet=set;bestError=error;}
  }
  if(bestSet.length<minHits||bestSet.at(-1).t-bestSet[0].t<.40){lines.push(null);continue;}
  const mt=mean(bestSet.map(q=>q.t)),ms=mean(bestSet.map(q=>q.s)),den=bestSet.reduce((z,q)=>z+(q.t-mt)**2,0),slope=den?bestSet.reduce((z,q)=>z+(q.t-mt)*(q.s-ms),0)/den:0;
  const s0=clamp(ms-slope*mt,-er,er),s1=clamp(ms+slope*(1-mt),-er,er);
  lines.push({nx,ny,s0,s1});scores.push(bestSet.length/count);samples.push(...bestSet.map(q=>[q.x/w,q.y/h]));
 }
 if(!scores.length)return {reason:'No reliable interior edges',edges:lines.map(Boolean),lines,samples,attempted};
 const result=p.map((q,i)=>{
  const a=lines[(i+p.length-1)%p.length],b=lines[i];let x=0,y=0;
  if(a&&b){const det=a.nx*b.ny-a.ny*b.nx;if(Math.abs(det)>.38){x=(a.s1*b.ny-a.ny*b.s0)/det;y=(a.nx*b.s0-a.s1*b.nx)/det;}else{x=(a.nx*a.s1+b.nx*b.s0)/2;y=(a.ny*a.s1+b.ny*b.s0)/2;}}
  else if(a){x=a.nx*a.s1;y=a.ny*a.s1;}else if(b){x=b.nx*b.s0;y=b.ny*b.s0;}
  const l=Math.hypot(x,y),f=l>range?range/l:1;if(q[0]>=w*.985&&!lines[2]&&(i===2||i===3))x=0;
  return [(q[0]+x*f)/w,(q[1]+y*f)/h];
 });
 return {points:result,edges:lines.map(Boolean),lines,samples,attempted,confidence:scores.reduce((a,b)=>a+b,0)/p.length};
}
// Optional mirror candidate: dark, horizontally elongated component fully inside the glass.
function mirror(image,prior,excluded=[]){
 const {width:w,height:h,data}=image;const minX=Math.min(...prior.map(p=>p[0])),maxX=Math.max(...prior.map(p=>p[0])),minY=Math.min(...prior.map(p=>p[1])),maxY=Math.max(...prior.map(p=>p[1]));const gw=maxX-minX,gh=maxY-minY;
 const x0=clamp(Math.floor((minX+gw*.38)*w),1,w-2),x1=clamp(Math.ceil((maxX-gw*.04)*w),x0+1,w-1),y0=clamp(Math.floor((minY+gh*.12)*h),1,h-2),y1=clamp(Math.ceil((minY+gh*.70)*h),y0+1,h-1);
 const inside=(x,y)=>{let b=false;for(let i=0,j=prior.length-1;i<prior.length;j=i++){const a=prior[i],c=prior[j];if((a[1]>y)!==(c[1]>y)&&x<(c[0]-a[0])*(y-a[1])/(c[1]-a[1])+a[0])b=!b;}return b;};
 const lum=(x,y)=>{const i=(y*w+x)*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2];};const seen=new Uint8Array(w*h);let best=null;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const n=y*w+x;if(seen[n]||lum(x,y)>42)continue;const q=[n];seen[n]=1;let l=x,r=x,t=y,b=y;for(let j=0;j<q.length;j++){const xx=q[j]%w,yy=Math.floor(q[j]/w);l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);for(const [nx,ny] of [[xx-1,yy],[xx+1,yy],[xx,yy-1],[xx,yy+1]]){const z=ny*w+nx;if(nx<x0||nx>=x1||ny<y0||ny>=y1||seen[z]||lum(nx,ny)>42)continue;seen[z]=1;q.push(z);}}
 const ww=r-l+1,hh=b-t+1,area=ww*hh;if(l<=x0+1||r>=x1-2||t<=y0+1||b>=y1-2||ww<gw*w*.12||ww>gw*w*.42||hh<gh*h*.09||hh>gh*h*.39||ww/hh<2||ww/hh>7||q.length/area<.23)continue;
 if(![[l,t],[r,t],[r,b],[l,b]].every(([xx,yy])=>inside(xx/w,yy/h))||excluded.some(e=>l<=e[2]&&r>=e[0]&&t<=e[3]&&b>=e[1]))continue;
 const surround=[];for(let xx=l;xx<=r;xx+=3){surround.push(lum(xx,t-2),lum(xx,b+2));}if(mean(surround)<48)continue;const score=ww/hh+q.length/area;if(!best||score>best.score)best={box:[l/w,t/h,(r+1)/w,(b+1)/h],score};
 }
 return best?.box||null;
}
// Per-vertex temporal state. Unsupported vertices hold briefly, then fade to geometry.
// Geometry is rendered on each animation frame; this only filters visual residuals.
function fastMotion(state,prior,w,h,now){
 if(!state?.prior)return false;
 const elapsed=Math.max(16,now-state.at),scale=100/Math.min(250,elapsed);
 return [0,1,2,5].some(i=>Math.hypot((prior[i][0]-state.prior[i][0])*w,(prior[i][1]-state.prior[i][1])*h)*scale>1.1);
}
function smooth(state,result,prior,w,h,now,range){
 const st=state||{offsets:prior.map(()=>[0,0]),seen:prior.map(()=>-Infinity),lines:[],at:now};
 const elapsed=Math.max(1,now-st.at),fast=fastMotion(st,prior,w,h,now);st.at=now;
 for(let i=0;i<prior.length;i++){
  const supported=result?.points&&(result.edges[i]||result.edges[(i+prior.length-1)%prior.length]);
  const responsive=fast&&[0,1,2,5].includes(i);
  if(supported){const target=result.points[i].map((v,j)=>v-prior[i][j]),old=st.offsets[i],dx=(target[0]-old[0])*w,dy=(target[1]-old[1])*h,len=Math.hypot(dx,dy),cap=Math.max(1.5,range*(responsive?.85:.30))*Math.max(1,elapsed/100),f=len>0?Math.min(1,cap/len):1,gain=responsive?.90:(1-Math.exp(-Math.max(75,elapsed)/175));st.offsets[i]=old.map((v,j)=>v+(target[j]-v)*f*gain);st.seen[i]=now;}
  else if(now-st.seen[i]>700||responsive)st.offsets[i]=st.offsets[i].map(v=>v*Math.exp(-elapsed/(responsive?150:420)));
 }
 if(result?.lines)st.lines=result.lines.map((l,i)=>l||(!fast&&now-Math.max(st.seen[i],st.seen[(i+1)%prior.length])<700?st.lines[i]:null));else if(fast||st.seen.every(t=>now-t>700))st.lines=[];
 st.prior=prior.map(q=>q.slice());return st;
}
globalThis.FrontvexWindshieldVision={detect,mirror,smooth,rightMode,clipRight,fastMotion};
})();
