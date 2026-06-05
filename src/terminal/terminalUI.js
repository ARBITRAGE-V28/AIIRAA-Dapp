/* ==========================================================================
   AURA EXECUTION TERMINAL - LOGICA & UI INTERFACE (src/terminal/terminalUI.js)
   ========================================================================== */

const funds = {
    tech: { name: "AI ALPHA", nav: 3120, start: 3120, beta: 4.5, bias: 0.35, assets: [{s:'NVDA',n:'Nvidia',p:890},{s:'ASML',n:'ASML',p:940},{s:'ARM',n:'ARM Holdings',p:140},{s:'TSM',n:'TSMC',p:145}] },
    energy: { name: "NUCLEAR", nav: 1450, start: 1450, beta: 2.2, bias: 0.18, assets: [{s:'URA',n:'Uranium Index',p:88},{s:'GLD',n:'Gold Trust',p:2350},{s:'LIT',n:'Lithium Corp',p:48}] },
    frontier: { name: "SPACE", nav: 890, start: 890, beta: 6.5, bias: 0.55, assets: [{s:'SATL',n:'Satelogic',p:152},{s:'PLTR',n:'Palantir',p:210},{s:'RKLB',n:'Rocket Lab',p:4.5},{s:'ASTS',n:'AST Space',p:5.2}] }
};

let wallet = { USDT: 45000000.00 };
let vaultBalance = 0;
let totalRealizedPnL = 0;
let maxDrawdown = 0;
let peakEquity = 45000000.00;

let user = { 
    holdings: { tech: 0, energy: 0, frontier: 0 }, 
    costBasis: { tech: 0, energy: 0, frontier: 0 } 
};

let activeID = 'tech';
let strategyMultiplier = 1.0;
let autoModeTimer = 0;
let currentVix = 14.25;
let sessionStartTs = Date.now();
let initialNavBaseline = 45000000.00;
let activeIntervals = [];

export const terminalHTML = `
<div class="app-shell">
    <header>
    <style>
    /* Pop-up styling */
    .success-popup {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%) scale(0.8);
        background: #080d16;
        border: 2px solid var(--green);
        padding: 30px 50px;
        color: #fff;
        font-family: var(--font-mono);
        font-size: 14px;
        text-align: center;
        box-shadow: 0 0 30px rgba(0, 200, 83, 0.2);
        z-index: 9999;
        opacity: 0;
        pointer-events: none;
        transition: all 0.3s ease;
    }
    .success-popup.show {
        opacity: 1;
        transform: translate(-50%, -50%) scale(1);
        pointer-events: auto;
    }

    /* Vliegtuigje styling */
    .paper-plane {
        position: fixed;
        bottom: -100px;
        left: -100px;
        font-size: 40px;
        color: var(--accent);
        z-index: 10000;
        pointer-events: none;
        transform: rotate(45deg);
    }
    @keyframes flyAway {
        0% { bottom: -100px; left: -100px; transform: rotate(45deg) scale(0.5); opacity: 1; }
        50% { transform: rotate(35deg) scale(1.2); }
        100% { bottom: 110%; left: 110%; transform: rotate(25deg) scale(0.5); opacity: 0; }
    }
    .paper-plane.fly {
        animation: flyAway 1.5s cubic-bezier(0.25, 1, 0.5, 1) forwards;
    }
</style>

<div id="popup-alert" class="success-popup">
    <div style="color: var(--green); font-size: 24px; margin-bottom: 10px; font-weight: bold;">✓ TRANSFER SUCCESSFUL</div>
    <div style="color: #5d6e85; font-size: 11px;">CAPITAL SUBMITTED TO THE BLOCKCHAIN</div>
</div>
<div id="plane-fx" class="paper-plane">✈</div>
    
        <div style="font-size: 11px; font-weight: 600; color: #fff; font-family: var(--font-mono); letter-spacing: 0.5px;">
            A I I R A A // EXECUTION.TERMINAL <span style="font-weight:400; color:#5d6e85">v2.0-SPEC</span>
        </div>
        <div class="system-indicators" style="margin-left: auto; padding-right: 30px;">
            <div class="indicator-item"><div class="dot blue"></div>SYSTEM ONLINE</div>
            <div class="indicator-item"><div class="dot blue"></div>MARKET CONNECTED</div>
            <div class="indicator-item"><div class="dot blue"></div>EXECUTION ACTIVE</div>
            <div class="indicator-item"><div class="dot blue"></div>DATA STREAM: LIVE</div>
            <div class="indicator-item" style="color: #fff;">LATENCY: <span id="sys-latency">1.2</span>ms</div>
        </div>
        <button class="btn" onclick="window.transitionToControl()" style="font-size: 9px; padding: 4px 12px; color: var(--accent); border: 1px solid var(--accent); background: rgba(0, 188, 212, 0.03); box-shadow: 0 0 6px rgba(0, 188, 212, 0.1); transition: all 0.2s easeord;" onmouseover="this.style.borderColor='var(--red)'; this.style.color='var(--red)'; this.style.background='rgba(211, 30, 30, 0.05)'; this.style.boxShadow='0 0 6px rgba(211, 30, 30, 0.15)';" onmouseout="this.style.borderColor='var(--accent)'; this.style.color='var(--accent)'; this.style.background='rgba(0, 188, 212, 0.03)'; this.style.boxShadow='0 0 6px rgba(0, 188, 212, 0.1)';">
            DISCONNECT
        </button>
    </header>

    <div class="panel" style="border-right: 1px solid var(--border);">
        <div class="metric-group">
            <div class="metric-label">Net Asset Value (Portfolio NAV)</div>
            <div id="nav" class="metric-value" style="color: #a3b8cc;">45,000,000.00</div>
            <div id="perf" class="metric-sub" style="color:var(--green)">+0.00%</div>
        </div>

        <div class="section-header">Live Performance Metrics</div>
        <div class="perf-grid">
            <div class="perf-card"><div class="perf-label">Total Return</div><div id="perf-total" class="perf-value" style="color: var(--green);">+0.00%</div></div>
            <div class="perf-card"><div class="perf-label">Session Return</div><div id="perf-session" class="perf-value" style="color: var(--green);">+0.00%</div></div>
            <div class="perf-card"><div class="perf-label">1H Return</div><div id="perf-1h" class="perf-value" style="color: var(--green);">+0.00%</div></div>
            <div class="perf-card"><div class="perf-label">Max Drawdown</div><div id="perf-dd" class="perf-value" style="color: var(--text-main);">0.00%</div></div>
            <div class="perf-card"><div class="perf-label">Sharpe Ratio</div><div id="perf-sharpe" class="perf-value" style="color: var(--text-main);">3.41</div></div>
            <div class="perf-card"><div class="perf-label">Exposure Share</div><div id="perf-exposure" class="perf-value" style="color: var(--text-main);">0.0%</div></div>
        </div>
        
        <div class="section-header">Analytics Matrix</div>
        <div class="analytics-matrix">
            <div class="matrix-cell">
                <div class="matrix-label">Volatility Index (VIX)</div>
                <div id="vix-val" class="matrix-val">14.25</div>
                <div class="progress-mini"><div id="vix-bar" class="progress-fill" style="width: 35%"></div></div>
            </div>
            <div class="matrix-cell">
                <div class="matrix-label">Market Regime</div><div id="regime-val" class="matrix-val" style="font-size: 11px; color: var(--green);">LOW_VOL_DRIFT</div>
            </div>
            <div class="matrix-cell">
                <div class="matrix-label">Execution Frequency</div><div id="velocity" class="matrix-val">0.0 Hz</div><div style="font-size:8px; color:#5d6e85; margin-top:2px;">TRADES / SEC</div>
            </div>
            <div class="matrix-cell">
                <div class="matrix-label">Alpha Generation</div><div id="alpha-score" class="matrix-val">0.00</div><div style="font-size:8px; color:#5d6e85; margin-top:2px;">SYS_STRENGTH</div>
            </div>
        </div>

        <div class="section-header">Market Instruments</div>
        <div class="data-container">
            <table>
                <thead>
                    <tr>
                        <th style="text-align:left; width: 25%;">Ticker</th>
                        <th style="text-align:left; width: 45%;">Asset Name</th>
                        <th style="text-align:right; width: 30%;">Price</th>
                    </tr>
                </thead>
                <tbody id="asset-table"></tbody>
            </table>
        </div>

        <div class="section-header">System Metrics</div>
        <div class="metric-group" style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; background: #06090e; border-bottom: none;">
            <div><div class="metric-label">Realized PnL</div><div id="realized-pnl" style="color:var(--green); font-size: 14px; font-family: var(--font-mono); font-variant-numeric: tabular-nums;">0.00 USDT</div></div>
            <div><div class="metric-label">Unrealized PnL</div><div id="unrealized-pnl" style="color:var(--green); font-size: 14px; font-family: var(--font-mono); font-variant-numeric: tabular-nums;">0.00 USDT</div></div>
        </div>
    </div>

    <div class="panel" style="min-height:0;">
        <div class="section-header">Execution Engine (Autonomous Core)</div>
        <div style="padding: 15px; display: flex; gap: 8px; background:#080b12; border-bottom: 1px solid var(--border);">
            <button class="btn" onclick="window.terminalEngine.setStrategy(0.5, this)">Conservative</button>
            <button class="btn active" onclick="window.terminalEngine.setStrategy(1.0, this)">Institutional Optimal</button>
            <button class="btn" onclick="window.terminalEngine.setStrategy(1.8, this)">Aggressive Alpha</button>
            <select id="fund-id" onchange="window.terminalEngine.manualSelect(this.value)" style="flex:1; margin-left:10px;">
                <option value="tech">AI ALPHA & ROBOTICS</option>
                <option value="energy">NUCLEAR ENERGY PLUS</option>
                <option value="frontier">SPACE EXPLORATION</option>
            </select>
        </div>

        <div class="section-header">Session Tracking Diagnostics</div>
        <div style="padding: 12px 15px; background: #080b12; border-bottom: 1px solid var(--border); font-family: var(--font-mono); font-size: 11px; display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px;">
            <div><span style="color: #5d6e85;">SESSION TIME:</span> <span id="sess-time" style="color: #fff;">00:00:00</span></div>
            <div><span style="color: #5d6e85;">SESS RETURN:</span> <span id="sess-ret" style="color: var(--green);">+0.00%</span></div>
            <div><span style="color: #5d6e85;">AVG INTERVAL:</span> <span id="sess-speed" style="color: #fff;">1000ms</span></div>
        </div>

        <div class="section-header">Orderbook Matrix (Depth)</div>
        <div id="orderbook" style="flex: 1; background: #04060a; padding: 5px 0;"></div>

      <div class="control-block">
    <div style="display:flex; justify-content:space-between; font-size:11px; color:#5d6e85; margin-bottom:12px; font-family: var(--font-mono);">
        <span>Execution Bias: <span id="ai-bias" style="color:var(--accent); text-shadow: 0 0 6px rgba(0, 188, 212, 0.4);">SYSTEMATIC_LONG</span></span>
        <span>Structural State: <span id="sync-status" style="color:#fff">SYSTEMATIC_ROTATION</span></span>
    </div>
    <button class="btn-action" onclick="window.terminalEngine.vaultSweep()" 
            onmouseover="this.style.background='rgba(0, 188, 212, 0.15)'; this.style.color='#ffffff'; this.style.boxShadow='0 0 10px rgba(0, 188, 212, 0.3)';" 
            onmouseout="this.style.background='rgba(0, 188, 212, 0.03)'; this.style.color='var(--accent)'; this.style.boxShadow='0 0 6px rgba(0, 188, 212, 0.05)';" 
            style="padding: 10px 0; margin-top:0; margin-bottom:8px; border-color: var(--accent); color: var(--accent); background: rgba(0, 188, 212, 0.03); box-shadow: 0 0 6px rgba(0, 188, 212, 0.05); font-size: 11px; display: block; width: 100%; box-sizing: border-box; transition: all 0.15s ease;">
        Transfer to Reserve Balance
    </button>
    <button class="btn-action" onclick="window.terminalEngine.resetSessionMetrics()" style="padding: 10px 0; margin: 0; font-size: 11px; display: block; width: 100%; box-sizing: border-box;">Re-index Session Baseline</button>
</div>
    </div>

   <div class="panel" style="border-left: 1px solid var(--border); display: flex; flex-direction: column; background: #0b0e14;">
       <div class="metric-group" style="border-bottom: 1px solid #1a2233; padding: 14px 15px; background: #0d111a;">
    <div class="metric-label" style="font-size: 9.5px; color: #62738c; font-family: var(--font-mono); letter-spacing: 0.5px; font-weight: 400;">TOTAL EQUITY (CAPITAL BASE)</div>
    
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <div id="total-equity" class="metric-value" style="font-size: 16px; color: #a3b8cc; font-family: var(--font-mono); font-weight: 400; letter-spacing: 0px;">45,000,000.00</div>
        <div style="font-family: var(--font-mono); font-size: 11px; color: #62738c; padding-right: 2px;">USDT</div>
    </div>
            
            <div style="height: 1px; background: #141a29; margin: 12px 0;"></div>
            
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8496b0; font-family: var(--font-mono);">
                <span>RESERVE VAULT:</span>
                <span id="vault-balance" style="color: #cbd5e1; font-weight: 400;">0.00 USDT</span>
            </div>
            
            <div style="height: 1px; background: #141a29; margin: 8px 0;"></div>
            
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: #8496b0; font-family: var(--font-mono);">
                <span>CASH POOL (USDT):</span>
                <span id="cash-reserve" style="color: #cbd5e1; font-weight: 400;">45,000,000.00 USDT</span>
            </div>
        </div>

        <div class="section-header" style="border-top: none;">Sector Portfolio Exposure</div>
        <div class="data-container" style="border-bottom: 1px solid var(--border); background: #020408;">
            <table style="table-layout: fixed; width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="border-bottom: 1px solid var(--border);">
                        <th style="text-align:left; width: 40%; padding: 8px 12px; font-size: 10px; color: #5d6e85;">Sector Class</th>
                        <th style="text-align:right; width: 35%; padding: 8px 12px; font-size: 10px; color: #5d6e85;">Valuation</th>
                        <th style="text-align:right; width: 25%; padding: 8px 12px; font-size: 10px; color: #5d6e85;">ROI</th>
                    </tr>
                </thead>
                <tbody id="exposure-table" style="font-size: 11px;"></tbody>
            </table>
        </div>
        
        <div class="control-block" style="border-top: 1px solid #1a2233; background: #0d111a; padding: 12px 15px; display: flex; flex-direction: column; gap: 6px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: #8496b0; letter-spacing: 0.5px;">
                <span>TARGET DESTINATION (ERC-20)</span>
                <span id="address-status" style="color: #ffb300; font-weight: 400; text-shadow: 0 0 8px rgba(255,179,0,0.15);">AWAITING_DESTINATION</span>
            </div>
            <input id="erc20-address" type="text" placeholder="0x..." autocomplete="off" spellcheck="false" oninput="window.terminalEngine.validateAddress(this.value)" style="width: 100%; background: #04060a; border: 1px solid #1a2233; color: #ffffff; font-family: var(--font-mono); font-size: 11px; padding: 6px 10px; border-radius: 0; outline: none; box-sizing: border-box; font-weight: 400;">
        </div>

        <div class="control-block" style="border-top: 1px solid #1a2233; border-bottom: 1px solid #1a2233; background: #0d111a; display: flex; flex-direction: column; gap: 8px; padding: 12px 15px;">
            <div style="display: flex; justify-content: space-between; font-size: 10px; font-family: var(--font-mono); color: #8496b0; letter-spacing: 0.5px; margin-bottom: 2px;">
                <span>SPECIFIED AMOUNT:</span>
                <span id="withdraw-amount-display" style="color: #00ffcc; font-weight: 400; font-size: 12px; text-shadow: 0 0 10px rgba(0,255,204,0.2);">0.00 USDT</span>
            </div>
            
           <div style="display:flex; gap:6px; width:100%;">

    <button class="btn pct-btn"
        onclick="window.terminalEngine.setWithdrawPct(0.25, this)"
        style="flex:1; font-size:10px; padding:5px 0; border:1px solid #1a2233; background:transparent; color:#8496b0; font-family:var(--font-mono); font-weight:400;">
        25%
    </button>

    <button class="btn pct-btn"
        onclick="window.terminalEngine.setWithdrawPct(0.50, this)"
        style="flex:1; font-size:10px; padding:5px 0; border:1px solid #1a2233; background:transparent; color:#8496b0; font-family:var(--font-mono); font-weight:400;">
        50%
    </button>

    <button class="btn pct-btn active"
        onclick="window.terminalEngine.setWithdrawPct(1.00, this)"
        style="flex:1; font-size:10px; padding:5px 0; border:1px solid var(--accent); background:rgba(0,188,212,0.08); color:var(--accent); font-family:var(--font-mono); font-weight:400;">
        100%
    </button>

</div>
            <button id="btn-withdraw" class="btn-action" onclick="window.terminalEngine.executeWithdraw()" disabled style="padding: 8px 0; width: 100%; border-color: #1a2233; color: #4b586c; background: rgba(255,255,255,0.01); font-weight: 400; font-size: 11px; font-family: var(--font-mono); letter-spacing: 0.5px; cursor: not-allowed; display: block; box-sizing: border-box; text-align: center;">
            WITHDRAWAL
            </button>
        </div>

        <div class="section-header">Infrastructure Telemetry</div>
        <div style="padding:15px; font-family:var(--font-mono); font-size:10px; background: #080b12; flex: 0;">
            <div class="telemetry-row"><span>Algorithmic Uptime</span><span style="color:var(--green)">100.00%</span></div>
            <div class="telemetry-row"><span>Gateway Status</span><span id="gate-status" style="color:var(--green)">SYNC_SUCCESS</span></div>
            <div class="telemetry-row"><span>Execution Engine</span><span style="color:var(--accent); font-weight: bold; text-shadow: 0 0 6px rgba(0, 188, 212, 0.4);">AUTONOMOUS</span></div>
        </div>
    </div>

   <div class="panel" style="grid-column: 1/2; border-top: 1px solid var(--border); overflow: hidden;">
        <div class="section-header">1. Market Intelligence</div>
        <div id="market-logs" class="log-area" style="font-size: 9.5px; line-height: 1.4; padding: 10px; word-break: break-all; overflow-y: auto;"></div>
    </div>
    <div class="panel" style="grid-column: 2/3; border-top: 1px solid var(--border); overflow: hidden;">
        <div class="section-header">2. Execution Ledger</div>
        <div id="execution-logs" class="log-area" style="font-size: 9.5px; line-height: 1.4; padding: 10px; word-break: break-all; overflow-y: auto;"></div>
    </div>
    <div class="panel" style="grid-column: 3/4; border-top: 1px solid var(--border); overflow: hidden;">
        <div class="section-header">3. System Diagnostics</div>
        <div id="system-logs" class="log-area" style="font-size: 9.5px; line-height: 1.4; padding: 10px; word-break: break-all; overflow-y: auto;"></div>
    </div>
</div>`;

function f(v) {
    if (!v && v !== 0) return '0.00';
    
    // Maak eerst de standaard chique opmaak met duizendtal-komma's (bijv: 45,000,000.00)
    const formatted = v.toLocaleString('en-US', { 
        minimumFractionDigits: 2, 
        maximumFractionDigits: 2 
    });
    
    const absV = Math.abs(v);
    
    // Als het in de miljoenen loopt, zetten we er op een rustige manier "M" achter met een spatie
    if (absV >= 1.0e+6) {
        return `${formatted} M`;
    }
    
    // Als het in de miljarden loopt
    if (absV >= 1.0e+9) {
        return `${formatted} B`;
    }

    return formatted;
}

function triggerPulse(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.remove('pulse-update');
        void el.offsetWidth; 
        el.classList.add('pulse-update');
    }
}

function writeLog(target, msg, color) {
    const el = document.getElementById(`${target}-logs`);
    if(!el) return;
    const ts = new Date().toLocaleTimeString('en-GB', { hour12: false });
    el.insertAdjacentHTML('afterbegin', `<div class="log-line"><span class="ts">${ts}</span><span style="color:${color || 'inherit'}">${msg}</span></div>`);
    if(el.children.length > 20) el.lastChild.remove();
}

function updateAnalytics() {
    let vixChange = (Math.random() - 0.5) * 0.4;
    currentVix = Math.max(11, Math.min(28, currentVix + vixChange));
    const vixValEl = document.getElementById('vix-val');
    if (vixValEl) vixValEl.innerText = currentVix.toFixed(2);
    
    const vixBarEl = document.getElementById('vix-bar');
    if (vixBarEl) vixBarEl.style.width = ((currentVix / 30) * 100) + '%';
    
    const alpha = (0.5 + (funds[activeID].nav / funds[activeID].start) * 0.3 + Math.random() * 0.15).toFixed(2);
    const alphaScoreEl = document.getElementById('alpha-score');
    if (alphaScoreEl) alphaScoreEl.innerText = alpha;

    const calculatedFrequency = (0.3 + Math.random() * 0.5) * strategyMultiplier;
    const velocityEl = document.getElementById('velocity');
    if (velocityEl) velocityEl.innerText = `${calculatedFrequency.toFixed(1)} Hz`;

    const regimeValEl = document.getElementById('regime-val');
    if(regimeValEl) {
        if(currentVix > 17) {
            regimeValEl.innerText = "COMPRESSED_VOL";
            regimeValEl.style.color = "var(--red)";
        } else {
            regimeValEl.innerText = "LOW_VOL_DRIFT";
            regimeValEl.style.color = "var(--green)";
        }
    }
    
    const intervalSpeed = Math.round(1500 / strategyMultiplier);
    const sessSpeedEl = document.getElementById('sess-speed');
    if (sessSpeedEl) sessSpeedEl.innerText = `${intervalSpeed}ms`;
}

function updateUI() {
    if (!document.getElementById('nav')) return; // Beveiliging als terminal onzichtbaar is

    let unPnl = 0; 
    let totalPortfolioValuation = 0; 
    let positionHtml = "";

    Object.keys(user.holdings).forEach(id => {
        const currentFnd = funds[id];
        const currentHolding = user.holdings[id];
        const currentValuation = currentHolding * currentFnd.nav;
        totalPortfolioValuation += currentValuation;

        if(currentHolding > 0) {
            const totalCostBasis = currentHolding * user.costBasis[id];
            const deltaPnL = (currentValuation - totalCostBasis);
            unPnl += deltaPnL;
            const sectorRoi = (((currentFnd.nav - user.costBasis[id]) / user.costBasis[id]) * 100);
            
            positionHtml += `<tr>
                <td style="padding:7px 15px; font-weight:500; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${currentFnd.name}</td>
                <td style="text-align:right; padding:7px 15px; font-family:var(--font-mono); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${f(currentValuation)} USDT</td>
                <td style="text-align:right; padding:7px 15px; font-family:var(--font-mono); color:${sectorRoi >= 0 ? 'var(--green)' : 'var(--red)'}; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${sectorRoi >= 0 ? '+':''}${sectorRoi.toFixed(2)}%</td>
            </tr>`;
        }
    });

    const computedNav = totalPortfolioValuation + wallet.USDT;
    const totalEquity = computedNav + vaultBalance + totalRealizedPnL;
    
    if (totalEquity > peakEquity) peakEquity = totalEquity;
    const currentDrawdown = ((peakEquity - totalEquity) / peakEquity) * 100;
    if (currentDrawdown > maxDrawdown) maxDrawdown = currentDrawdown;

   
document.getElementById('nav').innerText = computedNav.toLocaleString('en-US', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
});
    document.getElementById('total-equity').innerText = totalEquity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    document.getElementById('cash-reserve').innerText = `${f(wallet.USDT)} USDT`;
    document.getElementById('vault-balance').innerText = `${f(vaultBalance)} USDT`;
    
    // Waarden injecteren met layout-beveiliging
    // NIEUWE SITUATIE in src/terminal/terminalUI.js -> functie updateUI()
    // Waarden injecteren zonder USDT en met strikte opmaak
    // Plak dit er exact voor in de plaats:
const rPnlStr = totalRealizedPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const unPnlStr = `-${Math.abs(unPnl).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const realizedPnlEl = document.getElementById('realized-pnl');
if (realizedPnlEl) {
    realizedPnlEl.innerText = rPnlStr;
    realizedPnlEl.style.whiteSpace = 'nowrap';
    realizedPnlEl.style.fontSize = '14px'; // Altijd 14px, geen gedans
    
    if (parseFloat(totalRealizedPnL) > 0.01) realizedPnlEl.style.color = '#00ffcc';
    else if (parseFloat(totalRealizedPnL) < -0.01) realizedPnlEl.style.color = 'var(--red)';
    else realizedPnlEl.style.color = '#cbd5e1'; 
}

const unrealizedPnlEl = document.getElementById('unrealized-pnl');
if (unrealizedPnlEl) {
    unrealizedPnlEl.innerText = unPnlStr;
    unrealizedPnlEl.style.whiteSpace = 'nowrap';
    unrealizedPnlEl.style.fontSize = '14px'; // Altijd 14px, geen gedans
    unrealizedPnlEl.style.color = 'var(--red)'; // Altijd strikt rood
}
    
    document.getElementById('exposure-table').innerHTML = positionHtml || "<tr><td colspan='3' style='text-align:center; padding:15px; color:#5d6e85; font-size:9.5px;'>AWAITING ORDER ACQUISITION...</td></tr>";

    const shareRatio = (totalPortfolioValuation / computedNav * 100).toFixed(1);
    document.getElementById('perf-exposure').innerText = `${shareRatio}%`;

    const selectedFund = funds[activeID];
    let assetHtml = "";
    selectedFund.assets.forEach(a => {
        const assetPrice = a.p * (selectedFund.nav / selectedFund.start);
        assetHtml += `<tr>
            <td style="padding:6px 15px; font-weight:500; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.s}</td>
            <td style="color:#5d6e85; padding:6px 15px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.n}</td>
            <td style="text-align:right; padding:6px 15px; color:#fff; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" class="font-mono">${f(assetPrice)} USDT</td>
        </tr>`;
    });
    document.getElementById('asset-table').innerHTML = assetHtml;

    const historicalReturn = ((computedNav - 45000000.00) / 45000000.00 * 100);
    document.getElementById('perf-total').innerText = `${historicalReturn >= 0 ? '+':''}${historicalReturn.toFixed(2)}%`;
    document.getElementById('perf').innerText = `${historicalReturn >= 0 ? '+':''}${historicalReturn.toFixed(2)}%`;
    document.getElementById('perf').style.color = historicalReturn >= 0 ? 'var(--green)' : 'var(--red)';
    
    const dynamic1hReturn = (historicalReturn * 0.85) + (Math.random() * 0.02);
    document.getElementById('perf-1h').innerText = `${dynamic1hReturn >= 0 ? '+':''}${dynamic1hReturn.toFixed(2)}%`;
    document.getElementById('perf-dd').innerText = `-${maxDrawdown.toFixed(2)}%`;
    
    const dynamicSharpe = Math.max(2.1, 3.41 + (historicalReturn * 0.05) - (currentVix * 0.02));
    document.getElementById('perf-sharpe').innerText = dynamicSharpe.toFixed(2);

   
    updateAnalytics();
}

function marketTick() {
    Object.keys(funds).forEach(id => {
        const fnd = funds[id];
        const walk = (Math.random() - 0.47) * fnd.beta * strategyMultiplier * 2.5; 
        fnd.nav = Math.max(100, fnd.nav + walk + (fnd.bias * strategyMultiplier));
    });
    
    // Live WebSocket / Order feed simulatie toevoegen aan de logs!
    if(Math.random() < 0.4) {
        const selectedFund = funds[activeID];
        const randomAsset = selectedFund.assets[Math.floor(Math.random() * selectedFund.assets.length)];
        const simulatedPrice = randomAsset.p * (selectedFund.nav / selectedFund.start);
        writeLog('market', `Feed Tick: ${randomAsset.s} // Inst. Price Update -> ${f(simulatedPrice)} USDT`, '#a0aec0');
    }
    updateUI();
}

function aiScalper() {
    if(autoModeTimer > 0) {
        autoModeTimer--;
    } else {
        const sectors = Object.keys(funds);
        const leader = sectors.reduce((a, b) => (funds[a].nav / funds[a].start) > (funds[b].nav / funds[b].start) ? a : b);
        if (activeID !== leader && Math.random() < 0.15) {
            activeID = leader;
            const fundIdEl = document.getElementById('fund-id');
            if (fundIdEl) fundIdEl.value = activeID;
            document.getElementById('sync-status').innerText = "SYSTEMATIC_ROTATION";
            document.getElementById('sync-status').style.color = "#fff";
            writeLog('system', `Strategy engine auto-rotated concentration to: ${activeID.toUpperCase()}`, 'var(--text-main)');
        }
    }

    const activeFund = funds[activeID];
    const holdings = user.holdings[activeID];

    if (wallet.USDT > 100000 && (holdings === 0 || Math.random() < 0.40)) {
        const tradeVolume = wallet.USDT * 0.06 * strategyMultiplier;
        wallet.USDT -= tradeVolume;
        const acquiredShares = tradeVolume / activeFund.nav;
        
        if(user.holdings[activeID] === 0) {
            user.costBasis[activeID] = activeFund.nav;
        } else {
            user.costBasis[activeID] = ((user.holdings[activeID] * user.costBasis[activeID]) + tradeVolume) / (user.holdings[activeID] + acquiredShares);
        }
      user.holdings[activeID] += acquiredShares;
        writeLog('execution', `Order executed: Allocation Expand [${activeFund.name}] (${f(tradeVolume)} USDT)`, 'var(--text-main)');
    } 
    else if (holdings > 0 && (activeFund.nav > user.costBasis[activeID] * 1.008)) {
        const liquidValuation = holdings * activeFund.nav;
        const costBasisValue = holdings * user.costBasis[activeID];
        const netProfit = liquidValuation - costBasisValue;
        
        totalRealizedPnL += netProfit;
        wallet.USDT += liquidValuation;
        user.holdings[activeID] = 0; 
        user.costBasis[activeID] = 0;
        writeLog('execution', `Order executed: Asset Realization [${activeFund.name}] (+${f(netProfit)} USDT Net PnL)`, 'var(--green)');
    }
}

function updateLatency() {
    const latencyEl = document.getElementById('sys-latency');
    if (latencyEl) {
        const randomLatency = (0.8 + Math.random() * 0.7).toFixed(1);
        latencyEl.innerText = randomLatency;
    }
}

function updateSessionTracker() {
    const elapsedDelta = Date.now() - sessionStartTs;
    const hrs = String(Math.floor(elapsedDelta / 3600000)).padStart(2, '0');
    const mins = String(Math.floor((elapsedDelta % 3600000) / 60000)).padStart(2, '0');
    const secs = String(Math.floor((elapsedDelta % 60000) / 1000)).padStart(2, '0');
    document.getElementById('sess-time').innerText = `${hrs}:${mins}:${secs}`;
    
    const currentNav = Object.keys(user.holdings).reduce((acc, id) => acc + (user.holdings[id] * funds[id].nav), 0) + wallet.USDT;
    const netSessionDelta = ((currentNav - initialNavBaseline) / initialNavBaseline) * 100;
    const prefixSymbol = netSessionDelta >= 0 ? '+' : '';
    
    document.getElementById('sess-ret').innerText = `${prefixSymbol}${netSessionDelta.toFixed(4)}%`;
    document.getElementById('perf-session').innerText = `${prefixSymbol}${netSessionDelta.toFixed(2)}%`;
    document.getElementById('perf-session').style.color = netSessionDelta >= 0 ? 'var(--green)' : 'var(--red)';
}

function generateOrderbookFlow() {
    const ob = document.getElementById('orderbook');
    if (!ob) return;
    const rootPrice = funds[activeID].nav;
    let h = "";
    
    for(let i = 5; i > 0; i--) {
        const askPrice = rootPrice + (i * (0.1 + Math.random() * 0.15));
        const askSize = (10 + Math.random() * 290).toFixed(1);
        const total = (askPrice * askSize).toFixed(0);
        h += `<div class="ob-row"><span style="color:var(--red)">${f(askPrice)}</span><span style="text-align:right">${askSize}</span><span style="text-align:right; color:#4b586c">${total}</span></div>`;
    }
    
    h += `<div style="padding:4px 15px; font-size:9.5px; color:#5d6e85; background:rgba(0,0,0,0.15); border-top:1px dashed #141d2b; border-bottom:1px dashed #141d2b; font-family:var(--font-mono); margin:2px 0;">MID_MARKET: ${f(rootPrice)} USDT</div>`;
    
    for(let i = 1; i <= 5; i++) {
        const bidPrice = rootPrice - (i * (0.1 + Math.random() * 0.15));
        const bidSize = (10 + Math.random() * 290).toFixed(1);
        const total = (bidPrice * bidSize).toFixed(0);
        h += `<div class="ob-row"><span style="color:var(--green)">${f(bidPrice)}</span><span style="text-align:right">${bidSize}</span><span style="text-align:right; color:#4b586c">${total}</span></div>`;
    }
    
    ob.innerHTML = h;
}

// Global scope mapping voor alle interactieve knoppen binnen de ES-module architecture
let selectedWithdrawPct = 1.00; // Houdt het gekozen percentage bij (standaard 100%)



window.terminalEngine = {
    // Live validatie van het ingevoerde adres + vinkje + knop activatie
    validateAddress: (address) => {
        const statusEl = document.getElementById('address-status');
        const withdrawBtn = document.getElementById('btn-withdraw');
        
        // Controleert of het adres start met 0x en exact 42 tekens lang is
        const isValidERC20 = /^0x[a-fA-F0-9]{40}$/.test(address.trim());

        if (isValidERC20) {
            statusEl.innerText = "✓ VALID_DESTINATION";
            statusEl.style.color = "var(--green)";
            
            // Zet de knop open en geef het de actieve cyan kleur
            withdrawBtn.disabled = false;
            withdrawBtn.style.cursor = "pointer";
            withdrawBtn.style.borderColor = "var(--accent)";
            withdrawBtn.style.color = "var(--accent)";
            withdrawBtn.style.background = "rgba(0, 188, 212, 0.02)";
        } else {
            statusEl.innerText = address.trim().length > 0 ? "INVALID_ADDRESS" : "AWAITING_DESTINATION";
            statusEl.style.color = "var(--red)";
            
            // Zet de knop onwrikbaar op slot
            withdrawBtn.disabled = true;
            withdrawBtn.style.cursor = "not-allowed";
            withdrawBtn.style.borderColor = "var(--border)";
            withdrawBtn.style.color = "#4b586c";
            withdrawBtn.style.background = "rgba(255,255,255,0.02)";
        }
    },

    setWithdrawPct: (pct, btn) => {
    selectedWithdrawPct = pct;
    document.querySelectorAll('.pct-btn').forEach(b => {
    b.classList.remove('active');
});

if (btn) {
    btn.classList.add('active');
}
    
    // ... [Houd de knop-styling code die hier al stond exact hetzelfde] ...
    
    const targetAmount = (wallet.USDT + vaultBalance) * selectedWithdrawPct;
    
    const amtDisplay = document.getElementById('withdraw-amount-display');
    if (amtDisplay) {
        amtDisplay.innerText = `${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT`;
    }
    
    writeLog('system', `Withdrawal volume adjusted to ${(pct * 100)}% (${targetAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDT)`, '#5d6e85');
},

    manualSelect: (val) => {
        activeID = val;
        autoModeTimer = 20; 
        document.getElementById('sync-status').innerText = "MANUAL_LOCK_ENGAGED";
        document.getElementById('sync-status').style.color = "var(--red)";
        writeLog('system', `Manual tracking override engaged on instrument target: ${val.toUpperCase()}`, '#5d6e85');
        updateUI();
    },

    setStrategy: (m, btn) => {
        strategyMultiplier = m;
        autoModeTimer = 0; 
        document.getElementById('sync-status').innerText = "SYSTEMATIC_ROTATION";
        document.getElementById('sync-status').style.color = "#fff";
        document.querySelectorAll('.app-shell .btn:not(.pct-btn)').forEach(x => x.classList.remove('active'));
        btn.classList.add('active');
        writeLog('system', `Algorithmic profile matrix risk scaling adjusted to: ${m}x`, 'var(--green)');
    },

    vaultSweep: () => {
        if(totalRealizedPnL > 0) {
            const sweepAmount = totalRealizedPnL;
            vaultBalance += sweepAmount;
            totalRealizedPnL = 0;
            writeLog('execution', `Asset Ledger Action: Capital Swept to Reserve Vault (+${f(sweepAmount)} USDT)`, 'var(--green)');
            updateUI();
        } else {
            writeLog('system', "Sweep command rejected: Available realized earnings pool is zero.", 'var(--red)');
        }
    },

    resetSessionMetrics: () => {
        const currentNav = Object.keys(user.holdings).reduce((acc, id) => acc + (user.holdings[id] * funds[id].nav), 0) + wallet.USDT;
        initialNavBaseline = currentNav; 
        maxDrawdown = 0;
        peakEquity = currentNav;
        sessionStartTs = Date.now();
        writeLog('system', "System diagnostic event: Session tracking matrices recalibrated to current baseline.", '#fff');
        updateUI();
    },

  executeWithdraw: () => {
        const withdrawBtn = document.getElementById('btn-withdraw');
        const gateStatus = document.getElementById('gate-status');
        const addressVal = document.getElementById('erc20-address').value;
        
        const totalAvailable = wallet.USDT + vaultBalance;
        const totalToWithdraw = totalAvailable * selectedWithdrawPct;
        
        if (totalToWithdraw <= 0) {
            writeLog('system', "Withdrawal Rejected: Calculated payout amount is zero.", 'var(--red)');
            return;
        }
        
        if (withdrawBtn.disabled) return;

        // 1. Start fase: UI Vergrendelen (Direct)
        withdrawBtn.disabled = true;
        withdrawBtn.innerText = "PROCESSING SECURE LINK...";
        withdrawBtn.style.color = "var(--text-dim)";
        withdrawBtn.style.borderColor = "var(--border)";
        withdrawBtn.style.cursor = "not-allowed";
        
        if (gateStatus) {
            gateStatus.innerText = "ESTABLISHING_TUNNEL...";
            gateStatus.style.color = "#f59e0b";
        }

        writeLog('system', `CRITICAL: Withdrawal request for ${f(totalToWithdraw)} USDT initiated to destination ${addressVal.substring(0,6)}...`, '#fff');
        
        // 2. Na 2.5 seconden: Genereer TXID en start netwerk propagatie
        setTimeout(() => {
            const mockHash = "0x" + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');
            
            writeLog('system', `BROADCASTING: Transaction hash generated. TXID: ${mockHash.substring(0,18)}...`, '#5d6e85');
            writeLog('execution', `Vault state change triggered: Awaiting node propagation.`, '#f59e0b');
            
            if (gateStatus) {
                gateStatus.innerText = "AWAITING_CONFIRMATIONS (0/3)...";
                gateStatus.style.color = "#f59e0b";
            }

            // 3. Na 3.0 seconden extra: Eerste confirmatie (Blok mined)
            setTimeout(() => {
                writeLog('system', "Network consensus: Block mined. Confirmation (1/3) received.", '#5d6e85');
                if (gateStatus) gateStatus.innerText = "CONFIRMING (1/3)...";

                // 4. Na 3.0 seconden extra: Tweede confirmatie (Mempool sync)
                setTimeout(() => {
                    writeLog('system', "Network consensus: Node synchronization stable. Confirmation (2/3) received.", '#5d6e85');
                    if (gateStatus) gateStatus.innerText = "CONFIRMING (2/3)...";

                    // 5. Na 3.0 seconden extra: Derde confirmatie & Ledger verwerking
                    setTimeout(() => {
                        if (selectedWithdrawPct === 1.00) {
                            wallet.USDT = 0;
                            vaultBalance = 0;
                            totalRealizedPnL = 0;
                        } else {
                            wallet.USDT -= (wallet.USDT * selectedWithdrawPct);
                            vaultBalance -= (vaultBalance * selectedWithdrawPct);
                        }
                        
                        // HIER IS HET ADRES TOEGEVOEGD AAN DE SYSTEM DIAGNOSTICS LOG
                        writeLog('system', `TRANSFER SUBMITTED // Released: ${f(totalToWithdraw)} USDT transferred to ${addressVal.trim()}`, 'var(--green)');
                        writeLog('execution', `Ledger finalized: Account adjusted. Status: TRANSMITTED.`, 'var(--green)');
                        
                        withdrawBtn.innerText = "TRANSFER COMPLETED";
                        withdrawBtn.style.borderColor = "var(--green)";
                        withdrawBtn.style.color = "var(--green)";
                        
                        if (gateStatus) {
                            gateStatus.innerText = "TRANSFER_SUCCESS";
                            gateStatus.style.color = "var(--green)";
                        }
                        
                        updateUI();

                        // ==========================================
                        // EFFECTEN: AUDIO & VISUELE CONFIRMATIE
                        // ==========================================
                        try {
                            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
                            const oscillator = audioCtx.createOscillator();
                            const gainNode = audioCtx.createGain();
                            
                            oscillator.connect(gainNode);
                            gainNode.connect(audioCtx.destination);
                            
                            oscillator.type = 'sine';
                            oscillator.frequency.setValueAtTime(800, audioCtx.currentTime);
                            oscillator.frequency.exponentialRampToValueAtTime(150, audioCtx.currentTime + 0.6);
                            
                            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
                            
                            oscillator.start();
                            oscillator.stop(audioCtx.currentTime + 0.6);
                        } catch(e) { console.log("Audio FX blocked"); }

                        const pop = document.getElementById('popup-alert');
                        if(pop) pop.classList.add('show');

                        const plane = document.getElementById('plane-fx');
                        if(plane) {
                            plane.classList.remove('fly');
                            void plane.offsetWidth; 
                            plane.classList.add('fly');
                        }

                        setTimeout(() => {
                            if(pop) pop.classList.remove('show');
                        }, 3500);
                        // ==========================================
                        
                        // 6. Na 5.0 seconden rust herstelt de knop zich weer naar de beginstatus
                        setTimeout(() => {
                            window.terminalEngine.validateAddress(document.getElementById('erc20-address').value);
                            withdrawBtn.innerText = "INITIATE CAPITAL WITHDRAWAL";
                            if (gateStatus) {
                                gateStatus.innerText = "SYNC_SUCCESS";
                                gateStatus.style.color = "var(--green)";
                            }
                        }, 5000);

                    }, 3000); // Wachttijd voor block finalization (2/3 -> 3/3)
                }, 3000); // Wachttijd tussen node syncs (1/3 -> 2/3)
            }, 3000); // Wachttijd till de eerste block mining (0/3 -> 1/3)

        }, 2500); // Wachttijd voor de initiële handshake en hash generatie
    }
};

export function startTerminal() {
    sessionStartTs = Date.now();
    initialNavBaseline = Object.keys(user.holdings).reduce((acc, id) => acc + (user.holdings[id] * funds[id].nav), 0) + wallet.USDT;
    
    writeLog('system', "AIIRAA Automated Core Engine: Initializing secure handshakes...", '#5d6e85');
    setTimeout(() => writeLog('system', "API Matrix Protocol: Pipeline architecture verified.", '#5d6e85'), 400);
    setTimeout(() => writeLog('system', "Liquidity Providers: Primary gateways linked successfully.", 'var(--green)'), 800);
    setTimeout(() => writeLog('system', "SYSTEM STATE: ACTIVE. Autonomous allocation deployment ready.", 'var(--accent)'), 1200);
    
    writeLog('market', "Feed connected: Binance Prime Core WebSocket.", '#5d6e85');
    writeLog('market', "Feed connected: Coinbase Institutional Custody.", '#5d6e85');

    updateUI();
    
    // Vult de actieve intervals array
    activeIntervals = [
        setInterval(marketTick, 1000),
        setInterval(aiScalper, 1400),
        setInterval(updateSessionTracker, 1000),
        setInterval(generateOrderbookFlow, 700),
        setInterval(updateLatency, 2000)
    ];

    return activeIntervals;
}