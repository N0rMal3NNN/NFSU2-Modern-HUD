/*
 * NFSU2 Modern HUD v0.3 - shift guidance (read-only).
 * The game's rpmRedline is a reference, NOT a measured optimal shift point.
 * Auto mode uses redline until high-throttle automatic upshifts are observed.
 * Manual mode uses a user-selected lead before redline (default 100 RPM).
 */
(() => {
  "use strict";
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const finite = (n) => typeof n === "number" && Number.isFinite(n);

  class ShiftGuide {
    constructor() {
      this.reset();
    }

    reset() {
      this.last = null;
      this.currentPeakRpm = 0;
      this.learned = new Map();
      this.globalLearned = null;
      this.lastGreenAt = -Infinity;
      this.confirmUntil = 0;
      this.confirmGear = 0;
      this.refRedline = null;
    }

    update(data, now, settings = {}) {
      const rpm = finite(data.rpm) ? Math.max(0, data.rpm) : 0;
      const gear = finite(data.gear) ? Math.trunc(data.gear) : 0;
      const max = finite(data.rpmMax) && data.rpmMax > 0 ? data.rpmMax : 8000;
      const redline = finite(data.rpmRedline) && data.rpmRedline > 0 ? data.rpmRedline : max;
      const throttle = finite(data.throttle) ? clamp(data.throttle, 0, 1) : null;
      const mode = settings.shiftMode === "manual" ? "manual" : "auto";
      const manualLead = [0, 100, 250].includes(settings.manualGreenLead) ? settings.manualGreenLead : 100;

      // Dont carry learned points over to cars with a different redline.
      if (this.refRedline !== null && Math.abs(redline - this.refRedline) > Math.max(250, this.refRedline * .12)) {
        this.reset();
      }
      this.refRedline = redline;

      const previous = this.last;
      const upshift = previous && previous.gear >= 1 && gear > previous.gear && gear <= previous.gear + 2;
      const sameGear = previous && previous.gear === gear;
      if (!sameGear) this.currentPeakRpm = rpm;
      else this.currentPeakRpm = Math.max(this.currentPeakRpm, rpm);

      if (upshift) {
        // Use the last RPM before the gear changes, not the droped value
        // afterwards. Skip low throttle and early shifts too.
        const sampleAge = now - previous.time;
        const observed = Math.max(previous.rpm, previous.peak);
        if (mode === "auto" && sampleAge <= 500 && previous.throttle !== null && previous.throttle >= .70 &&
            observed >= Math.max(3000, redline * .70) && observed <= redline * 1.12) {
          const prior = this.learned.get(previous.gear);
          this.learned.set(previous.gear, prior === undefined ? observed : prior * .65 + observed * .35);
          this.globalLearned = this.globalLearned === null ? observed : this.globalLearned * .65 + observed * .35;
        }

        // Keep the green light up a bit after a quick shift, but label it
        // SHIFTED so it never asks the driver to shift a second time.
        const hadGreen = now - this.lastGreenAt <= 480;
        const fastAuto = mode === "auto" && previous.throttle !== null && previous.throttle >= .70 &&
          observed >= Math.max(3000, redline * .70);
        if (hadGreen || fastAuto) {
          this.confirmUntil = now + 320;
          this.confirmGear = gear;
        }
      }

      const peakForGear = this.learned.get(gear);
      const autoTarget = finite(peakForGear) ? peakForGear : (finite(this.globalLearned) ? this.globalLearned : redline);
      const target = mode === "auto" ? autoTarget : redline;
      const greenLead = mode === "auto" ? 250 : manualLead;
      const greenAt = Math.max(0, target - greenLead);
      const orangeAt = Math.max(0, target - 700);

      let state = "normal";
      let text = "NORMAL";
      if (gear > 0 && rpm >= greenAt) {
        state = "shift";
        text = "SHIFT!";
        this.lastGreenAt = now;
      } else if (gear > 0 && rpm >= orangeAt) {
        state = "near";
        text = "GET READY";
      }
      if (gear > 0 && now < this.confirmUntil && gear === this.confirmGear) {
        state = "shift";
        text = "SHIFTED";
      }
      if (gear < 1) {
        this.confirmUntil = 0;
      }

      this.last = { gear, rpm, peak:this.currentPeakRpm, throttle, time:now };
      return {
        state, text, target, orangeAt, greenAt,
        adaptive:mode === "auto" && (finite(peakForGear) || finite(this.globalLearned)),
        mode
      };
    }
  }
  // Isolated extension content-script world; not exposed to the game's scripts.
  window.__nfsu2ShiftGuide = ShiftGuide;
})();
