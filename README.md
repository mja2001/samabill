# ⚡ SamaBill

**Pay Dakar utility and pharmacy bills in CFA francs (XOF) via Bitcoin Lightning & Nostr—with zero crypto setup for the recipient in Senegal.**

[![Devpost](https://img.shields.io/badge/Devpost-SamaBill-003E54?logo=devpost)](https://devpost.com/software/contrarian-take-samabill)
[![Bitcoin Lightning](https://img.shields.io/badge/Bitcoin-Lightning%20%2B%20NWC-F7931A?logo=bitcoin&logoColor=white)](#architecture)
[![Nostr](https://img.shields.io/badge/Receipts-Nostr%20Verified-8E44AD)](#architecture)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

---

## The Problem (Our Contrarian Take)

Most Bitcoin hackathon apps try to convince neighborhood corner shops to accept BTC for everyday groceries—fighting deeply entrenched local mobile-money habits. **SamaBill** targets a far more painful, broken corridor: **diaspora-to-Dakar essential bills**.

- **High remittance friction:** Senegalese diaspora family members pay steep fees and endure settlement delays just to top up a relative's **Woyofal** prepaid electricity meter or cover a pharmacy prescription.
- **Zero crypto burden on recipients:** A family member or pharmacist in Dakar shouldn't have to manage seed phrases, satoshis, or price volatility just to keep the lights on.
- **Screenshot fraud:** Local merchants often hesitate to release goods based on easily forged payment screenshots.

---

## How SamaBill Works

```mermaid
sequenceDiagram
    participant Dakar as Recipient / Pharmacy (Dakar)
    participant App as SamaBill API
    participant Diaspora as Sender Abroad (NWC / Lightning)
    participant Verify as Merchant Verifier

    Dakar->>App: Create bill in XOF (e.g. 10,000 XOF Woyofal)
    App-->>Diaspora: Share payment link + BOLT11 invoice (~sats)
    Diaspora->>App: Instant settlement via Lightning / NWC
    App-->>Dakar: Issue redemption code + signed Nostr receipt
    Verify->>App: Verify cryptographic signature (no fake screenshots)
