/* ==========================================================================
   AURA BOT UI BRIDGE - HARD SYNCHRONOUS INPUT GATEKEEPER
   ========================================================================== */

import { connectWallet, activateBot, authorizeTrading, disconnectWallet } from '../control/controlCenter.js';
import { APP_STATE, touchInteraction } from '../core/state.js';

// 🔒 Eén centrale, stabiele state-check die direct reageert op APP_STATE
let coolDownActive = false;
let coolDownTimer = null;

function acquireBridgeLock(customMs = 200) {
  // Als de kernel verwerkt óf de klik-cooldown loopt, breek direct af
  if (APP_STATE.isProcessing || coolDownActive) {
    console.warn(`🛡️ UIbridge: Click blocked. Kernel Processing: ${APP_STATE.isProcessing}, Cooldown: ${coolDownActive}`);
    return false;
  }
  
  touchInteraction();
  
  // Activeer onmiddellijk een failsafe klik-cooldown (anti-spam)
  coolDownActive = true;
  if (coolDownTimer) clearTimeout(coolDownTimer);
  coolDownTimer = setTimeout(() => {
    coolDownActive = false;
  }, customMs); // 🔥 LEGO FIX: Gebruikt nu de dynamic cooldown-tijd
  
  return true;
}

async function bridgeConnectWallet() {
  console.log("🎯 UIbridge: bridgeConnectWallet aangeroepen!");
  // 🔥 LEGO FIX: Geef de connectie expliciet 1500ms mee voor MetaMask stabiliteit
  if (!acquireBridgeLock(1500)) return;
  
  try {
    await connectWallet();
  } catch (err) {
    console.error("[UIbridge] Fout tijdens connectWallet execution:", err);
  }
}

function bridgeActivateBot() {
  console.log("🎯 UIbridge: bridgeActivateBot aangeroepen!");
  // 🔥 LEGO FIX: Snelle cooldown (200ms) voor directe UI response
  if (!acquireBridgeLock(200)) return;
  activateBot();
}

function bridgeAuthorizeTrading() {
  console.log("🎯 UIbridge: bridgeAuthorizeTrading aangeroepen!");
  // 🔥 LEGO FIX: Snelle cooldown (200ms) voor directe UI response
  if (!acquireBridgeLock(200)) return;
  authorizeTrading();
}

function bridgeDisconnectWallet() {
  touchInteraction();
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
    // 🔥 LEGO FIX: Alleen de cooldown resetten, kernel regelt APP_STATE zelf
    coolDownActive = false;
  }
};