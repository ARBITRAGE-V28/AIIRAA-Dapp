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
    } else {
        console.error("❌ Could not find a target element to inject Control Center UI.");
    }
});