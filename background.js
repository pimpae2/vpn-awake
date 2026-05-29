const ALARM_NAME = "vpn-awake-ping";

const DEFAULT_CONFIG = {
  enabled: true,
  url: "http://10.21.31.9:8095/#/dmse0019",
  intervalSec: 60,
  timeoutSec: 8
};

const storageGet = (defaults) =>
  new Promise((resolve) => chrome.storage.local.get(defaults, resolve));

const storageSet = (value) =>
  new Promise((resolve) => chrome.storage.local.set(value, resolve));

const clearAlarm = () =>
  new Promise((resolve) => chrome.alarms.clear(ALARM_NAME, resolve));

function normalizeConfig(value) {
  return {
    enabled: Boolean(value.enabled),
    url: String(value.url || DEFAULT_CONFIG.url),
    intervalSec: Math.max(60, Number(value.intervalSec) || DEFAULT_CONFIG.intervalSec),
    timeoutSec: Math.max(3, Number(value.timeoutSec) || DEFAULT_CONFIG.timeoutSec)
  };
}

async function getConfig() {
  const value = await storageGet(DEFAULT_CONFIG);
  return normalizeConfig(value);
}

function buildPingUrl(rawUrl) {
  const url = new URL(rawUrl);
  url.searchParams.set("_vpn_awake", String(Date.now()));
  return url.toString();
}

async function updateBadge(enabled, ok) {
  if (!enabled) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  await chrome.action.setBadgeText({ text: ok === false ? "ERR" : "ON" });
  await chrome.action.setBadgeBackgroundColor({
    color: ok === false ? "#b42318" : "#067647"
  });
}

async function schedule(config = null) {
  const currentConfig = config || await getConfig();
  await clearAlarm();

  if (!currentConfig.enabled) {
    await updateBadge(false);
    return;
  }

  chrome.alarms.create(ALARM_NAME, {
    periodInMinutes: Math.max(1, currentConfig.intervalSec / 60)
  });

  await updateBadge(true);
}

async function ping(trigger = "alarm") {
  const config = await getConfig();
  if (!config.enabled) {
    await updateBadge(false);
    return { ok: false, skipped: true, reason: "disabled" };
  }

  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutSec * 1000);

  try {
    const response = await fetch(buildPingUrl(config.url), {
      method: "GET",
      cache: "no-store",
      credentials: "include",
      signal: controller.signal
    });

    const result = {
      ok: true,
      trigger,
      status: response.status,
      statusText: response.statusText,
      at: new Date().toISOString(),
      durationMs: Date.now() - startedAt
    };

    await storageSet({ lastResult: result });
    await updateBadge(true, true);
    return result;
  } catch (error) {
    const result = {
      ok: false,
      trigger,
      error: error.name === "AbortError" ? "Request timed out" : error.message,
      at: new Date().toISOString(),
      durationMs: Date.now() - startedAt
    };

    await storageSet({ lastResult: result });
    await updateBadge(true, false);
    return result;
  } finally {
    clearTimeout(timeout);
  }
}

async function boot() {
  const config = await getConfig();
  await schedule(config);

  if (config.enabled) {
    await ping("startup");
  }
}

chrome.runtime.onInstalled.addListener(() => {
  void boot();
});

chrome.runtime.onStartup.addListener(() => {
  void boot();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    void ping("alarm");
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message && message.type === "PING_NOW") {
    ping("manual").then(sendResponse);
    return true;
  }

  if (message && message.type === "CONFIG_CHANGED") {
    getConfig()
      .then(schedule)
      .then(() => ping("config"))
      .then(sendResponse);
    return true;
  }

  return false;
});
