// Phase 12 Integration Test
// Quick verification that all utilities are working correctly

import { getExchangeRate, getAllRates } from './currencyApi.js';
import { getCryptoPrice, searchCrypto } from './cryptoApi.js';
import { suggestCategory, getAllCategorySuggestions } from './SmartTagging.js';
import { predictBudget, getCategoryInsights } from './budgetPredictor.js';
import { parseCSV } from './csvParser.js';
import { getFinancialNews } from './newsApi.js';

/**
 * Test all Phase 12 utilities
 * Run this in browser console to verify everything works
 */
async function testPhase12() {
    console.log('🧪 Testing Phase 12 Utilities...\n');

    // Test 1: Currency API
    console.log('1️⃣ Testing Currency API...');
    try {
        const usdToInr = await getExchangeRate('USD', 'INR');
        console.log(`✅ Currency API: 1 USD = ${usdToInr} INR`);
    } catch (error) {
        console.error('❌ Currency API failed:', error.message);
    }

    // Test 2: Crypto API
    console.log('\n2️⃣ Testing Crypto API...');
    try {
        const btcPrice = await getCryptoPrice('bitcoin', 'usd');
        console.log(`✅ Crypto API: Bitcoin = $${btcPrice}`);
    } catch (error) {
        console.error('❌ Crypto API failed:', error.message);
    }

    // Test 3: Auto-categorization
    console.log('\n3️⃣ Testing Auto-categorization...');
    try {
        const category = suggestCategory('Swiggy', 'Food delivery');
        const suggestions = getAllCategorySuggestions('Amazon', 'Online shopping');
        console.log(`✅ Category Suggestion: "Swiggy" → ${category}`);
        console.log(`✅ All Suggestions for "Amazon":`, suggestions);
    } catch (error) {
        console.error('❌ Auto-categorization failed:', error.message);
    }

    // Test 4: Predictive Budgeting
    console.log('\n4️⃣ Testing Predictive Budgeting...');
    try {
        const sampleTransactions = [
            { date: '2024-01-15', type: 'expense', category: 'Food', amount: 5000 },
            { date: '2024-02-15', type: 'expense', category: 'Food', amount: 5500 },
            { date: '2024-03-15', type: 'expense', category: 'Food', amount: 6000 },
        ];
        const predictions = predictBudget(sampleTransactions, 3, 15);
        console.log(`✅ Budget Prediction:`, predictions);
    } catch (error) {
        console.error('❌ Predictive Budgeting failed:', error.message);
    }

    // Test 5: CSV Parser
    console.log('\n5️⃣ Testing CSV Parser...');
    try {
        const sampleCSV = `Date,Description,Amount
2024-01-15,Swiggy Order,500
2024-01-16,Uber Ride,200`;
        const transactions = parseCSV(sampleCSV, 'Generic');
        console.log(`✅ CSV Parser: Parsed ${transactions.length} transactions`);
        console.log('Sample:', transactions[0]);
    } catch (error) {
        console.error('❌ CSV Parser failed:', error.message);
    }

    // Test 6: News API
    console.log('\n6️⃣ Testing News API...');
    try {
        const news = await getFinancialNews('india');
        console.log(`✅ News API: Fetched ${news.length} articles`);
        if (news.length > 0) {
            console.log('Latest:', news[0].title);
        }
    } catch (error) {
        console.error('❌ News API failed:', error.message);
    }

    console.log('\n✨ Phase 12 Verification Complete!');
}

// Export for use in browser console
window.testPhase12 = testPhase12;

console.log('📝 Phase 12 test loaded. Run window.testPhase12() to verify all utilities.');
