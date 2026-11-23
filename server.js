const http = require("http");
const crypto = require("crypto");

const PORT = process.env.PORT || 3001;
const SATS_PER_XOF = 1.65; // Demo FX rate (1 XOF ≈ 1.65 sats)
const bills = new Map();

function createReceiptHash(bill) {
  return crypto
    .createHash("sha256")
    .update(`${bill.id}:${bill.amountXof}:${bill.paidAt}:samabill-nostr-receipt`)
    .digest("hex");
}

const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>SamaBill — Diaspora-to-Dakar Utility & Pharmacy Payments</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 520px; margin: 24px auto; padding: 0 16px; background: #0f172a; color: #f8fafc; }
    .card { background: #1e293b; padding: 20px; border-radius: 12px; margin-bottom: 16px; border: 1px solid #334155; }
    h1 { margin: 0 0 6px; font-size: 1.5rem; color: #facc15; }
    p.sub { margin: 0 0 16px; color: #94a3b8; font-size: 0.9rem; }
    label { display: block; font-size: 0.85rem; margin-top: 10px; color: #cbd5e1; }
    input, select, button { width: 100%; box-sizing: border-box; padding: 10px; margin-top: 6px; border-radius: 8px; border: 1px solid #475569; background: #0f172a; color: #f8fafc; font-size: 1rem; }
    button { background: #facc15; color: #0f172a; font-weight: 700; border: none; cursor: pointer; margin-top: 14px; }
    button:hover { background: #eab308; }
    .badge { display: inline-block; padding: 4px 8px; border-radius: 6px; font-size: 0.75rem; font-weight: 700; background: #166534; color: #bbf7d0; }
    code { display: block; word-break: break-all; background: #020617; padding: 10px; border-radius: 8px; margin-top: 8px; font-size: 0.8rem; color: #38bdf8; }
  </style>
</head>
<body>
  <div class="card">
    <h1>⚡ SamaBill</h1>
    <p class="sub">Pay Dakar Woyofal electricity & pharmacy bills in XOF via Lightning + Nostr — zero crypto setup for recipients.</p>
    <label>Bill Type</label>
    <select id="type">
      <option value="Woyofal Electricity Meter">Woyofal Prepaid Electricity</option>
      <option value="Dakar Pharmacy Bill">Dakar Pharmacy Prescription</option>
    </select>
    <label>Meter / Receipt Reference</label>
    <input id="ref" placeholder="e.g. WOY-4829103 or PHARMA-204" value="WOY-4829103" />
    <label>Amount (CFA Francs — XOF)</label>
    <input id="amount" type="number" value="10000" min="500" />
    <button onclick="createBill()">Generate Payment Link</button>
  </div>

  <div id="result" class="card" style="display:none;"></div>

  <script>
    async function createBill() {
      const res = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: document.getElementById('type').value,
          reference: document.getElementById('ref').value,
          amountXof: Number(document.getElementById('amount').value)
        })
      });
      renderBill(await res.json());
    }

    async function payBill(id) {
      const res = await fetch('/api/bills/' + id + '/pay', { method: 'POST' });
      renderBill(await res.json());
    }

    function renderBill(b) {
      const el = document.getElementById('result');
      el.style.display = 'block';
      if (b.status === 'PAID') {
        el.innerHTML = \`
          <span class="badge">SETTLED VIA LIGHTNING</span>
          <h3>\${b.type} (\${b.amountXof.toLocaleString()} XOF)</h3>
          <p><strong>Redemption Code:</strong> \${b.voucherCode}</p>
          <p><strong>Verifiable Nostr Receipt ID:</strong></p>
          <code>\${b.nostrReceiptId}</code>
        \`;
      } else {
        el.innerHTML = \`
          <h3>\${b.type}</h3>
          <p><strong>Ref:</strong> \${b.reference}</p>
          <p><strong>Amount:</strong> \${b.amountXof.toLocaleString()} XOF (~ \${b.amountSats.toLocaleString()} sats)</p>
          <p><strong>BOLT11 Demo Invoice:</strong></p>
          <code>\${b.bolt11}</code>
          <button onclick="payBill('\${b.id}')">⚡ Pay Instantly (Demo NWC)</button>
        \`;
      }
    }
  </script>
</body>
</html>`;

const server = http.createServer((req, res) => {
  if (req.method === "GET" && req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    return res.end(html);
  }

  if (req.method === "POST" && req.url === "/api/bills") {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const { type, reference, amountXof } = JSON.parse(body || "{}");
      const id = crypto.randomBytes(4).toString("hex");
      const amountSats = Math.round((amountXof || 5000) * SATS_PER_XOF);
      const bill = {
        id,
        type: type || "Woyofal Electricity Meter",
        reference: reference || "WOY-DEMO",
        amountXof: amountXof || 5000,
        amountSats,
        bolt11: `lntb${amountSats}n1psamabilldemo${id}`,
        status: "PENDING",
      };
      bills.set(id, bill);
      res.writeHead(201, { "Content-Type": "application/json" });
      res.end(JSON.stringify(bill));
    });
    return;
  }

  const payMatch = req.url.match(/^\/api\/bills\/([a-f0-9]+)\/pay$/);
  if (req.method === "POST" && payMatch) {
    const bill = bills.get(payMatch[1]);
    if (!bill) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ error: "Bill not found" }));
    }
    bill.status = "PAID";
    bill.paidAt = new Date().toISOString();
    bill.voucherCode = `DKR-${bill.id.toUpperCase()}`;
    bill.nostrReceiptId = createReceiptHash(bill);
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(JSON.stringify(bill));
  }

  res.writeHead(404);
  res.end("Not found");
});

server.listen(PORT, () => {
  console.log(`SamaBill running at http://localhost:${PORT}`);
});