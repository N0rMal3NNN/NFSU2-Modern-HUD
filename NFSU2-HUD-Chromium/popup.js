"use strict";
// Shared adapter supports promise-based browser.* and callback-based chrome.* storage APIs.
const hudStorage = globalThis.__nfsu2HudStorage;
const enabled = document.querySelector("#enabled");
const modes = [...document.querySelectorAll('input[name="mode"]')];
const shiftModes = [...document.querySelectorAll('input[name="shiftMode"]')];
const manualLead = document.querySelector("#manualLead");

function safeWrite(values) {
  if (!hudStorage) return;
  void hudStorage.set(values).catch(error => {
    console.warn("[NFSU2 HUD] Popup save failed",error);
  });
}
if (hudStorage) {
  void hudStorage.get({
    hudEnabled:true, hudMode:"full", shiftMode:"auto", manualGreenLead:100
  }).then(({hudEnabled,hudMode,shiftMode,manualGreenLead}) => {
    enabled.checked=Boolean(hudEnabled);
    (modes.find(input=>input.value===hudMode)||modes[0]).checked=true;
    (shiftModes.find(input=>input.value===shiftMode)||shiftModes[0]).checked=true;
    manualLead.value=String([0,100,250].includes(manualGreenLead)?manualGreenLead:100);
    manualLead.disabled=shiftMode!=="manual";
  }).catch(error => console.warn("[NFSU2 HUD] Popup storage read failed",error));
}
enabled.addEventListener("change",()=>safeWrite({hudEnabled:enabled.checked}));
modes.forEach(input=>input.addEventListener("change",()=>{
  if(input.checked)safeWrite({hudMode:input.value});
}));
shiftModes.forEach(input=>input.addEventListener("change",()=>{
  if(input.checked){
    manualLead.disabled=input.value!=="manual";
    safeWrite({shiftMode:input.value});
  }
}));
manualLead.addEventListener("change",()=>safeWrite({manualGreenLead:Number(manualLead.value)}));

// Shortcut editor works even on a TKL keyboard with no Numpad keys.
const Hotkeys=globalThis.__nfsu2HudHotkeys;
let recordingKey=null;
const shortcuts={...Hotkeys.DEFAULTS};
const shortcutStatus=document.querySelector("#shortcutStatus");
function updateShortcutDisplay(){
  for(const key of Object.keys(shortcuts)){
    document.getElementById(key+"Display").textContent=Hotkeys.display(shortcuts[key]);
    const button=document.querySelector(`[data-bind="${key}"]`);
    button.textContent=recordingKey===key?"Press key…":"Change";
  }
}
function setShortcutStatus(message,error=false){
  shortcutStatus.textContent=message;shortcutStatus.style.color=error?"#ffbbb4":"#b7e4d8";
}
if(hudStorage){
  void hudStorage.get(["shortcutMenu","shortcutToggleHud","shortcutSaveAll","nfsu2HudActiveSettingsV2"]).then(saved=>{
    const snap=saved.nfsu2HudActiveSettingsV2?.settings || {};
    for(const key of Object.keys(shortcuts))shortcuts[key]=Hotkeys.canonical(saved[key]??snap[key])||Hotkeys.DEFAULTS[key];
    updateShortcutDisplay();
  }).catch(error=>setShortcutStatus("Could not load shortcuts: "+error.message,true));
  hudStorage.onChanged((changes,area)=>{
    if(area!=="local")return;
    for(const key of Object.keys(shortcuts))if(changes[key])shortcuts[key]=Hotkeys.canonical(changes[key].newValue)||Hotkeys.DEFAULTS[key];
    updateShortcutDisplay();
  });
}
for(const button of document.querySelectorAll("[data-bind]"))button.addEventListener("click",()=>{
  recordingKey=button.dataset.bind;
  updateShortcutDisplay();setShortcutStatus("Press your desired shortcut. Escape cancels.");
});
window.addEventListener("keydown",event=>{
  if(!recordingKey)return;
  if(event.code==="Escape"){
    event.preventDefault();event.stopImmediatePropagation();
    recordingKey=null;updateShortcutDisplay();setShortcutStatus("Recording cancelled.");return;
  }
  if(["ControlLeft","ControlRight","AltLeft","AltRight","ShiftLeft","ShiftRight","MetaLeft","MetaRight"].includes(event.code))return;
  event.preventDefault();event.stopImmediatePropagation();
  const spec=Hotkeys.fromEvent(event);
  if(!spec){setShortcutStatus("Invalid shortcut. Use Ctrl/Alt for letters and numbers.",true);return;}
  if(Object.entries(shortcuts).some(([key,value])=>key!==recordingKey && value===spec)){
    setShortcutStatus("This shortcut is already assigned to another HUD action.",true);return;
  }
  if(recordingKey!=="shortcutMenu" && spec===Hotkeys.TKL_MENU_FALLBACK){
    setShortcutStatus("Ctrl + Alt + M is reserved for opening the menu.",true);return;
  }
  const key=recordingKey;recordingKey=null;
  shortcuts[key]=spec;updateShortcutDisplay();
  if(!hudStorage)return setShortcutStatus("Browser storage unavailable.",true);
  void hudStorage.set({[key]:spec}).then(()=>setShortcutStatus(key+" set to "+Hotkeys.display(spec)+". Saved."))
    .catch(error=>setShortcutStatus("Failed to save: "+error.message,true));
},true);
document.querySelector("#shortcutResetDefaults").addEventListener("click",()=>{
  recordingKey=null;Object.assign(shortcuts,Hotkeys.DEFAULTS);updateShortcutDisplay();
  if(!hudStorage)return setShortcutStatus("Browser storage unavailable.",true);
  void hudStorage.set({...Hotkeys.DEFAULTS}).then(()=>setShortcutStatus("Original Numpad shortcuts restored. HUD and ODO untouched."))
    .catch(error=>setShortcutStatus("Reset failed: "+error.message,true));
});
