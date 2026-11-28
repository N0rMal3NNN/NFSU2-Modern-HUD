(() => {
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const avg=a=>a.reduce((s,x)=>s+x,0)/a.length;
// Independent broad acquisition, no saved polygon required. Fit coherent dark-to-light contours, not individual black pixels.
function detect(image,excluded=[]){
 const {width:w,height:h,data}=image, lum=new Float32Array(w*h),bad=new Uint8Array(w*h);let lit=0;
 for(let i=0,j=0;i<lum.length;i++,j+=4){const r=data[j],g=data[j+1],b=data[j+2];lum[i]=.2126*r+.7152*g+.0722*b;if(lum[i]>32)lit++;if((g>210&&g>r*1.55&&g>b*1.15)||(b>215&&b>r*1.5&&g>155)||(r>190&&g>95&&b<r*.50)||(r>175&&g>75&&b>75&&r>g*1.35&&Math.abs(g-b)<35))bad[i]=1;}
 if(lit<lum.length*.07)return {reason:'Insufficient visible image'};
 const at=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<0||x>=w||y<0||y>=h||bad[y*w+x]||excluded.some(e=>x>=e[0]&&x<=e[2]&&y>=e[1]&&y<=e[3]))return NaN;return lum[y*w+x];};
 const med=a=>{a=a.filter(Number.isFinite).sort((a,b)=>a-b);return a.length?a[Math.floor(a.length/2)]:NaN;};
 function scan(axis,f,lo,hi,sign,kind){
  const n=axis==='y'?h:w,out=[];const start=sign>0?Math.floor(hi*n):Math.ceil(lo*n),end=sign>0?Math.ceil(lo*n):Math.floor(hi*n);
  for(let p=start;sign>0?p>=end:p<=end;p-=sign){
   const a=d=>kind==='roof'?med([at(f-2,p+d*sign),at(f-1,p+d*sign),at(f,p+d*sign),at(f+1,p+d*sign),at(f+2,p+d*sign)]):axis==='y'?at(f,p+d*sign):at(p+d*sign,f);
   const dark=[a(-2),a(-4),a(-6),a(-9),a(-12)],inside=[a(2),a(4),a(6),a(9)],d=med(dark),l=med(inside);
   if(dark.filter(Number.isFinite).length<3||inside.filter(Number.isFinite).length<3||!Number.isFinite(d+l))continue;
   const delta=l-d,rel=delta/(l+d+12),near=med([a(1),a(2),a(3)])-med([a(-1),a(-2),a(-3)]);
   if(delta<9||rel<.16||d>(kind==='bottom'?100:65)||l<19||!Number.isFinite(near)||near<3)continue;
   const darkSupport=dark.filter(x=>Number.isFinite(x)&&x<Math.min(kind==='bottom'?110:75,l*.78+4)).length/5;
   if(darkSupport<.6)continue;
   if(kind==='pillar'&&sign===1){const far=med([a(-12),a(-16),a(-20)]);if(d>39||!Number.isFinite(far)||far>Math.min(52,l*.75))continue;}
   if(kind==='roof'){if(l<32||d>42)continue;const far=[a(-16),a(-24),a(-32)].filter(Number.isFinite);if(far.length&&med(far)>Math.min(65,l*.72+5))continue;}
   const score=rel*24+Math.min(delta,60)*.25+Math.min(near,50)*.28+darkSupport*18-d*.12;
   // inside-out: favor the first coherent border, not the far side of a pillar.
   const distance=Math.abs(start-p)/n;out.push({x:f,y:p,s:score-distance*28});
  }
  // Non-maximum suppression keeps distinct candidate transitions.
  const best=[];for(const q of out.sort((a,b)=>b.s-a.s))if(best.every(p=>Math.abs(p.y-q.y)>4)){best.push(q);if(best.length===5)break;}return best;
 }
 function fit(axis,start,end,lo,hi,sign,kind,minSlope,maxSlope,nrows,anchor=null){
  const n=axis==='y'?w:h,m=axis==='y'?h:w,rows=[];
  for(let i=0;i<nrows;i++){const f=Math.round((start+(end-start)*(i+.5)/nrows)*n);rows.push(scan(axis,f,lo,hi,sign,kind));}
  const all=rows.flat(),tol=Math.max(2,m*.012);let best=null;
  // Deterministic subsampling of hypotheses; every scan row contributes to scoring.
  const seeds=all.filter((_,i)=>i%3===0);
  for(let i=0;i<seeds.length;i++)for(let j=i+1;j<seeds.length;j++){
   const a=seeds[i],b=seeds[j];if(b.x-a.x<n*(end-start)*.38)continue;
   const slope=(b.y-a.y)/(b.x-a.x);if(slope<minSlope||slope>maxSlope)continue;const intercept=a.y-slope*a.x;if(anchor&&Math.abs(slope*anchor[0]+intercept-anchor[1])>anchor[2])continue;let hits=[],score=0;
   for(const row of rows){let q=null,qs=-Infinity;for(const p of row){const e=Math.abs(p.y-slope*p.x-intercept);if(e>tol)continue;const z=p.s-e*3;if(z>qs){q=p;qs=z;}}if(q){hits.push(q);score+=qs+23;}}
   if(hits.length<Math.ceil(rows.length*.46)||hits.at(-1).x-hits[0].x<(end-start)*n*.58)continue;
   if(!best||score>best.score)best={hits,score};
  }
  if(!best)return null;const xs=avg(best.hits.map(p=>p.x)),ys=avg(best.hits.map(p=>p.y)),den=best.hits.reduce((s,p)=>s+(p.x-xs)**2,0);const a=den?best.hits.reduce((s,p)=>s+(p.x-xs)*(p.y-ys),0)/den:0,b=ys-a*xs;
  return {a,b,at:x=>a*x+b,coverage:best.hits.length/rows.length,hits:best.hits};
 }
 // Verify a roof boundary using sustained luminance across several pixels, not a one-pixel debug line.
 function roofRun(){const hits=[];for(let i=0;i<56;i++){const x=Math.round(w*(.36+.57*(i+.5)/56));const a=y=>med([at(x-2,y),at(x-1,y),at(x,y),at(x+1,y),at(x+2,y)]);for(let y=9;y<h*.36;y++){const above=[a(y-3),a(y-5),a(y-7),a(y-9)],below=[a(y+2),a(y+4),a(y+6),a(y+8)];const d=med(above),l=med(below);if(!Number.isFinite(d+l)||d>40||l<34||l-d<20||above.filter(q=>q<Math.min(48,l*.72)).length<3||below.filter(q=>q>d+14).length<3)continue;const earlier=med([a(y-12),a(y-19),a(y-26)]);if(Number.isFinite(earlier)&&earlier>40)continue;hits.push({x,y:y+1});break;}}
 let best=[];for(let i=0;i<hits.length;i++)for(let j=i+1;j<hits.length;j++){const a=hits[i],b=hits[j];if(b.x-a.x<w*.17)continue;const slope=(b.y-a.y)/(b.x-a.x);if(slope<-.32||slope>.24)continue;const set=hits.filter(p=>Math.abs(p.y-a.y-slope*(p.x-a.x))<=h*.014);if(set.length>best.length)best=set;}
 if(best.length<25)return null;const xs=avg(best.map(p=>p.x)),ys=avg(best.map(p=>p.y)),den=best.reduce((z,p)=>z+(p.x-xs)**2,0),a=den?best.reduce((z,p)=>z+(p.x-xs)*(p.y-ys),0)/den:0,b=ys-a*xs;return {a,b,at:x=>a*x+b,coverage:best.length/56,hits:best};}
 let top=roofRun()||fit('y',.36,.93,.005,.36,1,'roof',-.32,.24,56);
 if(!top&&[.50,.60,.7,.8,.9].filter(t=>med([at(w*t,2),at(w*t,5),at(w*t,9)])>25).length>=4)top={a:0,b:0,at:()=>0,coverage:.85,hits:[]};
 const bottomL=fit('y',.40,.63,.40,.70,-1,'bottom',-.65,.15,52);
 const bottomR=bottomL&&fit('y',.64,.98,clamp(bottomL.at(.63*w)/h-.06,.36,.65),.70,-1,'bottom',-.25,.42,60,[.63*w,bottomL.at(.63*w),h*.055]);
 
 if(!top||!bottomL||!bottomR)return {reason:(!top?'Roof':!bottomL?'Left dashboard':'Right dashboard')+' not confirmed'};
 const mid=.63*w,ty=top.at(mid),by=(bottomL.at(mid)+bottomR.at(mid))/2;
 if(by-ty<h*.18||by-ty>h*.76||Math.abs(bottomL.at(mid)-bottomR.at(mid))>h*.065)return {reason:'Inconsistent roof/dashboard geometry'};
 const start=clamp(ty/h+.045,.08,.43),end=clamp(by/h-.035,start+.10,.65);
 const left=fit('x',start,end,.12,.53,1,'pillar',.12,2.8,72);
 if(!left)return {reason:'Inner left pillar not confirmed'};
 const topL=fit('y',.32,.49,.005,.36,1,'roof',-.75,.30,34,[.49*w,top.at(.49*w),h*.04])||top;
 const corner=(line)=>{const y=(line.a*left.b+line.b)/(1-line.a*left.a);return [left.at(y),y];};
 let tl=corner(topL),bl=corner(bottomL);const tl2=corner(top);if(tl[0]<.15*w||tl[0]>.52*w||Math.abs(tl[1]-tl2[1])>h*.04)tl=tl2;
 let tx=.50*w;if(Math.abs(topL.a-top.a)>.035&&Math.abs(tl[1]-tl2[1])<h*.025)tx=clamp((top.b-topL.b)/(topL.a-top.a),tl[0]+w*.04,.62*w);
 let bx=.63*w;if(Math.abs(bottomL.a-bottomR.a)>.035)bx=clamp((bottomR.b-bottomL.b)/(bottomL.a-bottomR.a),bl[0]+w*.045,.78*w);
 let rt=[w,top.at(w)],rb=[w,bottomR.at(w)],viewportRight=true;
 const right=fit('x',start,end,.78,.985,-1,'pillar',-2.2,1.2,36);
 if(right&&right.coverage>=.85&&[.2,.4,.6,.8].filter(t=>{const y=(start+(end-start)*t)*h,x=right.at(y);return [at(x+7,y),at((x+w-2)/2,y),at(w-3,y)].every(q=>q<38);}).length>=3){const inter=l=>{const y=(l.a*right.b+l.b)/(1-l.a*right.a);return [right.at(y),y];};const a=inter(top),b=inter(bottomR);if(a[0]>.77*w&&b[0]>.77*w&&a[0]<.975*w&&b[0]<.975*w){rt=a;rb=b;viewportRight=false;}}
 const raw=[tl,[tx,top.at(tx)],rt,rb,[bx,(bottomL.at(bx)+bottomR.at(bx))/2],bl];
 if(raw.some(p=>!p.every(Number.isFinite))||tl[0]<.15*w||tl[0]>.42*w||bl[0]<tl[0]-.02*w||bl[0]>.62*w||tl[1]<-h*.08||bl[1]>h*.75||rt[1]>rb[1]||raw[4][1]<h*.35||raw[4][1]>h*.73)return {reason:'Implausible glass outline rejected'};
 const points=raw.map(p=>[clamp(p[0]/w,0,1),clamp(p[1]/h,0,1)]),confidence=avg([top.coverage,bottomL.coverage,bottomR.coverage,left.coverage]);
 return {points,confidence,viewportRight,counts:[top.coverage,bottomL.coverage,bottomR.coverage,left.coverage],samples:[...top.hits.map(p=>[p.x/w,p.y/h]),...bottomL.hits.map(p=>[p.x/w,p.y/h]),...bottomR.hits.map(p=>[p.x/w,p.y/h]),...left.hits.map(p=>[p.y/w,p.x/h])]};
}
// Small silhouette candidates near the mirror: mount above, hanging object below.
// Require a contrast-supported component; callers confirm persistence before accepting.
function attached(image,b,part,excluded=[]){
 const {width:w,height:h,data}=image,[l,t,r,d]=b.map((v,i)=>v*(i%2?h:w)),bw=r-l,bh=d-t;
 const x0=Math.max(2,Math.floor(l+bw*.12)),x1=Math.min(w-2,Math.ceil(l+bw*.85));
 const y0=Math.max(2,Math.floor(part==='mount'?t-bh*.65:d+bh*.12)),y1=Math.min(h-2,Math.ceil(part==='mount'?t+1:d+bh*1.6));
 if(x1<=x0||y1<=y0)return null;
 const at=(x,y)=>{const i=(y*w+x)*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2];};
 const seen=new Uint8Array(w*h),isDark=(x,y)=>!excluded.some(e=>x>=e[0]&&x<=e[2]&&y>=e[1]&&y<=e[3])&&at(x,y)<48;
 let best=null;
 for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){let k=y*w+x;if(seen[k]||!isDark(x,y))continue;seen[k]=1;const q=[k];let a=x,z=x,c=y,f=y;
 for(let j=0;j<q.length;j++){const xx=q[j]%w,yy=Math.floor(q[j]/w);a=Math.min(a,xx);z=Math.max(z,xx);c=Math.min(c,yy);f=Math.max(f,yy);for(const [nx,ny] of [[xx+1,yy],[xx-1,yy],[xx,yy+1],[xx,yy-1]]){const n=ny*w+nx;if(nx<x0||nx>=x1||ny<y0||ny>=y1||seen[n]||!isDark(nx,ny))continue;seen[n]=1;q.push(n);}}
 const ww=z-a+1,hh=f-c+1,fill=q.length/(ww*hh);if(ww<bw*.065||ww>bw*.45||hh<3||fill<.38||a===x0||z===x1-1||c===y0||part!=='mount'&&f===y1-1)continue;
 if(part==='mount'&&f<t-3)continue;if(part!=='mount'&&(hh<bh*.38||hh<ww*.65))continue;
 let edge=0,n=0;for(let yy=c;yy<=f;yy+=2){for(const xx of [a-2,z+2]){edge+=at(xx,yy)>55?1:0;n++;}}if(edge/Math.max(1,n)<.45)continue;
 const score=fill*.4+edge/n*.6;if(!best||score>best.score)best={score,box:[a/w,c/h,(z+1)/w,(f+1)/h]};
 }return best;
}
function same(a,b,t=.045){return a?.length===6&&b?.length===6&&a.every((p,i)=>Math.hypot(p[0]-b[i][0],p[1]-b[i][1])<=t);}
// Dense local refinement: six camera anchors remain compatible with older profiles.
function contour(image,pts,excluded=[],radius=3){
 const {width:w,height:h,data}=image,center=[avg(pts.map(p=>p[0])),avg(pts.map(p=>p[1]))],out=[];
 const at=(x,y)=>{x=Math.round(x);y=Math.round(y);if(x<1||y<1||x>=w-1||y>=h-1||excluded.some(b=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]))return NaN;const i=(y*w+x)*4;return .2126*data[i]+.7152*data[i+1]+.0722*data[i+2];};
 for(let i=0;i<6;i++){const a=pts[i],b=pts[(i+1)%6],dx=(b[0]-a[0])*w,dy=(b[1]-a[1])*h,L=Math.hypot(dx,dy),n=Math.max(4,Math.min(36,Math.round(L/7)));let nx=L>0?-dy/L:0,ny=L>0?dx/L:0;if((center[0]-a[0])*w*nx+(center[1]-a[1])*h*ny<0){nx=-nx;ny=-ny;}const shifts=[];
 for(let j=0;j<=n;j++){const t=j/n,x=a[0]*w+dx*t,y=a[1]*h+dy*t;let best=0,score=12;if(j&&j<n&&!(i===2&&a[0]>.98&&b[0]>.98))for(let s=-radius;s<=radius;s++){const f=d=>at(x+nx*(s+d),y+ny*(s+d));const d=[f(-2),f(-4),f(-6)],l=[f(2),f(4),f(6)];if(![...d,...l].every(Number.isFinite))continue;const u=avg(d),v=avg(l),delta=v-u;if(u>75||delta<12||delta/(v+u+12)<.2)continue;const q=delta*.6-Math.abs(s)*3;if(q>score){score=q;best=s;}}shifts.push(best);}
 const offsets=shifts.slice(0,-1).map((s,j)=>{const v=j===0?0:((shifts[j-1]+s+shifts[j+1])/3);return [j/n,nx*v/w,ny*v/h];});out.push(offsets);
 }return out;
}
function dense(pts,shape){if(!shape||pts?.length!==6)return pts;return shape.flatMap((edge,i)=>edge.map(([t,x,y])=>[pts[i][0]*(1-t)+pts[(i+1)%6][0]*t+x,pts[i][1]*(1-t)+pts[(i+1)%6][1]*t+y]));}

globalThis.FrontvexUniversal={detect,same,attached,contour,dense};
})();
