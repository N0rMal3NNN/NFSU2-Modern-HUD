/* NFSU2 Modern HUD — shared, local-only keyboard shortcut validation. */
(() => {
  "use strict";
  const DEFAULTS = Object.freeze({
    shortcutMenu: "NumpadAdd",
    shortcutToggleHud: "NumpadSubtract",
    shortcutSaveAll: "NumpadMultiply"
  });
  // TKL fallback works before users have had a chance to remap their keys.
  const TKL_MENU_FALLBACK = "Ctrl+Alt+KeyM";
  const KEY_CODES = /^(?:Key[A-Z]|Digit[0-9]|Numpad(?:[0-9]|Add|Subtract|Multiply|Divide|Decimal|Enter)|F(?:[1-9]|1[0-2])|Insert|Delete|Home|End|PageUp|PageDown|Backquote|Minus|Equal|BracketLeft|BracketRight|Semicolon|Quote|Comma|Period|Slash|Backslash|IntlBackslash)$/;
  const modifierCodes=new Set(["ControlLeft","ControlRight","AltLeft","AltRight","ShiftLeft","ShiftRight","MetaLeft","MetaRight"]);
  const modOrder=["Ctrl","Alt","Shift"];
  function canonical(spec) {
    if(typeof spec!=="string")return null;
    const parts=spec.split("+");
    const code=parts.pop();
    if(!KEY_CODES.test(code))return null;
    if(parts.some(p=>!modOrder.includes(p)) || new Set(parts).size!==parts.length)return null;
    const ordered=modOrder.filter(m=>parts.includes(m));
    // Plain letters/numbers would intercept gameplay bindings and chat.
    if(/^(?:Key[A-Z]|Digit[0-9])$/.test(code) && !ordered.includes("Ctrl") && !ordered.includes("Alt"))return null;
    // Avoid standard browser/OS shortcuts and the emergency throttle release.
    if(ordered.join("+")==="Ctrl" && ["KeyW","KeyT","KeyN","KeyR","KeyL","KeyP","KeyS","KeyO","KeyF","KeyH","KeyJ"].includes(code))return null;
    return [...ordered,code].join("+");
  }
  function fromEvent(e){
    if(!e || e.metaKey || (typeof e.getModifierState==="function" && e.getModifierState("AltGraph")))return null;
    const code=e.code;
    if(modifierCodes.has(code))return null;
    const parts=[];
    if(e.ctrlKey)parts.push("Ctrl");
    if(e.altKey)parts.push("Alt");
    if(e.shiftKey)parts.push("Shift");
    parts.push(code);
    return canonical(parts.join("+"));
  }
  function display(spec){
    if(!spec)return "Not set";
    const names={NumpadAdd:"Numpad +",NumpadSubtract:"Numpad −",NumpadMultiply:"Numpad *",NumpadDivide:"Numpad /",NumpadDecimal:"Numpad .",NumpadEnter:"Numpad Enter",Backquote:"`",Minus:"-",Equal:"=",BracketLeft:"[",BracketRight:"]",Semicolon:";",Quote:"'",Comma:",",Period:".",Slash:"/",Backslash:"\\",IntlBackslash:"\\"};
    return spec.split("+").map(x=>names[x]||(/^(Key|Digit)/.test(x)?x.replace(/^Key|^Digit/,""):x)).join(" + ");
  }
  Object.defineProperty(globalThis,"__nfsu2HudHotkeys",{value:Object.freeze({DEFAULTS,TKL_MENU_FALLBACK,canonical,fromEvent,display}),configurable:false,writable:false});
})();
