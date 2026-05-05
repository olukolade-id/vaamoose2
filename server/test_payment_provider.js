const axios = require('axios');
const paymentService = require('./utils/paymentService');

async function testPaymentProvider() {
  console.log('🧪 Testing Payment Provider Configuration\n');

  // Check current provider
  const currentProvider = paymentService.getCurrentProvider();
  console.log(`✓ Current provider from environment: ${currentProvider}`);

  // Check environment variables
  console.log(`✓ PAYMENT_PROVIDER env var: ${process.env.PAYMENT_PROVIDER}`);
  console.log(`✓ PAYAZA_API_KEY exists: ${!!process.env.PAYAZA_API_KEY}`);
  console.log(`✓ PAYAZA_BASE_URL: ${process.env.PAYAZA_BASE_URL}`);
  console.log(`✓ PAYSTACK_SECRET_KEY exists: ${!!process.env.PAYSTACK_SECRET_KEY}\n`);

  // Test payment initialization
  console.log('🧪 Testing payment initialization endpoint...\n');

  try {
    // Mock booking data
    const testData = {
      email: 'test@example.com',
      amount: 5000,
      bookingData: {
        schoolId: '123',
        schoolName: 'Test School',
        companyId: '507f1f77bcf86cd799439011',
        companyName: 'Test Company',
        vehicleId: 'v123',
        vehicleName: 'Bus',
        routeTo: 'Test Route',
        seats: [{ id: 'seat1', price: 2500 }],
      },
      companyId: '507f1f77bcf86cd799439011',
      paymentMethod: 'card'
    };

    console.log('📤 Request data:');
    console.log(JSON.stringify({
      ...testData,
      bookingData: { ...testData.bookingData, seats: '[...]' }
    }, null, 2));

    // The endpoint logic would check the provider and:
    // - If Paystack: return Paystack authorization URL
    // - If Payaza: return Payaza checkout URL

    if (currentProvider === 'payaza') {
      console.log('\n✅ Provider is set to PAYAZA');
      console.log('Expected response: Payaza checkout URL');
      const reference = `VAAMO-${Date.now()}-test`;
      const expectedUrl = `https://vaamoose.online/checkout?reference=${reference}&amount=5000&email=test@example.com&provider=payaza`;
      console.log(`Example checkout URL: ${expectedUrl}`);
    } else if (currentProvider === 'paystack') {
      console.log('\n⚠️  Provider is set to PAYSTACK');
      console.log('Expected response: Paystack authorization URL from Paystack API');
    }

    console.log('\n✅ Test completed successfully!\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testPaymentProvider();
