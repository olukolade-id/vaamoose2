/**
 * PayazaCheckout.jsx
 * Drop-in payment modal for Vaamoose
 * Usage: <PayazaCheckout amount={295} currency="NGN" customer={...} onSuccess={...} onClose={...} />
 */

import { useState, useEffect, useRef } from 'react';

// ─── Config ───────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

// ─── API Calls ────────────────────────────────────────────────────────────────
async function apiFetch(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json();
  if (!res.ok || !data.success) throw new Error(data.message || 'Request failed');
  return data.data;
}

// ─── Countdown Hook ───────────────────────────────────────────────────────────
function useCountdown(seconds) {
  const [remaining, setRemaining] = useState(seconds);
  useEffect(() => {
    if (remaining <= 0) return;
    const t = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(t);
  }, []);
  const m = Math.floor(remaining / 60), s = remaining % 60;
  return remaining > 0 ? `${m}:${s.toString().padStart(2, '0')}` : 'expired';
}

// ─── Copy Hook ────────────────────────────────────────────────────────────────
function useCopy() {
  const [copied, setCopied] = useState(null);
  const copy = (text, key) => {
    navigator.clipboard?.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  };
  return { copy, copied };
}

// ═══════════════════════════════════════════════════════════════════════════════
//  PAYMENT METHOD PANELS
// ═══════════════════════════════════════════════════════════════════════════════

// Transfer Panel — virtual account
function TransferPanel({ amount, currency, customer, onSuccess, onError }) {
  const [va, setVa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const { copy, copied } = useCopy();
  const timer = useCountdown(va ? 30 * 60 : 0);

  useEffect(() => {
    apiFetch('/payment/payaza/virtual-account', {
      method: 'POST',
      body: JSON.stringify({ amount, currency, customer, type: 'Dynamic', expiresInMinutes: 30 }),
    })
      .then(setVa)
      .catch(onError)
      .finally(() => setLoading(false));
  }, []);

  const handleConfirm = async () => {
    setChecking(true);
    try {
      const result = await apiFetch(`/payment/verify/${va.reference}`);
      if (result.success && result.booking) {
        onSuccess(result);
      } else {
        onError(new Error('Payment not yet confirmed. Please wait a moment and try again.'));
      }
    } catch (err) {
      onError(err);
    } finally {
      setChecking(false);
    }
  };

  if (loading) return <div style={s.loading}>Generating account details…</div>;

  return (
    <div>
      <p style={s.panelTitle}>Transfer {currency} {amount.toLocaleString()} to Vaamoose</p>
      <div style={s.infoBox}>
        <InfoRow label="BANK NAME" value={va?.bankName || 'Payaza-Titan'} extra={<span style={s.changeBank}>CHANGE BANK</span>} />
        <InfoRow label="ACCOUNT NUMBER" value={va?.accountNumber || '—'}
          extra={<CopyBtn text={va?.accountNumber} id="acc" copied={copied} onCopy={copy} />} />
        <InfoRow label="AMOUNT" value={`${currency} ${amount}`}
          extra={<CopyBtn text={String(amount)} id="amt" copied={copied} onCopy={copy} />} />
      </div>
      <p style={s.hint}>
        Search for <strong>Payaza-Titan</strong> in your bank app. This account expires in{' '}
        <span style={{ color: '#0a7c5c', fontWeight: 500 }}>{timer}</span>
      </p>
      <button style={{ ...s.btnPrimary, opacity: checking ? 0.7 : 1 }} onClick={handleConfirm} disabled={checking}>
        {checking ? 'Checking…' : "I've sent the money"}
      </button>
    </div>
  );
}

// Card Panel
function CardPanel({ amount, currency, customer, onSuccess, onError }) {
  const [card, setCard] = useState({ number: '', expiry: '', cvv: '', name: '' });
  const [loading, setLoading] = useState(false);

  const formatCardNum = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();

  const handleSubmit = async () => {
    const [expiryMonth, expiryYear] = card.expiry.split('/');
    setLoading(true);
    try {
      const result = await apiFetch('/payment/payaza/card-charge', {
        method: 'POST',
        body: JSON.stringify({
          reference: `CARD-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          amount, 
          email: customer?.email,
          card: { 
            cardNumber: card.number, 
            cvv: card.cvv, 
            expiryMonth: expiryMonth?.trim(), 
            expiryYear: expiryYear?.trim(),
            cardHolderName: customer?.name,
            phoneNumber: customer?.phone
          },
          bookingData: customer?.bookingData
        }),
      });
      onSuccess(result);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={s.panelTitle}>Pay with card</p>
      <Field label="Card number">
        <input style={s.input} placeholder="0000 0000 0000 0000" value={card.number}
          onChange={e => setCard({ ...card, number: formatCardNum(e.target.value) })} />
      </Field>
      <Field label="Cardholder name">
        <input style={s.input} placeholder="John Doe" value={card.name}
          onChange={e => setCard({ ...card, name: e.target.value })} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        <Field label="Expiry (MM/YY)">
          <input style={s.input} placeholder="MM/YY" maxLength={5} value={card.expiry}
            onChange={e => setCard({ ...card, expiry: e.target.value })} />
        </Field>
        <Field label="CVV">
          <input style={s.input} type="password" placeholder="•••" maxLength={4} value={card.cvv}
            onChange={e => setCard({ ...card, cvv: e.target.value })} />
        </Field>
      </div>
      <button style={{ ...s.btnPrimary, marginTop: 12, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Processing…' : `Pay ${currency} ${amount}`}
      </button>
    </div>
  );
}

// USSD Panel
function USSDPanel({ amount, currency, onSuccess }) {
  const [bank, setBank] = useState(null);
  const BANKS = [
    { name: 'GTBank', code: '*737#' }, { name: 'Access', code: '*901#' },
    { name: 'First Bank', code: '*894#' }, { name: 'UBA', code: '*919#' },
    { name: 'Zenith', code: '*966#' }, { name: 'Sterling', code: '*822#' },
  ];
  const ussdCode = bank ? `${bank.code.replace('#', '')}*000*${amount}*5678#` : null;

  return (
    <div>
      <p style={s.panelTitle}>Pay via USSD</p>
      <p style={s.hint}>Select your bank to get a USSD code</p>
      <div style={s.grid2}>
        {BANKS.map(b => (
          <div key={b.code} style={{ ...s.bankItem, ...(bank?.code === b.code ? s.bankItemSel : {}) }}
            onClick={() => setBank(b)}>
            {b.name} {b.code}
          </div>
        ))}
      </div>
      {ussdCode && (
        <div style={s.ussdCode}>{ussdCode}</div>
      )}
      <button style={s.btnPrimary} onClick={() => onSuccess({ method: 'ussd', reference: 'pending' })}>
        I've completed payment
      </button>
    </div>
  );
}

// Mobile Money Panel
function MomoPanel({ amount, currency, customer, onSuccess, onError }) {
  const [network, setNetwork] = useState('');
  const [phone, setPhone] = useState('');
  const [country, setCountry] = useState('GH');
  const [loading, setLoading] = useState(false);
  const NETWORKS = ['MTN', 'Airtel', 'Vodafone', 'Tigo'];
  const COUNTRIES = [{ code: 'GH', label: 'Ghana (GHS)' }, { code: 'KE', label: 'Kenya (KES)' },
    { code: 'TZ', label: 'Tanzania (TZS)' }, { code: 'UG', label: 'Uganda (UGX)' }];
  const currencyMap = { GH: 'GHS', KE: 'KES', TZ: 'TZS', UG: 'UGX' };

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const result = await apiFetch('/payment/payaza/mobile-money-collection', {
        method: 'POST',
        body: JSON.stringify({ 
          amount, 
          currency: currencyMap[country] || 'GHS', 
          transaction_reference: `MOMO-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          customer_email: customer?.email,
          customer_first_name: customer?.name?.split(' ')[0],
          customer_last_name: customer?.name?.split(' ')[1],
          customer_phone_number: phone,
          country_code: country,
          customer_bank_code: network,
          transaction_description: 'Vaamoose Booking Payment'
        }),
      });
      onSuccess(result);
    } catch (err) {
      onError(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={s.panelTitle}>Mobile Money</p>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        {NETWORKS.map(n => (
          <button key={n} style={{ ...s.netBtn, ...(network === n ? s.netBtnSel : {}) }} onClick={() => setNetwork(n)}>{n}</button>
        ))}
      </div>
      <Field label="Mobile number">
        <input style={s.input} placeholder="e.g. 0551234567" value={phone} onChange={e => setPhone(e.target.value)} />
      </Field>
      <Field label="Country">
        <select style={s.input} value={country} onChange={e => setCountry(e.target.value)}>
          {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.label}</option>)}
        </select>
      </Field>
      <button style={{ ...s.btnPrimary, opacity: loading ? 0.7 : 1 }} onClick={handleSubmit} disabled={loading}>
        {loading ? 'Processing…' : `Pay ${currency} ${amount}`}
      </button>
    </div>
  );
}

// OPay Panel
function OPayPanel({ onSuccess, onError }) {
  const [phone, setPhone] = useState('');
  return (
    <div>
      <p style={s.panelTitle}>Pay with OPay</p>
      <div style={s.opayNote}>You will be redirected to OPay to complete payment securely.</div>
      <Field label="OPay phone number">
        <input style={s.input} placeholder="e.g. 08012345678" value={phone} onChange={e => setPhone(e.target.value)} />
      </Field>
      <button style={s.btnPrimary} onClick={() => onSuccess({ method: 'opay', phone })}>
        Continue to OPay
      </button>
    </div>
  );
}

// Zap Panel
function ZapPanel({ amount, onSuccess }) {
  return (
    <div>
      <p style={s.panelTitle}>Pay with Zap</p>
      {[
        'Open your Zap-enabled banking app',
        'Scan or enter the Zap code below',
        `Confirm the NGN ${amount} payment`,
      ].map((step, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 10 }}>
          <div style={s.stepNum}>{i + 1}</div>
          <span style={{ fontSize: 13, color: '#666', lineHeight: '1.5', paddingTop: 1 }}>{step}</span>
        </div>
      ))}
      <div style={s.ussdCode}>ZAP-VMSE-{amount}-8F4A</div>
      <button style={{ ...s.btnPrimary, marginTop: 10 }} onClick={() => onSuccess({ method: 'zap' })}>
        I've completed payment
      </button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  SHARED SUBCOMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════
function InfoRow({ label, value, extra }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: '#888' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}>
        {value}{extra}
      </span>
    </div>
  );
}

function CopyBtn({ text, id, copied, onCopy }) {
  return (
    <button onClick={() => onCopy(text, id)} style={s.copyBtn} aria-label="Copy">
      {copied === id ? '✓' : '⧉'}
    </button>
  );
}

function Field({ label, children }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <label style={{ fontSize: 11, color: '#888', display: 'block', marginBottom: 4 }}>{label}</label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
//  MAIN CHECKOUT MODAL
// ═══════════════════════════════════════════════════════════════════════════════
const METHODS = [
  { id: 'transfer', label: 'Transfer', icon: '🏦' },
  { id: 'card', label: 'Card', icon: '💳' },
  { id: 'ussd', label: 'USSD', icon: '#' },
  { id: 'momo', label: 'Mobile Money', icon: '📱' },
  { id: 'opay', label: 'OPay', icon: '○' },
  { id: 'zap', label: 'Zap', icon: '⚡', badge: 'NEW' },
];

export default function PayazaCheckout({ amount, currency = 'NGN', customer, onSuccess, onClose, onError }) {
  const [method, setMethod] = useState('transfer');
  const [error, setError] = useState(null);

  const handleSuccess = (result) => {
    setError(null);
    onSuccess?.(result);
  };

  const handleError = (err) => {
    setError(err.message);
    onError?.(err);
  };

  const panelProps = { amount, currency, customer, onSuccess: handleSuccess, onError: handleError };

  return (
    <div style={s.overlay}>
      <div style={s.modal}>
        {/* Sidebar */}
        <div style={s.sidebar}>
          <div style={s.sidebarHead}>
            <div style={{ fontSize: 11, color: '#888' }}>Paying to</div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#111', marginBottom: 4 }}>Vaamoose</div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#0a7c5c' }}>{currency} {amount.toLocaleString()}</div>
            <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{customer?.email}</div>
          </div>
          <div style={{ fontSize: 10, fontWeight: 600, color: '#aaa', letterSpacing: '0.06em', padding: '0 14px', marginBottom: 6, textTransform: 'uppercase' }}>
            Pay with
          </div>
          {METHODS.map(m => (
            <button key={m.id} style={{ ...s.methodBtn, ...(method === m.id ? s.methodBtnActive : {}) }}
              onClick={() => { setMethod(m.id); setError(null); }}>
              <span style={{ width: 18, textAlign: 'center', fontSize: 14 }}>{m.icon}</span>
              <span>{m.label}</span>
              {m.badge && <span style={s.badge}>{m.badge}</span>}
              {method === m.id && <span style={s.activeDot} />}
            </button>
          ))}
        </div>

        {/* Content */}
        <div style={s.content}>
          {/* Header */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
            <span style={{ fontSize: 11, color: '#aaa' }}>Secure checkout · Payaza</span>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 11, color: '#888' }}>{customer?.email}</div>
              <div style={{ fontSize: 12, color: '#888' }}>Pay <span style={{ color: '#0a7c5c', fontWeight: 600 }}>{currency} {amount}</span></div>
            </div>
          </div>

          {error && (
            <div style={s.errorBox}>{error}</div>
          )}

          {method === 'transfer' && <TransferPanel {...panelProps} />}
          {method === 'card' && <CardPanel {...panelProps} />}
          {method === 'ussd' && <USSDPanel {...panelProps} />}
          {method === 'momo' && <MomoPanel {...panelProps} />}
          {method === 'opay' && <OPayPanel {...panelProps} />}
          {method === 'zap' && <ZapPanel {...panelProps} />}

          <div style={s.powered}>Secured by Payaza · <span style={{ color: '#0a7c5c' }}>payaza.africa</span></div>
        </div>

        {/* Close */}
        <button style={s.closeBtn} onClick={onClose} aria-label="Close">✕</button>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 16 },
  modal: { background: '#fff', borderRadius: 12, width: '100%', maxWidth: 640, display: 'flex', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', minHeight: 480, position: 'relative' },
  sidebar: { width: 180, minWidth: 180, background: '#f8f7f4', borderRight: '1px solid #eee', padding: '20px 0', display: 'flex', flexDirection: 'column' },
  sidebarHead: { padding: '0 14px 14px', borderBottom: '1px solid #eee', marginBottom: 10 },
  methodBtn: { display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', cursor: 'pointer', fontSize: 13, color: '#666', border: 'none', background: 'none', width: '100%', textAlign: 'left', position: 'relative', transition: 'background 0.1s' },
  methodBtnActive: { background: '#fff', color: '#0a7c5c', fontWeight: 600, borderRight: '2px solid #0a7c5c' },
  badge: { fontSize: 9, background: '#0a7c5c', color: '#fff', borderRadius: 3, padding: '1px 5px', fontWeight: 600, textTransform: 'uppercase', marginLeft: 2 },
  activeDot: { width: 6, height: 6, borderRadius: '50%', background: '#0a7c5c', position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)' },
  content: { flex: 1, padding: 24, display: 'flex', flexDirection: 'column', overflow: 'auto' },
  panelTitle: { fontSize: 15, fontWeight: 600, color: '#111', marginBottom: 16 },
  infoBox: { background: '#f7f7f7', borderRadius: 8, padding: '12px 14px', marginBottom: 14 },
  hint: { fontSize: 12, color: '#777', lineHeight: 1.5, marginBottom: 16 },
  changeBank: { fontSize: 11, color: '#0a7c5c', cursor: 'pointer', fontWeight: 600 },
  copyBtn: { background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 0 },
  btnPrimary: { width: '100%', padding: 11, background: '#0a7c5c', color: '#fff', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 'auto' },
  input: { width: '100%', padding: '8px 10px', fontSize: 13, border: '1px solid #ddd', borderRadius: 6, boxSizing: 'border-box' },
  grid2: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 14 },
  bankItem: { padding: '8px 10px', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#666', textAlign: 'center', transition: 'all 0.1s' },
  bankItemSel: { borderColor: '#0a7c5c', color: '#0a7c5c', background: '#f0faf7' },
  ussdCode: { fontSize: 18, fontWeight: 700, textAlign: 'center', padding: 14, background: '#f7f7f7', borderRadius: 8, letterSpacing: 2, marginBottom: 14, color: '#111' },
  netBtn: { flex: 1, padding: '7px 4px', border: '1px solid #e5e5e5', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: '#666', background: 'none', transition: 'all 0.1s' },
  netBtnSel: { borderColor: '#0a7c5c', color: '#0a7c5c', background: '#f0faf7', fontWeight: 600 },
  opayNote: { fontSize: 12, color: '#666', background: '#f7f7f7', padding: '10px 12px', borderRadius: 6, marginBottom: 14, lineHeight: 1.5 },
  stepNum: { width: 20, height: 20, borderRadius: '50%', background: '#0a7c5c', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  loading: { textAlign: 'center', color: '#888', padding: '40px 0', fontSize: 13 },
  errorBox: { background: '#fff0f0', border: '1px solid #fcc', borderRadius: 6, padding: '10px 12px', fontSize: 13, color: '#c00', marginBottom: 14 },
  powered: { fontSize: 10, color: '#bbb', textAlign: 'center', marginTop: 20 },
  closeBtn: { position: 'absolute', top: 12, right: 14, background: 'none', border: 'none', fontSize: 16, color: '#aaa', cursor: 'pointer', padding: 4 },
};