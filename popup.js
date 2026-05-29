const DEFAULT_CONFIG = {
  enabled: true,
  url: "http://10.21.31.9:8095/#/dmse0019",
  intervalSec: 60,
  timeoutSec: 8,
  lastResult: null
};

const enabledInput = document.querySelector("#enabledInput");
const urlInput = document.querySelector("#urlInput");
const intervalInput = document.querySelector("#intervalInput");
const timeoutInput = document.querySelector("#timeoutInput");
const statusText = document.querySelector("#statusText");
const message = document.querySelector("#message");
const saveButton = document.querySelector("#saveButton");
const pingButton = document.querySelector("#pingButton");
const openButton = document.querySelector("#openButton");

const storageGet = (defaults) =>
  new Promise((resolve) => chrome.storage.local.get(defaults, resolve));

const storageSet = (value) =>
  new Promise((resolve) => chrome.storage.local.set(value, resolve));

const sendMessage = (payload) =>
  new Promise((resolve) => chrome.runtime.sendMessage(payload, resolve));

function setMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function formatTime(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit"
  }).format(new Date(iso));
}

function renderStatus(result, enabled) {
  if (!enabled) {
    document.body.dataset.status = "off";
    statusText.textContent = "ปิดอยู่";
    return;
  }

  if (!result) {
    document.body.dataset.status = "idle";
    statusText.textContent = "ยังไม่มีผลการ ping";
    return;
  }

  if (result.ok) {
    document.body.dataset.status = "ok";
    statusText.textContent = `ทำงานอยู่ · ล่าสุด ${formatTime(result.at)} · HTTP ${result.status}`;
    return;
  }

  document.body.dataset.status = "err";
  statusText.textContent = `มีปัญหา · ล่าสุด ${formatTime(result.at)}`;
}

async function loadState() {
  const state = await storageGet(DEFAULT_CONFIG);
  enabledInput.checked = Boolean(state.enabled);
  urlInput.value = state.url || DEFAULT_CONFIG.url;
  intervalInput.value = Math.max(60, Number(state.intervalSec) || DEFAULT_CONFIG.intervalSec);
  timeoutInput.value = Math.max(3, Number(state.timeoutSec) || DEFAULT_CONFIG.timeoutSec);
  renderStatus(state.lastResult, state.enabled);
}

function readForm() {
  const url = new URL(urlInput.value.trim());

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Target URL ต้องเป็น http หรือ https");
  }

  return {
    enabled: enabledInput.checked,
    url: url.toString(),
    intervalSec: Math.max(60, Number(intervalInput.value) || DEFAULT_CONFIG.intervalSec),
    timeoutSec: Math.max(3, Number(timeoutInput.value) || DEFAULT_CONFIG.timeoutSec)
  };
}

async function saveConfig() {
  try {
    const config = readForm();
    await storageSet(config);
    const result = await sendMessage({ type: "CONFIG_CHANGED" });
    renderStatus(result, config.enabled);
    setMessage("บันทึกแล้ว", "ok");
  } catch (error) {
    setMessage(error.message, "err");
  }
}

async function pingNow() {
  try {
    setMessage("กำลัง ping...", "");
    const result = await sendMessage({ type: "PING_NOW" });
    const state = await storageGet(DEFAULT_CONFIG);
    renderStatus(result, state.enabled);
    setMessage(result.ok ? "Ping สำเร็จ" : result.error || "Ping ไม่สำเร็จ", result.ok ? "ok" : "err");
  } catch (error) {
    setMessage(error.message, "err");
  }
}

saveButton.addEventListener("click", saveConfig);
pingButton.addEventListener("click", pingNow);
openButton.addEventListener("click", () => {
  chrome.tabs.create({ url: urlInput.value.trim() || DEFAULT_CONFIG.url });
});
enabledInput.addEventListener("change", saveConfig);

document.addEventListener("DOMContentLoaded", loadState);
