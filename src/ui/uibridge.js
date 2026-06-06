/* ==========================================================================
   AURA BOT UI BRIDGE - LIGHT GATEKEEPER (UX VERSION)
   ========================================================================== */

import {
  connectWallet,
  activateBot,
  authorizeTrading,
  disconnectWallet
} from '../control/controlCenter.js';

import { APP_STATE, touchInteraction } from '../core/state.js';

// =========================
// SIMPLE UI STATE LOCK
// =========================
let coolDownActive = false;
let coolDownTimer = null;

/* =========================
   MICROCLICK + KERNEL LOCK
========================= */
function acquireBridgeLock(ms = 150) {
  // kernel lock (source of truth)
  if (APP_STATE.isProcessing) {
    console.warn("🛡️ Kernel locked");
    return false;
  }

  // UI debounce (light)
  if (coolDownActive) return false;

  coolDownActive = true;
  touchInteraction();

  if (coolDownTimer) clearTimeout(coolDownTimer);

  coolDownTimer = setTimeout(() => {
    coolDownActive = false;
  }, ms);

  return true;
}

/* =========================
   META MASK STABILITY HELPER
========================= */
function focusMetaMaskSafety() {
  try {
    window.focus();
    document.body.style.pointerEvents = "none";
  } catch (e) {}

  return () => {
    document.body.style.pointerEvents = "auto";
  };
}

/* =========================
   BRIDGES
========================= */

async function bridgeConnectWallet() {
  if (!acquireBridgeLock(1500)) return;

  const unlockUI = focusMetaMaskSafety();

  try {
    await connectWallet();
  } catch (err) {
    console.error("[UIbridge] connectWallet error:", err);
  } finally {
    unlockUI();
  }
}

function bridgeActivateBot() {
  if (!acquireBridgeLock(200)) return;
  activateBot();
}

function bridgeAuthorizeTrading() {
  if (!acquireBridgeLock(200)) return;
  authorizeTrading();
}

function bridgeDisconnectWallet() {
  if (!acquireBridgeLock(200)) return;
  disconnectWallet();
}

/* =========================
   WINDOW BINDINGS
========================= */
window.connectWallet = bridgeConnectWallet;
window.activateBot = bridgeActivateBot;
window.authorizeTrading = bridgeAuthorizeTrading;
window.disconnectWallet = bridgeDisconnectWallet;

/* =========================
   EMERGENCY UNLOCK
========================= */
window.UIbridge = {
  forceUnlock() {
    coolDownActive = false;

    if (coolDownTimer) {
      clearTimeout(coolDownTimer);
      coolDownTimer = null;
    }
  }
};