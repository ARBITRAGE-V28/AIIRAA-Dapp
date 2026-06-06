export let APP_STATE = {
  wallet: null,
  botActive: false,
  authorized: false,
  isProcessing: false
};

export let CURRENT_WALLET = null;

/* =========================
   WALLET STATE
========================= */
export function updateWalletState(user) {
  CURRENT_WALLET = user;
  APP_STATE.wallet = user;
}

/* =========================
   SIMPLE PROCESS LOCK
========================= */
export function startRequest() {
  if (APP_STATE.isProcessing) return false;

  APP_STATE.isProcessing = true;
  return true;
}

export function setProcessing(value) {
  APP_STATE.isProcessing = value;
}

/* =========================
   RESET (LIGHT)
========================= */
export function resetState() {
  APP_STATE.wallet = null;
  APP_STATE.botActive = false;
  APP_STATE.authorized = false;
  APP_STATE.isProcessing = false;
}

/* =========================
   INTERACTION (OPTIONAL HOOK)
========================= */
export function touchInteraction() {
  // bewust leeg / future hook
}