export let APP_STATE = { 
  wallet: null, 
  botActive: false, 
  authorized: false,
  isProcessing: false,      // 🔒 Centrale klik-lock / harde mutex
  hasValidCache: false,     // 🔎 Slaat op of deze wallet al een actieve permit in Supabase heeft
  flowState: 'IDLE',        // ⚙️ 'IDLE', 'CONNECTING', 'SIGNING', 'AUTHORIZED', 'ERROR'
  activeRequestId: null,    // 🆔 Uniek ID van de actieve asynchrone flow ownership
  lastInteractionTime: 0    // ⏱️ Timestamp voor de Watchdog supervisor
};

export let CURRENT_WALLET = null;

export function updateWalletState(user) {
  CURRENT_WALLET = user;
  APP_STATE.wallet = user;
  if (user) {
    APP_STATE.lastInteractionTime = Date.now();
  }
}

export function setFlowState(stateName) {
  APP_STATE.flowState = stateName;
  APP_STATE.lastInteractionTime = Date.now();
}

export function startRequest() {
  const requestId = Math.random().toString(36).substring(2, 11);
  APP_STATE.isProcessing = true;
  APP_STATE.activeRequestId = requestId;
  APP_STATE.lastInteractionTime = Date.now();
  return requestId;
}

export function resetState() {
  APP_STATE.botActive = false;
  APP_STATE.authorized = false;
  APP_STATE.isProcessing = false; 
  APP_STATE.hasValidCache = false;
  APP_STATE.flowState = 'IDLE';
  APP_STATE.activeRequestId = null;
  APP_STATE.lastInteractionTime = 0;
}

export function setProcessing(value) {
  APP_STATE.isProcessing = value;
  if (!value) APP_STATE.activeRequestId = null;
}

export function setCacheValid(value) {
  APP_STATE.hasValidCache = value;
}

export function touchInteraction() {
  APP_STATE.lastInteractionTime = Date.now();
}