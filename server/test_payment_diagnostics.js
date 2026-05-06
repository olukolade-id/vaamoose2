/**
 * Payment Provider Diagnostics
 * Run with: node test_payment_diagnostics.js
 * Tests Payaza and Paystack connectivity and API key validity
 */

require('dotenv').config();
const axios = require('axios');

const log = {
  info: (msg, data) => console.log(`ℹ️  ${msg}`, data || ''),
  success: (msg, data) => console.log(`✓ ${msg}`, data || ''),
  error: (msg, data) => console.error(`✗ ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`⚠️  ${msg}`, data || '')
};

async function runDiagnostics() {
  console.log('\n=== VAAMOOSE PAYMENT DIAGNOSTICS ===\n');

  // 1. Check environment variables
  log.info('Checking environment configuration...');
  const provider = process.env.PAYMENT_PROVIDER || 'payaza';
  const payazaKey = process.env.PAYAZA_API_KEY;
  const paystackKey = process.env.PAYSTACK_SECRET_KEY;
  const payazaBase = process.env.PAYAZA_BASE_URL || 'https://api.payaza.africa/live';

  log.info(`Current provider: ${provider}`);
  log.info(`Payaza API Key configured: ${payazaKey ? '✓ Yes' : '✗ No'}`);
  log.info(`Paystack API Key configured: ${paystackKey ? '✓ Yes' : '✗ No'}`);
  log.info(`Payaza Base URL: ${payazaBase}`);

  console.log('\n---\n');

  // 2. Test Payaza
  if (provider === 'payaza' || provider === 'both') {
    await testPayaza(payazaKey, payazaBase);
  }

  // 3. Test Paystack
  if (provider === 'paystack' || provider === 'both') {
    await testPaystack(paystackKey);
  }

  // 4. Test Database
  await testDatabase();

  console.log('\n=== END DIAGNOSTICS ===\n');
}

async function testPayaza(apiKey, baseUrl) {
  console.log('🔷 PAYAZA DIAGNOSTICS\n');

  if (!apiKey) {
    log.error('Payaza API key not configured in .env');
    return;
  }

  try {
    // Test 1: Basic connectivity
    log.info('Testing Payaza API connectivity...');
    const testRef = `TEST-${Date.now()}`;
    
    const payload = {
      service_payload: {
        transaction_reference: testRef
      }
    };

    const response = await axios.post(
      `${baseUrl}/card/card_charge/transaction_status`,
      payload,
      {
        headers: {
          'Authorization': `Payaza ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    log.success('Payaza API is reachable');
    log.info('Response status:', response.status);
    log.info('Response data keys:', Object.keys(response.data || {}));

  } catch (error) {
    const errMsg = error.response?.data?.message || error.message;
    const errStatus = error.response?.status;
    
    if (errStatus === 401 || errStatus === 403) {
      log.error('Authentication failed - API key may be invalid', {
        status: errStatus,
        message: errMsg
      });
    } else if (errStatus === 404) {
      log.warn('Transaction not found (expected for test ref)', { reference: testRef });
    } else if (error.code === 'ECONNREFUSED') {
      log.error('Connection refused - Payaza API endpoint unreachable', baseUrl);
    } else if (error.code === 'ETIMEDOUT') {
      log.error('Request timeout - Payaza API is slow or unreachable');
    } else {
      log.error('Payaza API error:', {
        status: errStatus,
        message: errMsg,
        code: error.code
      });
    }
  }

  console.log('');
}

async function testPaystack(apiKey) {
  console.log('🟨 PAYSTACK DIAGNOSTICS\n');

  if (!apiKey) {
    log.error('Paystack API key not configured in .env');
    return;
  }

  try {
    // Test 1: Basic connectivity
    log.info('Testing Paystack API connectivity...');
    const testRef = `TEST-${Date.now()}`;

    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${testRef}`,
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        timeout: 5000
      }
    );

    log.success('Paystack API is reachable');
    log.info('Response status:', response.status);

  } catch (error) {
    const errStatus = error.response?.status;
    const errMsg = error.response?.data?.message || error.message;

    if (errStatus === 401) {
      log.error('Authentication failed - Paystack API key is invalid');
    } else if (errStatus === 404) {
      log.warn('Transaction not found (expected for test ref)');
    } else if (error.code === 'ECONNREFUSED') {
      log.error('Connection refused - Paystack API unreachable');
    } else if (error.code === 'ETIMEDOUT') {
      log.error('Request timeout - Paystack API is slow or unreachable');
    } else {
      log.error('Paystack API error:', {
        status: errStatus,
        message: errMsg,
        code: error.code
      });
    }
  }

  console.log('');
}

async function testDatabase() {
  console.log('🗄️  DATABASE DIAGNOSTICS\n');

  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      log.error('MongoDB URI not configured in .env');
      return;
    }

    const mongoose = require('mongoose');
    await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 5000
    });

    log.success('MongoDB connection successful');
    
    // Check if Booking collection exists
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    const hasBooking = collections.some(c => c.name === 'bookings');
    
    log.info(`Booking collection exists: ${hasBooking ? '✓ Yes' : '✗ No'}`);
    
    await mongoose.disconnect();
  } catch (error) {
    log.error('MongoDB connection failed:', error.message);
  }

  console.log('');
}

// Run diagnostics
runDiagnostics().catch(err => {
  console.error('Fatal error during diagnostics:', err);
  process.exit(1);
});
