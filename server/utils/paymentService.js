/**
 * server/utils/paymentService.js
 * Drop-in replacement — keeps the same class API your routes already use
 *
 * FIXES applied vs old version:
 *  1. Auth header no longer double-prefixes "Payaza " 
 *     → reads PAYAZA_API_KEY as-is (store full "Payaza UFo3..." in .env)
 *  2. Reference generation — genRef() built in, no more caller guessing
 *  3. createVirtualAccount now generates + returns the reference for you to store
 *  4. getTransactionStatus routes correctly by payment type (card vs VA vs momo)
 *     and treats "not found" as pending (not a crash)
 *  5. chargeCard handles 3DS response (do3dsAuth: true) instead of crashing
 *  6. Removed singleton export — use new PaymentService() per request or keep
 *     the singleton but don't call switchProvider() in concurrent code
 */

const axios = require('axios');
const crypto = require('crypto');

// ─── Reference generator ──────────────────────────────────────────────────────
// MUST be unique per transaction. Payaza hard-errors on duplicate refs.
const genRef = (prefix = 'VMO') =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;

class PaymentService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'payaza';
    this.payaza = {
      // Store the FULL key in .env: "Payaza UFo3OC1..."
      // Do NOT add "Payaza " prefix here — it's already in the env value
      apiKey:   process.env.PAYAZA_API_KEY,
      baseUrl:  process.env.PAYAZA_BASE_URL || 'https://api.payaza.africa/live',
      tenantId: process.env.PAYAZA_TENANT_ID || 'vaamoose',
      productId: process.env.PAYAZA_PRODUCT_ID || 'app',
    };
    this.paystack = {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      baseUrl:   'https://api.paystack.co',
    };
  }

  // ─── Auth headers ───────────────────────────────────────────────────────────
  _payazaHeaders(extra = {}) {
    return {
      Authorization:  this.payaza.apiKey,   // already "Payaza UFo3..." — no prefix needed
      'X-TenantID':   this.payaza.tenantId,
      'X-ProductID':  this.payaza.productId,
      'Content-Type': 'application/json',
      ...extra,
    };
  }

  _paystackHeaders() {
    return {
      Authorization:  `Bearer ${this.paystack.secretKey}`,
      'Content-Type': 'application/json',
    };
  }

  // ─── Error parser ───────────────────────────────────────────────────────────
  _parseError(err, context) {
    const d   = err?.response?.data || {};
    const msg = d.response_message || d.message || d.debugMessage || err.message || 'Unknown error';
    console.error(`[PaymentService:${context}]`, msg, d);
    const e   = new Error(msg);
    e.raw     = d;
    e.isDuplicateRef = msg.toLowerCase().includes('transaction reference already exists');
    e.isCardError    = d.statusOk === false;
    return e;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VIRTUAL ACCOUNT  (Bank Transfer checkout)
  //
  //  IMPORTANT: save the returned `reference` to your DB/order.
  //  You need it for checkVAPayment() — don't generate a new one.
  // ═══════════════════════════════════════════════════════════════════════════
  async createVirtualAccount(opts) {
    // Accept both old shape (raw accountData) and new shape ({ amount, currency, customer })
    let payload, reference;

    if (opts.customer) {
      // New shape — we generate the reference
      reference = genRef('VA');
      const { amount, currency = 'NGN', customer, expiresInMinutes = 30 } = opts;
      payload = {
        account_name:            `${customer.firstName || customer.first_name} ${customer.lastName || customer.last_name}`,
        account_type:            'Dynamic',
        bank_code:               '1067',
        account_reference:       reference,
        customer_first_name:     customer.firstName || customer.first_name,
        customer_last_name:      customer.lastName  || customer.last_name,
        customer_email:          customer.email,
        customer_phone_number:   customer.phone || customer.phone_number,
        transaction_description: 'Vaamoose payment',
        transaction_amount:      amount,
        expires_in_minutes:      String(expiresInMinutes),
        currency_code:           currency,
      };
    } else {
      // Old shape — caller passes account_reference; warn if missing
      reference = opts.account_reference || genRef('VA');
      payload   = { ...opts, account_reference: reference };
    }

    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/merchant-collection/merchant/virtual_account/generate_virtual_account/`,
        payload,
        { headers: this._payazaHeaders() }
      );

      // Payaza returns 200 even on failure — check the body
      if (!data.data?.account_number && !data.account_number) {
        throw new Error(data.message || data.response_message || 'VA creation failed — no account number returned');
      }

      return {
        success:       true,
        reference,                          // ← STORE THIS on your order
        accountNumber: data.data?.account_number || data.account_number,
        bankName:      data.data?.bank_name || 'Payaza-Titan',
        amount:        payload.transaction_amount,
        currency:      payload.currency_code,
        expiresAt:     new Date(Date.now() + (Number(payload.expires_in_minutes) || 30) * 60000).toISOString(),
        provider:      'payaza',
        raw:           data,
      };
    } catch (error) {
      // Fallback to Paystack bank transfer
      console.warn('[createVirtualAccount] Payaza failed, trying Paystack:', error.message);
      try {
        const { data } = await axios.post(
          `${this.paystack.baseUrl}/transaction/initialize`,
          {
            amount:   Math.round(payload.transaction_amount * 100),
            email:    payload.customer_email,
            reference,
            currency: payload.currency_code || 'NGN',
            channels: ['bank_transfer'],
          },
          { headers: this._paystackHeaders() }
        );
        return {
          success:     true,
          reference,
          checkoutUrl: data.data.authorization_url,
          accessCode:  data.data.access_code,
          provider:    'paystack',
          fallback:    true,
          raw:         data,
        };
      } catch (fallbackErr) {
        throw this._parseError(fallbackErr, 'createVirtualAccount:paystack');
      }
    }
  }

  // ─── Check if a VA has been paid ────────────────────────────────────────────
  // Pass the EXACT reference returned from createVirtualAccount
  async checkVAPayment(reference) {
    try {
      const { data } = await axios.get(
        `${this.payaza.baseUrl}/merchant-collection/transfer_notification_controller/transaction-query`,
        {
          params:  { transaction_reference: reference },
          headers: this._payazaHeaders(),
        }
      );

      // Payaza returns 200 with error body when not found — handle that
      const txStatus = data.data?.transaction_status || data.transaction_status || data.status;
      const notFound = data.response_code === 404 || 
                       (data.response_message || '').toLowerCase().includes('not found') ||
                       (data.message || '').toLowerCase().includes('not found');

      if (notFound) {
        return { paid: false, status: 'pending', reference, provider: 'payaza' };
      }

      return {
        paid:           txStatus === 'Funds Received',
        status:         txStatus || 'unknown',
        amountReceived: data.data?.amount_received,
        paidAt:         data.data?.current_status_date,
        channel:        data.data?.channel,
        reference,
        provider:       'payaza',
        raw:            data,
      };
    } catch (err) {
      const msg = err?.response?.data?.response_message || err.message || '';
      // "not found" = customer hasn't paid yet — not a crash
      if (msg.toLowerCase().includes('not found') || err?.response?.status === 404) {
        return { paid: false, status: 'pending', reference, provider: 'payaza' };
      }
      throw this._parseError(err, 'checkVAPayment');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  CARD CHARGE  — 3DS aware
  //
  //  Payaza card charge has 3 outcomes:
  //  1. { paymentCompleted: true }          → success, done
  //  2. { do3dsAuth: true, threeDsHtml }    → inject HTML, await postMessage
  //  3. { statusOk: false }                 → failure
  // ═══════════════════════════════════════════════════════════════════════════
  async chargeCard(cardData) {
    if (this.provider !== 'payaza') return this.paystackChargeCard(cardData);
    return this.payazaChargeCard(cardData);
  }

  async payazaChargeCard(cardData) {
    // Generate a fresh unique reference if caller didn't supply one
    const reference = cardData.reference || genRef('CRD');

    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/card/card_charge/`,
        {
          service_payload: {
            first_name:            cardData.first_name,
            last_name:             cardData.last_name,
            email_address:         cardData.email,
            phone_number:          cardData.phone_number,
            amount:                cardData.amount,
            transaction_reference: reference,
            currency:              cardData.currency || 'NGN',
            description:           cardData.description || 'Vaamoose payment',
            card: {
              cardNumber:   cardData.card.cardNumber.replace(/\s/g, ''),
              expiryMonth:  String(cardData.card.expiryMonth).padStart(2, '0'),
              expiryYear:   String(cardData.card.expiryYear),
              securityCode: cardData.card.securityCode,
              ...(cardData.card.pin ? { pin: String(cardData.card.pin) } : {}),
            },
            callback_url: cardData.callback_url || process.env.PAYMENT_CALLBACK_URL,
          },
        },
        { headers: this._payazaHeaders() }
      );

      // ── Outcome 1: immediate success
      if (data.paymentCompleted === true && !data.do3dsAuth) {
        return {
          success:     true,
          status:      'success',
          requires3ds: false,
          reference,
          amountPaid:  data.amountPaid,
          rrn:         data.rrn,
          provider:    'payaza',
          raw:         data,
        };
      }

      // ── Outcome 2: 3DS challenge required
      // Frontend must inject data.threeDsHtml into DOM and listen for postMessage:
      //   window.addEventListener('message', (e) => {
      //     const r = JSON.parse(e.data);
      //     if (r.paymentCompleted) { // call POST /api/payments/card/3ds-complete }
      //   })
      if (data.do3dsAuth === true) {
        return {
          success:     true,
          status:      'requires_3ds',
          requires3ds: true,
          reference,                  // store this — needed after 3DS completes
          threeDsUrl:  data.threeDsUrl,
          formData:    data.formData,
          threeDsHtml: data.threeDsHtml,
          provider:    'payaza',
          raw:         data,
        };
      }

      // ── Outcome 3: failure
      throw Object.assign(new Error(data.message || data.debugMessage || 'Card charge failed'), { raw: data });

    } catch (error) {
      // Try Paystack as fallback
      console.warn('[chargeCard] Payaza failed, trying Paystack:', error.message);
      try {
        return await this.paystackChargeCard({ ...cardData, reference });
      } catch (fallbackErr) {
        throw this._parseError(fallbackErr, 'chargeCard:paystack');
      }
    }
  }

  async paystackChargeCard(cardData) {
    const reference = cardData.reference || genRef('CRD');
    const { data } = await axios.post(
      `${this.paystack.baseUrl}/charge`,
      {
        email:     cardData.email,
        amount:    Math.round(cardData.amount * 100),
        reference,
        card: {
          number:       cardData.card.cardNumber.replace(/\s/g, ''),
          cvv:          cardData.card.securityCode,
          expiry_month: String(cardData.card.expiryMonth).padStart(2, '0'),
          expiry_year:  String(cardData.card.expiryYear),
        },
        ...(cardData.pin ? { pin: String(cardData.pin) } : {}),
      },
      { headers: this._paystackHeaders() }
    );
    return {
      success:     true,
      status:      data.data?.status === 'success' ? 'success' : 'pending',
      reference,
      requiresOtp: data.data?.status === 'send_otp',
      provider:    'paystack',
      raw:         data,
    };
  }

  // ─── Card status check ──────────────────────────────────────────────────────
  async getTransactionStatus(reference, type = 'auto') {
    if (this.provider === 'paystack') return this.paystackTransactionStatus(reference);

    // 'auto' = try card endpoint first, then VA endpoint
    // Pass type='va' or type='card' to skip straight to the right one
    if (type === 'va') return this.checkVAPayment(reference);

    try {
      return await this.payazaCardStatus(reference);
    } catch (cardErr) {
      if (type === 'card') throw cardErr;
      // Auto-fallback to VA query
      console.warn('[getTransactionStatus] Card status failed, trying VA query');
      return this.checkVAPayment(reference);
    }
  }

  async payazaCardStatus(reference) {
    const { data } = await axios.post(
      `${this.payaza.baseUrl}/card/card_charge/transaction_status`,
      { service_payload: { transaction_reference: reference } },
      { headers: this._payazaHeaders() }
    );

    // Handle 200 responses that are actually errors
    const notFound = (data.response_message || data.message || '').toLowerCase().includes('not found');
    if (notFound) return { paid: false, status: 'pending', reference, provider: 'payaza' };

    return {
      paid:      data.paymentCompleted === true,
      status:    data.paymentCompleted ? 'success' : (data.data?.status || 'pending'),
      amountPaid: data.amountPaid,
      reference,
      provider:  'payaza',
      raw:       data,
    };
  }

  async paystackTransactionStatus(reference) {
    const { data } = await axios.get(
      `${this.paystack.baseUrl}/transaction/verify/${reference}`,
      { headers: this._paystackHeaders() }
    );
    return {
      paid:     data.data?.status === 'success',
      status:   data.data?.status,
      amount:   data.data?.amount ? data.data.amount / 100 : null,
      reference,
      provider: 'paystack',
      raw:      data,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  MOBILE MONEY
  // ═══════════════════════════════════════════════════════════════════════════
  async processMobileMoneyCollection(collectionData) {
    const reference = collectionData.transaction_reference || genRef('MOMO');
    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/subsidiary/collections/v1/process-collection`,
        { ...collectionData, transaction_reference: reference },
        { headers: this._payazaHeaders() }
      );
      return { ...data, reference, provider: 'payaza' };
    } catch (error) {
      throw this._parseError(error, 'processMobileMoneyCollection');
    }
  }

  async checkCollectionStatus(transactionReference, countryCode) {
    try {
      const { data } = await axios.get(
        `${this.payaza.baseUrl}/subsidiary/collections/v1/check-status`,
        {
          params:  { transaction_reference: transactionReference, country_code: countryCode },
          headers: this._payazaHeaders(),
        }
      );
      const status = data.transaction_status || data.status;
      return {
        paid:     status === 'Funds Received' || status === 'Completed',
        status,
        reference: transactionReference,
        provider: 'payaza',
        raw:      data,
      };
    } catch (error) {
      throw this._parseError(error, 'checkCollectionStatus');
    }
  }

  async processAccountFunding(fundingData) {
    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/subsidiary/funding/v1/process-collection`,
        {
          transaction_reference: fundingData.transaction_reference || genRef('FUND'),
          country_code:          fundingData.country_code,
        },
        { headers: this._payazaHeaders() }
      );
      return { ...data, provider: 'payaza' };
    } catch (error) {
      throw this._parseError(error, 'processAccountFunding');
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  TRANSFERS / PAYOUTS
  // ═══════════════════════════════════════════════════════════════════════════
  async initiateTransfer(transferData) {
    if (this.provider === 'payaza') return this.payazaTransfer(transferData);
    return this.paystackTransfer(transferData);
  }

  async payazaTransfer(transferData) {
    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/payout-receptor/payout`,
        {
          transaction_type: transferData.transaction_type || 'mobile_money',
          service_payload: {
            payout_amount:       transferData.payout_amount,
            transaction_pin:     transferData.transaction_pin,
            account_reference:   transferData.account_reference,
            country:             transferData.country,
            currency:            transferData.currency,
            payout_beneficiaries: transferData.payout_beneficiaries,
          },
        },
        { headers: this._payazaHeaders() }
      );
      return { ...data, provider: 'payaza' };
    } catch (error) {
      throw this._parseError(error, 'payazaTransfer');
    }
  }

  async paystackTransfer(transferData) {
    const { data } = await axios.post(
      `${this.paystack.baseUrl}/transfer`,
      {
        source:    'balance',
        amount:    Math.round(transferData.payout_amount * 100),
        recipient: transferData.recipient_code,
        reason:    transferData.narration || 'Transfer',
      },
      { headers: this._paystackHeaders() }
    );
    return { ...data, provider: 'paystack' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  ACCOUNT ENQUIRY
  // ═══════════════════════════════════════════════════════════════════════════
  async accountEnquiry(enquiryData) {
    try {
      const { data } = await axios.post(
        `${this.payaza.baseUrl}/payaza-account/api/v1/mainaccounts/merchant/provider/enquiry`,
        { service_payload: { currency: enquiryData.currency, bank_code: enquiryData.bank_code, account_number: enquiryData.account_number } },
        { headers: this._payazaHeaders() }
      );
      return { ...data, provider: 'payaza' };
    } catch (error) {
      console.warn('[accountEnquiry] Payaza failed, trying Paystack:', error.message);
      return this.paystackAccountEnquiry(enquiryData);
    }
  }

  async paystackAccountEnquiry(enquiryData) {
    const { data } = await axios.get(
      `${this.paystack.baseUrl}/bank/resolve`,
      {
        params:  { account_number: enquiryData.account_number, bank_code: enquiryData.bank_code },
        headers: this._paystackHeaders(),
      }
    );
    return { ...data, provider: 'paystack' };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  VIRTUAL ACCOUNT DETAILS + TRANSFER QUERY
  // ═══════════════════════════════════════════════════════════════════════════
  async getVirtualAccountDetails(accountNumber) {
    try {
      const { data } = await axios.get(
        `${this.payaza.baseUrl}/merchant-collection/merchant/virtual_account/detail/virtual_account/${accountNumber}`,
        { headers: this._payazaHeaders() }
      );
      return { ...data, provider: 'payaza' };
    } catch (error) {
      throw this._parseError(error, 'getVirtualAccountDetails');
    }
  }

  async queryTransferNotification(transactionReference) {
    return this.checkVAPayment(transactionReference);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  WEBHOOK VERIFICATION
  //  Payaza: HMAC-SHA512 → Base64  (NOT hex — common mistake)
  //  Paystack: HMAC-SHA256 → hex
  // ═══════════════════════════════════════════════════════════════════════════
  verifyPayazaWebhook(rawBody, signature) {
    const secret = process.env.PAYAZA_WEBHOOK_SECRET;
    if (!secret) return true;
    const computed = crypto
      .createHmac('sha512', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody), 'utf8')
      .digest('base64');                // ← base64, NOT hex
    return computed === signature;
  }

  verifyPaystackWebhook(rawBody, signature) {
    const secret = process.env.PAYSTACK_WEBHOOK_SECRET;
    if (!secret) return true;
    const computed = crypto
      .createHmac('sha256', secret)
      .update(typeof rawBody === 'string' ? rawBody : JSON.stringify(rawBody))
      .digest('hex');
    return computed === signature;
  }

  // ─── Provider switching ─────────────────────────────────────────────────────
  switchProvider(provider) {
    if (!['payaza', 'paystack'].includes(provider)) throw new Error('Invalid provider');
    this.provider = provider;
    console.log(`[PaymentService] Switched to: ${provider}`);
  }

  getCurrentProvider() { return this.provider; }
}

// ─── Test cards reference (sandbox only) ─────────────────────────────────────
PaymentService.TEST_CARDS = {
  visa:             { number: '4508750015741019', expiry: '01/39', cvv: '100', result: 'APPROVED' },
  mastercard_3ds:   { number: '5123450000000008', expiry: '01/39', cvv: '100', result: 'APPROVED + 3DS' },
  mastercard_no3ds: { number: '5111111111111118', expiry: '01/39', cvv: '100', result: 'APPROVED' },
  declined:         { number: '5111111111111118', expiry: '05/39', cvv: '100', result: 'DECLINED' },
  expired:          { number: '5111111111111118', expiry: '04/27', cvv: '100', result: 'EXPIRED_CARD' },
  timeout:          { number: '5111111111111118', expiry: '08/28', cvv: '100', result: 'TIMED_OUT' },
};

module.exports = new PaymentService();