/* Frontvex Contacts — number registry + private P2P communication beta. */
(() => {
  'use strict';
  const netId=x=>typeof x==='string'&&/^FVX-[a-f0-9]{64}$/.test(x),packetId=x=>typeof x==='string'&&/^FVX-[a-f0-9]{32}$/.test(x);
  const DAY=86400000, KEY='nfsu2FrontvexContactsV1', POLICY=Object.freeze({messageCooldown:2000,messageWindow:60000,messageLimit:15,messageLength:250,requestCooldown:30000,locationCooldown:10000,statusInterval:60000,reconnect:[5000,10000,20000,40000,60000]});
  const chars=(s,n)=>Array.from(String(s??'')).slice(0,n).join('');
  const number=s=>String(s??'').trim().replace(/^FVX-?/i,'');
  const validNumber=s=>/^\d{3,15}$/.test(s);
  const uid=()=>{const a=crypto.getRandomValues(new Uint8Array(16));return 'FVX-'+Array.from(a,b=>b.toString(16).padStart(2,'0')).join('');};
  const initial=()=>({version:1,profile:{id:uid(),username:'',number:'',registryEnabled:false,registry:null},limit:20,friends:[],incoming:[],outgoing:[],blocked:[],messages:[],outbox:[],responses:[],sentAt:[],lastRequest:0,communicationEnabled:false,received:[],reads:[],lastLocation:0});
  // Restore the communication schema on every read, including registry renewal
  // and storage updates from older tabs. Preserve the existing identity and queues.
  function normalize(d,previous=null){
    const defaults=initial();
    const old=previous?.version===1&&previous.profile?.id?previous:null;
    const incoming=d?.version===1&&d.profile?.id?d:null;
    const result={...defaults,...old,...incoming,profile:{...defaults.profile,...old?.profile,...incoming?.profile}};
    for(const k of ['friends','incoming','outgoing','blocked','messages','outbox','responses','sentAt','received','reads']){
      if(!Array.isArray(result[k]))result[k]=Array.isArray(old?.[k])?old[k]:[];
    }
    return result;
  }
  function prune(d){if(d.limit==='unlimited')return;const counts=new Map();d.messages=d.messages.slice().reverse().filter(m=>{const n=counts.get(m.peer)||0;counts.set(m.peer,n+1);return n<d.limit;}).reverse();}
  function mount(root,storage,notifications,options={}){
    let state=null,loading=null,working=false,tab='profile',peer='',notice='',error=false,confirmAction=null,lastAttempt=0,registryOnline=false;
    const doc=root.ownerDocument;let concealId=()=>{};setInterval(()=>{if(doc.hidden||!options.isVisible?.())concealId();},200);doc.addEventListener('visibilitychange',()=>{if(doc.hidden)concealId();});
    let net=null,networkBusy=false,lastNetworkStatus='',lookupBusy=false,pumping=false,pumpTimer=0,pumpAgain=false;
    const foundNumbers=new Map();
    let manageMessages=false,deleteScope="conversation";const selectedMessages=new Set();
    const messageKey=m=>JSON.stringify([m.peer,m.id,m.direction]);
    function stopManaging(){manageMessages=false;selectedMessages.clear();}
    function schedulePump(){if(pumpTimer)return;pumpTimer=setTimeout(()=>{pumpTimer=0;void runPump();},150);}
    async function runPump(){if(pumping){pumpAgain=true;return;}pumping=true;try{await pump();}catch(e){console.warn('[Frontvex] Delivery queue:',e);showMessage('Delivery queue error · '+(e?.name||'Error')+' · '+String(e?.message||'Unknown error').slice(0,120),true);}finally{pumping=false;if(pumpAgain){pumpAgain=false;schedulePump();}}}
    const attempted=new Map(),lookupAttempts=new Map(),receiverRate=new Map();
    const validPin=p=>p&&["Bayview","Rockport","Palmont"].includes(p.city)&&Number.isInteger(p.cityN)&&p.cityN>0&&p.cityN<=1000000&&[p.x,p.y,p.z].every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=1000000);
    const pinText=p=>"Shared GPS pin: "+p.city+" #"+p.cityN;
    function redrawNetwork(){const banner=root.querySelector('.fc-banner');if(banner)banner.textContent=(state?.profile?.registry?'NUMBER REGISTERED':'NUMBER REGISTRY')+' · '+(net?.status()||'Offline');for(const diag of root.querySelectorAll('[data-fvx-diagnostic]'))diag.textContent=net?.diagnostic(diag.dataset.fvxDiagnostic)||'Waiting for connection';for(const status of root.querySelectorAll('.fc-net-status'))status.textContent='Communication: '+(net?.status()||'Offline');for(const item of root.querySelectorAll('[data-fvx-peer]')){item.textContent=net?.online(item.dataset.fvxPeer)?'Online':'Offline';}}
    function allowedRate(id,kind){const now=Date.now(),r=receiverRate.get(id)||{times:[],request:0};r.times=r.times.filter(t=>now-t<60000);if(kind==='gps'){if(now-(r.gps||0)<10000)return false;r.gps=now;}else if(kind==='message'){if(r.times.length>=15||now-(r.times.at(-1)||0)<2000)return false;r.times.push(now);}else if(kind==='request'){if(now-r.request<30000)return false;r.request=now;}if(receiverRate.size>=256&&!receiverRate.has(id))return false;receiverRate.set(id,r);return true;}
    function blocked(d,id,n){return d.blocked.some(x=>x.id===id||x.number===n);}
    function ack(id,packet){net?.transmit(id,{type:'ack',id:packet});}
    async function receive(id,n,m){
      if(!state||!netId(id)||!validNumber(n)||!m||!packetId(m.id)||blocked(state,id,n))return;
      if(typeof m.type==='string'&&m.type.startsWith('perf-')){if(state.communicationEnabled&&state.friends.some(x=>x.id===id))options.onPerformancePacket?.(id,n,m);return;}
      if(typeof m.type==='string'&&m.type.startsWith('race-')){if(state.communicationEnabled&&state.friends.some(x=>x.id===id))options.onRacePacket?.(id,n,m);return;}
      if(working)return;
      if(m.type==='ack'){
        if(!state.outbox.some(x=>x.id===m.id&&x.peer===id)&&!state.outgoing.some(x=>x.id===m.id&&x.peer===id&&x.status!=='delivered')&&!state.responses.some(x=>x.id===m.id&&x.peer===id)&&!state.reads.some(x=>x.id===m.id&&x.peer===id))return;
        await commit(d=>{const out=d.outbox.find(x=>x.id===m.id&&x.peer===id);if(out){d.outbox=d.outbox.filter(x=>x!==out);d.messages.push({...out,direction:'out',status:'delivered'});prune(d);}const r=d.outgoing.find(x=>x.id===m.id&&x.peer===id);if(r)r.status='delivered';d.responses=d.responses.filter(x=>!(x.id===m.id&&x.peer===id));d.reads=d.reads.filter(x=>!(x.id===m.id&&x.peer===id));},'Delivery acknowledged.',true);return;
      }
      if(!['request','response','message','gps','read'].includes(m.type))return;
      if(state.received.some(x=>x.id===m.id&&x.peer===id)){ack(id,m.id);return;}
      const now=Date.now();
      if(m.type==='message'&&(!state.friends.some(x=>x.id===id)||typeof m.text!=='string'||!m.text.trim()||Array.from(m.text).length>250||!allowedRate(id,'message')))return;
      if(m.type==='gps'&&(!state.friends.some(x=>x.id===id)||!validPin(m.pin)||!allowedRate(id,'gps')))return;
      if(m.type==='read'&&(!state.friends.some(x=>x.id===id)||!Array.isArray(m.ids)||m.ids.length<1||m.ids.length>20||!m.ids.every(packetId)))return;
      if(m.type==='request'&&(!allowedRate(id,'request')||state.incoming.some(x=>x.id===id)||state.friends.some(x=>x.id===id)||state.incoming.length>=100))return;
      if(m.type==='response'&&(!packetId(m.request)||typeof m.accept!=='boolean'||!state.outgoing.some(x=>x.id===m.request&&x.peer===id)))return;
      const name=typeof m.username==='string'?chars(m.username.trim(),20):'';
      const saved=await commit(d=>{
        if(m.type==='request')d.incoming.push({id,requestId:m.id,number:n,username:name,at:now});
        if(m.type==='response'){d.outgoing=d.outgoing.filter(x=>!(x.id===m.request&&x.peer===id));if(m.accept&&!d.friends.some(x=>x.id===id))d.friends.push({id,number:n,username:name});}
        if(m.type==='message'||m.type==='gps'){d.messages.push({id:m.id,peer:id,direction:'in',text:m.type==='gps'?pinText(m.pin):m.text,at:now,...(m.type==='gps'?{pin:m.pin}:{})});prune(d);}
        if(m.type==='read')for(const item of d.messages)if(item.peer===id&&item.direction==='out'&&m.ids.includes(item.id))item.status='read';
        d.received=[...d.received.filter(x=>now-x.at<30*DAY),{id:m.id,peer:id,at:now}].slice(-5000);
      },'',true);
      if(saved){ack(id,m.id);if(['request','message','gps'].includes(m.type))void notifications?.received?.(state);}
    }
    function pendingPeers(){return [...(state?.friends||[]).map(x=>x.id),...(state?.outgoing||[]).map(x=>x.peer),...(state?.responses||[]).map(x=>x.peer),...(state?.outbox||[]).map(x=>x.peer),...(state?.reads||[]).map(x=>x.peer)].filter(netId);}
    async function pump(){
      if(!state||working)return;
      state=normalize(state);
      const now=Date.now();
      if(tab==='messages'&&!manageMessages&&!confirmAction&&peer&&options.isVisible?.()&&netId(peer)){const viewed=state.messages.filter(x=>x.peer===peer&&x.direction==='in'&&!x.readQueued).slice(0,20);if(viewed.length&&state.reads.length<200){await commit(d=>{const ids=viewed.map(x=>x.id);for(const m of d.messages)if(m.peer===peer&&ids.includes(m.id))m.readQueued=true;d.reads.push({id:uid(),peer,ids,at:now});},'',true);return;}}
      if(!net||!state.communicationEnabled)return;
      net.tick(pendingPeers());if(!net.ready()||working||networkBusy)return;
      if(attempted.size>2000)for(const [k,v] of attempted)if(now-v>600000)attempted.delete(k);if(lookupAttempts.size>200)for(const [k,v] of lookupAttempts)if(now-v>600000)lookupAttempts.delete(k);
      // Resolve the number only once; never redirect queued requests after a number changes owner.
      const unresolved=state.outgoing.find(x=>!netId(x.peer)&&now-(lookupAttempts.get(x.id)||0)>=60000);
      if(unresolved){lookupAttempts.set(unresolved.id,now);networkBusy=true;try{const found=await net.lookup(unresolved.number);if(found&&state.outgoing.some(x=>x.id===unresolved.id)&&!working){await commit(d=>{const x=d.outgoing.find(x=>x.id===unresolved.id);if(x)x.peer=found.id;lookupAttempts.delete(unresolved.id);},'',true);net.refresh();}}finally{networkBusy=false;}schedulePump();return;}
      const batch=[...state.reads.filter(x=>netId(x.peer)).map(x=>({...x,type:'read'})),...state.responses.filter(x=>netId(x.peer)).map(x=>({...x,type:'response'})),...state.outgoing.filter(x=>netId(x.peer)&&x.status!=='delivered').map(x=>({...x,type:'request'})),...state.outbox.filter(x=>netId(x.peer)).map(x=>({...x,type:x.pin?'gps':'message'}))];
      for(const x of batch){if(blocked(state,x.peer,x.number))continue;const prior=attempted.get(x.id)||0;if(now-prior<6000)continue;const f=state.friends.find(r=>r.id===x.peer);net.ensure(x.peer,x.number||f?.number||'');if(net.transmit(x.peer,{type:x.type,id:x.id,username:state.profile.username,...(x.type==='message'?{text:x.text}:x.type==='response'?{request:x.request,accept:x.accept}:x.type==='gps'?{pin:x.pin}:x.type==='read'?{ids:x.ids}:{})})){attempted.set(x.id,now);break;}}
    }
    net=globalThis.__frontvexCommunication?.create({profile:()=>state?.profile,onPacket:receive,onFriendOnline:id=>{const friend=state?.friends.find(x=>x.id===id);if(state?.communicationEnabled&&friend&&!blocked(state,id,friend.number))void notifications?.friendOnline?.(friend);},onUpdate:()=>{redrawNetwork();schedulePump();}});

    const el=(tag,txt,cls)=>{const e=doc.createElement(tag);if(txt!=null)e.textContent=txt;if(cls)e.className=cls;return e;};
    const add=(p,...c)=>{p.append(...c);return p;};
    const button=(text,fn,cls='')=>{const b=el('button',text,'fc-btn '+cls);b.type='button';b.disabled=working;b.addEventListener('click',fn);return b;};
    const note=(p,t)=>{const n=el('p',t,'fc-note');p.append(n);if(/^(Private communication BETA\.|Direct WebRTC|Cloud storage:|Requests are limited|Messages are limited)/.test(t))options.compactHelp?.(n,p.querySelector('h3')?.textContent||'Contacts');};
    const card=(p,title)=>{const b=el('div',null,'fc-card');if(title)b.append(el('h3',title));p.append(b);return b;};
    const label=(p,t,input)=>{const l=el('label',t,'fc-label');l.append(input);p.append(l);return l;};
    const format=n=>n?'FVX'+number(n):'Not set';
    const who=r=>r.username||format(r.number)||'Unknown';
    function showMessage(t,isError=false){notice=t;error=isError;const n=root.querySelector('.fc-notice');if(n){n.textContent=t;n.dataset.error=String(error);}}
    async function commit(mut,msg,quiet=false){if(working||!state)return false;working=true;const next=JSON.parse(JSON.stringify(normalize(state)));let ok=false;try{mut(next);await storage.set({[KEY]:next});state=next;if(msg)notice=msg;error=false;ok=true;schedulePump();}catch(e){notice=e?.message||'Local save failed.';error=true;}finally{working=false;if(!quiet)confirmAction=null;if(!quiet||(['friends','requests','messages'].includes(tab)&&(!root.contains(root.getRootNode().activeElement||doc.activeElement)||(tab==='messages'&&!peer&&!manageMessages)||tab==='requests')))render();else redrawNetwork();}return ok;}
    function ask(t,fn){confirmAction={t,fn};render();}
    function saveReceivedPin(pin,choice,expected){
      const result=options.importPin?.(pin,choice,expected);
      if(result?.conflict){confirmAction={pin,conflict:result};render();return;}
      confirmAction=null;
      showMessage(result===true?'GPS pin saved to Markers.':'Cannot save pin. Check Markers limit and loading.',result!==true);render();
    }
    function renderPinChoice(a){
      const c=card(root,'GPS pin name already exists'),x=a.conflict;
      note(c,'Both pins are named '+x.label+'. Your saved record: '+x.speed+'. Distance between locations: '+x.distance+'. Choose which pin to keep.');
      c.append(button('Keep my pin',()=>{confirmAction=null;showMessage('Your existing GPS pin was kept.');render();}),button('Replace with received pin',()=>saveReceivedPin(a.pin,'replace',x.target),'danger'));
      const both=button('Keep both · assign a new number',()=>saveReceivedPin(a.pin,'both',x.target),'primary');both.disabled=working||!x.canKeepBoth;c.append(both);
      note(c,'Replacing moves the pin to the received location and starts a new local speed record. Keeping both preserves your original pin.');
      c.append(button('Cancel',()=>{confirmAction=null;render();}));
    }
    function navigate(t){stopManaging();tab=t;peer='';notice='';error=false;confirmAction=null;notifications?.view(t==='messages'?'messages':t==='requests'?'contacts':'');render();schedulePump();}
    function expiryStatus(){
      const r=state?.profile?.registry;if(!r||r.permanent===true)return '';
      const left=r.expiresAt-Date.now();
      if(left<=0)return 'Your phone number reservation has expired after 15 days of inactivity. Reconnect to reserve it again.';
      if(left<=DAY)return 'Final warning: your number expires within 24 hours. Reconnect to renew.';
      if(left<=3*DAY)return 'Your phone number expires within 3 days. Reconnect to renew.';
      return '';
    }
    async function saveReservation(reply,user,num,interactive=false,verified=false){
      const stored=(await storage.get(KEY))?.[KEY];
      const next=JSON.parse(JSON.stringify(normalize(stored,state)));
      next.profile={...next.profile,username:user,number:num,registryEnabled:true,registry:{id:reply.id,number:reply.number,lastActive:reply.lastActive,expiresAt:reply.expiresAt,permanent:reply.permanent===true}};
      await storage.set({[KEY]:next});state=next;registryOnline=true;error=false;
      // Connect with the newly saved signed reservation immediately, if opted in.
      if(state.communicationEnabled)net?.reservationReady(interactive,verified);
      schedulePump();
    }
    async function resumeVerification(){
      if(!state)return;
      try{let r=await chrome.runtime.sendMessage({type:'frontvex-registry-resume-v3'});for(let i=0;r?.code==='BUSY'&&i<12;i++){await new Promise(resolve=>setTimeout(resolve,1000));r=await chrome.runtime.sendMessage({type:'frontvex-registry-resume-v3'});}
        if(r?.code==='NO_PENDING')return;
        if(r?.code==='VERIFICATION_EXPIRED'){notice='Verification cancelled or expired. Please try again.';error=true;lastAttempt=Date.now();options.onVerificationReturn?.(false);return;}
        if(!r?.ok)return;
        lastAttempt=Date.now();
        if(r.result?.ok){await saveReservation(r.result,r.username,r.number,true,true);notice=r.result.permanent?'Permanent reservation verified.':'Phone number verified and reserved for 15 days.';}
        else {notice='Registration not completed: '+(r.result?.code||'SERVER_UNAVAILABLE')+'. Please retry.';error=true;}
        await chrome.runtime.sendMessage({type:'frontvex-registry-consumed-v3',nonce:r.nonce});
        options.onVerificationReturn?.(!error);
      }catch(e){notice='Could not restore verification result. Reload the game tab to retry.';error=true;options.onVerificationReturn?.(false);}
    }
    // The actual security challenge is displayed on the official auth origin.
    // No top-level navigation, no synthetic proof and no frame-policy overrides.
    function embeddedVerification(nonce){
      return new Promise(resolve=>{
        const host=doc.createElement('div');host.style.cssText='position:fixed;inset:0;z-index:2147483647;pointer-events:none';
        const shadow=host.attachShadow({mode:'closed'}),dialog=doc.createElement('dialog');
        const style=doc.createElement('style');style.textContent=`dialog{box-sizing:border-box;width:min(520px,calc(100vw - 24px));max-width:calc(100vw - 24px);max-height:calc(100dvh - 24px);padding:16px;border:1px solid #416772;border-radius:18px;background:#101d24;color:#e6f2f4;font:14px system-ui,sans-serif;box-shadow:0 12px 70px #000a;pointer-events:auto;overflow:auto}dialog::backdrop{background:#0009}.head{display:flex;align-items:center;justify-content:space-between;gap:12px}h2{font-size:18px;margin:0}p{line-height:1.4;margin:12px 0}button{font:inherit;color:#e6f2f4;background:#213640;border:1px solid #54727c;border-radius:8px;padding:8px 12px;cursor:pointer}button:disabled{opacity:.5}iframe{box-sizing:border-box;width:100%;height:min(430px,58dvh);min-height:200px;border:1px solid #416772;border-radius:10px;background:#fff;display:block}`;
        const head=doc.createElement('div');head.className='head';const title=doc.createElement('h2');title.textContent='Frontvex Security Verification';const close=doc.createElement('button');close.type='button';close.textContent='Close';head.append(title,close);dialog.setAttribute('aria-label',title.textContent);
        const status=doc.createElement('p');status.setAttribute('role','status');status.textContent='Loading the official verification page…';
        const frame=doc.createElement('iframe');frame.title='Official Frontvex verification';frame.setAttribute('sandbox','allow-scripts allow-same-origin allow-forms');frame.referrerPolicy='no-referrer';if('credentialless' in frame)frame.credentialless=true;frame.src='https://auth.frontvex.com/register?nonce='+nonce;
        const hint=doc.createElement('p');hint.textContent='auth.frontvex.com · Complete the check to reserve your number. The game stays open behind this window.';
        dialog.append(head,status,frame,hint);shadow.append(style,dialog);(doc.documentElement||doc.body).append(host);
        let done=false,busy=false,closing=false,timer=0,ready=false;const started=Date.now();
        const finish=result=>{if(done)return;done=true;clearTimeout(timer);host.remove();resolve(result);};
        async function tick(){if(done||busy)return;busy=true;try{
          if(closing){const r=await chrome.runtime.sendMessage({type:'frontvex-registry-cancel-v4',nonce});if(r?.cancelled||r?.code==='VERIFICATION_EXPIRED'){finish({ok:false,code:'VERIFICATION_CANCELLED'});return;}if(r?.completed)closing=false;}
          const r=await chrome.runtime.sendMessage({type:'frontvex-registry-poll-v2',nonce});
          if(r?.ok||r?.code==='VERIFICATION_EXPIRED'||(r?.code&&r.code!=='VERIFICATION_PENDING'&&r.code!=='BUSY')){finish(r);return;}
          if(r?.ready&&!ready){ready=true;status.textContent='Complete the security check below.';}
          else if(!ready&&Date.now()-started>12000&&!closing)status.textContent='The verification page has not connected. If it is blank or blocked, the server or browser may not allow embedded verification. Close and retry; the game will not reload.';
        }catch{finish({ok:false,code:'SERVER_UNAVAILABLE'});return;}
        finally{busy=false;if(!done)timer=setTimeout(tick,800);}}
        function cancel(){if(done||closing)return;closing=true;close.disabled=true;status.textContent='Closing verification safely…';clearTimeout(timer);void tick();}
        close.addEventListener('click',cancel);dialog.addEventListener('cancel',e=>{e.preventDefault();cancel();});
        try{dialog.showModal();}catch{host.remove();closing=true;void tick();return;}
        void tick();
      });
    }
    async function register(user,num,manual=false){
      if(working||!state||!validNumber(num))return;
      working=true;lastAttempt=Date.now();registryOnline=false;
      const previous=state.profile.registry, expired=!!previous&&previous.permanent!==true&&Number.isFinite(previous.expiresAt)&&previous.expiresAt<=Date.now();
      try{
        let reply=await chrome.runtime.sendMessage({type:'frontvex-reserve-v1',number:num,username:user,manual});
        if(reply?.code==='VERIFICATION_PENDING'&&/^[a-f0-9]{64}$/.test(reply.nonce||'')){
          const nonce=reply.nonce;
          notice='Complete security verification in the popup.';render();
          reply=await embeddedVerification(nonce);
          if(reply?.ok){await saveReservation(reply,user,num,true,true);await chrome.runtime.sendMessage({type:'frontvex-registry-consumed-v3',nonce});notice=reply.permanent?'Permanent reservation verified.':'Phone number verified and reserved for 15 days.';options.onVerificationReturn?.(true);return;}
          if(reply?.code==='VERIFICATION_CANCELLED'){notice='Verification cancelled. The game remains open.';error=true;return;}
          // Consume only actual completed failures, not unavailable/pending results.
          if(reply?.complete)await chrome.runtime.sendMessage({type:'frontvex-registry-consumed-v3',nonce});
        }
        if(!reply?.ok){
          if(reply?.code==='NUMBER_TAKEN'){notice=(expired?'Your old reservation expired and the number is now in use. ':'Phone number already in use. ')+'Choose another number. Your contacts and messages remain local.';error=true;return;}
          const messages={TURNSTILE_REQUIRED:'Security verification required. Open My Profile and select Reconnect / Renew.',REGISTRATION_LIMIT:'Registration limit reached. Try again later.',NUMBER_CHANGE_LIMIT:'You can change your number once every 24 hours.',REGISTRATION_LOCKED:'New registrations are temporarily closed.',PRELAUNCH:'The server is not open yet.',VERIFICATION_EXPIRED:'Security verification expired. Please try again.',VERIFICATION_PENDING:'A security verification is pending. Complete it or wait until it expires.',RATE_LIMIT:'Too many requests. Wait before trying again.',REGISTRATION_BUSY:'Registration is busy. Please try later.',BUSY:'Another request is in progress.'};
          if(messages[reply?.code]){notice=messages[reply.code];error=true;return;}
          throw new Error(reply?.code||'SERVER_UNAVAILABLE');
        }
        await saveReservation(reply,user,num,manual);
        notice=reply.permanent===true?'Permanent reservation verified. Your number remains yours until you change it.':expired?'Your old reservation expired. The number is now reserved again for 15 days.':manual?'Phone number verified and reserved for 15 days.':'Phone number renewed for 15 days.';
      }catch(e){notice='Number registry unavailable. Your local profile and existing reservation are unchanged. '+expiryStatus();error=true;}
      finally{working=false;render();}
    }
    function maybeRenew(){if(state?.profile.registryEnabled&&validNumber(state.profile.number)&&Date.now()-lastAttempt>=6*3600000&&!working)void register(state.profile.username,state.profile.number);}
    function profile(p){
      const c=card(p,'My Profile');const u=el('input');u.type='text';u.maxLength=40;u.autocomplete='off';u.placeholder='Your username';u.value=state.profile.username;
      const count=el('small',Array.from(u.value).length+'/20 characters');label(c,'Username',u);c.append(count);
      u.addEventListener('input',()=>{u.value=chars(u.value,20);count.textContent=Array.from(u.value).length+'/20 characters';});
      const n=el('input');n.type='text';n.inputMode='numeric';n.maxLength=15;n.autocomplete='off';n.placeholder='Choose 3–15 digits';n.value=state.profile.number;label(c,'Custom phone number (FVX)',n);
      n.addEventListener('input',()=>{n.value=n.value.replace(/\D/g,'').slice(0,15);});
      note(c,'The server stores only the number, cryptographic FVX identity, public key and last activity. Standard reservations expire after 15 days without a successful renewal. Server-authorized permanent reservations do not expire automatically. Username, private key, friends and messages stay on this device.');
      note(c,'If required, security verification opens in a popup over the game. No new tab or page reload.');
      c.append(button('Save Profile & Reserve Number',()=>{const user=chars(u.value.trim(),20),num=number(n.value);if(!user||!validNumber(num)){showMessage('Enter a username and 3–15 digits.',true);return;}void register(user,num,true);},'primary'));
      if(!state.profile.registryEnabled)c.append(button('Save Locally (no reservation)',()=>{const user=chars(u.value.trim(),20),num=number(n.value);if(!user||!validNumber(num)){showMessage('Enter a username and 3–15 digits.',true);return;}void commit(d=>{d.profile.username=user;d.profile.number=num;},'Profile saved locally. Number is not reserved.');}));
      const info=card(p,'My number');info.append(el('strong',format(state.profile.number),'fc-number'));
      const r=state.profile.registry;
      if(r){note(info,'Last verified: '+new Date(r.lastActive).toLocaleString());
        if(r.permanent===true)note(info,'Reservation: Permanent — until you change this number.');
        else if(Number.isFinite(r.expiresAt))note(info,'Reservation expires: '+new Date(r.expiresAt).toLocaleString());
        const warn=expiryStatus();if(warn)note(info,warn);
        if(/^FVX-[a-f0-9]{64}$/.test(r.id||'')){
          const idField=el('input');idField.type='text';idField.readOnly=true;idField.value='FVX-••••••••••••••••';idField.setAttribute('aria-label','Public FVX registry identity');label(info,'Public FVX ID',idField);
          let revealTimer=0;const reveal=button('Show FVX ID',()=>{if(idField.value===r.id){concealId();return;}idField.value=r.id;reveal.textContent='Hide FVX ID';revealTimer=setTimeout(()=>concealId(),10000);});concealId=()=>{clearTimeout(revealTimer);idField.value='FVX-••••••••••••••••';reveal.textContent='Show FVX ID';};info.append(reveal,button('Copy Public FVX ID',async()=>{try{await navigator.clipboard.writeText(r.id);showMessage('Public FVX ID copied. Never share your private key.');}catch{showMessage('Clipboard unavailable. Use Show FVX ID to copy manually.');}}));
        }
      }
      note(info,registryOnline?'Registry: last check successful.':'Registry: not currently verified.');
      if(r&&!state.communicationEnabled)note(info,'Online communication is disabled. Enable it in Contacts → Settings to connect automatically.');
      if(state.profile.registryEnabled)c.append(button('Reconnect / Renew',()=>void register(state.profile.username,state.profile.number,true)));
      const status=el('p','Communication: '+(net?.status()||'Offline'),'fc-note fc-net-status');info.append(status);note(info,'Private communication BETA. Messages and requests are delivered directly when both players are online.');
    }
    function friends(p){const c=card(p,'Add Friend');const n=el('input');n.type='text';n.autocomplete='off';n.placeholder='FVX123456';n.maxLength=19;label(c,'Friend’s custom number',n);c.append(button('Find Number',async()=>{const num=number(n.value);if(!validNumber(num)||!net?.ready()){showMessage('Enter a valid number and connect Communication first.',true);return;}const found=await net.lookup(num);if(found){foundNumbers.set(num,{...found,at:Date.now()});if(foundNumbers.size>30)foundNumbers.delete(foundNumbers.keys().next().value);}else foundNumbers.delete(num);showMessage(found?'Registered number · '+(found.online?'Online':'Offline'):'Number not found or lookup unavailable.',!found);}),button('Send Friend Request',()=>{const num=number(n.value),now=Date.now();if(!state.profile.username||!validNumber(state.profile.number)){showMessage('Save My Profile before adding friends.',true);return;}if(!validNumber(num)||num===state.profile.number){showMessage('Enter a valid number other than your own.',true);return;}if(state.outgoing.length>=100){showMessage('Pending requests limit reached.',true);return;}if(state.outgoing.some(r=>r.number===num)||state.friends.some(r=>r.number===num)||state.blocked.some(r=>r.number===num)){showMessage('This number is already listed or blocked.',true);return;}const wait=POLICY.requestCooldown-(now-state.lastRequest);if(wait>0){showMessage('Friend request cooldown: '+Math.ceil(wait/1000)+'s remaining.',true);return;}void commit(d=>{const known=foundNumbers.get(num);d.outgoing.push({id:uid(),number:num,at:now,status:'pending',...(known&&now-known.at<60000&&netId(known.id)?{peer:known.id}:{})});net?.refresh();d.lastRequest=now;},'Request queued. Delivery requires both players online.');},'primary'));
      note(c,'Requests are limited to one every 30 seconds.');const f=card(p,'Friends · '+state.friends.length);if(!state.friends.length)note(f,'No accepted friends yet.');for(const r of state.friends){const row=el('div',null,'fc-item');row.append(el('strong',who(r)),el('small',format(r.number)),Object.assign(el('small',net?.online(r.id)?'Online':'Offline'),{className:'fc-presence'}));row.lastChild.dataset.fvxPeer=r.id;row.append(button('Messages',()=>{tab='messages';peer=r.id;notifications?.view('messages');render();schedulePump();}),button('Block',()=>ask('Block '+who(r)+' on this device?',()=>commit(d=>{d.blocked.push(r);d.friends=d.friends.filter(x=>x.id!==r.id);d.outbox=d.outbox.filter(x=>x.peer!==r.id);d.responses=d.responses.filter(x=>x.peer!==r.id);d.reads=d.reads.filter(x=>x.peer!==r.id);d.outgoing=d.outgoing.filter(x=>x.peer!==r.id);net?.closePeer(r.id);},'User blocked locally.'))));f.append(row);}}
    function requests(p){const a=card(p,'Incoming Requests · '+state.incoming.length);if(!state.incoming.length)note(a,'No incoming requests.');for(const r of state.incoming){const row=el('div',null,'fc-item');row.append(el('strong',who(r)),el('small',format(r.number)));for(const accept of [true,false])row.append(button(accept?'Accept':'Decline',()=>commit(d=>{d.incoming=d.incoming.filter(x=>x.id!==r.id);if(accept&&!d.friends.some(x=>x.id===r.id))d.friends.push(r);if(netId(r.id)&&packetId(r.requestId))d.responses.push({id:uid(),peer:r.id,number:r.number,request:r.requestId,accept,at:Date.now()});},'Decision saved; delivery pending.')));a.append(row);}const b=card(p,'Outgoing Requests · '+state.outgoing.length);if(!state.outgoing.length)note(b,'No pending requests.');for(const r of state.outgoing){const row=el('div',null,'fc-item');row.append(el('strong',format(r.number)),el('small',r.status==='delivered'?'Delivered · awaiting decision':'Pending · not delivered'));if(r.status!=='delivered'){const diag=el('small',netId(r.peer)?net?.diagnostic(r.peer)||'Waiting for connection':'Resolving registered number…','fc-note');if(netId(r.peer))diag.dataset.fvxDiagnostic=r.peer;row.append(diag);row.append(button('Retry P2P',async()=>{if(!net?.ready()){showMessage('Connect Communication first.',true);return;}if(!netId(r.peer)){lookupAttempts.delete(r.id);schedulePump();showMessage('Retrying number lookup.');return;}const found=await net.lookup(r.number);if(!found||found.id!==r.peer){showMessage('Original recipient is unavailable or number changed.',true);return;}if(!found.online){showMessage('Recipient is offline.',true);return;}if(!net.retry(r.peer,r.number)){showMessage('P2P attempt already active or cooling down (30s).');}else showMessage('Retrying direct connection.');schedulePump();}));}row.append(button('Cancel',()=>commit(d=>{d.outgoing=d.outgoing.filter(x=>x.id!==r.id);},'Request removed locally.')),button('Block',()=>commit(d=>{d.outgoing=d.outgoing.filter(x=>x.id!==r.id);d.blocked.push({id:r.id,number:r.number});},'Number blocked locally.')));b.append(row);}}
    function messageManager(p){
      const c=card(p,'Manage Messages');
      note(c,'Select saved messages to delete from this device. Other players keep their copies. Pending messages are not affected.');
      const scope=el('select');for(const [v,t] of [['conversation','Current conversation'],['all','All saved messages']]){if(v==='conversation'&&!peer)continue;const o=el('option',t);o.value=v;scope.append(o);}scope.value=peer?deleteScope:'all';label(c,'Show messages',scope);
      scope.addEventListener('change',()=>{deleteScope=scope.value;selectedMessages.clear();render();});
      const list=state.messages.filter(m=>scope.value==='all'||m.peer===peer);const keys=new Set(list.map(messageKey));for(const k of selectedMessages)if(!keys.has(k))selectedMessages.delete(k);
      const count=el('p','','fc-note');const del=button('Delete selected',()=>{const chosen=new Set(selectedMessages);if(!chosen.size)return;ask('Delete '+chosen.size+' selected message'+(chosen.size===1?'':'s')+' from this device only? This cannot be undone.',async()=>{if(await commit(d=>{d.messages=d.messages.filter(m=>!chosen.has(messageKey(m)));},'Selected messages deleted locally.')){stopManaging();render();}});},'danger');
      function update(){count.textContent=selectedMessages.size+' selected';del.disabled=working||!selectedMessages.size;}
      c.append(button('Select all',()=>{for(const k of keys)selectedMessages.add(k);render();}),button('Deselect all',()=>{selectedMessages.clear();render();}));
      if(!list.length)note(c,'No saved messages.');
      for(const m of list){const row=el('div',null,'fc-item'),check=el('input');check.type='checkbox';check.checked=selectedMessages.has(messageKey(m));check.className='fc-notify-check';const friend=state.friends.find(r=>r.id===m.peer);label(row,(m.direction==='in'?'Received':'Sent')+' · '+(friend?who(friend):'Conversation'),check);row.append(el('div',m.text,'fc-message'));check.addEventListener('change',()=>{if(check.checked)selectedMessages.add(messageKey(m));else selectedMessages.delete(messageKey(m));update();});c.append(row);}
      c.append(count,del,button('Done',()=>{stopManaging();render();}));update();
    }
    function messages(p){if(manageMessages){messageManager(p);return;}const c=card(p,'Messages');const all=state.friends;c.append(button('Manage Messages',()=>{manageMessages=true;deleteScope=peer?'conversation':'all';selectedMessages.clear();render();}));if(!all.length){note(c,'No conversations. Add and connect with a friend first.');note(c,'Enable Communication in Contacts Settings. Both players must be online to receive messages.');return;}if(!all.some(r=>r.id===peer))peer='';
      if(!peer){
        const conversations=all.map(r=>{const history=[...state.messages.filter(m=>m.peer===r.id),...state.outbox.filter(m=>m.peer===r.id).map(m=>({...m,direction:'out',pending:true}))];history.sort((a,b)=>(b.at||0)-(a.at||0));return {r,last:history[0],unread:history.filter(m=>m.direction==='in'&&!m.readQueued).length};}).sort((a,b)=>(b.last?.at||0)-(a.last?.at||0)||who(a.r).localeCompare(who(b.r)));
        note(c,'Conversations');
        for(const {r,last,unread} of conversations){
          const row=button('',()=>{peer=r.id;render();schedulePump();},'fc-conversation');row.setAttribute('aria-label','Open conversation with '+who(r)+(unread?' · '+unread+' unread':''));
          const top=el('span',null,'fc-conv-top');top.append(el('strong',who(r)));if(unread)top.append(el('span',unread>99?'99+':String(unread),'fc-conv-badge'));row.append(top);
          const meta=el('span',null,'fc-conv-meta');meta.append(el('small',format(r.number)));const status=el('small',net?.online(r.id)?'Online':'Offline');status.dataset.fvxPeer=r.id;meta.append(status);row.append(meta);
          const snippet=last?(last.direction==='out'?'You: ':'')+(last.pending?'[Pending] ':'')+chars(last.text,80):'No messages yet';row.append(el('span',snippet,'fc-conv-preview'));
          if(last?.at)row.append(el('small',new Date(last.at).toLocaleString([], {month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}),'fc-conv-time'));c.append(row);
        }return;
      }
      const current=all.find(r=>r.id===peer);c.append(button('← All conversations',()=>{peer='';render();}));const heading=el('div',null,'fc-item');heading.append(el('strong',who(current)),el('small',format(current.number)));c.append(heading);
      const target=peer;
      const list=state.messages.filter(m=>m.peer===target);
      const pending=state.outbox.filter(m=>m.peer===target);
      const timeline=[...list,...pending.map(m=>({...m,direction:'out',pending:true}))].sort((a,b)=>(a.at||0)-(b.at||0));
      const log=el('div',null,'fc-chat-log');log.setAttribute('aria-label','Conversation history');
      if(!timeline.length)note(log,'No saved messages.');
      let previousDay='';
      for(const m of timeline){
        const date=new Date(m.at||0),day=m.at&&Number.isFinite(date.getTime())?date.toLocaleDateString():'';
        if(day&&day!==previousDay){log.append(el('div',day,'fc-chat-day'));previousDay=day;}
        const out=m.direction==='out',row=el('div',null,'fc-chat-row '+(out?'fc-chat-out':'fc-chat-in'));
        const bubble=el('div',null,'fc-chat-bubble');
        if(m.pin&&validPin(m.pin)){bubble.classList.add('fc-chat-pin');bubble.append(el('small','⌖ Shared GPS pin','fc-chat-pin-label'),el('div',m.pin.city+' #'+m.pin.cityN,'fc-message'));}
        else bubble.append(el('div',m.text,'fc-message'));
        const meta=el('div',null,'fc-chat-meta');
        if(day)meta.append(el('span',date.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})));
        if(out)meta.append(el('span',m.pending?'Pending':m.status==='read'?'✓✓ Read':m.status==='delivered'?'✓✓ Delivered':'✓ Sent',m.status==='read'?'fc-chat-read':''));
        bubble.append(meta);row.append(bubble);log.append(row);
      }
      c.append(log);
      const t=el('textarea');t.rows=3;t.maxLength=500;t.placeholder='Write a message (250 characters)';const counter=el('small','0/250');t.addEventListener('input',()=>{t.value=chars(t.value,250);counter.textContent=Array.from(t.value).length+'/250';});c.append(t,counter,button('Send Message',()=>{const text=chars(t.value.trim(),250),now=Date.now();if(!text)return;if(state.outbox.length>=200){showMessage('Pending queue is full.',true);return;}const recent=state.sentAt.filter(x=>now-x<POLICY.messageWindow);const wait=Math.max(0,POLICY.messageCooldown-(now-(recent.at(-1)||0)),recent.length>=POLICY.messageLimit?POLICY.messageWindow-(now-recent[0]):0);if(wait>0){showMessage('Message cooldown: '+Math.ceil(wait/1000)+'s remaining.',true);return;}void commit(d=>{d.sentAt=[...recent,now];d.outbox.push({id:uid(),peer:target,text,at:now});},'Message queued; waiting for delivery.');},'primary'));const pins=(options.listPins?.()||[]).filter(validPin);if(pins.length){const select=el('select');for(const [i,pin] of pins.entries()){const o=el('option',pin.city+' #'+pin.cityN);o.value=String(i);select.append(o);}label(c,'Share saved GPS pin',select);c.append(button('Send GPS Pin',()=>{const pin=pins[Number(select.value)],now=Date.now();if(!pin||!validPin(pin))return;if(now-(state.lastLocation||0)<POLICY.locationCooldown){showMessage('GPS cooldown: 10 seconds.',true);return;}if(state.outbox.length>=200){showMessage('Pending queue is full.',true);return;}void commit(d=>{d.lastLocation=now;d.outbox.push({id:uid(),peer:target,text:pinText(pin),pin,at:now});},'GPS pin queued; waiting for delivery.');}));}
      // Keep all received-pin actions out of the timeline. Match the marker importer by city and position.
      const samePin=(a,b)=>a.city===b.city&&Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z)<1;
      const shared=[];
      for(const m of list)if(m.direction==='in'&&validPin(m.pin)&&!shared.some(p=>samePin(p,m.pin)))shared.push(m.pin);
      if(shared.length){
        const panel=el('details',null,'fc-chat-actions');panel.append(el('summary','Received GPS pins · '+shared.length));
        const rows=el('div',null,'fc-chat-action-list');panel.append(rows);c.append(panel);
        for(const pin of shared){
          const row=el('div',null,'fc-chat-action-row'),name=el('span',pin.city+' #'+pin.cityN);
          const saved=()=> (options.listPins?.()||[]).filter(validPin).some(p=>samePin(p,pin));
          const action=button(saved()?'Saved ✓':'Save GPS Pin',()=>{
            if(saved()){action.textContent='Saved ✓';action.disabled=true;return;}
            saveReceivedPin(pin);
          });action.disabled=working||saved();row.append(name,action);rows.append(row);
        }
      }
      if(pending.length){
        const panel=el('details',null,'fc-chat-actions');panel.append(el('summary','Pending messages · '+pending.length));
        const rows=el('div',null,'fc-chat-action-list');panel.append(rows);c.append(panel);
        for(const m of pending){const row=el('div',null,'fc-chat-action-row');row.append(el('span',chars(m.text,80)),button('Cancel',()=>ask('Cancel this pending message?',()=>commit(d=>{d.outbox=d.outbox.filter(x=>x.id!==m.id);},'Pending message removed.'))));rows.append(row);}
      }
    }
    function settings(p){const nc=card(p,'Communication BETA');const toggle=el('input');toggle.type='checkbox';toggle.checked=!!state.communicationEnabled;label(nc,'Enable online communication',toggle);toggle.addEventListener('change',()=>{const value=toggle.checked;void commit(d=>{d.communicationEnabled=value;},value?'Communication enabled.':'Communication disabled.').then(ok=>{if(ok)net?.setEnabled(value);});});nc.append(el('p','Communication: '+(net?.status()||'Offline'),'fc-note fc-net-status'));note(nc,'Direct WebRTC · STUN only · private beta. No cloud message history.');if(notifications)notifications.renderSettings(card(p,'Notification Settings'));const c=card(p,'Message Settings');const s=el('select');for(const [v,t] of [['20','20 messages (Default)'],['50','50 messages'],['unlimited','Unlimited']]){const o=el('option',t);o.value=v;s.append(o);}s.value=String(state.limit);label(c,'History limit per conversation',s);s.addEventListener('change',()=>{const v=s.value==='unlimited'?'unlimited':Number(s.value);const run=()=>commit(d=>{d.limit=v;prune(d);},'History limit saved locally.');if(v==='unlimited')ask('Unlimited history may increase local storage usage over time. Continue?',run);else if(state.messages.length&&v!==state.limit)ask('Apply this limit? Older messages may be deleted locally.',run);else void run();});if(state.limit==='unlimited')note(c,'Warning: unlimited history is still limited by the browser storage quota.');note(c,'Cloud storage: phone number registry only. Pending messages and friend requests are not counted in the history limit.');const b=card(p,'Anti-Spam');note(b,'Always on · 2s message cooldown · 15 messages/min · 250 characters · 30s friend request cooldown. Presence updates every 60s; reconnect backoff up to 60s. GPS sharing: one saved pin every 10s. No automatic location sharing.');const k=card(p,'Blocked Users · '+state.blocked.length);if(!state.blocked.length)note(k,'No blocked users.');for(const r of state.blocked){const row=el('div',null,'fc-item');row.append(el('strong',who(r)),button('Unblock',()=>commit(d=>{d.blocked=d.blocked.filter(x=>x.id!==r.id);},'User unblocked locally.')));k.append(row);}}
    function render(){concealId();root.replaceChildren();root.append(el('div',(state?.profile?.registry?'NUMBER REGISTERED':'NUMBER REGISTRY')+' · '+(net?.status()||'Offline'),'fc-banner'));if(state&&expiryStatus())note(root,expiryStatus());if(!state){note(root,error?notice:'Loading local contacts…');if(error)root.append(button('Retry',open));return;}const nav=el('div',null,'fc-nav');for(const [k,t] of [['profile','My Profile'],['friends','Friends'],['requests','Requests'],['messages','Messages'],['settings','Settings']]){const b=button(t,()=>navigate(k));b.setAttribute('aria-pressed',String(k===tab));nav.append(b);}root.append(nav);root.append(el('p','Communication: '+(net?.status()||'Offline'),'fc-note fc-net-status'));const n=el('div',notice,'fc-notice');n.setAttribute('role','status');n.dataset.error=String(error);root.append(n);if(confirmAction?.pin){renderPinChoice(confirmAction);return;}if(confirmAction){const a=confirmAction,c=card(root,'Confirm');note(c,a.t);c.append(button('Confirm',a.fn,'danger'),button('Cancel',()=>{confirmAction=null;render();}));return;}const body=el('div');root.append(body);({profile,friends,requests,messages,settings})[tab](body);}
    async function open(target){if(target){stopManaging();tab=target;peer='';confirmAction=null;}if(state){render();maybeRenew();return;}if(loading)return loading;error=false;render();loading=(async()=>{try{const r=await storage.get(KEY),d=r?.[KEY];if(d?.version===1&&d.profile?.id){state=normalize(d);}else{const fresh=initial();await storage.set({[KEY]:fresh});state=fresh;}notice='';await resumeVerification();}catch(e){error=true;notice='Cannot read or save local contacts. '+(e?.message||'');}finally{loading=null;render();if(state?.communicationEnabled)net?.setEnabled(true);maybeRenew();}})();return loading;}
    // Check only while the game tab exists, and only after explicit registry activation.
    void open();window.addEventListener('pageshow',async e=>{if(e.persisted&&state&&!working){working=true;try{await resumeVerification();}finally{working=false;render();}}});setInterval(maybeRenew,60000);setInterval(schedulePump,2500);doc.addEventListener('visibilitychange',schedulePump);window.addEventListener('focus',schedulePump);
    storage.onChanged?.((changes,area)=>{if(area!=='local'||!changes[KEY]||working||!state)return;const d=changes[KEY].newValue;if(d?.version!==1||!d.profile?.id)return;const changed=JSON.stringify(state)!==JSON.stringify(d);if(!changed)return;state=normalize(d,state);if(tab==='messages'||tab==='requests'||tab==='friends')render();});
    return Object.freeze({open,hideId:()=>concealId(),racing:Object.freeze({friends:()=>state?.communicationEnabled?(state.friends||[]).filter(f=>netId(f.id)&&!blocked(state,f.id,f.number)).map(f=>({id:f.id,number:f.number,username:f.username,online:!!net?.online(f.id)})):[],send:(id,m)=>{const f=state?.friends.find(x=>x.id===id);if(!state?.communicationEnabled||!f||blocked(state,id,f.number)||!net?.ready())return false;net.ensure(id,f.number);return net.transmit(id,m);}})});
  }
  Object.defineProperty(globalThis,'__frontvexContacts',{value:Object.freeze({mount}),configurable:false,writable:false});
})();
