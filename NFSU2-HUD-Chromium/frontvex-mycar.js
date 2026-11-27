/* Frontvex My Car — read-only, manually armed performance tests. */
(()=>{
'use strict';
const STOP=0.5/3.6, S100=100/3.6, S200=200/3.6, MILE=402.336, PREFIX='nfsu2MyCarV1:';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const fields=['zero100','zero200','hundred200','quarter','brake100','max'];
function sample(m,id){
 if(!id?.signature||m?.car!==true||m.state?.driving!==true||m.state?.paused||m.state?.menu||m.state?.replay||m.state?.autopilot||m.state?.photo||m.state?.drone||m.state?.skate||m.state?.finished||m.state?.countdown)return null;
 if(![m.frame,m.time,m.speed,m.speedFwd,m.distance,m.events?.nitrousStarts,m.events?.shiftsUp,m.events?.shiftsDown,m.events?.impacts,m.events?.landings,m.brake].every(finite)||m.speed<0||m.speed>250||m.distance<0||m.time<0)return null;
 return {id:id.signature,model:id.raw,odoModel:id.model,owned:!!id.carKey,key:id.id||id.signature,t:m.time,f:m.frame,s:m.speed,forward:m.speedFwd,d:m.distance,n:m.events.nitrousStarts,on:m.nitrousOn===true,up:m.events.shiftsUp,down:m.events.shiftsDown,hit:m.events.impacts,jump:m.events.landings,landingAir:finite(m.events.landingAir)&&m.events.landingAir>=0?m.events.landingAir:null,brake:m.brake,air:m.airborne===true,pos:Array.isArray(m.pos)&&m.pos.length===3&&m.pos.every(finite)?m.pos.slice():null};
}
function cross(a,b,key,value){const v=b[key]-a[key];const q=v?Math.max(0,Math.min(1,(value-a[key])/v)):0;return {t:a.t+q*(b.t-a.t),d:a.d+q*(b.d-a.d)};}
function createEngine(onFinish,onChange=()=>{}){
 let phase='idle',prev=null,base=null,run=null,stop=null,braking=null,up100=null,reason='',turbo='unknown';
 function set(p,msg=''){phase=p;reason=msg;onChange();}
 function cancel(msg='Test cancelled.'){prev=base=run=stop=braking=up100=null;set('idle',msg);}
 function arm(s,setup='unknown'){if(!s||s.s>STOP||s.air)return false;turbo=setup==='yes'||setup==='no'?setup:'unknown';prev=s;base=null;run=null;stop=null;braking=up100=null;set('armed','Ready — drive forward to begin.');return true;}
 function begin(a,b){base=a;run={zero100:null,zero200:null,hundred200:null,quarter:null,brake100:null,max:a.s,nitro:a.on||b.on||b.n>a.n,nitroCount:0};set('running','Measuring…');}
 function resultAt(s){const elapsed=s.t-base.t,distance=Math.max(0,s.d-base.d);return {model:base.model,key:base.key,owned:base.owned,turbo,at:Date.now(),elapsed,distance,average:elapsed>0?distance/elapsed*3.6:0,max:run.max*3.6,zero100:run.zero100,zero200:run.zero200,hundred200:run.hundred200,quarter:run.quarter,brake100:run.brake100,nitro:run.nitro,nitroCount:Math.max(0,s.n-base.n),shiftsUp:s.up-base.up,shiftsDown:s.down-base.down,impacts:s.hit-base.hit,jumps:s.jump-base.jump};}
 function finish(r){prev=base=run=stop=braking=up100=null;set('idle','Test complete.');onFinish(r);}
 function feed(s){if(phase==='idle')return;if(!s){cancel('Test interrupted — driving feed unavailable. Start again.');return;}const a=prev;if(s.id!==a.id){cancel('Vehicle changed. Start again.');return;}if(s.f===a.f)return;
  const dt=s.t-a.t,dd=s.d-a.d;
  if(s.f<a.f||dt<=0||dt>0.5||dd<0||s.n<a.n||s.up<a.up||s.down<a.down||s.hit<a.hit||s.jump<a.jump){cancel('Telemetry interrupted or reset. Start again.');return;}
  if(s.pos&&a.pos&&Math.hypot(...s.pos.map((v,i)=>v-a.pos[i]))>dd+8){cancel('Vehicle position reset. Start again.');return;}
  prev=s;
  if(s.forward < -STOP){cancel('Reverse detected. Start again.');return;}
  if(phase==='armed'){if(s.s<=STOP||s.air)return;begin(a,s);}
  run.max=Math.max(run.max,s.s);run.nitro=run.nitro||s.on||s.n>base.n;
  if(a.s<S100&&s.s>=S100){const c=cross(a,s,'s',S100);if(run.zero100===null)run.zero100=c.t-base.t;up100=c.t;}
  if(a.s<S200&&s.s>=S200){const c=cross(a,s,'s',S200);if(run.zero200===null)run.zero200=c.t-base.t;if(up100!==null&&c.t>=up100&&run.hundred200===null)run.hundred200=c.t-up100;}
  if(s.s<S100)up100=null;
  if(run.quarter===null&&a.d<base.d+MILE&&s.d>=base.d+MILE)run.quarter=cross(a,s,'d',base.d+MILE).t-base.t;
  if(a.s>=S100&&s.s<S100&&s.brake>0.05&&!s.air)braking=cross(a,s,'s',S100);
  if(braking&&(s.brake<=0.05&&s.s>STOP||s.air||s.s>a.s+0.25))braking=null;
  if(s.s<=STOP&&!s.air){
   if(!stop){const c=cross(a,s,'s',STOP);if(braking&&run.brake100===null)run.brake100=Math.max(0,c.d-braking.d);stop={at:c.t,result:resultAt({...s,...c})};}
   if(s.t-stop.at>=1){if(stop.result.elapsed>=0.5&&stop.result.distance>=1)finish(stop.result);else cancel('Test too short. Start again.');}
  }else stop=null;
 }
 return Object.freeze({arm,feed,cancel,get phase(){return phase;},get reason(){return reason;}});
}
function categoryFor(r){const n=r.nitro?'nitro':'noNitro';return r.turbo==='yes'?n+'Turbo':r.turbo==='no'?n+'NoTurbo':n;}
function turboLabel(r){return r?.turbo==='yes'?'YES (manual)':r?.turbo==='no'?'NO (manual)':'Unknown (legacy)';}
function merge(old,r){const best={...(old?.best||{})},category=categoryFor(r),b={...(best[category]||{})};for(const k of fields){const n=r[k];if(!finite(n)||n<0)continue;if(!finite(b[k])||(k==='max'?n>b[k]:n<b[k]))b[k]=n;}best[category]=b;return {latest:!old?.latest||r.at>=old.latest.at?r:old.latest,best};}
const time=n=>finite(n)?n.toFixed(3)+' s':'—',speed=n=>finite(n)?n.toFixed(1)+' km/h':'—',metres=n=>finite(n)?n.toFixed(1)+' m':'—';
function metrics(r){return [['0–100 km/h',time(r?.zero100)],['0–200 km/h',time(r?.zero200)],['100–200 km/h',time(r?.hundred200)],['¼ Mile',time(r?.quarter)],['Top Speed',speed(r?.max)],['100–0 km/h',metres(r?.brake100)]];}
function mount(root,storage,opts){
 const doc=root.ownerDocument;const get=k=>root.querySelector('[data-mycar="'+k+'"]');const button=get('start'),cancelBtn=get('cancel'),retry=get('retry'),status=get('status'),car=get('car'),odo=get('odo'),latest=get('latest'),best=get('best'),mode=get('mode'),turboChoice=get('turbo-choice');
 let current=null,currentAt=0,lastRender=0,records=null,loadedKey='',ready=false,loadSeq=0,pending=null,saving=false,error='',hudTimer=0,active=false;
 const hud=doc.createElement('div');hud.id='nfsu2-mycar-results-root';hud.style.cssText='position:fixed;top:clamp(28px,8vh,90px);left:50%;transform:translateX(-50%);width:min(320px,90vw);z-index:2147483646;pointer-events:none;display:none';const shadow=hud.attachShadow({mode:'closed'}),style=doc.createElement('style');style.textContent=':host{all:initial;pointer-events:none} .result{box-sizing:border-box;background:rgba(9,20,28,.96);border:1px solid #59c8ba;border-radius:14px;padding:12px 16px;color:#e5f5f6;font:600 12px/1.35 system-ui,sans-serif;box-shadow:0 6px 26px #0008} h3{color:#69e5ca;font-size:15px;margin:0 0 8px} .line{display:flex;justify-content:space-between;gap:10px;margin:3px 0}.line span{color:#abc3ca}.line b{font-variant-numeric:tabular-nums}.note{margin-top:7px;color:#b8d9df;font-size:11px}';shadow.append(style);const panel=doc.createElement('div');panel.className='result';shadow.append(panel);(doc.documentElement||doc.body).append(hud);
 function rows(el,pairs){el.replaceChildren();for(const [l,v] of pairs){const line=doc.createElement('div'),a=doc.createElement('span'),b=doc.createElement('b');line.className='line';a.textContent=l;b.textContent=v;line.append(a,b);el.append(line);}}
 function toast(r){clearTimeout(hudTimer);panel.replaceChildren();const h=doc.createElement('h3');h.textContent='PERFORMANCE TEST COMPLETE';panel.append(h);const values=doc.createElement('div');rows(values,[['Vehicle',r.model],...metrics(r),['Turbo installed',turboLabel(r)],['Nitro used',r.nitro?'YES':'NO']]);panel.append(values);const note=doc.createElement('div');note.className='note';note.textContent='Open My Car to view results.';panel.append(note);hud.style.display='block';hudTimer=setTimeout(()=>hud.style.display='none',7000);}
 const stats=globalThis.__frontvexDrivingStats.mount(root,storage,opts);
 const perfTab=get('tab-performance'),statsTab=get('tab-stats'),perfPage=get('page-performance'),statsPage=get('page-stats');
 function selectTab(which){const isStats=which==='stats';perfTab.setAttribute('aria-selected',String(!isStats));statsTab.setAttribute('aria-selected',String(isStats));perfPage.hidden=isStats;statsPage.hidden=!isStats;const scroll=root.closest(".fv-sub");if(scroll)scroll.scrollTop=0;if(isStats)stats.render();}
 perfTab.addEventListener('click',e=>{if(e.isTrusted)selectTab('performance');});statsTab.addEventListener('click',e=>{if(e.isTrusted)selectTab('stats');});
 function render(){const fresh=current&&performance.now()-currentAt<1000;car.textContent=current?current.model+(current.owned?' · Owned vehicle':' · Stock model'):records?.latest?'Last vehicle: '+records.latest.model:'No vehicle feed';const km=opts.odo(current);odo.textContent=finite(km)?km.toFixed(1)+' km':'—';turboChoice.disabled=engine.phase!=='idle';button.disabled=!['yes','no'].includes(turboChoice.value)||!fresh||current.s>STOP||current.air||engine.phase!=='idle'||!ready||!!pending||saving;cancelBtn.hidden=engine.phase==='idle';retry.hidden=!pending||saving;status.textContent=error|| (engine.phase!=='idle'?engine.reason:saving?'Saving result…':pending?'Result not saved. Retry save.':!fresh?'Waiting for driving feed.':!ready?'Loading local results…':current.s>STOP?'Stop the vehicle to start a test.':!['yes','no'].includes(turboChoice.value)?'Select whether Turbo is installed.':engine.reason||'Ready for a performance test.');const r=records?.latest;rows(latest,r?[...metrics(r),['Turbo installed',turboLabel(r)],['Nitro used',r.nitro?'YES':'NO'],['Nitro activations',String(r.nitroCount)],['Test time',time(r.elapsed)],['Test distance',metres(r.distance)],['Average speed',speed(r.average)],['Saved',new Date(r.at).toLocaleString()]]:[['No recorded test','—']]);const b=records?.best?.[mode.value];rows(best,b?metrics(b):[['No personal best','—']]);}
 async function load(key){const seq=++loadSeq;loadedKey=key;ready=false;records=null;turboChoice.value='';error='';if(!key){render();return;}try{const value=(await storage.get(PREFIX+key))[PREFIX+key];if(seq!==loadSeq)return;records=value||null;ready=true;turboChoice.value=['yes','no'].includes(records?.latest?.turbo)?records.latest.turbo:'';if(records?.latest)mode.value=categoryFor(records.latest);}catch{if(seq!==loadSeq)return;error='Storage unavailable. Reload the game tab.';}render();}
 async function save(){if(!pending||saving)return;const r=pending;saving=true;error='';render();try{const key=PREFIX+r.key;const old=(await storage.get(key))[key];const next=merge(old,r);await storage.set({[key]:next});if(loadedKey===r.key){records=next;ready=true;mode.value=categoryFor(r);}pending=null;}catch{error='Result not saved. Retry save or reload if extension storage is disconnected.';}finally{saving=false;render();}}
 const engine=createEngine(r=>{pending=r;toast(r);void save();},()=>render());
 button.addEventListener('click',e=>{if(!e.isTrusted||button.disabled||!current||performance.now()-currentAt>=1000)return;if(engine.arm(current,turboChoice.value)){hud.style.display='none';opts.close();}});cancelBtn.addEventListener('click',e=>{if(e.isTrusted)engine.cancel();});retry.addEventListener('click',e=>{if(e.isTrusted)void save();});mode.addEventListener('change',render);turboChoice.addEventListener('change',render);
 storage.onChanged((changes,area)=>{if(area==='local'&&loadedKey&&changes[PREFIX+loadedKey]){records=changes[PREFIX+loadedKey].newValue||null;ready=true;render();}});
 function feed(m,id){const s=sample(m,id);stats.feed(doc.hidden?null:s);current=s;currentAt=performance.now();if(engine.phase!=='idle')engine.feed(s);const key=s?.key||'';if(key&&key!==loadedKey)void load(key);if(active&&opts.isVisible()&&currentAt-lastRender>500){lastRender=currentAt;render();}}
 const watchdog=setInterval(()=>{if(engine.phase!=='idle'&&performance.now()-currentAt>=1000)engine.cancel('Car Feed stopped. Start again.');if(active&&opts.isVisible())render();},500);
 doc.addEventListener('visibilitychange',()=>{if(doc.hidden){stats.feed(null);void stats.flush();if(engine.phase!=='idle')engine.cancel('Game tab hidden. Start again.');}});window.addEventListener('pagehide',()=>{clearInterval(watchdog);clearTimeout(hudTimer);},{once:true});render();return Object.freeze({feed,show(){active=true;render();stats.render();},hide(){active=false;}});
}
Object.defineProperty(globalThis,'__frontvexMyCar',{value:Object.freeze({mount,createEngine,sample,merge}),writable:false,configurable:false});
})();
