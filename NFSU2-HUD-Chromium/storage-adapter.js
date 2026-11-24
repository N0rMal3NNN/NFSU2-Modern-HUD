/* NFSU2 Modern HUD 0.9.10 — cross-browser storage adapter.
 * Uses the native promise browser.* API in Firefox and the callback chrome.* API
 * in Chromium. All callers receive a Promise, including profile imports/exports.
 * No remote requests, tracking, or external dependencies.
 */
(() => {
  "use strict";
  const browserApi = typeof browser !== "undefined" && browser?.storage?.local ? browser : null;
  const chromeApi = typeof chrome !== "undefined" && chrome?.storage?.local ? chrome : null;
  const api = browserApi || chromeApi;
  if (!api) {
    console.warn("[NFSU2 HUD] Browser extension storage unavailable.");
    return;
  }
  const get = (keys = null) => {
    if (browserApi) return Promise.resolve(browserApi.storage.local.get(keys));
    return new Promise((resolve,reject) => {
      try {
        chromeApi.storage.local.get(keys, values => {
          const error = chromeApi.runtime?.lastError;
          if (error) reject(new Error(error.message || String(error)));
          else resolve(values || {});
        });
      } catch (error) { reject(error); }
    });
  };
  const set = entries => {
    if (browserApi) return Promise.resolve(browserApi.storage.local.set(entries));
    return new Promise((resolve,reject) => {
      try {
        chromeApi.storage.local.set(entries, () => {
          const error = chromeApi.runtime?.lastError;
          if (error) reject(new Error(error.message || String(error)));
          else resolve();
        });
      } catch (error) { reject(error); }
    });
  };
  const onChanged = handler => api.storage.onChanged.addListener(handler);
  Object.defineProperty(globalThis, "__nfsu2HudStorage", {
    value: Object.freeze({get, set, onChanged}),
    configurable: false, writable: false
  });
})();
