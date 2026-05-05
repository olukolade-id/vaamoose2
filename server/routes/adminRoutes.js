const express = require('express');
const router = express.Router();
const axios = require('axios');
const Partner = require('../models/Partner');

const ADMIN_KEY = process.env.ADMIN_SECRET_KEY || 'vaamoose-admin-secret-2025';

const verifyAdmin = (req, res, next) => {
  const key = req.headers['x-admin-key'];
  if (key !== ADMIN_KEY) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

// GET all partners
router.get('/partners', verifyAdmin, async (req, res) => {
  try {
    const partners = await Partner.find().select('-password').sort({ createdAt: -1 });
    res.json({ partners });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// APPROVE partner
router.put('/partners/:id/approve', verifyAdmin, async (req, res) => {
  try {
    const partner = await Partner.findById(req.params.id);
    if (!partner) return res.status(404).json({ error: 'Partner not found' });

    console.log('=== APPROVING PARTNER ===');
    console.log('Company:', partner.companyName);
    console.log('Bank Code:', partner.bankCode);
    console.log('Account Number:', partner.bankAccountNumber);
    console.log('Account Name:', partner.accountName);
    console.log('Paystack Key starts with:', process.env.PAYSTACK_SECRET_KEY?.slice(0, 10));

    if (!partner.paystackSubaccountCode) {
      if (!partner.bankAccountNumber || !partner.bankCode) {
        return res.status(400).json({
          error: 'Partner has not provided bank account details.'
        });
      }

      const payload = {
        business_name: partner.companyName,
        settlement_bank: partner.bankCode,
        account_number: partner.bankAccountNumber,
        percentage_charge: 85,
        description: `Vaamoose partner: ${partner.companyName}`,
        primary_contact_email: partner.email,
        primary_contact_name: partner.accountName || partner.companyName,
        primary_contact_phone: partner.phone,
      };

      console.log('Sending to Paystack:', JSON.stringify(payload, null, 2));

      let paystackRes;
      try {
        paystackRes = await axios.post(
          'https://api.paystack.co/subaccount',
          payload,
          {
            headers: {
              Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
              'Content-Type': 'application/json',
            },
          }
        );
        console.log('Paystack response:', JSON.stringify(paystackRes.data, null, 2));
      } catch (paystackError) {
        const errData = paystackError?.response?.data;
        console.error('Paystack ERROR response:', JSON.stringify(errData, null, 2));
        console.error('Paystack ERROR status:', paystackError?.response?.status);
        return res.status(400).json({
          error: errData?.message || paystackError.message,
          details: errData,
        });
      }

      if (!paystackRes.data.status) {
        return res.status(400).json({
          error: `Paystack error: ${paystackRes.data.message}`,
          details: paystackRes.data,
        });
      }

      partner.paystackSubaccountCode = paystackRes.data.data.subaccount_code;
    }

    partner.isApproved = true;
    await partner.save();

    res.json({
      message: 'Partner approved!',
      subaccountCode: partner.paystackSubaccountCode,
    });
  } catch (error) {
    console.error('General approve error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// DELETE partner
router.delete('/partners/:id', verifyAdmin, async (req, res) => {
  try {
    await Partner.findByIdAndDelete(req.params.id);
    res.json({ message: 'Partner removed.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;