/* NFSU2 Modern HUD v0.9.50 — Civic linear warning row + code names; adjustable blue fog; irregular engine misfire / impact idle reset simulation; official read-only Car Feed HUD.
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
  const Hotkeys = globalThis.__nfsu2HudHotkeys;
  if (!Hotkeys) return;
  const NITRO_CAPACITY = 2;
  const PROFILE_STORE_KEY = "nfsu2HudProfilesV1";
  const CAR_HUD_STYLE_STORE_KEY = "nfsu2HudCarStyleLinksV1";
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
    corolla: { name: "Toyota Corolla Retro (1986)", implemented: true },
    civic: { name: "Honda Civic Si EM1 (2000)", implemented: true },
    rx7: { name: "Mazda RX-7 FD — Rotary Analog", implemented: true },
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
    shortcutMenu: Hotkeys.DEFAULTS.shortcutMenu, shortcutToggleHud: Hotkeys.DEFAULTS.shortcutToggleHud, shortcutSaveAll: Hotkeys.DEFAULTS.shortcutSaveAll,
    hudPosition: "bottom-right", hudScale: 100, analogHudScalePct: 100, hudBackgroundOpacity: 90, hudTextOpacity: 100, hudUpdateFps: 20,
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
    analogSpeedOffsetX: 0, analogSpeedOffsetY: 0,
    // Individual analog gauge diameters. 100% matches the original geometry.
    analogTurboSizePct: 100, analogRpmSizePct: 100, analogSpeedSizePct: 100,
    // The physical dial positions are in ZERO_POSITION_BASELINE (below).
    // Resetting X/Y now always gives zero, without changing the dial geometry.
    corollaTurboOffsetX: 0, corollaTurboOffsetY: 0,
    corollaRpmOffsetX: 0, corollaRpmOffsetY: 0,
    corollaSpeedOffsetX: 0, corollaSpeedOffsetY: 0,
    corollaTurboSizePct: 100, corollaRpmSizePct: 100, corollaSpeedSizePct: 100,
    corollaHudScalePct: 85,
    // Shared Corolla shell transforms the COMPLETE assembly. Local circles
    // remain independently configurable but are limited to the integrated body.
    corollaFrameScalePct: 100, corollaFrameOffsetX: 0, corollaFrameOffsetY: 0,
    // Owner-approved 2026-11-22 Honda layout is baked into the zero baseline:
    // Turbo 13/15 size 85%; RPM 12/10 size 95%; Speed 18/22 size 95%.
    civicTurboOffsetX: 0, civicTurboOffsetY: 0,
    civicRpmOffsetX: 0, civicRpmOffsetY: 0,
    civicSpeedOffsetX: 0, civicSpeedOffsetY: 0,
    civicTurboSizePct: 85, civicRpmSizePct: 95, civicSpeedSizePct: 95,
    civicHudScalePct: 60, civicFrameScalePct: 100, civicFrameOffsetX: 0, civicFrameOffsetY: 0,
    rx7TurboOffsetX: 0, rx7TurboOffsetY: 0,
    rx7RpmOffsetX: 0, rx7RpmOffsetY: 0,
    rx7SpeedOffsetX: 0, rx7SpeedOffsetY: 0,
    rx7TurboSizePct: 100, rx7RpmSizePct: 100, rx7SpeedSizePct: 100,
    rx7NitroOffsetX: 0, rx7NitroOffsetY: 0, rx7NitroSizePct: 100,
    rx7HudScalePct: 85,
    analogOdometerEnabled: true,
    analogNeedleColor: "#F4F2EF", analogNumbersColor: "#FFA334", analogTickColor: "#F49B31",
    analogGlowPercent: 0, analogDepthEnabled: false,
    tyreSlipThreshold: 3.4, tyreSlipHoldMs: 550, absBrakeThreshold: 0.80, impactYellowThreshold: 4.5, impactRedThreshold: 9.0,
    turboStartMode: "default", turboStartRpm: 1000, turboResponseMs: 1000, turboReleaseMs: 200,
    ...DEFAULT_COLORS
  });
  const SHORTCUT_KEYS = Object.keys(Hotkeys.DEFAULTS);
  const allowedPositions = new Set(["bottom-right", "bottom-left", "top-right", "top-left"]);
  const boolKeys = ["hudEnabled", "showSpeed", "showRpm", "showGear", "showNitro", "showShift", "showIcons", "showTurbo", "showTyreIcon", "showEngineIcon", "showSuspIcon", "damageEnabled", "damageInputCut", "damageImpactIdleReset", "showTelemetryWarnings", "speedSensationEnabled", "speedSensationFogEnabled", "impactFeedbackEnabled", "impactFeedbackFlash", "impactFeedbackShake", "analogOdometerEnabled", "analogDepthEnabled"];
  const ANALOG_POSITION_KEYS = ["analogTurboOffsetX","analogTurboOffsetY","analogRpmOffsetX","analogRpmOffsetY","analogSpeedOffsetX","analogSpeedOffsetY"];
  const ANALOG_SIZE_KEYS = ["analogTurboSizePct","analogRpmSizePct","analogSpeedSizePct"];
  const COROLLA_POSITION_KEYS=ANALOG_POSITION_KEYS.map(key=>"corolla"+key.slice(6));
  const COROLLA_SIZE_KEYS=ANALOG_SIZE_KEYS.map(key=>"corolla"+key.slice(6));
  const COROLLA_FRAME_KEYS=["corollaFrameScalePct","corollaFrameOffsetX","corollaFrameOffsetY"];
  const CIVIC_POSITION_KEYS=ANALOG_POSITION_KEYS.map(key=>"civic"+key.slice(6));
  const CIVIC_SIZE_KEYS=ANALOG_SIZE_KEYS.map(key=>"civic"+key.slice(6));
  const CIVIC_FRAME_KEYS=["civicFrameScalePct","civicFrameOffsetX","civicFrameOffsetY"];
  const RX7_POSITION_KEYS=ANALOG_POSITION_KEYS.map(key=>"rx7"+key.slice(6));
  const RX7_SIZE_KEYS=ANALOG_SIZE_KEYS.map(key=>"rx7"+key.slice(6));
  // V0.9.73: all styles expose relative X/Y coordinates with a true zero
  // factory starting point. Physical origins include the owner's last Honda
  // layout and keep the existing GT-R, Corolla and RX-7 placements intact.
  const ZERO_POSITION_BASELINE=Object.freeze({
    analogTurboOffsetX:5, analogTurboOffsetY:9,
    analogRpmOffsetX:4, analogRpmOffsetY:7,
    analogSpeedOffsetX:9, analogSpeedOffsetY:-3,
    corollaTurboOffsetX:5, corollaTurboOffsetY:9,
    corollaRpmOffsetX:4, corollaRpmOffsetY:7,
    corollaSpeedOffsetX:9, corollaSpeedOffsetY:-3,
    civicTurboOffsetX:13, civicTurboOffsetY:15,
    civicRpmOffsetX:12, civicRpmOffsetY:10,
    civicSpeedOffsetX:18, civicSpeedOffsetY:22,
    rx7TurboOffsetX:55, rx7TurboOffsetY:32,
    rx7RpmOffsetX:0, rx7RpmOffsetY:0,
    rx7SpeedOffsetX:0, rx7SpeedOffsetY:0,
    rx7NitroOffsetX:0, rx7NitroOffsetY:0
  });
  const originValue=(key)=>ZERO_POSITION_BASELINE[key]??0;
  // Shift saved coordinate values without touching dimensions, mileage, Car Feed
  // or visual placement. The schema flag prevents subtracting origins twice.
  function migrateToZeroOrigin(input, legacyCivic=false){
    if(!input || typeof input!=="object" || Array.isArray(input))return {};
    const old=legacyCivic?civicRelativeFromLegacy(input):input;
    const converted={...old};
    for(const [key,origin] of Object.entries(ZERO_POSITION_BASELINE)){
      if(Object.prototype.hasOwnProperty.call(old,key) && Number.isFinite(Number(old[key])))
        converted[key]=Math.round(Number(old[key]))-origin;
    }
    return converted;
  }
  // Original v0.9.51 absolute placements from the user's exported Civic preset.
  // New X/Y sliders represent ADJUSTMENTS relative to these coordinates.
  const CIVIC_V0951_ORIGIN=Object.freeze({
    civicTurboOffsetX:16,civicTurboOffsetY:12,
    civicRpmOffsetX:-2,civicRpmOffsetY:12,
    civicSpeedOffsetX:-2,civicSpeedOffsetY:8
  });
  function civicRelativeFromLegacy(input){
    const result={...input};
    for(const [key,oldOrigin] of Object.entries(CIVIC_V0951_ORIGIN)){
      if(Object.prototype.hasOwnProperty.call(input,key) && Number.isFinite(Number(input[key])))
        result[key]=Math.round(Number(input[key]))-oldOrigin;
    }
    return result;
  }
  // The full active snapshot is upgraded atomically to schema 3 alongside any
  // user-defined profiles. This prevents subtracting old offsets twice.
  let pendingCivicProfileMigration=false;
  const COROLLA_LOCAL_LIMIT_X=65, COROLLA_LOCAL_LIMIT_Y=55;
  const FACTORY_CAR_STYLES=Object.freeze({NISSAN_SKYLINE:"analog",TOYOTA_COROLLA:"corolla",HONDA_CIVIC:"civic",MAZDA_RX7:"rx7"});
  let carHudStyleLinks=Object.create(null);
  function carHudStyleFor(carId){
    return carHudStyleLinks[carId] || FACTORY_CAR_STYLES[carId] || "modern";
  }
  function cleanCarHudStyles(raw){
    const out=Object.create(null);
    if(raw && typeof raw==="object" && !Array.isArray(raw)){
      for(const [id,style] of Object.entries(raw)){
        if(ODOMETER_CAR_IDS.has(id) && HUD_STYLES[style]?.implemented) out[id]=style;
      }
    }
    return out;
  }
  function saveCarHudStyles(){
    return hudStorage.set({[CAR_HUD_STYLE_STORE_KEY]:{version:1,styles:{...carHudStyleLinks}}});
  }
  // Controls keep their existing IDs; settings are stored per analog skin.
  // No interaction with the game's read-only Car Feed or game save.
  const scopedGaugeKey=key=>{
    // Modern, GT-R, Corolla and Civic now each store a separate exact zoom.
    if(key==="hudScale")return settings.hudStyle==="modern"?"hudScale":settings.hudStyle+"HudScalePct";
    return ["corolla","civic","rx7"].includes(settings.hudStyle) &&
      (ANALOG_POSITION_KEYS.includes(key)||ANALOG_SIZE_KEYS.includes(key))
       ? settings.hudStyle+key.slice(6) : key;
  };
  const gaugeValue=key=>settings[scopedGaugeKey(key)];
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
  let shortcutCaptureAction = null;
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
    if (SHORTCUT_KEYS.includes(key)) return Hotkeys.canonical(val) || Hotkeys.DEFAULTS[key];
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
    // Corolla's individual gauges stay in the connected chassis; use the
    // separate Frame X/Y controls to move the entire panel across the screen.
    if(COROLLA_POSITION_KEYS.includes(key)||CIVIC_POSITION_KEYS.includes(key)){
      const n=Number(val),isY=key.endsWith("OffsetY");
      const limit=isY?COROLLA_LOCAL_LIMIT_Y:COROLLA_LOCAL_LIMIT_X;
      return Number.isFinite(n)?clamp(Math.round(n),-limit,limit):DEFAULTS[key];
    }
    if(ANALOG_POSITION_KEYS.includes(key)||RX7_POSITION_KEYS.includes(key)||key==='rx7NitroOffsetX'||key==='rx7NitroOffsetY') return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)), -20000, 20000) : DEFAULTS[key];
    if (key==="corollaFrameScalePct"||key==="civicFrameScalePct") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/5)*5,50,175):DEFAULTS[key];
    if (key==="corollaFrameOffsetX" || key==="corollaFrameOffsetY" || key==="civicFrameOffsetX" || key==="civicFrameOffsetY") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)),-2000,2000):DEFAULTS[key];
    if (ANALOG_SIZE_KEYS.includes(key)||COROLLA_SIZE_KEYS.includes(key)||CIVIC_SIZE_KEYS.includes(key)||RX7_SIZE_KEYS.includes(key)||key==='rx7NitroSizePct') return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)/5)*5, 50, 160) : DEFAULTS[key];
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
    if (key === "turboResponseMs") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val) / 100) * 100, 200, 2200) : DEFAULTS[key];
    if (key === "turboReleaseMs") return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val) / 50) * 50, 100, 1500) : DEFAULTS[key];
    if (key === "shiftMode") return val === "manual" ? "manual" : "auto";
    if (key === "manualGreenLead") return [0, 100, 250].includes(Number(val)) ? Number(val) : 100;
    if (key === "hudPosition") return allowedPositions.has(val) ? val : DEFAULTS[key];
    if (["hudScale","analogHudScalePct","corollaHudScalePct","civicHudScalePct","rx7HudScalePct"].includes(key)) return Number.isFinite(Number(val)) ? clamp(Math.round(Number(val)),10,500) : DEFAULTS[key];
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

  // v0.9.46: Firefox can refuse inline <style> in an extension-created Shadow DOM
  // under the game's Content Security Policy. Convert these extension-owned rules
  // to constructed stylesheets. Keep the source CSS local; no injected page scripts.
  function ensureShadowStyles(root) {
    const styles = [...root.querySelectorAll("style")];
    if (typeof CSSStyleSheet === "function" && styles.length) {
      try {
        const sheets = styles.map(node => {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(node.textContent || "");
          if (!sheet.cssRules.length) throw new Error("Shadow stylesheet parsed empty");
          return sheet;
        });
        root.adoptedStyleSheets = [...root.adoptedStyleSheets, ...sheets];
        styles.forEach(node => node.remove());
      } catch (err) {
        console.warn("[NFSU2 HUD] Constructed CSS fallback unavailable", err);
        // Retain original styles for browsers that allow them.
      }
    }
    // style= markup is also blocked by strict CSP in Firefox. Restore the
    // extension's own inline declarations with setProperty (not cssText), which
    // remains permitted for DOM API styles under CSP.
    for (const element of root.querySelectorAll("[style]")) {
      const literal = element.getAttribute("style") || "";
      for (const declaration of literal.split(";")) {
        const index = declaration.indexOf(":");
        if (index < 1) continue;
        const key = declaration.slice(0, index).trim();
        let value = declaration.slice(index + 1).trim();
        if (!key || !value) continue;
        const important = /\s*!important\s*$/i.test(value);
        if (important) value = value.replace(/\s*!important\s*$/i, "").trim();
        try { element.style.setProperty(key, value, important ? "important" : ""); } catch (_) {}
      }
    }
  }
  function setHudHostStyle(element, declarations) {
    for (const [name, value] of Object.entries(declarations)) {
      element.style.setProperty(name, String(value));
    }
  }

  // Separate, noninteractive telemetry root: the HUD cannot intercept steering/mouse.
  const host = document.createElement("div");
  host.id = "nfsu2-modern-hud-root";
  setHudHostStyle(host, {"position":"fixed","z-index":"2147483645","pointer-events":"none","display":"none"});
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
      .hud[data-style="analog"]:not(.compact),.hud[data-style="corolla"]:not(.compact){width:735px;height:345px;}
      .hud[data-style="analog"]:not(.compact)>:not(.analog-panel),.hud[data-style="corolla"]:not(.compact)>:not(.analog-panel){display:none!important;}
      .hud[data-style="analog"]:not(.compact) .analog-panel,.hud[data-style="corolla"]:not(.compact) .analog-panel{display:block;}
      .analog-panel svg{width:100%;height:100%;display:block;overflow:visible;}
      .analog-backing{opacity:var(--analog-bg-opacity,.90);}
      .analog-foreground{opacity:1;}
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
      /* Turbo redline is deliberately shorter and closer to the 3.0 end tick. */
      #analog-turbo-redzone{stroke-width:4.6;}
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
      /* Corolla 1986 inspired instruments: ivory MPH outside, amber 0-400 KM/H
         inside, scarlet redline; no photographs or game assets embedded. */
      .hud[data-style="corolla"] .analog-panel{font-family:Arial,'Segoe UI',sans-serif;}
      .hud[data-style="corolla"] .analog-dial-shell{fill:url(#corolla-face);stroke:#36373a;stroke-width:5.5;}
      .hud[data-style="corolla"] .analog-rim-shadow{stroke:#111316;stroke-width:10;}
      .hud[data-style="corolla"] .analog-trim{stroke:#bcb9b1;stroke-width:2.15;}
      .hud[data-style="corolla"] .analog-inner-ring{stroke:#777878;opacity:.40;}
      .hud[data-style="corolla"] .analog-tick{stroke:#e7e8e5;opacity:.92;stroke-width:1.6;}
      .hud[data-style="corolla"] .analog-tick.major{stroke:#fffaf1;stroke-width:3.0;}
      .hud[data-style="corolla"] .analog-number{fill:#fffaf1;stroke:#fffaf1;font-family:Arial,sans-serif;font-weight:700;}
      .hud[data-style="corolla"] #analog-turbo-ticks .analog-number{font-size:10px;}
      .hud[data-style="corolla"] #analog-speed-ticks .analog-number{font-size:14px;}
      .hud[data-style="corolla"] .corolla-kmh-number{font:700 10.5px Arial,sans-serif;fill:#ffb63b;text-anchor:middle;dominant-baseline:middle;}
      .hud[data-style="corolla"] .corolla-inner-tick{stroke:#fba52c;stroke-width:1.15;opacity:.90;}
      .hud[data-style="corolla"] .analog-redzone{stroke:#dc3540;stroke-width:5.5;}
      .hud[data-style="corolla"] #analog-turbo-redzone{stroke-width:4.3;}
      .hud[data-style="corolla"] .analog-needle{stroke:#fffdf5;stroke-width:3.1;}
      .hud[data-style="corolla"] .analog-hub{fill:#16181a;stroke:#a4a6aa;}
      .hud[data-style="corolla"] .analog-label{fill:#e5e6e3;letter-spacing:1.2px;}
      .hud[data-style="corolla"] .analog-sub,.hud[data-style="corolla"] .analog-speed-unit{fill:#f2b044;}
      .hud[data-style="corolla"] .analog-odo-shell{fill:#131517;stroke:#6c7074;}
      .hud[data-style="corolla"] .analog-odo-border{fill:#1c2024;stroke:#7a7d82;}
      .hud[data-style="corolla"] .analog-odo-screen{fill:#dedbd1;stroke:#747574;}
      .hud[data-style="corolla"] .analog-odo-digits{fill:#191b20;}
      .hud[data-style="corolla"] .analog-charge-a{fill:#ffc24a;}
      .hud[data-style="corolla"] .analog-charge-b{fill:#d75d37;}
      .hud[data-style="corolla"] .analog-status-item .status-icon{stroke:#edede8;}
      .hud[data-style="corolla"] .analog-status-item text{fill:#f2eddf;}

      /* Corolla AE86 retro instrument assembly (1986-inspired): unified charcoal
         metal backing, vertical grain, ivory markings, amber secondary dial.
         These SVG/CSS assets are self-contained, not screenshots of game UI. */
      .hud[data-style="corolla"]:not(.compact){width:820px;height:385px;}
      .hud[data-style="corolla"] .analog-panel{width:820px;height:385px;}
      /* A single moving/scaling group preserves the instrument-to-shell layout.
         The SVG clip keeps all foreground instruments inside the bezel. */
      .hud[data-style="corolla"] .analog-foreground{clip-path:url(#corolla-body-clip);}
      .hud[data-style="corolla"] .corolla-integrated-back{display:inline;}
      .corolla-integrated-back{display:none;}
      .hud[data-style="corolla"] .analog-dial-shell{
        fill:url(#corolla-face);stroke:#222124;stroke-width:3.5;
      }
      .hud[data-style="corolla"] .analog-rim-shadow{stroke:#09090b;stroke-width:6;}
      .hud[data-style="corolla"] .analog-trim{stroke:#b9a68f;stroke-width:1.6;opacity:.78;}
      .hud[data-style="corolla"] .analog-inner-ring{stroke:#69615a;stroke-width:.8;opacity:.48;}
      .hud[data-style="corolla"] .corolla-dial-grain{display:inline;opacity:.36;}
      .corolla-dial-grain{display:none;pointer-events:none;}
      .hud[data-style="corolla"] .analog-tick{stroke:#ddd9cf;opacity:.86;stroke-width:1.45;}
      .hud[data-style="corolla"] .analog-tick.major{stroke:#fffaf0;stroke-width:3.1;opacity:1;}
      .hud[data-style="corolla"] .analog-number{font-weight:600;fill:#eee9df;stroke:none;paint-order:normal;}
      .hud[data-style="corolla"] #analog-rpm-ticks .analog-number{font-size:15px;}
      .hud[data-style="corolla"] #analog-speed-ticks .analog-number{font-size:14.2px;}
      .hud[data-style="corolla"] #analog-turbo-ticks .analog-number{font-size:10px;}
      .hud[data-style="corolla"] .corolla-inner-tick{stroke:#efac3a;stroke-width:1.4;opacity:.91;}
      .hud[data-style="corolla"] .corolla-kmh-number{font:700 10.7px Arial,sans-serif;fill:#f5a92d;}
      .hud[data-style="corolla"] .analog-redzone{stroke:#e04a43;stroke-width:5.6;}
      .hud[data-style="corolla"] #analog-rpm-redzone{stroke-width:6.5;}
      .hud[data-style="corolla"] .analog-needle{stroke:#f4f0e8;stroke-width:2.8;}
      .hud[data-style="corolla"] .analog-needle-core{stroke:#45454a;opacity:.38;stroke-width:4.4;}
      .hud[data-style="corolla"] .analog-hub{fill:#171719;stroke:#555157;stroke-width:1.6;}
      .hud[data-style="corolla"] .analog-hub-inner{fill:#29272a;}
      .hud[data-style="corolla"] .analog-label{font-size:11px;fill:#f5f1e5;}
      .hud[data-style="corolla"] .analog-sub{font-size:9.5px;fill:#eee1c9;}
      .hud[data-style="corolla"] #analog-shift text{fill:#eee2d1;font-size:9px;}
      .hud[data-style="corolla"] #analog-gear text{letter-spacing:.35px;}
      .hud[data-style="corolla"] .corolla-amber-label{font-weight:700;}
      .hud[data-style="corolla"] #analog-nitro{display:none!important;}
      .hud[data-style="corolla"] #analog-status{display:none!important;}
      .hud[data-style="corolla"] .analog-speed-unit{fill:#eee9df;font-size:11.5px;}
      .hud[data-style="corolla"] .analog-odo-shell{fill:#111011;stroke:#927b63;stroke-width:1.15;}
      .hud[data-style="corolla"] .analog-odo-border{fill:#222024;stroke:#847d74;}
      .hud[data-style="corolla"] .analog-odo-screen{fill:#19181c;stroke:#443d36;}
      .hud[data-style="corolla"] .analog-odo-label{fill:#f8cb83;}
      .hud[data-style="corolla"] .analog-odo-digits{fill:#faf3e9;font-family:Consolas,monospace;letter-spacing:1.15px;}
      .hud[data-style="corolla"] .analog-shift-rect{fill:#8b806e;stroke:#ccbda9;}
      .hud[data-style="corolla"] .analog-charge-a,.hud[data-style="corolla"] .analog-charge-b{fill:#ffbc45;}
      .hud[data-style="corolla"] .corolla-ribbon-label{fill:#f7e7d2;font:italic 800 17px Arial,sans-serif;letter-spacing:.7px;}
      .hud[data-style="corolla"] .corolla-status-title{font:700 11px Arial,sans-serif;fill:#ece6da;letter-spacing:.45px;}
      .hud[data-style="corolla"] .corolla-status-title{font:700 10px Arial,sans-serif;fill:#e4dfd5;letter-spacing:.12px;}
      .hud[data-style="corolla"] .corolla-status-row .status-icon{fill:none;stroke:#b5b1a8;stroke-width:2.8;stroke-linecap:round;stroke-linejoin:round;vector-effect:non-scaling-stroke;}
      .hud[data-style="corolla"] .corolla-lamp{fill:#69666b;stroke:#aaa19a;stroke-width:.8;opacity:.94;}
      .hud[data-style="corolla"] .corolla-status-row.warning-yellow .corolla-lamp{fill:#ffd25f;stroke:#ffe89a;filter:drop-shadow(0 0 3px #edac39);}
      .hud[data-style="corolla"] .corolla-status-row.warning-red .corolla-lamp,
      .hud[data-style="corolla"] .corolla-status-row.damage-critical .corolla-lamp{fill:#ff6258;stroke:#ff9891;filter:drop-shadow(0 0 3px #f35b4b);}
      .hud[data-style="corolla"] .corolla-status-row.warning-yellow .status-icon{stroke:#ffdd75;}
      .hud[data-style="corolla"] .corolla-status-row.warning-red .status-icon,
      .hud[data-style="corolla"] .corolla-status-row.damage-critical .status-icon{stroke:#ff8177;}
      .hud[data-style="corolla"] #corolla-turbo-unit{display:none!important;}
      .hud[data-style="corolla"] .analog-odo-digits{font-size:11.6px;letter-spacing:.6px;}
      .hud[data-style="corolla"] .analog-odo-label{font-size:8px;}
      .hud[data-style="corolla"] .corolla-only.corolla-speed-caption{display:none!important;}
      .hud[data-style="corolla"] .corolla-bridge-caption{font:700 9px Arial,sans-serif;letter-spacing:.65px;fill:#d5c7b3;}
      .hud[data-style="corolla"] #corolla-turbo-unit{display:inline;}
      #corolla-turbo-unit{display:none;}
      .hud[data-style="corolla"] #analog-gear text{fill:#f1e6d3!important;}
      /* Corolla and GT-R now SHARE the mechanical gear roller. Both the current
         and next digit must be visible inside its clipped 24px window. */
      .hud[data-style="corolla"] #analog-gear-roller .analog-small-value{fill:#fff3d9!important;}
      .hud[data-style="corolla"] #analog-speed-unit{fill:#fff0d5;}
      .hud[data-style="corolla"] .corolla-amber-label{fill:#f3a632;font:700 11px Arial,sans-serif;}
      .corolla-only{display:none;}
      .hud[data-style="corolla"] .corolla-only{display:inline;}

/* Mazda RX-7 FD — original four-gauge dark analog cluster. No image asset,
   all shapes are local SVG and scale crisply. Styling only affects this skin. */
.rx7-panel{display:none;position:absolute;inset:0;width:1000px;height:470px;pointer-events:none;font-family:Arial,'Segoe UI',sans-serif}
.hud[data-style="rx7"]:not(.compact){width:1000px;height:470px}
.hud[data-style="rx7"]:not(.compact)>:not(.rx7-panel){display:none!important}
.hud[data-style="rx7"]:not(.compact) .rx7-panel{display:block}
.rx7-panel svg{width:100%;height:100%;overflow:visible;display:block}
.rx7-chassis{opacity:var(--analog-bg-opacity,.90)}
.rx7-rim-shadow{fill:#030306;stroke:#050507;stroke-width:9}
.rx7-outer-rim{fill:url(#rx7-rim-metal);stroke:#0d0e10;stroke-width:4}
.rx7-inner-rim{fill:url(#rx7-dial-bg);stroke:#090b0e;stroke-width:7}
.rx7-inner-glass{fill:url(#rx7-glass);pointer-events:none;opacity:.42}
.rx7-tick{stroke:#ff855d;stroke-width:1.75;stroke-linecap:round}
.rx7-tick.major{stroke:#ff9f6d;stroke-width:4}
.rx7-number{fill:#ff9870;font:800 18px Arial,sans-serif;text-anchor:middle;dominant-baseline:middle;paint-order:stroke;stroke:#220b0c;stroke-width:.7}
.rx7-number.small{font-size:11px;font-weight:700;stroke-width:.2}
.rx7-label{fill:#f3ebe6;font:bold 15px Arial,sans-serif;text-anchor:middle;letter-spacing:1px}
.rx7-sub{fill:#e3b69b;font:700 11px Arial,sans-serif;text-anchor:middle}
.rx7-redzone{stroke:#ee294a;stroke-width:8;fill:none;stroke-linecap:round}
.rx7-needle{fill:url(#rx7-needle-color);stroke:#3c050d;stroke-width:1;filter:drop-shadow(1px 1.5px 1.5px #040405)}
.rx7-hub{fill:#16151a;stroke:#6b5157;stroke-width:3}
.rx7-gear-digit{fill:#ff9870;font:800 24px Consolas,'Courier New',monospace;text-anchor:middle;dominant-baseline:middle}
.rx7-odo-digit{fill:#ff9d74;font:800 12px Consolas,'Courier New',monospace;text-anchor:middle;letter-spacing:1.1px}
.rx7-shift-dot{fill:#3d2429;stroke:#9d6660;stroke-width:1.2}
#rx7-shift.near .rx7-shift-dot{fill:#ffa348;filter:drop-shadow(0 0 3px #e57b27)}
#rx7-shift.shift .rx7-shift-dot{fill:#ef3c56;filter:drop-shadow(0 0 4px #ff2e48)}
.rx7-warn-label{fill:#ece7e2;font:700 13px Arial,sans-serif;letter-spacing:.8px}
.rx7-warn-lamp{fill:#26262b;stroke:#8e7e7d;stroke-width:1.2}
#rx7-tyre.warning-yellow .rx7-warn-lamp,#rx7-engine.warning-yellow .rx7-warn-lamp,#rx7-susp.warning-yellow .rx7-warn-lamp{fill:#ffcb4a;filter:drop-shadow(0 0 3px #ffbf34)}
#rx7-tyre.warning-red .rx7-warn-lamp,#rx7-engine.warning-red .rx7-warn-lamp,#rx7-susp.warning-red .rx7-warn-lamp{fill:#ff445d;filter:drop-shadow(0 0 4px #ff2d4d)}


/* Honda Civic Si (2000 EM1) three-gauge factory-style cluster. */
.civic-panel{display:none;position:absolute;left:0;top:0;width:940px;height:430px;pointer-events:none;}
.hud[data-style="civic"]:not(.compact){width:940px;height:430px;}
.hud[data-style="civic"]:not(.compact)>:not(.civic-panel){display:none!important;}
.hud[data-style="civic"]:not(.compact) .civic-panel{display:block;}
#civic-panel svg{display:block;width:100%;height:100%;overflow:visible;}
.civic-face-label{font:italic bold 17px Arial,sans-serif;fill:#383536;text-anchor:middle;}
.civic-small-label{font:italic bold 10.5px Arial,sans-serif;fill:#655950;text-anchor:middle;letter-spacing:1px;}
.civic-tick{stroke:#393334;stroke-width:1.25;stroke-linecap:round;}
.civic-tick.major{stroke:#171516;stroke-width:2.5;}
.civic-tick.red{stroke:#e3483d;stroke-width:3.6;}
.civic-num{font:italic 800 17px Arial,sans-serif;fill:#242124;text-anchor:middle;dominant-baseline:middle;}
.civic-kmh-num{font:italic 800 17px Arial,sans-serif;fill:#aa8d0d;text-anchor:middle;dominant-baseline:middle;stroke:#faf7e8;stroke-width:.55px;paint-order:stroke fill;}
.civic-mph-num{font:italic 700 10.3px Arial,sans-serif;fill:#413d3d;text-anchor:middle;dominant-baseline:middle;}
.civic-mph-label{font:italic bold 15px Arial,sans-serif;fill:#262427;text-anchor:middle;}
.civic-kmh-label{font:italic bold 16px Arial,sans-serif;fill:#393333;text-anchor:middle;}
.civic-aux-label{font:italic bold 14px Arial,sans-serif;fill:#36312f;text-anchor:middle;}
.civic-aux-sub{font:italic bold 11px Arial,sans-serif;fill:#81701c;text-anchor:middle;}
.civic-hub{fill:#353238;stroke:#99918d;stroke-width:2.2;}
.civic-gear-label{font:italic bold 10.5px Arial,sans-serif;fill:#59483c;text-anchor:middle;letter-spacing:.6px;}
.civic-gear-wheel-num{font:700 14px 'Consolas','Courier New',monospace;fill:#f5eae0;text-anchor:middle;dominant-baseline:middle;}
.civic-si-logo{font:italic 900 27px Arial,sans-serif;fill:#e9434d;text-anchor:middle;letter-spacing:-2px;}
/* CIV_VTEC: one fixed-size, factory-style badge on the carbon shoulder.
   OFF / ON are color and text/icon changes ONLY, never a geometry resize. */
.civic-vtec-pill{fill:#24282c;stroke:#697177;stroke-width:1.15;transition:fill .12s ease,stroke .12s ease;}
.civic-vtec-text{fill:#92999e;font:700 16px Arial,'Segoe UI',sans-serif;text-anchor:middle;letter-spacing:.7px;transition:fill .12s ease;}
.civic-vtec-bolt{fill:none;stroke:#ffaf54;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round;display:none;}
#civic-vtec.is-on .civic-vtec-pill{fill:#521c12;stroke:#ef5c2c;}
#civic-vtec.is-on .civic-vtec-text{fill:#ffad77;}
#civic-vtec.is-on .civic-vtec-bolt{display:inline;}
.civic-warning .civic-warning-icon{fill:none;stroke:#ddd8d1;stroke-width:3.4;stroke-linecap:round;stroke-linejoin:round;}
.civic-warning text{font:700 12.5px Arial,sans-serif;fill:#e7e2dc;}
.civic-warning-lamp{fill:#555257;stroke:#9d9490;stroke-width:.9;}
.civic-warning.warning-yellow .civic-warning-lamp{fill:#ffc94f;stroke:#ffdf88;animation:civic-warning-pulse .85s ease-in-out infinite;filter:drop-shadow(0 0 4px #ffc04c);}
.civic-warning.warning-red .civic-warning-lamp,.civic-warning.damage-critical .civic-warning-lamp{fill:#ff5f57;stroke:#ffb1a6;animation:civic-warning-pulse .68s ease-in-out infinite;filter:drop-shadow(0 0 4px #ff4b44);}
@keyframes civic-warning-pulse{50%{opacity:.35}}
.hud.perf-eco .civic-warning-lamp{animation:none!important;}
@media(prefers-reduced-motion:reduce){.civic-warning-lamp{animation:none!important;}}
.civic-odo-wheel-num{font:700 13.3px 'Consolas','Courier New',monospace;fill:#f5eae0;text-anchor:middle;dominant-baseline:middle;}
/* Only the square lamp flashes, never the static Corolla legend/icon. */
.hud[data-style="corolla"] .corolla-status-row,
.hud[data-style="corolla"] .corolla-status-row.warning-yellow,
.hud[data-style="corolla"] .corolla-status-row.warning-red,
.hud[data-style="corolla"] .corolla-status-row.damage-critical{animation:none!important;opacity:1!important;}
.hud[data-style="corolla"] .corolla-status-row.warning-yellow .status-icon,
.hud[data-style="corolla"] .corolla-status-row.warning-red .status-icon,
.hud[data-style="corolla"] .corolla-status-row.damage-critical .status-icon{stroke:#b5b1a8!important;fill:none!important;}
.hud[data-style="corolla"] .corolla-status-row.warning-yellow .corolla-status-title,
.hud[data-style="corolla"] .corolla-status-row.warning-red .corolla-status-title,
.hud[data-style="corolla"] .corolla-status-row.damage-critical .corolla-status-title{fill:#e4dfd5!important;}
.hud[data-style="corolla"] .corolla-status-row.warning-yellow .corolla-lamp{animation:civic-warning-pulse .85s ease-in-out infinite;}
.hud[data-style="corolla"] .corolla-status-row.warning-red .corolla-lamp,
.hud[data-style="corolla"] .corolla-status-row.damage-critical .corolla-lamp{animation:civic-warning-pulse .68s ease-in-out infinite;}
.hud.perf-eco .corolla-lamp{animation:none!important;}
@media(prefers-reduced-motion:reduce){.corolla-lamp{animation:none!important;}}

.civic-shift-led{fill:#37363a;stroke:#827b7b;stroke-width:2;}
#civic-shift-lights.near .civic-shift-led{fill:#f7b449;filter:drop-shadow(0 0 3px #d89026)}
#civic-shift-lights.shift .civic-shift-led{fill:#6bd998;filter:drop-shadow(0 0 4px #62f7a2)}

      .analog-hide{display:none!important;}
      .hud.perf-eco .analog-status-item{animation:none!important;}
      @media(prefers-reduced-motion:reduce){.analog-status-item{animation:none!important;}}
    
/* RX-7 FD v2 — real CSS/HTML-based gauge design adapted from user's demo.
   All RX7V2 names are isolated from Modern HUD CSS; static carbon and rims
   use no imported fonts, remote assets or per-frame layout work. */
.rx7v2-panel{position:absolute!important;inset:0!important;width:1000px!important;height:470px!important;display:none;pointer-events:none;font-family:'Rajdhani','Arial Narrow','Segoe UI',Arial,sans-serif}
.hud[data-style="rx7"]:not(.compact) .rx7v2-panel{display:block}
.rx7v2-frame{position:absolute;inset:0;overflow:visible;isolation:isolate}
.rx7v2-frame-svg{position:absolute;inset:0;width:1000px!important;height:470px!important;opacity:var(--analog-bg-opacity,.9);z-index:0;filter:drop-shadow(0 9px 9px rgba(0,0,0,.68))}
.rx7v2-gauge{position:absolute;box-sizing:border-box;border-radius:50%;background:radial-gradient(circle at 30% 25%,rgba(255,255,255,.08) 0%,transparent 55%),radial-gradient(circle,#141619 55%,#0a0b0d 100%);border:5px solid #2a2d32;box-shadow:0 8px 20px rgba(0,0,0,.7),inset 0 0 18px rgba(0,0,0,.95),0 0 0 1.5px rgba(255,123,41,.45);transform-origin:center center;z-index:3;color:#f3f4f6;overflow:visible}
.rx7v2-small{width:155px;height:155px}
.rx7v2-large{width:310px;height:310px}
.rx7v2-medium{width:280px;height:280px}
#rx7-turbo-group{left:76px;top:58px}
#rx7-nitro-group{left:76px;top:238px}
#rx7-rpm-group{left:300px;top:64px}
#rx7-speed-group{left:645px;top:82px}
.rx7v2-ticks,.rx7v2-labels{position:absolute;inset:0;pointer-events:none}
.rx7v2-tick{position:absolute;top:50%;left:50%;width:2px;height:8px;border-radius:1px;background:rgba(255,255,255,.45);transform-origin:center center;margin-left:-1px;margin-top:-4px}
.rx7v2-tick.major{width:3px;height:13px;margin-left:-1.5px;margin-top:-6.5px;background:#ff7b29;box-shadow:0 0 5px rgba(255,123,41,.75)}
.rx7v2-tick.redzone{background:#ff2a2a;box-shadow:0 0 7px #ff2a2a}
.rx7v2-dial-number{position:absolute;color:#f3f4f6;font-weight:700;line-height:1;white-space:nowrap;transform:translate(-50%,-50%);text-align:center;text-shadow:0 0 5px rgba(255,123,41,.3)}
.rx7v2-title{position:absolute;left:0;right:0;text-align:center;letter-spacing:1.05px;font-weight:700;color:#f3f4f6;text-shadow:0 0 6px rgba(255,123,41,.3);z-index:2}
.rx7v2-title small{display:block;font-size:10px;letter-spacing:.55px;color:#9ca3af;margin-top:3px}
.rx7v2-small .rx7v2-title{top:47px;font-size:12px}
.rx7v2-large .rx7v2-title{top:97px;font-size:20px}
.rx7v2-large .rx7v2-title small{font-size:12px}
.rx7v2-medium .rx7v2-title{top:87px;font-size:19px}
.rx7v2-needle{position:absolute;bottom:50%;left:50%;width:4px;height:var(--rx7-needle-len);border-radius:4px 4px 0 0;transform:translateX(-50%) rotate(-135deg);transform-origin:50% 100%;background:linear-gradient(180deg,#ff5e3a 0%,#e11d1d 100%);box-shadow:0 0 9px rgba(255,42,42,.78);z-index:4;will-change:transform}
.rx7v2-cap{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:24px;height:24px;border-radius:50%;background:radial-gradient(circle at 35% 35%,#6b7280,#1f2937 70%,#090a0c);border:2px solid #111317;box-shadow:0 3px 8px rgba(0,0,0,.8);z-index:5}
.rx7v2-small .rx7v2-cap{width:16px;height:16px}
.rx7v2-glass{position:absolute;inset:0;border-radius:50%;background:linear-gradient(135deg,rgba(255,255,255,.07),transparent 44%);pointer-events:none;z-index:6}
.rx7v2-gear-box{position:absolute;left:50%;bottom:23px;transform:translateX(-50%);display:flex;align-items:center;flex-direction:column;gap:3px;z-index:7}
.rx7v2-gear-box .rx7v2-caption,.rx7v2-odo-box .rx7v2-caption{font-size:10px;color:#aeb4ba;letter-spacing:1.15px;line-height:13px;font-weight:700}
.rx7v2-gear-window{width:45px;height:34px;background:#0b0c0e;border:1.5px solid rgba(255,123,41,.65);border-radius:5px;overflow:hidden;box-shadow:inset 0 0 8px rgba(255,123,41,.25)}
.rx7v2-gear-roll{display:flex;flex-direction:column;will-change:transform}
.rx7v2-gear-digit{display:flex;align-items:center;justify-content:center;width:42px;height:32px;font-family:Consolas,'Courier New',monospace;font-size:22px;font-weight:900;color:#ff8f44;text-shadow:0 0 8px rgba(255,123,41,.68)}
.rx7v2-odo-box{position:absolute;left:50%;bottom:31px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:4px;z-index:7}
.rx7v2-odo-screen{min-width:132px;height:25px;display:flex;justify-content:center;align-items:center;padding:2px 7px;border:1.5px solid rgba(255,123,41,.55);border-radius:4px;background:#090a0c;color:#ffb074;font-family:Consolas,'Courier New',monospace;font-size:12px;font-weight:700;letter-spacing:1.05px;white-space:nowrap;text-shadow:0 0 7px rgba(255,123,41,.55)}
/* RX7_SHIFT3: three compact horizontal LED segments on the left carbon shoulder. */
/* RX7_SHIFT3: moved right and clear of the orange trim and RPM bezel at owner preset sizes. */
.rx7v2-shift{position:absolute;left:332px;top:55px;display:flex;gap:7px;align-items:center;z-index:4;pointer-events:none}
.rx7v2-shift-dot{box-sizing:border-box;height:7px;width:16px;background:#27292d;border:1px solid #78645e;border-radius:3px;box-shadow:inset 0 1px 2px #070708;transition:background .1s linear,box-shadow .1s linear}
.rx7v2-shift.near .rx7v2-shift-dot{background:#ffac47;box-shadow:0 0 5px #e68d2b}
.rx7v2-shift.shift .rx7v2-shift-dot{background:#58e79b;border-color:#9affc5;box-shadow:0 0 7px #42ed8c}
/* RX7_WARN: larger icon/lamp pairs, arranged as a spacious staggered arrow
   in the free carbon shelf so they never enter the speed dial. */
.rx7v2-warnings{position:absolute;left:560px;top:49px;display:flex;flex-direction:column;gap:8px;align-items:flex-start;z-index:4;pointer-events:none}
.rx7v2-warning{box-sizing:border-box;width:62px;height:34px;display:flex;align-items:center;justify-content:flex-start;gap:8px;flex:0 0 62px}
.rx7v2-warning svg{width:32px;height:32px;fill:none;stroke:#dedee0;stroke-width:3;stroke-linecap:round;stroke-linejoin:round;flex:0 0 32px}
.rx7v2-warning-lamp{box-sizing:border-box;width:15px;height:15px;border-radius:3px;background:#33343a;border:1px solid #858389;flex:0 0 15px}
#rx7-tyre{margin-left:0}
#rx7-engine{margin-left:18px}
#rx7-susp{margin-left:36px}
.rx7v2-warning.warning-yellow .rx7v2-warning-lamp{background:#ffd058;box-shadow:0 0 6px #e7a82a}
.rx7v2-warning.warning-red .rx7v2-warning-lamp,.rx7v2-warning.damage-critical .rx7v2-warning-lamp{background:#ff5567;box-shadow:0 0 6px #ff3b4e}
.rx7v2-badge{position:absolute;left:474px;bottom:56px;transform:translateX(-50%);font:700 14px Arial,sans-serif;letter-spacing:4px;color:#f3ebe6;text-shadow:0 0 7px rgba(255,123,41,.7);z-index:2}

/* HONDA SI v2 — RX-7 v2 carbon assembly geometry, ivory factory instruments.
   This replaces the visual old Civic shell without erasing its settings or
   removing its telemetry/ODO implementation. RX-7's CSS remains unchanged. */
.hud[data-style="civic"]:not(.compact){width:1000px;height:470px}
.hud[data-style="civic"]:not(.compact)>#civic-panel{display:none!important}
.hud[data-style="civic"]:not(.compact)>#civ2-panel{display:block!important}
#civ2-panel{display:none;position:absolute!important;inset:0!important;width:1000px!important;height:470px!important;overflow:visible;pointer-events:none;font-family:Arial,'Segoe UI',sans-serif}
#civ2-panel svg{display:block;overflow:visible}
#civ2-panel .rx7v2-frame-svg{width:1000px!important;height:470px!important;opacity:var(--analog-bg-opacity,.9);filter:drop-shadow(0 8px 8px rgba(0,0,0,.5))}
#civ2-panel .rx7v2-gauge{background:radial-gradient(circle at 41% 32%,#fffefa 0%,#f9f5ee 64%,#e4ded5 100%);border:5px solid #32353b;box-shadow:0 6px 16px rgba(0,0,0,.63),inset 0 0 13px rgba(90,82,76,.17),0 0 0 1.35px rgba(193,201,205,.73);color:#24252a}
#civ2-panel .rx7v2-tick{background:#45454b}
#civ2-panel .rx7v2-tick.major{background:#24252c;box-shadow:none}
#civ2-panel .rx7v2-tick.redzone{background:#d43b36;box-shadow:none}
#civ2-panel .rx7v2-dial-number{color:#22242a;text-shadow:none}
#civ2-panel .rx7v2-title{color:#202329;text-shadow:none}
#civ2-panel .rx7v2-title small{color:#545963}
#civ2-panel .rx7v2-needle{background:linear-gradient(180deg,#fb7a58,#db2e2c);box-shadow:0 0 5px rgba(205,57,40,.34)}
#civ2-panel .rx7v2-cap{background:radial-gradient(circle at 38% 30%,#787982,#25252e 75%,#11131a);border-color:#50515c}
#civ2-panel .rx7v2-glass{background:linear-gradient(135deg,rgba(255,255,255,.2),transparent 42%)}
#civ2-panel .rx7v2-gear-box .rx7v2-caption,#civ2-panel .rx7v2-odo-box .rx7v2-caption{color:#4f555d}
#civ2-panel .rx7v2-gear-window,#civ2-panel .rx7v2-odo-screen{border-color:#929393;box-shadow:inset 0 0 6px rgba(248,248,255,.12)}
#civ2-panel .rx7v2-gear-digit,#civ2-panel .rx7v2-odo-screen{color:#f9f2e5;text-shadow:none}
#civ2-panel .rx7v2-badge{display:none}
#civ2-panel .rx7v2-shift{left:456px;top:260px;gap:6px;z-index:8}
#civ2-panel .rx7v2-shift-dot{width:18px;height:9px;border-radius:3px;border-color:#85858b;background:#45464a}
#civ2-panel .rx7v2-shift.near .rx7v2-shift-dot{background:#f5a044;border-color:#e2a65e}
#civ2-panel .rx7v2-shift.shift .rx7v2-shift-dot{background:#4fdf95;border-color:#a5fbc6}
/* Warn icons live entirely on the upper-right carbon shelf, ending ABOVE the
   rim of the speed dial. None of the three warning pairs intersects the dials. */
#civ2-panel .rx7v2-warnings{left:633px;top:54px;width:226px;height:78px;display:block;z-index:6}
/* Honda: SUSP at the blue-marked inter-dial bridge; remain clear of BOTH circular rims. */
#civ2-panel #civ2-tyre{left:0;top:0}
#civ2-panel #civ2-engine{left:142px;top:0}
#civ2-panel #civ2-susp{left:-18px;top:64px}
#civ2-panel .rx7v2-warning{position:absolute;width:55px;height:28px;display:flex;gap:7px;flex:0 0 55px;justify-content:flex-start;align-items:center;transform:none!important;margin:0!important}
#civ2-panel .rx7v2-warning svg{display:block;width:30px;height:30px;flex:0 0 30px;stroke:#e3e5e7;stroke-width:3.4;fill:none}
#civ2-panel .rx7v2-warning-lamp{width:12px;height:13px;flex:0 0 12px;border-radius:2.5px;background:#4b4a50;border:1px solid #929399}
/* Single AUX instrument (two needles, identical to original Civic concept). */
#civ2-aux-group{left:46px;top:153px;width:232px;height:232px}
#civ2-rpm-group{left:302px;top:64px}
#civ2-speed-group{left:645px;top:82px}
#civ2-panel #civ2-aux-group .civ2-aux-svg{display:block;width:100%;height:100%;position:absolute;inset:0;overflow:visible}
.civ2-aux-title{font:700 12.5px Arial,sans-serif;fill:#25252a;text-anchor:middle}
.civ2-aux-sub{font:700 9.5px Arial,sans-serif;fill:#53565e;text-anchor:middle}
.civ2-aux-tick{stroke:#3a3b40;stroke-width:1.9;stroke-linecap:round}
.civ2-aux-tick.major{stroke-width:3}
.civ2-aux-num{font:700 10px Arial,sans-serif;fill:#36373c;text-anchor:middle;dominant-baseline:central}
.civ2-aux-needle{fill:#e14335;stroke:#ab3e36;stroke-width:.6}
.civ2-aux-hub{fill:#33323a;stroke:#9a979b;stroke-width:2}
.civ2-aux-si{font:italic 900 18px Arial,sans-serif;fill:#d83936;text-anchor:middle}
/* VTEC: position follows the marked lower carbon shelf above Honda Nitro/Turbo; keep identical ON/OFF shape. */
#civ2-vtec{position:absolute;left:170px;top:118px;z-index:7;width:89px;height:31px;border:1.5px solid #777a82;border-radius:17px;background:#292c31;color:#949aa0;display:flex;gap:4px;align-items:center;justify-content:center;font:700 13px Arial,sans-serif;letter-spacing:.7px;box-shadow:inset 0 1px 2px rgba(255,255,255,.13)}
#civ2-vtec svg{display:none;width:15px;height:18px;stroke:#ffae69;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
#civ2-vtec.is-on{border-color:#f16535;background:#4c2017;color:#ffb17c;box-shadow:0 0 8px rgba(243,104,42,.4)}
#civ2-vtec.is-on svg{display:block}

/* Real mechanical per-digit ODO rollers: old digit leaves UP, new one arrives FROM BELOW. */
#civ2-panel .rx7v2-odo-screen{letter-spacing:0;gap:0}
.odo-html-slot{display:inline-block;position:relative;vertical-align:middle;width:8.2px;height:16px;line-height:16px;flex:none;overflow:hidden;text-align:center}
.odo-html-slot.odo-dot{overflow:visible}
.odo-html-track{display:block;will-change:transform;line-height:16px}
.odo-html-track>span{display:block;width:100%;height:16px;line-height:16px}
.odo-html-track.rolling{animation:odo-html-roll-up 480ms cubic-bezier(.18,.67,.25,1) both}
@keyframes odo-html-roll-up{from{transform:translateY(0)}to{transform:translateY(-16px)}}
.hud[data-style="corolla"] #analog-odo-digits{display:none}
.corolla-odo-svg-num{font:700 11.6px Consolas,'Courier New',monospace;fill:#faf3e9;text-anchor:middle;letter-spacing:0;}
.corolla-odo-svg-track.rolling{animation:odo-svg-roll-up 480ms cubic-bezier(.18,.67,.25,1) both}
@keyframes odo-svg-roll-up{from{transform:translateY(0)}to{transform:translateY(-18px)}}

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
      <div class="engine-load" id="turbo-section" title="Simulated Turbo PSI visual (0–3.0). Derived from engine load and RPM, not measured boost pressure.">
        <div class="load-title"><span>TURBO · PSI</span><b id="turbo-pct">0.0</b></div>
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

      <div id="analog-panel" class="analog-panel" aria-label="GT-R Analog HUD — simulated Turbo PSI, RPM and Speed">
        <svg id="analog-svg" viewBox="0 0 735 345" aria-hidden="true">
          <defs>
            <pattern id="corolla-stripes" x="0" y="0" width="5" height="5" patternUnits="userSpaceOnUse">
              <rect width="5" height="5" fill="#0c0c0e"/>
              <path d="M.5 0V5" stroke="#a09a85" stroke-opacity=".12" stroke-width=".7"/>
              <path d="M3.3 0V5" stroke="#fff5df" stroke-opacity=".038" stroke-width=".6"/>
            </pattern>
            <linearGradient id="corolla-metal" x1="0" y1="0" x2=".85" y2="1">
              <stop offset="0" stop-color="#3e3837"/><stop offset=".15" stop-color="#1a181a"/>
              <stop offset=".62" stop-color="#151518"/><stop offset="1" stop-color="#07080b"/>
            </linearGradient>
            <linearGradient id="corolla-nitro-frame" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stop-color="#4b433a"/><stop offset="1" stop-color="#0a0a0b"/>
            </linearGradient>
            <radialGradient id="corolla-face" cx="40%" cy="30%" r="85%">
              <stop offset="0" stop-color="#222427"/><stop offset=".73" stop-color="#111215"/><stop offset="1" stop-color="#060709"/>
            </radialGradient>
            <radialGradient id="analog-face" cx="43%" cy="37%" r="72%">
              <stop offset="0" stop-color="#191617"/><stop offset=".73" stop-color="#0b0a0d"/><stop offset="1" stop-color="#070607"/>
            </radialGradient>
            <linearGradient id="analog-rim" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="#5a311c"/><stop offset=".23" stop-color="#ffe0af"/>
              <stop offset=".43" stop-color="#ec8e33"/><stop offset=".73" stop-color="#4c2b1f"/>
              <stop offset="1" stop-color="#ffa94f"/>
            </linearGradient>
            <clipPath id="corolla-body-clip" clipPathUnits="userSpaceOnUse"><path id="corolla-body-clip-path"/></clipPath>
            <clipPath id="corolla-gear-roll-clip" clipPathUnits="userSpaceOnUse"><rect x="576" y="211" width="38" height="24" rx="1"/></clipPath>
          </defs>
          <g id="corolla-assembly">
          <g class="analog-backing">
            <g class="corolla-integrated-back" aria-hidden="true">
              <!-- Entire vintage housing follows the dial X/Y and the three
                   independent circle sizes. Nitro and warning lamps remain
                   inside the silhouette; the frame itself is not a dial. -->
              <path id="corolla-frame-shadow" fill="none" stroke="#090809" stroke-width="10"/>
              <path id="corolla-frame-base" fill="url(#corolla-metal)" stroke="#a99178" stroke-width="1.7"/>
              <path id="corolla-frame-grain" fill="url(#corolla-stripes)" opacity=".38"/>
              <path id="corolla-frame-highlight" fill="none" stroke="#ceaf87" stroke-opacity=".26" stroke-width=".9"/>
            </g>
            <g id="analog-turbo-back" transform="translate(15 0)">
              <circle class="analog-rim-shadow" cx="89" cy="236" r="78"/>
              <circle class="analog-dial-shell" cx="89" cy="236" r="74"/>
              <circle class="corolla-dial-grain" cx="89" cy="236" r="70" fill="url(#corolla-stripes)"/>
              <circle class="analog-trim" cx="89" cy="236" r="76"/>
              <circle class="analog-inner-ring" cx="89" cy="236" r="68"/>
            </g>
            <g id="analog-rpm-back">
            <circle class="analog-rim-shadow" cx="304" cy="199" r="116"/>
            <circle class="analog-dial-shell" cx="304" cy="199" r="113"/>
            <circle class="corolla-dial-grain" cx="304" cy="199" r="109" fill="url(#corolla-stripes)"/>
            <circle class="analog-trim" cx="304" cy="199" r="116"/>
            <circle class="analog-inner-ring" cx="304" cy="199" r="108"/>
            </g>
            <g id="analog-speed-back" transform="translate(-33 0)">
              <circle class="analog-rim-shadow" cx="595" cy="164" r="147"/>
              <circle class="analog-dial-shell" cx="595" cy="164" r="144"/>
              <circle class="corolla-dial-grain" cx="595" cy="164" r="141" fill="url(#corolla-stripes)"/>
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
              <text class="analog-sub" x="89" y="286">PSI</text>
              <text id="corolla-turbo-unit" x="89" y="299" class="analog-sub" style="font-size:8px;fill:#c5b49b">simulated · not measured</text>
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
              <g id="corolla-speed-kmh" class="corolla-only" aria-label="Inner amber 0 to 400 km/h scale"></g>
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
              <g id="analog-speed-digits"><text class="analog-speed-unit" x="595" y="195" id="analog-speed-unit">KM/H</text>
                <text class="corolla-only corolla-amber-label" x="595" y="178" text-anchor="middle" style="font-size:9px">km/h</text></g>
              <g id="analog-gear"><text class="analog-label" x="595" y="209" style="font-size:10px;fill:#f3a64c">GEAR</text>
                <g id="analog-gear-roller" aria-label="Rolling gear number">
                  <g clip-path="url(#corolla-gear-roll-clip)">
                    <g id="analog-gear-roll">
                      <text class="analog-small-value" x="595" y="230" style="font-size:21px" id="analog-gear-value">1</text>
                      <text class="analog-small-value" x="595" y="252" style="font-size:21px" id="analog-gear-next">2</text>
                    </g>
                  </g>
                </g></g>
              <g id="analog-odometer" aria-label="Distance driven, measured by this extension">
                <rect class="analog-odo-shell" x="531" y="239" width="128" height="35" rx="9"/>
                <rect class="analog-odo-border" x="534" y="242" width="122" height="29" rx="6"/>
                <rect class="analog-odo-screen" x="538" y="246" width="114" height="21" rx="3"/>
                <text class="analog-odo-label" x="540" y="260">ODO</text>
                <text class="analog-odo-digits" x="650" y="261" id="analog-odo-digits">--------.-</text>
              </g>
              <text class="corolla-only corolla-speed-caption" x="595" y="301" text-anchor="middle">TOYOTA COROLLA · 1986</text>
            </g>
            <!-- Corolla warning stack: compact, precisely in the RPM/speed inter-dial bridge.
                 One neutral lamp per function; amber/red only on genuine warnings. -->
            <g id="corolla-status-panel" class="corolla-only" aria-label="Corolla status lamps">
              <rect x="404" y="105" width="94" height="166" rx="8" fill="#111215" stroke="#8c7968" stroke-width="1.2"/>
              <rect x="406" y="107" width="90" height="162" rx="7" fill="url(#corolla-stripes)" opacity=".66"/>
              <path d="M410 111H491" stroke="#9e8c75" stroke-width="1" opacity=".6"/>
              <g class="corolla-status-row" id="corolla-tyre">
                <g class="status-icon" transform="translate(416 134) scale(.34) translate(-24 -24)">${warningSymbols.tyre}</g>
                <text id="corolla-tyre-label" class="corolla-status-title" x="428" y="137">TYRES</text>
                <rect class="corolla-lamp" x="475" y="126" width="14" height="12" rx="2"/>
              </g>
              <path d="M410 153H492" stroke="#5c514a" stroke-width=".75" opacity=".72"/>
              <g class="corolla-status-row" id="corolla-engine">
                <g class="status-icon" transform="translate(416 183) scale(.34) translate(-24 -24)">${warningSymbols.engine}</g>
                <text id="corolla-engine-label" class="corolla-status-title" x="428" y="186">ENGINE</text>
                <rect class="corolla-lamp" x="475" y="175" width="14" height="12" rx="2"/>
              </g>
              <path d="M410 204H492" stroke="#5c514a" stroke-width=".75" opacity=".72"/>
              <g class="corolla-status-row" id="corolla-susp">
                <g class="status-icon" transform="translate(416 234) scale(.34) translate(-24 -24)">${warningSymbols.susp}</g>
                <text id="corolla-susp-label" class="corolla-status-title" x="428" y="237">SUSP</text>
                <rect class="corolla-lamp" x="475" y="226" width="14" height="12" rx="2"/>
              </g>
            </g>
            <text x="449" y="292" class="corolla-only corolla-bridge-caption" text-anchor="middle">COROLLA ’86</text>
            <!-- Nitro sits on the lower shell shelf, finishing before the speed dial. -->
            <g id="corolla-nitro" class="corolla-only" aria-label="Nitrous charge">
              <rect x="231" y="310" width="249" height="32" rx="8" fill="url(#corolla-nitro-frame)" stroke="#9d8169" stroke-width="1.3"/>
              <rect x="235" y="314" width="241" height="24" rx="5" fill="none" stroke="#211f22" stroke-width=".8"/>
              <text class="corolla-ribbon-label" x="243" y="332" style="font-size:14px">NITRO</text>
              <rect x="311" y="316" width="147" height="20" rx="3" fill="#08090a" stroke="#bba98d" stroke-width="1"/>
              <rect x="314" y="319" width="141" height="14" rx="1.5" fill="#3f3e3d"/>
              <rect x="314" y="319" width="0" height="14" rx="1.5" id="corolla-nitro-fill" fill="#ffbd4b"/>
              <g stroke="#211c19" stroke-width="1.8" opacity=".92">
                <path d="M328 319V333 M342 319V333 M356 319V333 M370 319V333 M384 319V333 M398 319V333 M412 319V333 M426 319V333 M440 319V333"/>
              </g>
              <text x="465" y="331" fill="#e5d9c5" font-size="12" text-anchor="middle">N</text>
            </g>
          </g>
          </g><!-- /corolla-assembly: shell, dials, lamps, odometer and nitro transform together -->
        </svg>
      </div>
<div id="civic-panel" class="civic-panel" aria-label="Honda Civic Si EM1 instrument cluster">
 <svg id="civic-svg" viewBox="0 0 940 430" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
 <defs>
  <!-- CIV_BG v2: high-definition, lightweight vector carbon weave and brushed bezel. -->
  <linearGradient id="civic-shell-grad" x1="0" y1="0" x2=".1" y2="1"><stop stop-color="#34363a"/><stop offset=".16" stop-color="#202124"/><stop offset=".48" stop-color="#121317"/><stop offset=".85" stop-color="#191a1c"/><stop offset="1" stop-color="#333439"/></linearGradient>
  <linearGradient id="civic-carbon-gloss" x1="0" y1="0" x2=".33" y2="1"><stop stop-color="#a1a2a5" stop-opacity=".13"/><stop offset=".27" stop-color="#191b1c" stop-opacity=".03"/><stop offset=".60" stop-color="#08090a" stop-opacity=".04"/><stop offset="1" stop-color="#ced0d2" stop-opacity=".15"/></linearGradient>
  <linearGradient id="civic-bezel-outer" x1="0" y1="0" x2=".13" y2="1"><stop stop-color="#b3b6b9"/><stop offset=".13" stop-color="#66696c"/><stop offset=".33" stop-color="#222328"/><stop offset=".73" stop-color="#17191c"/><stop offset=".94" stop-color="#84878a"/><stop offset="1" stop-color="#b1b3b6"/></linearGradient>
  <pattern id="civic-carbon-weave" width="8" height="8" patternUnits="userSpaceOnUse">
   <rect width="8" height="8" fill="#1e2023"/>
   <path d="M-2 2L2 -2 M0 8L8 0 M6 10L10 6" stroke="#474b4e" stroke-width="1.6" stroke-opacity=".48"/>
   <path d="M-2 6L6 -2 M2 10L10 2" stroke="#272b2f" stroke-width="1.35" stroke-opacity=".8"/>
   <path d="M-2 0L6 8 M2 -2L10 6" stroke="#383b3d" stroke-width="1.2" stroke-opacity=".62"/>
   <path d="M0 2L2 0 M4 6L6 4" stroke="#8f9294" stroke-width=".55" stroke-opacity=".2"/>
  </pattern>
  <radialGradient id="civic-face-grad"><stop stop-color="#fff9eb"/><stop offset=".72" stop-color="#f2e9d9"/><stop offset="1" stop-color="#bfb5a5"/></radialGradient>
  <linearGradient id="civic-rim-grad" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#08080a"/><stop offset=".28" stop-color="#727071"/><stop offset=".53" stop-color="#181719"/><stop offset=".79" stop-color="#aba7a0"/><stop offset="1" stop-color="#141315"/></linearGradient>
  <linearGradient id="civic-needle-grad" x1="0" x2="1"><stop stop-color="#ff4f2c"/><stop offset=".5" stop-color="#ff7151"/><stop offset="1" stop-color="#ac1713"/></linearGradient>
  <linearGradient id="civic-odo-window-grad" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#060606"/><stop offset=".47" stop-color="#222023"/><stop offset="1" stop-color="#080708"/></linearGradient>
  <pattern id="civic-grain" width="4" height="4" patternUnits="userSpaceOnUse"><circle cx="1" cy="1.3" r=".42" fill="#827e78" opacity=".29"/></pattern>
  <!-- v0.9.47: calculated at runtime from actual RPM, Speed and Nitro/Turbo dial sizes/positions. -->
  <path id="civic-body-shape" d="M24 220 Q28 91 176 78 Q310 70 334 93 Q480 -7 640 85 Q779 44 910 125 Q933 199 926 317 Q901 411 771 406 L164 407 Q25 404 24 292 Z"/>
  <clipPath id="civic-body-clip"><use href="#civic-body-shape"/></clipPath>
  <clipPath id="civic-odo-window-clip"><rect x="426" y="300" width="112" height="22" rx="2.5"/></clipPath>
  <clipPath id="civic-gear-roll-clip"><rect x="466" y="276" width="32" height="17" rx="2.5"/></clipPath>
 </defs>
 <g id="civic-assembly">
  <!-- All three chassis layers share the Background Opacity control.
       Gauge faces, icons, needles, ODO and shift LEDs stay fully legible. -->
  <g id="civic-chassis" opacity=".90">
   <!-- One adaptive shell. All the following layers fade together with Background Opacity. -->
   <use href="#civic-body-shape" fill="none" stroke="#050507" stroke-width="15" stroke-opacity=".48"/>
   <use href="#civic-body-shape" fill="url(#civic-shell-grad)" stroke="#07080b" stroke-width="8"/>
   <use href="#civic-body-shape" fill="url(#civic-carbon-weave)" opacity=".90"/>
   <use href="#civic-body-shape" fill="url(#civic-carbon-gloss)"/>
   <!-- Subtle inset rings only: the carbon weave now stays visible BETWEEN every dial. -->
   <g id="civic-instrument-shadows" clip-path="url(#civic-body-clip)" fill="none" stroke="#050608" stroke-width="5.2" stroke-opacity=".55">
     <circle id="civic-shadow-aux" cx="763" cy="238" r="149"/>
     <circle id="civic-shadow-rpm" cx="178" cy="228" r="155"/>
     <circle id="civic-shadow-speed" cx="482" cy="205" r="189"/>
   </g>
   <!-- Outer polished trim, a dark inner pinstripe, and soft lower highlight. -->
   <use href="#civic-body-shape" fill="none" stroke="url(#civic-bezel-outer)" stroke-width="3.4"/>
   <use href="#civic-body-shape" fill="none" stroke="#0b0e11" stroke-width="1" transform="translate(0 1)"/>
   <use href="#civic-body-shape" fill="none" stroke="#c3c5c8" stroke-opacity=".40" stroke-width=".85" transform="translate(0 -1.2)"/>
  </g>
  <g clip-path="url(#civic-body-clip)" id="civic-dials-clipped">
   <g id="civic-aux-gauge">
    <circle cx="763" cy="238" r="144" fill="#08080a" stroke="url(#civic-rim-grad)" stroke-width="8"/><circle cx="763" cy="238" r="139" fill="none" stroke="#9d9fa0" stroke-width="1.15" opacity=".74"/>
    <circle cx="763" cy="238" r="131" fill="url(#civic-face-grad)" stroke="#181518" stroke-width="3"/>
    <circle cx="763" cy="238" r="130" fill="url(#civic-grain)" opacity=".45"/>
    <text x="705" y="177" class="civic-aux-label">NITRO</text><text x="824" y="177" class="civic-aux-label">TURBO</text>
    <text x="702" y="196" class="civic-aux-sub">F / E</text><text x="822" y="196" class="civic-aux-sub">PSI*</text>
    <g id="civic-nitro-ticks"></g><g id="civic-turbo-ticks"></g>
    <g id="civic-nitro-needle"><path d="M706 249 L704 244 L706 203 L708 244 Z" fill="url(#civic-needle-grad)"/><circle cx="706" cy="245" r="10" class="civic-hub"/></g>
    <g id="civic-turbo-needle"><path d="M817 249 L815 244 L817 204 L819 244 Z" fill="url(#civic-needle-grad)"/><circle cx="817" cy="245" r="10" class="civic-hub"/></g>
    <text id="civic-si-badge" x="763" y="320" class="civic-si-logo">Si</text>
   </g>
   <g id="civic-rpm-gauge">
    <circle cx="178" cy="228" r="150" fill="#0a090a" stroke="url(#civic-rim-grad)" stroke-width="9"/><circle cx="178" cy="228" r="144" fill="none" stroke="#9d9fa0" stroke-width="1.15" opacity=".74"/>
    <circle cx="178" cy="228" r="137" fill="url(#civic-face-grad)" stroke="#151313" stroke-width="3"/>
    <circle cx="178" cy="228" r="135" fill="url(#civic-grain)" opacity=".47"/>
    <g id="civic-rpm-ticks"></g><path id="civic-rpm-redzone" stroke="#d93b32" stroke-width="7" fill="none"/>
    <text x="178" y="185" class="civic-face-label">×1000 r/min</text>
    <g id="civic-rpm-needle"><path d="M178 239 L173 231 L178 114 L183 231 Z" fill="url(#civic-needle-grad)" stroke="#c82d22" stroke-width="1"/><circle cx="178" cy="228" r="14" class="civic-hub"/></g>
    <text x="178" y="333" class="civic-small-label">VTEC · RPM</text>
   </g>
   <g id="civic-speed-gauge">
    <circle cx="482" cy="205" r="184" fill="#070708" stroke="url(#civic-rim-grad)" stroke-width="9"/><circle cx="482" cy="205" r="178" fill="none" stroke="#a8abad" stroke-width="1.2" opacity=".8"/>
    <circle cx="482" cy="205" r="170" fill="url(#civic-face-grad)" stroke="#151313" stroke-width="3"/>
    <circle cx="482" cy="205" r="168" fill="url(#civic-grain)" opacity=".45"/>
    <g id="civic-kmh-ticks"></g><g id="civic-mph-ticks"></g>
    <text x="482" y="165" class="civic-mph-label">mph</text>
    <g id="civic-speed-needle"><path d="M482 221 L477 211 L482 76 L487 211 Z" fill="url(#civic-needle-grad)" stroke="#be2c22" stroke-width="1"/><circle cx="482" cy="205" r="17" class="civic-hub"/></g>
    <text x="482" y="254" class="civic-kmh-label">km/h</text>
    <g id="civic-odometer" aria-label="Smooth rolling seven digit and tenths odometer">
      <rect x="409" y="296" width="146" height="32" rx="4.5" fill="#141113" stroke="#524843" stroke-width="2"/>
      <rect x="425" y="299" width="114" height="24" rx="2.5" fill="url(#civic-odo-window-grad)" stroke="#8a7870" stroke-width="1"/>
      <g id="civic-odo-digits" clip-path="url(#civic-odo-window-clip)"></g>
      <text x="482" y="343" class="civic-small-label">ODO · KM</text>
    </g>
    <g id="civic-gear" aria-label="Selected gear — rolling mechanical window">
      <text x="482" y="269" class="civic-gear-label">GEAR</text>
      <rect x="460" y="273" width="44" height="23" rx="3.5" fill="#141113" stroke="#524843" stroke-width="1.5"/>
      <rect x="465" y="275" width="34" height="19" rx="2" fill="url(#civic-odo-window-grad)" stroke="#8a7870" stroke-width=".8"/>
      <g clip-path="url(#civic-gear-roll-clip)">
        <g id="civic-gear-roll"><text x="482" y="284.5" class="civic-gear-wheel-num" id="civic-gear-value">N</text><text x="482" y="302.5" class="civic-gear-wheel-num" id="civic-gear-next">1</text></g>
      </g>
    </g>
   </g>

  </g>
  <!-- CIV_VTEC sits on the upper-left carbon bridge between RPM and Speed.
       It is simulated from Car Feed RPM; shape and dimensions NEVER change. -->
  <g id="civic-vtec" aria-label="VTEC simulation: off" transform="translate(271 79)">
    <rect class="civic-vtec-pill" x="0" y="0" width="88" height="35" rx="17.5"/>
    <path class="civic-vtec-bolt" d="M24 8 L17 19 H23 L19 28 L30 16 H24 Z"/>
    <text id="civic-vtec-text" class="civic-vtec-text" x="44" y="23">VTEC</text>
  </g>
  <!-- Three small Shift Guide dots stay INSIDE the adaptive Civic housing,
       just above the RPM dial; coordinates update with RPM size / X / Y. -->
  <g id="civic-shift-lights" aria-label="Shift guide status lights">
    <circle class="civic-shift-led" r="5.5"/><circle class="civic-shift-led" r="5.5"/><circle class="civic-shift-led" r="5.5"/>
  </g>
  <!-- The warning icons and square lamps live directly on the main housing.
       Their coordinates follow the right instrument and its adaptive shoulder. -->
  <g id="civic-warning-panel" aria-label="TYRES ENGINE SUSP integrated into the main Civic body; only squares illuminate">
   <g class="civic-warning" id="civic-tyre" transform="translate(650 88)"><g class="civic-warning-icon" transform="translate(0 0) scale(.70)">${warningSymbols.tyre}</g><rect class="civic-warning-lamp" x="38" y="11" width="12" height="14" rx="2.5"/></g>
   <g class="civic-warning" id="civic-engine" transform="translate(870 88)"><g class="civic-warning-icon" transform="translate(0 0) scale(.70)">${warningSymbols.engine}</g><rect class="civic-warning-lamp" x="38" y="11" width="12" height="14" rx="2.5"/></g>
   <g class="civic-warning" id="civic-susp" transform="translate(760 88)"><g class="civic-warning-icon" transform="translate(0 0) scale(.70)">${warningSymbols.susp}</g><rect class="civic-warning-lamp" x="32" y="11" width="12" height="14" rx="2.5"/></g>
  </g>
 </g>
 </svg>
</div>


      <div id="rx7-panel" class="rx7-panel rx7v2-panel" aria-label="Mazda RX-7 FD carbon analog gauges">
        <div id="rx7-frame" class="rx7v2-frame">
          <svg class="rx7v2-frame-svg" viewBox="0 0 1000 470" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <defs>
              <pattern id="rx7v2-carbon" patternUnits="userSpaceOnUse" width="8" height="8"><rect width="8" height="8" fill="#17191c"/><circle cx="1" cy="1" r="1.3" fill="#050607" opacity=".65"/><circle cx="5" cy="5" r="1.3" fill="#060708" opacity=".7"/><circle cx="2" cy="5" r=".6" fill="#585a5e" opacity=".55"/><circle cx="6" cy="1" r=".6" fill="#585a5e" opacity=".55"/></pattern>
              <linearGradient id="rx7v2-chassis-brush" x1="0" y1="0" x2="0.7" y2="1"><stop stop-color="#5c5d63" stop-opacity=".28"/><stop offset=".23" stop-color="#111216" stop-opacity=".1"/><stop offset=".76" stop-color="#07080a" stop-opacity=".2"/><stop offset="1" stop-color="#8b7478" stop-opacity=".24"/></linearGradient>
            </defs>
            <path d="M61 137 C69 89 91 71 153 68 L253 67 C328 62 335 32 408 23 Q476 5 537 27 C581 46 599 43 646 31 Q716 13 820 32 L880 46 C937 59 971 96 980 169 L980 337 C974 398 944 421 893 424 L737 424 C677 438 632 431 587 418 L393 416 C328 413 278 434 223 438 L140 434 C77 429 45 401 42 348 Z" fill="#040506" stroke="#050506" stroke-width="12"/>
            <path d="M61 137 C69 89 91 71 153 68 L253 67 C328 62 335 32 408 23 Q476 5 537 27 C581 46 599 43 646 31 Q716 13 820 32 L880 46 C937 59 971 96 980 169 L980 337 C974 398 944 421 893 424 L737 424 C677 438 632 431 587 418 L393 416 C328 413 278 434 223 438 L140 434 C77 429 45 401 42 348 Z" fill="url(#rx7v2-carbon)" stroke="#37383e" stroke-width="4"/>
            <path d="M61 137 C69 89 91 71 153 68 L253 67 C328 62 335 32 408 23 Q476 5 537 27 C581 46 599 43 646 31 Q716 13 820 32 L880 46 C937 59 971 96 980 169 L980 337 C974 398 944 421 893 424 L737 424 C677 438 632 431 587 418 L393 416 C328 413 278 434 223 438 L140 434 C77 429 45 401 42 348 Z" fill="url(#rx7v2-chassis-brush)" stroke="#e78146" stroke-opacity=".48" stroke-width="1.8"/>
            <path d="M92 134 Q105 91 168 88 L276 84 M352 45 Q460 10 555 49 M688 54 Q829 29 915 89" fill="none" stroke="#ff7b29" stroke-opacity=".44" stroke-width="2"/>
            <path d="M131 422 Q257 432 370 405 M585 406 Q699 427 834 413" fill="none" stroke="#ff6c2a" stroke-opacity=".35" stroke-width="2"/>
          </svg>
          <div id="rx7-shift" class="rx7v2-shift" aria-label="Shift guide"><span class="rx7v2-shift-dot"></span><span class="rx7v2-shift-dot"></span><span class="rx7v2-shift-dot"></span></div>
          <div id="rx7-warnings" class="rx7v2-warnings" aria-label="Telemetry warnings">
            <div id="rx7-tyre" class="rx7v2-warning" role="img" aria-label="Tyres warning"><svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.tyre}</svg><span class="rx7v2-warning-lamp" aria-hidden="true"></span></div>
            <div id="rx7-engine" class="rx7v2-warning" role="img" aria-label="Engine warning"><svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.engine}</svg><span class="rx7v2-warning-lamp" aria-hidden="true"></span></div>
            <div id="rx7-susp" class="rx7v2-warning" role="img" aria-label="Suspension warning"><svg viewBox="0 0 48 48" aria-hidden="true">${warningSymbols.susp}</svg><span class="rx7v2-warning-lamp" aria-hidden="true"></span></div>
          </div>
          <div class="rx7v2-gauge rx7v2-small" id="rx7-turbo-group" style="--rx7-needle-len:54px">
            <div class="rx7v2-ticks" id="rx7-turbo-ticks"></div><div class="rx7v2-labels" id="rx7-turbo-labels"></div>
            <div class="rx7v2-title">TURBO<small>PSI</small></div>
            <div class="rx7v2-needle" id="rx7-turbo-needle"></div><div class="rx7v2-cap"></div><div class="rx7v2-glass"></div>
          </div>
          <div class="rx7v2-gauge rx7v2-small" id="rx7-nitro-group" style="--rx7-needle-len:54px">
            <div class="rx7v2-ticks" id="rx7-nitro-ticks"></div><div class="rx7v2-labels" id="rx7-nitro-labels"></div>
            <div class="rx7v2-title">NITRO<small>%</small></div>
            <div class="rx7v2-needle" id="rx7-nitro-needle"></div><div class="rx7v2-cap"></div><div class="rx7v2-glass"></div>
          </div>
          <div class="rx7v2-gauge rx7v2-large" id="rx7-rpm-group" style="--rx7-needle-len:118px">
            <div class="rx7v2-ticks" id="rx7-rpm-ticks"></div><div class="rx7v2-labels" id="rx7-rpm-labels"></div>
            <div class="rx7v2-title">RPM<small>×1000 r/min</small></div>
            <div class="rx7v2-needle" id="rx7-rpm-needle"></div><div class="rx7v2-cap"></div>
            <div id="rx7-gear" class="rx7v2-gear-box"><span class="rx7v2-caption">GEAR</span><div class="rx7v2-gear-window"><div id="rx7-gear-roll" class="rx7v2-gear-roll"><div id="rx7-gear-current" class="rx7v2-gear-digit">1</div><div id="rx7-gear-next" class="rx7v2-gear-digit">2</div></div></div></div>
            <div class="rx7v2-glass"></div>
          </div>
          <div class="rx7v2-gauge rx7v2-medium" id="rx7-speed-group" style="--rx7-needle-len:105px">
            <div class="rx7v2-ticks" id="rx7-speed-ticks"></div><div class="rx7v2-labels" id="rx7-speed-labels"></div>
            <div class="rx7v2-title" id="rx7-speed-unit">KM/H</div>
            <div class="rx7v2-needle" id="rx7-speed-needle"></div><div class="rx7v2-cap"></div>
            <div id="rx7-odometer" class="rx7v2-odo-box"><span class="rx7v2-caption">ODO · KM</span><div class="rx7v2-odo-screen" id="rx7-odo-digits">00000000.0</div></div>
            <div class="rx7v2-glass"></div>
          </div>
          <div class="rx7v2-badge">RX-7</div>
        </div>
      </div>
    </section>
    <aside id="damage-alert" class="damage-alert" role="status" aria-live="off">
      <b>ENGINE DAMAGE</b><span>LIMP MODE ACTIVE</span><small id="damage-countdown">00:30</small>
    </aside>`;
  ensureShadowStyles(shadow);

  // CIV2 reuses the exact RX-7 frame shape, grid and gauge components; create
  // a separate Honda copy with unique IDs. It does NOT change the RX-7 skin.
  const civ2Clone=shadow.getElementById('rx7-panel').cloneNode(true);
  civ2Clone.id='civ2-panel';
  civ2Clone.classList.add('civic-panel');
  civ2Clone.setAttribute('aria-label','Honda Civic Si carbon analog cluster v2');
  civ2Clone.querySelectorAll('[id]').forEach(node=>{
    if(node.id.startsWith('rx7-'))node.id='civ2-'+node.id.slice(4);
    else if(node.id.startsWith('rx7v2-'))node.id='civ2v2-'+node.id.slice(6);
  });
  // Remap SVG carbon pattern references to their renamed private Honda defs.
  civ2Clone.querySelectorAll('*').forEach(el=>{
    for(const attr of [...el.attributes]){
      if(attr.value.includes('url(#rx7v2-'))el.setAttribute(attr.name,attr.value.replaceAll('url(#rx7v2-','url(#civ2v2-'));
    }
  });
  const civ2FrameSvg=civ2Clone.querySelector('.rx7v2-frame-svg');
  // Silver-grey accents in the cloned carbon housing; original path is SAME RX7.
  civ2FrameSvg.innerHTML=civ2FrameSvg.innerHTML
    .replaceAll('#e78146','#b7b9be').replaceAll('#ff7b29','#d0d1d4')
    .replaceAll('#ff6c2a','#b6bac1').replaceAll('#37383e','#515158');
  // Keep the decorative upper-right stroke intact; Honda warnings are placed
  // lower and farther inward so the frame styling stays untouched.
  civ2Clone.querySelector('.rx7v2-badge').textContent='Si';
  // Replace the two stacked mini dials with the original Civic-style dual dial.
  const civ2Aux=civ2Clone.querySelector('#civ2-turbo-group');
  civ2Aux.id='civ2-aux-group';
  civ2Aux.classList.remove('rx7v2-small');
  civ2Aux.innerHTML=`
    <svg class="civ2-aux-svg" viewBox="0 0 205 205" aria-label="Nitro and turbo dual analog dial">
      <text class="civ2-aux-title" x="64" y="60">NITRO</text>
      <text class="civ2-aux-title" x="143" y="60">TURBO</text>
      <text class="civ2-aux-sub" x="64" y="76">F / E</text>
      <text class="civ2-aux-sub" x="143" y="76">PSI</text>
      <g id="civ2-nitro-ticks"></g><g id="civ2-turbo-ticks"></g>
      <g id="civ2-nitro-needle"><path class="civ2-aux-needle" d="M62 125 L64 84 L66 125 Z"/><circle class="civ2-aux-hub" cx="64" cy="125" r="7"/></g>
      <g id="civ2-turbo-needle"><path class="civ2-aux-needle" d="M141 125 L143 84 L145 125 Z"/><circle class="civ2-aux-hub" cx="143" cy="125" r="7"/></g>
      <text class="civ2-aux-si" x="103" y="174">Si</text>
    </svg><div class="rx7v2-glass"></div>`;
  civ2Clone.querySelector('#civ2-nitro-group').remove();
  const vtecNode=document.createElement('div');vtecNode.id='civ2-vtec';
  vtecNode.setAttribute('aria-label','VTEC simulated: off');
  vtecNode.innerHTML='<svg viewBox="0 0 20 25" aria-hidden="true"><path d="M11 2 L4 13 H10 L7 23 L17 9 H11 Z"/></svg><span>VTEC</span>';
  civ2Clone.querySelector('.rx7v2-frame').append(vtecNode);
  shadow.querySelector('.hud').append(civ2Clone);

  const menuHost = document.createElement("div");
  menuHost.id = "nfsu2-modern-hud-menu-root";
  setHudHostStyle(menuHost, {"position":"fixed","inset":"0","z-index":"2147483647","pointer-events":"none","display":"none"});
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
      <div class="top" id="dragHandle" title="Drag menu with mouse"><h2>Modern HUD <span style="color:#72d4dd">v0.9.47</span></h2><button class="x" id="close" type="button" aria-label="Close settings">×</button></div>
      <p>Drag the header to move the menu. Drag the bottom-left corner to resize its width and height. Changes apply live and are saved.</p>
      <div class="sections-grid" id="sectionsGrid">
      <fieldset><legend>HUD</legend>
        <label class="line"><input type="checkbox" id="hudEnabled"> Enable custom HUD</label>
        <label for="hudMode" style="display:block;margin:6px 0">Display mode</label>
        <select id="hudMode"><option value="full">Full HUD</option><option value="cockpit">Cockpit (compact)</option></select>
      </fieldset>
      <fieldset id="keyboardShortcutSettings"><legend>Keyboard Shortcuts — TKL / Numpad</legend>
        <div class="help">Click Change, then press your key or combination. For letters/digits, use Ctrl or Alt so driving and chat stay safe. Escape cancels. Shortcut changes apply immediately and are included in SAVE ALL / Export Settings JSON.</div>
        <div class="space"><span>Open / close HUD menu</span><strong id="shortcutMenuText">Numpad +</strong></div>
        <button type="button" id="shortcutMenuBind" style="width:100%;margin:4px 0 9px">Change menu shortcut</button>
        <div class="space"><span>Toggle HUD ON / OFF</span><strong id="shortcutToggleHudText">Numpad −</strong></div>
        <button type="button" id="shortcutToggleHudBind" style="width:100%;margin:4px 0 9px">Change HUD toggle shortcut</button>
        <div class="space"><span>SAVE ALL (HUD + ODO)</span><strong id="shortcutSaveAllText">Numpad *</strong></div>
        <button type="button" id="shortcutSaveAllBind" style="width:100%;margin:4px 0 9px">Change SAVE ALL shortcut</button>
        <button type="button" id="shortcutResetDefaults" style="width:100%;margin-top:5px">Reset Shortcuts to Defaults</button>
        <div class="help">TKL backup for opening this menu: <strong>Ctrl + Alt + M</strong>. Reset changes only keyboard shortcuts — never HUD layout or mileage.</div>
      </fieldset>
      <fieldset><legend>HUD Style — five dashboard styles</legend>
        <select id="hudStyle" aria-label="HUD style"><option value="modern">Modern Digital HUD (default)</option><option value="analog">GT-R Analog HUD — orange / red / white</option><option value="corolla">Toyota Corolla Retro (1986) — white / amber / red</option><option value="civic">Honda Civic Si EM1 (2000) — ivory / red</option><option value="rx7">Mazda RX-7 FD — rotary black / orange / red</option><option value="old" disabled>Old Style HUD (coming later)</option><option value="retro2000" disabled>2000s HUD (coming later)</option></select>
        <div class="help">Manual HUD selection never changes the car or ODO. Choosing a car in the ODO list loads its linked style (factory defaults: Skyline=GT-R, Corolla=Retro, Civic=Civic Si, RX-7=RX-7 Analog, others=Modern). Use Assign current HUD to car to save a personalized link for any model. Dynamic RPM is based on the game Car Feed. No automatic game car identification yet.</div>
      </fieldset>
      <fieldset><legend>Speedometer</legend>
        <label for="speedUnit" style="display:block;margin:5px 0">Speed units</label>
        <select id="speedUnit"><option value="kmh">KM/H — kilometres per hour</option><option value="mph">MPH — miles per hour</option></select>
        <div id="speedDepthSettings">
        <label for="speedDepth" style="display:block;margin:10px 0 5px">Speed digits depth</label>
        <select id="speedDepth"><option value="off">Flat — no effects</option><option value="subtle">Subtle 3D — visibly embossed (default)</option><option value="medium">Strong 3D — raised metallic digits</option></select>
        <div class="speed-depth-demo" id="depthDemo" data-depth="subtle"><span class="demo-speed">185</span></div>
        <div class="help">Live preview above. Light CSS-only depth; no game physics change.</div>
        </div>
      </fieldset>
      <fieldset><legend>Position / Size / Transparency</legend>
        <label for="hudPosition">HUD Position</label>
        <select id="hudPosition"><option value="bottom-right">Bottom Right</option><option value="bottom-left">Bottom Left</option><option value="top-right">Top Right</option><option value="top-left">Top Left</option></select>
        <div class="space" style="margin-top:12px"><label for="hudScale">HUD Scale</label><span class="value" id="hudScaleValue">100%</span></div>
        <input type="range" id="hudScale" min="10" max="500" step="1" aria-label="HUD scale percentage slider">
        <div class="space" style="margin:8px 0 0"><label for="hudScaleNumber">Custom HUD scale (%)</label><input type="number" id="hudScaleNumber" min="10" max="500" step="1" value="100" aria-label="Precise HUD scale percentage"></div>
        <div class="help">10–500% (or type the precise number). Modern, GT-R Analog, Corolla and Civic each remember their own size. Saved in SAVE ALL / JSON. Frame and dial sizes remain separate.</div>
        <div class="space"><label for="hudBackgroundOpacity">Background opacity</label><span class="value" id="hudBackgroundOpacityValue">90%</span></div>
        <input type="range" id="hudBackgroundOpacity" min="0" max="100" step="5">
        <div id="hudTextOpacityControls"><div class="space"><label for="hudTextOpacity">Text / numbers opacity</label><span class="value" id="hudTextOpacityValue">100%</span></div>
        <input type="range" id="hudTextOpacity" min="0" max="100" step="5"></div>
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
        <label for="odometerCarSelect" style="display:block;margin:9px 0 5px">Current vehicle (31 car models) — manual override</label>
        <select id="odometerCarSelect" aria-label="Select vehicle for mileage">
          <option value="">— Select a car first —</option><option value="ACURA_RSX">Acura RSX Type-S</option><option value="AUDI_A3">Audi A3 3.2 quattro</option><option value="AUDI_TT">Audi TT 3.2 quattro</option><option value="CADILLAC_ESCALADE">Cadillac Escalade</option><option value="FORD_FOCUS">Ford Focus ZX3</option><option value="FORD_MUSTANG">Ford Mustang GT</option><option value="HONDA_CIVIC">Honda Civic Si</option><option value="HUMMER_H2">Hummer H2</option><option value="HYUNDAI_TIBURON">Hyundai Tiburon GT</option><option value="INFINITI_G35">Infiniti G35</option><option value="LEXUS_IS300">Lexus IS 300</option><option value="LINCOLN_NAVIGATOR">Lincoln Navigator</option><option value="MAZDA_MX5">Mazda MX-5 / Miata</option><option value="MAZDA_RX7">Mazda RX-7</option><option value="MAZDA_RX8">Mazda RX-8</option><option value="MITSUBISHI_3000GT">Mitsubishi 3000GT</option><option value="MITSUBISHI_ECLIPSE">Mitsubishi Eclipse GSX</option><option value="MITSUBISHI_EVO8">Mitsubishi Lancer Evolution VIII</option><option value="NISSAN_240SX">Nissan 240SX</option><option value="NISSAN_350Z">Nissan 350Z</option><option value="NISSAN_SENTRA">Nissan Sentra SE-R Spec V</option><option value="NISSAN_SKYLINE">Nissan Skyline GT-R R34</option><option value="PEUGEOT_106">Peugeot 106</option><option value="PEUGEOT_206">Peugeot 206</option><option value="PONTIAC_GTO">Pontiac GTO</option><option value="SUBARU_IMPREZA">Subaru Impreza WRX STi</option><option value="TOYOTA_CELICA">Toyota Celica GT-S</option><option value="TOYOTA_COROLLA">Toyota Corolla GT-S</option><option value="TOYOTA_SUPRA">Toyota Supra</option><option value="VAUXHALL_CORSA">Vauxhall Corsa 1.8</option><option value="VOLKSWAGEN_GOLF">Volkswagen Golf GTI</option></select>
        <div class="help">Choosing a car loads its ODO and assigned HUD automatically. Skyline defaults to GT-R Analog, Corolla to Corolla Retro, Civic to Civic Si; other models default to Modern. To override the HUD temporarily, select any HUD Style above — the car and ODO stay unchanged.</div>
        <div class="space"><span>HUD assigned to this model</span><span class="value" id="carAssignedHudValue">Select a car</span></div>
        <div class="two"><button id="carAssignCurrentHud" type="button">Assign current HUD to car</button><button id="carResetAssignedHud" type="button">Reset car's HUD</button></div>
        <label class="line"><input type="checkbox" id="analogOdometerEnabled"> Show ODO in all HUD styles</label>
        <div class="space"><span>Selected car mileage</span><span class="value" id="odometerMenuValue">No car selected</span></div>
        <div class="two"><button id="odometerSaveNow" type="button">Save mileage now</button><button id="odometerReset" type="button">Reset selected car</button></div>
        <div class="help" id="odometerStatus" role="status">Each 0.1 km is 100 m. Max 9,999,999.9 km. Autosave after EVERY 100 m (0.1 km) and every 30 seconds while driving. Use your SAVE ALL shortcut to save mileage AND all active HUD settings.</div>
        <div class="help">Cars of the same model share one counter (e.g. two Skylines). Previous v0.9.27 mileage is preserved under "Previous ODO (unassigned)". Mileage is saved in the extension, not in the game's own save.</div>
      </fieldset>
      <fieldset id="corollaFrameSettings"><legend>Corolla — Complete Frame &amp; Instruments</legend>
        <div class="help">Move or zoom the WHOLE Toyota Corolla 1986 dashboard together: chassis, Turbo, RPM, Speed, warning lamps, Nitro and ODO. Each circle stays inside the connected frame; individual Corolla circle X/Y is limited to ±65 px horizontally and ±55 px vertically. GT-R is unaffected.</div>
        <div class="space"><label for="corollaFrameScalePct">Whole frame + gauges — Scale</label><span class="value" id="corollaFrameScalePctValue">100%</span></div>
        <input type="range" id="corollaFrameScalePct" min="50" max="175" step="5">
        <div class="space"><label for="corollaFrameOffsetX">Whole frame — X offset</label><span class="value" id="corollaFrameOffsetXValue">0 px</span></div>
        <input type="range" id="corollaFrameOffsetX" min="-600" max="600" step="1">
        <div class="space"><label for="corollaFrameOffsetY">Whole frame — Y offset</label><span class="value" id="corollaFrameOffsetYValue">0 px</span></div>
        <input type="range" id="corollaFrameOffsetY" min="-600" max="600" step="1">
        <button id="corollaFrameReset" type="button" style="width:100%;margin-top:8px">Reset Whole Frame Scale &amp; X/Y</button>
      </fieldset>
      <fieldset id="civicFrameSettings"><legend>Honda Civic Si — Whole Frame &amp; Instruments</legend>
        <div class="help">Zoom and move the complete Civic Si instrument cluster. The main black chassis now follows the sizes and positions of RPM (left), Speed (center) and Nitro/Turbo (right), keeping a slim margin. TYRES / ENGINE / SUSP are built into the chassis (no separate box).</div>
        <div class="space"><label for="civicFrameScalePct">Whole frame + gauges — Scale</label><span class="value" id="civicFrameScalePctValue">100%</span></div>
        <input type="range" id="civicFrameScalePct" min="50" max="175" step="5">
        <div class="space"><label for="civicFrameOffsetX">Whole frame — X offset</label><span class="value" id="civicFrameOffsetXValue">0 px</span></div>
        <input type="range" id="civicFrameOffsetX" min="-600" max="600" step="1">
        <div class="space"><label for="civicFrameOffsetY">Whole frame — Y offset</label><span class="value" id="civicFrameOffsetYValue">0 px</span></div>
        <input type="range" id="civicFrameOffsetY" min="-600" max="600" step="1">
        <button id="civicFrameReset" type="button" style="width:100%;margin-top:8px">Reset Civic Frame Scale &amp; X/Y</button>
      </fieldset>
      <fieldset id="rx7NitroSettings"><legend>Mazda RX-7 — Nitro Gauge Independent Position</legend>
        <div class="help">Turbo, RPM and Speed use the gauge position/size controls below. Nitro has its own X/Y and size here; all four gauges are saved independently.</div>
        <div class="space"><label for="rx7NitroOffsetX">Nitro X offset</label><span class="value" id="rx7NitroOffsetXValue">0 px</span></div><input type="range" id="rx7NitroOffsetX" min="-200" max="200" step="1">
        <div class="space"><label for="rx7NitroOffsetY">Nitro Y offset</label><span class="value" id="rx7NitroOffsetYValue">0 px</span></div><input type="range" id="rx7NitroOffsetY" min="-200" max="200" step="1">
        <div class="space"><label for="rx7NitroSizePct">Nitro circle size</label><span class="value" id="rx7NitroSizePctValue">100%</span></div><input type="range" id="rx7NitroSizePct" min="50" max="160" step="5">
        <button id="rx7NitroReset" type="button" style="width:100%;margin-top:8px">Reset RX-7 Nitro position and size</button>
      </fieldset>
      <fieldset id="analogPositionSettings"><legend id="analogPositionLegend">Analog / Corolla / Civic — Circle Size &amp; Position</legend>
        <div class="help">Each skin has independent sizes (50–160%) and X/Y. On RX-7 these three controls move TURBO, RPM and SPEED; the separate NITRO controls are above. Civic uses zero-based X/Y factory positions. Corolla local positions are constrained to the shared frame. SAVE ALL and CURRENT JSON preserve settings.</div>
        <div class="space"><label for="analogTurboSizePct">Turbo circle — Size</label><span class="value" id="analogTurboSizePctValue">100%</span></div>
        <input type="range" id="analogTurboSizePct" min="50" max="160" step="5">
        <div class="space"><label for="analogRpmSizePct">RPM circle — Size</label><span class="value" id="analogRpmSizePctValue">100%</span></div>
        <input type="range" id="analogRpmSizePct" min="50" max="160" step="5">
        <div class="space"><label for="analogSpeedSizePct">Speed circle — Size</label><span class="value" id="analogSpeedSizePctValue">100%</span></div>
        <input type="range" id="analogSpeedSizePct" min="50" max="160" step="5">
        <button id="analogResetSizes" type="button" style="width:100%;margin:8px 0 12px">Reset Circle Sizes to 100%</button>
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
        <div class="help">SAVE ALL stores both layouts, frame scale and X/Y, independent dial sizes, per-car HUD links and ODO mileage. Download CURRENT exports settings and car/HUD links (NOT mileage) to JSON. Download Selected exports SAVED visual settings.</div>
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
      <fieldset><legend>Turbo PSI — rise &amp; release</legend>
        <div class="help">Visual 0–3.0 PSI-style scale, estimated from RPM and engine load (NOT real measured turbo pressure). Default rise: 1.0 second from 0 to 3.0. Default release: 0.2 seconds from 3.0 to 0. This does not change the game's turbo or physics.</div>
        <label for="turboStartMode" style="display:block;margin:8px 0 5px">Activation RPM</label>
        <select id="turboStartMode"><option value="default">Default — 1,000 RPM</option><option value="custom">Custom RPM</option></select>
        <div class="space" style="margin-top:11px"><label for="turboStartRpm">Custom turbo start</label><span class="value" id="turboStartRpmValue">1,000 RPM</span></div>
        <input id="turboStartRpm" type="range" min="800" max="10000" step="100">
        <div class="space"><label for="turboStartRpmInput">Exact start RPM</label><input id="turboStartRpmInput" type="number" min="800" max="10000" step="50" value="1000"></div>
        <div class="space"><label for="turboResponseMs">Turbo rise time (0 to 3.0)</label><span class="value" id="turboResponseMsValue">1.0 s</span></div>
        <input id="turboResponseMs" type="range" min="200" max="2200" step="100">
        <div class="space"><label for="turboReleaseMs">Turbo release time (3.0 to 0)</label><span class="value" id="turboReleaseMsValue">0.2 s</span></div>
        <input id="turboReleaseMs" type="range" min="100" max="1500" step="50">
        <div class="help">The gauge follows engine load after its selected activation RPM; it cannot read the throttle pedal or actual turbo pressure directly.</div>
      </fieldset>
      <fieldset><legend>Shift Light (existing v0.3.1)</legend>
        <label for="shiftMode" style="display:block;margin-bottom:5px">Gearbox mode</label>
        <select id="shiftMode"><option value="auto">Automatic — 250 RPM early</option><option value="manual">Manual — near redline</option></select>
        <label for="manualGreenLead" style="display:block;margin:9px 0 5px">Manual green light</label>
        <select id="manualGreenLead"><option value="0">At redline</option><option value="100">100 RPM before redline</option><option value="250">250 RPM before redline</option></select>
      </fieldset>
      </div><!-- end responsive columns -->
      <div class="bottom"><button id="reset" type="button">Reset Defaults</button><button id="done" type="button">Close Menu</button></div>
      <div class="status" id="status" role="status">Changes auto-save. SAVE ALL stores both analog layouts, whole-frame X/Y/scale, circle sizes, per-car HUD assignments and all ODO mileage.</div>
      <div class="save-wrapper" style="margin:6px 0"><button id="saveNow" type="button" style="width:100%">SAVE ALL — HUD, sizes, positions &amp; ODO</button></div>
      <div class="hint"><span class="kbd">Num +</span> Open / close settings · <span class="kbd">Num −</span> Hide / show WHOLE custom Speedometer HUD · <span class="kbd">Num *</span> SAVE ALL settings + selected vehicle mileage<br>Original game HUD is controlled separately in NFSU2.xyz settings.</div>
          <div id="menuResizeGrip" class="resize-grip" title="Drag to resize the menu" aria-label="Resize settings menu" role="separator">↙</div>
    </section>`;
  ensureShadowStyles(menuShadow);

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
    speedUnit:aget("analog-speed-unit"),gear:aget("analog-gear-value"),gearNext:aget("analog-gear-next"),
    gearRoll:aget("analog-gear-roll"),
    nitroText:aget("analog-nitro-text"),nitroA:aget("analog-nitro-a"),nitroB:aget("analog-nitro-b"),
    rpmRed:aget("analog-rpm-redzone"),turboRed:aget("analog-turbo-redzone"),
    turboBack:aget("analog-turbo-back"),rpmBack:aget("analog-rpm-back"),speedBack:aget("analog-speed-back"),
    turboFace:aget("analog-turbo-face"),rpmFace:aget("analog-rpm-face"),speedFace:aget("analog-speed-face"),
    shift:aget("analog-shift"),tyre:aget("analog-tyre"),engine:aget("analog-engine"),susp:aget("analog-susp"),
    odo:aget("analog-odo-digits"),odoGroup:aget("analog-odometer"),corollaKmh:aget("corolla-speed-kmh"),
    corollaNitroFill:aget("corolla-nitro-fill"),corollaStatus:aget("corolla-status-panel"),
    corollaFrameShadow:aget("corolla-frame-shadow"),corollaFrameBase:aget("corolla-frame-base"),
    corollaFrameGrain:aget("corolla-frame-grain"),corollaFrameHighlight:aget("corolla-frame-highlight"),
    analogSvg:aget("analog-svg"),corollaAssembly:aget("corolla-assembly"),
    corollaClipPath:aget("corolla-body-clip-path"),
    corollaStatusRows:{tyre:aget("corolla-tyre"),engine:aget("corolla-engine"),susp:aget("corolla-susp")}
  };
  // Civic EM1 vector cluster: self-contained gauges, independent from GT-R and Corolla.
  const civicGet = id => shadow.getElementById(id);
  const civicUi = {
    panel:civicGet("civic-panel"), assembly:civicGet("civic-assembly"),
    bodyShape:civicGet("civic-body-shape"), siBadge:civicGet("civic-si-badge"),
    rpm:civicGet("civic-rpm-gauge"), speed:civicGet("civic-speed-gauge"), aux:civicGet("civic-aux-gauge"),
    rpmTicks:civicGet("civic-rpm-ticks"), speedTicks:civicGet("civic-kmh-ticks"), mphTicks:civicGet("civic-mph-ticks"),
    nitroTicks:civicGet("civic-nitro-ticks"), turboTicks:civicGet("civic-turbo-ticks"),
    rpmNeedle:civicGet("civic-rpm-needle"),speedNeedle:civicGet("civic-speed-needle"),
    nitroNeedle:civicGet("civic-nitro-needle"),turboNeedle:civicGet("civic-turbo-needle"),
    redzone:civicGet("civic-rpm-redzone"),gear:civicGet("civic-gear-value"),gearNext:civicGet("civic-gear-next"),gearRoll:civicGet("civic-gear-roll"),odo:civicGet("civic-odo-digits"),
    icons:{tyre:civicGet("civic-tyre"),engine:civicGet("civic-engine"),susp:civicGet("civic-susp")},
    vtec:civicGet("civic-vtec"),vtecText:civicGet("civic-vtec-text")
  };
  // Quick code names for future Civic Si requests / maintenance:
  // CIV_WARN_ROW = full upper warning row
  // CIV_TYR = TYRES icon + lamp
  // CIV_SUS = SUSP icon + lamp
  // CIV_ENG = ENGINE icon + lamp
  // CIV_SHIFT3 = three shift LEDs
  // CIV_GEAR = rolling gear window / label
  // CIV_ODO = rolling odometer window
  // CIV_AUX = right Nitro / Turbo dual gauge


  // RX7V2: animated HTML/CSS gauges faithfully adapted from the supplied demo.
  // We keep the existing Car Feed, speed units, persistence, gear roll and telemetry.
  const rx7Get=id=>shadow.getElementById(id);
  const rx7Ui={
    panel:rx7Get("rx7-panel"),speedTicks:rx7Get("rx7-speed-ticks"),rpmTicks:rx7Get("rx7-rpm-ticks"),
    turboTicks:rx7Get("rx7-turbo-ticks"),nitroTicks:rx7Get("rx7-nitro-ticks"),
    speedNeedle:rx7Get("rx7-speed-needle"),rpmNeedle:rx7Get("rx7-rpm-needle"),
    turboNeedle:rx7Get("rx7-turbo-needle"),nitroNeedle:rx7Get("rx7-nitro-needle"),
    speedUnit:rx7Get("rx7-speed-unit"),odo:rx7Get("rx7-odo-digits"),
    gearCurrent:rx7Get("rx7-gear-current"),gearNext:rx7Get("rx7-gear-next"),
    gearRoll:rx7Get("rx7-gear-roll"),shift:rx7Get("rx7-shift"),
    groups:{turbo:rx7Get("rx7-turbo-group"),nitro:rx7Get("rx7-nitro-group"),rpm:rx7Get("rx7-rpm-group"),speed:rx7Get("rx7-speed-group")},
    warnings:rx7Get("rx7-warnings"),icons:{tyre:rx7Get("rx7-tyre"),engine:rx7Get("rx7-engine"),susp:rx7Get("rx7-susp")}
  };

  // Honda RX7-form-factor UI; the old civic SVG still exists as a compatibility
  // layer for old profiles, but is not shown when Honda is selected.
  const civ2Get=id=>shadow.getElementById(id);
  const civ2Ui={
    panel:civ2Get('civ2-panel'),frame:civ2Get('civ2-panel').querySelector('.rx7v2-frame'),
    aux:civ2Get('civ2-aux-group'),rpm:civ2Get('civ2-rpm-group'),speed:civ2Get('civ2-speed-group'),
    rpmTicks:civ2Get('civ2-rpm-ticks'),rpmLabels:civ2Get('civ2-rpm-labels'),
    speedTicks:civ2Get('civ2-speed-ticks'),speedLabels:civ2Get('civ2-speed-labels'),
    nitroTicks:civ2Get('civ2-nitro-ticks'),turboTicks:civ2Get('civ2-turbo-ticks'),
    rpmNeedle:civ2Get('civ2-rpm-needle'),speedNeedle:civ2Get('civ2-speed-needle'),
    nitroNeedle:civ2Get('civ2-nitro-needle'),turboNeedle:civ2Get('civ2-turbo-needle'),
    gearCurrent:civ2Get('civ2-gear-current'),gearNext:civ2Get('civ2-gear-next'),gearRoll:civ2Get('civ2-gear-roll'),
    odo:civ2Get('civ2-odo-digits'),vtec:civ2Get('civ2-vtec'),shift:civ2Get('civ2-shift'),
    speedUnit:civ2Get('civ2-speed-unit'),warnings:civ2Get('civ2-warnings'),
    icons:{tyre:civ2Get('civ2-tyre'),engine:civ2Get('civ2-engine'),susp:civ2Get('civ2-susp')}
  };
  // Keep tick labels tucked away from the central label and windows.
  const civ2Config={
    rpm:{max:10,major:1,div:5,radius:116,fontSize:18,needleRadius:143},
    speed:{max:400,major:40,div:4,radius:94,fontSize:15,needleRadius:126}
  };
  function civ2DrawDial(key){
    const cfg=civ2Config[key],ticks=civ2Ui[key+'Ticks'],labels=civ2Ui[key+'Labels'];
    const size=key==='rpm'?310:280,center=size/2,majorCount=Math.round(cfg.max/cfg.major),total=majorCount*cfg.div;
    const tf=document.createDocumentFragment(),lf=document.createDocumentFragment();
    for(let i=0;i<=total;i++){
      const fraction=i/total,deg=-135+fraction*270;
      const major=i%cfg.div===0,tick=document.createElement('span');
      tick.className='rx7v2-tick'+(major?' major':'')+(key==='rpm'&&fraction>=.8?' redzone':'');
      tick.style.transform=`rotate(${deg}deg) translateY(${-cfg.needleRadius}px)`;
      tf.append(tick);
      if(major){
        const rad=deg*Math.PI/180,label=document.createElement('span');
        label.className='rx7v2-dial-number';label.textContent=String(Math.round(fraction*cfg.max));
        label.style.left=`${center+cfg.radius*Math.sin(rad)}px`;
        label.style.top=`${center-cfg.radius*Math.cos(rad)}px`;
        label.style.fontSize=`${cfg.fontSize}px`;lf.append(label);
      }
    }
    ticks.replaceChildren(tf);labels.replaceChildren(lf);
  }
  let civ2SpeedKey='',civ2RpmKey='',civ2LastGear=null,civ2GearFrame=0;
  /* Individual ODO drums. A tenth-of-km increment rolls each changed numeral
     from bottom to top; model switches / resets render immediately. */
  const ODO_ROLL_MS=480;
  const createHtmlOdoDrums=container=>{
    const slots=[];
    container.replaceChildren();
    for(let i=0;i<10;i++){
      const slot=document.createElement('span');
      slot.className='odo-html-slot'+(i===8?' odo-dot':'');
      const track=document.createElement('span');track.className='odo-html-track';
      const cell=document.createElement('span');cell.textContent=i===8?'.':'-';
      track.append(cell);slot.append(track);container.append(slot);slots.push({track,cell,timer:0});
    }
    return {slots,last:'',lastTenths:null,lastCar:null};
  };
  const hondaOdoDrum=createHtmlOdoDrums(civ2Ui.odo);
  const svgOdoNS='http://www.w3.org/2000/svg';
  const svgOdoEl=(tag,attrs={})=>{
    const el=document.createElementNS(svgOdoNS,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    return el;
  };
  const createCorollaOdoDrums=()=>{
    const def=svgOdoEl('defs'),roller=svgOdoEl('g',{id:'corolla-odo-roller'}),slots=[];
    for(let i=0;i<10;i++){
      const x=650-(9-i)*8.5-4.1;
      const clipId='corolla-odo-drum-clip-'+i;
      const clip=svgOdoEl('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'});
      clip.append(svgOdoEl('rect',{x:x-4.5,y:245,width:9,height:23}));def.append(clip);
      const outer=svgOdoEl('g',{'clip-path':`url(#${clipId})`});
      const track=svgOdoEl('g',{class:'corolla-odo-svg-track'});
      const cell=svgOdoEl('text',{x,y:261,class:'corolla-odo-svg-num'});cell.textContent=i===8?'.':'-';
      track.append(cell);outer.append(track);roller.append(outer);slots.push({track,cell,x,timer:0});
    }
    analogUi.odoGroup.append(def,roller);
    return {slots,last:'',lastTenths:null,lastCar:null};
  };
  const corollaOdoDrum=createCorollaOdoDrums();
  function updateOdoDrum(state,value,tenths,car,isSvg,active){
    if(state.last===value&&state.lastCar===car)return;
    const previous=state.last;
    const smooth=active&&car===state.lastCar&&state.lastTenths!==null&&tenths-state.lastTenths===1;
    for(let i=0;i<10;i++){
      const slot=state.slots[i],oldChar=previous[i]||'-',newChar=value[i]||'-';
      if(oldChar===newChar)continue;
      clearTimeout(slot.timer);slot.timer=0;
      slot.track.classList.remove('rolling');
      slot.track.replaceChildren();
      const createCell=(v,row)=>{
        if(isSvg){
          const node=svgOdoEl('text',{x:slot.x,y:261+row*18,class:'corolla-odo-svg-num'});
          node.textContent=v;return node;
        }
        const node=document.createElement('span');node.textContent=v;return node;
      };
      if(smooth&&/^[0-9]$/.test(oldChar)&&/^[0-9]$/.test(newChar)){
        slot.track.append(createCell(oldChar,0),createCell(newChar,1));
        void slot.track.getBoundingClientRect();
        slot.track.classList.add('rolling');
        slot.timer=setTimeout(()=>{
          slot.track.classList.remove('rolling');
          slot.track.replaceChildren(createCell(newChar,0));slot.timer=0;
        },ODO_ROLL_MS+20);
      }else{
        slot.track.append(createCell(newChar,0));
      }
    }
    state.last=value;state.lastTenths=tenths;state.lastCar=car;
  }

  function civ2SpeedScale(){
    const unit=settings.speedUnit;if(civ2SpeedKey===unit)return;
    civ2SpeedKey=unit;civ2Config.speed.max=unit==='mph'?250:400;
    civ2Config.speed.major=unit==='mph'?25:40;
    civ2DrawDial('speed');civ2Ui.speedUnit.textContent=unit==='mph'?'MPH':'KM/H';
  }
  function civ2RpmScale(max,redline){
    const cap=Math.max(10000,Math.ceil(Math.max(max,redline)/1000)*1000);
    if(civ2RpmKey!==cap){civ2RpmKey=cap;civ2Config.rpm.max=cap/1000;civ2DrawDial('rpm');}
    return cap;
  }
  function civ2AuxMarks(node,cx,cy,r,start,end,steps,labelSet){
    const ns='http://www.w3.org/2000/svg',frag=document.createDocumentFragment();
    for(let i=0;i<=steps;i++){
      const angle=(start+(end-start)*(i/steps))*Math.PI/180;
      const inner=r-(i%5===0?10:5),x=Math.sin(angle),y=-Math.cos(angle);
      const line=document.createElementNS(ns,'line');
      line.setAttribute('class','civ2-aux-tick'+(i%5===0?' major':''));
      line.setAttribute('x1',(cx+x*inner).toFixed(2));line.setAttribute('y1',(cy+y*inner).toFixed(2));
      line.setAttribute('x2',(cx+x*r).toFixed(2));line.setAttribute('y2',(cy+y*r).toFixed(2));frag.append(line);
      if(labelSet?.[i]){
        const text=document.createElementNS(ns,'text');text.setAttribute('class','civ2-aux-num');
        text.setAttribute('x',(cx+x*(r-22)).toFixed(2));
        text.setAttribute('y',(cy+y*(r-22)).toFixed(2));text.textContent=labelSet[i];frag.append(text);
      }
    }
    node.replaceChildren(frag);
  }
  // Nitro: E at lower-left, F at upper-left. Turbo: 0 to 3 on right arc.
  civ2AuxMarks(civ2Ui.nitroTicks,64,125,54,230,310,15,{0:'E',15:'F'});
  civ2AuxMarks(civ2Ui.turboTicks,143,125,54,50,130,15,{0:'3',5:'2',10:'1',15:'0'});
  civ2RpmScale(9000,7700);civ2SpeedScale();
  function civ2Layout(){
    // Owner-approved Honda 85% corresponds to 100% of the new RX-7-style dials.
    const set=(node,cx,cy,settingsPart)=>{
      const keyX='civic'+settingsPart+'OffsetX',keyY='civic'+settingsPart+'OffsetY';
      const x=originValue(keyX)+settings[keyX],y=originValue(keyY)+settings[keyY];
      const sz=settings['civic'+settingsPart+'SizePct']/85;
      node.style.transformOrigin=`${cx}px ${cy}px`;
      node.style.transform=`translate(${x}px,${y}px) scale(${sz})`;
    };
    set(civ2Ui.aux,102.5,102.5,'Turbo');
    set(civ2Ui.rpm,155,155,'Rpm');
    set(civ2Ui.speed,140,140,'Speed');
    const s=settings.civicFrameScalePct/100;
    civ2Ui.frame.style.transformOrigin='500px 235px';
    civ2Ui.frame.style.transform=`translate(${settings.civicFrameOffsetX}px,${settings.civicFrameOffsetY}px) scale(${s})`;
    civ2Ui.panel.querySelector('.rx7v2-frame-svg').style.opacity=String(settings.hudBackgroundOpacity/100);
  }
  function civ2Visibility(){
    const active=settings.hudStyle==='civic'&&settings.hudMode==='full';
    civ2Ui.panel.style.display=active?'block':'none';
    if(!active){civ2LastGear=null;return;}
    civ2Ui.aux.style.display=settings.showTurbo||settings.showNitro?'':'none';
    civ2Ui.rpm.style.display=settings.showRpm||settings.showGear?'':'none';
    civ2Ui.speed.style.display=settings.showSpeed||settings.analogOdometerEnabled?'':'none';
    civ2Ui.rpmNeedle.style.display=settings.showRpm?'':'none';
    civ2Ui.speedNeedle.style.display=settings.showSpeed?'':'none';
    civ2Ui.nitroNeedle.style.display=settings.showNitro?'':'none';
    civ2Ui.turboNeedle.style.display=settings.showTurbo?'':'none';
    civ2Ui.rpmTicks.style.display=settings.showRpm?'':'none';
    civ2Ui.rpmLabels.style.display=settings.showRpm?'':'none';
    civ2Ui.speedTicks.style.display=settings.showSpeed?'':'none';
    civ2Ui.speedLabels.style.display=settings.showSpeed?'':'none';
    civ2Ui.speedUnit.style.display=settings.showSpeed?'':'none';
    civ2Get('civ2-gear').style.display=settings.showGear?'':'none';
    civ2Get('civ2-odometer').style.display=settings.analogOdometerEnabled?'':'none';
    civ2Ui.shift.style.display=settings.showShift?'':'none';
    civ2Ui.warnings.style.display=settings.showIcons?'':'none';
    for(const k of ['tyre','engine','susp']){
      const flag=k==='tyre'?'showTyreIcon':k==='engine'?'showEngineIcon':'showSuspIcon';
      civ2Ui.icons[k].style.display=settings.showIcons&&settings[flag]?'':'none';
    }
    civ2Layout();
  }
  function civ2RollingGearUpdate(value){
    const next=String(value??'N');if(next===civ2LastGear)return;
    const previous=civ2LastGear;civ2LastGear=next;
    if(civ2GearFrame){cancelAnimationFrame(civ2GearFrame);civ2GearFrame=0;}
    const finish=()=>{
      civ2Ui.gearCurrent.textContent=next;civ2Ui.gearNext.textContent=next;
      civ2Ui.gearRoll.style.transform='translateY(0px)';civ2GearFrame=0;
    };
    if(previous===null||!settings.showGear||settings.hudPerformanceMode==='eco'){finish();return;}
    civ2Ui.gearCurrent.textContent=previous;civ2Ui.gearNext.textContent=next;
    const t0=performance.now(),duration=285;
    const frame=t=>{
      if(civ2LastGear!==next){civ2GearFrame=0;return;}
      const p=Math.min(1,(t-t0)/duration),ease=1-(1-p)**3;
      civ2Ui.gearRoll.style.transform=`translateY(${(-32*ease).toFixed(2)}px)`;
      if(p<1)civ2GearFrame=requestAnimationFrame(frame);else finish();
    };
    civ2GearFrame=requestAnimationFrame(frame);
  }
  function civ2Update(rpm,max,redline,kmh,nitro,gear){
    if(settings.hudStyle!=='civic'||settings.hudMode!=='full')return;
    const cap=civ2RpmScale(max,redline);civ2SpeedScale();
    if(settings.showRpm)rx7Angle(civ2Ui.rpmNeedle,rpm/cap);
    if(settings.showSpeed)rx7Angle(civ2Ui.speedNeedle,
      (settings.speedUnit==='mph'?kmh/1.609344:kmh)/(settings.speedUnit==='mph'?250:400));
    const rot=(node,val,a,b,cx,cy)=>node.setAttribute('transform',`rotate(${(a+(b-a)*clamp(val,0,1)).toFixed(2)} ${cx} ${cy})`);
    if(settings.showNitro)rot(civ2Ui.nitroNeedle,nitro/NITRO_CAPACITY,230,310,64,125);
    if(settings.showTurbo)rot(civ2Ui.turboNeedle,turboDisplay,130,50,143,125);
    if(settings.showGear)civ2RollingGearUpdate(gear);
    civ2Ui.vtec.classList.toggle('is-on',civicVtecActive);
    civ2Ui.vtec.setAttribute('aria-label',civicVtecActive?'VTEC simulated: active':'VTEC simulated: off');
  }

  const rx7v2Config={
    turbo:{max:3,major:1,div:4,radius:52,fontSize:12,needleRadius:63},
    nitro:{max:100,major:25,div:5,radius:52,fontSize:11,needleRadius:63},
    rpm:{max:10,major:1,div:5,radius:117,fontSize:17,needleRadius:143},
    speed:{max:400,major:40,div:4,radius:88,fontSize:14,needleRadius:126}
  };
  function rx7v2DrawDial(key){
    const cfg=rx7v2Config[key],ticks=rx7Ui[key+"Ticks"];
    const labels=rx7Get(`rx7-${key}-labels`),size=key==="rpm"?310:key==="speed"?280:155;
    const center=size/2;
    ticks.replaceChildren();labels.replaceChildren();
    const total=Math.round((cfg.max/cfg.major)*cfg.div);
    const tickFragment=document.createDocumentFragment(),labelFragment=document.createDocumentFragment();
    for(let i=0;i<=total;i++){
      const value=(i/total)*cfg.max,angle=-135+(i/total)*270;
      const major=i%cfg.div===0;
      const tick=document.createElement('span');tick.className="rx7v2-tick"+(major?" major":"")+(key==="rpm"&&value>=8?" redzone":"");
      const rad=angle*Math.PI/180;
      tick.style.transform=`rotate(${angle}deg) translateY(${-cfg.needleRadius}px)`;
      tickFragment.append(tick);
      if(major){
        const lab=document.createElement('span');lab.className="rx7v2-dial-number";
        lab.textContent=key==="rpm"?String(Math.round(value)):key==="turbo"?String(Math.round(value)):String(Math.round(value));
        lab.style.left=`${center+cfg.radius*Math.sin(rad)}px`;
        lab.style.top=`${center-cfg.radius*Math.cos(rad)}px`;
        lab.style.fontSize=`${cfg.fontSize}px`;
        labelFragment.append(lab);
      }
    }
    ticks.append(tickFragment);labels.append(labelFragment);
  }
  let rx7SpeedKey='',rx7RpmKey='',rx7LastGear=null,rx7GearFrame=0;
  function rx7SpeedScale(){
    const unit=settings.speedUnit;if(rx7SpeedKey===unit)return;
    rx7SpeedKey=unit;
    rx7v2Config.speed.max=unit==='mph'?250:400;
    rx7v2Config.speed.major=unit==='mph'?25:40;
    rx7v2DrawDial('speed');
    rx7Ui.speedUnit.textContent=unit==='mph'?'MPH':'KM/H';
  }
  function rx7RpmScale(max,redline){
    const cap=Math.max(10000,Math.ceil(Math.max(max,redline)/1000)*1000);
    if(rx7RpmKey!==cap){
      rx7RpmKey=cap;rx7v2Config.rpm.max=cap/1000;rx7v2DrawDial('rpm');
    }
    return cap;
  }
  function rx7Angle(el,f){
    const v=`translateX(-50%) rotate(${(-135+270*clamp(f,0,1)).toFixed(2)}deg)`;
    if(el.style.transform!==v)el.style.transform=v;
  }
  rx7v2DrawDial('turbo');rx7v2DrawDial('nitro');rx7RpmScale(9000,7700);rx7SpeedScale();
  function rx7GearUpdate(value){
    const gear=String(value??"N");if(gear===rx7LastGear)return;
    const prev=rx7LastGear;rx7LastGear=gear;
    if(rx7GearFrame){cancelAnimationFrame(rx7GearFrame);rx7GearFrame=0;}
    const finish=()=>{
      rx7Ui.gearCurrent.textContent=gear;rx7Ui.gearNext.textContent=gear;
      rx7Ui.gearRoll.style.transform='translateY(0px)';rx7GearFrame=0;
    };
    if(prev===null||!settings.showGear||settings.hudPerformanceMode==='eco'){finish();return;}
    rx7Ui.gearCurrent.textContent=prev;rx7Ui.gearNext.textContent=gear;
    const t0=performance.now(),duration=285;
    const frame=now=>{
      if(rx7LastGear!==gear){rx7GearFrame=0;return;}
      const t=Math.min(1,(now-t0)/duration),eased=1-(1-t)**3;
      rx7Ui.gearRoll.style.transform=`translateY(${(-32*eased).toFixed(2)}px)`;
      if(t<1)rx7GearFrame=requestAnimationFrame(frame);else finish();
    };
    rx7GearFrame=requestAnimationFrame(frame);
  }
  function rx7Visibility(){
    const active=settings.hudStyle==='rx7'&&settings.hudMode==='full';
    rx7Ui.panel.style.display=active?'block':'none';
    if(!active){rx7LastGear=null;return;}
    rx7Ui.groups.turbo.style.display=settings.showTurbo?'':'none';
    rx7Ui.groups.nitro.style.display=settings.showNitro?'':'none';
    rx7Ui.groups.rpm.style.display=(settings.showRpm||settings.showGear)?'':'none';
    rx7Ui.groups.speed.style.display=(settings.showSpeed||settings.analogOdometerEnabled)?'':'none';
    rx7Ui.rpmTicks.style.display=settings.showRpm?'':'none';
    rx7Get('rx7-rpm-labels').style.display=settings.showRpm?'':'none';
    rx7Ui.rpmNeedle.style.display=settings.showRpm?'':'none';
    rx7Ui.speedTicks.style.display=settings.showSpeed?'':'none';
    rx7Get('rx7-speed-labels').style.display=settings.showSpeed?'':'none';
    rx7Ui.speedNeedle.style.display=settings.showSpeed?'':'none';
    rx7Ui.speedUnit.style.display=settings.showSpeed?'':'none';
    rx7Get('rx7-gear').style.display=settings.showGear?'':'none';
    rx7Get('rx7-odometer').style.display=settings.analogOdometerEnabled?'':'none';
    rx7Ui.shift.style.display=settings.showShift?'':'none';
    rx7Ui.warnings.style.display=settings.showIcons?'':'none';
    for(const k of ['tyre','engine','susp'])rx7Ui.icons[k].style.display=settings.showIcons&&settings['show'+(k==='tyre'?'Tyre':k==='susp'?'Susp':'Engine')+'Icon']?'':'none';
  }
  function rx7Update(rpm,max,redline,kmh,nitro,gear){
    if(settings.hudStyle!=='rx7'||settings.hudMode!=='full')return;
    const cap=rx7RpmScale(max,redline);rx7SpeedScale();
    if(settings.showRpm)rx7Angle(rx7Ui.rpmNeedle,rpm/cap);
    if(settings.showSpeed)rx7Angle(rx7Ui.speedNeedle,(settings.speedUnit==='mph'?kmh/1.609344:kmh)/(settings.speedUnit==='mph'?250:400));
    if(settings.showNitro)rx7Angle(rx7Ui.nitroNeedle,nitro/NITRO_CAPACITY);
    if(settings.showTurbo)rx7Angle(rx7Ui.turboNeedle,turboDisplay);
    if(settings.showGear)rx7GearUpdate(gear);
  }

  const civicNs="http://www.w3.org/2000/svg";
  const civicPoint=(cx,cy,r,a)=>[cx+r*Math.sin(a*Math.PI/180),cy-r*Math.cos(a*Math.PI/180)];
  function civicEl(tag,attrs={},value){
    const el=document.createElementNS(civicNs,tag);
    for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));
    if(value!==undefined)el.textContent=String(value);
    return el;
  }
  function civicRotate(el,a,cx,cy){
    if(!el)return;
    const v=`rotate(${a.toFixed(2)} ${cx} ${cy})`;
    if(el.getAttribute("transform")!==v)el.setAttribute("transform",v);
  }
  function civicDrawScale(container,{cx,cy,r,start=232,end=488,max,major,minor,numberRadius=r-29,numClass="civic-num",formatter=v=>String(v),labelEvery=major}){
    const f=document.createDocumentFragment();
    const count=Math.round(max/minor);
    for(let i=0;i<=count;i++){
      const val=i*minor,angle=start+(end-start)*val/max;
      const isMajor=Math.abs(val/major-Math.round(val/major))<.001;
      const inner=isMajor?r-13:r-7;
      const [x1,y1]=civicPoint(cx,cy,inner,angle),[x2,y2]=civicPoint(cx,cy,r,angle);
      f.append(civicEl("line",{x1:x1.toFixed(2),y1:y1.toFixed(2),x2:x2.toFixed(2),y2:y2.toFixed(2),class:`civic-tick${isMajor?' major':''}`}));
      if(isMajor && Math.abs(val/labelEvery-Math.round(val/labelEvery))<.001){
        const label=formatter(val);
        if(label!=="" && label!==null && label!==undefined){
          const [x,y]=civicPoint(cx,cy,numberRadius,angle);
          f.append(civicEl("text",{x:x.toFixed(2),y:y.toFixed(2),class:numClass},label));
        }
      }
    }
    container.replaceChildren(f);
  }
  function civicArc(cx,cy,r,start,end){
    const a=civicPoint(cx,cy,r,start),b=civicPoint(cx,cy,r,end);
    const large=(end-start)>180?1:0;
    return `M${a[0].toFixed(2)} ${a[1].toFixed(2)} A${r} ${r} 0 ${large} 1 ${b[0].toFixed(2)} ${b[1].toFixed(2)}`;
  }
  let civicRpmCache="";
  function civicRpmScale(max,red){
    const scale=Math.max(9000,Math.ceil(max/1000)*1000);
    const ratio=clamp(red/scale,0,1);
    const key=`${scale}:${ratio.toFixed(3)}`;
    if(civicRpmCache===key)return scale;
    civicRpmCache=key;
    civicDrawScale(civicUi.rpmTicks,{cx:178,cy:228,r:121,max:scale,major:1000,minor:250,numberRadius:90,formatter:v=>String(Math.round(v/1000))});
    civicUi.redzone.setAttribute("d",civicArc(178,228,123,232+256*ratio,486));
    return scale;
  }
  civicDrawScale(civicUi.speedTicks,{cx:482,cy:205,r:150,max:400,major:40,minor:10,labelEvery:80,numberRadius:119,numClass:"civic-kmh-num"});
  civicDrawScale(civicUi.mphTicks,{cx:482,cy:205,r:92,max:250,major:50,minor:25,numberRadius:68,numClass:"civic-mph-num"});
  // The right dial is one housing but has two completely separate needles.
  civicDrawScale(civicUi.nitroTicks,{cx:706,cy:245,r:65,start:225,end:315,max:100,major:50,minor:10,numberRadius:38,numClass:"civic-mph-num",formatter:v=>v===0?"E":v===100?"F":""});
  // Four major numbers instead of seven tightly stacked ones on the Turbo half-dial.
  civicDrawScale(civicUi.turboTicks,{cx:817,cy:245,r:67,start:160,end:20,max:3,major:1,minor:.25,numberRadius:38,numClass:"civic-mph-num",formatter:v=>v.toFixed(0)});
  civicRpmScale(9000,7700);
  const civicOdoWheels=[];
  for(let i=0;i<8;i++){
    const x=i===7?532:432+i*12.5;
    const group=civicEl("g",{id:`civic-odo-wheel-${i}`});
    for(let j=-1;j<=1;j++)group.append(civicEl("text",{x,y:311+j*18,class:"civic-odo-wheel-num"},"0"));
    civicUi.odo.append(group);civicOdoWheels.push(group);
  }
  civicUi.odo.append(civicEl("text",{x:520,y:311,class:"civic-odo-wheel-num"},"."));
  function civicOdometerUpdate(){
    if(!civicUi.odo)return;
    if(!selectedOdometerCar){
      for(const g of civicOdoWheels){const digits=g.querySelectorAll("text");for(const el of digits)el.textContent="–";g.setAttribute("transform","");}
      return;
    }
    const km=clamp(Number(odometerKm)||0,0,ODOMETER_MAX_KM);
    const tenths=km*10;
    for(let i=0;i<8;i++){
      const magnitude=10**(7-i),floor=Math.floor(tenths/magnitude+1e-8);
      const digit=floor%10;
      const fraction=(tenths/magnitude)-floor;
      // A real mechanical carry wheel moves only in the last tenth of its lower wheel's cycle.
      const phase=i===7?fraction:clamp((fraction-.9)*10,0,1);
      const g=civicOdoWheels[i];
      const values=g.querySelectorAll("text");
      values[0].textContent=String((digit+9)%10);
      values[1].textContent=String(digit);
      values[2].textContent=String((digit+1)%10);
      g.setAttribute("transform",`translate(0 ${(-18*phase).toFixed(3)})`);
    }
  }
  // CIV_BG — continuous factory-inspired shoulder arch around three dials.
  // The body is recalculated from ALL three real dial bounds, warning indicators
  // and three Shift LEDs. Symmetric cubic contours replace freehand/stepped bumps.
  // Dial faces and indicator lamps have reserved clearance; the shell alone fades.
  function civicAdaptiveBodyPath(gauges,extras){
    const [rpm,mid,aux]=[gauges[1],gauges[2],gauges[0]];
    const objects=[...gauges,...extras];
    const left=Math.min(...objects.map(q=>q.cx-q.rx))-10;
    const right=Math.max(...objects.map(q=>q.cx+q.rx))+13;
    const bottom=Math.max(...objects.map(q=>q.cy+q.ry))+10;
    const led=extras[0];
    const warning=extras.slice(1);
    const vtecBadge=extras[extras.length-1];
    // Include the VTEC badge in the actual left-shoulder silhouette so its
    // upper edge never pokes outside the carbon case.
    const leftTop=Math.min(rpm.cy-rpm.ry-17,led.cy-led.ry-13,vtecBadge.cy-vtecBadge.ry-11);
    const rightTop=Math.min(aux.cy-aux.ry-17,...warning.map(q=>q.cy-q.ry-17));
    const crownTop=Math.min(mid.cy-mid.ry-13,leftTop,rightTop);
    const radius=Math.max(22,Math.min(42,(right-left)*.07,(bottom-Math.min(leftTop,rightTop))*.27));
    const crownStart=mid.cx-mid.rx*1.23;
    const crownEnd=mid.cx+mid.rx*1.23;
    const crownFlatL=mid.cx-mid.rx*.45;
    const crownFlatR=mid.cx+mid.rx*.45;
    const f=x=>Number(x).toFixed(2);
    // With freely moved or oversized instruments, use a guaranteed envelope.
    // No folded Beziers, inverted control handles or separate indicator boxes.
    const invalid=!objects.every(q=>[q.cx,q.cy,q.rx,q.ry].every(Number.isFinite))||
      crownStart<=left+radius+8||crownEnd>=right-radius-8||
      crownFlatL<=crownStart||crownFlatR>=crownEnd||
      rightTop>=bottom-radius||leftTop>=bottom-radius;
    if(invalid){
      const top=Math.min(...objects.map(q=>q.cy-q.ry))-15;
      const r=Math.max(15,Math.min(radius,(bottom-top)*.35));
      return `M ${f(left+r)} ${f(top)} H ${f(right-r)} Q ${f(right)} ${f(top)} ${f(right)} ${f(top+r)} `+
        `V ${f(bottom-r)} Q ${f(right)} ${f(bottom)} ${f(right-r)} ${f(bottom)} `+
        `H ${f(left+r)} Q ${f(left)} ${f(bottom)} ${f(left)} ${f(bottom-r)} `+
        `V ${f(top+r)} Q ${f(left)} ${f(top)} ${f(left+r)} ${f(top)} Z`;
    }
    const ascent=crownFlatL-crownStart;
    const descent=crownEnd-crownFlatR;
    return [
      `M ${f(left)} ${f(leftTop+radius)}`,
      `Q ${f(left)} ${f(leftTop)} ${f(left+radius)} ${f(leftTop)}`,
      `L ${f(crownStart)} ${f(leftTop)}`,
      `C ${f(crownStart+ascent*.38)} ${f(leftTop)} ${f(crownFlatL-ascent*.54)} ${f(crownTop)} ${f(crownFlatL)} ${f(crownTop)}`,
      `L ${f(crownFlatR)} ${f(crownTop)}`,
      `C ${f(crownFlatR+descent*.54)} ${f(crownTop)} ${f(crownEnd-descent*.38)} ${f(rightTop)} ${f(crownEnd)} ${f(rightTop)}`,
      `L ${f(right-radius)} ${f(rightTop)}`,
      `Q ${f(right)} ${f(rightTop)} ${f(right)} ${f(rightTop+radius)}`,
      `L ${f(right)} ${f(bottom-radius)}`,
      `Q ${f(right)} ${f(bottom)} ${f(right-radius)} ${f(bottom)}`,
      `L ${f(left+radius)} ${f(bottom)}`,
      `Q ${f(left)} ${f(bottom)} ${f(left)} ${f(bottom-radius)}`,
      'Z'
    ].join(' ');
  }
  function civicLayout(){
    const entries=[
      [civicUi.aux,"Turbo",763,238,144],
      [civicUi.rpm,"Rpm",178,228,150],
      [civicUi.speed,"Speed",482,205,184]
    ];
    const circles=[];
    for(const [el,part,cx,cy,r] of entries){
      const offsetX=settings[`civic${part}OffsetX`]+originValue(`civic${part}OffsetX`);
      const offsetY=settings[`civic${part}OffsetY`]+originValue(`civic${part}OffsetY`);
      const baseX=CIVIC_V0951_ORIGIN[`civic${part}OffsetX`];
      const baseY=CIVIC_V0951_ORIGIN[`civic${part}OffsetY`];
      // Native SVG centers differ by 10px Y (AUX 238, RPM 228). Compensate
      // inside the default layout so the two outer dials share one centerline.
      const x=offsetX+baseX, y=offsetY+baseY+(part==="Turbo"?-10:0);
      // Native AUX rim r=144; RPM rim r=150. Apply a calibrated ratio so
      // equal size controls mean equal VISIBLE size, not merely equal percent.
      const size=settings[`civic${part}SizePct`]/100*(part==="Turbo"?150/144:1);
      el.setAttribute("transform",`translate(${x} ${y}) translate(${cx} ${cy}) scale(${size}) translate(${-cx} ${-cy})`);
      const pad=12;
      circles.push({cx:cx+x,cy:cy+y,rx:r*size+pad,ry:r*size+pad,size,r:r*size});
    }
    const aux=circles[0],rpmCircle=circles[1],speed=circles[2];
    // Shift dots: lifted higher to match the requested upper lip position.
    const shiftY=rpmCircle.cy-rpmCircle.r-18;
    const shiftDots=civicGet("civic-shift-lights").querySelectorAll("circle");
    shiftDots.forEach((dot,i)=>{
      dot.setAttribute("cx",String(rpmCircle.cx+(i-1)*25));
      dot.setAttribute("cy",String(shiftY));
    });
    // CIV_WARN_ROW: uniform 80px icon-to-icon spacing, identical vertical alignment.
    // Lamp offsets account for the narrower SUSP spring symbol, so visual gaps match.
    const rowY=aux.cy-aux.r-38;
    const gap=80;
    const tyreX=aux.cx-154, suspX=tyreX+gap, engineX=suspX+gap;
    for(const [el,x] of [
      [civicUi.icons.tyre,tyreX],
      [civicUi.icons.susp,suspX],
      [civicUi.icons.engine,engineX]
    ]) el.setAttribute("transform",`translate(${x.toFixed(2)} ${rowY.toFixed(2)})`);
    // CIV_VTEC is anchored to the free bridge between the left and center dials.
    // Keep it on the carbon, ahead of the rims even at alternative circle sizes.
    const vtecX=rpmCircle.cx+(speed.cx-rpmCircle.cx)*.355;
    // Keep the fixed 88x35 badge in the carbon bridge. Its bottom stays
    // clear of both moving dial rims, even when users enlarge either gauge.
    const pillL=vtecX-44, pillR=vtecX+44;
    let badgeBottomLimit=Infinity;
    for(const dial of [rpmCircle,speed]){
      const closestX=clamp(dial.cx,pillL,pillR);
      const dx=Math.abs(closestX-dial.cx),clearanceRadius=dial.r+8;
      if(dx<clearanceRadius){
        badgeBottomLimit=Math.min(badgeBottomLimit,
          dial.cy-Math.sqrt(clearanceRadius*clearanceRadius-dx*dx));
      }
    }
    const vtecY=Math.min(rpmCircle.cy-rpmCircle.r-4,badgeBottomLimit-17.5-2);
    civicGet("civic-vtec").setAttribute("transform",`translate(${pillL.toFixed(2)} ${(vtecY-17.5).toFixed(2)})`);
    const extra=[
      {cx:rpmCircle.cx,cy:shiftY,rx:56,ry:10},
      {cx:tyreX+25,cy:rowY+17,rx:29,ry:17},
      {cx:suspX+22,cy:rowY+17,rx:26,ry:17},
      {cx:engineX+25,cy:rowY+17,rx:29,ry:17},
      {cx:vtecX,cy:vtecY,rx:45,ry:18.5}
    ];
    civicUi.bodyShape.setAttribute("d",civicAdaptiveBodyPath(circles,extra));
    // Independent subtle ring shadows follow each dial; no black face fills
    // the carbon area separating the instruments.
    for(const [id, dial] of [
      ["civic-shadow-aux", aux],
      ["civic-shadow-rpm", rpmCircle],
      ["civic-shadow-speed", speed]
    ]){
      const circle=civicGet(id);
      circle.setAttribute("cx",dial.cx.toFixed(2));
      circle.setAttribute("cy",dial.cy.toFixed(2));
      circle.setAttribute("r",(dial.r+5.5).toFixed(2));
    }
    // Si badge is a child of the Nitro/Turbo dial and follows its scale / X/Y automatically.
    const scale=settings.civicFrameScalePct/100,dx=settings.civicFrameOffsetX,dy=settings.civicFrameOffsetY;
    civicUi.assembly.setAttribute("transform",`translate(${dx} ${dy}) translate(470 215) scale(${scale}) translate(-470 -215)`);
    // The actual filled shell + its trim/grain are ONE opacity group.
    // 0% = fully transparent chassis (dials remain visible); 100% = opaque.
    civicGet("civic-chassis").style.opacity=String(settings.hudBackgroundOpacity/100);
  }
  function civicVisibility(){
    const enabled=settings.hudStyle==="civic"&&settings.hudMode==="full";
    civicUi.panel.style.display=enabled?"block":"none";
    if(!enabled)return;
    civicUi.rpm.style.display=settings.showRpm?"":"none";
    civicUi.speed.style.display=(settings.showSpeed||settings.showGear||settings.analogOdometerEnabled)?"":"none";
    civicUi.aux.style.display=(settings.showTurbo||settings.showNitro)?"":"none";
    civicGet("civic-rpm-needle").style.display=settings.showRpm?"":"none";
    civicGet("civic-speed-needle").style.display=settings.showSpeed?"":"none";
    civicGet("civic-nitro-needle").style.display=settings.showNitro?"":"none";
    civicGet("civic-turbo-needle").style.display=settings.showTurbo?"":"none";
    civicGet("civic-odometer").style.display=settings.analogOdometerEnabled?"":"none";
    civicGet("civic-gear").style.display=settings.showGear?"":"none";
    civicGet("civic-shift-lights").style.display=settings.showShift?"":"none";
    for(const [name,row] of Object.entries(civicUi.icons))row.style.display=settings.showIcons&&settings[`show${name==='tyre'?'Tyre':name==='engine'?'Engine':'Susp'}Icon`]?"":"none";
    civicLayout();
  }
  // CIV_GEAR: one rolling character on each shift, matching the ODO drum.
  // Only schedule frames when the gear actually changes, not on every car-feed tick.
  let civicLastGear=null,civicGearFrame=0;
  function civicRollingGearUpdate(nextValue){
    const value=String(nextValue??"N");
    if(value===civicLastGear)return;
    const prev=civicLastGear;
    civicLastGear=value;
    if(civicGearFrame){cancelAnimationFrame(civicGearFrame);civicGearFrame=0;}
    const wheel=civicUi.gearRoll;
    const finish=()=>{
      civicUi.gear.textContent=value;
      civicUi.gearNext.textContent=value;
      wheel.setAttribute("transform","translate(0 0)");
      civicGearFrame=0;
    };
    if(prev===null || !settings.showGear || settings.hudPerformanceMode==="eco"){
      finish();return;
    }
    civicUi.gear.textContent=prev;
    civicUi.gearNext.textContent=value;
    const t0=performance.now(), duration=285;
    const frame=now=>{
      if(civicLastGear!==value){civicGearFrame=0;return;}
      const x=Math.min(1,(now-t0)/duration);
      const easing=1-Math.pow(1-x,3);
      wheel.setAttribute("transform",`translate(0 ${(-18*easing).toFixed(2)})`);
      if(x>=1)finish();else civicGearFrame=requestAnimationFrame(frame);
    };
    civicGearFrame=requestAnimationFrame(frame);
  }
  // Simulated engagement: ON at 5600 RPM, OFF below 5500 to avoid
  // rapid flickering around the threshold. This is not an ECU VTEC signal.
  let civicVtecActive=false;
  function civicVtecUpdate(rpm){
    const next=civicVtecActive ? rpm>=5500 : rpm>=5600;
    if(next===civicVtecActive)return;
    civicVtecActive=next;
    civicUi.vtec.classList.toggle("is-on",next);
    civicUi.vtec.setAttribute("aria-label",next?"VTEC simulated: active":"VTEC simulated: off");
    civicUi.vtecText.setAttribute("x",next?"56":"44");
  }
  function civicUpdate(rpm,rpmMax,redline,kmh,nitro,gear){
    if(settings.hudStyle!=="civic"||settings.hudMode!=="full")return;
    civicVtecUpdate(rpm);
    const rpmScale=civicRpmScale(rpmMax,redline);
    civicRotate(civicUi.rpmNeedle,232+256*clamp(rpm/rpmScale,0,1),178,228);
    civicRotate(civicUi.speedNeedle,232+256*clamp(kmh/400,0,1),482,205);
    civicRotate(civicUi.nitroNeedle,225+90*clamp(nitro/NITRO_CAPACITY,0,1),706,245);
    civicRotate(civicUi.turboNeedle,160-140*clamp(turboDisplay,0,1),817,245);
    civicRollingGearUpdate(gear);
  }

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
    const civicValue=selectedOdometerCar?value:"--------.-";
    setText(analogUi.odo,value); // GT-R uses its original static SVG value.
    setText(get("modern-odo-digits"),value);
    civicOdometerUpdate(); // original Civic wheel code retained for compatibility.
    const tenths=selectedOdometerCar?odometerTenths(odometerKm):null;
    updateOdoDrum(corollaOdoDrum,value,tenths,selectedOdometerCar,true,settings.hudStyle==='corolla');
    updateOdoDrum(hondaOdoDrum,civicValue,tenths,selectedOdometerCar,false,settings.hudStyle==='civic');
    if(rx7Ui.odo)rx7Ui.odo.textContent=civicValue;
    ensureLegacyOdometerOption();
    const select=mget("odometerCarSelect");
    if(select){
      if(select.value!==selectedOdometerCar)select.value=selectedOdometerCar;
      select.disabled=!odometerReady; // initial async storage restore must finish first
    }
    const styleNode=mget("carAssignedHudValue");
    if(styleNode)styleNode.textContent=ODOMETER_CAR_IDS.has(selectedOdometerCar)
      ? (HUD_STYLES[carHudStyleFor(selectedOdometerCar)]?.name || "Modern HUD")
      : "Select a car";
    const styleButton=mget("carAssignCurrentHud");
    if(styleButton)styleButton.disabled=!ODOMETER_CAR_IDS.has(selectedOdometerCar);
    const styleReset=mget("carResetAssignedHud");
    if(styleReset)styleReset.disabled=!ODOMETER_CAR_IDS.has(selectedOdometerCar);
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
    shiftGuide.reset(); // A manually switched car may have a different shift point.
    odometerRevision++;odometerDirty=true;
    odometerResetArmedAt=0;mget("odometerReset").textContent="Reset selected car";
    updateOdometerDisplay();
    // Car choice is authoritative for mileage AND its saved/factory HUD skin.
    // Manual HUD Style choices remain independent and never rewrite ODO.
    if(ODOMETER_CAR_IDS.has(carId)){
      const nextStyle=carHudStyleFor(carId);
      if(settings.hudStyle!==nextStyle)changeSetting("hudStyle",nextStyle);
    }
    void saveOdometer(true);
    const carName=carId===ODOMETER_LEGACY_ID?"Previous ODO":ODOMETER_CARS.find(([id])=>id===carId)?.[1]||"No car";
    odometerStatus(`${carName} selected. ODO and assigned HUD loaded; manual HUD override is available.`);
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
  const A_START=135, A_SWEEP=270, TURBO_SWEEP=193;
  const svgNS="http://www.w3.org/2000/svg";
  let analogLastRpmMax=0, analogLastRpmRedline=0, analogLastSpeedUnit="",analogLastTurboValue=-1;
  // Angles go clockwise from lower left across the top to lower right.
  function analogXY(cx,cy,r,angle){const rad=angle*Math.PI/180;return [cx+Math.cos(rad)*r,cy+Math.sin(rad)*r];}
  function analogArc(cx,cy,r,from,to){
    const [x0,y0]=analogXY(cx,cy,r,from),[x1,y1]=analogXY(cx,cy,r,to);
    return `M${x0.toFixed(2)},${y0.toFixed(2)} A${r},${r} 0 ${Math.abs(to-from)>180?1:0} 1 ${x1.toFixed(2)},${y1.toFixed(2)}`;
  }
  function analogDialScale(root,cx,cy,r,max,labelStep,tickStep,fmt,sweep=A_SWEEP){
    root.replaceChildren();
    const frag=document.createDocumentFragment();
    for(let v=0,i=0;i<=Math.round(max/tickStep);i++){
      v=Math.min(max,i*tickStep);
      const major=Math.abs(v/labelStep-Math.round(v/labelStep))<1e-5;
      const angle=A_START+sweep*(v/max);
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
  // Turbo Load: keep the original themeable colors, numeric labels, dial
  // geometry and asymmetric needle smoothing from v0.9.34. Place the short
  // redline ENTIRELY between 2.5 and 3.0, without extending past the 3.0 tick.
  // Simulated engine load, NOT actual turbo boost/PSI.
  analogDialScale(analogUi.turboTicks,89,236,61,3,0.5,0.1,v=>v===0?"0":v.toFixed(1),TURBO_SWEEP);
  const turboRedStart=A_START+TURBO_SWEEP*(2.65/3);
  const turboRedEnd=A_START+TURBO_SWEEP*(2.95/3);
  analogUi.turboRed.setAttribute("d",analogArc(89,236,62,turboRedStart,turboRedEnd));
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
    const corolla=settings.hudStyle==="corolla";
    const cacheKey=unit+(corolla?":corolla":":gtr");
    if(analogLastSpeedUnit===cacheKey)return;
    analogLastSpeedUnit=cacheKey;
    if(corolla){
      // A true dual-scale Corolla instrument: white outer mph and amber inner
      // km/h, with a fixed 0-400 km/h sweep (approx. 0-250 mph).
      analogDialScale(analogUi.speedTicks,595,164,131,250,50,5,v=>String(v));
      analogUi.corollaKmh.replaceChildren();
      const frag=document.createDocumentFragment();
      for(let kmh=0;kmh<=400;kmh+=20){
        const a=A_START+A_SWEEP*(kmh/400);
        const [x1,y1]=analogXY(595,164,87, a);
        const [x2,y2]=analogXY(595,164,94, a);
        const mark=document.createElementNS(svgNS,"line");
        mark.setAttribute("class","corolla-inner-tick");
        for(const [k,v] of Object.entries({x1,y1,x2,y2}))mark.setAttribute(k,v.toFixed(1));
        frag.append(mark);
        if(kmh%80===0){
          const [tx,ty]=analogXY(595,164,75,a);
          const lbl=document.createElementNS(svgNS,"text");
          lbl.setAttribute("class","corolla-kmh-number");
          lbl.setAttribute("x",tx.toFixed(1));lbl.setAttribute("y",ty.toFixed(1));
          lbl.textContent=String(kmh);frag.append(lbl);
        }
      }
      analogUi.corollaKmh.append(frag);
      // Speedometers have no engine redline, regardless of units or vehicle.
    }else{
      const max=unit==="mph"?250:400,step=unit==="mph"?25:40;
      analogDialScale(analogUi.speedTicks,595,164,131,max,step,step/5,v=>String(v));
    }
    setText(analogUi.speedUnit,corolla?"MPH":(unit==="mph"?"MPH":"KM/H"));
  }
  // Use one cheap SVG rotation per needle, no secondary animation loop.
  function analogNeedle(el,value,max,cx,cy,sweep=A_SWEEP){
    const rotation=225+sweep*clamp(value/Math.max(max,.01),0,1);
    const target=`rotate(${rotation.toFixed(2)} ${cx} ${cy})`;
    if(el.getAttribute("transform")!==target)el.setAttribute("transform",target);
  }
  const analogLabels={tyre:"TYRES",engine:"ENGINE",susp:"SUSP"};
  const analogLabelTimers={tyre:null,engine:null,susp:null};
  function analogSetIndicator(name,status,label){
    const row=analogUi[name];if(!row)return;
    row.classList.toggle("warning-yellow",status==="yellow");
    row.classList.toggle("warning-red",status==="red");
    const retroRow=analogUi.corollaStatusRows[name];
    if(retroRow){
      retroRow.classList.toggle("warning-yellow",status==="yellow");
      retroRow.classList.toggle("warning-red",status==="red");
    }
    const civicRow=civicUi.icons[name];
    if(civicRow){
      civicRow.classList.toggle("warning-yellow",status==="yellow");
      civicRow.classList.toggle("warning-red",status==="red");
    }
    const civicNewRow=civ2Ui.icons[name];
    if(civicNewRow){civicNewRow.classList.toggle("warning-yellow",status==="yellow");civicNewRow.classList.toggle("warning-red",status==="red");}
    const rx7Row=rx7Ui.icons[name];
    if(rx7Row){
      rx7Row.classList.toggle("warning-yellow",status==="yellow");
      rx7Row.classList.toggle("warning-red",status==="red");
    }
    const next=label==="COILOVER"?"SUSP":label;
    if(analogLabelTimers[name]!==null){clearTimeout(analogLabelTimers[name]);analogLabelTimers[name]=null;}
    if(analogLabels[name]!==next){
      analogLabels[name]=next;
      row.classList.remove("label-changing");
      setText(aget(`analog-${name}-label`),analogLabels[name]);
      // Corolla has fixed TYRES / ENGINE / SUSP legends. State is conveyed
      // by the single lamp and icon color, not lengthy dynamic labels.
    }
  }
  function analogVisibility(){
    const active=(settings.hudStyle==="analog"||settings.hudStyle==="corolla")&&settings.hudMode==="full";
    analogUi.panel.classList.toggle("analog-hide",!active);
    const vis=(id,v)=>aget(id).classList.toggle("analog-hide",!v);
    vis("analog-turbo-face",settings.showTurbo);
    vis("analog-rpm-face",settings.showRpm);
    vis("analog-nitro",settings.showRpm&&settings.showNitro);
    vis("analog-shift",settings.showRpm&&settings.showShift);
    vis("analog-speed-face",settings.showSpeed||settings.showGear||settings.analogOdometerEnabled||(settings.showIcons&&(settings.showTyreIcon||settings.showEngineIcon||settings.showSuspIcon)));
    vis("analog-speed-ticks",settings.showSpeed);vis("analog-speed-needle",settings.showSpeed);
    vis("analog-speed-digits",settings.showSpeed);vis("corolla-speed-kmh",settings.showSpeed&&settings.hudStyle==="corolla");
    vis("analog-gear",settings.showGear);
    vis("analog-odometer",settings.analogOdometerEnabled);
    vis("analog-status",settings.showIcons&&(settings.showTyreIcon||settings.showEngineIcon||settings.showSuspIcon));
    vis("corolla-status-panel",settings.hudStyle==="corolla"&&settings.showIcons&&(settings.showTyreIcon||settings.showEngineIcon||settings.showSuspIcon));
    vis("corolla-tyre",settings.showIcons&&settings.showTyreIcon);
    vis("corolla-engine",settings.showIcons&&settings.showEngineIcon);
    vis("corolla-susp",settings.showIcons&&settings.showSuspIcon);
    vis("corolla-nitro",settings.hudStyle==="corolla"&&settings.showNitro);
    vis("analog-tyre",settings.showIcons&&settings.showTyreIcon);
    vis("analog-engine",settings.showIcons&&settings.showEngineIcon);
    vis("analog-susp",settings.showIcons&&settings.showSuspIcon);
    civicVisibility();
  }
  analogScaleForSpeed("kmh");analogScaleForRpm(9000,7600);

  // Scale the dial around its own needle hub: its centre does not drift and
  // its labels, backing rim and needle move together. No CSS scale on the page.
  function setDialTransform(el,x,y,cx,cy,pct){
    if(!el)return;
    const scale=pct/100;
    const value=pct===100 ? `translate(${x} ${y})` :
      `translate(${x} ${y}) translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`;
    if(el.getAttribute("transform")!==value)el.setAttribute("transform",value);
  }
  // Reshape the combined Corolla bezel around the ACTUAL transformed rim
  // extents, not the original fixed positions. The housing is a single SVG
  // silhouette and therefore contains no seams between separately scaled dials.
  // Status lamps and Nitro are included in the shape; their own panels stay fixed.
  function updateCorollaFrame(positions){
    const frame=analogUi.corollaFrameBase;
    if(!frame)return;
    const pad=9;
    const circles=[
      {cx:89+positions.turbo.x, cy:236+positions.turbo.y, r:78*positions.turbo.scale+pad},
      {cx:304+positions.rpm.x, cy:199+positions.rpm.y, r:116*positions.rpm.scale+pad},
      {cx:595+positions.speed.x, cy:164+positions.speed.y, r:147*positions.speed.scale+pad}
    ];
    const [turbo,rpm,speed]=circles;
    // The original reference places status lamps between the middle/right
    // dials and Nitro in the shelf below RPM. Both always belong to the body.
    const shelf={x0:222,x1:488,y0:303,y1:352,r:12};
    const status={x0:396,x1:508,y0:98,y1:288,r:9};
    // A low connector guarantees a continuous shell even with moved dials.
    const bottomBridge={x0:turbo.cx,x1:speed.cx,y0:194,y1:304,r:24};
    // The upper bridge keeps a subtle, old-school stepped shoulder between
    // RPM and the speed dial, rather than a rigid rectangular background.
    const upperBridge={x0:rpm.cx+rpm.r*.45,x1:speed.cx-speed.r*.45,
                       y0:88,y1:275,r:20};
    const rects=[shelf,status,bottomBridge,upperBridge].filter(b=>b.x1>b.x0+6);
    const xmin=Math.min(...circles.map(c=>c.cx-c.r),...rects.map(r=>r.x0));
    const xmax=Math.max(...circles.map(c=>c.cx+c.r),...rects.map(r=>r.x1));
    const steps=Math.min(650,Math.max(130,Math.ceil((xmax-xmin)/3)));
    const top=[],bottom=[];
    // Rounded-rectangle Y envelope at a given x.
    const rectY=(x,q)=>{
      if(x<q.x0||x>q.x1)return null;
      const radius=Math.min(q.r,(q.x1-q.x0)/2,(q.y1-q.y0)/2);
      let inset=0;
      if(x<q.x0+radius){const dx=q.x0+radius-x;inset=radius-Math.sqrt(Math.max(0,radius*radius-dx*dx));}
      else if(x>q.x1-radius){const dx=x-(q.x1-radius);inset=radius-Math.sqrt(Math.max(0,radius*radius-dx*dx));}
      return [q.y0+inset,q.y1-inset];
    };
    const n=v=>Math.round(v*10)/10;
    for(let i=0;i<=steps;i++){
      const x=xmin+(xmax-xmin)*i/steps;
      let yTop=Infinity,yBottom=-Infinity;
      for(const c of circles){
        const dx=x-c.cx;
        if(Math.abs(dx)>c.r)continue;
        const half=Math.sqrt(Math.max(0,c.r*c.r-dx*dx));
        yTop=Math.min(yTop,c.cy-half);yBottom=Math.max(yBottom,c.cy+half);
      }
      for(const q of rects){
        const ys=rectY(x,q);
        if(ys){yTop=Math.min(yTop,ys[0]);yBottom=Math.max(yBottom,ys[1]);}
      }
      if(Number.isFinite(yTop) && Number.isFinite(yBottom)){
        top.push([n(x),n(yTop)]);bottom.push([n(x),n(yBottom)]);
      }
    }
    if(top.length<4)return;
    const path='M '+top.map(p=>p.join(' ')).join(' L ')+
      ' L '+bottom.reverse().map(p=>p.join(' ')).join(' L ')+' Z';
    for(const el of [analogUi.corollaFrameShadow,frame,analogUi.corollaFrameGrain,
                     analogUi.corollaFrameHighlight]){
      if(el?.getAttribute('d')!==path)el?.setAttribute('d',path);
    }
    // One exact silhouette is used by the shell and the foreground clipping.
    // A local dial cannot visually escape the integrated housing.
    if(analogUi.corollaClipPath?.getAttribute('d')!==path)
      analogUi.corollaClipPath?.setAttribute('d',path);
  }

  function applyAnalogLayout(){
    const retro=settings.hudStyle==="corolla";
    // Corolla: all three needle hubs aligned on the same retro instrument row.
    // Saved user X/Y offsets are preserved; the shared frame stays put.
    const keyPrefix=retro?'corolla':'analog';
    const zero=(part,axis)=>originValue(keyPrefix+part+'Offset'+axis);
    const turboX=(retro?-4:15)+zero('Turbo','X')+gaugeValue("analogTurboOffsetX"),
      turboY=(retro?-56:0)+zero('Turbo','Y')+gaugeValue("analogTurboOffsetY");
    const rpmX=(retro?-24:0)+zero('Rpm','X')+gaugeValue("analogRpmOffsetX"),
      rpmY=(retro?-19:0)+zero('Rpm','Y')+gaugeValue("analogRpmOffsetY");
    const speedX=(retro?47:-33)+zero('Speed','X')+gaugeValue("analogSpeedOffsetX"),
      speedY=(retro?16:0)+zero('Speed','Y')+gaugeValue("analogSpeedOffsetY");
    setDialTransform(analogUi.turboBack,turboX,turboY,89,236,gaugeValue("analogTurboSizePct"));
    setDialTransform(analogUi.turboFace,turboX,turboY,89,236,gaugeValue("analogTurboSizePct"));
    setDialTransform(analogUi.rpmBack,rpmX,rpmY,304,199,gaugeValue("analogRpmSizePct"));
    setDialTransform(analogUi.rpmFace,rpmX,rpmY,304,199,gaugeValue("analogRpmSizePct"));
    setDialTransform(analogUi.speedBack,speedX,speedY,595,164,gaugeValue("analogSpeedSizePct"));
    setDialTransform(analogUi.speedFace,speedX,speedY,595,164,gaugeValue("analogSpeedSizePct"));
    // Corolla uses its true 820 x 385 SVG coordinate system; preserve the
    // original geometry and scale for GT-R Analog when switching back.
    const svgBox=retro?'0 0 820 385':'0 0 735 345';
    if(analogUi.analogSvg.getAttribute('viewBox')!==svgBox)analogUi.analogSvg.setAttribute('viewBox',svgBox);
    if(retro)updateCorollaFrame({
      turbo:{x:turboX,y:turboY,scale:gaugeValue("analogTurboSizePct")/100},
      rpm:{x:rpmX,y:rpmY,scale:gaugeValue("analogRpmSizePct")/100},
      speed:{x:speedX,y:speedY,scale:gaugeValue("analogSpeedSizePct")/100}
    });
    // Entire Corolla chassis is a rigid group: moving/zooming it also moves
    // every nested instrument, warning lamp, label, nitro ribbon and ODO.
    const assembly=analogUi.corollaAssembly;
    const scale=retro?settings.corollaFrameScalePct/100:1;
    const dx=retro?settings.corollaFrameOffsetX:0;
    const dy=retro?settings.corollaFrameOffsetY:0;
    const transform=retro
      ? `translate(${dx} ${dy}) translate(410 192) scale(${scale}) translate(-410 -192)`
      : "";
    if(assembly.getAttribute("transform")!==transform)
      assembly.setAttribute("transform",transform);
    // Toyota original ODO stays complete: label, distance and all three bezel
    // rectangles move down by 2 actual SVG pixels. The speed rim has >17px of
    // clearance at both lower corners, so the shell/clip cannot be touched.
    // Reserve 1px fallback for any future geometry with <5px clearance.
    const odoClearance=147-Math.hypot(64,276-164);
    const odoDy=odoClearance<5?1:2;
    if(retro){
      const value=`translate(0 ${odoDy})`;
      if(analogUi.odoGroup.getAttribute("transform")!==value)
        analogUi.odoGroup.setAttribute("transform",value);
    }else if(analogUi.odoGroup.hasAttribute("transform")){
      analogUi.odoGroup.removeAttribute("transform");
    }
    // GT-R circles keep their original full-screen independent positioning.
  }
  applyAnalogLayout();

  function applyRx7Layout(){
    const tr=(name,settingsPrefix)=>{
      const element=rx7Ui.groups[name];if(!element)return;
      const keyX=settingsPrefix+'OffsetX',keyY=settingsPrefix+'OffsetY';
      const dx=originValue(keyX)+settings[keyX],dy=originValue(keyY)+settings[keyY];
      const scale=settings[settingsPrefix+'SizePct']/100;
      const value=`translate(${dx}px,${dy}px) scale(${scale})`;
      if(element.style.transform!==value)element.style.transform=value;
    };
    tr('turbo','rx7Turbo');tr('nitro','rx7Nitro');tr('rpm','rx7Rpm');tr('speed','rx7Speed');
  }
  applyRx7Layout();

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
  setHudHostStyle(speedFxHost, {"position":"fixed","inset":"0","width":"100vw","height":"100vh","z-index":"2147483645","pointer-events":"none","overflow":"hidden"});
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
  ensureShadowStyles(speedFxShadow);
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
  setHudHostStyle(impactFxHost, {"position":"fixed","inset":"0","z-index":"2147483646","pointer-events":"none","overflow":"hidden"});
  const impactFxShadow=impactFxHost.attachShadow({mode:"closed"});
  impactFxShadow.innerHTML=`<style>
    :host{all:initial;pointer-events:none!important;}
    #impact-flash{position:absolute;inset:0;pointer-events:none!important;opacity:0;}
  </style><div id="impact-flash" aria-hidden="true"></div>`;
  ensureShadowStyles(impactFxShadow);
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
    if(settings.impactFeedbackShake && level!=="light" && typeof hud.animate==="function" &&
       !window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches &&
       host.style.display!=="none"){
      // Animate the ACTUAL visible HUD, not its fixed-position host. This is
      // perceptible in both Modern and analog/Corolla skins, and never touches
      // the game camera or rendering surface. Keep the scale in every frame:
      // otherwise WAAPI's transform would temporarily discard HUD zoom.
      const scale=gaugeValue("hudScale")/100;
      const px=(level==="heavy"?28:17)*amount;
      const fmt=n=>Math.round(n*10)/10;
      const frame=(x,y,offset)=>({transform:`translate3d(${fmt(x)}px,${fmt(y)}px,0px) scale(${scale})`,offset});
      impactShakeAnimation?.cancel();
      impactShakeAnimation=hud.animate([
        frame(0,0,0), frame(px,-px*.50,.12), frame(-px*.82,px*.42,.29),
        frame(px*.66,px*.20,.44), frame(-px*.47,-px*.35,.60),
        frame(px*.22,px*.17,.76), frame(0,0,1)
      ],{duration:level==="heavy"?520:380,easing:"ease-out",iterations:1});
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
      const spacing = 15;
      // The last scale mark sits beside the Modern COILOVER indicator.
      // Bring just its NUMBER inward so 9/10/11/etc never intrudes into
      // the warning card. The RPM arc, tick geometry and other labels stay put.
      const x = n === count ? p.x - 24 : p.x + dx / length * spacing;
      const y = n === count ? p.y + 12 : p.y + dy / length * spacing;
      const label = document.createElementNS(ns,"text");
      label.setAttribute("x",String(x.toFixed(1)));
      label.setAttribute("y",String(y.toFixed(1)));
      label.setAttribute("class","dial-scale-label");
      label.textContent=String(n);
      ui.rpmTicks.append(label);
    }
  }

  // A linear full-scale sweep gives predictable 0->3.0 in 1.0 s and
  // 3.0->0 in 0.2 s by default (when the RPM/engine-load target stays at
  // maximum or minimum). This is visual telemetry, not measured boost/PSI.
  // All three HUD skins share this state and no extra animation timers run.
  function updateTurbo(now) {
    const elapsed = lastTurboRenderAt ? clamp(now-lastTurboRenderAt,0,1000) : 0;
    lastTurboRenderAt = now;
    const target=clamp(Number.isFinite(turboTarget)?turboTarget:0,0,1);
    const delta=target-turboDisplay;
    if(delta!==0){
      const travel=elapsed/Math.max(1,delta>0?settings.turboResponseMs:settings.turboReleaseMs);
      turboDisplay += Math.sign(delta)*Math.min(Math.abs(delta),travel);
      turboDisplay=clamp(turboDisplay,0,1);
    }
    if(target===0 && turboDisplay<.00001)turboDisplay=0;
    const displayTenths=Math.round(turboDisplay*30);
    const displayText=(displayTenths/10).toFixed(1);
    // Keep the original internal percentage cache for efficient DOM updates.
    const pct=Math.round(100*turboDisplay);
    if(pct!==turboLastPct || ui.turboPct.textContent!==displayText){
      turboLastPct=pct;
      ui.turboFill.style.transform=`scaleX(${turboDisplay.toFixed(4)})`;
      setText(ui.turboPct,displayText);
    }
    if(settings.hudStyle==="civic")civicRotate(civicUi.turboNeedle,160-140*clamp(turboDisplay,0,1),817,245);
    if(["analog","corolla"].includes(settings.hudStyle) && Math.abs(analogLastTurboValue-turboDisplay)>=.0005){
      analogLastTurboValue=turboDisplay;
      analogNeedle(analogUi.turboNeedle,turboDisplay*3,3,89,236,TURBO_SWEEP);
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
    analogUi.corollaStatusRows.engine.classList.toggle("damage-critical",active && settings.showIcons && settings.showEngineIcon);
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
    rx7Visibility();
    civ2Visibility();
    const anyEnabled = compact ? settings.showGear || settings.showShift || settings.showNitro
      : settings.showSpeed || settings.showGear || settings.showRpm || settings.showShift || settings.showNitro || (settings.showIcons && (settings.showTyreIcon || settings.showEngineIcon || settings.showSuspIcon)) || settings.showTurbo;
    host.style.display = settings.hudEnabled && anyEnabled && received && latest?.state?.driving !== false ? "block" : "none";
    updateDamageHud();
  }

  function applyAppearance() {
    const p = settings.hudPosition;
    // Skin switch is isolated from shared read-only telemetry and settings state.
    hud.dataset.style = settings.hudStyle;
    const analogSvg=aget("analog-svg");
    const targetViewBox=settings.hudStyle==="corolla"?"0 0 820 345":"0 0 735 345";
    if(analogSvg.getAttribute("viewBox")!==targetViewBox)analogSvg.setAttribute("viewBox",targetViewBox);
    applyAnalogLayout();
    civicLayout();
    rx7SpeedScale();
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
    hud.style.transform = `scale(${gaugeValue("hudScale") / 100})`;
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
    applyRx7Layout();
    civ2Layout();
    applyVisibility();
    updateSpeedSensation();
  }

  function analogDragRange(){
    // Convert a full viewport travel distance into unscaled SVG offset pixels.
    // Include the current saved position so resizing the browser never clamps it.
    return Math.min(20000,Math.ceil(1.45*Math.max(innerWidth,innerHeight,1000)/Math.max(.50,gaugeValue("hudScale")/100)));
  }
  function syncAnalogPositionControls(){
    const range=analogDragRange();
    for(const key of ANALOG_POSITION_KEYS){
      const slider=mget(key),input=mget(`${key}Number`);
      const value=gaugeValue(key);
      const limit=["corolla","civic"].includes(settings.hudStyle) ?
        (key.endsWith("OffsetY")?COROLLA_LOCAL_LIMIT_Y:COROLLA_LOCAL_LIMIT_X) :
        Math.min(20000,Math.max(range,Math.abs(value)));
      slider.min=String(-limit);slider.max=String(limit);
      input.min=String(-limit);input.max=String(limit);
      slider.value=String(value);
      input.value=String(value);
    }
  }
  function syncMenu() {
    for (const key of SHORTCUT_KEYS) { const el=mget(`${key}Text`); if(el)el.textContent=Hotkeys.display(settings[key]); }
    for (const key of SHORTCUT_KEYS) { const el=mget(`${key}Bind`); if(el)el.textContent=shortcutCaptureAction===key ? "Press a key... (Esc cancels)" : "Change " + (key==="shortcutMenu"?"menu":key==="shortcutToggleHud"?"HUD toggle":"SAVE ALL") + " shortcut"; }
    mget("modernColorsSettings").hidden=settings.hudStyle!=="modern";
    mget("speedDepthSettings").hidden=settings.hudStyle!=="modern";
    mget("hudTextOpacityControls").hidden=settings.hudStyle!=="modern";
    mget("analogPositionSettings").hidden=!(["analog","corolla","civic","rx7"].includes(settings.hudStyle));
    mget("rx7NitroSettings").hidden=settings.hudStyle!=="rx7";
    mget("analogPositionLegend").textContent=settings.hudStyle==="civic"?"Honda Civic Si — Instrument Size & Position":settings.hudStyle==="corolla"?"Corolla — Circle Size & Position":settings.hudStyle==="rx7"?"Mazda RX-7 — Gauge Size & Position":"GT-R Analog — Circle Size & Position";
    mget("analogResetSizes").textContent=settings.hudStyle==="civic"?"Reset Civic Sizes (85% / 95% / 95%)":settings.hudStyle==="rx7"?"Reset RX-7 Turbo/RPM/Speed Sizes to 100%":"Reset Circle Sizes to 100%";
    mget("corollaFrameSettings").hidden=settings.hudStyle!=="corolla";
    mget("civicFrameSettings").hidden=settings.hudStyle!=="civic";
    mget("analogCustomizationSettings").hidden=settings.hudStyle!=="analog"; // Corolla keeps its dedicated retro palette
    syncAnalogPositionControls();
    for (const [key, val] of Object.entries(settings)) {
      const field = mget(key);
      if (!field) continue;
      if (field.type === "checkbox") field.checked = Boolean(val);
      else field.value = String(scopedGaugeKey(key)!==key?gaugeValue(key):val);
    }
    for(const key of ['rx7NitroOffsetX','rx7NitroOffsetY','rx7NitroSizePct'])mget(key+'Value').textContent=`${settings[key]}${key.endsWith('Pct')?'%':' px'}`;
    mget("hudScaleValue").textContent = `${gaugeValue("hudScale")}%`;
    mget("hudScaleNumber").value = String(gaugeValue("hudScale"));
    mget("hudBackgroundOpacityValue").textContent = `${settings.hudBackgroundOpacity}%`;
    mget("hudTextOpacityValue").textContent = `${settings.hudTextOpacity}%`;
    mget("analogGlowPercentValue").textContent = `${settings.analogGlowPercent}%`;
    for(const key of [...COROLLA_FRAME_KEYS,...CIVIC_FRAME_KEYS]){
      const valueNode=mget(`${key}Value`);
      if(valueNode)valueNode.textContent=`${settings[key]}${key.endsWith("Pct")?"%":" px"}`;
    }
    updateOdometerDisplay();
    mget("speedSensationIntensityValue").textContent = `${settings.speedSensationIntensity}%`;
    mget("speedSensationFogPercentValue").textContent = `${settings.speedSensationFogPercent}%`;
    mget("speedSensationStartKmhValue").textContent = `${settings.speedSensationStartKmh} km/h`;
    mget("collisionMinSpeedKmhValue").textContent = `${settings.collisionMinSpeedKmh} km/h`;
    mget("collisionMinDvValue").textContent = `${settings.collisionMinDv.toFixed(1)} m/s`;
    mget("impactFeedbackIntensityValue").textContent = `${settings.impactFeedbackIntensity}%`;
    mget("impactFeedbackMediumDvValue").textContent = `${settings.impactFeedbackMediumDv.toFixed(1)} m/s`;
    mget("impactFeedbackHeavyDvValue").textContent = `${Math.max(settings.impactFeedbackHeavyDv,settings.impactFeedbackMediumDv+3).toFixed(1)} m/s`;
    for (const key of ANALOG_POSITION_KEYS) {
      const valueNode=mget(`${key}Value`);
      if(valueNode) valueNode.textContent = `${gaugeValue(key)} px`;
    }
    for (const key of ANALOG_SIZE_KEYS) {
      const valueNode=mget(`${key}Value`);
      if(valueNode) valueNode.textContent = `${gaugeValue(key)}%`;
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
    mget("turboReleaseMsValue").textContent = `${(settings.turboReleaseMs/1000).toFixed(2).replace(/0$/," ").trim()} s`;
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
    const payload={ [ACTIVE_SETTINGS_KEY]: {schema:4,settings:snapshot,savedAt:new Date().toISOString()} };
    for (const key of changed) payload[key]=snapshot[key];
    // Convert stored user profiles in the SAME transaction as the new schema.
    const savesCivicProfiles=pendingCivicProfileMigration;
    if(savesCivicProfiles)payload[PROFILE_STORE_KEY]=customProfiles.map(p=>({
      id:p.id,name:p.name,settings:normalizeSnapshot(p.settings)
    }));
    changed.forEach(key=>dirtyKeys.delete(key));
    settingsSaving=true;
    saveStatus("Saving settings...");
    // Invoke storage.set immediately so a fast page close does not discard a queued microtask.
    let write;
    try {write=hudStorage.set(payload);}
    catch(error) {write=Promise.reject(error);}
    lastSaveOperation=Promise.resolve(write).then(()=>{
      settingsSaving=false;
      if(savesCivicProfiles)pendingCivicProfileMigration=false;
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
    // UI controls use the active analog skin's independent X/Y, sizes and zoom.
    key=scopedGaugeKey(key);
    if (!(key in DEFAULTS)) return;
    const normalized = normalize(key, value);
    if (settings[key] === normalized) return;
    settings[key] = normalized;
    if (key === "hudStyle") {
      // An explicit HUD-style choice is a MANUAL OVERRIDE. It must not change
      // the selected car, saved mileage or that car's permanent style mapping.
      analogLastSpeedUnit=null; // rebuild correct single-/dual-speed scales
    }
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
    const normalized=normalizeSnapshot(snapshot);
    const layout=prefix=>({
      turbo:{x:normalized[prefix+"TurboOffsetX"],y:normalized[prefix+"TurboOffsetY"],sizePct:normalized[prefix+"TurboSizePct"]},
      rpm:{x:normalized[prefix+"RpmOffsetX"],y:normalized[prefix+"RpmOffsetY"],sizePct:normalized[prefix+"RpmSizePct"]},
      speed:{x:normalized[prefix+"SpeedOffsetX"],y:normalized[prefix+"SpeedOffsetY"],sizePct:normalized[prefix+"SpeedSizePct"]},
      hudScalePct:normalized[prefix==="corolla"?"corollaHudScalePct":prefix==="civic"?"civicHudScalePct":"analogHudScalePct"]
    });
    // Human-readable layout makes X/Y immediately visible in exported JSON.
    // Flat settings remain the canonical import keys for backward compatibility.
    const payload={format:PROFILE_FORMAT,version:2,name:cleanName,style:normalized.hudStyle,
      civicCoordinateOrigin:"zero-v0973",coordinateOrigin:"zero-v0973",
      layouts:{modernHudScalePct:normalized.hudScale,gtrAnalog:layout("analog"),toyotaCorollaRetro:{...layout("corolla"),
        wholeFrame:{x:normalized.corollaFrameOffsetX,y:normalized.corollaFrameOffsetY,
          scalePct:normalized.corollaFrameScalePct}},hondaCivicSi:{...layout("civic"),
        wholeFrame:{x:normalized.civicFrameOffsetX,y:normalized.civicFrameOffsetY,
          scalePct:normalized.civicFrameScalePct}}},
      mazdaRx7:{...layout('rx7'),nitro:{x:normalized.rx7NitroOffsetX,y:normalized.rx7NitroOffsetY,sizePct:normalized.rx7NitroSizePct}},
      carHudStyles:{...carHudStyleLinks},settings:normalized};
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
    profileMessage(`Downloaded CURRENT settings: ${name}. X/Y positions, frame sizes and all three analog layouts included.`);
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
    // Import both v0.9.73 zero-origin exports and older profiles unchanged
    // visually. Older data is converted only ONCE at the import boundary.
    const newOrigin=parsed.coordinateOrigin==="zero-v0973"||parsed.civicCoordinateOrigin==="zero-v0973";
    const legacyCivic=parsed.civicCoordinateOrigin!=="zero-v0952" && !newOrigin;
    const importedSettings=newOrigin?parsed.settings:migrateToZeroOrigin(parsed.settings,legacyCivic);
    const merged={...getActiveSnapshot(),...importedSettings};
    if(parsed.settings.hudStyle==="analog" && !Object.hasOwn(parsed.settings,"analogHudScalePct") && Object.hasOwn(parsed.settings,"hudScale")){
      merged.analogHudScalePct=parsed.settings.hudScale;
    }
    // v0.9.38 and earlier kept X/Y for both analog designs in analog* fields.
    // Older Corolla exports are migrated once into the new Corolla-only slots.
    // Use fields from settings, not decorative layouts, if both are supplied.
    if(parsed.settings.hudStyle==="corolla" &&
      !COROLLA_POSITION_KEYS.some(key=>Object.prototype.hasOwnProperty.call(parsed.settings,key))){
      for(const key of ANALOG_POSITION_KEYS){
        if(Object.prototype.hasOwnProperty.call(parsed.settings,key)){
          const target="corolla"+key.slice(6);
          merged[target]=Number(parsed.settings[key])-(newOrigin?0:originValue(target));
        }
      }
      for(const key of ANALOG_SIZE_KEYS){
        if(Object.prototype.hasOwnProperty.call(parsed.settings,key))merged["corolla"+key.slice(6)]=parsed.settings[key];
      }
      if(Object.prototype.hasOwnProperty.call(parsed.settings,"hudScale"))merged.corollaHudScalePct=parsed.settings.hudScale;
    }
    const validated=normalizeSnapshot(merged);
    const name=await addProfile(parsed.name,validated);
    await applySnapshot(validated);
    if(parsed.carHudStyles && typeof parsed.carHudStyles==="object" && !Array.isArray(parsed.carHudStyles)){
      carHudStyleLinks=cleanCarHudStyles(parsed.carHudStyles);
      await saveCarHudStyles();
      updateOdometerDisplay();
    }
    profileMessage(`Imported settings, car/HUD links, and all frame and circle X/Y and sizes: ${name}.`);
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
    else {shortcutCaptureAction=null;flushChanges();}
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
    const expectedCarStyles={...carHudStyleLinks};
    const expectedCar=selectedOdometerCar;
    const expectedKm=expectedCar?odometerKm:0;
    for(const key of Object.keys(DEFAULTS))dirtyKeys.add(key);
    showSaveToast("Saving HUD + mileage…");
    void (async()=>{
      await Promise.all([flushChanges(),saveOdometer(true),saveCarHudStyles()]);
      // Read back from the browser rather than trusting dirty flags. Newer
      // changes after pressing Save are allowed to remain pending.
      let stored=await hudStorage.get([ACTIVE_SETTINGS_KEY,ODOMETER_PRIMARY_STORE_KEY,ODOMETER_STORE_KEY,ODOMETER_SELECTED_KEY,CAR_HUD_STYLE_STORE_KEY]);
      const matches=values=>{
        const storedSettings=values?.[ACTIVE_SETTINGS_KEY]?.settings;
        const storedOdo=values?.[ODOMETER_PRIMARY_STORE_KEY] || values?.[ODOMETER_STORE_KEY];
        const settingsOk=storedSettings && Object.entries(expectedSettings).every(([key,value])=>storedSettings[key]===value);
        const storedCarStyles=values?.[CAR_HUD_STYLE_STORE_KEY]?.styles;
        const linksOk=storedCarStyles && JSON.stringify(storedCarStyles)===JSON.stringify(expectedCarStyles);
        const odoKm=expectedCar?Number(storedOdo?.cars?.[expectedCar]):0;
        const odoOk=[2,3].includes(storedOdo?.version) && storedOdo.selectedCar===expectedCar &&
          values?.[ODOMETER_SELECTED_KEY]===expectedCar &&
          (!expectedCar || (Number.isFinite(odoKm)&&odoKm+1e-7>=expectedKm));
        return Boolean(settingsOk&&odoOk&&linksOk);
      };
      if(!matches(stored)){
        // A previous write or another explicit Save may have overlapped.
        // Flush once more before considering the result incomplete.
        await Promise.all([flushChanges(),saveOdometer(true),saveCarHudStyles()]);
        stored=await hudStorage.get([ACTIVE_SETTINGS_KEY,ODOMETER_PRIMARY_STORE_KEY,ODOMETER_STORE_KEY,ODOMETER_SELECTED_KEY,CAR_HUD_STYLE_STORE_KEY]);
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
    if (shortcutCaptureAction) {
      if(event.repeat)return;
      if(event.code==="Escape"){
        event.preventDefault();event.stopImmediatePropagation();
        shortcutCaptureAction=null;syncMenu();saveStatus("Shortcut recording cancelled.");return;
      }
      if(["ControlLeft","ControlRight","AltLeft","AltRight","ShiftLeft","ShiftRight","MetaLeft","MetaRight"].includes(event.code))return;
      event.preventDefault();event.stopImmediatePropagation();
      const shortcut=Hotkeys.fromEvent(event);
      if(!shortcut){saveStatus("Invalid shortcut. For letters/numbers hold Ctrl or Alt; Esc cancels.",true);return;}
      const action=shortcutCaptureAction;
      if(SHORTCUT_KEYS.some(key=>key!==action && settings[key]===shortcut)){
        saveStatus("That shortcut is already assigned to another HUD action.",true);return;
      }
      if(action!=="shortcutMenu" && shortcut===Hotkeys.TKL_MENU_FALLBACK){
        saveStatus("Ctrl + Alt + M is reserved as a backup menu shortcut.",true);return;
      }
      shortcutCaptureAction=null;
      changeSetting(action,shortcut);
      syncMenu();saveStatus("Keyboard shortcut saved: "+Hotkeys.display(shortcut));return;
    }
    if (menuOpen && event.key === "Escape") {
      event.preventDefault();event.stopImmediatePropagation();toggleMenu(false);return;
    }
    const actualTarget=typeof event.composedPath==="function" ? event.composedPath()[0] : event.target;
    if (event.repeat || event.metaKey || isInput(actualTarget)) return;
    const pressed=Hotkeys.fromEvent(event);
    if(!pressed)return;
    let action=SHORTCUT_KEYS.find(key=>settings[key]===pressed);
    if(!action && pressed===Hotkeys.TKL_MENU_FALLBACK)action="shortcutMenu";
    if(!action)return;
    event.preventDefault();event.stopImmediatePropagation();
    if(action==="shortcutSaveAll")saveAllCurrentSettings();
    else if(action==="shortcutMenu")toggleMenu();
    else changeSetting("hudEnabled",!settings.hudEnabled);
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
  for(const key of SHORTCUT_KEYS)mget(`${key}Bind`).addEventListener("click",()=>{
    shortcutCaptureAction=key;
    syncMenu();saveStatus("Press the new shortcut for "+key+" (Esc to cancel).");
  });
  mget("shortcutResetDefaults").addEventListener("click",()=>{
    shortcutCaptureAction=null;
    for(const key of SHORTCUT_KEYS)changeSetting(key,Hotkeys.DEFAULTS[key]);
    syncMenu();saveStatus("Keyboard shortcuts reset to original Numpad defaults. ODO and HUD untouched.");
  });

  mget("odometerCarSelect").addEventListener("change",e=>selectOdometerCar(e.target.value));
  mget("carAssignCurrentHud").addEventListener("click",()=>{
    const car=selectedOdometerCar;
    if(!ODOMETER_CAR_IDS.has(car))return odometerStatus("Select a car first.",true);
    carHudStyleLinks[car]=settings.hudStyle;
    updateOdometerDisplay();
    void saveCarHudStyles().then(()=>odometerStatus("HUD assignment saved for this car model."))
      .catch(error=>odometerStatus("Failed to save HUD assignment: "+error.message,true));
  });
  mget("carResetAssignedHud").addEventListener("click",()=>{
    const car=selectedOdometerCar;
    if(!ODOMETER_CAR_IDS.has(car))return;
    delete carHudStyleLinks[car];
    const style=carHudStyleFor(car);
    if(settings.hudStyle!==style)changeSetting("hudStyle",style);
    updateOdometerDisplay();
    void saveCarHudStyles().then(()=>odometerStatus("Factory HUD restored for selected car."))
      .catch(error=>odometerStatus("Failed to reset car HUD assignment: "+error.message,true));
  });
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
  // Per-style precise HUD Scale entry (not limited to slider presets).
  mget("hudScaleNumber").addEventListener("change",()=>{
    const field=mget("hudScaleNumber");
    if(field.value.trim()!=="" && Number.isFinite(Number(field.value)))changeSetting("hudScale",field.value);
    else syncMenu();
  });
  // Precise X/Y input is independent of slider dragging and persists like any setting.
  for(const key of ANALOG_POSITION_KEYS){
    const number=mget(`${key}Number`);
    number.addEventListener("change",()=>{
      if(number.value.trim()!=="" && Number.isFinite(Number(number.value)))changeSetting(key,number.value);
      else syncMenu();
    });
  }
  mget('rx7NitroReset').addEventListener('click',()=>{
    for(const key of ['rx7NitroOffsetX','rx7NitroOffsetY','rx7NitroSizePct'])changeSetting(key,DEFAULTS[key]);
    saveStatus('RX-7 Nitro position/size restored.');
  });
  mget("analogResetPositions").addEventListener("click",()=>{
    for(const key of ANALOG_POSITION_KEYS)changeSetting(key,DEFAULTS[scopedGaugeKey(key)]);
    saveStatus("Original analog circle positions restored. Other settings unchanged.");
  });
  mget("analogResetSizes").addEventListener("click",()=>{
    const civic=settings.hudStyle==="civic";
    for(const key of ANALOG_SIZE_KEYS)changeSetting(key,civic?DEFAULTS[scopedGaugeKey(key)]:100);
    saveStatus(civic?"Civic sizes reset to factory 85% Nitro/Turbo, 95% RPM and Speed.":"All circle sizes reset to 100%. Positions and other settings preserved.");
  });
  mget("civicFrameReset").addEventListener("click",()=>{
    for(const key of CIVIC_FRAME_KEYS)changeSetting(key,DEFAULTS[key]);
    saveStatus("Civic frame scale/X/Y restored; other layouts and ODO unchanged.");
  });
  mget("corollaFrameReset").addEventListener("click",()=>{
    for(const key of COROLLA_FRAME_KEYS)changeSetting(key,DEFAULTS[key]);
    saveStatus("Corolla whole-frame scale/X/Y restored; circle sizes, ODO and GT-R unchanged.");
  });

  mget("turboStartRpmInput").addEventListener("change", event => {
    const value = Number(event.target.value);
    if (Number.isFinite(value) && value >= 800 && value <= 10000) changeSetting("turboStartRpm", value);
    else syncMenu();
  });

  // GT-R + COROLLA GEAR — one rolling numeral inside the same gear window.
  // Animation runs only when the displayed gear changes.
  let analogLastGear=null,analogGearFrame=0;
  function analogRollingGearUpdate(newGear){
    const gear=String(newGear??"N");
    if(gear===analogLastGear)return;
    const previous=analogLastGear;
    analogLastGear=gear;
    if(analogGearFrame){cancelAnimationFrame(analogGearFrame);analogGearFrame=0;}
    const roller=analogUi.gearRoll;
    const finish=()=>{
      analogUi.gear.textContent=gear;
      analogUi.gearNext.textContent=gear;
      roller.setAttribute("transform","translate(0 0)");
      analogGearFrame=0;
    };
    if(previous===null||!settings.showGear||settings.hudPerformanceMode==="eco"){
      finish();return;
    }
    analogUi.gear.textContent=previous;
    analogUi.gearNext.textContent=gear;
    const began=performance.now(),duration=285;
    const frame=now=>{
      if(analogLastGear!==gear){analogGearFrame=0;return;}
      const t=Math.min(1,(now-began)/duration);
      const eased=1-(1-t)*(1-t)*(1-t);
      roller.setAttribute("transform",`translate(0 ${(-22*eased).toFixed(2)})`);
      if(t<1)analogGearFrame=requestAnimationFrame(frame);else finish();
    };
    analogGearFrame=requestAnimationFrame(frame);
  }
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
    const analogActive=["analog","corolla"].includes(settings.hudStyle)&&settings.hudMode==="full";
    const civicActive=settings.hudStyle==="civic"&&settings.hudMode==="full";
    const rx7Active=settings.hudStyle==="rx7"&&settings.hudMode==="full";
    if(!analogActive)analogLastGear=null;
    if (analogActive) {
      if(settings.showSpeed){analogScaleForSpeed(settings.speedUnit);
        // Corolla needle follows the true 0-400 km/h range; both printed
        // scales stay synchronized regardless of the user's digital unit.
        analogNeedle(analogUi.speedNeedle,settings.hudStyle==="corolla"?kmh:selectedSpeed,
          settings.hudStyle==="corolla"?400:(settings.speedUnit==="mph"?250:400),595,164);}
      if(settings.showRpm){analogScaleForRpm(scaleMax,redline);analogNeedle(analogUi.rpmNeedle,rpm,scaleMax,304,199);}
      if(settings.showGear){
        analogRollingGearUpdate(gearText(d.gear));
      }
    }
    const nitro = Number.isFinite(d.nitrous) ? clamp(d.nitrous, 0, NITRO_CAPACITY) : 0;
    const gear = gearText(d.gear);
    if(civicActive){civicUpdate(rpm,scaleMax,redline,kmh,nitro,gear);civ2Update(rpm,scaleMax,redline,kmh,nitro,gear);}
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
    if(rx7Active)rx7Update(rpm,scaleMax,redline,kmh,nitro,gear);
    if (settings.showShift) {
      const state=shiftGuide.update(d,now,settings);
      if(civicActive){const leds=civicGet("civic-shift-lights");leds.classList.toggle("near",state.state==="near");leds.classList.toggle("shift",state.state==="shift");civ2Ui.shift.classList.toggle("near",state.state==="near");civ2Ui.shift.classList.toggle("shift",state.state==="shift");}
      if(rx7Active){rx7Ui.shift.classList.toggle("near",state.state==="near");rx7Ui.shift.classList.toggle("shift",state.state==="shift");}
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
        analogUi.corollaNitroFill.setAttribute("width",(pct/100*141).toFixed(1));
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
      const persistedCarStyles=saved[CAR_HUD_STYLE_STORE_KEY];
      carHudStyleLinks=cleanCarHudStyles(persistedCarStyles?.version===1?persistedCarStyles.styles:null);
      const savedSchema=saved[ACTIVE_SETTINGS_KEY]?.schema;
      const hasOldCivicOrigin=savedSchema!==3&&savedSchema!==4;
      const hasPriorPositions=Object.keys(ZERO_POSITION_BASELINE).some(key=>
        Object.prototype.hasOwnProperty.call(saved,key));
      const migrateLayoutZeroOrigin=savedSchema===2||savedSchema===3||
        (savedSchema===undefined && hasPriorPositions);
      if (Array.isArray(saved[PROFILE_STORE_KEY])) {
        const cleaned=[];
        for (const profile of saved[PROFILE_STORE_KEY].slice(0,PROFILE_LIMIT)) {
          try {
            if (typeof profile.id!=="string" || !profile.id.startsWith("user:")) continue;
            const name=safeName(profile.name);if(!name)continue;
            const source=migrateLayoutZeroOrigin
              ?migrateToZeroOrigin(profile.settings,hasOldCivicOrigin):profile.settings;
            cleaned.push({id:profile.id.slice(0,96),name,settings:normalizeSnapshot(source)});
          } catch(_error) { /* Ignore damaged profile, never execute imported data. */ }
        }
        customProfiles=cleaned;
        if(migrateLayoutZeroOrigin && cleaned.length)pendingCivicProfileMigration=true;
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
      const complete=active && [2,3,4].includes(active.schema) && active.settings && typeof active.settings==="object" && !Array.isArray(active.settings) ? active.settings : null;
      const merged = {...DEFAULTS, ...saved, ...(complete || {})};
    // Preserve the Corolla layout from installations before the new
    // skin-specific settings existed, without resetting any other HUD values.
    const prior=complete||saved;
    // v0.9.73: translate old saved X/Y relative to the new zero baselines.
    // This leaves already-installed HUDs in exactly their previous positions.
    if(migrateLayoutZeroOrigin)Object.assign(merged,migrateToZeroOrigin(prior,hasOldCivicOrigin));
    // v0.9.48: older GT-R installations shared hudScale with Modern.
    // Copy their last GT-R zoom once only, without changing other skins.
    if(prior.hudStyle==="analog" && prior.analogHudScalePct===undefined && prior.hudScale!==undefined){
      merged.analogHudScalePct=prior.hudScale;
    }
    if(prior.hudStyle==="corolla" && !COROLLA_POSITION_KEYS.some(key=>
      Object.prototype.hasOwnProperty.call(prior,key))){
      for(const key of ANALOG_POSITION_KEYS)if(prior[key]!==undefined){
        const target="corolla"+key.slice(6);
        merged[target]=Number(prior[key])-(migrateLayoutZeroOrigin?originValue(target):0);
      }
      for(const key of ANALOG_SIZE_KEYS)if(prior[key]!==undefined)
        merged["corolla"+key.slice(6)]=prior[key];
      if(prior.hudScale!==undefined)merged.corollaHudScalePct=prior.hudScale;
    }
      // The popup can be used while no game tab is open. In that case flat keys
      // are newer than the complete snapshot, so keep popup-owned options.
      for(const key of ["hudEnabled","hudMode","shiftMode","manualGreenLead",...SHORTCUT_KEYS]) {
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
      // v0.9.42 turbo timing update: move the previous 0.3s stock rise
      // setting to 1.0s. Respect deliberate custom values other than 300ms.
      const migrateTurboTiming = saved._v0942_turbo_timing !== true;
      if(migrateTurboTiming && Number(merged.turboResponseMs)===300){
        merged.turboResponseMs=1000;
      }
      for (const key of Object.keys(DEFAULTS)) {
        // A user may have changed a slider while the asynchronous initial read ran.
        if (!dirtyKeys.has(key))settings[key]=normalize(key,merged[key]);
      }
      settingsReady=true;
      if(migrateLayoutZeroOrigin || pendingCivicProfileMigration){
        Object.keys(ZERO_POSITION_BASELINE).forEach(key=>dirtyKeys.add(key));
        // The whole snapshot and saved profiles are migrated atomically.
        persistSoon();
      }
      if(migrateTurboTiming){
        if(!dirtyKeys.has("turboResponseMs"))dirtyKeys.add("turboResponseMs");
        if(!dirtyKeys.has("turboReleaseMs"))dirtyKeys.add("turboReleaseMs");
        void hudStorage.set({_v0942_turbo_timing:true}).catch(error =>
          console.warn("[NFSU2 HUD] v0.9.42 turbo migration marker",error));
      }
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
