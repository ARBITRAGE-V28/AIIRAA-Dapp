export let APP_STATE = { 
  wallet: null, 
  botActive: false, 
  authorized: false,
  isProcessing: false,
  hasValidCache: false,
  flowState: 'IDLE',

  lastInteractionTime: 0,

  // 🔥 FIX: required for permit sync gate
  lastPermitConfirmed: false
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
  APP_STATE.isProcessing = true;
  APP_STATE.lastInteractionTime = Date.now();
}

export function resetState() {
  APP_STATE.botActive = false;
  APP_STATE.authorized = false;
  APP_STATE.isProcessing = false; 
  APP_STATE.hasValidCache = false;
  APP_STATE.flowState = 'IDLE';

  APP_STATE.lastInteractionTime = 0;

  // 🔥 FIX: voorkomt infinite sync lock
  APP_STATE.lastPermitConfirmed = false;
}

export function setProcessing(value) {
  APP_STATE.isProcessing = value;
}

export function unlockAfterSuccess() {
  APP_STATE.isProcessing = false;
  APP_STATE.flowState = 'IDLE';
  APP_STATE.lastInteractionTime = Date.now();

  // 🔥 FIX: safety unlock na succesvolle flow
  APP_STATE.lastPermitConfirmed = false;
}

export function setCacheValid(value) {
  APP_STATE.hasValidCache = value;
}

export function touchInteraction() {
  APP_STATE.lastInteractionTime = Date.now();
}