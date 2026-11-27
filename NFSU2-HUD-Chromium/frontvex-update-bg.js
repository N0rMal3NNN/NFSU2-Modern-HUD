/* Public desktop update metadata only. No code installation or Frontvex identity access. */
'use strict';
const fvxUpdate=(()=>{
 const ROOT='https://github.com/N0rMal3NNN/NFSU2-Modern-HUD';
 const META='https://raw.githubusercontent.com/N0rMal3NNN/NFSU2-Modern-HUD/main/version.json';
 const DOWNLOAD=ROOT+'/raw/refs/heads/main/downloads/NFSU2_Modern_HUD_LATEST_Chromium.zip';
 const NOTES=ROOT+'/blob/main/CHANGELOG.md';
 const KEY='nfsu2FrontvexPublicUpdateV1', PERIOD=30*60*1000, MANUAL=60*1000;
 const valid=v=>typeof v==='string'&&/^(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})\.(0|[1-9]\d{0,4})$/.test(v);
 function newer(a,b){if(!valid(a)||!valid(b))return false;const x=a.split('.').map(Number),y=b.split('.').map(Number);for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i];}return false;}
 function normalize(j){if(j?.schema!==1||!valid(j?.desktopPublic?.version))throw Error('BAD_METADATA');const v=j.desktopPublic;return {version:v.version,releasedAt:typeof v.releasedAt==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v.releasedAt)?v.releasedAt:''};}
 let queue=Promise.resolve();
 async function run(force){
  const installed=chrome.runtime.getManifest().version,now=Date.now();
  const saved=(await chrome.storage.local.get(KEY))[KEY]||{};
  let cached=valid(saved.latest?.version)?saved.latest:null,checkedAt=Number(saved.checkedAt)||0,attempt=Number(saved.attempt)||0,notified=valid(saved.notified)?saved.notified:'',failed=saved.failed===true;
  if(attempt>now||checkedAt>now){attempt=0;checkedAt=0;}
  const interval=force||failed?MANUAL:PERIOD;
  if(!attempt||now-attempt>=interval){
   attempt=now;
   try{const r=await fetch(META,{credentials:'omit',cache:'no-store',redirect:'error',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000)});if(!r.ok)throw Error('HTTP');const raw=await r.text();if(raw.length>8192)throw Error('TOO_LARGE');cached=normalize(JSON.parse(raw));checkedAt=Date.now();failed=false;}catch{failed=true;}
  }
  const available=!!cached&&newer(cached.version,installed);
  const announce=!failed&&available&&notified!==cached.version;
  if(announce)notified=cached.version;
  // One serialized claim per browser profile, including multiple game tabs.
  await chrome.storage.local.set({[KEY]:{latest:cached,checkedAt,attempt,failed,notified}});
  return {ok:!failed&&!!cached,installed,latest:cached,checkedAt,available,announce,retryIn:Math.max(0,MANUAL-(Date.now()-attempt))};
 }
 function check(force){const task=queue.then(()=>run(force));queue=task.catch(()=>{});return task;}
 function open(which){if(which!=='download'&&which!=='notes')return Promise.resolve({ok:false});return chrome.tabs.create({url:which==='download'?DOWNLOAD:NOTES,active:true}).then(()=>({ok:true}));}
 return Object.freeze({check,open});
})();
