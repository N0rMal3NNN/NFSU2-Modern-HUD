/* Frontvex Software Update: public Chromium channel. */
(()=>{
'use strict';
function mount(root,home,notifications){
 const doc=root.ownerDocument,installed=chrome.runtime.getManifest().version;
 const badge=home.querySelector('[data-app="updates"] .fv-notification-badge');
 const title=root.querySelector('[data-update="title"]'),description=root.querySelector('[data-update="description"]'),current=root.querySelector('[data-update="installed"]'),latest=root.querySelector('[data-update="latest"]'),date=root.querySelector('[data-update="date"]'),checked=root.querySelector('[data-update="checked"]'),manual=root.querySelector('[data-update="check"]'),download=root.querySelector('[data-update="download"]'),notes=root.querySelector('[data-update="notes"]');
 let result=null,busy=false,ended=false,interval=0,manualTimer=0;
 current.textContent='v'+installed;
 function render(){
  const available=!!result?.available;
  badge.hidden=!available;badge.textContent=available?'!':'';
  title.textContent=busy?'Checking for updates…':available?'New version released':result?.ok?'Your software is up to date':'Unable to check for updates';
  description.textContent=available?'Please update your extension to enjoy the latest features.' : result?.ok?'You are running the latest public desktop version.':'Check your connection and try again.';
  if(result?.ok===false&&available)description.textContent+=' Last check failed; showing the last known version.';
  latest.textContent=result?.latest?.version?'v'+result.latest.version:'—';
  date.textContent=result?.latest?.releasedAt||'—';
  checked.textContent=result?.checkedAt?new Date(result.checkedAt).toLocaleString():'—';
  download.hidden=!available;download.disabled=busy;manual.disabled=busy||!!manualTimer;
  manual.textContent=busy?'Checking…':manualTimer?'Check again in a moment':'Check for Updates';
 }
 async function check(force=false){if(busy||ended)return;busy=true;render();try{const r=await chrome.runtime.sendMessage({type:'frontvex-update-check-v1',manual:force});if(ended)return;if(!r||typeof r.installed!=='string')throw Error('Unavailable');result=r;if(r.announce)void notifications.softwareUpdate(r.latest.version);if(force&&r.retryIn>0){clearTimeout(manualTimer);manualTimer=setTimeout(()=>{manualTimer=0;render();},r.retryIn);}}catch{result={...result,ok:false};}finally{busy=false;if(!ended)render();}}
 async function open(which){try{const r=await chrome.runtime.sendMessage({type:'frontvex-update-open-v1',which});if(!r?.ok)throw Error();}catch{description.textContent='Unable to open GitHub. Please visit the project page manually.';}}
 manual.addEventListener('click',e=>{if(e.isTrusted)void check(true);});download.addEventListener('click',e=>{if(e.isTrusted&&result?.available)void open('download');});notes.addEventListener('click',e=>{if(e.isTrusted)void open('notes');});
 window.addEventListener('pagehide',()=>{ended=true;clearInterval(interval);clearTimeout(manualTimer);},{once:true});
 render();void check();interval=setInterval(()=>void check(),30*60*1000);
 return Object.freeze({show:render});
}
Object.defineProperty(globalThis,'__frontvexUpdates',{value:Object.freeze({mount}),writable:false,configurable:false});
})();
