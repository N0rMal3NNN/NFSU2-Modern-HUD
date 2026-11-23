/* Keyboard misfire filter for NFSU2 Modern HUD.
 * The browser key events are the only thing we touch here, never game physics.
 * In the running phase ALL driving keys are passed through (WASD and arrows).
 * Misfires are uneven: 55% last 1.5s and the rest keep the older short cut pattern.
 * Real key releases always go through; synthetic releases may be ignored by games.
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
  let heldAtActivation = new Set();

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
    if (emergencyKey(e) && (active || emergency)) {
      emergency = true; active = false; phase = "drive"; phaseUntil = 0; heldAtActivation.clear();
      window.dispatchEvent(new CustomEvent("nfsu2-hud-emergency-release"));
      e.preventDefault(); e.stopImmediatePropagation(); return;
    }
    const code = codeOf(e);
    const isEditable = editable(e);
    const shouldStop = blocked() && !e.ctrlKey && !e.altKey && !e.metaKey && !isEditable && selected(code);
    if (ALL_KEYS.has(code)) {
      const old = PRESSED.get(code);
      if (!old) PRESSED.set(code, { code, key:e.key, target:e.target, editable:isEditable, forwarded:!shouldStop });
      else if (!shouldStop) old.forwarded = true;
    }
    // DRIVE: allow W/A/S/D and all arrows, including repeats, without exceptions.
    if (!shouldStop) return;
    e.preventDefault(); e.stopImmediatePropagation();
  }
  function onKeyup(e) {
    if (SYNTHETIC.has(e)) return;
    const code = codeOf(e);
    PRESSED.delete(code); heldAtActivation.delete(code);
    // Never block a real keyup, even when engine misfire is active.
  }
  const controller = Object.freeze({
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
  for (const type of ["blur", "pagehide"]) {
    window.addEventListener(type, () => {
      active = false; phase = "drive"; phaseUntil = 0;
      PRESSED.clear(); heldAtActivation.clear();
    }, true);
  }
})();
