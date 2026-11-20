/* NFSU2 Modern HUD v0.9.31 — tyre wheel restoration and adjustable blue fog; irregular engine misfire / impact idle reset simulation; official read-only Car Feed HUD.
 * Numpad + opens/closes an in-game settings panel.
 * Numpad - toggles the ENTIRE custom Modern HUD (not the game's own HUD).
 * No modification to NFSU2's game code, rendering buffers, or physics.
 */
(() => {
  "use strict";
  if (window.__nfsu2ModernHudBooted) return;
  window.__nfsu2ModernHudBooted = true;

  const origin = location.origin;
  // Initialized by storage-adapter.js in the extension's isolated world.
  const hudStorage = globalThis.__nfsu2HudStorage;
  if (!hudStorage) return;
  const NITRO_CAPACITY = 2;
  const PROFILE_STORE_KEY = "nfsu2HudProfilesV1";
  const ACTIVE_SETTINGS_KEY = "nfsu2HudActiveSettingsV2"; // complete, atomic snapshot for recovery
  // Odometer is independent of HUD profiles and game saves. Resetting visual settings does not reset distance.
  const ODOMETER_STORE_KEY = "nfsu2HudOdometersV2"; // backward-compatible copy
  const ODOMETER_PRIMARY_STORE_KEY = "nfsu2HudOdometersV3"; // authoritative, survives old-v2 writes
  const ODOMETER_SELECTED_KEY = "nfsu2HudSelectedCarV1"; // independent last-car recovery
  const LEGACY_ODOMETER_STORE_KEY = "nfsu2HudOdometerV1";
  const ODOMETER_MAX_KM = 9999999.9; // Seven full integer digits plus 100 m precision
  // Every original game model. The browser port also includes the European 106/Corsa.
  // Identifiers are stable and independent of translated car display names.
  const ODOMETER_CARS = Object.freeze([
    ["ACURA_RSX","Acura RSX Type-S"],
    ["AUDI_A3","Audi A3 3.2 quattro"],
    ["AUDI_TT","Audi TT 3.2 quattro"],
    ["CADILLAC_ESCALADE","Cadillac Escalade"],
    ["FORD_FOCUS","Ford Focus ZX3"],
    ["FORD_MUSTANG","Ford Mustang GT"],
    ["HONDA_CIVIC","Honda Civic Si"],
    ["HUMMER_H2","Hummer H2"],
    ["HYUNDAI_TIBURON","Hyundai Tiburon GT"],
    ["INFINITI_G35","Infiniti G35"],
    ["LEXUS_IS300","Lexus IS 300"],
    ["LINCOLN_NAVIGATOR","Lincoln Navigator"],
    ["MAZDA_MX5","Mazda MX-5 / Miata"],
    ["MAZDA_RX7","Mazda RX-7"],
    ["MAZDA_RX8","Mazda RX-8"],
    ["MITSUBISHI_3000GT","Mitsubishi 3000GT"],
    ["MITSUBISHI_ECLIPSE","Mitsubishi Eclipse GSX"],
    ["MITSUBISHI_EVO8","Mitsubishi Lancer Evolution VIII"],
    ["NISSAN_240SX","Nissan 240SX"],
    ["NISSAN_350Z","Nissan 350Z"],
    ["NISSAN_SENTRA","Nissan Sentra SE-R Spec V"],
    ["NISSAN_SKYLINE","Nissan Skyline GT-R R34"],
    ["PEUGEOT_106","Peugeot 106"],
    ["PEUGEOT_206","Peugeot 206"],
    ["PONTIAC_GTO","Pontiac GTO"],
    ["SUBARU_IMPREZA","Subaru Impreza WRX STi"],
    ["TOYOTA_CELICA","Toyota Celica GT-S"],
    ["TOYOTA_COROLLA","Toyota Corolla GT-S"],
    ["TOYOTA_SUPRA","Toyota Supra"],
    ["VAUXHALL_CORSA","Vauxhall Corsa 1.8"],
    ["VOLKSWAGEN_GOLF","Volkswagen Golf GTI"]
  ]);
  const ODOMETER_CAR_IDS = new Set(ODOMETER_CARS.map(([id])=>id));
  const ODOMETER_LEGACY_ID = "__legacy__";

  const PROFILE_FORMAT = "nfsu2-modern-hud-profile";
  const PROFILE_LIMIT = 25;
  const HUD_STYLES = Object.freeze({
    modern: { name: "Modern HUD", implemented: true },
    analog: { name: "GT-R Analog HUD", implemented: true },
    old: { name: "Old Style HUD", implemented: false },
    retro2000: { name: "2000s HUD", implemented: false }
  });

  const ShiftGuide = window.__nfsu2ShiftGuide;
  if (typeof ShiftGuide !== "function") return;
  const shiftGuide = new ShiftGuide();
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const DEFAULT_COLORS = Object.freeze({
    colorPanelBg: "#0A1218", colorPanelBorder: "#B5DEE6", colorHeader: "#B3C3CA", colorLive: "#98DCD6",
    colorSpeed: "#F4F7F9", colorSpeedUnit: "#B3C3CA", colorGearLabel: "#B3C3CA", colorGear: "#72D4DD",
    colorRpmLabel: "#B7C6CF", colorRpmValue: "#ECF4F7", colorRpmStart: "#509DBB", colorRpmEnd: "#72D4DD",
    colorRpmTrack: "#334955", colorRpmRedline: "#F1A174",
    colorNitroLabel: "#B7C6CF", colorNitroValue: "#8FD5EF", colorNitroFirstStart: "#176CBB", colorNitroFirstEnd: "#42A7E8",
    colorNitroSecondStart: "#64C6F5", colorNitroSecondEnd: "#9BEAFF", colorNitroEmpty: "#344652", colorDivider: "#76939F",
    colorShiftLabel: "#B3C3CA", colorShiftNormal: "#F0F3F7", colorShiftNear: "#FFAD43", colorShiftReady: "#51E89D",
    colorShiftTextNormal: "#F0F3F7", colorShiftTextNear: "#FFAD43", colorShiftTextReady: "#51E89D",
    colorIcon: "#D7ECF2", colorIconAccent: "#41D9ED", colorTurboFill: "#45DBE8", colorTurboTrack: "#304D5C"
  });
  const COLOR_SECTIONS = Object.freeze([
    ["HUD shell", [
      ["colorPanelBg", "Background"], ["colorPanelBorder", "Outline"], ["colorDivider", "Separators"]]],
    ["Speed / gear", [
      ["colorSpeed", "Speed digits"], ["colorSpeedUnit", "KM/H text"],
      ["colorGearLabel", "GEAR label"], ["colorGear", "Gear number"]]],
    ["RPM", [
      ["colorRpmLabel", "RPM label"], ["colorRpmValue", "RPM digits"],
      ["colorRpmTrack", "Empty RPM bar"], ["colorRpmStart", "RPM bar — beginning"],
      ["colorRpmEnd", "RPM bar — end"], ["colorRpmRedline", "Redline marker"]]],
    ["Nitro", [
      ["colorNitroLabel", "NITRO label"], ["colorNitroValue", "Percent text"],
      ["colorNitroEmpty", "Empty Nitro bar"], ["colorNitroFirstStart", "1st charge — start"],
      ["colorNitroFirstEnd", "1st charge — end"], ["colorNitroSecondStart", "2nd charge — start"],
      ["colorNitroSecondEnd", "2nd charge — end"]]],
    ["Shift light", [
      ["colorShiftLabel", "SHIFT LIGHT label"], ["colorShiftNormal", "LEDs — normal"],
      ["colorShiftNear", "LEDs — get ready"], ["colorShiftReady", "LEDs — shift"],
      ["colorShiftTextNormal", "Text — normal"], ["colorShiftTextNear", "Text — get ready"],
      ["colorShiftTextReady", "Text — shift"]]],
    ["Extra indicators", [
      ["colorIcon", "Tyre / engine / suspension icons"],
      ["colorIconAccent", "Icon dividers"], ["colorTurboFill", "Engine-load bar"],
      ["colorTurboTrack", "Engine-load track"]]]
  ]);
  const SUGGESTED_COLORS = Object.freeze(["#F3F5F7", "#72D4DD", "#5F9FFF", "#57D6A4", "#F5A95F", "#FF666B", "#BC88FF", "#F686CA", "#101820"]);
  const THEME_PRESETS = Object.freeze([
    ["Classic", null], ["Aqua", "#72D4DD"], ["Blue", "#5F9FFF"],
    ["Green", "#57D6A4"], ["Purple", "#BC88FF"], ["Orange", "#F5A95F"]
  ]);
  const DEFAULTS = Object.freeze({
    hudEnabled: true, hudMode: "full", hudStyle: "modern", speedUnit: "kmh", speedDepth: "subtle",
    hudPerformanceMode: "balanced", shiftMode: "auto", manualGreenLead: 100,
    hudPosition: "bottom-right", hudScale: 100, hudBackgroundOpacity: 90, hudTextOpacity: 100, hudUpdateFps: 20,
    showSpeed: true, showRpm: true, showGear: true, showNitro: true, showShift: true,
    showIcons: true, showTyreIcon: true, showEngineIcon: true, showSuspIcon: true,
    showTurbo: true, showTelemetryWarnings: true,
    speedSensationEnabled: true, speedSensationIntensity: 100, speedSensationFogEnabled: true, speedSensationFogPercent: 12, speedSensationStartKmh: 190,
    impactFeedbackEnabled: true, impactFeedbackIntensity: 70, impactFeedbackFlash: true, impactFeedbackShake: true,
    collisionMinSpeedKmh: 130, collisionMinDv: 3.5,
    impactFeedbackMediumDv: 8.0, impactFeedbackHeavyDv: 24.0,
    damageEnabled: false, damageHitMode: "random", damageCustomHits: 13, damageRepairSeconds: 30,
    damageInputCut: true, damageCutScope: "throttle", damageCutPattern: "stutter",
    damageImpactIdleReset: true, damageImpactResetSeconds: 60,
    damageMinImpact: 5.0, menuLeftPx: -1, menuTopPx: -1, menuWidthPx: 360, menuHeightPx: 640,
    analogTurboOffsetX: 0, analogTurboOffsetY: 0,
    analogRpmOffsetX: 0, analogRpmOffsetY: 0,
    analogSpeedOffsetX: 8, analogSpeedOffsetY: 0,
    analogOdometerEnabled: true,
    analogNeedleColor: "#F4F2EF", analogNumbersColor: "#FFA334", analogTickColor: "#F49B31",
    analogGlowPercent: 0, analogDepthEnabled: false,
    tyreSlipThreshold: 3.4, tyreSlipHoldMs: 550, absBrakeThreshold: 0.80, impactYellowThreshold: 4.5, impactRedThreshold: 9.0,
    turboStartMode: "default", turboStartRpm: 1000, turboResponseMs: 300,
    ...DEFAULT_COLORS
  });
  const allowedPositions = new Set(["bottom-right", "bottom-left", "top-right", "top-left"]);
  const boolKeys = ["hudEnabled", "showSpeed", "showRpm", "showGear", "showNitro", "showShift", "showIcons", "showTurbo", "showTyreIcon", "showEngineIcon", "showSuspIcon", "damageEnabled", "damageInputCut", "damageImpactIdleReset", "showTelemetryWarnings", "speedSensationEnabled", "speedSensationFogEnabled", "impactFeedbackEnabled", "impactFeedbackFlash", "impactFeedbackShake", "analogOdometerEnabled", "analogDepthEnabled"];
  const ANALOG_POSITION_KEYS = ["analogTurboOffsetX","analogTurboOffsetY","analogRpmOffsetX","analogRpmOffsetY","analogSpeedOffsetX","analogSpeedOffsetY"];
  const colorKeys = new Set([...Object.keys(DEFAULT_COLORS), "analogNeedleColor", "analogNumbersColor", "analogTickColor"]);
  const validColor = color => typeof color === "string" && /^#[0-9a-f]{6}$/i.test(color);
  const alphaColor = (hex, alpha) => {
    const h = validColor(hex) ? hex : "#000000";
    return `rgba(${parseInt(h.slice(1,3),16)},${parseInt(h.slice(3,5),16)},${parseInt(h.slice(5,7),16)},${alpha})`;
  };
  let settings = { ...DEFAULTS };
  let customProfiles = [];
  let selectedProfileId = "built:racing";
  const BUILTIN_PROFILES = Object.freeze([
    { id: "built:racing", name: "Racing", settings: {hudMode:"full",showSpeed:true,showRpm:true,showGear:true,showNitro:true,showShift:true,showIcons:true,showTurbo:true} },
    { id: "built:drift", name: "Drift", settings: {hudMode:"full",showSpeed:true,showRpm:true,showGear:true,showNitro:true,showShift:true,showIcons:true,showTurbo:true} },
    { id: "built:cockpit", name: "Cockpit", settings: {hudMode:"cockpit",showGear:true,showShift:true,showNitro:true} }
  ]);
  let latest = null;
  let received = false;
  let feedReady = false;
  let lastPaintAt = 0;
  let nextEligibleAt = 0;
  let lastTurboRenderAt = 0;
  let oldTelemetry = null;
  let lastTelemetryAt = 0;
  let engineRedSince = 0;
  // Tyre slip needs to last a bit, otherwise every little turn triggers it.
  let slipBeganAt = 0;
  let slipLastSeenAt = 0;
  let slipConfirmed = false;
  // ABS warning is only estimated from sudden braking at speed, not real ABS data.
  let previousBrakeInput = 0;
  let brakeStartedAt = 0;
  let brakeStartedValue = 0;
  let abruptBrakeLatched = false;
  let impactAlertUntil = 0;
  let impactAlertSeverity = "";
  let currentIndicators = {tyre:"",engine:"",susp:""};
  let lastShiftState = "";
  let lastHudWorldDriving = false;
  let turboLastPct = -1;
  let renderQueued = false;
  let menuOpen = false;
  let saveTimer = null;
  let settingsSaving = false;
  let saveQueued = false;
  let lastSaveOperation = Promise.resolve();
  let settingsReady = false;
  // Car mileage is separate from both game's save files and visual HUD profiles.
  // One total per chosen MODEL; multiple owned cars of same model share a total.
  let odometerKm = 0;
  let odometers = Object.create(null), savedOdometers = Object.create(null);
  let selectedOdometerCar = "";
  let odometerReady = false, odometerDirty = false, odometerSaving = false, odometerSaveQueued = false;
  let odometerLastSampleAt = 0, odometerLastSpeedKmh = null, odometerSavedKm = 0;
  let odometerLastPersistAt = 0, odometerResetArmedAt = 0, odometerRevision = 0;
  let odometerSavePromise = Promise.resolve();
  let odometerUsingPrimary = false;
  // Damage is a HUD sim. Key filtering only affects browser keys, not the physcis.
  let damageHits = 0;
  let damageTarget = 13;
  let damageUntil = 0;
  let damageTimer = null;
  let impactIdleTimer = null;
  let lastCountedImpactAt = 0;
  let previousImpactCounter = null;
  let lastRawCollisionAt = -Infinity;
  let lastQualifiedCollisionAt = -Infinity;
  let lastCollisionVelocity = 0;
  // Preserve the speed immediately before an impact: the reported speed can
  // drop to near-zero on the same telemetry frame as a serious crash.
  let precedingCarSpeedKmh = 0;
  let precedingSpeedSampleAt = 0;
  let currentFrameCollision = null;
  let currentFrameLanding = null;
  let collisionSerial = 0;
  let observedImpactCounter = null;
  let observedImpact = null;
  let observedLandingCounter = null;
  let observedLanding = null;
  let lastDamageLabel = "";
  const IMPACT_GROUP_GAP_MS = 1300;
  const IMPACT_COOLDOWN_MS = 2000;
  let menuDrag = null;
  // Installed at document_start to capture keys before the game's usual bubbling listeners.
  const throttleGuard = window.__nfsu2ThrottleGuard || null;
  function syncThrottleGuard() {
    throttleGuard?.configure({
      active: settings.damageEnabled && settings.damageInputCut && damageIsActive()
        && settings.hudEnabled && !menuOpen && latest?.state?.driving !== false,
      scope: settings.damageCutScope,
      pattern: settings.damageCutPattern
    });
  }
  window.addEventListener("nfsu2-hud-emergency-release", () => {
    if (settings.damageInputCut) changeSetting("damageInputCut", false);
    throttleGuard?.configure({active:false});
    const status = menuShadow.getElementById("damageStatus");
    if (status) status.textContent = "EMERGENCY RELEASE: keyboard cut OFF. Re-enable only if wanted.";
  });

  const DEFAULT_TURBO_START_RPM = 1000;
  let turboTarget = 0, turboDisplay = 0;
  let lastRpmScale = 0;
  const dirtyKeys = new Set();

  function normalize(key, val) {
    if (boolKeys.includes(key)) return typeof val === "boolean" ? val : DEFAULTS[key];
    if (key === "hudMode") return val === "cockpit" ? "cockpit" : "full";
    if (key === "hudStyle") return typeof val === "string" && HUD_STYLES[val]?.implemented ? val : "modern";
    if (key === "speedUnit") return val === "mph" ? "mph" : "kmh";
    if (key === "damageHitMode") return val === "custom" ? "custom" : "random";
    if (key === "damageCutScope") return val === "all" ? "all" : "throttle";
    if (key === "damageCutPattern") return val === "continuous" ? "continuous" : "stutter";
    if (key === "damageImpactResetSeconds") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 15, 600) : DEFAULTS[key];
    if (key === "damageCustomHits") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 1, 100) : 13;
    if (key === "damageRepairSeconds") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 5, 600) : DEFAULTS[key];
    if (key === "damageMinImpact") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 2, 12) : DEFAULTS[key];
    if (key === "menuLeftPx" || key === "menuTopPx") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), -1, 5000) : -1;
    if (key === "menuWidthPx") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 320, 1800) : DEFAULTS[key];
    if (key === "menuHeightPx") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 260, 1600) : DEFAULTS[key];
    if (ANALOG_POSITION_KEYS.includes(key)) return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), -20000, 20000) : DEFAULTS[key];
    if (key === "analogGlowPercent") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/5)*5,0,100) : DEFAULTS[key];
    if (key === "speedDepth") return ["off","subtle","medium"].includes(val) ? val : "subtle";
    if (key === "hudPerformanceMode") return ["eco","balanced","smooth"].includes(val) ? val : "balanced";
    if (key === "speedSensationIntensity" || key === "impactFeedbackIntensity") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/5)*5, 0, 100) : DEFAULTS[key];
    if (key === "speedSensationFogPercent") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 0, 100) : DEFAULTS[key];
    if (key === "speedSensationStartKmh") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/5)*5, 140, 300) : DEFAULTS[key];
    if (key === "collisionMinSpeedKmh") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/10)*10, 0, 250) : DEFAULTS[key];
    if (key === "collisionMinDv") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 1, 10) : DEFAULTS[key];
    if (key === "impactFeedbackMediumDv") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 2, 14) : DEFAULTS[key];
    if (key === "impactFeedbackHeavyDv") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 8, 50) : DEFAULTS[key];
    if (key === "turboStartMode") return val === "custom" ? "custom" : "default";
    if (key === "turboStartRpm") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 800, 10000) : 1000;
    if (key === "turboResponseMs") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val) / 100) * 100, 200, 2200) : 300;
    if (key === "shiftMode") return val === "manual" ? "manual" : "auto";
    if (key === "manualGreenLead") return [0, 100, 250].includes(Number(val)) ? Number(val) : 100;
    if (key === "hudPosition") return allowedPositions.has(val) ? val : DEFAULTS[key];
    if (key === "hudScale") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 70, 130) : 100;
    if (key === "hudBackgroundOpacity" || key === "hudTextOpacity") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), 0, 100) : DEFAULTS[key];
    if (key === "hudUpdateFps") return [10,15,20,25,30].includes(Number(val)) ? Number(val) : 20;
    if (key === "tyreSlipThreshold") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*10)/10, 1, 8) : DEFAULTS[key];
    if (key === "tyreSlipHoldMs") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/50)*50, 250, 1000) : DEFAULTS[key];
    if (key === "absBrakeThreshold") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*20)/20, 0.55, 1) : DEFAULTS[key];
    if (key === "impactYellowThreshold") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 1, 8) : DEFAULTS[key];
    if (key === "impactRedThreshold") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)*2)/2, 3, 12) : DEFAULTS[key];
    if (colorKeys.has(key)) return validColor(val) ? val.toUpperCase() : DEFAULTS[key];
    return DEFAULTS[key];
  }

  // Separate, noninteractive telemetry root: the HUD cannot intercept steering/mouse.
  const host = document.createElement("div");
  host.id = "nfsu2-modern-hud-root";
  host.style.cssText = "position:fixed;z-index:2147483645;pointer-events:none;display:none;";
  const shadow = host.attachShadow({mode:"closed"});

  // Original, lightweight dashboard warning symbols for BOTH HUD skins.
  // The outline drawings are inline SVG: no raster assets, external requests or filters.
  const warningSymbols = Object.freeze({
    tyre: `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <!-- Restores the original wheel-with-tread icon from the Modern HUD. -->
      <circle cx="23" cy="24" r="18" stroke-width="2.15"/>
      <circle cx="23" cy="24" r="13.5" stroke-width="2.15"/>
      <circle cx="23" cy="24" r="8" stroke-width="2.15"/>
      <circle cx="23" cy="24" r="3" stroke-width="2.15"/>
      <path d="M23 16v-4M23 32v4M15 24h-4M31 24h4M17.3 18.3l-3.1-3.1M28.7 29.7l3.1 3.1M28.7 18.3l3.1-3.1M17.3 29.7l-3.1 3.1" stroke-width="2.1"/>
      <path d="M19 6l-1.5 4M27 6l1.5 4M37 15l-4 2M40 23h-4M37 33l-4-2M27 42l1-4M18 42l1-4M10 33l4-2M6 23h4M10 15l4 2" stroke-width="1.5"/>
    </g>`,
    engine: `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M11.3 17.6h5.3v-5.4h13.6v4.5h4.6v5.2h4.9v11.2h-5.3l-3.2 4.1H16.1L13 33.1H8.3V22h3z"/>
      <path d="M18 12.2V8.8h12.4M34.8 21.9V18M39.7 24.8h2.5v6.8h-2.5"/>
      <path d="M17.7 18.8h11.5M18 24.1h8.2" stroke-width="2.1"/>
      <path d="m17.6 36.8 1.7 2.2h10.2l1.7-2.2"/>
    </g>`,
    susp: `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M18.5 5.5h11v5h-11zM21.5 10.5v3.1m5-3.1v3.1"/>
      <path d="M24 12.8v26.7" stroke-width="1.6"/>
      <path d="M16.4 14.2h15.2M17.2 16l13.6 4.2-13.6 4.2 13.6 4.2-13.6 4.2 13.6 4.2"/>
      <path d="M17 37.4h14M20.6 37.4v4.1h6.8v-4.1M17.5 43.5h13"/>
    </g>`
  });
  shadow.innerHTML = `
    <style>
      :host{all:initial}
      *,*::before,*::after{box-sizing:border-box}
      .hud{contain:layout style;--panel-bg:rgba(10,18,24,.86);--panel-border:rgba(181,222,230,.40);--header:#b3c3ca;--live:#98dcd6;
        --speed:#f4f7f9;--speed-unit:#b3c3ca;--gear-label:#b3c3ca;--gear:#72d4dd;
        --rpm-label:#b7c6cf;--rpm-value:#ecf4f7;--rpm-start:#509dbb;--rpm-end:#72d4dd;--rpm-track:#334955;--redline:#f1a174;
        --nitro-label:#b7c6cf;--nitro-value:#8fd5ef;--nitro-1-start:#176cbb;--nitro-1-end:#42a7e8;--nitro-2-start:#64c6f5;--nitro-2-end:#9beaff;--nitro-empty:#344652;--divider:#76939f;
        --shift-label:#b3c3ca;--shift-normal:#f0f3f7;--shift-near:#ffad43;--shift-ready:#51e89d;--shift-text-normal:#f0f3f7;--shift-text-near:#ffad43;--shift-text-ready:#51e89d;
        --icon:#d7ecf2;--icon-accent:#41d9ed;--turbo-fill:#45dbe8;--turbo-track:#304d5c;
        position:relative;width:500px;height:360px;isolation:isolate;overflow:visible; color:var(--speed);
        font-family:system-ui,-apple-system,'Segoe UI',Arial,sans-serif;font-variant-numeric:tabular-nums;user-select:none;
        -webkit-font-smoothing:antialiased;line-height:1.15;--text-alpha:1;
      }
      .shell{position:absolute;inset:0;width:100%;height:100%;z-index:-1;/* performance: expensive full-panel drop shadow removed */}
      .shell-fill{fill:var(--panel-bg);stroke:var(--panel-border);stroke-width:1.8;}
      .shell-edge{fill:none;stroke:var(--icon-accent);stroke-width:1.7;opacity:.62;}
      .rpm-section{position:absolute;top:19px;left:14px;width:370px;height:235px;}
      .rpm-svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;}
      .arc-bg,.arc-progress,.arc-redline{fill:none;stroke-width:12;stroke-linecap:round;}
      .arc-bg{stroke:var(--rpm-track);opacity:.8;}
      .arc-progress{stroke:url(#rpm-cyan-gradient);stroke-dasharray:0 100;/* performance: avoid per-frame filter and CSS dash animation */}
      .arc-redline{stroke:var(--redline);stroke-dasharray:0 100;opacity:.86}
      .dial-scale-label{font-size:13px;fill:var(--rpm-label);font-weight:740;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:rgba(0,0,0,.58);stroke-width:2.5px;stroke-linejoin:round;}
      .rpm-caption{position:absolute;left:136px;top:113px;color:var(--rpm-label);font-size:12px;letter-spacing:1.6px;font-weight:750;}
      .rpm-digits{position:absolute;left:136px;top:134px;color:var(--rpm-value);font-size:13px;font-weight:700;letter-spacing:.4px;}
      .speed{position:absolute;left:149px;top:179px;display:flex;align-items:baseline;gap:8px;white-space:nowrap;}
      .speed-number{font-size:61px;font-weight:790;letter-spacing:-3px;line-height:.95;color:var(--speed);}
      /* Clearly distinct 3D styles, only inexpensive static CSS text shadows. */
      .hud .speed-number{text-shadow:none;-webkit-text-stroke:0 transparent;}
      .hud.depth-subtle .speed-number{
        -webkit-text-stroke:.35px rgba(235,250,255,.42);
        text-shadow:-1px -1px 0 rgba(244,253,255,.40), 1px 1px 0 #27424d,
          2px 2px 0 #162832, 3px 3px 1px rgba(0,0,0,.80);
      }
      .hud.depth-medium .speed-number{
        -webkit-text-stroke:.7px rgba(243,254,255,.68);
        text-shadow:-1px -2px 0 rgba(252,255,255,.64),1px 1px 0 #567d8d,
          2px 2px 0 #416273,3px 3px 0 #2d4a5c,4px 4px 0 #223b4d,
          5px 5px 0 #182c3c,6px 6px 0 #112331,7px 7px 0 #0b1925,
          8px 8px 1px rgba(0,0,0,.84);
      }
      .speed-unit{font-size:13px;letter-spacing:1px;color:var(--speed-unit);}
      /* Small standalone LCD below speed digits, above the shift bar. */
      .modern-odo{position:absolute;left:149px;top:247px;height:18px;min-width:188px;
        display:flex;align-items:center;gap:8px;padding:1px 7px;border:1px solid rgba(128,163,169,.55);
        border-radius:5px;background:rgba(17,30,35,.94);white-space:nowrap;line-height:1;}
      .modern-odo-label{color:#90aeb4;font-size:9px;font-weight:800;letter-spacing:.6px;}
      .modern-odo-digits{color:#d7e7e1;font:800 13px Consolas,'Courier New',monospace;letter-spacing:1px;}
      .compact .modern-odo{display:none!important;}
      .gear-box{position:absolute;right:36px;top:222px;text-align:center;min-width:72px;}
      .gear-label{font-size:11px;letter-spacing:1.7px;color:var(--gear-label);}
      .gear{font-size:44px;font-weight:780;color:var(--gear);line-height:1.02;}
      .icons{position:absolute;right:22px;top:34px;width:130px;display:flex;flex-direction:column;gap:6px;}
      .icon-row.is-hidden{display:none!important;}
      .icon-row{height:38px;border-radius:13px;border:1px solid var(--divider);background:rgba(0,0,0,.10);display:flex;align-items:center;justify-content:space-around;gap:8px;padding:3px 9px;}
      .icon-row svg{width:33px;height:33px;fill:none;stroke:var(--icon);stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;flex:none;}
      .icon-name{flex:1;letter-spacing:1px;font-size:10px;font-weight:750;color:var(--icon);text-align:left;opacity:calc(var(--text-alpha) * .83);}
      .engine-load{position:absolute;right:25px;top:179px;width:128px;color:var(--rpm-label);font-size:10px;}
      .load-title{display:flex;justify-content:space-between;gap:3px;letter-spacing:.65px;margin:0 0 5px;}
      .load-title b{color:var(--icon-accent);font-weight:800;}
      .load-track{height:7px;border-radius:8px;background:var(--turbo-track);overflow:hidden;}
      .load-fill{width:100%;height:100%;background:linear-gradient(90deg,var(--turbo-fill),var(--icon-accent));border-radius:8px;transform:scaleX(0);transform-origin:left center;}
      .shift-strip{position:absolute;left:155px;top:274px;display:flex;align-items:center;gap:10px;}
      .shift-name{font-size:10px;color:var(--shift-label);letter-spacing:1.1px;font-weight:750;}
      .shift-leds{display:flex;gap:7px;}
      .shift-led{width:34px;height:10px;border-radius:6px;background:var(--shift-normal);transition:background-color 150ms ease,box-shadow 150ms ease;}
      .shift-text{font-size:10px;min-width:62px;color:var(--shift-text-normal);font-weight:780;transition:color 150ms ease;}
      .shift-strip.near .shift-led{background:var(--shift-near);}
      .shift-strip.near .shift-text{color:var(--shift-text-near)}
      .shift-strip.shift .shift-led{background:var(--shift-ready);}
      .shift-strip.shift .shift-text{color:var(--shift-text-ready)}
      .nitro-section{position:absolute;left:65px;right:31px;bottom:23px;}
      .nitro-heading{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;}
      .metric-name{font-size:11px;letter-spacing:1.5px;font-weight:750;color:var(--nitro-label)}
      .nitro-percent{font-size:18px;font-weight:800;color:var(--nitro-value)}
      .nitro-track{display:flex;gap:4px;height:11px;width:100%;}
      .nitro-cell{flex:1;min-width:0;background:var(--nitro-empty);border-radius:8px;overflow:hidden;}
      .nitro-fill{height:100%;width:100%;transform:scaleX(0);transform-origin:left center;transition:transform 100ms linear;}
      .nitro-fill.primary{background:linear-gradient(90deg,var(--nitro-1-start),var(--nitro-1-end))}
      .nitro-fill.secondary{background:linear-gradient(90deg,var(--nitro-2-start),var(--nitro-2-end))}
      .compact-gear-row{display:none;}
      .is-hidden{display:none!important;}
      .hud.compact{width:300px;height:148px;padding:0;background:var(--panel-bg);border:1px solid var(--panel-border);border-radius:60px 20px 26px 27px / 57px 20px 26px 27px;}
      .compact .shell,.compact .rpm-section,.compact .speed,.compact .icons,.compact .engine-load{display:none!important;}
      .compact .gear-box{top:25px;left:23px;right:auto;min-width:55px;}
      .compact .gear{font-size:39px;}
      .compact .shift-strip{top:36px;left:101px;gap:7px;}
      .compact .shift-name{display:none}
      .compact .shift-led{width:22px;height:8px}
      .compact .shift-text{font-size:9px;min-width:47px}
      .compact .nitro-section{left:20px;right:20px;bottom:15px;}
      .compact .nitro-percent{font-size:15px}
      /* text opacity independent of the background, gauges and LED segments */
      .dial-scale-label,.rpm-caption,.rpm-digits,.speed-number,.speed-unit,.gear-label,.gear,
      .load-title,.shift-name,.shift-text,.metric-name,.nitro-percent {opacity:var(--text-alpha)}
      .icon-row.warning-yellow svg,.icon-row.warning-yellow .icon-name{color:#FFC24B;stroke:#FFC24B;}
      .icon-row.warning-red svg,.icon-row.warning-red .icon-name{color:#FF5252;stroke:#FF5252;}
      .icon-row.warning-yellow{border-color:rgba(255,194,75,.55);animation:tyre-pulse .85s ease-in-out infinite;}
      .icon-row.warning-red{border-color:rgba(255,82,82,.7);}
      .icon-row.damage-critical{border-color:#fa5454;animation:damage-pulse 0.72s linear infinite;}
      .icon-row.damage-critical svg,.icon-row.damage-critical .icon-name{color:#ff6565;stroke:#ff6565;}
      @keyframes damage-pulse{0%,100%{opacity:1}50%{opacity:.52}}
      .damage-alert{position:absolute;right:5px;top:-54px;width:275px;padding:7px 13px;
        background:rgba(38,8,12,.94);border:1px solid #db555a;border-radius:10px;
        color:#fff;font:700 12px/1.2 system-ui,'Segoe UI',sans-serif;
        letter-spacing:.45px;pointer-events:none;display:none;contain:layout paint;
      }
      .damage-alert.show{display:block;}
      .damage-alert b{color:#ff777c;display:block;font-size:13px;margin-bottom:3px;}
      .damage-alert span{color:#ffe8e8;letter-spacing:.4px;}
      .damage-alert small{float:right;color:#f7b8bb;font-size:10px;}
      @media(prefers-reduced-motion:reduce){.icon-row.damage-critical{animation:none;}}
      @keyframes tyre-pulse{0%,100%{opacity:1}50%{opacity:.50}}
      /* Eco skips continuous warning pulses and animated shift lighting to reduce compositor work. */
      .hud.perf-eco .icon-row.warning-yellow{animation:none;opacity:1;}
      .hud.perf-eco .shift-led,.hud.perf-eco .shift-text{transition:none;}
      @media(prefers-reduced-motion: reduce){.icon-row.warning-yellow{animation:none}}

      /* Analog GT-R dashboard: nested gauges, left TURBO, centre RPM, right SPEED. */
      .analog-panel{display:none;position:absolute;left:0;top:0;width:735px;height:345px;pointer-events:none;font-family:Arial,'Segoe UI',sans-serif;}
      .hud[data-style="analog"]:not(.compact){width:735px;height:345px;}
      .hud[data-style="analog"]:not(.compact)>:not(.analog-panel){display:none!important;}
      .hud[data-style="analog"]:not(.compact) .analog-panel{display:block;}
      .analog-panel svg{width:100%;height:100%;display:block;overflow:visible;}
      .analog-backing{opacity:var(--analog-bg-opacity,.90);}
      .analog-foreground{opacity:var(--text-alpha,1);}
      .analog-dial-shell{fill:url(#analog-face);stroke:#302622;stroke-width:5;}
      .hud.analog-depth .analog-dial-shell{stroke-width:5.7;}
      .hud.analog-depth .analog-inner-ring{opacity:.88;stroke-width:1.4;}
      .hud.analog-depth .analog-trim{stroke-width:2.65;}
      .analog-trim{fill:none;stroke:url(#analog-rim);stroke-width:2.3;}
      .analog-rim-shadow{fill:none;stroke:#120d0c;stroke-width:9;}
      .analog-inner-ring{fill:none;stroke:#8b542b;stroke-width:1;opacity:.65;}
      .analog-tick{stroke:var(--analog-tick-color,#f49b31);stroke-width:1.3;stroke-linecap:round;opacity:.86;}
      .analog-tick.major{stroke:var(--analog-tick-major-color,#ffa139);stroke-width:2.8;opacity:1;}
      .analog-number{font:700 13px Arial,'Segoe UI',sans-serif;fill:var(--analog-numbers-color,#ffa334);text-anchor:middle;dominant-baseline:middle;}
      #analog-speed-ticks .analog-number{font-size:14.5px;}
      #analog-turbo-ticks .analog-number{font-size:10.3px;}
      .analog-number{paint-order:stroke fill;stroke:var(--analog-numbers-color,#ffa334);stroke-opacity:var(--analog-glow-alpha,0);stroke-width:var(--analog-glow-width,0px);stroke-linejoin:round;}
      .analog-redzone{fill:none;stroke:#ed342b;stroke-width:7;stroke-linecap:butt;}
      .analog-needle{fill:none;stroke:var(--analog-needle-color,#f4f2ef);stroke-width:3.5;stroke-linecap:round;}
      .analog-needle-core{fill:none;stroke:#8a9296;stroke-width:5.8;opacity:.42;}
      .analog-hub{fill:#17191b;stroke:#928073;stroke-width:2;}
      .analog-hub-inner{fill:#3f3733;}
      .analog-label{fill:#f2e7db;font:700 12.5px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:.5px;}
      .analog-sub{fill:#ee9c41;font:700 10px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:1px;}
      .analog-large-value{fill:#f6f4f0;font:800 52px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:-2px;}
      .analog-small-value{fill:#fff1e7;font:800 17px Arial,'Segoe UI',sans-serif;text-anchor:middle;}
      .analog-speed-unit{fill:#ffa544;font:750 12px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:1.3px;}
      .analog-nitro-label{fill:#f6a64b;font:750 10px Arial,'Segoe UI',sans-serif;letter-spacing:1px;}
      .analog-minibar{fill:#23242a;stroke:#996338;stroke-width:1;}
      .analog-charge-a{fill:#f08c24;}
      .analog-charge-b{fill:#ffbd63;}
      .analog-status-item{color:#f7efe5;}
      .analog-status-item .status-icon{fill:none;stroke:#ffd29b;stroke-width:2.9;stroke-linecap:round;stroke-linejoin:round;shape-rendering:geometricPrecision;vector-effect:non-scaling-stroke;}
      .analog-status-item text{fill:#f2c08c;font:700 9.6px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:.35px;transition:fill .12s ease;text-rendering:geometricPrecision;paint-order:stroke fill;stroke:rgba(13,9,6,.55);stroke-width:.45px;stroke-linejoin:round;}
      .analog-status-item .status-icon{transition:stroke .12s ease,opacity .12s ease;}
      .analog-status-item.label-changing text{opacity:1;}
      .analog-status-item.warning-yellow .status-icon{stroke:#ffd44f;fill:none;}
      .analog-status-item.warning-yellow text{stroke:#ffd44f;fill:#ffd44f;}
      .analog-status-item.warning-red .status-icon,.analog-status-item.damage-critical .status-icon{stroke:#ff5656;fill:none;}
      .analog-status-item.warning-red text,.analog-status-item.damage-critical text{stroke:#ff5656;fill:#ff6969;}
      .analog-status-item.warning-yellow,.analog-status-item.damage-critical{animation:analog-warning-flash .8s ease-in-out infinite;}
      @keyframes analog-warning-flash{50%{opacity:.35}}
      .analog-odo-shell{fill:#131418;stroke:#b57739;stroke-width:1.2;}
      .analog-odo-border{fill:#22252a;stroke:#4d3326;stroke-width:1.0;}
      .analog-odo-screen{fill:#bec6bc;stroke:#5a6967;stroke-width:1;}
      .analog-odo-label{fill:#1c2729;font:800 8.5px Arial,'Segoe UI',sans-serif;letter-spacing:.25px;}
      .analog-odo-digits{fill:#162022;font:700 12.8px ui-monospace,'Consolas',monospace;letter-spacing:1px;text-anchor:end;}
      .analog-shift-rect{fill:#f4efdf;stroke:#e2c8a6;stroke-width:1;}
      #analog-shift.near .analog-shift-rect{fill:#ffab3f;stroke:#ffbf70;}
      #analog-shift.shift .analog-shift-rect{fill:#58da88;stroke:#81ffaf;}
      #analog-shift text{fill:#c7a482;font:700 9px Arial,sans-serif;letter-spacing:.5px;}
      .analog-hide{display:none!important;}
      .hud.perf-eco .analog-status-item{animation:none!important;}
      @media(prefers-reduced-motion:reduce){.analog-status-item{animation:none!important;}}
    </style>
    <section class="hud" aria-label="NFSU2 racing HUD">
      <svg class="shell" viewBox="0 0 520 360" preserveAspectRatio="none" aria-hidden="true">
        <path class="shell-fill" d="M 25,242 C 33,144 86,72 175,38 C 249,6 379,9 465,20 Q 503,26 504,65 L 504,307 Q 502,345 463,346 L 78,346 C 47,345 24,312 25,242 Z"/>
        <path class="shell-edge" d="M 26,239 C 35,145 89,71 177,38 C 247,10 371,11 464,21"/>
      </svg>
      <div class="rpm-section" id="rpm-section">
        <svg class="rpm-svg" viewBox="0 0 370 230" aria-hidden="true">
          <defs><linearGradient id="rpm-cyan-gradient" x1="0" x2="1" y1="1" y2="0"><stop offset="0" style="stop-color:var(--rpm-start)"/><stop offset="1" style="stop-color:var(--rpm-end)"/></linearGradient></defs>
          <path class="arc-bg" d="M 42,210 C 45,132 100,72 169,51 C 235,31 293,57 330,113" pathLength="100"/>
          <path id="rpm-fill" class="arc-progress" d="M 42,210 C 45,132 100,72 169,51 C 235,31 293,57 330,113" pathLength="100"/>
          <path id="redline" class="arc-redline" d="M 42,210 C 45,132 100,72 169,51 C 235,31 293,57 330,113" pathLength="100"/>
          <g id="rpm-ticks"></g>
        </svg>
        <!-- Actual 0..N RPM scale labels are generated from the car's rpmMax field. -->
        <span class="rpm-caption">RPM × 1000</span><span class="rpm-digits"><span id="rpm">0</span> / <span id="rpm-max">—</span></span>
      </div>
      <div class="speed" id="speed-block"><span class="speed-number" id="speed">0</span><span class="speed-unit" id="speed-unit">KM/H</span></div>
      <div class="gear-box" id="gear-block"><div class="gear-label">GEAR</div><div class="gear" id="gear">N</div></div>
      <div class="compact-gear-row" id="compact-gear-row"><span id="compact-gear">N</span></div>
      <div class="modern-odo" id="modern-odometer" aria-label="Odometer of selected car"><span class="modern-odo-label">ODO</span><span class="modern-odo-digits" id="modern-odo-digits">--------.-</span></div>
      <div class="icons" id="icons-section" aria-label="Optional tyre, engine and suspension telemetry indicators">
        <div class="icon-row" id="tyre-indicator" title="SLIP: sustained wheel slip; BRAKE: regular braking; ABS: high-speed sudden braking estimate (not actual ABS telemetry)">
          <svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.tyre}</svg>
          <span class="icon-name">TYRES</span>
        </div>
        <div class="icon-row" id="engine-indicator" title="Red: RPM sustained at redline (not engine damage)">
          <svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.engine}</svg>
          <span class="icon-name">ENGINE</span>
        </div>
        <div class="icon-row" id="susp-indicator" title="Yellow/red: medium/strong impact event (not suspension damage)">
          <svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.susp}</svg>
          <span class="icon-name">COILOVER</span>
        </div>
      </div>
      <div class="engine-load" id="turbo-section" title="RPM-gated, smoothed engine-load indicator. Not real turbo boost pressure (bar/PSI).">
        <div class="load-title"><span>TURBO · LOAD</span><b id="turbo-pct">—</b></div>
        <div class="load-track"><div class="load-fill" id="turbo-fill"></div></div>
      </div>
      <div class="shift-strip" id="shift-strip" aria-label="Shift light: normal">
        <span class="shift-name">SHIFT</span>
        <span class="shift-leds" aria-hidden="true"><span class="shift-led"></span><span class="shift-led"></span></span>
        <span class="shift-text" id="shift-text">NORMAL</span>
      </div>
      <div class="nitro-section" id="nitro-section">
        <div class="nitro-heading"><span class="metric-name">NITRO</span><span class="nitro-percent" id="nitro-percent">0%</span></div>
        <div class="nitro-track" role="progressbar" aria-label="Nitro charge" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="nitro-track">
          <div class="nitro-cell"><div class="nitro-fill primary" id="nitro-first"></div></div>
          <div class="nitro-cell"><div class="nitro-fill secondary" id="nitro-second"></div></div>
        </div>
      </div>

      <div id="analog-panel" class="analog-panel" aria-label="GT-R Analog HUD — Turbo Load, RPM and Speed">
        <svg id="analog-svg" viewBox="0 0 735 345" aria-hidden="true">
          <defs>
            <radialGradient id="analog-face" cx="43%" cy="37%" r="72%">
              <stop offset="0" stop-color="#191617"/><stop offset=".73" stop-color="#0b0a0d"/><stop offset="1" stop-color="#070607"/>
            </radialGradient>
            <linearGradient id="analog-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#5a311c"/><stop offset=".23" stop-color="#ffe0af"/>
              <stop offset=".43" stop-color="#ec8e33"/><stop offset=".73" stop-color="#4c2b1f"/>
              <stop offset="1" stop-color="#ffa94f"/>
            </linearGradient>
          </defs>
          <g class="analog-backing">
            <g id="analog-turbo-back" transform="translate(15 0)">
              <circle class="analog-rim-shadow" cx="89" cy="236" r="78"/>
              <circle class="analog-dial-shell" cx="89" cy="236" r="74"/>
              <circle class="analog-trim" cx="89" cy="236" r="76"/>
              <circle class="analog-inner-ring" cx="89" cy="236" r="68"/>
            </g>
            <g id="analog-rpm-back">
            <circle class="analog-rim-shadow" cx="304" cy="199" r="116"/>
            <circle class="analog-dial-shell" cx="304" cy="199" r="113"/>
            <circle class="analog-trim" cx="304" cy="199" r="116"/>
            <circle class="analog-inner-ring" cx="304" cy="199" r="108"/>
            </g>
            <g id="analog-speed-back" transform="translate(-33 0)">
              <circle class="analog-rim-shadow" cx="595" cy="164" r="147"/>
              <circle class="analog-dial-shell" cx="595" cy="164" r="144"/>
              <circle class="analog-trim" cx="595" cy="164" r="147"/>
              <circle class="analog-inner-ring" cx="595" cy="164" r="137"/>
            </g>
          </g>
          <g class="analog-foreground">
            <g id="analog-turbo-face" transform="translate(15 0)">
              <g id="analog-turbo-ticks"></g>
              <path class="analog-redzone" id="analog-turbo-redzone"/>
              <g id="analog-turbo-needle"><path class="analog-needle-core" d="M89 236 V186"/><path class="analog-needle" d="M89 240 V186"/></g>
              <circle class="analog-hub" cx="89" cy="236" r="7"/>
              <circle class="analog-hub-inner" cx="89" cy="236" r="3.3"/>
              <text class="analog-label" x="89" y="275" style="font-size:11px">TURBO</text>
              <text class="analog-sub" x="89" y="286">LOAD</text>
            </g>
            <g id="analog-rpm-face">
              <g id="analog-rpm-ticks"></g>
              <path class="analog-redzone" id="analog-rpm-redzone"/>
              <g id="analog-rpm-needle"><path class="analog-needle-core" d="M304 199 V120"/><path class="analog-needle" d="M304 204 V119"/></g>
              <circle class="analog-hub" cx="304" cy="199" r="9"/>
              <circle class="analog-hub-inner" cx="304" cy="199" r="4"/>
              <text class="analog-label" x="304" y="164">RPM</text>
              <text class="analog-sub" x="304" y="178">× 1000</text>
              <g id="analog-shift">
                <text x="270" y="242">SHIFT</text>
                <rect class="analog-shift-rect" x="306" y="234" width="17" height="8" rx="4"/>
                <rect class="analog-shift-rect" x="328" y="234" width="17" height="8" rx="4"/>
              </g>
              <g id="analog-nitro">
                <text class="analog-nitro-label" x="264" y="273">NITRO</text>
                <text class="analog-nitro-label" x="352" y="273" text-anchor="end" id="analog-nitro-text">0%</text>
                <rect class="analog-minibar" x="263" y="281" width="90" height="9" rx="4"/>
                <rect class="analog-charge-a" id="analog-nitro-a" x="265" y="283" width="0" height="5" rx="2"/>
                <rect class="analog-charge-b" id="analog-nitro-b" x="309" y="283" width="0" height="5" rx="2"/>
              </g>
            </g>
            <g id="analog-speed-face" transform="translate(-33 0)">
              <g id="analog-speed-ticks"></g>
              <path class="analog-redzone" id="analog-speed-redzone"/>
              <g id="analog-status">
                <g id="analog-tyre" class="analog-status-item">
                  <g class="status-icon" transform="translate(553 147) scale(.56) translate(-24 -24)">${warningSymbols.tyre}</g>
                  <text x="553" y="168" id="analog-tyre-label">TYRES</text>
                </g>
                <g id="analog-engine" class="analog-status-item">
                  <g class="status-icon" transform="translate(594 108) scale(.56) translate(-24 -24)">${warningSymbols.engine}</g>
                  <text x="594" y="129" id="analog-engine-label">ENGINE</text>
                </g>
                <g id="analog-susp" class="analog-status-item">
                  <g class="status-icon" transform="translate(634 143) scale(.56) translate(-24 -24)">${warningSymbols.susp}</g>
                  <text x="634" y="164" id="analog-susp-label">SUSP</text>
                </g>
              </g>
              <g id="analog-speed-needle"><path class="analog-needle-core" d="M595 164 V63"/><path class="analog-needle" d="M595 169 V63"/></g>
              <circle class="analog-hub" cx="595" cy="164" r="10"/>
              <circle class="analog-hub-inner" cx="595" cy="164" r="4.4"/>
              <g id="analog-speed-digits"><text class="analog-speed-unit" x="595" y="195" id="analog-speed-unit">KM/H</text></g>
              <g id="analog-gear"><text class="analog-label" x="595" y="209" style="font-size:10px;fill:#f3a64c">GEAR</text>
                <text class="analog-small-value" x="595" y="230" style="font-size:21px" id="analog-gear-value">1</text></g>
              <g id="analog-odometer" aria-label="Distance driven, measured by this extension">
                <rect class="analog-odo-shell" x="531" y="239" width="128" height="35" rx="9"/>
                <rect class="analog-odo-border" x="534" y="242" width="122" height="29" rx="6"/>
                <rect class="analog-odo-screen" x="538" y="246" width="114" height="21" rx="3"/>
                <text class="analog-odo-label" x="540" y="260">ODO</text>
                <text class="analog-odo-digits" x="650" y="261" id="analog-odo-digits">--------.-</text>
              </g>

            </g>
          </g>
        </svg>
      </div>
    </section>
    <aside id="damage-alert" class="damage-alert" role="status" aria-live="off">
      <b>ENGINE DAMAGE</b><span>LIMP MODE ACTIVE</span><small id="damage-countdown">00:30</small>
    </aside>`;

  const menuHost = document.createElement("div");
  menuHost.id = "nfsu2-modern-hud-menu-root";
  menuHost.style.cssText = "position:fixed;inset:0;z-index:2147483647;pointer-events:none;display:none;";
  const menuShadow = menuHost.attachShadow({mode:"closed"});
  menuShadow.innerHTML = `
    <style>
      :host {all:initial;}
      *,*::before,*::after {box-sizing:border-box;}
      .panel {position:absolute;top:20px;right:20px;width:min(360px,calc(100vw - 30px));height:min(640px,calc(100vh - 40px));min-width:min(320px,calc(100vw - 20px));min-height:min(260px,calc(100vh - 20px));max-width:calc(100vw - 10px);max-height:calc(100vh - 10px);overflow:auto;
        pointer-events:auto;padding:17px 18px 14px;background:rgba(13,24,32,.97);color:#f0f7fa;
        border:1px solid #435b65;border-radius:16px;box-shadow:0 18px 60px rgba(0,0,0,.6);
        font:13px/1.4 system-ui,-apple-system,'Segoe UI',Arial,sans-serif;user-select:none;
      }
      /* Responsive masonry-style columns: widening the panel creates actual columns.
         Each fieldset remains a consistent readable width; controls never stretch. */
      .panel > .top{width:100%;max-width:none;}
      .panel > p{max-width:760px;}
      .sections-grid{column-width:305px;column-gap:16px;column-fill:balance;width:100%;}
      .sections-grid > fieldset{display:inline-block;vertical-align:top;width:100%;max-width:324px;
        min-width:0;margin:0 0 12px;break-inside:avoid-column;page-break-inside:avoid;}
      .panel input[type="range"],.panel select{max-width:300px;}
      .panel .two{max-width:100%;}
      .panel > .bottom,.panel > .status,.panel > .hint,.panel > .save-wrapper{max-width:660px;}
      .panel button{font-size:inherit;}
      h2{margin:0;font-size:17px;letter-spacing:.1px;}p{margin:5px 0 12px;color:#aec1c9;font-size:11px;}
      .top{display:flex;align-items:center;justify-content:space-between;gap:10px;cursor:grab;touch-action:none;padding:3px 1px 11px;margin-bottom:2px;border-bottom:1px solid #2c4650;}
      .top:active{cursor:grabbing;}
      .resize-grip{position:sticky;bottom:0;left:0;float:left;display:flex;align-items:center;justify-content:center;width:27px;height:27px;margin-left:-12px;margin-bottom:-9px;background:#263d49;border:1px solid #587784;border-radius:7px;color:#bce0ed;font-size:17px;line-height:1;cursor:nesw-resize;touch-action:none;z-index:2;user-select:none;}
      .resize-grip:hover{background:#395768;color:#fff;}
      .resize-help{font-size:10px;color:#98b7c2;margin:1px 0 10px;}
      .top .x{cursor:pointer;}
      .x{background:#20323b;border:1px solid #52666e;border-radius:9px;color:#e4f2f5;cursor:pointer;font-size:20px;width:32px;height:32px;}
      fieldset{border:1px solid #30454f;border-radius:11px;padding:9px 11px;margin:0 0 10px;}
      legend{color:#bdd2d9;font-size:11px;font-weight:700;padding:0 5px;letter-spacing:.4px;}
      .line{display:flex;align-items:center;gap:9px;margin:5px 0;}
      .space{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:4px 0 10px;}
      label{cursor:pointer;}select,input[type="color"],button{background:#20323e;color:#ecf4f8;border:1px solid #4b6974;border-radius:8px;font:inherit;}
      select{width:100%;padding:8px;}input[type="range"]{width:100%;margin:4px 0 9px;accent-color:#72d4dd;cursor:pointer;}
      input[type="checkbox"]{accent-color:#72d4dd;width:16px;height:16px;cursor:pointer;}
      input[type="color"]{width:43px;height:30px;cursor:pointer;padding:2px;}
      button{padding:8px 10px;cursor:pointer;}button:hover,.x:hover{background:#324a57;}
      .two{display:grid;grid-template-columns:1fr 1fr;gap:3px 12px;}
      .value{font-variant-numeric:tabular-nums;font-weight:800;color:#e6fafc;}
      .swatches{display:flex;align-items:center;justify-content:space-between;gap:7px;margin:7px 0 3px;}
      .swatch{width:29px;height:29px;padding:0;border-radius:50%;border:2px solid #526875;outline-offset:2px;}
      .swatch[aria-pressed="true"]{border:2px solid #fff;outline:1px solid #a2cdd8;}
      .bottom{display:flex;gap:10px;justify-content:space-between;}
      .bottom button{flex:1;}
      .hint{font-size:11px;color:#a8bdc5;line-height:1.55;margin-top:12px;}
      .kbd{display:inline-block;padding:1px 5px;color:#e4f6ff;background:#233c48;border:1px solid #4a6572;border-radius:5px;font:11px ui-monospace,Consolas,monospace;}
      .status{font-size:11px;color:#8de6c7;min-height:15px;margin-top:9px;}
      .preset-wrap{display:flex;flex-wrap:wrap;gap:6px;margin:7px 0 11px;}
      .preset-btn{padding:5px 8px;font-size:11px;font-weight:600;white-space:nowrap;}
      .preset-btn .dot{display:inline-block;width:10px;height:10px;border:1px solid #768e99;border-radius:50%;margin-right:5px;vertical-align:-1px;}
      details.colors{border:1px solid #344b57;border-radius:9px;margin:6px 0;background:rgba(255,255,255,.025);}
      details.colors summary{padding:9px 11px;cursor:pointer;font-size:12px;font-weight:750;}
      details.colors[open] summary{border-bottom:1px solid #344b57;}
      .color-row{padding:9px 9px 10px;border-bottom:1px solid #293e47;}
      .color-row:last-child{border-bottom:0;}
      .color-row-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;gap:10px;color:#dbeaf0;font-size:11px;}
      .color-controls{display:flex;gap:4px;align-items:center;flex-wrap:wrap;}
      .color-sample{width:22px;height:22px;border-radius:6px;padding:0;border:1px solid #637782;outline-offset:2px;}
      .color-sample[aria-pressed='true']{outline:1.5px solid white;border-color:white;}
      .color-picker{width:39px !important;height:25px !important;margin-left:auto;}
      .help{font-size:10px;color:#96adb7;margin:5px 0;line-height:1.4;}
      .speed-depth-demo{display:flex;align-items:center;justify-content:center;height:66px;margin:8px 0;border:1px solid #304753;background:#111d27;border-radius:11px;overflow:hidden;}
      .demo-speed{color:#f3f7fb;font-weight:850;font-size:42px;letter-spacing:-2px;line-height:1;}
      .speed-depth-demo[data-depth="subtle"] .demo-speed{-webkit-text-stroke:.35px rgba(235,250,255,.42);text-shadow:-1px -1px 0 rgba(244,253,255,.40),1px 1px 0 #27424d,2px 2px 0 #162832,3px 3px 1px #000;}
      .speed-depth-demo[data-depth="medium"] .demo-speed{-webkit-text-stroke:.7px rgba(243,254,255,.68);text-shadow:-1px -2px 0 rgba(252,255,255,.64),1px 1px 0 #567d8d,2px 2px 0 #416273,3px 3px 0 #2d4a5c,4px 4px 0 #223b4d,5px 5px 0 #182c3c,6px 6px 0 #112331,7px 7px 0 #0b1925,8px 8px 1px #000;}
      .panel fieldset[hidden]{display:none!important;}
      input:disabled {opacity:.4;cursor:not-allowed;}
      input[type="number"]{width:104px;height:32px;padding:5px 8px;border:1px solid #4b6974;border-radius:8px;background:#20323e;color:#ecf4f8;text-align:right;font:inherit;}
      @media(max-height:650px){.panel{max-height:calc(100vh - 10px);}}
    </style>
    <section class="panel" id="settingsPanel" aria-label="Modern HUD in-game settings" role="dialog" aria-modal="false">
      <div class="top" id="dragHandle" title="Drag menu with mouse"><h2>Modern HUD <span style="color:#72d4dd">v0.9.31</span></h2><button class="x" id="close" type="button" aria-label="Close settings">×</button></div>
      <p>Drag the header to move the menu. Drag the bottom-left corner to resize its width and height. Changes apply live and are saved.</p>
      <div class="sections-grid" id="sectionsGrid">
      <fieldset><legend>HUD</legend>
        <label class="line"><input type="checkbox" id="hudEnabled"> Enable custom HUD</label>
        <label for="hudMode" style="display:block;margin:6px 0">Display mode</label>
        <select id="hudMode"><option value="full">Full HUD</option><option value="cockpit">Cockpit (compact)</option></select>
      </fieldset>
      <fieldset><legend>HUD Style — ready for future skins</legend>
        <select id="hudStyle" aria-label="HUD style"><option value="modern">Modern HUD (default)</option><option value="analog">GT-R Analog HUD — orange / red / white</option><option value="old" disabled>Old Style HUD (coming later)</option><option value="retro2000" disabled>2000s HUD (coming later)</option></select>
        <div class="help">Modern is the default. GT-R Analog has three needles: TURBO LOAD (0–3 dial, left), RPM (centre), and SPEED (right, 0–400 KM/H or 0–250 MPH). TYRES, ENGINE and SUSP are around the centre; ODO appears at the bottom. Modern-only color settings are hidden for GT-R. Turbo reflects engine load, not measured boost pressure.</div>
      </fieldset>
      <fieldset><legend>Speedometer</legend>
        <label for="speedUnit" style="display:block;margin:5px 0">Speed units</label>
        <select id="speedUnit"><option value="kmh">KM/H — kilometres per hour</option><option value="mph">MPH — miles per hour</option></select>
        <label for="speedDepth" style="display:block;margin:10px 0 5px">Speed digits depth</label>
        <select id="speedDepth"><option value="off">Flat — no effects</option><option value="subtle">Subtle 3D — visibly embossed (default)</option><option value="medium">Strong 3D — raised metallic digits</option></select>
        <div class="speed-depth-demo" id="depthDemo" data-depth="subtle"><span class="demo-speed">185</span></div>
        <div class="help">Live preview above. Light CSS-only depth; no game physics change.</div>
      </fieldset>
      <fieldset><legend>Position / Size / Transparency</legend>
        <label for="hudPosition">HUD Position</label>
        <select id="hudPosition"><option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option><option value="top-right">Top Right</option><option value="top-left">Top Left</option></select>
        <div class="space" style="margin-top:12px"><label for="hudScale">HUD Scale</label><span class="value" id="hudScaleValue">100%</span></div>
        <input type="range" id="hudScale" min="70" max="130" step="5">
        <div class="space"><label for="hudBackgroundOpacity">Background opacity</label><span class="value" id="hudBackgroundOpacityValue">90%</span></div>
        <input type="range" id="hudBackgroundOpacity" min="0" max="100" step="5">
        <div class="space"><label for="hudTextOpacity">Text / numbers opacity</label><span class="value" id="hudTextOpacityValue">100%</span></div>
        <input type="range" id="hudTextOpacity" min="0" max="100" step="5">
        <label for="hudUpdateFps" style="display:block;margin:7px 0 5px">HUD update rate (FPS-friendly)</label>
        <select id="hudUpdateFps"><option value="10">10 Hz (lowest use)</option><option value="15">15 Hz (Eco)</option><option value="20">20 Hz (Default)</option><option value="25">25 Hz (Balanced)</option><option value="30">30 Hz (Smoother)</option></select>
        <label for="hudPerformanceMode" style="display:block;margin:10px 0 5px">Performance 2.0</label>
        <select id="hudPerformanceMode"><option value="eco">Eco — max 15 Hz, no warning pulse animation</option><option value="balanced">Balanced (default)</option><option value="smooth">Smooth — use selected refresh rate</option></select>
        <div class="help">The HUD renders only after new Car Feed messages, skips unnecessary DOM writes and pauses updates when the tab is hidden. Eco reduces cosmetic animations; this does not change the game's FPS cap.</div>
      </fieldset>
      <fieldset><legend>Visual Effects — Speed Sensation</legend>
        <label class="line"><input type="checkbox" id="speedSensationEnabled"> Enable Speed Sensation</label>
        <label class="line"><input type="checkbox" id="speedSensationFogEnabled"> Enable Blue Fog</label>
        <div class="space"><label for="speedSensationFogPercent">Blue Fog opacity</label><span class="value" id="speedSensationFogPercentValue">12%</span></div>
        <input type="range" id="speedSensationFogPercent" min="0" max="100" step="1" aria-label="Blue Fog opacity in percent">
        <div class="space"><label for="speedSensationIntensity">Effect intensity</label><span class="value" id="speedSensationIntensityValue">100%</span></div>
        <input type="range" id="speedSensationIntensity" min="0" max="100" step="5">
        <div class="space"><label for="speedSensationStartKmh">Start speed (KM/H)</label><span class="value" id="speedSensationStartKmhValue">190 km/h</span></div>
        <input type="range" id="speedSensationStartKmh" min="140" max="300" step="5">
        <div style="margin-top:9px"><button id="speedSensationPreview" type="button" style="width:100%">Preview Speed Sensation (5 seconds)</button></div>
        <div class="help">Cylindrical / tunnel-style speed sensation with subtle streaks converging toward the center, plus optional blue fog with independent opacity control (default 12%). Starts above your chosen KM/H threshold (default 190 km/h, even when MPH is selected), becomes clearly visible at higher speeds, and keeps the center view mostly clear. No camera or physics changes. Respects reduced-motion settings.</div>
      </fieldset>
      <fieldset><legend>Visual Effects — Impact Feedback</legend>
        <label class="line"><input type="checkbox" id="impactFeedbackEnabled"> Enable Impact Feedback</label>
        <div class="help">Collision balance (shared by Impact Feedback, SUSP warning and simulated engine damage): tiny nudges are ignored. Speed uses the car's speed just BEFORE or during an impact. This does not change in-game collision physics.</div>
        <div class="space"><label for="collisionMinSpeedKmh">Minimum collision speed</label><span class="value" id="collisionMinSpeedKmhValue">130 km/h</span></div>
        <input type="range" id="collisionMinSpeedKmh" min="0" max="250" step="10">
        <div class="space"><label for="collisionMinDv">Minimum impact velocity change</label><span class="value" id="collisionMinDvValue">3.5 m/s</span></div>
        <input type="range" id="collisionMinDv" min="1" max="10" step="0.5">
        <div class="space"><label for="impactFeedbackIntensity">Effect intensity</label><span class="value" id="impactFeedbackIntensityValue">70%</span></div>
        <input type="range" id="impactFeedbackIntensity" min="0" max="100" step="5">
        <div class="two">
          <label class="line"><input type="checkbox" id="impactFeedbackFlash"> Impact Flash</label>
          <label class="line"><input type="checkbox" id="impactFeedbackShake"> HUD Shake</label>
        </div>
        <div class="space"><label for="impactFeedbackMediumDv">Medium impact from (velocity change)</label><span class="value" id="impactFeedbackMediumDvValue">8.0 m/s</span></div>
        <input type="range" id="impactFeedbackMediumDv" min="2" max="14" step="0.5">
        <div class="space"><label for="impactFeedbackHeavyDv">Heavy impact from (velocity change)</label><span class="value" id="impactFeedbackHeavyDvValue">24.0 m/s</span></div>
        <input type="range" id="impactFeedbackHeavyDv" min="8" max="50" step="0.5">
        <div class="help">Light = white, Medium = orange, Heavy = red. Default: at least 130 km/h and 3.5 m/s impact velocity change; Medium at 8 m/s and Heavy at 24 m/s. This is a visual effect, not physics damage. You can tune the shared filter independently.</div>
        <div class="help" id="impactFeedbackLast" role="status">Last collision: none yet.</div>
        <div class="two" style="grid-template-columns:repeat(3,minmax(0,1fr));gap:5px;margin-top:7px">
          <button id="impactPreviewLight" type="button">Test Light</button>
          <button id="impactPreviewMedium" type="button">Test Medium</button>
          <button id="impactPreviewHeavy" type="button">Test Heavy</button>
        </div>
      </fieldset>
      <fieldset id="analogCustomizationSettings"><legend>GT-R Analog — Customization</legend>
        <div class="help">Customize dial highlights without changing circle sizes or positions. Original GT-R colors, brightness and depth remain the defaults.</div>
        <div class="space"><label for="analogNeedleColor">Needle color</label><input type="color" id="analogNeedleColor" value="#F4F2EF"></div>
        <div class="space"><label for="analogNumbersColor">Dial numbers color</label><input type="color" id="analogNumbersColor" value="#FFA334"></div>
        <div class="space"><label for="analogTickColor">Dial tick color</label><input type="color" id="analogTickColor" value="#F49B31"></div>
        <div class="space"><label for="analogGlowPercent">Number illumination</label><span class="value" id="analogGlowPercentValue">0%</span></div>
        <input type="range" id="analogGlowPercent" min="0" max="100" step="5">
        <label class="line"><input type="checkbox" id="analogDepthEnabled"> Subtle 3D dial trim (optional)</label>
      </fieldset>
      <fieldset id="odometerSettings"><legend>Odometer — Mileage by Car</legend>
        <div class="help">Choose the car you are currently driving. Each model has its OWN stored mileage. Switching cars never resets the others. Selection is manual; the game does not send a verified car model in the Car Feed.</div>
        <label for="odometerCarSelect" style="display:block;margin:9px 0 5px">Current vehicle (31 car models)</label>
        <select id="odometerCarSelect" aria-label="Select vehicle for mileage">
          <option value="">— Select a car first —</option><option value="ACURA_RSX">Acura RSX Type-S</option><option value="AUDI_A3">Audi A3 3.2 quattro</option><option value="AUDI_TT">Audi TT 3.2 quattro</option><option value="CADILLAC_ESCALADE">Cadillac Escalade</option><option value="FORD_FOCUS">Ford Focus ZX3</option><option value="FORD_MUSTANG">Ford Mustang GT</option><option value="HONDA_CIVIC">Honda Civic Si</option><option value="HUMMER_H2">Hummer H2</option><option value="HYUNDAI_TIBURON">Hyundai Tiburon GT</option><option value="INFINITI_G35">Infiniti G35</option><option value="LEXUS_IS300">Lexus IS 300</option><option value="LINCOLN_NAVIGATOR">Lincoln Navigator</option><option value="MAZDA_MX5">Mazda MX-5 / Miata</option><option value="MAZDA_RX7">Mazda RX-7</option><option value="MAZDA_RX8">Mazda RX-8</option><option value="MITSUBISHI_3000GT">Mitsubishi 3000GT</option><option value="MITSUBISHI_ECLIPSE">Mitsubishi Eclipse GSX</option><option value="MITSUBISHI_EVO8">Mitsubishi Lancer Evolution VIII</option><option value="NISSAN_240SX">Nissan 240SX</option><option value="NISSAN_350Z">Nissan 350Z</option><option value="NISSAN_SENTRA">Nissan Sentra SE-R Spec V</option><option value="NISSAN_SKYLINE">Nissan Skyline GT-R R34</option><option value="PEUGEOT_106">Peugeot 106</option><option value="PEUGEOT_206">Peugeot 206</option><option value="PONTIAC_GTO">Pontiac GTO</option><option value="SUBARU_IMPREZA">Subaru Impreza WRX STi</option><option value="TOYOTA_CELICA">Toyota Celica GT-S</option><option value="TOYOTA_COROLLA">Toyota Corolla GT-S</option><option value="TOYOTA_SUPRA">Toyota Supra</option><option value="VAUXHALL_CORSA">Vauxhall Corsa 1.8</option><option value="VOLKSWAGEN_GOLF">Volkswagen Golf GTI</option></select>
        <label class="line"><input type="checkbox" id="analogOdometerEnabled"> Show ODO in Analog &amp; Modern HUD</label>
        <div class="space"><span>Selected car mileage</span><span class="value" id="odometerMenuValue">No car selected</span></div>
        <div class="two"><button id="odometerSaveNow" type="button">Save mileage now</button><button id="odometerReset" type="button">Reset selected car</button></div>
        <div class="help" id="odometerStatus" role="status">Each 0.1 km is 100 m. Max 9,999,999.9 km. Autosave after EVERY 100 m (0.1 km) and every 30 seconds while driving. Press Numpad * to save mileage AND all active HUD settings.</div>
        <div class="help">Cars of the same model share one counter (e.g. two Skylines). Previous v0.9.27 mileage is preserved under "Previous ODO (unassigned)". Mileage is saved in the extension, not in the game's own save.</div>
      </fieldset>
      <fieldset id="analogPositionSettings"><legend>GT-R Analog — Full-Screen Circle Position</legend>
        <div class="help">Move Turbo, RPM and Speed circles independently anywhere on the screen. Sliders automatically cover your entire display, and the number boxes allow 1 px precision. Positions are relative to the original layout and saved in your profiles. The original default layout and circle sizes are unchanged.</div>
        <div class="space"><label for="analogTurboOffsetX">Turbo circle — Horizontal (X/Y)</label><span class="value" id="analogTurboOffsetXValue">0 px</span></div>
        <input type="range" id="analogTurboOffsetX" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogTurboOffsetXNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogTurboOffsetXNumber" min="-20000" max="20000" step="1" value="0" style="width:95px"></div>
        <div class="space"><label for="analogTurboOffsetY">Turbo circle — Vertical (X/Y)</label><span class="value" id="analogTurboOffsetYValue">0 px</span></div>
        <input type="range" id="analogTurboOffsetY" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogTurboOffsetYNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogTurboOffsetYNumber" min="-20000" max="20000" step="1" value="0" style="width:95px"></div>
        <div class="space"><label for="analogRpmOffsetX">RPM circle — Horizontal (X/Y)</label><span class="value" id="analogRpmOffsetXValue">0 px</span></div>
        <input type="range" id="analogRpmOffsetX" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogRpmOffsetXNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogRpmOffsetXNumber" min="-20000" max="20000" step="1" value="0" style="width:95px"></div>
        <div class="space"><label for="analogRpmOffsetY">RPM circle — Vertical (X/Y)</label><span class="value" id="analogRpmOffsetYValue">0 px</span></div>
        <input type="range" id="analogRpmOffsetY" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogRpmOffsetYNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogRpmOffsetYNumber" min="-20000" max="20000" step="1" value="0" style="width:95px"></div>
        <div class="space"><label for="analogSpeedOffsetX">Speed circle — Horizontal (X/Y)</label><span class="value" id="analogSpeedOffsetXValue">8 px</span></div>
        <input type="range" id="analogSpeedOffsetX" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogSpeedOffsetXNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogSpeedOffsetXNumber" min="-20000" max="20000" step="1" value="8" style="width:95px"></div>
        <div class="space"><label for="analogSpeedOffsetY">Speed circle — Vertical (X/Y)</label><span class="value" id="analogSpeedOffsetYValue">0 px</span></div>
        <input type="range" id="analogSpeedOffsetY" min="-3000" max="3000" step="1">
        <div class="space" style="margin-top:3px"><label for="analogSpeedOffsetYNumber" style="font-size:11px">Precise offset (px)</label><input type="number" id="analogSpeedOffsetYNumber" min="-20000" max="20000" step="1" value="0" style="width:95px"></div>
        <button id="analogResetPositions" type="button" style="width:100%;margin-top:10px">Reset Analog Circle Positions to Defaults</button>
      </fieldset>
      <fieldset><legend>HUD Profiles — Save / Download / Load</legend>
        <div class="help">Auto Save stores ALL current HUD settings. A saved profile is a separate snapshot: edit it, then press Update selected to replace its old values. Download Current exports the LIVE settings, while Download Selected exports a saved snapshot.</div>
        <label for="profileSelect" style="display:block;margin:7px 0 5px">Choose a profile</label>
        <select id="profileSelect"></select>
        <div class="two" style="margin-top:8px"><button id="profileApply" type="button">Apply selected</button><button id="profileDownload" type="button">Download selected .json</button></div>
        <div style="margin:7px 0"><button id="profileDownloadCurrent" type="button" style="width:100%">Download CURRENT settings .json</button></div>
        <div class="space" style="margin:12px 0 6px"><label for="profileName">Save current settings as</label></div>
        <input id="profileName" type="text" maxlength="48" placeholder="My racing HUD" autocomplete="off" style="width:100%;padding:8px;background:#20323e;border:1px solid #4b6974;border-radius:8px;color:#ecf4f8;font:inherit;" />
        <div class="two" style="margin-top:8px"><button id="profileSave" type="button">Save new profile</button><button id="profileUpdate" type="button">Update selected profile</button></div>
        <div style="margin:7px 0"><button id="profileDelete" type="button" style="width:100%">Delete selected profile</button></div>
        <label for="profileFile" style="display:block;margin:11px 0 6px">Import profile file</label>
        <input id="profileFile" type="file" accept=".json,application/json" style="width:100%;font-size:11px"/>
        <div class="help">Importing a valid profile saves it and applies it immediately. Built-in Racing, Drift and Cockpit examples cannot be deleted.</div>
        <div class="help" id="profileStatus" role="status">Profiles are stored locally in your browser.</div>
      </fieldset>
      <fieldset id="modernColorsSettings"><legend>Custom Colors — individually</legend>
        <div class="help">Tap any suggested color or its picker. Every color can be customized separately, live, without reloading the game.</div>
        <div class="help" style="color:#d3e7ee;font-weight:750">Quick color themes</div>
        <div class="preset-wrap" id="themePresets"></div>
        <div id="colorGroups"></div>
      </fieldset>
      <fieldset><legend>Show / Hide Elements</legend>
        <div class="two">
          <label class="line"><input type="checkbox" id="showSpeed"> Speedometer</label>
          <label class="line"><input type="checkbox" id="showRpm"> RPM</label>
          <label class="line"><input type="checkbox" id="showGear"> Gear</label>
          <label class="line"><input type="checkbox" id="showNitro"> Nitro Bar</label>
          <label class="line"><input type="checkbox" id="showShift"> Shift Light</label>
          <label class="line"><input type="checkbox" id="showIcons"> Telemetry section</label>
          <label class="line"><input type="checkbox" id="showTyreIcon"> Tyres / ABS</label>
          <label class="line"><input type="checkbox" id="showEngineIcon"> Engine</label>
          <label class="line"><input type="checkbox" id="showSuspIcon"> Suspension</label>
          <label class="line"><input type="checkbox" id="showTurbo"> Engine Load mini gauge</label>
        </div>
      </fieldset>
      <fieldset><legend>Engine Damage — optional throttle-cut experiment</legend>
        <label class="line"><input type="checkbox" id="damageEnabled"> Enable Damage System (default OFF)</label>
        <div class="help">Only separate impacts passing the shared Collision Balance and the Damage minimum count; suspension landings/bounces are ignored. Clustered impacts count once. Keyboard throttle cut attempts to stop gameplay key presses during LIMP MODE. It cannot cap speed/RPM or detect a Body Shop.</div>
        <label class="line"><input type="checkbox" id="damageInputCut"> Enable keyboard Throttle Cut when LIMP MODE activates</label>
        <label for="damageCutScope" style="display:block;margin:8px 0 5px">Keys to block while damaged</label>
        <select id="damageCutScope">
          <option value="throttle">Throttle Only: W + ↑ (recommended; steering/brake still work)</option>
          <option value="all">All Driving Keys: W A S D + ↑ ← ↓ →</option>
        </select>
        <label for="damageCutPattern" style="display:block;margin:9px 0 5px">Engine stutter / throttle cut pattern</label>
        <select id="damageCutPattern">
          <option value="stutter">Natural Engine Misfire: irregular short power cuts (default)</option>
          <option value="continuous">Continuous: block inputs while damaged (old behavior)</option>
        </select>
        <div class="help">Natural Engine Misfire allows normal driving for variable intervals (roughly 1.9–5.1s) with brief irregular power cuts (usually 0.2–0.52s, sometimes up to 1s). Every W/A/S/D and arrow key passes normally during DRIVE, regardless of the selected cut scope. If you hold a key through a cut, some games ignore a synthetic release; re-press the key if needed. Keyboard only; no speed/RPM physics changes.</div>
        <div class="help">Experimental: supports WASD and arrow-key layouts, but gamepad, wheel, mouse and in-game remapped keys may bypass the block. Emergency release: <strong>Ctrl + Alt + Shift + Backspace</strong>. Does not block physical key releases, chat typing, or browser shortcuts. Try only in solo/Career.</div>
        <label for="damageHitMode" style="display:block;margin:8px 0 5px">Critical damage after</label>
        <select id="damageHitMode"><option value="random">Random 12–15 collisions (default)</option><option value="custom">Custom impact count</option></select>
        <div class="space"><label for="damageCustomHits">Custom impacts</label><input id="damageCustomHits" type="number" min="1" max="100" step="1" value="13"></div>
        <div class="space"><label for="damageRepairSeconds">Auto-repair timer (seconds)</label><input id="damageRepairSeconds" type="number" min="5" max="600" step="1" value="30"></div>
        <label class="line"><input type="checkbox" id="damageImpactIdleReset"> Reset impact count after inactivity (default ON)</label>
        <div class="space"><label for="damageImpactResetSeconds">No impact for (seconds)</label><input id="damageImpactResetSeconds" type="number" min="15" max="600" step="5" value="60"></div>
        <div class="help">Default: 60 seconds (1 minute). Only qualifying, separate collisions restart the inactivity timer. Small bumps and suspension motion do not count. An already active LIMP MODE runs until repair; the inactivity reset applies only to impact progress BEFORE damage.</div>
        <div class="space"><label for="damageMinImpact">Minimum collision severity</label><span id="damageMinImpactValue" class="value">5.0 m/s</span></div>
        <input id="damageMinImpact" type="range" min="2" max="12" step="0.5">
        <div class="help" id="damageStatus">Damage system is OFF.</div>
        <button type="button" id="damageReset" style="width:100%">Reset simulated vehicle damage</button>
      </fieldset>
      <fieldset><legend>Telemetry warnings — real read-only game data</legend>
        <label class="line"><input type="checkbox" id="showTelemetryWarnings"> Enable colored warning icons</label>
        <div class="help">TYRE / SLIP: yellow only after sustained wheel slip, not a quick steering tap. BRAKE: normal / gradual braking, including ALL braking below 100 km/h. ABS: yellow only for a sudden high-speed brake press at 100+ km/h. ABS is an estimate, not a game-reported ABS state.</div>
        <div class="space"><label for="tyreSlipThreshold">Wheel slip warning</label><span class="value" id="tyreSlipThresholdValue">3.4 m/s</span></div>
        <input id="tyreSlipThreshold" type="range" min="1" max="8" step="0.1">
        <div class="space"><label for="tyreSlipHoldMs">Slip confirmation time</label><span class="value" id="tyreSlipHoldMsValue">0.55 s</span></div>
        <input id="tyreSlipHoldMs" type="range" min="250" max="1000" step="50">
        <div class="space"><label for="absBrakeThreshold">ABS-style brake input (100+ km/h)</label><span class="value" id="absBrakeThresholdValue">80%</span></div>
        <input id="absBrakeThreshold" type="range" min="0.55" max="1" step="0.05">
        <div class="help">ENGINE: Manual turns red at redline; Automatic only after ~250 ms sustained at redline, and clears after an upshift.</div>
        <div class="help">SUSPENSION: yellow medium collision, red heavy collision. Both observed collision events and landings must pass the 130 km/h shared speed filter (adjustable above). Small nudges and light landings are ignored.</div>
        <div class="space"><label for="impactYellowThreshold">Mild impact</label><span class="value" id="impactYellowThresholdValue">4.5 m/s</span></div>
        <input id="impactYellowThreshold" type="range" min="1" max="8" step="0.5">
        <div class="space"><label for="impactRedThreshold">Strong impact</label><span class="value" id="impactRedThresholdValue">9.0 m/s</span></div>
        <input id="impactRedThreshold" type="range" min="3" max="12" step="0.5">
      </fieldset>
      <fieldset><legend>Turbo · Load — smooth response</legend>
        <div class="help">This is an RPM-gated engine-load visualization, not measured turbo boost or PSI. It does not change the game's turbo or driving physics.</div>
        <label for="turboStartMode" style="display:block;margin:8px 0 5px">Activation RPM</label>
        <select id="turboStartMode"><option value="default">Default — 1,000 RPM</option><option value="custom">Custom RPM</option></select>
        <div class="space" style="margin-top:11px"><label for="turboStartRpm">Custom turbo start</label><span class="value" id="turboStartRpmValue">1,000 RPM</span></div>
        <input id="turboStartRpm" type="range" min="800" max="10000" step="100">
        <div class="space"><label for="turboStartRpmInput">Exact start RPM</label><input id="turboStartRpmInput" type="number" min="800" max="10000" step="50" value="1000"></div>
        <div class="space"><label for="turboResponseMs">Turbo gauge response</label><span class="value" id="turboResponseMsValue">0.3 s</span></div>
        <input id="turboResponseMs" type="range" min="200" max="2200" step="100">
        <div class="help">The bar begins filling above the selected RPM and fades in smoothly as engine load rises.</div>
      </fieldset>
      <fieldset><legend>Shift Light (existing v0.3.1)</legend>
        <label for="shiftMode" style="display:block;margin-bottom:5px">Gearbox mode</label>
        <select id="shiftMode"><option value="auto">Automatic — 250 RPM early</option><option value="manual">Manual — near redline</option></select>
        <label for="manualGreenLead" style="display:block;margin:9px 0 5px">Manual green light</label>
        <select id="manualGreenLead"><option value="0">At redline</option><option value="100">100 RPM before redline</option><option value="250">250 RPM before redline</option></select>
      </fieldset>
      </div><!-- end responsive columns -->
      <div class="bottom"><button id="reset" type="button">Reset Defaults</button><button id="done" type="button">Close Menu</button></div>
      <div class="status" id="status" role="status">Settings auto-save in this browser.</div>
      <div class="save-wrapper" style="margin:6px 0"><button id="saveNow" type="button" style="width:100%">Save current settings now</button></div>
      <div class="hint"><span class="kbd">Num +</span> Open / close settings · <span class="kbd">Num −</span> Hide / show WHOLE custom Speedometer HUD · <span class="kbd">Num *</span> SAVE ALL settings + selected vehicle mileage<br>Original game HUD is controlled separately in NFSU2.xyz settings.</div>
          <div id="menuResizeGrip" class="resize-grip" title="Drag to resize the menu" aria-label="Resize settings menu" role="separator">↙</div>
    </section>`;

  const get = (id) => shadow.getElementById(id);
  const mget = (id) => menuShadow.getElementById(id);
  const hud = shadow.querySelector(".hud");
  const hero = get("hero");
  const ui = {
    speed:get("speed"),speedUnit:get("speed-unit"),gear:get("gear"),compactGear:get("compact-gear"),
    rpm:get("rpm"),max:get("rpm-max"),rpmFill:get("rpm-fill"),redline:get("redline"),rpmTicks:get("rpm-ticks"),
    shiftStrip:get("shift-strip"),shiftText:get("shift-text"),
    turboPct:get("turbo-pct"),turboFill:get("turbo-fill"), tyreIcon:get("tyre-indicator"),engineIcon:get("engine-indicator"),suspIcon:get("susp-indicator"),
    nitroPercent:get("nitro-percent"),nitroTrack:get("nitro-track"),
    nitroFirst:get("nitro-first"),nitroSecond:get("nitro-second"),
    damageAlert:get("damage-alert"),damageCountdown:get("damage-countdown")
  };


  const aget = id => shadow.getElementById(id);
  const analogUi = {
    panel:aget("analog-panel"),speedTicks:aget("analog-speed-ticks"),rpmTicks:aget("analog-rpm-ticks"),turboTicks:aget("analog-turbo-ticks"),
    speedNeedle:aget("analog-speed-needle"),rpmNeedle:aget("analog-rpm-needle"),turboNeedle:aget("analog-turbo-needle"),
    speedUnit:aget("analog-speed-unit"),gear:aget("analog-gear-value"),
    nitroText:aget("analog-nitro-text"),nitroA:aget("analog-nitro-a"),nitroB:aget("analog-nitro-b"),
    speedRed:aget("analog-speed-redzone"),rpmRed:aget("analog-rpm-redzone"),turboRed:aget("analog-turbo-redzone"),
    turboBack:aget("analog-turbo-back"),rpmBack:aget("analog-rpm-back"),speedBack:aget("analog-speed-back"),
    turboFace:aget("analog-turbo-face"),rpmFace:aget("analog-rpm-face"),speedFace:aget("analog-speed-face"),
    shift:aget("analog-shift"),tyre:aget("analog-tyre"),engine:aget("analog-engine"),susp:aget("analog-susp"),
    odo:aget("analog-odo-digits"),odoGroup:aget("analog-odometer")
  };
  // A displayed tenth represents a FULL 100 m travelled. Use exactly the
  // same quantization for the menu, BOTH HUDs and persistence checkpoints.
  function odometerTenths(km){
    const safe=clamp(Number(km)||0,0,ODOMETER_MAX_KM);
    return Math.floor(safe*10+1e-7);
  }
  function odometerText(km) {
    if(!selectedOdometerCar)return "--------.-";
    const tenths=odometerTenths(km);
    const whole=Math.floor(tenths/10),fractional=tenths%10;
    return `${String(whole).padStart(8,"0")}.${fractional}`;
  }
  function ensureLegacyOdometerOption(){
    const select=mget("odometerCarSelect");
    if(!select)return;
    let item=select.querySelector('option[value="__legacy__"]');
    if(Object.prototype.hasOwnProperty.call(odometers,ODOMETER_LEGACY_ID)){
      if(!item){item=document.createElement("option");item.value=ODOMETER_LEGACY_ID;item.textContent="Previous ODO (unassigned, v0.9.27)";select.append(item);}
    } else if(item)item.remove();
  }
  function updateOdometerDisplay(){
    const value=odometerText(odometerKm);
    setText(analogUi.odo,value);
    setText(get("modern-odo-digits"),value);
    ensureLegacyOdometerOption();
    const select=mget("odometerCarSelect");
    if(select){
      if(select.value!==selectedOdometerCar)select.value=selectedOdometerCar;
      select.disabled=!odometerReady; // initial async storage restore must finish first
    }
    const menuNode=mget("odometerMenuValue");
    if(menuNode)setText(menuNode,selectedOdometerCar ? `${(odometerTenths(odometerKm)/10).toFixed(1)} km` : "Select a car");
    const reset=mget("odometerReset"),save=mget("odometerSaveNow");
    if(reset)reset.disabled=!selectedOdometerCar;
    if(save)save.disabled=!odometerReady;
  }
  function odometerStatus(textValue,error=false){
    const el=mget("odometerStatus");
    if(!el)return;
    el.textContent=textValue;
    el.style.color=error?"#ffb6b6":"#a5cfc9";
  }
  function selectOdometerCar(carId){
    if(!odometerReady)return; // no selection can be overwritten by a late initial read
    if(carId!=="" && carId!==ODOMETER_LEGACY_ID && !ODOMETER_CAR_IDS.has(carId))return;
    if(carId===ODOMETER_LEGACY_ID && !Object.prototype.hasOwnProperty.call(odometers,carId))return;
    if(selectedOdometerCar===carId)return;
    // Reset integration so elapsed time while changing vehicles is never charged to the new car.
    if(selectedOdometerCar)odometers[selectedOdometerCar]=odometerKm;
    selectedOdometerCar=carId;
    odometerKm=carId ? (odometers[carId]||0) : 0;
    odometerSavedKm=carId ? (savedOdometers[carId]||0) : 0;
    odometerLastSampleAt=0;odometerLastSpeedKmh=null;
    odometerRevision++;odometerDirty=true;
    odometerResetArmedAt=0;mget("odometerReset").textContent="Reset selected car";
    updateOdometerDisplay();
    void saveOdometer(true);
    const carName=carId===ODOMETER_LEGACY_ID?"Previous ODO":ODOMETER_CARS.find(([id])=>id===carId)?.[1]||"No car";
    odometerStatus(`${carName} selected. Its mileage is tracked separately.`);
  }
  function saveOdometer(force=false){
    if(!odometerReady || (!odometerDirty && !force))return odometerSavePromise;
    if(odometerSaving){odometerSaveQueued=true;return odometerSavePromise;}
    if(selectedOdometerCar)odometers[selectedOdometerCar]=odometerKm;
    const revision=odometerRevision;
    const snapshot={...odometers};
    const selectedSnapshot=selectedOdometerCar;
    const savedAt=new Date().toISOString();
    const payload={version:2,cars:snapshot,selectedCar:selectedSnapshot,savedAt};
    const primary={...payload,version:3};
    odometerSaving=true;
    // Write last selected vehicle and per-car mileage as a single atomic storage
    // operation. V3 is canonical; V2 is kept for compatible upgrades/rollback.
    odometerSavePromise=hudStorage.set({
      [ODOMETER_PRIMARY_STORE_KEY]:primary,
      [ODOMETER_STORE_KEY]:payload,
      [ODOMETER_SELECTED_KEY]:selectedSnapshot
    }).then(()=>{
      odometerUsingPrimary=true;
      odometerSaving=false;
      savedOdometers={...snapshot};
      odometerSavedKm=selectedOdometerCar?(savedOdometers[selectedOdometerCar]||0):0;
      odometerLastPersistAt=performance.now();
      odometerDirty=odometerRevision!==revision;
      // Continuous telemetry changes mileage while a write is in flight. Never
      // recursively save every new 20 Hz sample; the regular 30 s / 100 m
      // checkpoints handle those samples. Only explicit queued saves get another
      // immediate write (e.g. switching cars or pressing Numpad *).
      const explicitlyQueued=odometerSaveQueued;
      odometerSaveQueued=false;
      if(explicitlyQueued)return saveOdometer(true);
    }).catch(error=>{
      odometerSaving=false;odometerSaveQueued=false;odometerDirty=true;
      console.warn("[NFSU2 Modern HUD] Odometer not saved",error);
      odometerStatus("ODO save failed. Try Save mileage now.",true);
    });
    return odometerSavePromise;
  }
  function sampleOdometer(d,now){
    if(!odometerReady || !selectedOdometerCar || odometerKm>=ODOMETER_MAX_KM || document.visibilityState==="hidden" || d.state?.paused === true || d.state?.driving === false){
      odometerLastSampleAt=0;odometerLastSpeedKmh=null;return;
    }
    const kmh=Number.isFinite(d.speed) ? Math.abs(d.speed)*3.6 : NaN;
    if(!Number.isFinite(kmh)||kmh>650){odometerLastSampleAt=0;odometerLastSpeedKmh=null;return;}
    const dt=now-odometerLastSampleAt;
    if(odometerLastSpeedKmh!==null && dt>0 && dt<=800){
      const before=odometerKm;
      odometerKm=Math.min(ODOMETER_MAX_KM,odometerKm+((odometerLastSpeedKmh+kmh)/2)*(dt/3600000));
      if(odometerKm>before){
        odometers[selectedOdometerCar]=odometerKm;
        odometerDirty=true;odometerRevision++;
        updateOdometerDisplay();
        if(odometerTenths(odometerKm)>odometerTenths(odometerSavedKm))void saveOdometer();
        else if(now-odometerLastPersistAt>=30000)void saveOdometer();
      }
    }
    odometerLastSampleAt=now;odometerLastSpeedKmh=kmh;
  }
  const A_START=135, A_SWEEP=270;
  const svgNS="http://www.w3.org/2000/svg";
  let analogLastRpmMax=0, analogLastRpmRedline=0, analogLastSpeedUnit="",analogLastTurboPct=-1;
  // Angles go clockwise from lower left across the top to lower right.
  function analogXY(cx,cy,r,angle){const rad=angle*Math.PI/180;return [cx+Math.cos(rad)*r,cy+Math.sin(rad)*r];}
  function analogArc(cx,cy,r,from,to){
    const [x0,y0]=analogXY(cx,cy,r,from),[x1,y1]=analogXY(cx,cy,r,to);
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${Math.abs(to-from)>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  function analogDialScale(root,cx,cy,r,max,labelStep,tickStep,fmt){
    root.replaceChildren();
    const frag=document.createDocumentFragment();
    for(let v=0,i=0;i<=Math.round(max/tickStep);i++){
      v=Math.min(max,i*tickStep);
      const major=Math.abs(v/labelStep-Math.round(v/labelStep))<1e-5;
      const angle=A_START+A_SWEEP*(v/max);
      const [x1,y1]=analogXY(cx,cy,r-(major?14:9),angle);
      const [x2,y2]=analogXY(cx,cy,r,angle);
      const tick=document.createElementNS(svgNS,"line");
      tick.setAttribute("class",major?"analog-tick major":"analog-tick");
      tick.setAttribute("x1",x1.toFixed(2));tick.setAttribute("y1",y1.toFixed(2));
      tick.setAttribute("x2",x2.toFixed(2));tick.setAttribute("y2",y2.toFixed(2));frag.append(tick);
      if(major){
        const [tx,ty]=analogXY(cx,cy,r-(r>=125?31:r>=95?28:23),angle);
        const lbl=document.createElementNS(svgNS,"text");lbl.setAttribute("class","analog-number");
        lbl.setAttribute("x",tx.toFixed(1));lbl.setAttribute("y",ty.toFixed(1));lbl.textContent=fmt(v);frag.append(lbl);
      }
    }
    root.append(frag);
  }
  // Analog-only load indication on a familiar 0–3.0 dial; NOT measured turbo pressure.
  analogDialScale(analogUi.turboTicks,89,236,61,3,0.5,0.1,v=>v===0?"0":v.toFixed(1));
  analogUi.turboRed.setAttribute("d",analogArc(89,236,65,A_START+A_SWEEP*.88,A_START+A_SWEEP*.995));
  function analogScaleForRpm(max,redline){
    if(analogLastRpmMax===max&&analogLastRpmRedline===redline)return;
    if(analogLastRpmMax!==max){
      analogLastRpmMax=max;
      const n=Math.round(max/1000); // e.g. 10,000 RPM -> 0 ... 10
      analogDialScale(analogUi.rpmTicks,304,199,96,n,1,.5,v=>String(v));
    }
    analogLastRpmRedline=redline;
    const redRatio=clamp(redline/max,0,1);
    analogUi.rpmRed.setAttribute("d",analogArc(304,199,100,A_START+A_SWEEP*redRatio,A_START+A_SWEEP*.995));
  }
  function analogScaleForSpeed(unit){
    if(analogLastSpeedUnit===unit)return;
    analogLastSpeedUnit=unit;
    const max=unit==="mph"?250:400,step=unit==="mph"?25:40;
    analogDialScale(analogUi.speedTicks,595,164,131,max,step,step/5,v=>String(v));
    analogUi.speedRed.setAttribute("d",analogArc(595,164,135,A_START+A_SWEEP*.875,A_START+A_SWEEP*.995));
    setText(analogUi.speedUnit,unit==="mph"?"MPH":"KM/H");
  }
  // Use one cheap SVG rotation per needle, no secondary animation loop.
  function analogNeedle(el,value,max,cx,cy){
    const rotation=225+A_SWEEP*clamp(value/Math.max(max,.01),0,1);
    const target=`rotate(${rotation.toFixed(2)} ${cx} ${cy})`;
    if(el.getAttribute("transform")!==target)el.setAttribute("transform",target);
  }
  const analogLabels={tyre:"TYRES",engine:"ENGINE",susp:"SUSP"};
  const analogLabelTimers={tyre:null,engine:null,susp:null};
  function analogSetIndicator(name,status,label){
    const row=analogUi[name];if(!row)return;
    row.classList.toggle("warning-yellow",status==="yellow");
    row.classList.toggle("warning-red",status==="red");
    const next=label==="COILOVER"?"SUSP":label;
    if(analogLabelTimers[name]!==null){clearTimeout(analogLabelTimers[name]);analogLabelTimers[name]=null;}
    if(analogLabels[name]!==next){
      analogLabels[name]=next;
      row.classList.remove("label-changing");
      setText(aget(`analog-${name}-label`),analogLabels[name]);
    }
  }
  function analogVisibility(){
    const active=settings.hudStyle==="analog"&&settings.hudMode==="full";
    analogUi.panel.classList.toggle("analog-hide",!active);
    const vis=(id,v)=>aget(id).classList.toggle("analog-hide",!v);
    vis("analog-turbo-face",settings.showTurbo);
    vis("analog-rpm-face",settings.showRpm);
    vis("analog-nitro",settings.showRpm&&settings.showNitro);
    vis("analog-shift",settings.showRpm&&settings.showShift);
    vis("analog-speed-face",settings.showSpeed||settings.showGear||settings.analogOdometerEnabled||(settings.showIcons&&(settings.showTyreIcon||settings.showEngineIcon||settings.showSuspIcon)));
    vis("analog-speed-ticks",settings.showSpeed);vis("analog-speed-needle",settings.showSpeed);
    vis("analog-speed-digits",settings.showSpeed);
    vis("analog-gear",settings.showGear);
    vis("analog-odometer",settings.analogOdometerEnabled);
    vis("analog-status",settings.showIcons&&(settings.showTyreIcon||settings.showEngineIcon||settings.showSuspIcon));
    vis("analog-tyre",settings.showIcons&&settings.showTyreIcon);
    vis("analog-engine",settings.showIcons&&settings.showEngineIcon);
    vis("analog-susp",settings.showIcons&&settings.showSuspIcon);
  }
  analogScaleForSpeed("kmh");analogScaleForRpm(9000,7600);

  function setTranslateAttr(el,x,y){
    if(!el)return;
    const value=`translate(${x} ${y})`;
    if(el.getAttribute("transform")!==value)el.setAttribute("transform",value);
  }
  function applyAnalogLayout(){
    const turboX=15+settings.analogTurboOffsetX, turboY=settings.analogTurboOffsetY;
    const rpmX=settings.analogRpmOffsetX, rpmY=settings.analogRpmOffsetY;
    const speedX=-33+settings.analogSpeedOffsetX, speedY=settings.analogSpeedOffsetY;
    setTranslateAttr(analogUi.turboBack,turboX,turboY);
    setTranslateAttr(analogUi.turboFace,turboX,turboY);
    setTranslateAttr(analogUi.rpmBack,rpmX,rpmY);
    setTranslateAttr(analogUi.rpmFace,rpmX,rpmY);
    setTranslateAttr(analogUi.speedBack,speedX,speedY);
    setTranslateAttr(analogUi.speedFace,speedX,speedY);
    // These three indicators have fixed anchors relative to the speed dial.
    // Moving that dial also moves ODO and all indicators together.
  }
  applyAnalogLayout();

  // Build grouped color controls: suggested swatches and native custom color picker per field.
  const colorControlRows = new Map();
  const groupsNode = mget("colorGroups");
  COLOR_SECTIONS.forEach(([sectionName, rows], index) => {
    const details = document.createElement("details");
    details.className = "colors";
    if (index === 0) details.open = true;
    const summary = document.createElement("summary");
    summary.textContent = sectionName;
    details.append(summary);
    rows.forEach(([key, title]) => {
      const row = document.createElement("div"); row.className = "color-row";
      const top = document.createElement("div"); top.className = "color-row-title";
      const label = document.createElement("span"); label.textContent = title;
      const hex = document.createElement("span"); hex.style.cssText = "font:10px ui-monospace,Consolas,monospace;color:#aec4cf";
      top.append(label, hex);
      const controls = document.createElement("div"); controls.className="color-controls";
      const swatches = [];
      const suggested = [DEFAULT_COLORS[key], ...SUGGESTED_COLORS.filter(x => x !== DEFAULT_COLORS[key])];
      suggested.forEach((color, i) => {
        const button = document.createElement("button"); button.type="button";
        button.className="color-sample"; button.style.backgroundColor=color;
        button.title = i === 0 ? `Default: ${color}` : `Suggested: ${color}`;
        button.setAttribute("aria-label", `${title}: ${button.title}`);
        button.addEventListener("click", () => changeSetting(key,color));
        controls.append(button); swatches.push([color,button]);
      });
      const picker = document.createElement("input"); picker.type="color";
      picker.className="color-picker"; picker.title = `Custom ${title}`;
      picker.setAttribute("aria-label",`Choose custom color for ${title}`);
      picker.addEventListener("input",() => changeSetting(key,picker.value));
      controls.append(picker); row.append(top,controls); details.append(row);
      colorControlRows.set(key,{hex,swatches,picker});
    });
    groupsNode.append(details);
  });
  const themeRoot = mget("themePresets");
  THEME_PRESETS.forEach(([name, color]) => {
    const button=document.createElement("button");button.type="button";button.className="preset-btn";
    const dot=document.createElement("span");dot.className="dot";dot.style.backgroundColor=color || "#B5DEE6";
    button.append(dot,document.createTextNode(name));
    button.addEventListener("click",()=>applyTheme(color));themeRoot.append(button);
  });
  // v0.9.14: Low-overhead edge-only streaks (8 per side). No CSS blur,
  // box-shadow, full-screen darkening, backdrop filters or per-frame CSS variables.
  // Streak animation changes only in fixed speed bands to avoid style recalculation
  // for each telemetry frame. Does not intercept input or modify game rendering.
  const speedFxHost = document.createElement("div");
  speedFxHost.id = "nfsu2-modern-hud-speed-fx-root";
  speedFxHost.style.cssText = "position:fixed;inset:0;width:100vw;height:100vh;z-index:2147483645;pointer-events:none!important;overflow:hidden;";
  const speedFxShadow = speedFxHost.attachShadow({mode:"closed"});
  const makeTunnelLines = quadrant => {
    const configs = {
      tl:[{x:2,y:10,dx:250,dy:120,a:18,d:0},{x:8,y:26,dx:275,dy:116,a:16,d:.11},{x:0,y:44,dx:298,dy:118,a:14,d:.22}],
      tr:[{x:20,y:10,dx:-250,dy:120,a:-18,d:.04},{x:10,y:28,dx:-274,dy:116,a:-16,d:.15},{x:22,y:46,dx:-296,dy:118,a:-14,d:.26}],
      bl:[{x:0,y:56,dx:252,dy:-118,a:-14,d:.06},{x:10,y:72,dx:276,dy:-114,a:-16,d:.17},{x:2,y:86,dx:298,dy:-112,a:-18,d:.28}],
      br:[{x:22,y:56,dx:-252,dy:-118,a:14,d:.10},{x:12,y:72,dx:-276,dy:-114,a:16,d:.21},{x:24,y:86,dx:-298,dy:-112,a:18,d:.32}]
    };
    return configs[quadrant].map((cfg,i) => {
      const len = Math.round((150 + i*56) * 1.875);
      const durmod = (0.92 + i*0.08).toFixed(2);
      const alpha = (0.78 + i*0.08).toFixed(2);
      return `<span class="line" style="--x:${cfg.x}%;--y:${cfg.y}%;--dx:${cfg.dx}px;--dy:${cfg.dy}px;--angle:${cfg.a}deg;--delay:${(-cfg.d).toFixed(2)}s;--durmod:${durmod};--len:${len}px;--alpha:${alpha}"></span>`;
    }).join("");
  };
  speedFxShadow.innerHTML = `
    <style>
      :host{pointer-events:none!important;contain:layout style;}
      .speed-fx{position:absolute;inset:0;pointer-events:none;visibility:hidden;opacity:0;
        transition:opacity .22s linear;--fx-duration:1.1s;--travel-mul:1;
        --fog-edge-alpha:.12;--fog-mid-alpha:.07;--fog-soft-alpha:.02;}
      .speed-fx.active{visibility:visible;}
      .zone{position:absolute;pointer-events:none;overflow:hidden;}
      .zone.tl,.zone.tr{top:0;width:min(37vw,680px);height:min(38vh,320px);}
      .zone.bl,.zone.br{bottom:0;width:min(37vw,680px);height:min(38vh,320px);}
      .zone.tl,.zone.bl{left:0;}
      .zone.tr,.zone.br{right:0;}
      .zone::before{content:"";position:absolute;inset:0;opacity:0;transition:opacity .22s linear;pointer-events:none;}
      .speed-fx.fog-enabled .zone::before{opacity:1;}
      .zone.tl::before{background:radial-gradient(120% 100% at 0% 0%, rgba(70,160,255,var(--fog-edge-alpha)) 0%, rgba(70,160,255,var(--fog-mid-alpha)) 34%, rgba(70,160,255,var(--fog-soft-alpha)) 58%, rgba(70,160,255,0) 78%);}
      .zone.tr::before{background:radial-gradient(120% 100% at 100% 0%, rgba(70,160,255,var(--fog-edge-alpha)) 0%, rgba(70,160,255,var(--fog-mid-alpha)) 34%, rgba(70,160,255,var(--fog-soft-alpha)) 58%, rgba(70,160,255,0) 78%);}
      .zone.bl::before{background:radial-gradient(120% 100% at 0% 100%, rgba(70,160,255,var(--fog-edge-alpha)) 0%, rgba(70,160,255,var(--fog-mid-alpha)) 34%, rgba(70,160,255,var(--fog-soft-alpha)) 58%, rgba(70,160,255,0) 78%);}
      .zone.br::before{background:radial-gradient(120% 100% at 100% 100%, rgba(70,160,255,var(--fog-edge-alpha)) 0%, rgba(70,160,255,var(--fog-mid-alpha)) 34%, rgba(70,160,255,var(--fog-soft-alpha)) 58%, rgba(70,160,255,0) 78%);}
      .line{position:absolute;left:var(--x);top:var(--y);width:var(--len);height:2px;border-radius:2px;opacity:0;
        pointer-events:none;transform-origin:left center;
        background:linear-gradient(90deg,transparent 0%,rgba(180,220,255,calc(.10 * var(--alpha))) 10%,rgba(208,234,255,calc(.34 * var(--alpha))) 32%,rgba(245,252,255,calc(.98 * var(--alpha))) 56%,rgba(160,214,255,calc(.46 * var(--alpha))) 82%,transparent 100%);
        animation-duration:calc(var(--fx-duration) * var(--durmod));animation-delay:var(--delay);
        animation-timing-function:linear;animation-iteration-count:infinite;animation-play-state:paused;}
      .speed-fx.active .line{animation-play-state:running;}
      .tl .line{animation-name:tunnel-tl;}
      .tr .line{animation-name:tunnel-tr;}
      .bl .line{animation-name:tunnel-bl;}
      .br .line{animation-name:tunnel-br;}
      @keyframes tunnel-tl{0%{transform:translate3d(0,0,0) rotate(var(--angle)) scaleX(.54);opacity:0;}16%{opacity:.45;}58%{opacity:.86;}100%{transform:translate3d(calc(var(--dx) * var(--travel-mul)),calc(var(--dy) * var(--travel-mul)),0) rotate(var(--angle)) scaleX(1.16);opacity:0;}}
      @keyframes tunnel-tr{0%{transform:translate3d(0,0,0) rotate(var(--angle)) scaleX(.54);opacity:0;}16%{opacity:.45;}58%{opacity:.86;}100%{transform:translate3d(calc(var(--dx) * var(--travel-mul)),calc(var(--dy) * var(--travel-mul)),0) rotate(var(--angle)) scaleX(1.16);opacity:0;}}
      @keyframes tunnel-bl{0%{transform:translate3d(0,0,0) rotate(var(--angle)) scaleX(.54);opacity:0;}16%{opacity:.45;}58%{opacity:.86;}100%{transform:translate3d(calc(var(--dx) * var(--travel-mul)),calc(var(--dy) * var(--travel-mul)),0) rotate(var(--angle)) scaleX(1.16);opacity:0;}}
      @keyframes tunnel-br{0%{transform:translate3d(0,0,0) rotate(var(--angle)) scaleX(.54);opacity:0;}16%{opacity:.45;}58%{opacity:.86;}100%{transform:translate3d(calc(var(--dx) * var(--travel-mul)),calc(var(--dy) * var(--travel-mul)),0) rotate(var(--angle)) scaleX(1.16);opacity:0;}}
      @media(prefers-reduced-motion:reduce){.speed-fx.active .line{animation:none!important;opacity:.24!important;transform:rotate(var(--angle)) scaleX(.92)!important;}}
    </style>
    <div class="speed-fx" id="speed-fx" aria-hidden="true">
      <div class="zone tl">${makeTunnelLines("tl")}</div>
      <div class="zone tr">${makeTunnelLines("tr")}</div>
      <div class="zone bl">${makeTunnelLines("bl")}</div>
      <div class="zone br">${makeTunnelLines("br")}</div>
    </div>`;
  const speedFx = speedFxShadow.getElementById("speed-fx");
  let lastSpeedFxOpacity = -1, lastSpeedFxBand = -1, lastFogEnabled = null, lastFogPercent = -1;
  let lastSpeedFxFeedAt = 0, speedFxPreviewUntil = 0;
  // v0.9.22: speed-based intensity curve, independent of display units.
  // 200 -> 0%, 220 -> 25%, 240 -> 45%, 260 -> 65%, 280 -> 85%, 300+ -> 100%.
  // Keep the previous tunnel animations and their speed bands; only bring the
  // visual strength forward at 220–280 km/h. Full-strength visuals remain
  // close to the proven v0.9.16 look at 300+ km/h.
  function speedSensationCurve(kmh){
    // Threshold is always in KM/H, regardless of the player's HUD unit choice.
    // At the default 190: 220=.25, 240=.45, 260=.65, 280=.85, 300+=1.
    // Shifting the threshold preserves the same gradual rise without a harsh jump.
    const t0=settings.speedSensationStartKmh;
    const offsets=[0,30,50,70,90,110];
    const strengths=[0,.25,.45,.65,.85,1];
    if(!Number.isFinite(kmh)||kmh<=t0)return 0;
    if(kmh>=t0+110)return 1;
    for(let i=1;i<offsets.length;i++){
      if(kmh<=t0+offsets[i]){
        const t=(kmh-(t0+offsets[i-1]))/(offsets[i]-offsets[i-1]);
        return strengths[i-1]+(strengths[i]-strengths[i-1])*t;
      }
    }
    return 1;
  }
  function updateSpeedSensation(kmh = Number.isFinite(latest?.speed) ? Math.abs(latest.speed)*3.6 : 0){
    const now=performance.now();
    const preview = speedFxPreviewUntil > now && document.visibilityState !== "hidden";
    const live = received && now-lastSpeedFxFeedAt <= 1500 &&
      settings.hudEnabled && settings.speedSensationEnabled &&
      latest?.state?.driving !== false && document.visibilityState !== "hidden" &&
      Number.isFinite(kmh) && kmh > settings.speedSensationStartKmh;
    const intensity = settings.speedSensationIntensity / 100;
    const active = (preview || live) && intensity > 0;
    const speed = preview ? Math.max(340,settings.speedSensationStartKmh+110) : kmh;
    const progress = active ? clamp((speed-settings.speedSensationStartKmh)/110,0,1) : 0;
    const curve = active ? speedSensationCurve(speed) : 0;
    // Quick, smooth rise at 220–240 km/h; no sudden jump just above 200.
    // Above 300 this stays at .74 opacity (comparable to the old 300–310 effect).
    const baseOpacity = curve > 0 ? .24*Math.min(1,curve*4)+.50*curve : 0;
    const opacity = active ? Math.round(clamp(baseOpacity*intensity,0,1)*100)/100 : 0;
    if(opacity !== lastSpeedFxOpacity){speedFx.style.opacity=String(opacity);lastSpeedFxOpacity=opacity;}
    if(speedFx.classList.contains("active") !== active)speedFx.classList.toggle("active",active);
    const fogEnabled = Boolean(settings.speedSensationFogEnabled);
    if(fogEnabled !== lastFogEnabled){speedFx.classList.toggle("fog-enabled", fogEnabled); lastFogEnabled = fogEnabled;}
    // One-time CSS variable updates when the slider changes; no per-frame fog DOM work.
    if(settings.speedSensationFogPercent !== lastFogPercent){
      const a = settings.speedSensationFogPercent / 100;
      speedFx.style.setProperty("--fog-edge-alpha", a.toFixed(4));
      speedFx.style.setProperty("--fog-mid-alpha", (a * 7 / 12).toFixed(4));
      speedFx.style.setProperty("--fog-soft-alpha", (a / 6).toFixed(4));
      lastFogPercent = settings.speedSensationFogPercent;
    }
    if(active){
      const band = progress < .34 ? 0 : progress < .68 ? 1 : 2;
      if(band !== lastSpeedFxBand){
        const seconds = [1.14,.92,.76][band];
        const travel = [0.92,1.00,1.08][band];
        speedFx.style.setProperty("--fx-duration",`${seconds}s`);
        speedFx.style.setProperty("--travel-mul", String(travel));
        lastSpeedFxBand=band;
      }
    }
  }
  const speedFxWatchdog=setInterval(()=>{
    if(speedFx.classList.contains("active")) updateSpeedSensation();
  },450);
  (document.documentElement || document.body).append(speedFxHost, host, menuHost);
  mget("speedSensationPreview").addEventListener("click",()=>{
    speedFxPreviewUntil=performance.now()+5000;
    updateSpeedSensation(340);
    saveStatus("Preview active for 5 seconds — cylindrical speed sensation toward the center.");
  });

  // Impact Feedback is isolated from Damage System and telemetry warning visibility.
  // Only observed Car Feed impacts (NOT suspension landings) can trigger it.
  const impactFxHost=document.createElement("div");
  impactFxHost.id="nfsu2-modern-hud-impact-fx-root";
  impactFxHost.style.cssText="position:fixed;inset:0;z-index:2147483646;pointer-events:none!important;overflow:hidden;";
  const impactFxShadow=impactFxHost.attachShadow({mode:"closed"});
  impactFxShadow.innerHTML=`<style>
    :host{all:initial;pointer-events:none!important;}
    #impact-flash{position:absolute;inset:0;pointer-events:none!important;opacity:0;}
  </style><div id="impact-flash" aria-hidden="true"></div>`;
  const impactFlash=impactFxShadow.getElementById("impact-flash");
  (document.documentElement||document.body).append(impactFxHost);
  let impactFlashAnimation=null,impactShakeAnimation=null;
  let lastImpactFxCounter=null,lastImpactFxAt=-Infinity;
  function resetImpactFeedbackCounter(){lastImpactFxCounter=null;lastImpactFxAt=-Infinity;}
  function fireImpactFeedback(level){
    if(!settings.impactFeedbackEnabled || settings.impactFeedbackIntensity<=0 ||
       document.visibilityState==="hidden")return;
    const amount=settings.impactFeedbackIntensity/100;
    const duration=level==="heavy"?400:level==="medium"?250:150;
    const peak=amount*(level==="heavy"?.68:level==="medium"?.48:.28);
    const color=level==="heavy"?'255,83,59':level==="medium"?'255,164,88':'236,248,255';
    if(settings.impactFeedbackFlash && typeof impactFlash.animate==="function"){
      impactFlashAnimation?.cancel();
      // Transparent center; only perimeter illumination, never global darkening.
      impactFlash.style.background=`
        radial-gradient(ellipse at center,transparent 42%,rgba(${color},.22) 85%,rgba(${color},.65) 100%),
        linear-gradient(90deg,rgba(${color},.33),transparent 14%,transparent 86%,rgba(${color},.33))`;
      impactFlashAnimation=impactFlash.animate([
        {opacity:0,offset:0},{opacity:peak,offset:.18},{opacity:0,offset:1}
      ],{duration,easing:"ease-out",iterations:1});
    }
    if(settings.impactFeedbackShake && level!=="light" && typeof host.animate==="function" &&
       !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches &&
       host.style.display!=="none"){
      // Animate the HOST rather than the scaled HUD. The former uses widely
      // supported 'transform' keyframes, while the previous 'translate' style
      // on the HUD itself was barely visible and inconsistent in browsers.
      // HUD internal scale, location and analog dial offsets are untouched.
      const px=(level==="heavy"?10:6)*amount;
      impactShakeAnimation?.cancel();
      const fmt=n=>Math.round(n*10)/10;
      impactShakeAnimation=host.animate([
        {transform:"translate3d(0px,0px,0px)",offset:0},
        {transform:`translate3d(${fmt(px)}px,${fmt(-px*.48)}px,0px)`,offset:.18},
        {transform:`translate3d(${fmt(-px*.84)}px,${fmt(px*.33)}px,0px)`,offset:.40},
        {transform:`translate3d(${fmt(px*.52)}px,${fmt(-px*.18)}px,0px)`,offset:.61},
        {transform:`translate3d(${fmt(-px*.22)}px,${fmt(px*.16)}px,0px)`,offset:.80},
        {transform:"translate3d(0px,0px,0px)",offset:1}
      ],{duration,easing:"ease-out",iterations:1});
    }
  }
  // Independent Impact Feedback thresholds. The SUSP/BUMP warning thresholds are
  // deliberately NOT reused here: v0.9.19 classified routine bumps as Heavy.
  function classifyImpactFeedback(dv){
    const medium=settings.impactFeedbackMediumDv;
    const heavy=Math.max(settings.impactFeedbackHeavyDv,medium+3);
    return dv>=heavy?"heavy":dv>=medium?"medium":"light";
  }
  // Process EVERY Car Feed message: icon rendering is independently throttled.
  // Some severe collisions send zero/late impactDv, and some hard-stop frames
  // don't advance the impact counter. Use a guarded telemetry fallback for those
  // cases; normal braking and low-speed nudges are intentionally excluded.
  function observeCollision(d,now){
    currentFrameCollision=null;
    currentFrameLanding=null;
    const currentKmh=Number.isFinite(d?.speed)?Math.abs(d.speed)*3.6:0;
    const prevKmh=precedingCarSpeedKmh;
    const age=precedingSpeedSampleAt ? now-precedingSpeedSampleAt : Infinity;
    const rapidSample=age>0 && age<=420 && prevKmh>=settings.collisionMinSpeedKmh;
    const dropDv=rapidSample ? Math.max(0,(prevKmh-currentKmh)/3.6) : 0;
    const count=d?.events?.impacts;
    const countAdvanced=Number.isFinite(count) && observedImpactCounter!==null && count>observedImpactCounter;
    if(countAdvanced){
      const rawDv=Number.isFinite(d.events?.impactDv)?Math.abs(d.events.impactDv):0;
      // A realistic sharp speed drop is valid impact evidence, even if the
      // game's instantaneous impactDv happens to be zero in this frame.
      const inferredDv=dropDv>=8 ? dropDv : 0;
      currentFrameCollision={serial:++collisionSerial,count,when:now,
        dv:Math.max(rawDv,inferredDv),rawDv,
        speedKmh:Math.max(currentKmh,prevKmh),source:inferredDv>rawDv?"impact + deceleration":"impact event"};
    }else if(rapidSample && dropDv>=22 && currentKmh<=prevKmh*.60 &&
             d?.state?.driving!==false && now-lastRawCollisionAt>320){
      // Crash fallback without a counter increment: at least 79 km/h lost
      // within 420 ms while previously above the adjustable speed gate.
      // This is not a physical collision sensor; filter conservatively.
      currentFrameCollision={serial:++collisionSerial,count,when:now,
        dv:dropDv,rawDv:0,speedKmh:prevKmh,source:"emergency stop (inferred)"};
    }
    if(Number.isFinite(count)){
      if(observedImpactCounter!==null && count<observedImpactCounter){
        // New car / reset counter; do not reclassify it as a collision.
        currentFrameCollision=null;
      }
      observedImpactCounter=count;
    }
    const landingCount=d?.events?.landings;
    if(Number.isFinite(landingCount)){
      if(observedLandingCounter!==null && landingCount>observedLandingCounter){
        currentFrameLanding={count:landingCount,when:now,
          dv:Number.isFinite(d.events?.landingSpeed)?Math.abs(d.events.landingSpeed):0,
          speedKmh:Math.max(currentKmh,prevKmh)};
      }
      observedLandingCounter=landingCount;
    }
    precedingCarSpeedKmh=currentKmh;
    precedingSpeedSampleAt=now;
    if(currentFrameCollision)lastRawCollisionAt=now;
  }
  function collisionPassesFilter(sample,requiredDv=settings.collisionMinDv){
    return Boolean(sample && sample.speedKmh>=settings.collisionMinSpeedKmh &&
      sample.dv>=Math.max(settings.collisionMinDv,requiredDv));
  }
  function processImpactFeedback(d,now){
    const sample=currentFrameCollision;
    if(!sample)return;
    const diagnostic=mget("impactFeedbackLast");
    if(!collisionPassesFilter(sample)){
      if(diagnostic){
        const reason=sample.speedKmh<settings.collisionMinSpeedKmh?"speed too low":"light bump";
        diagnostic.textContent=`Last collision: ${sample.dv.toFixed(1)} m/s at ${Math.round(sample.speedKmh)} km/h — ignored (${reason})`;
      }
      return;
    }
    const dv=sample.dv;
    const level=classifyImpactFeedback(dv);
    if(diagnostic)diagnostic.textContent=`Last collision: ${dv.toFixed(1)} m/s at ${Math.round(sample.speedKmh)} km/h → ${level.toUpperCase()} (${sample.source})`;
    if(d?.state?.driving===false || !settings.hudEnabled || !settings.impactFeedbackEnabled ||
       document.visibilityState==="hidden" || now-lastImpactFxAt<650)return;
    lastImpactFxAt=now;
    fireImpactFeedback(level);
  }
  // SUSP alert is registered on every telemetry event; painting it later is
  // independent from the 40-100ms icon refresh cadence. This fixes missed blips.
  function processSuspensionEvents(d,now){
    if(!settings.hudEnabled || !settings.showIcons || !settings.showSuspIcon ||
       !settings.showTelemetryWarnings || d?.state?.driving===false)return;
    const collision=currentFrameCollision;
    const landing=currentFrameLanding;
    let dv=0;
    if(collisionPassesFilter(collision))dv=collision.dv;
    if(collisionPassesFilter(landing))dv=Math.max(dv,landing.dv);
    const redAt=Math.max(settings.impactRedThreshold,settings.impactYellowThreshold+.5);
    const severity=dv>=redAt?"red":dv>=settings.impactYellowThreshold?"yellow":"";
    if(severity){
      const keepRed=impactAlertSeverity==="red"&&now<impactAlertUntil;
      impactAlertSeverity=keepRed?"red":severity;
      impactAlertUntil=now+(impactAlertSeverity==="red"?1150:800);
    }
  }
  for (const level of ["Light","Medium","Heavy"]){
    mget(`impactPreview${level}`).addEventListener("click",()=>{
      fireImpactFeedback(level.toLowerCase());
      saveStatus(`Impact Feedback preview: ${level}.`);
    });
  }

  function gearText(gear) {
    if (!Number.isFinite(gear)) return "—";
    return gear === -1 ? "R" : gear === 0 ? "N" : String(Math.trunc(gear));
  }

  // Use the games rpmMax for the arc labels, not shift points from driving.
  function updateRpmScale(scaleMax) {
    if (lastRpmScale === scaleMax) return;
    lastRpmScale = scaleMax;
    const ns = "http://www.w3.org/2000/svg";
    const path = shadow.querySelector(".arc-bg");
    const pathLength = path.getTotalLength();
    const count = Math.round(scaleMax / 1000);
    ui.rpmTicks.replaceChildren();
    for (let n = 0; n <= count; n++) {
      const p = path.getPointAtLength(pathLength * n / count);
      // Place figures just outside the arc, rather than at fixed overlapping coordinates.
      const dx = p.x - 193, dy = p.y - 231;
      const length = Math.hypot(dx,dy) || 1;
      const spacing = n === count ? 11 : 15;
      const x = p.x + dx / length * spacing;
      const y = p.y + dy / length * spacing;
      const label = document.createElementNS(ns,"text");
      label.setAttribute("x",String(x.toFixed(1)));
      label.setAttribute("y",String(y.toFixed(1)));
      label.setAttribute("class","dial-scale-label");
      label.textContent=String(n);
      ui.rpmTicks.append(label);
    }
  }

  // One render loop for everthing; no extra 60fps turbo animation.
  function updateTurbo(now) {
    const elapsed = lastTurboRenderAt ? clamp(now-lastTurboRenderAt, 1, 200) : 50;
    lastTurboRenderAt = now;
    const response = settings.turboResponseMs;
    const timeConstant = turboTarget > turboDisplay ? response : Math.max(180, response*.55);
    turboDisplay += (turboTarget-turboDisplay) * (1-Math.exp(-elapsed/timeConstant));
    if (Math.abs(turboTarget-turboDisplay) < .002) turboDisplay=turboTarget;
    const pct = Math.round(100*turboDisplay);
    if (pct !== turboLastPct) {
      turboLastPct = pct;
      ui.turboFill.style.transform = `scaleX(${clamp(turboDisplay,0,1).toFixed(3)})`;
      setText(ui.turboPct, `${pct}%`);
    }
    if (settings.hudStyle === "analog" && analogLastTurboPct !== pct) {
      analogLastTurboPct = pct;
      analogNeedle(analogUi.turboNeedle,turboDisplay*3,3,89,236);
    }
  }
  function setText(el, value) {
    if (el.textContent !== value) el.textContent = value;
  }
  function setIndicator(name, status, label) {
    const row = name === "tyre" ? ui.tyreIcon : name === "engine" ? ui.engineIcon : ui.suspIcon;
    if (currentIndicators[name] === status && row.querySelector(".icon-name").textContent === label) return;
    currentIndicators[name] = status;
    row.classList.toggle("warning-yellow",status === "yellow");
    row.classList.toggle("warning-red",status === "red");
    analogSetIndicator(name,status,label);
    const displayLabel = row.querySelector(".icon-name");
    setText(displayLabel,label);
  }
  function newDamageTarget() {
    return settings.damageHitMode === "custom" ? settings.damageCustomHits : 12 + Math.floor(Math.random()*4);
  }
  function damageIsActive(now=performance.now()) {return settings.damageEnabled && damageUntil > now;}
  function formatSeconds(ms) {
    const seconds = Math.max(0,Math.ceil(ms/1000));
    return `${String(Math.floor(seconds/60)).padStart(2,"0")}:${String(seconds%60).padStart(2,"0")}`;
  }
  function updateDamageHud(now=performance.now()) {
    const active=damageIsActive(now);
    syncThrottleGuard();
    ui.damageAlert.classList.toggle("show",active && settings.hudEnabled);
    ui.damageAlert.style.top=settings.hudPosition.startsWith("top") ? (settings.hudMode === "cockpit" ? "156px" : "365px") : "-54px";
    if (active) {
      setText(ui.damageCountdown,formatSeconds(damageUntil-now));
      const cutState=settings.damageInputCut ? throttleGuard?.status() : null;
      const reminder = cutState?.needsRelease && cutState?.blocked
        ? "LIMP MODE · ENGINE MISFIRE"
        : cutState?.active && cutState.pattern === "stutter"
          ? `LIMP MODE · ${cutState.phase === "cut" ? "ENGINE MISFIRE" : "POWER RESTORED"}`
          : "LIMP MODE ACTIVE";
      setText(ui.damageAlert.querySelector("span"), reminder);
    }
    ui.engineIcon.classList.toggle("damage-critical",active && settings.showIcons && settings.showEngineIcon);
    analogUi.engine.classList.toggle("damage-critical",active && settings.showIcons && settings.showEngineIcon);
    if (active && settings.showIcons && settings.showEngineIcon) setIndicator("engine","red","DAMAGE");
    if (!active && lastDamageLabel === "active" && settings.showEngineIcon) {
      currentIndicators.engine="?";setIndicator("engine","","ENGINE");
    }
    lastDamageLabel = active ? "active":"";
    if (menuOpen) updateDamageStatus();
  }
  function updateDamageStatus() {
    const status=mget("damageStatus");if (!status)return;
    if (!settings.damageEnabled) {setText(status,"Damage System OFF — no collision processing.");return;}
    const active=damageIsActive();
    const guardState = active && settings.damageInputCut ? throttleGuard?.status() : null;
    const cutInfo=guardState?.active
      ? ` · ${guardState.pattern === "stutter" ? (guardState.phase === "cut" ? "MISFIRE" : "DRIVING") : "Continuous CUT"} · ${settings.damageCutScope === "all" ? "WASD + arrows" : "W / ↑"}`
      : "";
    const idleInfo=settings.damageImpactIdleReset && damageHits>0 && lastCountedImpactAt>0
      ? ` · reset in ${formatSeconds(settings.damageImpactResetSeconds*1000-(performance.now()-lastCountedImpactAt))}` : "";
    setText(status,active ? `ENGINE DAMAGE · LIMP MODE ACTIVE · repair in ${formatSeconds(damageUntil-performance.now())}${cutInfo}`
      : `Counted impacts: ${damageHits}/${damageTarget}${idleInfo} · grouped collisions have a cooldown.`);
  }
  function clearDamageTimer() {
    if(damageTimer!==null){clearTimeout(damageTimer);damageTimer=null;}
  }
  function clearImpactIdleTimer() {
    if (impactIdleTimer !== null) {clearTimeout(impactIdleTimer);impactIdleTimer=null;}
  }
  function expireIdleImpacts(now=performance.now()) {
    if (!settings.damageImpactIdleReset || damageHits<=0 || !lastCountedImpactAt || damageIsActive(now))return false;
    if (now-lastCountedImpactAt < settings.damageImpactResetSeconds*1000)return false;
    clearImpactIdleTimer();damageHits=0;lastCountedImpactAt=0;
    damageTarget=newDamageTarget();
    updateDamageStatus();
    return true;
  }
  function scheduleImpactIdleTimer() {
    clearImpactIdleTimer();
    if (!settings.damageEnabled || !settings.damageImpactIdleReset || damageHits<=0 || !lastCountedImpactAt || damageIsActive())return;
    const delay=Math.max(1,settings.damageImpactResetSeconds*1000-(performance.now()-lastCountedImpactAt));
    impactIdleTimer=setTimeout(()=>{
      impactIdleTimer=null;
      if (!expireIdleImpacts()) scheduleImpactIdleTimer();
    },delay);
  }
  function resetDamage({preserveCounters=false}={}) {
    clearDamageTimer();clearImpactIdleTimer();damageHits=0;damageUntil=0;lastDamageLabel="";lastCountedImpactAt=0;
    syncThrottleGuard();
    damageTarget=newDamageTarget();
    lastRawCollisionAt=-Infinity;lastQualifiedCollisionAt=-Infinity;
    if (!preserveCounters) previousImpactCounter=null;
    ui.damageAlert.classList.remove("show");ui.engineIcon.classList.remove("damage-critical");analogUi.engine.classList.remove("damage-critical");
    if(settings.showEngineIcon) {currentIndicators.engine="?";setIndicator("engine","","ENGINE");}
    updateDamageStatus();
  }
  function activateDamage(now) {
    if (damageUntil>0)return;
    clearImpactIdleTimer();
    damageUntil=now+settings.damageRepairSeconds*1000;
    syncThrottleGuard();
    damageHits=damageTarget;
    if (settings.showEngineIcon) setIndicator("engine","red","DAMAGE");
    updateDamageHud(now);
    clearDamageTimer();
    // One timer only; no new frame loop, even while the tab is backgrounded.
    damageTimer=setTimeout(()=>{damageTimer=null;resetDamage({preserveCounters:true});},settings.damageRepairSeconds*1000);
  }
  function processDamageCollision(d,now) {
    if (!settings.damageEnabled || !settings.hudEnabled || d.state?.driving === false || document.visibilityState === "hidden")return;
    expireIdleImpacts(now);
    const sample=currentFrameCollision;
    if(!sample || damageIsActive(now))return;
    lastCollisionVelocity=sample.dv;
    if(!collisionPassesFilter(sample,settings.damageMinImpact))return;
    // Count one crash, not each subsequent bounce. A synthetic hard stop
    // and a delayed game impact event belong to the same cooldown group.
    if(now-lastQualifiedCollisionAt<IMPACT_COOLDOWN_MS)return;
    lastQualifiedCollisionAt=now;
    damageHits=Math.min(damageTarget,damageHits+1);
    lastCountedImpactAt=now;
    if(damageHits>=damageTarget)activateDamage(now);
    else scheduleImpactIdleTimer();
    if(menuOpen)updateDamageStatus();
  }
  function resetTyreBrakeState() {
    slipBeganAt=0;
    slipLastSeenAt=0;
    slipConfirmed=false;
    previousBrakeInput=0;
    brakeStartedAt=0;
    brakeStartedValue=0;
    abruptBrakeLatched=false;
  }
  function clearIndicators() {
    currentIndicators = {tyre:"?",engine:"?",susp:"?"};
    setIndicator("tyre","","TYRES");setIndicator("engine","","ENGINE");setIndicator("susp","","COILOVER");
  }
  function processTelemetry(d, now) {
    const useTyre=settings.showIcons && settings.showTyreIcon && settings.showTelemetryWarnings;
    const useEngine=settings.showIcons && settings.showEngineIcon && settings.showTelemetryWarnings;
    const useSusp=settings.showIcons && settings.showSuspIcon && settings.showTelemetryWarnings;
    if (!useTyre) {resetTyreBrakeState(); if (settings.showTyreIcon) setIndicator("tyre","","TYRES");}
    if (!useSusp && settings.showSuspIcon) setIndicator("susp","","COILOVER");
    if (!useEngine && settings.showEngineIcon && !damageIsActive(now)) setIndicator("engine","","ENGINE");
    if (!useTyre && !useEngine && !useSusp) {oldTelemetry=null;updateDamageHud(now);return;}
    const kmh=useTyre && Number.isFinite(d.speed) ? Math.abs(d.speed)*3.6 : 0;
    if (useTyre) {
      const wh=d.wheels || {};
      const lat=Array.isArray(wh.slipLat)?wh.slipLat:[];
      const longitudinal=Array.isArray(wh.slipLong)?wh.slipLong:[];
      const ground=Array.isArray(wh.ground)?wh.ground:[];
      const threshold=settings.tyreSlipThreshold;
      let lateralWheels=0,spinningWheels=0,extremeSlip=false;
      for(let i=0;i<4;i++) {
        if(ground[i]===false)continue;
        const lateral=Number.isFinite(lat[i])?Math.abs(lat[i]):0;
        const spin=Number.isFinite(longitudinal[i])?Math.max(0,longitudinal[i]):0;
        if(lateral>=threshold)lateralWheels++;
        if(spin>=threshold)spinningWheels++;
        if(lateral>=threshold*1.8||spin>=threshold*1.8)extremeSlip=true;
      }
      const slippingNow=kmh>=35&&(lateralWheels>=2||spinningWheels>=2||extremeSlip);
      if(slippingNow){if(!slipBeganAt)slipBeganAt=now;slipLastSeenAt=now;
        if(now-slipBeganAt>=settings.tyreSlipHoldMs)slipConfirmed=true;
      } else if(!slipLastSeenAt || now-slipLastSeenAt>=140){slipBeganAt=0;slipLastSeenAt=0;slipConfirmed=false;}
      const sustainedSlip=slipConfirmed&&(slippingNow||now-slipLastSeenAt<140);
      const brake=Number.isFinite(d.brake)?clamp(d.brake,0,1):0;
      const pressed=brake>=0.12;
      if(pressed&&previousBrakeInput<0.12){brakeStartedAt=now;brakeStartedValue=previousBrakeInput;}
      if(!pressed){brakeStartedAt=0;brakeStartedValue=0;abruptBrakeLatched=false;}
      else if(kmh>=100 && brake>=settings.absBrakeThreshold && brakeStartedAt>0 && now-brakeStartedAt<=350 && brake-brakeStartedValue>=0.55)
        abruptBrakeLatched=true;
      previousBrakeInput=brake;
      const absWarning=kmh>=100 && abruptBrakeLatched && brake>=Math.max(0.40,settings.absBrakeThreshold*.7);
      const label=absWarning?"ABS":pressed&&kmh<100?"BRAKE":sustainedSlip?"SLIP":pressed?"BRAKE":"TYRES";
      setIndicator("tyre",absWarning||sustainedSlip?"yellow":"",label);
    }
    const previous=oldTelemetry;
    if (useEngine && !damageIsActive(now)) {
      const redline=Number.isFinite(d.rpmRedline)&&d.rpmRedline>0?d.rpmRedline:null;
      const red=redline!==null&&Number.isFinite(d.rpm)&&d.rpm>=redline&&d.gear>0;
      const upshift=Number.isFinite(previous?.gear)&&d.gear>previous.gear;
      const manual=d.manual===true||settings.shiftMode==="manual";
      if(upshift||!red)engineRedSince=0;
      else if(!engineRedSince)engineRedSince=now;
      const warn=red&&(manual||(!upshift&&now-engineRedSince>=250));
      setIndicator("engine",warn?"red":"",warn?"REDLINE":"ENGINE");
    }
    if (useSusp) {
      const active=now<impactAlertUntil?impactAlertSeverity:"";
      setIndicator("susp",active,active==="red"?"IMPACT":active==="yellow"?"BUMP":"COILOVER");
    }
    oldTelemetry={gear:useEngine?d.gear:null,events:useSusp?{impacts:d.events?.impacts,landings:d.events?.landings}:{}};
    updateDamageHud(now);
  }

  function applyVisibility() {
    const compact = settings.hudMode === "cockpit";
    hud.classList.toggle("compact", compact);
    get("speed-block").classList.toggle("is-hidden", !settings.showSpeed);
    get("gear-block").classList.toggle("is-hidden", !settings.showGear);
    get("compact-gear-row").classList.toggle("is-hidden", !settings.showGear);
    get("rpm-section").classList.toggle("is-hidden", !settings.showRpm);
    get("nitro-section").classList.toggle("is-hidden", !settings.showNitro);
    get("shift-strip").classList.toggle("is-hidden", !settings.showShift);
    get("icons-section").classList.toggle("is-hidden", !settings.showIcons || !(settings.showTyreIcon || settings.showEngineIcon || settings.showSuspIcon));
    ui.tyreIcon.classList.toggle("is-hidden",!settings.showTyreIcon);
    ui.engineIcon.classList.toggle("is-hidden",!settings.showEngineIcon);
    ui.suspIcon.classList.toggle("is-hidden",!settings.showSuspIcon);
    get("turbo-section").classList.toggle("is-hidden", !settings.showTurbo);
    get("modern-odometer").classList.toggle("is-hidden", !settings.analogOdometerEnabled || compact || settings.hudStyle!=="modern");
    analogVisibility();
    const anyEnabled = compact ? settings.showGear || settings.showShift || settings.showNitro
      : settings.showSpeed || settings.showGear || settings.showRpm || settings.showShift || settings.showNitro || (settings.showIcons && (settings.showTyreIcon || settings.showEngineIcon || settings.showSuspIcon)) || settings.showTurbo;
    host.style.display = settings.hudEnabled && anyEnabled && received && latest?.state?.driving !== false ? "block" : "none";
    updateDamageHud();
  }

  function applyAppearance() {
    const p = settings.hudPosition;
    // Skin switch is isolated from shared read-only telemetry and settings state.
    hud.dataset.style = settings.hudStyle;
    hud.classList.toggle("perf-eco",settings.hudPerformanceMode === "eco");
    hud.style.setProperty("--analog-bg-opacity",String(settings.hudBackgroundOpacity/100));
    hud.classList.toggle("analog-depth",settings.analogDepthEnabled);
    hud.style.setProperty("--analog-needle-color",settings.analogNeedleColor);
    hud.style.setProperty("--analog-numbers-color",settings.analogNumbersColor);
    hud.style.setProperty("--analog-tick-color",settings.analogTickColor);
    // Match the old major tick color when untouched; otherwise use the chosen color.
    hud.style.setProperty("--analog-tick-major-color", settings.analogTickColor===DEFAULTS.analogTickColor ? "#FFA139" : settings.analogTickColor);
    hud.style.setProperty("--analog-glow-alpha",String(settings.analogGlowPercent/100*.30));
    hud.style.setProperty("--analog-glow-width",`${(settings.analogGlowPercent/100*2.2).toFixed(2)}px`);
    hud.classList.toggle("depth-subtle",settings.speedDepth === "subtle");
    hud.classList.toggle("depth-medium",settings.speedDepth === "medium");
    setText(ui.speedUnit,settings.speedUnit === "mph" ? "MPH" : "KM/H");
    const isRight = p.endsWith("right"), isBottom = p.startsWith("bottom");
    host.style.top = isBottom ? "auto" : "20px";
    host.style.bottom = isBottom ? "23px" : "auto";
    host.style.left = isRight ? "auto" : "18px";
    host.style.right = isRight ? "18px" : "auto";
    hud.style.transform = `scale(${settings.hudScale / 100})`;
    hud.style.transformOrigin = `${isBottom ? "bottom" : "top"} ${isRight ? "right" : "left"}`;
    hud.style.opacity = "1";
    hud.style.setProperty("--text-alpha",String(settings.hudTextOpacity/100));
    const colors = {
      "--panel-bg": alphaColor(settings.colorPanelBg, settings.hudBackgroundOpacity/100), "--panel-border": alphaColor(settings.colorPanelBorder, .65),
      "--header": settings.colorHeader, "--live": settings.colorLive,
      "--speed": settings.colorSpeed, "--speed-unit": settings.colorSpeedUnit,
      "--gear-label": settings.colorGearLabel, "--gear": settings.colorGear,
      "--rpm-label": settings.colorRpmLabel, "--rpm-value": settings.colorRpmValue,
      "--rpm-track": settings.colorRpmTrack, "--rpm-start": settings.colorRpmStart,
      "--rpm-end": settings.colorRpmEnd, "--redline": settings.colorRpmRedline,
      "--nitro-label": settings.colorNitroLabel, "--nitro-value": settings.colorNitroValue,
      "--nitro-empty": settings.colorNitroEmpty,
      "--nitro-1-start": settings.colorNitroFirstStart, "--nitro-1-end": settings.colorNitroFirstEnd,
      "--nitro-2-start": settings.colorNitroSecondStart, "--nitro-2-end": settings.colorNitroSecondEnd,
      "--divider": alphaColor(settings.colorDivider, .35),
      "--shift-label": settings.colorShiftLabel,
      "--shift-normal": settings.colorShiftNormal, "--shift-near": settings.colorShiftNear,
      "--shift-ready": settings.colorShiftReady,
      "--shift-text-normal": settings.colorShiftTextNormal,
      "--shift-text-near": settings.colorShiftTextNear,
      "--shift-text-ready": settings.colorShiftTextReady,
      "--icon":settings.colorIcon, "--icon-accent":settings.colorIconAccent,
      "--turbo-fill":settings.colorTurboFill, "--turbo-track":settings.colorTurboTrack
    };
    for (const [property,color] of Object.entries(colors)) hud.style.setProperty(property,color);
    applyAnalogLayout();
    applyVisibility();
    updateSpeedSensation();
  }

  function analogDragRange(){
    // Convert a full viewport travel distance into unscaled SVG offset pixels.
    // Include the current saved position so resizing the browser never clamps it.
    return Math.min(20000,Math.ceil(1.45*Math.max(innerWidth,innerHeight,1000)/Math.max(.50,settings.hudScale/100)));
  }
  function syncAnalogPositionControls(){
    const range=analogDragRange();
    for(const key of ANALOG_POSITION_KEYS){
      const slider=mget(key),input=mget(`${key}Number`);
      const bound=Math.min(20000,Math.max(range,Math.abs(settings[key])));
      slider.min=String(-bound);slider.max=String(bound);
      slider.value=String(settings[key]);
      input.value=String(settings[key]);
    }
  }
  function syncMenu() {
    mget("modernColorsSettings").hidden=settings.hudStyle!=="modern";
    mget("analogPositionSettings").hidden=settings.hudStyle!=="analog";
    mget("analogCustomizationSettings").hidden=settings.hudStyle!=="analog";
    syncAnalogPositionControls();
    for (const [key, val] of Object.entries(settings)) {
      const field = mget(key);
      if (!field) continue;
      if (field.type === "checkbox") field.checked = Boolean(val);
      else field.value = String(val);
    }
    mget("hudScaleValue").textContent = `${settings.hudScale}%`;
    mget("hudBackgroundOpacityValue").textContent = `${settings.hudBackgroundOpacity}%`;
    mget("hudTextOpacityValue").textContent = `${settings.hudTextOpacity}%`;
    mget("analogGlowPercentValue").textContent = `${settings.analogGlowPercent}%`;
    updateOdometerDisplay();
    mget("speedSensationIntensityValue").textContent = `${settings.speedSensationIntensity}%`;
    mget("speedSensationFogPercentValue").textContent = `${settings.speedSensationFogPercent}%`;
    mget("speedSensationStartKmhValue").textContent = `${settings.speedSensationStartKmh} km/h`;
    mget("collisionMinSpeedKmhValue").textContent = `${settings.collisionMinSpeedKmh} km/h`;
    mget("collisionMinDvValue").textContent = `${settings.collisionMinDv.toFixed(1)} m/s`;
    mget("impactFeedbackIntensityValue").textContent = `${settings.impactFeedbackIntensity}%`;
    mget("impactFeedbackMediumDvValue").textContent = `${settings.impactFeedbackMediumDv.toFixed(1)} m/s`;
    mget("impactFeedbackHeavyDvValue").textContent = `${Math.max(settings.impactFeedbackHeavyDv,settings.impactFeedbackMediumDv+3).toFixed(1)} m/s`;
    for (const key of ["analogTurboOffsetX","analogTurboOffsetY","analogRpmOffsetX","analogRpmOffsetY","analogSpeedOffsetX","analogSpeedOffsetY"]) {
      const valueNode=mget(`${key}Value`);
      if(valueNode) valueNode.textContent = `${settings[key]} px`;
    }
    mget("tyreSlipThresholdValue").textContent = `${settings.tyreSlipThreshold.toFixed(1)} m/s`;
    mget("tyreSlipHoldMsValue").textContent = `${(settings.tyreSlipHoldMs/1000).toFixed(2)} s`;
    mget("absBrakeThresholdValue").textContent = `${Math.round(settings.absBrakeThreshold*100)}%`;
    mget("impactYellowThresholdValue").textContent = `${settings.impactYellowThreshold.toFixed(1)} m/s`;
    mget("impactRedThresholdValue").textContent = `${settings.impactRedThreshold.toFixed(1)} m/s`;
    for (const [key, {hex,swatches,picker}] of colorControlRows) {
      const color = settings[key];
      hex.textContent = color;
      picker.value = color;
      swatches.forEach(([suggested,el]) => el.setAttribute("aria-pressed",String(suggested === color)));
    }
    mget("depthDemo").dataset.depth = settings.speedDepth;
    mget("manualGreenLead").disabled = settings.shiftMode !== "manual";
    mget("turboStartRpm").disabled = settings.turboStartMode !== "custom";
    mget("turboStartRpmInput").disabled = settings.turboStartMode !== "custom";
    mget("turboStartRpmInput").value = String(settings.turboStartRpm);
    mget("turboStartRpmValue").textContent = `${settings.turboStartRpm.toLocaleString("en-US")} RPM`;
    mget("turboResponseMsValue").textContent = `${(settings.turboResponseMs/1000).toFixed(1)} s`;
    mget("damageMinImpactValue").textContent=`${settings.damageMinImpact.toFixed(1)} m/s`;
    mget("damageCustomHits").disabled=settings.damageHitMode!=="custom";
    for(const key of ["damageHitMode","damageRepairSeconds","damageMinImpact","damageCutScope"])
      mget(key).disabled=!settings.damageEnabled;
    if(settings.damageHitMode==="random")mget("damageCustomHits").disabled=true;
    mget("damageInputCut").disabled=!settings.damageEnabled;
    mget("damageCutScope").disabled=!settings.damageEnabled||!settings.damageInputCut;
    mget("damageCutPattern").disabled=!settings.damageEnabled||!settings.damageInputCut;
    mget("damageImpactIdleReset").disabled=!settings.damageEnabled;
    mget("damageImpactResetSeconds").disabled=!settings.damageEnabled||!settings.damageImpactIdleReset;
    mget("damageReset").disabled=!settings.damageEnabled;
    for(const id of ["impactFeedbackIntensity","impactFeedbackFlash","impactFeedbackShake","impactFeedbackMediumDv","impactFeedbackHeavyDv","impactPreviewLight","impactPreviewMedium","impactPreviewHeavy"])mget(id).disabled=!settings.impactFeedbackEnabled;
    updateDamageStatus();
  }

  function saveStatus(message, error=false) {
    const element=mget("status");
    element.textContent=message;
    element.style.color=error ? "#ffc0b7" : "#8de6c7";
  }
  function persistSoon() {
    if (!settingsReady) return; // do not overwrite stored data before initial read finishes
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = setTimeout(() => { void flushChanges(); }, 120);
    saveStatus("Saving settings...");
  }
  function flushChanges() {
    if (saveTimer !== null) clearTimeout(saveTimer);
    saveTimer = null;
    if (!settingsReady) return Promise.resolve();
    if (settingsSaving) {saveQueued=true;return lastSaveOperation;}
    if (!dirtyKeys.size) return Promise.resolve();
    // Write a COMPLETE atomic snapshot as well as legacy individual keys for the popup.
    // Do not mark changes saved until storage.local confirms the write succeeded.
    const changed=[...dirtyKeys];
    const snapshot=getActiveSnapshot();
    const payload={ [ACTIVE_SETTINGS_KEY]: {schema:2,settings:snapshot,savedAt:new Date().toISOString()} };
    for (const key of changed) payload[key]=snapshot[key];
    changed.forEach(key=>dirtyKeys.delete(key));
    settingsSaving=true;
    saveStatus("Saving settings...");
    // Invoke storage.set immediately so a fast page close does not discard a queued microtask.
    let write;
    try {write=hudStorage.set(payload);}
    catch(error) {write=Promise.reject(error);}
    lastSaveOperation=Promise.resolve(write).then(()=>{
      settingsSaving=false;
      saveStatus("All settings saved ✓");
      if (saveQueued || dirtyKeys.size) {saveQueued=false;return flushChanges();}
    }).catch(error=>{
      settingsSaving=false;
      for (const key of changed) if (settings[key]===snapshot[key]) dirtyKeys.add(key);
      saveQueued=false;
      saveStatus("Save failed — retrying. " + (error?.message || ""),true);
      console.warn("[NFSU2 Modern HUD] Save failed",error);
      if (document.visibilityState!=="hidden") setTimeout(()=>{if(dirtyKeys.size)void flushChanges();},900);
    });
    return lastSaveOperation;
  }
  function changeSetting(key, value, persistent=true) {
    if (!(key in DEFAULTS)) return;
    const normalized = normalize(key, value);
    if (settings[key] === normalized) return;
    settings[key] = normalized;
    if (key === "shiftMode") shiftGuide.reset();
    if (["showTelemetryWarnings","showIcons","showTyreIcon","showEngineIcon","showSuspIcon","hudEnabled"].includes(key)) {
      clearIndicators();resetTyreBrakeState();oldTelemetry=null;engineRedSince=0;
      if(key==="showTyreIcon"&&!normalized)resetTyreBrakeState();
    }
    if((key==="impactFeedbackShake" && !normalized) || (key==="impactFeedbackEnabled" && !normalized)){
      impactShakeAnimation?.cancel();
    }
    if(key==="damageEnabled")resetDamage({preserveCounters:false});
    if(key==="damageInputCut" && normalized) throttleGuard?.resetEmergency();
    if(["collisionMinSpeedKmh","collisionMinDv"].includes(key)){
      impactAlertUntil=0;impactAlertSeverity="";
      setIndicator("susp","","COILOVER");
    }
    if(["damageEnabled","damageInputCut","damageCutScope","damageCutPattern","hudEnabled"].includes(key))syncThrottleGuard();
    if(key==="damageHitMode"||key==="damageCustomHits") {
      if(!damageIsActive()) {damageHits=0;lastCountedImpactAt=0;clearImpactIdleTimer();damageTarget=newDamageTarget();}
    }
    if(key==="damageImpactIdleReset"||key==="damageImpactResetSeconds") {
      if (normalized && settings.damageImpactIdleReset) {
        if(!expireIdleImpacts())scheduleImpactIdleTimer();
      } else clearImpactIdleTimer();
    }
    applyAppearance();
    syncMenu();
    if(["speedSensationStartKmh","speedSensationIntensity","speedSensationEnabled","speedSensationFogEnabled","speedSensationFogPercent"].includes(key))updateSpeedSensation();
    nextEligibleAt=0; // Update a newly selected style or unit straight away.
    scheduleRender();
    if (persistent) { dirtyKeys.add(key); persistSoon(); }
  }
  function applyTheme(accent) {
    const colors = {...DEFAULT_COLORS};
    if (accent) {
      colors.colorGear = accent;
      colors.colorRpmEnd = accent;
      colors.colorRpmStart = accent;
      colors.colorIconAccent = accent;
      colors.colorTurboFill = accent;
      colors.colorRpmRedline = accent;
      colors.colorNitroFirstStart = accent;
      colors.colorNitroFirstEnd = accent;
      // Second nitro charge has a lighter blue so its easier to tell apart.
      const h = accent.slice(1);
      const r=parseInt(h.slice(0,2),16),g=parseInt(h.slice(2,4),16),b=parseInt(h.slice(4,6),16);
      const lighten = amount => '#' + [r,g,b].map(x => Math.round(x+(255-x)*amount).toString(16).padStart(2,'0')).join('').toUpperCase();
      colors.colorNitroSecondStart = lighten(.38);
      colors.colorNitroSecondEnd = lighten(.62);
    }
    for (const [key,value] of Object.entries(colors)) {
      if (settings[key] !== value) {settings[key]=value;dirtyKeys.add(key);}
    }
    applyAppearance();syncMenu();syncThrottleGuard();persistSoon();
    mget("status").textContent = accent ? "Theme applied. Customize each color below." : "Classic colors restored.";
  }
  function getActiveSnapshot() {
    const data = {};
    for (const key of Object.keys(DEFAULTS)) data[key] = settings[key];
    return data;
  }
  function safeName(s) {
    return typeof s === "string" ? s.replace(/[\x00-\x1f\x7f<>]/g, "").trim().slice(0, 48) : "";
  }
  function normalizeSnapshot(input) {
    if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid profile settings.");
    const snapshot = {};
    for (const key of Object.keys(DEFAULTS)) snapshot[key] = normalize(key, input[key] === undefined ? DEFAULTS[key] : input[key]);
    return snapshot;
  }
  function profileEntry(id) {
    const built = BUILTIN_PROFILES.find(p => p.id === id);
    if (built) return { ...built, builtIn: true, settings: {...DEFAULTS,...built.settings} };
    const found = customProfiles.find(p => p.id === id);
    return found ? {...found,builtIn:false} : null;
  }
  function updateProfileMenu() {
    const sel = mget("profileSelect");
    const previous = selectedProfileId;
    sel.replaceChildren();
    for (const item of [...BUILTIN_PROFILES, ...customProfiles]) {
      const opt = document.createElement("option");opt.value=item.id;
      opt.textContent = (item.id.startsWith("built:") ? "Example · " : "Saved · ") + item.name;
      sel.append(opt);
    }
    if (!profileEntry(previous)) selectedProfileId = BUILTIN_PROFILES[0].id;
    sel.value = selectedProfileId;
    const selected = profileEntry(selectedProfileId);
    mget("profileDelete").disabled=Boolean(selected?.builtIn);
    mget("profileUpdate").disabled=Boolean(selected?.builtIn);
    mget("profileDownload").disabled=!selected;
    mget("profileApply").disabled=!selected;
  }
  function profileMessage(message, bad=false) {
    const el=mget("profileStatus");el.textContent=message;
    el.style.color=bad ? "#ffc0b7" : "#a9e3db";
  }
  function saveProfiles() {
    // The promise resolves only after the browser confirms the profile data is stored.
    // Each snapshot contains every known setting, including all 29 color fields.
    return hudStorage.set({[PROFILE_STORE_KEY]:customProfiles.map(p=>({
      id:p.id,name:p.name,settings:normalizeSnapshot(p.settings)
    }))});
  }
  function uniqueProfileName(name) {
    let candidate=safeName(name) || "Imported HUD";
    if (!customProfiles.some(p => p.name.toLowerCase()===candidate.toLowerCase())) return candidate;
    let index=2;
    const base=candidate.slice(0,42);
    while(customProfiles.some(p=>p.name.toLowerCase()===candidate.toLowerCase())) {
      candidate=`${base} (${index++})`;
    }
    return candidate;
  }
  async function addProfile(name,snapshot) {
    if(customProfiles.length>=PROFILE_LIMIT) throw new Error(`Maximum ${PROFILE_LIMIT} saved profiles.`);
    const clean=uniqueProfileName(name);
    const id=`user:${typeof crypto.randomUUID === "function" ? crypto.randomUUID() : [...crypto.getRandomValues(new Uint8Array(16))].map(n=>n.toString(16).padStart(2,"0")).join("")}`;
    const previous=customProfiles.slice();
    customProfiles.push({id,name:clean,settings:normalizeSnapshot(snapshot)});
    try {await saveProfiles();}
    catch(error) {customProfiles=previous;updateProfileMenu();throw new Error("The browser could not save the profile: "+error.message);}
    selectedProfileId=id;updateProfileMenu();
    return clean;
  }
  async function updateSelectedProfile() {
    const entry=profileEntry(selectedProfileId);
    if (!entry || entry.builtIn) throw new Error("Select one of your own saved profiles to update.");
    const item=customProfiles.find(p=>p.id===selectedProfileId);
    if (!item) throw new Error("Saved profile not found.");
    const previous=item.settings;
    item.settings=normalizeSnapshot(getActiveSnapshot());
    try {await saveProfiles();}
    catch(error) {item.settings=previous;throw new Error("Profile update failed: "+error.message);}
    return item.name;
  }
  function applySnapshot(snapshot) {
    const validated=normalizeSnapshot(snapshot);
    for (const [key,val] of Object.entries(validated)) {
      if (settings[key] !== val) {settings[key]=val;dirtyKeys.add(key);}
    }
    shiftGuide.reset();
    resetDamage({preserveCounters:false});
    syncThrottleGuard();
    applyAppearance();syncMenu();
    return flushChanges();
  }
  function downloadProfile(name, snapshot) {
    const cleanName=safeName(name)||"Current_Settings";
    const payload = {format:PROFILE_FORMAT,version:2,name:cleanName,style:settings.hudStyle,settings:normalizeSnapshot(snapshot)};
    const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
    const url=URL.createObjectURL(blob);
    const link=document.createElement("a");
    link.href=url;
    link.download=`NFSU2-HUD-${cleanName.replace(/[^a-z0-9 _-]/gi,"").trim().replace(/\s+/g,"_") || "profile"}.json`;
    menuHost.append(link);link.click();link.remove();
    setTimeout(()=>URL.revokeObjectURL(url),10000);
    return cleanName;
  }
  function exportSelectedProfile() {
    const entry=profileEntry(selectedProfileId);
    if(!entry) return profileMessage("Select a saved profile first.",true);
    const name=downloadProfile(entry.name,entry.settings);
    profileMessage(`Downloaded SAVED profile: ${name}. Live changes are not included unless you update it.`);
  }
  async function exportCurrentSettings() {
    // Wait until current save finishes, then export the same live setings.
    await flushChanges();
    const name=downloadProfile("Current_Settings",getActiveSnapshot());
    profileMessage(`Downloaded CURRENT settings: ${name}. All colors and controls included.`);
  }
  async function importProfile(file) {
    if (!file) return;
    if (file.size>128*1024) throw new Error("Profile exceeds 128 KB.");
    const parsed=JSON.parse(await file.text());
    if (!parsed || parsed.format!==PROFILE_FORMAT || ![1,2].includes(parsed.version) || typeof parsed.name!=="string") {
      throw new Error("Not a supported NFSU2 HUD profile JSON file.");
    }
    // Older exports may omit newly introduced settings: preserve the current values
    // for absent fields, rather than silently resetting them to defaults.
    if (!parsed.settings || typeof parsed.settings!=="object" || Array.isArray(parsed.settings)) {
      throw new Error("Profile has no valid settings object.");
    }
    const merged={...getActiveSnapshot(),...parsed.settings};
    const validated=normalizeSnapshot(merged);
    const name=await addProfile(parsed.name,validated);
    await applySnapshot(validated);
    profileMessage(`Imported, saved and applied ALL settings: ${name}.`);
  }
  function resetDefaults() {
    for (const [k, value] of Object.entries(DEFAULTS)) {
      if (settings[k] !== value) { settings[k] = value; dirtyKeys.add(k); }
    }
    shiftGuide.reset();resetDamage({preserveCounters:false});
    applyAppearance();
    syncMenu();
    void flushChanges();
  }
  // Profiles are independent of the auto-saved active settings.
  mget("profileSelect").addEventListener("change", e=>{
    selectedProfileId=e.target.value;updateProfileMenu();
    const entry=profileEntry(selectedProfileId);
    if(entry)mget("profileName").value=entry.builtIn ? "" : entry.name;
  });
  mget("profileSave").addEventListener("click",async()=>{
    const input=mget("profileName");const name=safeName(input.value);
    if(!name)return profileMessage("Enter a profile name.",true);
    try {profileMessage("Saving new profile..."); const saved=await addProfile(name,getActiveSnapshot());profileMessage(`Saved all settings: ${saved}.`);input.value="";}
    catch(err){profileMessage(err.message,true);}
  });
  mget("profileUpdate").addEventListener("click",async()=>{
    try {profileMessage("Updating selected profile...");const name=await updateSelectedProfile();profileMessage(`Updated all settings: ${name}.`);}
    catch(err){profileMessage(err.message,true);}
  });
  mget("profileApply").addEventListener("click",async()=>{
    const entry=profileEntry(selectedProfileId);
    if(!entry)return profileMessage("Select a profile first.",true);
    try {await applySnapshot(entry.settings);profileMessage(`Applied and saved: ${entry.name}.`);}
    catch(err){profileMessage(err.message,true);}
  });
  mget("profileDownload").addEventListener("click",exportSelectedProfile);
  mget("profileDownloadCurrent").addEventListener("click",()=>{void exportCurrentSettings().catch(err=>profileMessage(err.message,true));});
  mget("profileDelete").addEventListener("click",async()=>{
    const entry=profileEntry(selectedProfileId);
    if(!entry || entry.builtIn)return profileMessage("Built-in profiles cannot be deleted.",true);
    const oldProfiles=customProfiles.slice();
    customProfiles=customProfiles.filter(p=>p.id!==selectedProfileId);
    try {await saveProfiles();selectedProfileId=BUILTIN_PROFILES[0].id;updateProfileMenu();profileMessage(`Deleted: ${entry.name}.`);}
    catch(err){customProfiles=oldProfiles;updateProfileMenu();profileMessage(`Delete failed: ${err.message}`,true);}
  });
  mget("profileFile").addEventListener("change",async e=>{
    const input=e.currentTarget;
    const file=input.files?.[0];
    try {await importProfile(file);}
    catch(err){profileMessage(`Import failed: ${err.message}`,true);}
    finally {input.value="";}
  });
  updateProfileMenu();

  function applyMenuPlacement() {
    const panel=mget("settingsPanel");
    const width=clamp(settings.menuWidthPx,Math.min(320,innerWidth-10),Math.max(1,innerWidth-10));
    const height=clamp(settings.menuHeightPx,Math.min(260,innerHeight-10),Math.max(1,innerHeight-10));
    panel.style.width=`${Math.round(width)}px`;
    panel.style.height=`${Math.round(height)}px`;
    if(settings.menuLeftPx<0 || settings.menuTopPx<0){
      panel.style.left="auto";panel.style.right="20px";panel.style.top="20px";
      if(innerWidth<width+25)panel.style.right="5px";
      if(innerHeight<height+25)panel.style.top="5px";
      return;
    }
    const maxX=Math.max(5,innerWidth-width-5);
    const maxY=Math.max(5,innerHeight-height-5);
    const x=clamp(settings.menuLeftPx,5,maxX);
    const y=clamp(settings.menuTopPx,5,maxY);
    panel.style.left=`${x}px`;panel.style.top=`${y}px`;panel.style.right="auto";
  }
  const dragHandle=mget("dragHandle");
  const settingsPanel=mget("settingsPanel");
  dragHandle.addEventListener("pointerdown",event=>{
    if(event.button!==0 || event.target.closest("button,input,select,textarea"))return;
    event.preventDefault();event.stopPropagation();
    const rect=settingsPanel.getBoundingClientRect();
    menuDrag={id:event.pointerId,offX:event.clientX-rect.left,offY:event.clientY-rect.top};
    settingsPanel.style.left=`${rect.left}px`;settingsPanel.style.right="auto";settingsPanel.style.top=`${rect.top}px`;
    dragHandle.setPointerCapture(event.pointerId);
  });
  dragHandle.addEventListener("pointermove",event=>{
    if(!menuDrag||event.pointerId!==menuDrag.id)return;
    event.preventDefault();
    const left=clamp(event.clientX-menuDrag.offX,5,Math.max(5,innerWidth-settingsPanel.offsetWidth-5));
    const top=clamp(event.clientY-menuDrag.offY,5,Math.max(5,innerHeight-Math.min(settingsPanel.offsetHeight,innerHeight-10)-5));
    settingsPanel.style.left=`${Math.round(left)}px`;settingsPanel.style.top=`${Math.round(top)}px`;
  });
  const finishDrag=event=>{
    if(!menuDrag||event.pointerId!==menuDrag.id)return;
    menuDrag=null;
    changeSetting("menuLeftPx",parseInt(settingsPanel.style.left,10));
    changeSetting("menuTopPx",parseInt(settingsPanel.style.top,10));
  };
  dragHandle.addEventListener("pointerup",finishDrag);
  dragHandle.addEventListener("pointercancel",finishDrag);
  // Bottom-left resize grip: expands leftwards from the default upper-right location.
  // Its custom handler works in Firefox and Chromium without a native CSS resize corner.
  const menuResizeGrip=mget("menuResizeGrip");
  let menuResize=null;
  menuResizeGrip.addEventListener("pointerdown",event=>{
    if(event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const rect=settingsPanel.getBoundingClientRect();
    menuResize={id:event.pointerId,startX:event.clientX,startY:event.clientY,
      right:rect.right,top:rect.top,width:rect.width,height:rect.height,
      anchored:settings.menuLeftPx<0||settings.menuTopPx<0};
    menuResizeGrip.setPointerCapture(event.pointerId);
  });
  menuResizeGrip.addEventListener("pointermove",event=>{
    if(!menuResize||event.pointerId!==menuResize.id)return;
    event.preventDefault();
    const resize=menuResize;
    const maxWidth=Math.max(Math.min(320,innerWidth-10),resize.right-5);
    const maxHeight=Math.max(Math.min(260,innerHeight-10),innerHeight-resize.top-5);
    const width=clamp(resize.width+resize.startX-event.clientX,Math.min(320,maxWidth),maxWidth);
    const height=clamp(resize.height+event.clientY-resize.startY,Math.min(260,maxHeight),maxHeight);
    settingsPanel.style.left=`${Math.round(resize.right-width)}px`;
    settingsPanel.style.right="auto";
    settingsPanel.style.top=`${Math.round(resize.top)}px`;
    settingsPanel.style.width=`${Math.round(width)}px`;
    settingsPanel.style.height=`${Math.round(height)}px`;
  });
  const finishResize=event=>{
    if(!menuResize||event.pointerId!==menuResize.id)return;
    const resize=menuResize;menuResize=null;
    const width=Math.round(settingsPanel.getBoundingClientRect().width);
    const height=Math.round(settingsPanel.getBoundingClientRect().height);
    if(!resize.anchored){
      changeSetting("menuLeftPx",parseInt(settingsPanel.style.left,10));
    }
    changeSetting("menuWidthPx",width);
    changeSetting("menuHeightPx",height);
    applyMenuPlacement();
  };
  menuResizeGrip.addEventListener("pointerup",finishResize);
  menuResizeGrip.addEventListener("pointercancel",finishResize);
  window.addEventListener("resize",()=>{if(menuOpen)applyMenuPlacement();},{passive:true});
  mget("damageReset").addEventListener("click",()=>resetDamage({preserveCounters:true}));

  function toggleMenu(force) {
    menuOpen = typeof force === "boolean" ? force : !menuOpen;
    menuHost.style.display = menuOpen ? "block" : "none";
    syncThrottleGuard();
    if (menuOpen) {syncMenu();applyMenuPlacement();}
    else flushChanges();
  }

  function isInput(target) {
    const el = target instanceof Element ? target : null;
    if (!el) return false;
    return Boolean(el.closest("input,textarea,select,[contenteditable='true'],[role='textbox']"));
  }
  const saveToast=document.createElement("div");
  saveToast.id="nfsu2-modern-hud-save-toast";
  saveToast.style.cssText="position:fixed;right:20px;top:65px;z-index:2147483646;pointer-events:none;display:none;padding:8px 13px;border:1px solid #518a85;background:rgba(8,27,31,.92);border-radius:9px;color:#b8ffe7;font:700 13px system-ui,Arial,sans-serif;";
  (document.documentElement||document.body).append(saveToast);
  let saveToastTimer=null;
  function showSaveToast(message,error=false){
    saveToast.textContent=message;
    saveToast.style.color=error?"#ffb4a7":"#b8ffe7";
    saveToast.style.display="block";
    if(saveToastTimer!==null)clearTimeout(saveToastTimer);
    saveToastTimer=setTimeout(()=>{saveToast.style.display="none";saveToastTimer=null;},2600);
  }
  function saveAllCurrentSettings(){
    if(!settingsReady||!odometerReady){showSaveToast("HUD is loading — retry Save",true);return;}
    // Confirm the values *at the moment Save was pressed*. Live telemetry keeps
    // increasing the ODO during asynchronous browser.storage writes: checking
    // !odometerDirty afterwards falsely reports failure on every drive.
    const expectedSettings=getActiveSnapshot();
    const expectedCar=selectedOdometerCar;
    const expectedKm=expectedCar?odometerKm:0;
    for(const key of Object.keys(DEFAULTS))dirtyKeys.add(key);
    showSaveToast("Saving HUD + mileage…");
    void (async()=>{
      await Promise.all([flushChanges(),saveOdometer(true)]);
      // Read back from the browser rather than trusting dirty flags. Newer
      // changes after pressing Save are allowed to remain pending.
      let stored=await hudStorage.get([ACTIVE_SETTINGS_KEY,ODOMETER_PRIMARY_STORE_KEY,ODOMETER_STORE_KEY,ODOMETER_SELECTED_KEY]);
      const matches=values=>{
        const storedSettings=values?.[ACTIVE_SETTINGS_KEY]?.settings;
        const storedOdo=values?.[ODOMETER_PRIMARY_STORE_KEY] || values?.[ODOMETER_STORE_KEY];
        const settingsOk=storedSettings && Object.entries(expectedSettings).every(([key,value])=>storedSettings[key]===value);
        const odoKm=expectedCar?Number(storedOdo?.cars?.[expectedCar]):0;
        const odoOk=[2,3].includes(storedOdo?.version) && storedOdo.selectedCar===expectedCar &&
          values?.[ODOMETER_SELECTED_KEY]===expectedCar &&
          (!expectedCar || (Number.isFinite(odoKm)&&odoKm+1e-7>=expectedKm));
        return Boolean(settingsOk&&odoOk);
      };
      if(!matches(stored)){
        // A previous write or another explicit Save may have overlapped.
        // Flush once more before considering the result incomplete.
        await Promise.all([flushChanges(),saveOdometer(true)]);
        stored=await hudStorage.get([ACTIVE_SETTINGS_KEY,ODOMETER_PRIMARY_STORE_KEY,ODOMETER_STORE_KEY,ODOMETER_SELECTED_KEY]);
      }
      if(matches(stored)){
        showSaveToast("HUD settings + car mileage saved ✓");
        odometerStatus("HUD settings + all vehicle mileage saved.");
      }else{
        showSaveToast("Save incomplete — retry",true);
        console.warn("[NFSU2 HUD] Save verification mismatched stored snapshot");
      }
    })().catch(err=>{
      showSaveToast("Save failed — retry",true);
      console.warn("[NFSU2 HUD] Shortcut save failed",err);
    });
  }
  function handleShortcut(event) {
    if (menuOpen && event.key === "Escape") {
      event.preventDefault();
      event.stopImmediatePropagation();
      toggleMenu(false);
      return;
    }
    if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || isInput(event.target)) return;
    const plus = event.code === "NumpadAdd" || (event.location === 3 && event.key === "+");
    const minus = event.code === "NumpadSubtract" || (event.location === 3 && event.key === "-");
    const multiply = event.code === "NumpadMultiply" || (event.location === 3 && event.key === "*");
    if (!plus && !minus && !multiply) return;
    event.preventDefault();
    event.stopImmediatePropagation(); // Prevent competing game key commands.
    if (multiply)saveAllCurrentSettings();
    else if (plus) toggleMenu();
    else changeSetting("hudEnabled", !settings.hudEnabled);
  }
  window.addEventListener("keydown", handleShortcut, true);
  menuShadow.addEventListener("keydown", event => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); toggleMenu(false); }
    // Keys typed into menu controls are not forwarded to the game.
    else event.stopPropagation();
  }, true);
  // Menu interactions must not accidentally trigger mouse steering/boost in the game.
  for (const type of ["pointerdown", "pointerup", "click", "mousedown", "mouseup", "wheel", "touchstart", "touchend"]) {
    menuShadow.addEventListener(type, event => event.stopPropagation());
  }
  mget("close").addEventListener("click", () => toggleMenu(false));
  mget("done").addEventListener("click", () => toggleMenu(false));
  mget("reset").addEventListener("click", resetDefaults);
  mget("saveNow").addEventListener("click",saveAllCurrentSettings);
  mget("odometerCarSelect").addEventListener("change",e=>selectOdometerCar(e.target.value));
  mget("odometerSaveNow").addEventListener("click",()=>{
    void saveOdometer(true).then(()=>{
      if(!odometerDirty)odometerStatus("ODO checkpoint saved in extension storage.");
    });
  });
  mget("odometerReset").addEventListener("click",()=>{
    if(!selectedOdometerCar)return odometerStatus("Select a vehicle first.",true);
    const now=performance.now();
    if(now-odometerResetArmedAt>6000){
      odometerResetArmedAt=now;
      mget("odometerReset").textContent="Confirm reset (6 s)";
      odometerStatus("Click again within 6 seconds to reset ONLY the selected vehicle.");
      return;
    }
    odometerResetArmedAt=0;
    mget("odometerReset").textContent="Reset selected car";
    odometerKm=0;odometers[selectedOdometerCar]=0;
    odometerDirty=true;odometerRevision++;
    odometerLastSampleAt=0;odometerLastSpeedKmh=null;
    updateOdometerDisplay();
    void saveOdometer(true).then(()=>{
      if(!odometerDirty)odometerStatus("Selected vehicle reset to 0.0 km; other cars untouched.");
    });
  });
  for (const key of Object.keys(DEFAULTS)) {
    const el = mget(key);
    if (!el) continue;
    el.addEventListener(el.type === "range" || el.type === "color" ? "input" : "change", () =>
      changeSetting(key, el.type === "checkbox" ? el.checked : el.value));
  }
  // Precise X/Y input is independent of slider dragging and persists like any setting.
  for(const key of ANALOG_POSITION_KEYS){
    const number=mget(`${key}Number`);
    number.addEventListener("change",()=>{
      if(number.value.trim()!=="" && Number.isFinite(Number(number.value)))changeSetting(key,number.value);
      else syncMenu();
    });
  }
  mget("analogResetPositions").addEventListener("click",()=>{
    for(const key of ANALOG_POSITION_KEYS)changeSetting(key,DEFAULTS[key]);
    saveStatus("Original analog circle positions restored. Other settings unchanged.");
  });

  mget("turboStartRpmInput").addEventListener("change", event => {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value >= 800 && value <= 10000) changeSetting("turboStartRpm", value);
    else syncMenu();
  });

  function render(now) {
    renderQueued = false;
    if (!latest || !settings.hudEnabled || !received || latest.state?.driving === false) return;
    // Cap the extension's DOM and SVG updates independently of game frame rate.
    if (now < nextEligibleAt) return;
    const effectiveHz = settings.hudPerformanceMode === "eco" ? Math.min(settings.hudUpdateFps,15) : settings.hudUpdateFps;
    nextEligibleAt = now + (1000/effectiveHz);
    lastPaintAt = now;
    const d = latest;
    if(settings.damageEnabled)updateDamageHud(now);
    const kmh = Number.isFinite(d.speed) ? Math.abs(d.speed) * 3.6 : 0;
    updateSpeedSensation(kmh);
    const selectedSpeed = settings.speedUnit === "mph" ? kmh / 1.609344 : kmh;
    const rpm = Number.isFinite(d.rpm) ? Math.max(0, d.rpm) : 0;
    const max = Number.isFinite(d.rpmMax) && d.rpmMax > 0 ? d.rpmMax : 8000;
    const redline = Number.isFinite(d.rpmRedline) && d.rpmRedline > 0 ? d.rpmRedline : max;
    const scaleMax = Math.ceil(Math.max(max,redline) / 1000) * 1000;
    if (settings.showRpm && settings.hudMode === "full" && settings.hudStyle === "modern") updateRpmScale(scaleMax);
    const analogActive=settings.hudStyle==="analog"&&settings.hudMode==="full";
    if (analogActive) {
      if(settings.showSpeed){analogScaleForSpeed(settings.speedUnit);
        analogNeedle(analogUi.speedNeedle,selectedSpeed,settings.speedUnit==="mph"?250:400,595,164);}
      if(settings.showRpm){analogScaleForRpm(scaleMax,redline);analogNeedle(analogUi.rpmNeedle,rpm,scaleMax,304,199);}
      if(settings.showGear)setText(analogUi.gear,gearText(d.gear));
    }
    const nitro = Number.isFinite(d.nitrous) ? clamp(d.nitrous, 0, NITRO_CAPACITY) : 0;
    const gear = gearText(d.gear);
    if (settings.showSpeed) setText(ui.speed,Math.round(selectedSpeed).toLocaleString("en-US"));
    if (settings.showGear) {
      setText(ui.gear,gear);setText(ui.compactGear,gear);
    }
    if (settings.showRpm && settings.hudMode === "full") {
      setText(ui.rpm,Math.round(rpm).toLocaleString("en-US"));
      setText(ui.max,Number.isFinite(d.rpmMax) ? Math.round(d.rpmMax).toLocaleString("en-US") : "—");
      const arcPct = Math.round(clamp(rpm / scaleMax * 100, 0, 100)*2)/2;
      const redlinePct = Math.round(clamp(redline / scaleMax * 100, 0, 100)*2)/2;
      const arcDash = `${arcPct} 100`;
      if (ui.rpmFill.style.strokeDasharray !== arcDash) ui.rpmFill.style.strokeDasharray=arcDash;
      const redStart = Math.max(0, redlinePct-3);
      const redDash = `0 ${redStart} 3 ${Math.max(0,100-redStart-3)}`;
      if (ui.redline.style.strokeDasharray !== redDash) ui.redline.style.strokeDasharray=redDash;
    }
    if (settings.showTurbo && settings.hudMode === "full") {
      const load=Number.isFinite(d.engineLoad) ? clamp(d.engineLoad,0,1) : 0;
      const startAt=settings.turboStartMode === "custom" ? settings.turboStartRpm : DEFAULT_TURBO_START_RPM;
      const spool=clamp((rpm-startAt)/400,0,1);
      turboTarget=load*spool;
      updateTurbo(now);
    }
    if (settings.showShift) {
      const state=shiftGuide.update(d,now,settings);
      if (state.state!==lastShiftState) {
        ui.shiftStrip.classList.toggle("near",state.state==="near");
        ui.shiftStrip.classList.toggle("shift",state.state==="shift");
        lastShiftState=state.state;
      }
      setText(ui.shiftText,state.text);
      if(analogActive){analogUi.shift.classList.toggle("near",state.state==="near");analogUi.shift.classList.toggle("shift",state.state==="shift");}
    }
    if (settings.showNitro) {
      const pct=Math.round(nitro/NITRO_CAPACITY*100);
      setText(ui.nitroPercent,`${pct}%`);
      if (ui.nitroTrack.getAttribute("aria-valuenow") !== String(pct)) ui.nitroTrack.setAttribute("aria-valuenow",String(pct));
      const first=clamp(nitro,0,1),second=clamp(nitro-1,0,1);
      const a=`scaleX(${first.toFixed(3)})`,b=`scaleX(${second.toFixed(3)})`;
      if (ui.nitroFirst.style.transform!==a) ui.nitroFirst.style.transform=a;
      if (ui.nitroSecond.style.transform!==b) ui.nitroSecond.style.transform=b;
      if(analogActive){
        setText(analogUi.nitroText,`${pct}%`);
        analogUi.nitroA.setAttribute("width",(first*42).toFixed(1));
        analogUi.nitroB.setAttribute("width",(second*42).toFixed(1));
      }
    }
  }
  function scheduleRender() {
    if (renderQueued || !settings.hudEnabled || document.visibilityState === "hidden") return;
    renderQueued=true;
    requestAnimationFrame(render);
  }
  window.addEventListener("message", event => {
    if (event.source !== window || event.origin !== origin) return;
    const m = event.data;
    if (!m || typeof m !== "object") return;
    if (m.nfsu2 === "feed-ready") {feedReady = true; return;}
    if (m.nfsu2 !== "car" || m.car !== true || m.state?.driving === false) {
      if (m.nfsu2 === "car" && m.state?.driving === false) {
        latest = m;
        odometerLastSampleAt=0;odometerLastSpeedKmh=null;
        if(odometerDirty)void saveOdometer();
        shiftGuide.reset();
        turboTarget=0;turboDisplay=0;turboLastPct=-1;updateTurbo(performance.now());
        oldTelemetry=null;impactAlertUntil=0;engineRedSince=0;resetTyreBrakeState();clearIndicators();
        resetImpactFeedbackCounter();
        observedImpactCounter=null;observedImpact=null;
        observedLandingCounter=null;observedLanding=null;precedingCarSpeedKmh=0;precedingSpeedSampleAt=0;
        currentFrameCollision=null;currentFrameLanding=null;lastRawCollisionAt=-Infinity;
        lastHudWorldDriving=false;
        syncThrottleGuard();
        applyVisibility();
        updateSpeedSensation(0);
      }
      return;
    }
    latest = m;
    received = true;
    lastSpeedFxFeedAt = performance.now();
    const now=performance.now();
    sampleOdometer(m,now);
    observeCollision(m,now);
    processSuspensionEvents(m,now);
    if(damageIsActive(now)) syncThrottleGuard();
    processImpactFeedback(m,now); // event counter is checked for every Car Feed message
    if(settings.damageEnabled && settings.hudEnabled)processDamageCollision(m,now);
    // Process event counters on EVERY feed message, even if rendering is throttled.
    // Cap icon calculations and SVG work to lower CPU/GPU load on busy free roam scenes.
    const telemetryCadence = settings.hudPerformanceMode === "eco" ? 100 : settings.hudPerformanceMode === "smooth" ? 40 : 60;
    if (settings.hudEnabled && settings.showIcons && (settings.showTyreIcon || settings.showEngineIcon || settings.showSuspIcon) && settings.hudMode === "full" && document.visibilityState !== "hidden" && now-lastTelemetryAt >= telemetryCadence) {
      lastTelemetryAt=now;
      processTelemetry(m,now);
    }
    if(settings.damageEnabled && (!settings.showIcons || !(settings.showTyreIcon || settings.showEngineIcon || settings.showSuspIcon)))updateDamageHud(now);
    if (!lastHudWorldDriving) {lastHudWorldDriving=true;applyVisibility();}
    if (now >= nextEligibleAt) scheduleRender();
  });

  try {
    hudStorage.get(null).then(saved => {
      saved=saved && typeof saved==="object" ? saved : {};
      if (Array.isArray(saved[PROFILE_STORE_KEY])) {
        const cleaned=[];
        for (const profile of saved[PROFILE_STORE_KEY].slice(0,PROFILE_LIMIT)) {
          try {
            if (typeof profile.id!=="string" || !profile.id.startsWith("user:")) continue;
            const name=safeName(profile.name);if(!name)continue;
            cleaned.push({id:profile.id.slice(0,96),name,settings:normalizeSnapshot(profile.settings)});
          } catch(_error) { /* Ignore damaged profile, never execute imported data. */ }
        }
        customProfiles=cleaned;
        updateProfileMenu();
      }
      const storedPrimary=saved[ODOMETER_PRIMARY_STORE_KEY];
      const primaryValid=storedPrimary?.version===3 && storedPrimary.cars &&
        typeof storedPrimary.cars==="object" && !Array.isArray(storedPrimary.cars);
      // Migrate all V2 mileage into V3 without changing totals; use V3 after
      // that so an older still-open game tab cannot erase newer checkpoints.
      const storedOdo=primaryValid ? storedPrimary : saved[ODOMETER_STORE_KEY];
      odometerUsingPrimary=Boolean(primaryValid);
      if(storedOdo && [2,3].includes(storedOdo.version) && storedOdo.cars && typeof storedOdo.cars==="object" && !Array.isArray(storedOdo.cars)){
        for(const [id,km] of Object.entries(storedOdo.cars)){
          if((ODOMETER_CAR_IDS.has(id)||id===ODOMETER_LEGACY_ID)&&Number.isFinite(Number(km))&&Number(km)>=0){
            odometers[id]=clamp(Number(km),0,ODOMETER_MAX_KM);
          }
        }
        const savedCar=saved[ODOMETER_SELECTED_KEY];
        // V3 selection is authoritative. Independently stored selection helps
        // recover older V2 saves with a missing selectedCar field.
        const chosen=(primaryValid && typeof storedPrimary.selectedCar==="string")
          ? storedPrimary.selectedCar : (typeof savedCar==="string" ? savedCar : storedOdo.selectedCar);
        if(typeof chosen==="string"&&(ODOMETER_CAR_IDS.has(chosen)||(chosen===ODOMETER_LEGACY_ID&&Object.prototype.hasOwnProperty.call(odometers,chosen)))){
          selectedOdometerCar=chosen;
        } else {
          // Legacy saves occasionally lacked the selected model. Restore it
          // only if exactly ONE real model has non-zero distance.
          const nonzero=Object.entries(odometers).filter(([id,km])=>ODOMETER_CAR_IDS.has(id)&&km>0);
          if(nonzero.length===1)selectedOdometerCar=nonzero[0][0];
        }
        if(!primaryValid || saved[ODOMETER_SELECTED_KEY]!==selectedOdometerCar){
          odometerDirty=true;odometerRevision++; // durable one-time migration
        }
      } else {
        // Preserve v0.9.27's single ODO in a named legacy slot, never guess which car it belonged to.
        const old=saved[LEGACY_ODOMETER_STORE_KEY];
        if(old && typeof old==="object" && Number.isFinite(Number(old.km)) && Number(old.km)>=0){
          odometers[ODOMETER_LEGACY_ID]=clamp(Number(old.km),0,ODOMETER_MAX_KM);
          selectedOdometerCar=ODOMETER_LEGACY_ID;
          odometerDirty=true;odometerRevision++;
        }
      }
      odometerKm=selectedOdometerCar ? (odometers[selectedOdometerCar]||0) : 0;
      savedOdometers={...odometers};
      odometerSavedKm=odometerKm;
      odometerReady=true;
      odometerLastPersistAt=performance.now();
      updateOdometerDisplay();
      if(odometerDirty)void saveOdometer(true);
      const active=saved[ACTIVE_SETTINGS_KEY];
      const complete=active && active.schema===2 && active.settings && typeof active.settings==="object" && !Array.isArray(active.settings) ? active.settings : null;
      const merged = {...DEFAULTS, ...saved, ...(complete || {})};
      // The popup can be used while no game tab is open. In that case flat keys
      // are newer than the complete snapshot, so keep popup-owned options.
      for(const key of ["hudEnabled","hudMode","shiftMode","manualGreenLead"]) {
        if(Object.prototype.hasOwnProperty.call(saved,key)) merged[key]=saved[key];
      }
      // Migrate v0.7 single opacity into new independent controls on first v0.8 load.
      if (saved._v08_migrated !== true) {
        if (Number.isFinite(saved.hudOpacity) && saved.hudBackgroundOpacity === undefined) merged.hudBackgroundOpacity=saved.hudOpacity;
        if (saved.turboResponseMs === 1200) merged.turboResponseMs=300; // old default
        if (saved.turboStartMode !== "custom" && saved.turboStartRpm === 1600) merged.turboStartRpm=1000;
        void hudStorage.set({_v08_migrated:true,turboResponseMs:merged.turboResponseMs,turboStartRpm:merged.turboStartRpm})
          .catch(error => console.warn("[NFSU2 HUD] Migration save failed",error));
      }
      // v0.9.22 balance migration: upgrade only values matching v0.9.20
      // built-in defaults. Non-default repair/threshold choices are preserved.
      const upgradeKeys=[];
      if(saved._v0921_balanced!==true){
        const oldDefaults={
          damageRepairSeconds:30,damageMinImpact:3.5,
          impactFeedbackMediumDv:6,impactYellowThreshold:2.5,impactRedThreshold:5.5
        };
        for(const [key,oldValue] of Object.entries(oldDefaults)){
          if(Number(merged[key])===oldValue){merged[key]=DEFAULTS[key];upgradeKeys.push(key);}
        }
      }
      // Upgrade old defaults only. User-selected non-default values are retained.
      const migrated22Keys=[];
      if(saved._v0922_timers_collision!==true){
        const oldV21Defaults={collisionMinSpeedKmh:150,damageRepairSeconds:60,damageImpactResetSeconds:120};
        for(const [key,oldValue] of Object.entries(oldV21Defaults)){
          if(Number(merged[key])===oldValue){merged[key]=DEFAULTS[key];migrated22Keys.push(key);}
        }
      }
      for (const key of Object.keys(DEFAULTS)) {
        // A user may have changed a slider while the asynchronous initial read ran.
        if (!dirtyKeys.has(key))settings[key]=normalize(key,merged[key]);
      }
      settingsReady=true;
      if(saved._v0922_timers_collision!==true){
        migrated22Keys.forEach(key=>dirtyKeys.add(key));
        void hudStorage.set({_v0922_timers_collision:true}).catch(error=>console.warn("[NFSU2 HUD] v0.9.22 migration marker",error));
      }
      if(saved._v0921_balanced!==true){
        upgradeKeys.forEach(key=>dirtyKeys.add(key));
        void hudStorage.set({_v0921_balanced:true}).catch(error=>console.warn("[NFSU2 HUD] Balance migration marker",error));
      }
      damageTarget=newDamageTarget();
      applyMenuPlacement();
      if(dirtyKeys.size) persistSoon();
      // v0.4 used one accent; preserve it on upgrading, without touching other colors.
      if (validColor(saved.hudAccent) && !("colorGear" in saved)) {
        settings.colorGear = saved.hudAccent.toUpperCase();
        settings.colorRpmEnd = saved.hudAccent.toUpperCase();
        dirtyKeys.add("colorGear");dirtyKeys.add("colorRpmEnd");persistSoon();
      }
      applyAppearance();
      syncMenu();
      syncThrottleGuard();
      if(menuOpen)applyMenuPlacement();
    }).catch(error => {
      // No browser API failure should prevent the HUD from rendering.
      console.warn("[NFSU2 HUD] Could not load settings",error);
      settingsReady=true;
      odometerReady=true;odometerLastPersistAt=performance.now();
      applyAppearance();syncMenu();syncThrottleGuard();
      saveStatus("Storage unavailable — settings/ODO may not persist.",true);
    });
    hudStorage.onChanged((changes, area) => {
      if (area !== "local") return;
      if (changes[PROFILE_STORE_KEY] && Array.isArray(changes[PROFILE_STORE_KEY].newValue)) {
        // Profiles can be added from the popup too without reloading the game.
        customProfiles=changes[PROFILE_STORE_KEY].newValue.slice(0,PROFILE_LIMIT).flatMap(profile=>{
          try {
            const name=safeName(profile.name);
            return name && typeof profile.id==="string" && profile.id.startsWith("user:") ? [{id:profile.id,name,settings:normalizeSnapshot(profile.settings)}] : [];
          } catch(_){return [];}
        });
        updateProfileMenu();
      }
      const odometerIncomingChange=changes[ODOMETER_PRIMARY_STORE_KEY] ||
        (!odometerUsingPrimary && changes[ODOMETER_STORE_KEY]);
      if(odometerIncomingChange && !odometerDirty && !odometerSaving){
        const incoming=odometerIncomingChange.newValue;
        if([2,3].includes(incoming?.version)&&incoming.cars&&typeof incoming.cars==="object"&&!Array.isArray(incoming.cars)){
          if(incoming.version===3)odometerUsingPrimary=true;
          const next=Object.create(null);
          for(const [id,km] of Object.entries(incoming.cars)){
            if((ODOMETER_CAR_IDS.has(id)||id===ODOMETER_LEGACY_ID)&&Number.isFinite(Number(km))&&Number(km)>=0)
              next[id]=clamp(Number(km),0,ODOMETER_MAX_KM);
          }
          odometers=next;savedOdometers={...next};
          const incomingCar=incoming.selectedCar;
          selectedOdometerCar=typeof incomingCar==="string"&&(ODOMETER_CAR_IDS.has(incomingCar)||(incomingCar===ODOMETER_LEGACY_ID&&Object.prototype.hasOwnProperty.call(next,incomingCar))) ? incomingCar : "";
          odometerKm=selectedOdometerCar?(odometers[selectedOdometerCar]||0):0;
          odometerSavedKm=odometerKm;
          odometerLastSampleAt=0;odometerLastSpeedKmh=null;
          updateOdometerDisplay();
        }
      }
      for (const [key, change] of Object.entries(changes)) {
        if (!(key in DEFAULTS)) continue;
        if (dirtyKeys.has(key)) continue; // Local slider changes should win until saved.
        const nextValue=normalize(key, change.newValue);
        if(settings[key]===nextValue)continue;
        settings[key] = nextValue;
        if (key === "shiftMode") shiftGuide.reset();
        if(key==="damageEnabled"||key==="damageHitMode"||key==="damageCustomHits")resetDamage();
        if(key==="damageInputCut"&&nextValue)throttleGuard?.resetEmergency();
        if(key==="damageImpactIdleReset"||key==="damageImpactResetSeconds") {
          if(!expireIdleImpacts())scheduleImpactIdleTimer();
        }
        if(key==="showIcons"||key==="showTyreIcon"||key==="showEngineIcon"||key==="showSuspIcon")oldTelemetry=null;
        dirtyKeys.add(key);persistSoon(); // keep the complete snapshot in sync with popup changes
      }
      applyAppearance();
      syncMenu();
      syncThrottleGuard();
    });
  } catch (error) { console.warn("[NFSU2 Modern HUD] Settings unavailable", error); }
  applyAppearance();
  syncMenu();
  document.addEventListener("visibilitychange",()=>{
    syncThrottleGuard();
    updateSpeedSensation();
    if(document.visibilityState === "hidden"){
      odometerLastSampleAt=0;odometerLastSpeedKmh=null;
      void saveOdometer();
      impactFlashAnimation?.cancel();impactShakeAnimation?.cancel();resetImpactFeedbackCounter();
      precedingSpeedSampleAt=0;currentFrameCollision=null;currentFrameLanding=null;
    }
    if (document.visibilityState === "hidden" && dirtyKeys.size)void flushChanges();
    if (document.visibilityState === "visible") {
      nextEligibleAt=0;
      if (latest?.car === true) scheduleRender();
    }
  },{passive:true});

  // Input guard is inert unless the user enables the Damage System and critical damage is active.
  syncThrottleGuard();
  const requestFeed = () => window.postMessage({nfsu2:"car-on"},origin);
  requestFeed();
  const retry = setInterval(() => {
    if (feedReady) clearInterval(retry);
    else requestFeed();
  },1500);
  window.addEventListener("pagehide", () => {
    updateSpeedSensation(0);
    void flushChanges();
    void saveOdometer();
    clearInterval(retry);
    clearInterval(speedFxWatchdog);
    clearDamageTimer();clearImpactIdleTimer();
    throttleGuard?.configure({active:false});
    window.postMessage({nfsu2:"car-off"},origin);
  },{once:true});
})();
