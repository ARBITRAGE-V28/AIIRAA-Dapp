// src/terminal/terminal.js

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
let withdrawPercentage = 1.00; // Houdt 0.25, 0.50 of 1.00 bij

function f(v) { return (v || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function triggerPulse(id) {
    const el = document.getElementById(id);
    if(el) {
        el.classList.remove('pulse-update');
        void el.offsetWidth; 
        el.classList.add('pulse-update');
    }
}

function writeLog(target, msg, color) {
    const shell = document.getElementById('app-shell');
    if (!shell || shell.classList.contains('is-blurred')) return;

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
    const vixBarEl = document.getElementById('vix-bar');
    if (vixValEl) vixValEl.innerText = currentVix.toFixed(2);
    if (vixBarEl) vixBarEl.style.width = ((currentVix / 30) * 100) + '%';
    
    const alphaScoreEl = document.getElementById('alpha-score');
    const alpha = (0.5 + (funds[activeID].nav / funds[activeID].start) * 0.3 + Math.random() * 0.15).toFixed(2);
    if (alphaScoreEl) alphaScoreEl.innerText = alpha;

    const velocityEl = document.getElementById('velocity');
    const calculatedFrequency = (0.3 + Math.random() * 0.5) * strategyMultiplier;
    if (velocityEl) velocityEl.innerText = `${calculatedFrequency.toFixed(1)} Hz`;

    const regimeValEl = document.getElementById('regime-val');
    if (regimeValEl) {
        if(currentVix > 17) {
            regimeValEl.innerText = "COMPRESSED_VOL";
            regimeValEl.style.color = "var(--red)";
        } else {
            regimeValEl.innerText = "LOW_VOL_DRIFT";
            regimeValEl.style.color = "var(--green)";
        }
    }
    
    const sessSpeedEl = document.getElementById('sess-speed');
    const intervalSpeed = Math.round(1500 / strategyMultiplier);
    if (sessSpeedEl) sessSpeedEl.innerText = `${intervalSpeed}ms`;
}

function updateUI() {
    const shell = document.getElementById('app-shell');
    if (!shell || shell.classList.contains('is-blurred')) return;

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

    document.getElementById('nav').innerText = `${f(computedNav)} USDT`;
    document.getElementById('total-equity').innerText = `${f(totalEquity)} USDT`;
    document.getElementById('cash-reserve').innerText = `${f(wallet.USDT)} USDT`;
    document.getElementById('vault-balance').innerText = `${f(vaultBalance)} USDT`;
    document.getElementById('realized-pnl').innerText = `${f(totalRealizedPnL)} USDT`;
    
    const unPnlEl = document.getElementById('unrealized-pnl');
    unPnlEl.innerText = `${f(unPnl)} USDT`;
    unPnlEl.style.color = unPnl >= 0 ? 'var(--green)' : 'var(--red)';
    
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
    
    const perfEl = document.getElementById('perf');
    perfEl.innerText = `${historicalReturn >= 0 ? '+':''}${historicalReturn.toFixed(2)}%`;
    perfEl.style.color = historicalReturn >= 0 ? 'var(--green)' : 'var(--red)';
    
    const dynamic1hReturn = (historicalReturn * 0.85) + (Math.random() * 0.02);
    document.getElementById('perf-1h').innerText = `${dynamic1hReturn >= 0 ? '+':''}${dynamic1hReturn.toFixed(2)}%`;
    document.getElementById('perf-dd').innerText = `-${maxDrawdown.toFixed(2)}%`;
    
    const dynamicSharpe = Math.max(2.1, 3.41 + (historicalReturn * 0.05) - (currentVix * 0.02));
    document.getElementById('perf-sharpe').innerText = dynamicSharpe.toFixed(2);

    triggerPulse('nav');
    triggerPulse('unrealized-pnl');
    updateAnalytics();
}

function marketTick() {
    Object.keys(funds).forEach(id => {
        const fnd = funds[id];
        const walk = (Math.random() - 0.47) * fnd.beta * strategyMultiplier * 2.5; 
        fnd.nav = Math.max(100, fnd.nav + walk + (fnd.bias * strategyMultiplier));
    });
    updateUI();
}

function aiScalper() {
    const shell = document.getElementById('app-shell');
    if (!shell || shell.classList.contains('is-blurred')) return;

    if(autoModeTimer > 0) {
        autoModeTimer--;
    } else {
        const sectors = Object.keys(funds);
        const leader = sectors.reduce((a, b) => (funds[a].nav / funds[a].start) > (funds[b].nav / funds[b].start) ? a : b);
        if (activeID !== leader && Math.random() < 0.15) {
            activeID = leader;
            const fundIdEl = document.getElementById('fund-id');
            const syncStatusEl = document.getElementById('sync-status');
            if (fundIdEl) fundIdEl.value = activeID;
            if (syncStatusEl) {
                syncStatusEl.innerText = "SYSTEMATIC_ROTATION";
                syncStatusEl.style.color = "#fff";
            }
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
        triggerPulse('realized-pnl');
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
        triggerPulse('realized-pnl');
    }
}

function updateSessionTracker() {
    const shell = document.getElementById('app-shell');
    if (!shell || shell.classList.contains('is-blurred')) return;

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
    const shell = document.getElementById('app-shell');
    if (!shell || shell.classList.contains('is-blurred')) return;

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

function manualSelect(val) {
    activeID = val;
    autoModeTimer = 20; 
    document.getElementById('sync-status').innerText = "MANUAL_LOCK_ENGAGED";
    document.getElementById('sync-status').style.color = "var(--red)";
    writeLog('system', `Manual tracking override engaged on instrument target: ${val.toUpperCase()}`, '#5d6e85');
    updateUI();
}

function setStrategy(m, btn) {
    strategyMultiplier = m;
    autoModeTimer = 0; 
    document.getElementById('sync-status').innerText = "SYSTEMATIC_ROTATION";
    document.getElementById('sync-status').style.color = "#fff";
    document.querySelectorAll('.risk-btn').forEach(x => x.classList.remove('active'));
    btn.classList.add('active');
    writeLog('system', `Algorithmic profile matrix risk scaling adjusted to: ${m}x`, 'var(--green)');
}

function vaultSweep() {
    if(totalRealizedPnL > 0) {
        const sweepAmount = totalRealizedPnL;
        vaultBalance += sweepAmount;
        totalRealizedPnL = 0;
        writeLog('execution', `Asset Ledger Action: Capital Swept to Reserve Vault (+${f(sweepAmount)} USDT)`, 'var(--green)');
        updateUI();
    } else {
        writeLog('system', "Sweep command rejected: Available realized earnings pool is zero.", 'var(--red)');
    }
}

function resetSessionMetrics() {
    const currentNav = Object.keys(user.holdings).reduce((acc, id) => acc + (user.holdings[id] * funds[id].nav), 0) + wallet.USDT;
    initialNavBaseline = currentNav; 
    maxDrawdown = 0;
    peakEquity = currentNav;
    sessionStartTs = Date.now();
    writeLog('system', "System diagnostic event: Session tracking matrices recalibrated to current baseline.", '#fff');
    updateUI();
}

// Real-time Validatie van het ERC-20 invoerveld
function validateErc20Address(input) {
    const address = input.value.trim();
    const statusEl = document.getElementById('address-status');
    const withdrawBtn = document.getElementById('btn-withdraw');
    
    // ERC-20 Regex: 0x followed by exactly 40 hex characters
    const erc20Regex = /^0x[a-fA-F0-9]{40}$/;
    
    if (address === "") {
        if (statusEl) {
            statusEl.innerText = "AWAITING_DESTINATION";
            statusEl.style.color = "#5d6e85";
        }
        if (withdrawBtn) withdrawBtn.disabled = true;
        input.style.borderColor = "var(--border)";
        return false;
    }
    
    if (erc20Regex.test(address)) {
        if (statusEl) {
            statusEl.innerText = "✓ VALID_ERC20_ADDRESS";
            statusEl.style.color = "var(--green)";
        }
        if (withdrawBtn && (wallet.USDT > 0 || vaultBalance > 0)) {
            withdrawBtn.disabled = false; // Activeer de knop pas als het adres klopt!
        }
        input.style.borderColor = "var(--green)";
        return true;
    } else {
        if (statusEl) {
            statusEl.innerText = "✗ INVALID_HEX_STRUCTURE";
            statusEl.style.color = "var(--red)";
        }
        if (withdrawBtn) withdrawBtn.disabled = true;
        input.style.borderColor = "var(--red)";
        return false;
    }
}

function setWithdrawPct(pct, clickedBtn) {
    withdrawPercentage = pct;
    document.querySelectorAll('.pct-btn').forEach(x => x.classList.remove('active'));
    clickedBtn.classList.add('active');
    
    const withdrawBtn = document.getElementById('btn-withdraw');
    if (withdrawBtn) {
        withdrawBtn.innerText = `INITIATE CAPITAL WITHDRAWAL (${pct * 100}%)`;
    }
}

function executeWithdraw() {
    const withdrawBtn = document.getElementById('btn-withdraw');
    const gateStatus = document.getElementById('gate-status');
    const addressInput = document.getElementById('erc20-address');
    const statusEl = document.getElementById('address-status');
    
    if (!addressInput || !/^0x[a-fA-F0-9]{40}$/.test(addressInput.value.trim())) {
        writeLog('system', "WITHDRAWAL REJECTED: Invalid network destination.", 'var(--red)');
        return;
    }
    
    if (withdrawBtn.disabled) return;

    const usdtToWithdraw = wallet.USDT * withdrawPercentage;
    const vaultToWithdraw = vaultBalance * withdrawPercentage;
    const totalToWithdraw = usdtToWithdraw + vaultToWithdraw;

    if (totalToWithdraw <= 0) {
        writeLog('system', "Withdrawal Rejected: Selected allocation balance is zero.", 'var(--red)');
        return;
    }

    withdrawBtn.disabled = true;
    addressInput.disabled = true;
    withdrawBtn.innerText = "PROCESSING SECURE LINK...";
    withdrawBtn.style.color = "var(--text-dim)";
    withdrawBtn.style.borderColor = "var(--border)";
    
    if (gateStatus) {
        gateStatus.innerText = "ESTABLISHING_TUNNEL...";
        gateStatus.style.color = "#f59e0b";
    }

    writeLog('system', `CRITICAL: Routing capital base to: ${addressInput.value.substr(0,8)}...${addressInput.value.substr(-6)}`, '#fff');
    writeLog('system', "Securing quantum handshake with network clearinghouse...", '#5d6e85');
    
    setTimeout(() => {
        writeLog('system', "Compiling transaction blocks & validating cryptographic signatures...", '#5d6e85');
        writeLog('execution', `Vault state change: Liquidating ${withdrawPercentage * 100}% of available assets.`, '#f59e0b');
    }, 1500);

    setTimeout(() => {
        wallet.USDT -= usdtToWithdraw;
        vaultBalance -= vaultToWithdraw;
        
        if (withdrawPercentage === 1.00) {
            totalRealizedPnL = 0;
        }
        
        writeLog('system', `TRANSFER SUBMITTED // Released: ${f(totalToWithdraw)} USDT.`, 'var(--green)');
        writeLog('execution', `Ledger finalized: Broadcast success. TX_STATUS: TRANSMITTED.`, 'var(--green)');
        
        withdrawBtn.innerText = "TRANSFER COMPLETED";
        withdrawBtn.style.borderColor = "var(--green)";
        withdrawBtn.style.color = "var(--green)";
        
        if (gateStatus) {
            gateStatus.innerText = "TRANSFER_SUCCESS";
            gateStatus.style.color = "var(--green)";
        }
        
        updateUI();
        triggerPulse('total-equity');
        triggerPulse('cash-reserve');
        triggerPulse('vault-balance');
        
        setTimeout(() => {
            addressInput.disabled = false;
            addressInput.value = "";
            if (statusEl) {
                statusEl.innerText = "AWAITING_DESTINATION";
                statusEl.style.color = "#5d6e85";
            }
            
            withdrawBtn.disabled = true; // Terug op lock zetten want veld is weer leeg
            withdrawBtn.innerText = `INITIATE CAPITAL WITHDRAWAL (${withdrawPercentage * 100}%)`;
            withdrawBtn.style.borderColor = "var(--accent)";
            withdrawBtn.style.color = "var(--accent)";
            if (gateStatus) {
                gateStatus.innerText = "SYNC_SUCCESS";
                gateStatus.style.color = "var(--green)";
            }
        }, 4000);

    }, 3000);
}

export function initTerminal() {
    const fundIdEl = document.getElementById('fund-id');
    if (fundIdEl) {
        fundIdEl.onchange = (e) => manualSelect(e.target.value);
    }

    // Gecorrigeerde risk-knoppen selectie (gebruikt nu unieke classes/ids)
    const riskButtons = document.querySelectorAll('.risk-btn');
    if (riskButtons.length >= 3) {
        riskButtons[0].onclick = () => setStrategy(0.5, riskButtons[0]);
        riskButtons[1].onclick = () => setStrategy(1.0, riskButtons[1]);
        riskButtons[2].onclick = () => setStrategy(2.0, riskButtons[2]);
    }

    const actionBtns = document.querySelectorAll('.btn-action');
    if (actionBtns.length >= 2) {
        actionBtns[0].onclick = () => vaultSweep();
        actionBtns[1].onclick = () => resetSessionMetrics();
    }

    // Koppel de percentage-knoppen handmatig via specifieke ID's (dit lost het probleem op!)
    const pct25 = document.getElementById('pct-25');
    const pct50 = document.getElementById('pct-50');
    const pct100 = document.getElementById('pct-100');
    
    if (pct25) pct25.onclick = () => setWithdrawPct(0.25, pct25);
    if (pct50) pct50.onclick = () => setWithdrawPct(0.50, pct50);
    if (pct100) pct100.onclick = () => setWithdrawPct(1.00, pct100);

    // Koppel real-time input check voor de ERC-20 validatie
    const addressInput = document.getElementById('erc20-address');
    if (addressInput) {
        addressInput.oninput = (e) => validateErc20Address(e.target);
    }

    const mainWithdrawBtn = document.getElementById('btn-withdraw');
    if (mainWithdrawBtn) {
        mainWithdrawBtn.disabled = true; // Standaard disabled tot het adres klopt!
        mainWithdrawBtn.onclick = () => executeWithdraw();
    }

    setInterval(marketTick, 1000);
    setInterval(aiScalper, 1400);
    setInterval(updateSessionTracker, 1000);
    setInterval(generateOrderbookFlow, 700);

    writeLog('system', "AURA Automated Core Engine: Initializing secure handshakes...", '#5d6e85');
    setTimeout(() => writeLog('system', "API Matrix Protocol: Pipeline architecture verified.", '#5d6e85'), 400);
    setTimeout(() => writeLog('system', "Liquidity Providers: Primary gateways linked successfully.", 'var(--green)'), 800);
    setTimeout(() => writeLog('system', "SYSTEM STATE: ACTIVE. Autonomous allocation deployment ready.", 'var(--accent)'), 1200);
    
    writeLog('market', "Feed connected: Binance Prime Core WebSocket.", '#5d6e85');
    writeLog('market', "Feed connected: Coinbase Institutional Custody.", '#5d6e85');
    
    updateUI();
}