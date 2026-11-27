/* Frontvex number registry. Only this fixed HTTPS endpoint is allowed. */
'use strict';
importScripts('frontvex-update-bg.js');
const BASE='https://api.frontvex.com';
const ID_KEY='nfsu2FrontvexRegistryIdentityV1';
const hex=a=>Array.from(new Uint8Array(a),b=>b.toString(16).padStart(2,'0')).join('');
let identityTask=null, requestTask=null;
async function identity(){
  if(!identityTask)identityTask=(async()=>{
    const old=(await chrome.storage.local.get(ID_KEY))[ID_KEY];
    if(old){const key=await crypto.subtle.importKey('jwk',old.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);return {key,publicKey:old.publicKey};}
    const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);
    const publicKey=hex(await crypto.subtle.exportKey('raw',pair.publicKey));
    const privateKey=await crypto.subtle.exportKey('jwk',pair.privateKey);
    await chrome.storage.local.set({[ID_KEY]:{privateKey,publicKey}});
    return {key:pair.privateKey,publicKey};
  })().catch(e=>{identityTask=null;throw e;});
  return identityTask;
}
async function post(path,data){
  const r=await fetch(BASE+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data),credentials:'omit',cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
  let j;try{j=await r.json();}catch{throw new Error('SERVER_UNAVAILABLE');}if(!j?.ok)throw new Error(j?.code||'SERVER_UNAVAILABLE');return j;
}
const PENDING='frontvexRegistrationPendingV2';
const AUTH='https://auth.frontvex.com';
const nonceOK=n=>typeof n==='string'&&/^[a-f0-9]{64}$/.test(n);
const numberOK=n=>typeof n==='string'&&/^\d{3,15}$/.test(n);
const allowedCodes=new Set(['NUMBER_TAKEN','RATE_LIMIT','TURNSTILE_REQUIRED','CHALLENGE_EXPIRED','REGISTRATION_LIMIT','NUMBER_CHANGE_LIMIT','REGISTRATION_LOCKED','REGISTRATION_BUSY','PRELAUNCH','BUSY','BAD_NUMBER','VERIFICATION_EXPIRED','VERIFICATION_PENDING']);
const failure=e=>({ok:false,code:allowedCodes.has(e?.message)?e.message:'SERVER_UNAVAILABLE'});
const pending=async()=>(await chrome.storage.session.get(PENDING))[PENDING];
const savePending=v=>chrome.storage.session.set({[PENDING]:v});
async function challenge(){const {nonce}=await post('/v1/challenge',{});if(!nonceOK(nonce))throw Error('BAD_SERVER_RESPONSE');return nonce;}
async function signedReserve(phoneNumber,nonce,turnstileToken){
  const {key,publicKey}=await identity();
  const data=new TextEncoder().encode('frontvex-registry-v1\n'+nonce+'\n'+phoneNumber+'\n'+publicKey);
  const signature=hex(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,data));
  const r=await post('/v1/reserve',{nonce,publicKey,phoneNumber,signature,...(turnstileToken?{turnstileToken}:{})});
  const id='FVX-'+hex(await crypto.subtle.digest('SHA-256',Uint8Array.from(publicKey.match(/../g),x=>parseInt(x,16))));
  const permanent=r.permanent===true;
  if(r.id!==id||r.number!==phoneNumber||!Number.isFinite(r.lastActive)||(permanent?r.expiresAt!==null:(!Number.isFinite(r.expiresAt)||r.expiresAt-r.lastActive!==15*86400000)))throw Error('BAD_SERVER_RESPONSE');
  return r;
}
async function reserve(number,manual,tabId,username,returnUrl){
  const old=await pending();
  if(old&&old.expires>Date.now()&&!old.result){if(manual&&old.returnUrl&&old.ownerTab===tabId&&old.number===number&&old.username===username)return {ok:false,code:'VERIFICATION_PENDING',nonce:old.nonce};return {ok:false,code:'VERIFICATION_PENDING'};}
  if(old&&old.result&&old.returnUrl&&old.expires>Date.now())return {ok:false,code:'VERIFICATION_PENDING'};
  try{return await signedReserve(number,await challenge());}
  catch(e){if(e.message!=='TURNSTILE_REQUIRED'||!manual)throw e;}
  const nonce=await challenge(),expires=Date.now()+115000;
  // Bind embedded verification to the original game tab and nonce.
  await savePending({nonce,number,username,ownerTab:tabId,authTab:tabId,returnUrl,expires,embedded:true});
  return {ok:false,code:'VERIFICATION_PENDING',nonce};
}
async function submitProof(msg,sender,url){
  const tabId=sender.tab.id;
  const p=await pending();
  if(!p||p.authTab!==tabId||p.nonce!==msg.nonce||!p.embedded||p.authFrame!==sender.frameId||p.authDocument!==sender.documentId||url.pathname!=='/register'||url.searchParams.get('nonce')!==p.nonce)return {ok:false,code:'VERIFICATION_EXPIRED'};
  if(p.result)return {ok:!!p.result.ok,code:p.result.code||'REGISTERED',returnUrl:p.returnUrl};
  if(p.expires<=Date.now())return {ok:false,code:'VERIFICATION_EXPIRED',returnUrl:p.returnUrl};
  if(typeof msg.token!=='string'||!msg.token||msg.token.length>2048)return {ok:false,code:'TURNSTILE_REQUIRED'};
  let result;try{result=await signedReserve(p.number,p.nonce,msg.token);}catch(e){result=failure(e);}
  await savePending({...p,result,expires:Date.now()+900000});
  return {ok:!!result.ok,code:result.code||'REGISTERED',returnUrl:p.returnUrl};
}
async function poll(msg,tabId){
  const p=await pending();
  if(!p||p.ownerTab!==tabId||p.nonce!==msg.nonce)return {ok:false,code:'VERIFICATION_EXPIRED'};
  if(p.expires<=Date.now())return {ok:false,code:requestTask?'BUSY':'VERIFICATION_EXPIRED'};
  if(!p.result)return {ok:false,code:'VERIFICATION_PENDING',ready:!!p.authDocument};
  // Keep the result briefly so a lost runtime response can be retried.
  return {...p.result,complete:true};
}
chrome.runtime.onMessage.addListener((msg,sender,reply)=>{
  if(sender.id!==chrome.runtime.id||!Number.isInteger(sender.tab?.id))return;
  let url;try{url=new URL(sender.url);}catch{return;}
  const game=sender.frameId===0&&['https://nfsu2.xyz','https://www.nfsu2.xyz'].includes(url.origin);
  if(game&&msg?.type==='frontvex-update-check-v1'){fvxUpdate.check(msg.manual===true).then(reply,()=>reply({ok:false}));return true;}
  if(game&&msg?.type==='frontvex-update-open-v1'){fvxUpdate.open(msg.which).then(reply,()=>reply({ok:false}));return true;}
  const auth=sender.frameId>0&&typeof sender.documentId==='string'&&url.origin===AUTH&&url.pathname==='/register';
  if(auth&&msg?.type==='frontvex-auth-ready-v4'){
    if(requestTask){reply({ok:false,code:'BUSY'});return;}
    requestTask=(async()=>{const p=await pending();if(!p||!p.embedded||p.ownerTab!==sender.tab.id||p.nonce!==msg.nonce||url.searchParams.get('nonce')!==p.nonce||p.expires<=Date.now()||p.result)return {ok:false,code:'VERIFICATION_EXPIRED'};
      if(p.authFrame!=null&&p.authFrame!==sender.frameId)return {ok:false,code:'VERIFICATION_EXPIRED'};
      await savePending({...p,authFrame:sender.frameId,authDocument:sender.documentId});return {ok:true};})().then(reply,e=>reply(failure(e))).finally(()=>{requestTask=null;});return true;
  }
  if(game&&msg?.type==='frontvex-registry-cancel-v4'){
    if(requestTask){reply({ok:false,code:'BUSY'});return;}
    requestTask=(async()=>{const p=await pending();if(!p||p.ownerTab!==sender.tab.id||p.nonce!==msg.nonce)return {ok:false,code:'VERIFICATION_EXPIRED'};if(p.result)return {ok:true,completed:true};await chrome.storage.session.remove(PENDING);return {ok:true,cancelled:true};})().then(reply,e=>reply(failure(e))).finally(()=>{requestTask=null;});return true;
  }
  if(game&&msg?.type==='frontvex-registry-resume-v3'){
    (async()=>{const p=await pending();if(!p||!p.returnUrl||p.ownerTab!==sender.tab.id)return {ok:false,code:'NO_PENDING'};
      if(!p.result||p.expires<=Date.now()) {if(requestTask)return {ok:false,code:'BUSY'};await chrome.storage.session.remove(PENDING);return {ok:false,code:'VERIFICATION_EXPIRED'};}
      return {ok:true,nonce:p.nonce,username:p.username,number:p.number,result:p.result};})().then(reply,e=>reply(failure(e)));return true;
  }
  if(game&&msg?.type==='frontvex-registry-consumed-v3'){
    (async()=>{const p=await pending();if(p&&p.ownerTab===sender.tab.id&&p.nonce===msg.nonce&&p.result)await chrome.storage.session.remove(PENDING);return {ok:true};})().then(reply,e=>reply(failure(e)));return true;
  }
  if(game&&msg?.type==='frontvex-registry-poll-v2'){
    if(!nonceOK(msg.nonce)){reply({ok:false,code:'VERIFICATION_EXPIRED'});return;}
    poll(msg,sender.tab.id).then(reply,e=>reply(failure(e)));return true;
  }
  if(game&&msg?.type==='frontvex-communication-sign-v1'){
    if(!nonceOK(msg.nonce)||!numberOK(msg.number)){reply({ok:false});return;}
    (async()=>{const {key,publicKey}=await identity();const data=new TextEncoder().encode('frontvex-communication-v1\n'+msg.nonce+'\n'+msg.number+'\n'+publicKey);return {ok:true,publicKey,signature:hex(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,data))};})().then(reply,()=>reply({ok:false}));return true;
  }
  const start=game&&msg?.type==='frontvex-reserve-v1',proof=auth&&msg?.type==='frontvex-auth-proof-v2';
  if(!start&&!proof)return;
  if(start&&(!numberOK(msg.number)||typeof msg.username!=='string'||!msg.username.trim()||Array.from(msg.username).length>20)){reply({ok:false,code:'BAD_NUMBER'});return;}
  if(requestTask){reply({ok:false,code:'BUSY'});return;}
  requestTask=(start?reserve(msg.number,msg.manual===true,sender.tab.id,msg.username,url.href):submitProof(msg,sender,url)).then(reply,e=>reply(failure(e))).finally(()=>{requestTask=null;});return true;
});
