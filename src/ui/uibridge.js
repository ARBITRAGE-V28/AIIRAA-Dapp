/* ==========================================================================
   AURA BOT UI BRIDGE - HARD SYNCHRONOUS INPUT GATEKEEPER
   ========================================================================== */

import { connectWallet, activateBot, authorizeTrading, disconnectWallet } from '../control/controlCenter.js';
import { APP_STATE, touchInteraction } from '../core/state.js';

// 🔒 Eén centrale, stabiele state-check die direct reageert op APP_STATE
let coolDownActive = false;
let coolDownTimer = null;

function acquireBridgeLock() {
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
  }, 600);
  
  return true;
}

async function bridgeConnectWallet() {
  console.log("🎯 UIbridge: bridgeConnectWallet aangeroepen!");
  if (!acquireBridgeLock()) return;
  
  // Start de async flow zonder dat de UI-lock mechanisch afhankelijk is van de afloop van de promise
  try {
    await connectWallet();
  } catch (err) {
    console.error("[UIbridge] Fout tijdens connectWallet execution:", err);
  }
}

function bridgeActivateBot() {
  // 🔥 LEGO FIX: Controleert puur op actieve verwerking en cooldown zonder oude bridgeLock crash
  if (coolDownActive || APP_STATE.isProcessing) return;
  touchInteraction();
  activateBot();
}

function bridgeAuthorizeTrading() {
  // 🔥 LEGO FIX: Controleert puur op actieve verwerking en cooldown zonder oude bridgeLock crash
  if (coolDownActive || APP_STATE.isProcessing) return;
  touchInteraction();
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