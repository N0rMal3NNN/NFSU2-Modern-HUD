"use strict";
// Shared adapter handles Firefox (browser.* promises) and Chromium (chrome.* callbacks).
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
