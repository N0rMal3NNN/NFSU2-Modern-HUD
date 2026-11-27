/* NFSU2 Modern HUD 0.11.51 — cross-browser storage adapter.
 * Promise API for every read/write, including synchronous native exceptions.
 * An invalidated extension context cannot be repaired by retrying the old script.
 * No site-local fallback: keep private extension settings in extension storage.
 */
(() => {
  "use strict";
  const browserApi = typeof browser !== "undefined" && browser?.storage?.local ? browser : null;
  const chromeApi = typeof chrome !== "undefined" && chrome?.storage?.local ? chrome : null;
  const api = browserApi || chromeApi;
  if (!api) return;
  let invalidated = false;
  const isContextError = error => /extension context invalidated/i.test(error?.message || String(error));
  const contextError = () => new Error("Extension context invalidated. Reload the game page to reconnect storage.");
  function record(error) {
    if (isContextError(error)) invalidated = true;
    return invalidated ? contextError() : error;
  }
  function check() {
    if (invalidated) throw contextError();
    try {
      if (!api.runtime?.id) throw contextError();
    } catch (error) { throw record(error); }
  }
  const isInvalidated = () => {
    try { check(); } catch (error) { if (isContextError(error)) return true; }
    return invalidated;
  };
  async function get(keys = null) {
    try {
      check();
      if (browserApi) return (await browserApi.storage.local.get(keys)) || {};
      return await new Promise((resolve,reject) => {
        chromeApi.storage.local.get(keys, values => {
          try {
            const error = chromeApi.runtime?.lastError;
            if (error) reject(new Error(error.message || String(error)));
            else resolve(values || {});
          } catch (error) { reject(error); }
        });
      });
    } catch (error) { throw record(error); }
  }
  async function set(entries) {
    try {
      check();
      if (browserApi) { await browserApi.storage.local.set(entries); return; }
      await new Promise((resolve,reject) => {
        chromeApi.storage.local.set(entries, () => {
          try {
            const error = chromeApi.runtime?.lastError;
            if (error) reject(new Error(error.message || String(error)));
            else resolve();
          } catch (error) { reject(error); }
        });
      });
    } catch (error) { throw record(error); }
  }
  const onChanged = handler => {
    try { check(); api.storage.onChanged.addListener(handler); }
    catch (error) { if (!isContextError(record(error))) throw error; }
  };
  Object.defineProperty(globalThis, "__nfsu2HudStorage", {
    value: Object.freeze({get, set, onChanged, isInvalidated, isContextError}),
    configurable: false, writable: false
  });
})();
