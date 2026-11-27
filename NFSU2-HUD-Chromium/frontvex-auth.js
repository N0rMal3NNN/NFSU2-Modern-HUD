/* Embedded official Frontvex verification. No navigation or Turnstile bypass. */
(()=>{
  'use strict';
  if(location.origin!=='https://auth.frontvex.com'||location.pathname!=='/register'||window.top===window)return;
  const nonce=new URL(location.href).searchParams.get('nonce');if(!/^[a-f0-9]{64}$/.test(nonce||''))return;
  const b=document.getElementById('fvx-continue'),status=document.getElementById('fvx-status');if(!b||!status)return;
  b.disabled=true;
  async function ready(){
    try{let r;for(let i=0;i<10;i++){r=await chrome.runtime.sendMessage({type:'frontvex-auth-ready-v4',nonce});if(r?.code!=='BUSY')break;await new Promise(resolve=>setTimeout(resolve,300));}
      if(!r?.ok){status.textContent='Verification session unavailable. Close the popup and retry.';return;}
      status.textContent='Complete verification, then select Continue to Frontvex.';b.disabled=false;
    }catch{status.textContent='Extension unavailable. Close the popup and retry.';}
  }
  b.addEventListener('click',async()=>{
    const token=document.querySelector('[name="cf-turnstile-response"]')?.value;
    if(!token){status.textContent='Complete the security verification first.';return;}
    b.disabled=true;status.textContent='Checking reservation…';
    try{const r=await chrome.runtime.sendMessage({type:'frontvex-auth-proof-v2',nonce,token});
      if(r?.ok)status.textContent='Number registered. Closing verification…';
      else {status.textContent='Registration: '+(r?.code||'SERVER_UNAVAILABLE');if(r?.code==='BUSY'||r?.code==='TURNSTILE_REQUIRED')b.disabled=false;}
    }catch{status.textContent='Extension unavailable. Close the popup and retry.';b.disabled=false;}
  });
  void ready();
})();
