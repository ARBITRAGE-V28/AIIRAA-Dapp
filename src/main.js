/* ==========================================================================
   AURA MAIN APPLICATION ENTRY (src/main.js)
   ========================================================================== */

import "./ui/uibridge.js"; // 🛡️ Activeer de centrale poortwachter & anti-spam laag direct bij boot
import { controlCenterHTML } from "./control/controlCenterUI.js";

// Zodra het DOM klaar is, laden we de UI componenten in hun respectievelijke mappen
document.addEventListener("DOMContentLoaded", () => {
    console.log("Aura App Initializing...");

    // Zoek de placeholder of root container waar jouw control center in moet leven
    // Als je een specifieke container hebt (bijv. <div id="control-target">), pas dit hieronder aan.
    const controlTarget = document.getElementById("control-container") || document.body;
    
 if (controlTarget && controlCenterHTML) {
        // Injecteer de schone HTML string uit controlCenterUI.js
        controlTarget.innerHTML = controlCenterHTML;
        console.log("💎 Control Center UI injected successfully.");

        // 🔥 LEGO FIX: Koppel de elementen direct synchroon aan de UIbridge gates
        const btnWallet = document.getElementById('btn-wallet');
        const btnActivate = document.getElementById('btn-activate');
        const btnAuthorize = document.getElementById('btn-authorize');
        const btnDisconnect = document.getElementById('btn-disconnect');

        if (btnWallet) btnWallet.addEventListener('click', () => window.connectWallet());
        if (btnActivate) btnActivate.addEventListener('click', () => window.activateBot());
        if (btnAuthorize) btnAuthorize.addEventListener('click', () => window.authorizeTrading());
        if (btnDisconnect) btnDisconnect.addEventListener('click', () => window.disconnectWallet());
        
        console.log("🔒 Event listeners safely bound to UIbridge.");
    } else {
        console.error("❌ Could not find a target element to inject Control Center UI.");
    }
});