const axios = require('axios');

class PaymentService {
// NOTE: Paystack is intentionally disabled.
// Vaamoose payments must use Payaza only.
constructor() {
    this.provider = 'payaza';
// NOTE: Your .env currently defines PAYAZA_API_SECRET_KEY (not PAYAZA_API_KEY)
this.payaza = {
      apiKey: process.env.PAYAZA_API_SECRET_KEY || process.env.PAYAZA_API_SECRET_KEY,
      baseUrl: process.env.PAYAZA_BASE_URL || 'https://api.payaza.africa/live',
      tenantId: process.env.PAYAZA_TENANT_ID,
      productId: process.env.PAYAZA_PRODUCT_ID || 'app'
    };
    this.paystack = {
      secretKey: process.env.PAYSTACK_SECRET_KEY,
      baseUrl: 'https://api.paystack.co'
    };
  }

// Card Charge (Payaza only)
async chargeCard(cardData) {
    return this.payazaChargeCard(cardData);
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

      console.log(`[Payaza] Charging card for reference: ${cardData.reference}, amount: ${cardData.amount}`);

      const response = await axios.post(
        `${this.payaza.baseUrl}/card/card_charge/`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout for card charge
        }
      );

      console.log(`[Payaza] Card charge response for ${cardData.reference}:`, {
        status: response.status,
        dataKeys: Object.keys(response.data || {}),
        success: response.data?.success || response.data?.status === 'success'
      });

      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message;
      const errorStatus = error.response?.status;
      
      console.error('[Payaza] Card charge error:', {
        message: errorMessage,
        status: errorStatus,
        reference: cardData.reference,
        data: error.response?.data
      });
      throw error;
    }
  }

// Disabled: Paystack card charging
async paystackChargeCard() {
    throw new Error('Paystack is disabled. Use Payaza only.');
  }

// Transaction Status (Payaza only)
async getTransactionStatus(reference) {
    return this.payazaTransactionStatus(reference);
  }

  async payazaTransactionStatus(reference) {
    try {
      if (!this.payaza.apiKey) {
        throw new Error('Payaza API key not configured');
      }

      const payload = {
        service_payload: {
          transaction_reference: reference
        }
      };

      console.log(`[Payaza] Checking transaction status for: ${reference}`);

      const response = await axios.post(
        `${this.payaza.baseUrl}/card/card_charge/transaction_status`,
        payload,
        {
          headers: {
            'Authorization': `Payaza ${this.payaza.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 10000 // 10 second timeout
        }
      );

      console.log(`[Payaza] Transaction status response:`, {
        status: response.status,
        statusCode: response.status,
        dataKeys: Object.keys(response.data || {})
      });

      return response.data;
    } catch (error) {
      const errorData = error.response?.data || {};
      const errorStatus = error.response?.status;
      const errorMessage = error.response?.data?.message || error.message || 'Unknown error';
      
      const errorDetails = {
        message: errorMessage,
        status: errorStatus,
        statusText: error.response?.statusText,
        data: errorData,
        reference,
        isNotFound: errorMessage.includes('not found') || errorMessage.includes('Transaction not found') || errorStatus === 404
      };
      
      console.error('[Payaza] Transaction status error:', errorDetails);
      
      // Create error with preserved details for caller
      const err = new Error(errorMessage);
      err.response = {
        status: errorStatus,
        statusText: error.response?.statusText,
        data: errorData
      };
      throw err;
    }
  }

// Disabled: Paystack transaction status
async paystackTransactionStatus() {
    throw new Error('Paystack is disabled. Use Payaza only.');
  }

// Mobile Money Collection (Payaza only)
async processMobileMoneyCollection(collectionData) {
    return this.payazaMobileMoneyCollection(collectionData);
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
// Transfers/Payout (Payaza only)
async initiateTransfer(transferData) {
    return this.payazaTransfer(transferData);
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

// Disabled: Paystack transfers
async paystackTransfer() {
    throw new Error('Paystack is disabled. Use Payaza only.');
  }

// Account Enquiry (Payaza only)
async accountEnquiry(enquiryData) {
    return this.payazaAccountEnquiry(enquiryData);
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

// Disabled: Paystack account enquiry
async paystackAccountEnquiry() {
    throw new Error('Paystack is disabled. Use Payaza only.');
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

// Transfer Notification Query (Payaza only)
async queryTransferNotification(transactionReference) {
    return this.payazaQueryTransferNotification(transactionReference);
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

// Switch provider (Paystack disabled)
switchProvider(provider) {
    if (provider !== 'payaza') {
      throw new Error('Invalid provider. Only "payaza" is allowed.');
    }
    this.provider = 'payaza';
  }

  // Get current provider
  getCurrentProvider() {
    return this.provider;
  }
}

module.exports = new PaymentService();
