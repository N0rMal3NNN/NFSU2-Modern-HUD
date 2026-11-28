/* v0.11.79: read-only synchronized feed, local audio, independent from glass rendering. */
(()=>{'use strict';
const KEY='frontvexInteriorRainRoofAudioV1',clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const G=globalThis.FrontvexWindshieldGeometry;
const BOOST=1.10;
function peakLimit(b){let peak=0;for(let c=0;c<b.numberOfChannels;c++){const a=b.getChannelData(c);for(let i=0;i<a.length;i++)peak=Math.max(peak,Math.abs(a[i]));}return peak>0?Math.min(BOOST,.98/peak):BOOST;}
function fadeDuration(from,to){return to>from?1.35:2.4;}
function target(s,p,now,preview,hidden){
 if(hidden||!s.enabled||!s.volume)return 0;
 if(now<preview)return clamp(s.volume/100,0,1)*BOOST;
 if(!p||now-p.at>1800)return 0;
 const {c,v}=p,st=c.state||{};
 if(c.car!==true||st.driving===false||st.world===false||st.paused||st.menu||st.photo||st.drone||st.replay||st.skate||st.cutscene||st.autopilot)return 0;
 if(s.cockpit){try{const a=G.cam(v,c);if(!(Math.abs(a.pos[1])<1.2&&a.pos[2]>.25&&a.pos[2]<2&&Math.abs(a.pos[0])<2&&a.forward[0]>.85))return 0;}catch(_){return 0;}}
 const rain=clamp(Number(v.rain)||0,0,1);return rain>.002?clamp(s.volume/100,0,1)*BOOST*(s.dynamic?Math.pow(rain,1.25):1):0;
}
function mount({settings,storage,feedOwner,status}){
 let ctx=null,gain=null,buffer=null,source=null,pair=null,preview=0,timer=0,owned=false,zeroAt=0,lastGain=-1,closed=false,loading=false,errorMessage="",fileName='',lastStatus='',maxBoost=BOOST,fade={from:0,to:0,at:0,duration:0};
 const cars=new Map(),views=new Map();
 function report(t){if(t!==lastStatus){lastStatus=t;status(t);}}
 function audio(){if(!ctx){const C=globalThis.AudioContext||globalThis.webkitAudioContext;if(!C)throw Error('Web Audio unavailable');ctx=new C();gain=ctx.createGain();gain.gain.value=0;gain.connect(ctx.destination);}return ctx;}
 async function unlock(){try{await audio().resume();}catch(_){}}
 function stop(){if(source){try{source.stop();}catch(_){}source.disconnect();source=null;}if(gain&&ctx){gain.gain.cancelScheduledValues(ctx.currentTime);gain.gain.value=0;}lastGain=-1;zeroAt=0;fade={from:0,to:0,at:0,duration:0};}
 function start(){if(source||!buffer||ctx?.state!=='running')return;source=ctx.createBufferSource();source.buffer=buffer;source.loop=true;source.connect(gain);source.start();}
 function update(){if(closed)return;const s=settings(),now=performance.now(),want=!!s.enabled&&!!buffer;if(owned!==want){owned=want;feedOwner(want);if(!want){pair=null;cars.clear();views.clear();}}if(!s.enabled)preview=0;
 const t=target(s,pair,now,preview,document.visibilityState==='hidden')*maxBoost/BOOST;
 if(!buffer){if(!loading)report(errorMessage||'Built-in roof sound unavailable.');return;}
 if(t>0){zeroAt=0;if(ctx?.state!=='running'){report('Click the game or Preview to enable sound.');return;}start();}
 if(source&&(Math.abs(t-lastGain)>.003||(t===0&&lastGain!==0))){const at=ctx.currentTime,frac=fade.duration?clamp((at-fade.at)/fade.duration,0,1):1,current=fade.from+(fade.to-fade.from)*frac,duration=s.fade?fadeDuration(current,t):.015;gain.gain.cancelScheduledValues(at);gain.gain.setValueAtTime(current,at);gain.gain.linearRampToValueAtTime(t,at+duration);fade={from:current,to:t,at,duration};lastGain=t;}
 if(!t&&source){if(!zeroAt)zeroAt=now;if(!s.fade||now-zeroAt>=2500)stop();}
 report((loading?'Loading…':!s.enabled?'Off':now<preview?'Preview':t>0?'Playing · '+Math.round(t*100)+'%':source?'Fading out':'Ready · waiting for rain / cockpit')+' · '+fileName);
 }
 const valid=(a,n)=>Array.isArray(a)&&a.length===n&&a.every(Number.isFinite);
 function onMessage(e){if(!owned||e.source!==window||e.origin!==location.origin||!e.data)return;const m=e.data;if(m.nfsu2==='car'&&(m.car!==true||m.state?.driving===false||m.state?.paused===true||m.state?.menu)){pair=null;cars.clear();views.clear();return;}
 if(!Number.isSafeInteger(m.frame))return;let a,b;if(m.nfsu2==='view'&&valid(m.view,16)&&valid(m.proj,16)){a=views;b=cars;}else if(m.nfsu2==='car'&&m.car===true&&valid(m.pos,3)&&[m.yaw,m.pitch,m.roll].every(Number.isFinite)){a=cars;b=views;}else return;
 a.set(m.frame,m);while(a.size>16)a.delete(a.keys().next().value);const now=performance.now();if(b.has(m.frame)&&(!pair||m.frame>pair.v.frame||now-pair.at>750))pair={c:cars.get(m.frame),v:views.get(m.frame),at:now};}
 function b64(bytes){let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);}
 function encode(b){const rate=24000,n=Math.max(1,Math.round(b.duration*rate)),channels=Math.min(2,b.numberOfChannels),bytes=new Uint8Array(n*channels*2),dv=new DataView(bytes.buffer);for(let c=0;c<channels;c++){const a=b.getChannelData(c);for(let i=0;i<n;i++){const p=i*b.sampleRate/rate,j=Math.min(a.length-1,Math.floor(p)),f=p-j,x=a[j]*(1-f)+a[Math.min(j+1,a.length-1)]*f;dv.setInt16((i*channels+c)*2,Math.round(clamp(x,-1,1)*32767),true);}}return {rate,n,channels,pcm:b64(bytes)};}
 function decode(o){if(!o||o.rate!==24000||!Number.isInteger(o.n)||o.n<1||o.n>24000*40||![1,2].includes(o.channels)||typeof o.pcm!=='string')throw Error('Invalid stored audio');const str=atob(o.pcm);if(str.length!==o.n*o.channels*2)throw Error('Invalid stored audio length');const a=audio().createBuffer(o.channels,o.n,o.rate);for(let c=0;c<o.channels;c++){const d=a.getChannelData(c);for(let i=0;i<o.n;i++){const p=(i*o.channels+c)*2;let x=str.charCodeAt(p)|(str.charCodeAt(p+1)<<8);if(x>=32768)x-=65536;d[i]=x/32768;}}return a;}
 async function load(file){if(!file||loading)return;loading=true;errorMessage="";report('Importing local audio…');try{if(file.size>20*1024*1024)throw Error('Choose an audio file under 20 MB');void unlock();const b=await audio().decodeAudioData(await file.arrayBuffer());if(b.duration<1||b.duration>40)throw Error('Choose a 1–40 second loop');const o={...encode(b),name:file.name.slice(0,160)};const next=decode(o);await storage.set({[KEY]:o});stop();buffer=next;maxBoost=peakLimit(buffer);fileName=o.name;report('Audio saved locally · '+fileName);}catch(e){errorMessage='Import failed: '+(e.message||e);report(errorMessage);return false;}finally{loading=false;}update();return true;}
 async function restore(){loading=true;try{try{const o=(await storage.get(KEY))[KEY];if(o){buffer=decode(o);fileName=String(o.name||'Roof rain');}}catch(_){}if(!buffer){const asset=globalThis.FrontvexRoofRainAsset;if(typeof asset!=='string'||!asset)throw Error('Built-in asset missing');const bytes=Uint8Array.from(atob(asset),c=>c.charCodeAt(0));buffer=await audio().decodeAudioData(bytes.buffer);fileName='Rain Inside Car — Roof (built-in)';}maxBoost=peakLimit(buffer);errorMessage='';}catch(e){errorMessage='Could not restore audio: '+e.message;report(errorMessage);}finally{loading=false;}update();}
 function gesture(){if((buffer||loading)&&ctx?.state!=='running')void unlock();}
 function cleanup(){closed=true;clearInterval(timer);stop();if(owned)feedOwner(false);window.removeEventListener('message',onMessage);window.removeEventListener('pointerdown',gesture,true);window.removeEventListener('keydown',gesture,true);document.removeEventListener('visibilitychange',update);ctx?.close().catch(()=>{});}
 window.addEventListener('message',onMessage);window.addEventListener('pointerdown',gesture,true);window.addEventListener('keydown',gesture,true);document.addEventListener('visibilitychange',update);window.addEventListener('pagehide',cleanup,{once:true});timer=setInterval(update,200);void restore();
 return {sync:update,load,preview:async()=>{if(!settings().enabled){report('Enable Interior Rain Audio first.');return;}if(!buffer){report('Roof audio is not ready yet.');return;}await unlock();preview=performance.now()+10000;update();},stopPreview:()=>{preview=0;update();}};
}
globalThis.FrontvexInteriorRainAudio={mount,target,peakLimit,fadeDuration};})();
