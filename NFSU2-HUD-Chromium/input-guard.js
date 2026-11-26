/* Keyboard misfire filter for NFSU2 Modern HUD.
 * The browser key events are the only thing we touch here, never game physics.
 * In the running phase ALL driving keys are passed through (WASD and arrows).
 * Misfires are uneven: 55% last 1.5s and the rest keep the older short cut pattern.
 * Real key releases always go through; synthetic releases may be ignored by games.
 * v0.11.14 Drink "controls effect" (experimental, only while the Drink effect runs and the option is ON): steering keys can be swapped
 * (A<->D, Left<->Right) and, from the police question to the arrest, forward / back (W, S, Up, Down) can be swallowed (optionally with the brake held) while the inverted steering still works. Ctrl+Alt+Shift+Backspace ends it.
 */
(() => {
  "use strict";
  if (window.__nfsu2ThrottleGuard) return;

  const THROTTLE_KEYS = new Set(["KeyW", "ArrowUp"]);
  const ALL_KEYS = new Set(["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);
  const PRESSED = new Map();
  const SYNTHETIC = new WeakSet();

  // Natural Engine Misfire: independently choose the duration for EACH new cut.
  // 55%: exactly 1500ms; 45%: the original irregular 200–520ms pattern,
  //       including the former 16% probability of a 650–1000ms deep cut.
  // The normal drive intervals and Continuous CUT option are unchanged.
  const DRIVE_MIN_MS = 1900, DRIVE_MAX_MS = 5100;
  const CUT_MIN_MS = 200, CUT_MAX_MS = 520;
  const DEEP_CUT_MIN_MS = 650, DEEP_CUT_MAX_MS = 1000;
  const DEEP_CUT_CHANCE = 0.16;
  const LONG_MISFIRE_CHANCE = 0.55;
  const LONG_MISFIRE_MS = 1500;
  let active = false, scope = "throttle", pattern = "stutter", emergency = false;
  let phase = "drive", phaseUntil = 0, lastHeartbeat = 0;
  // ---- v0.11.14 Drink controls effect
  const DK_SWAP = { KeyA: "KeyD", KeyD: "KeyA", ArrowLeft: "ArrowRight", ArrowRight: "ArrowLeft" };
  const DK_INFO = { KeyA: ["a", 65], KeyD: ["d", 68], KeyW: ["w", 87], KeyS: ["s", 83], ArrowLeft: ["ArrowLeft", 37], ArrowRight: ["ArrowRight", 39], ArrowUp: ["ArrowUp", 38], ArrowDown: ["ArrowDown", 40] };
  const DK_BLOCK = new Set(["KeyW", "KeyS", "ArrowUp", "ArrowDown"]);   // forward / back: swallowed while locked
  const dkMap = new Map();          // real steering key -> { to: the opposite key the game is told about, target }
  let dkInvert = false, dkLock = false, dkBrakeOn = false, lastKeyTarget = null;
  let heldAtActivation = new Set();
  // Menu focus is resolved inside the closed shadow root by content.js.
  // At document_start intercept before the page can cancel native text editing.
  let menuKeyboard = null;
  const gameKeysDown = new Set(), menuKeysDown = new Set();
  const keyIdentity = e => e.code || e.key || '';
  function menuEditing() { return Boolean(menuKeyboard?.isEditing()); }
  function protectMenuKeydown(e) {
    if (!menuEditing()) return false;
    const key = keyIdentity(e);
    if (key) menuKeysDown.add(key);
    // Never preventDefault for editing: Chromium must perform insertion,
    // selection, clipboard shortcuts, deletion, navigation and IME itself.
    e.stopImmediatePropagation();
    if (e.key === 'Escape' && !e.isComposing) {
      e.preventDefault();
      if (!e.repeat) menuKeyboard?.onEscape();
    }
    return true;
  }

  function codeOf(e) {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) return e.key;
    return e.code || "";
  }
  function editable(e) {
    if (e.isComposing) return true;
    const path = typeof e.composedPath === "function" ? e.composedPath() : [e.target];
    const focus = document.activeElement;
    for (const node of [focus, ...path]) {
      if (!node || node.nodeType !== 1) continue;
      if (node.isContentEditable) return true;
      if (typeof node.closest === "function" && node.closest('input,textarea,select,[contenteditable="true"],[role="textbox"]')) return true;
    }
    return false;
  }
  const selected = code => (scope === "all" ? ALL_KEYS : THROTTLE_KEYS).has(code);
  const emergencyKey = e => e.ctrlKey && e.altKey && e.shiftKey &&
    (e.code === "Backspace" || e.key === "Backspace") && !e.metaKey;
  const foreground = () => document.visibilityState === "visible" &&
    (typeof document.hasFocus !== "function" || document.hasFocus());
  const randDuration = (min, max) => min + Math.floor(Math.random() * (max - min + 1));
  const randomDrive = () => randDuration(DRIVE_MIN_MS, DRIVE_MAX_MS);
  const originalRandomCut = () => Math.random() < DEEP_CUT_CHANCE
    ? randDuration(DEEP_CUT_MIN_MS, DEEP_CUT_MAX_MS)
    : randDuration(CUT_MIN_MS, CUT_MAX_MS);
  // Make this choice once when a new misfire begins, not on every heartbeat.
  const randomCut = () => Math.random() < LONG_MISFIRE_CHANCE
    ? LONG_MISFIRE_MS
    : originalRandomCut();

  function releaseHeldKeys() {
    // Fake key UP only; a fabricated key DOWN could accelarate the car by itself.
    if (typeof KeyboardEvent !== "function") return;
    for (const [code, pressed] of PRESSED) {
      if (!selected(code) || pressed.editable || !pressed.forwarded) continue;
      try {
        const evt = new KeyboardEvent("keyup", {
          key: pressed.key, code: pressed.code, bubbles: true, cancelable: true,
          ctrlKey: false, altKey: false, metaKey: false, shiftKey: false
        });
        SYNTHETIC.add(evt);
        const target = pressed.target && typeof pressed.target.dispatchEvent === "function"
          ? pressed.target : window;
        target.dispatchEvent(evt);
        pressed.forwarded = false;
      } catch (_err) { /* Some game listeners ignore these synthetic releases. */ }
    }
  }

  function dkTarget() {
    return lastKeyTarget && lastKeyTarget.isConnected ? lastKeyTarget : (document.activeElement || document.body || window);
  }
  function dkFire(type, code, target, repeat = false) {
    const info = DK_INFO[code];
    if (!info || typeof KeyboardEvent !== "function") return;
    try {
      const evt = new KeyboardEvent(type, { key: info[0], code, keyCode: info[1], which: info[1], bubbles: true, cancelable: true, composed: true, repeat: Boolean(repeat) });
      SYNTHETIC.add(evt);
      (target && typeof target.dispatchEvent === "function" ? target : window).dispatchEvent(evt);
    } catch (_err) { /* some listeners ignore synthetic events */ }
  }
  function dkReleaseHeld(codes) {          // tell the game that keys it saw going down are up now
    for (const code of codes) {
      const pressed = PRESSED.get(code);
      if (!pressed || !pressed.forwarded || pressed.editable) continue;
      dkFire("keyup", code, pressed.target || dkTarget());
      pressed.forwarded = false;
    }
  }
  function dkReleaseMapped() {
    for (const [, m] of dkMap) dkFire("keyup", m.to, m.target);
    dkMap.clear();
  }
  function dkSetBrake(on) {
    if (on === dkBrakeOn) return;
    dkBrakeOn = on;
    const target = dkTarget();
    for (const code of ["KeyS", "ArrowDown"]) dkFire(on ? "keydown" : "keyup", code, target);
  }
  function dkClear() {
    dkInvert = false; dkLock = false;
    dkReleaseMapped(); dkSetBrake(false);
  }
  function dkHandleKeydown(e) {
    if (emergency || !(dkInvert || dkLock) || !foreground()) return false;
    if (e.ctrlKey || e.altKey || e.metaKey || editable(e)) return false;
    const code = codeOf(e);
    if (!ALL_KEYS.has(code)) return false;
    if (dkLock && DK_BLOCK.has(code)) { e.preventDefault(); e.stopImmediatePropagation(); return true; }
    const to = DK_SWAP[code];
    if (!dkInvert || !to) return false;
    e.preventDefault(); e.stopImmediatePropagation();
    const old = dkMap.get(code);
    dkMap.set(code, { to, target: old ? old.target : e.target });
    dkFire("keydown", to, old ? old.target : e.target, e.repeat);
    return true;
  }

  function phaseUpdate(now = Date.now()) {
    if (!active || pattern !== "stutter") return;
    if (!phaseUntil) { phase = "drive"; phaseUntil = now + randomDrive(); return; }
    // Move the phase clock forward without making the whole page repaint.
    let steps = 0;
    while (now >= phaseUntil && steps++ < 50) {
      if (phase === "drive") {
        phase = "cut";
        phaseUntil += randomCut();
        releaseHeldKeys();
      } else {
        phase = "drive";
        phaseUntil += randomDrive();
      }
    }
    if (steps >= 50) { phase = "drive"; phaseUntil = now + randomDrive(); }
  }
  function eligible() { return active && !emergency && foreground() && Date.now() - lastHeartbeat < 4500; }
  function blocked() { phaseUpdate(); return eligible() && (pattern === "continuous" || phase === "cut"); }

  function onKeydown(e) {
    if (SYNTHETIC.has(e)) return;
    if (emergencyKey(e) && (active || emergency || dkInvert || dkLock)) {
      emergency = true; active = false; phase = "drive"; phaseUntil = 0; heldAtActivation.clear();
      dkClear();
      window.dispatchEvent(new CustomEvent("nfsu2-hud-emergency-release"));
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    if (protectMenuKeydown(e)) return;
    if (!e.repeat || !lastKeyTarget) lastKeyTarget = e.target;
    if (dkHandleKeydown(e)) return;
    const code = codeOf(e);
    const isEditable = editable(e);
    const shouldStop = blocked() && !e.ctrlKey && !e.altKey && !e.metaKey && !isEditable && selected(code);
    if (ALL_KEYS.has(code)) {
      const old = PRESSED.get(code);
      if (!old) PRESSED.set(code, { code, key:e.key, target:e.target, editable:isEditable, forwarded:!shouldStop });
      else if (!shouldStop) old.forwarded = true;
    }
    // DRIVE: allow W/A/S/D and all arrows, including repeats, without exceptions.
    if (!shouldStop) {
      const key = keyIdentity(e);
      if (key) gameKeysDown.add(key);
      return;
    }
    e.preventDefault(); e.stopImmediatePropagation();
  }
  function onKeyup(e) {
    if (SYNTHETIC.has(e)) return;
    const code = codeOf(e);
    const swapped = dkMap.get(code);
    if (swapped) {                         // the real key was sent to the game as its opposite: release the opposite
      dkMap.delete(code); PRESSED.delete(code);
      e.stopImmediatePropagation();
      dkFire("keyup", swapped.to, swapped.target);
      return;
    }
    if (dkLock && DK_BLOCK.has(code) && !editable(e)) {   // blocked forward / back: the game never saw it go down, so a real key-up must not cancel the optional brake hold
      PRESSED.delete(code); heldAtActivation.delete(code); gameKeysDown.delete(keyIdentity(e));
      e.stopImmediatePropagation();
      return;
    }
    PRESSED.delete(code); heldAtActivation.delete(code);
    const key = keyIdentity(e);
    const wasForwarded = gameKeysDown.delete(key);
    const wasMenuKey = menuKeysDown.delete(key);
    // Release any key already forwarded before focus entered the menu.
    // A menu-only release must not trigger game controls after Tab/blur.
    if (!wasForwarded && (wasMenuKey || menuEditing())) e.stopImmediatePropagation();
    // Never block a real keyup for a previously forwarded driving key.
  }
  const controller = Object.freeze({
    setMenuKeyboardGuard({isEditing, onEscape} = {}) {
      menuKeyboard = typeof isEditing === 'function' && typeof onEscape === 'function'
        ? {isEditing, onEscape} : null;
    },
    configure({active:nextActive=false, scope:nextScope="throttle", pattern:nextPattern="stutter"} = {}) {
      const wasActive = active, oldPattern = pattern, oldScope = scope;
      active = Boolean(nextActive);
      scope = nextScope === "all" ? "all" : "throttle";
      pattern = nextPattern === "continuous" ? "continuous" : "stutter";
      lastHeartbeat = Date.now();
      if (!active) { phase = "drive"; phaseUntil = 0; heldAtActivation.clear(); return; }
      if (!wasActive || oldPattern !== pattern) {
        phase = "drive"; phaseUntil = Date.now() + randomDrive();
        heldAtActivation = new Set([...PRESSED.keys()].filter(selected));
        if (pattern === "continuous") releaseHeldKeys();
      } else {
        phaseUpdate();
        if (oldScope !== scope && blocked()) releaseHeldKeys();
      }
    },
    resetEmergency() { emergency = false; },
    // v0.11.14 Drink: { invert, lock, brake } - all false (or no call) = normal keys
    drink({ invert = false, lock = false, brake = false } = {}) {
      const wasInvert = dkInvert, wasLock = dkLock;
      dkInvert = Boolean(invert) && !emergency;
      dkLock = Boolean(lock) && !emergency;
      if (dkInvert && !wasInvert) dkReleaseHeld(["KeyA", "KeyD", "ArrowLeft", "ArrowRight"]);
      if (dkLock && !wasLock) dkReleaseHeld([...DK_BLOCK]);
      if (!dkInvert) dkReleaseMapped();
      dkSetBrake(dkLock && Boolean(brake) && !emergency);
    },
    drinkStatus() { return { invert: dkInvert, lock: dkLock, brake: dkBrakeOn, mapped: dkMap.size }; },
    status() {
      phaseUpdate();
      const stopping = blocked();
      return {
        active:eligible(), blocked:stopping, scope, pattern,
        phase:pattern === "continuous" ? "cut" : phase,
        remainingMs:pattern === "continuous" ? 0 : Math.max(0, phaseUntil-Date.now()),
        emergency, needsRelease:stopping && [...heldAtActivation].some(k => PRESSED.has(k))
      };
    }
  });
  Object.defineProperty(window, "__nfsu2ThrottleGuard", { value:controller, configurable:false });
  window.addEventListener("keydown", onKeydown, true);
  window.addEventListener("keyup", onKeyup, true);
  window.addEventListener("keypress", e => {
    if (menuEditing()) e.stopImmediatePropagation();
  }, true);
  for (const type of ["blur", "pagehide"]) {
    window.addEventListener(type, e => {
      if (type === "blur" && e.target !== window) return;
      active = false; phase = "drive"; phaseUntil = 0;
      dkReleaseMapped(); dkSetBrake(false);
      PRESSED.clear(); heldAtActivation.clear();
      gameKeysDown.clear(); menuKeysDown.clear();
    }, true);
  }
})();
