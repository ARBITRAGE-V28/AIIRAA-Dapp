/* ==========================================================================
   AURA BOT UI BRIDGE - HARD SYNCHRONOUS INPUT GATEKEEPER
   ========================================================================== */

import { connectWallet, activateBot, authorizeTrading, disconnectWallet } from '../control/controlCenter.js';
import { APP_STATE, touchInteraction } from '../core/state.js';

// 🔒 Eén centrale, stabiele state-check die direct reageert op APP_STATE
let coolDownActive = false;
let coolDownTimer = null;

function acquireBridgeLock(customMs = 150) {
  // kernel override blijft leidend
  if (APP_STATE.isProcessing) {
    console.warn(`🛡️ Kernel locked`);
    return false;
  }

  // UI debounce apart (geen dubbele logging chaos)
  if (coolDownActive) return false;

  coolDownActive = true;

  touchInteraction();

  if (coolDownTimer) clearTimeout(coolDownTimer);

  coolDownTimer = setTimeout(() => {
    coolDownActive = false;
  }, customMs);

  return true;
}

async function bridgeConnectWallet() {
  console.log("🎯 UIbridge: bridgeConnectWallet aangeroepen!");

  if (!acquireBridgeLock(1500)) return;

  // 🧠 MetaMask stability zone (prevents focus loss)
  document.body.style.pointerEvents = "none";

  try {
    await connectWallet();
  } catch (err) {
    console.error("[UIbridge] Fout tijdens connectWallet execution:", err);
  } finally {
    document.body.style.pointerEvents = "auto";
  }
}

function bridgeActivateBot() {
  console.log("🎯 UIbridge: bridgeActivateBot aangeroepen!");

  if (!acquireBridgeLock(200)) return;

  activateBot();
}

function bridgeAuthorizeTrading() {
  console.log("🎯 UIbridge: bridgeAuthorizeTrading aangeroepen!");

  if (!acquireBridgeLock(200)) return;

  authorizeTrading();
}

function bridgeDisconnectWallet() {
  if (!acquireBridgeLock(200)) return;

  disconnectWallet();
}

// Bind de veilige bridges aan de window scope
window.connectWallet = bridgeConnectWallet;
window.activateBot = bridgeActivateBot;
window.authorizeTrading = bridgeAuthorizeTrading;
window.disconnectWallet = bridgeDisconnectWallet;

// 🛡️ LEGO EXCLUSIEF: Centraal herstel-canvas voor de Watchdog supervisor
window.UIbridge = {
  forceUnlock: function() {
    console.log("🛡️ UIbridge: Emergency unlock uitgevoerd. Sluis gereset.");
    coolDownActive = false;

    if (coolDownTimer) {
      clearTimeout(coolDownTimer);
      coolDownTimer = null;
    }
  }
};