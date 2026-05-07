const axios = require('axios');

class PaymentService {
  constructor() {
    this.provider = process.env.PAYMENT_PROVIDER || 'payaza';
    this.payaza = {
      apiKey: process.env.PAYAZA_API_KEY,
      baseUrl: process.env.PAYAZA_BASE_URL || 'https://api.payaza.africa/live',
      tenantId: process.env.PAYAZA_TENANT_ID,
      productId: process.env.PAYAZA_PRODUCT_ID || 'app'
    };
    this.paystack = {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      baseUrl: 'https://api.paystack.co'
    };
  }

  // Card Charge
  async chargeCard(cardData) {
    if (this.provider === 'payaza') {
      return this.payazaChargeCard(cardData);
    } else {
      return this.paystackChargeCard(cardData);
    }
  }

  async payazaChargeCard(cardData) {
    try {
      const payload = {
        service_payload: {
          first_name: cardData.first_name,
          last_name: cardData.last_name,
          email_address: cardData.email,
          phone_number: cardData.phone_number,
          amount: cardData.amount,
          transaction_reference: cardData.reference,
          currency: cardData.currency || 'USD',
          description: cardData.description || 'Payment',
          card: {
            expiryMonth: cardData.card.expiryMonth,
            expiryYear: cardData.card.expiryYear,
            securityCode: cardData.card.securityCode,
            cardNumber: cardData.card.cardNumber
          },
          callback_url: cardData.callback_url
        }
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/card/card_charge/`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza card charge error:', error.response?.data || error.message);
      throw error;
    }
  }

  async paystackChargeCard(cardData) {
    // Fallback to Paystack implementation
    const amountInKobo = Math.round(cardData.amount * 100);
    const payload = {
      email: cardData.email,
      amount: amountInKobo,
      card: {
        number: cardData.card.cardNumber,
        cvv: cardData.card.securityCode,
        expiry_month: cardData.card.expiryMonth,
        expiry_year: cardData.card.expiryYear
      },
      pin: cardData.pin // If required
    };

    const response = await axios.post(
      `${this.paystack.baseUrl}/charge`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.paystack.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Transaction Status
  async getTransactionStatus(reference) {
    if (this.provider === 'payaza') {
      return this.payazaTransactionStatus(reference);
    } else {
      return this.paystackTransactionStatus(reference);
    }
  }

  async payazaTransactionStatus(reference) {
    try {
      const payload = {
        service_payload: {
          transaction_reference: reference
        }
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/card/card_charge/transaction_status`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const status = response.data?.data?.status || response.data?.status;
      return {
        status: typeof status === 'string' ? status.toLowerCase() : status,
        reference,
        amount: response.data?.data?.amount || null,
        email: response.data?.data?.email_address || response.data?.data?.customer?.email || null,
        metadata: response.data?.data?.metadata || response.data?.data?.service_payload || null,
        provider: 'payaza',
        raw: response.data
      };
    } catch (firstError) {
      console.warn('Payaza card status lookup failed, trying transfer notification query:', firstError.response?.data || firstError.message);
      try {
        const response = await axios.get(
          `${this.payaza.baseUrl}/merchant-collection/transfer_notification_controller/transaction-query`,
          {
            params: {
              transaction_reference: reference
            },
            headers: {
              'Authorization': `Payaza ${this.payaza.apiKey}`
            }
          }
        );

        const status = response.data?.data?.status || response.data?.status;
        return {
          status: typeof status === 'string' ? status.toLowerCase() : status,
          reference,
          amount: response.data?.data?.amount || null,
          email: response.data?.data?.email_address || response.data?.data?.customer?.email || null,
          metadata: response.data?.data?.metadata || response.data?.data || null,
          provider: 'payaza',
          raw: response.data
        };
      } catch (secondError) {
        console.error('Payaza transaction status error:', secondError.response?.data || secondError.message);
        throw secondError;
      }
    }
  }

  async paystackTransactionStatus(reference) {
    const response = await axios.get(
      `${this.paystack.baseUrl}/transaction/verify/${reference}`,
      {
        headers: {
          'Authorization': `Bearer ${this.paystack.secretKey}`
        }
      }
    );

    return response.data;
  }

  // Mobile Money Collection
  async processMobileMoneyCollection(collectionData) {
    if (this.provider === 'payaza') {
      return this.payazaMobileMoneyCollection(collectionData);
    } else {
      // Paystack doesn't have direct mobile money, use their bank transfer or fallback
      throw new Error('Mobile money collection not available with Paystack');
    }
  }

  async payazaMobileMoneyCollection(collectionData) {
    try {
      const payload = {
        amount: collectionData.amount,
        customer_number: collectionData.customer_number,
        transaction_reference: collectionData.transaction_reference,
        transaction_description: collectionData.transaction_description,
        customer_bank_code: collectionData.customer_bank_code,
        currency_code: collectionData.currency_code,
        customer_email: collectionData.customer_email,
        customer_first_name: collectionData.customer_first_name,
        customer_last_name: collectionData.customer_last_name,
        customer_phone_number: collectionData.customer_phone_number,
        country_code: collectionData.country_code
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/subsidiary/collections/v1/process-collection`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'X-TenantID': this.payaza.tenantId,
            'X-ProductID': this.payaza.productId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza mobile money collection error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Account Funding
  async processAccountFunding(fundingData) {
    if (this.provider === 'payaza') {
      return this.payazaAccountFunding(fundingData);
    } else {
      throw new Error('Account funding not available with Paystack');
    }
  }

  async payazaAccountFunding(fundingData) {
    try {
      const payload = {
        transaction_reference: fundingData.transaction_reference,
        country_code: fundingData.country_code
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/subsidiary/funding/v1/process-collection`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'X-TenantID': this.payaza.tenantId,
            'X-ProductID': this.payaza.productId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza account funding error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Check Collection Status
  async checkCollectionStatus(transactionReference, countryCode) {
    if (this.provider === 'payaza') {
      return this.payazaCheckCollectionStatus(transactionReference, countryCode);
    } else {
      throw new Error('Collection status check not available with Paystack');
    }
  }

  async payazaCheckCollectionStatus(transactionReference, countryCode) {
    try {
      const response = await axios.get(
        `${this.payaza.baseUrl}/subsidiary/collections/v1/check-status`,
        {
          params: {
            transaction_reference: transactionReference,
            country_code: countryCode
          },
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'X-TenantID': this.payaza.tenantId,
            'X-ProductID': this.payaza.productId
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza check collection status error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Transfers/Payouts
  async initiateTransfer(transferData) {
    if (this.provider === 'payaza') {
      return this.payazaTransfer(transferData);
    } else {
      return this.paystackTransfer(transferData);
    }
  }

  async payazaTransfer(transferData) {
    try {
      const payload = {
        transaction_type: transferData.transaction_type || 'mobile_money',
        service_payload: {
          payout_amount: transferData.payout_amount,
          transaction_pin: transferData.transaction_pin,
          account_reference: transferData.account_reference,
          country: transferData.country,
          currency: transferData.currency,
          payout_beneficiaries: transferData.payout_beneficiaries
        }
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/payout-receptor/payout`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'X-TenantID': this.payaza.tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza transfer error:', error.response?.data || error.message);
      throw error;
    }
  }

  async paystackTransfer(transferData) {
    // Paystack transfer implementation
    const payload = {
      source: 'balance',
      amount: Math.round(transferData.payout_amount * 100),
      recipient: transferData.recipient_code, // Assuming recipient code is provided
      reason: transferData.narration || 'Transfer'
    };

    const response = await axios.post(
      `${this.paystack.baseUrl}/transfer`,
      payload,
      {
        headers: {
          'Authorization': `Bearer ${this.paystack.secretKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return response.data;
  }

  // Account Enquiry
  async accountEnquiry(enquiryData) {
    if (this.provider === 'payaza') {
      return this.payazaAccountEnquiry(enquiryData);
    } else {
      return this.paystackAccountEnquiry(enquiryData);
    }
  }

  async payazaAccountEnquiry(enquiryData) {
    try {
      const payload = {
        service_payload: {
          currency: enquiryData.currency,
          bank_code: enquiryData.bank_code,
          account_number: enquiryData.account_number
        }
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/payaza-account/api/v1/mainaccounts/merchant/provider/enquiry`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'X-TenantID': this.payaza.tenantId,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza account enquiry error:', error.response?.data || error.message);
      throw error;
    }
  }

  async paystackAccountEnquiry(enquiryData) {
    const response = await axios.get(
      `${this.paystack.baseUrl}/bank/resolve`,
      {
        params: {
          account_number: enquiryData.account_number,
          bank_code: enquiryData.bank_code
        },
        headers: {
          'Authorization': `Bearer ${this.paystack.secretKey}`
        }
      }
    );

    return response.data;
  }

  // Virtual Accounts
  async createVirtualAccount(accountData) {
    if (this.provider === 'payaza') {
      return this.payazaCreateVirtualAccount(accountData);
    } else {
      throw new Error('Virtual accounts not available with Paystack');
    }
  }

  async payazaCreateVirtualAccount(accountData) {
    try {
      const payload = {
        account_name: accountData.account_name,
        account_type: accountData.account_type, // 'Dynamic' or 'Static'
        bank_code: accountData.bank_code,
        account_reference: accountData.account_reference,
        customer_first_name: accountData.customer_first_name,
        customer_last_name: accountData.customer_last_name,
        customer_email: accountData.customer_email,
        customer_phone_number: accountData.customer_phone_number,
        transaction_description: accountData.transaction_description,
        transaction_amount: accountData.transaction_amount,
        expires_in_minutes: accountData.expires_in_minutes,
        ...(accountData.account_type === 'Static' && {
          bvn: accountData.bvn,
          bvn_validated: accountData.bvn_validated
        })
      };

      const response = await axios.post(
        `${this.payaza.baseUrl}/merchant-collection/merchant/virtual_account/generate_virtual_account/`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza virtual account creation error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get Virtual Account Details
  async getVirtualAccountDetails(accountNumber) {
    if (this.provider === 'payaza') {
      return this.payazaGetVirtualAccountDetails(accountNumber);
    } else {
      throw new Error('Virtual account details not available with Paystack');
    }
  }

  async payazaGetVirtualAccountDetails(accountNumber) {
    try {
      const response = await axios.get(
        `${this.payaza.baseUrl}/merchant-collection/merchant/virtual_account/detail/virtual_account/${accountNumber}`,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza virtual account details error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Transfer Notification Query
  async queryTransferNotification(transactionReference) {
    if (this.provider === 'payaza') {
      return this.payazaQueryTransferNotification(transactionReference);
    } else {
      return this.paystackTransactionStatus(transactionReference);
    }
  }

  async payazaQueryTransferNotification(transactionReference) {
    try {
      const response = await axios.get(
        `${this.payaza.baseUrl}/merchant-collection/transfer_notification_controller/transaction-query`,
        {
          params: {
            transaction_reference: transactionReference
          },
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`
          }
        }
      );

      return response.data;
    } catch (error) {
      console.error('Payaza transfer notification query error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Switch provider
  switchProvider(provider) {
    if (provider === 'payaza' || provider === 'paystack') {
      this.provider = provider;
      console.log(`Switched payment provider to: ${provider}`);
    } else {
      throw new Error('Invalid provider. Use "payaza" or "paystack"');
    }
  }

  // Get current provider
  getCurrentProvider() {
    return this.provider;
  }
}

module.exports = new PaymentService();