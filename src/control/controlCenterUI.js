/* ==========================================================================
   AURA CONTROL CENTER - UI TEMPLATE CONTAINER (src/control/controlCenterUI.js)
   ========================================================================== */

export const controlCenterHTML = `
<style>
   /* 📊 CHRONOLOGICAL BLOOMBERG SEQUENCE STYLE */
    .control-root,
    .control-root * {
        box-sizing: border-box !important;
        border-radius: 0px !important; /* Harde, professionele terminal hoeken */
        font-family: 'JetBrains Mono', monospace !important;
        font-weight: 500 !important;
        -webkit-font-smoothing: antialiased;
    }

    /* Het hoofdvenster: Deep antraciet Bloomberg canvas */
    .control-root .panel {
        background: #080b11 !important; 
        border: 1px solid #232b35 !important;
        box-shadow: none !important;
        display: flex;
        flex-direction: column;
        overflow: hidden;
        margin-bottom: 14px;
        width: 100%;
    }

    /* Header: De klassieke Bloomberg statusbalk */
    .control-root .panel-header {
        font-size: 10px !important; 
        font-weight: 700 !important; 
        color: #00ffff !important; /* Terminal cyaan voor titels */
        text-transform: uppercase !important; 
        letter-spacing: 1px !important; 
        padding: 8px 12px !important; 
        border-bottom: 1px solid #232b35 !important;
        background: #121824 !important; 
    }

    .control-root .module-body {
        background: #080b11 !important;
        padding: 12px !important;
    }

    .control-root .btn-stack {
        display: flex;
        flex-direction: column;
        gap: 6px;
        margin-bottom: 14px;
    }

    /* 🛡️ DE BASIS-STAND: Volledig gedimd grijs zolang de stap 'disabled' is */
  .control-root .control-btn {
    background: #0d131f !important; 
    border: 1px solid #1a2333 !important; 
    color: #425266 !important;
    font-size: 11px !important; 
    text-transform: uppercase !important;
    padding: 10px 12px !important; 
    cursor: not-allowed !important; 
    outline: none !important;
    text-align: left !important;
    width: 100% !important;

    transition:
      background-color 0.1s ease,
      border-color 0.1s ease,
      color 0.1s ease !important;
}

    /* ==========================================================================
       THE CHRONOLOGICAL COLOR SPECTRUM (Licht op zodra disabled vervalt)
       ========================================================================== */

    /* STAP 1: Connect Wallet -> Focus Terminal Blue (De Start) */
    .control-root .btn-cyan:not(:disabled) { 
        cursor: pointer !important;
        border-color: #0066cc !important; 
        background: #002244 !important; 
        color: #ffffff !important; 
    }
    .control-root .btn-cyan:not(:disabled):hover { 
        background: #003366 !important; 
        border-color: #0088ff !important; 
    }

   /* STAP 2: Activate Bot -> Muted Bloomberg Amber (Geen hard neon-oranje) */
    .control-root .btn-purple:not(:disabled) { 
        cursor: pointer !important;
        border-color: #d48800 !important; /* Brons/Amber in plaats van fel oranje */
        background: #1f1400 !important;   /* Extreem donker okergeel/bruin */
        color: #d48800 !important; 
    }
    .control-root .btn-purple:not(:disabled):hover { 
        background: #2b1d00 !important; 
        border-color: #f59e0b !important; 
        color: #ffffff !important;
    }

    /* STAP 3: Authorize Trading -> Tactical Data Green (Geen gaming/matrix groen) */
    .control-root .btn-amber:not(:disabled) { 
        cursor: pointer !important;
        border-color: #389e0d !important; /* Rustig, militair/data groen */
        background: #0b1d05 !important;   /* Diepe, donkere mos-ondergrond */
        color: #389e0d !important; 
    }
    .control-root .btn-amber:not(:disabled):hover { 
        background: #12330a !important; 
        border-color: #52c41a !important; 
        color: #ffffff !important;
    }

 /* STAP 4: Disconnect Wallet -> Bloomberg Silver (Alleen rood bij hover) */
    .control-root #btn-disconnect:not(:disabled) { 
        cursor: pointer !important;
        border-color: #232b35 !important; 
        background: #0d131f !important;  
        color: #8fa0b3 !important; /* █ Mat Bloomberg Zilver */
    }
    .control-root #btn-disconnect:not(:disabled):hover { 
        background: #2a0808 !important;  /* Pas bij hover een dieprode waarschuwing */
        border-color: #aa2222 !important; 
        color: #ff6666 !important; 
    }
    /* ==========================================================================
       STATUS GRIDS & DATA METRICS WITH DEVY-DIVIDERS
       ========================================================================== */
    .control-root .status-box {
        border-top: 1px solid #232b35 !important;
        padding-top: 4px;
    }

    .control-root .status-grid {
        display: grid;
        grid-template-columns: 140px 1fr;
        gap: 8px;
        align-items: center;
        padding: 8px 0 !important; /* Ruimte rondom de tekst voor de dividers */
        border-bottom: 1px solid #161f29 !important; /* █ Subtiele Bloomberg Divider lijn */
    }
    
    /* Zorg dat de allerlaatste statusgrid geen dubbele divider aan de onderkant krijgt */
    .control-root .status-grid:last-child {
        border-bottom: none !important;
    }

    /* Bloomberg Zilver voor de statische tekstlabels: Flinterdun en strak */
    .control-root .status-grid span:not(.control-value) {
        font-size: 10px !important;
        color: #8fa0b3 !important; 
        text-transform: uppercase !important;
        letter-spacing: 0.5px !important;
        font-weight: 400 !important; /* Haalt het vette/lompe direct weg */
    }

    /* Helder Metallic Zilver voor de dynamische live waarden */
    .control-root .control-value {
        font-size: 10.5px !important;
        color: #e2e8f0; /* !important is hier nu weg, JS kan de kleur nu aanpassen! */
        font-variant-numeric: tabular-nums !important;
        font-weight: 500 !important; 
        letter-spacing: 0.5px !important;
    }

    .control-root .status-line {
        display: flex;
        align-items: center;
        gap: 8px;
    }

  /* Ronde terminal indicatoren (Radar look) met vloeiende live pulses */
   .control-root .liveDot {
    width: 6px !important;
    height: 6px !important;
    background-color: #232b35;
    border-radius: 50% !important;
    flex-shrink: 0;

    transition:
      background-color 0.3s ease,
      opacity 0.3s ease !important;

    animation: none;
}

    @keyframes dotPulse {
        0% { opacity: 0.60; }
        50% { opacity: 1; }
        100% { opacity: 0.60; }
    }

    /* Execution Console Live Feed */
  .control-root #execution-console {
    background: #04060a !important;
    border: 1px solid #232b35 !important;
    height: 110px;
    overflow-y: hidden;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    padding: 8px 12px !important;
}

    .control-root .exec-line {
        color: #94a3b8 !important; 
        font-size: 10px !important;
        padding: 2px 0 !important;
        line-height: 1.4 !important;
        width: 100%;
        white-space: pre-wrap;
        word-break: break-all;
        border-bottom: 1px solid #121824 !important;
    }
</style>

<div class="control-root bot-control-root">
    <div class="panel">
        <div class="panel-header">AIIRAA CONTROL CENTER</div>
        <div class="module-body">

            <div class="btn-stack">
                <button id="btn-wallet" class="control-btn btn-cyan">1. Connect Wallet</button>
                <button id="btn-activate" class="control-btn btn-purple" disabled>2. Activate Terminal</button>
                <button id="btn-authorize" class="control-btn btn-amber" disabled>3. Authorize Trading</button>
                <button id="btn-disconnect" class="control-btn" disabled>4. Disconnect Wallet</button>
            </div>

            <div class="status-box">
                <div class="status-grid">
                    <span>WALLET STATUS</span>
                    <div class="status-line">
                        <div id="dot-wallet" class="liveDot"></div>
                        <span id="st-wallet" class="control-value">DISCONNECTED</span>
                    </div>
                </div>

                <div class="status-grid">
                    <span>BOT STATUS</span>
                    <div class="status-line">
                        <div id="dot-bot" class="liveDot"></div>
                        <span id="st-bot" class="control-value">OFFLINE</span>
                    </div>
                </div>

                <div class="status-grid">
                    <span>TRADING ACCESS</span>
                    <div class="status-line">
                        <div id="dot-access" class="liveDot"></div>
                        <span id="st-access" class="control-value">RESTRICTED</span>
                    </div>
                </div>
            </div>

        </div>
    </div>

    <div class="panel" style="height:150px;">
        <div class="panel-header">Execution Console</div>
        <div class="module-body" id="execution-console"></div>
    </div>
</div>
`;