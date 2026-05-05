// Test script for Payaza integration
const paymentService = require('./utils/paymentService');

async function testPayazaIntegration() {
  console.log('Testing Payaza Integration...');
  console.log('Current provider:', paymentService.getCurrentProvider());

  // Test switching providers
  console.log('\n1. Testing provider switching...');
  paymentService.switchProvider('paystack');
  console.log('Switched to:', paymentService.getCurrentProvider());

  paymentService.switchProvider('payaza');
  console.log('Switched back to:', paymentService.getCurrentProvider());

  // Test account enquiry (safe test that doesn't require real payment)
  console.log('\n2. Testing account enquiry...');
  try {
    const enquiryResult = await paymentService.accountEnquiry({
      currency: 'NGN',
      bank_code: '000013',
      account_number: '0009119090'
    });
    console.log('Account enquiry result:', enquiryResult);
  } catch (error) {
    console.log('Account enquiry failed (expected in sandbox):', error.message);
  }

  // Test transaction status check
  console.log('\n3. Testing transaction status...');
  try {
    const statusResult = await paymentService.getTransactionStatus('TEST123');
    console.log('Transaction status result:', statusResult);
  } catch (error) {
    console.log('Transaction status check failed (expected):', error.message);
  }

  console.log('\nPayaza integration test completed!');
}

// Run test if this file is executed directly
if (require.main === module) {
  testPayazaIntegration().catch(console.error);
}

module.exports = { testPayazaIntegration };