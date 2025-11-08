/**
 * Monitor Gold Feature Costs
 *
 * This script analyzes Gold feature usage and estimates costs
 * Run with: node scripts/monitor-gold-costs.js
 */

const admin = require('firebase-admin');

// Initialize if not already initialized
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

// Cost per operation (in USD)
const COSTS = {
  summarization: 0.002,    // GPT-4o-mini
  cartoon: 0.085,          // Vision ($0.005) + DALL-E 3 HD ($0.08)
  composition: 0.01,       // GPT-4o-mini
  comments: 0.003,         // GPT-4o-mini
  translation: 0.005,      // GPT-4o-mini
};

async function monitorGoldCosts() {
  console.log('📊 Gold Feature Cost Monitor');
  console.log('============================');
  console.log('');

  try {
    // Get all Gold users
    const usersSnapshot = await db.collection('users')
      .where('subscriptionPlan', '==', 'gold')
      .get();

    if (usersSnapshot.empty) {
      console.log('No Gold users found');
      return;
    }

    const goldUserCount = usersSnapshot.size;
    console.log(`Found ${goldUserCount} Gold users`);
    console.log('');

    let totalCosts = {
      summarization: 0,
      cartoon: 0,
      composition: 0,
      comments: 0,
      translation: 0,
    };

    let totalUsage = {
      summarization: 0,
      cartoon: 0,
      composition: 0,
      comments: 0,
      translation: 0,
    };

    // Analyze each user
    console.log('Analyzing usage...');
    console.log('');

    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const usage = userData.goldUsage || {};

      Object.keys(COSTS).forEach(feature => {
        const count = usage[feature]?.count || 0;
        totalUsage[feature] += count;
        totalCosts[feature] += count * COSTS[feature];
      });
    });

    // Calculate totals
    const totalOperations = Object.values(totalUsage).reduce((sum, count) => sum + count, 0);
    const totalCost = Object.values(totalCosts).reduce((sum, cost) => sum + cost, 0);
    const revenue = goldUserCount * 10; // $10/month per user (R150 ≈ $10)
    const profit = revenue - totalCost;
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;

    // Display results
    console.log('Usage Breakdown:');
    console.log('----------------');
    Object.entries(totalUsage).forEach(([feature, count]) => {
      const cost = totalCosts[feature];
      const avgPerUser = goldUserCount > 0 ? (count / goldUserCount).toFixed(1) : 0;
      console.log(`  ${feature.padEnd(15)} ${count.toString().padStart(6)} ops  ($${cost.toFixed(2)})  [${avgPerUser}/user]`);
    });

    console.log('');
    console.log('Cost Summary:');
    console.log('-------------');
    console.log(`  Total Operations:  ${totalOperations}`);
    console.log(`  Total AI Cost:     $${totalCost.toFixed(2)}`);
    console.log(`  Cost per user:     $${(totalCost / goldUserCount).toFixed(2)}`);
    console.log('');

    console.log('Revenue Analysis:');
    console.log('-----------------');
    console.log(`  Gold Users:        ${goldUserCount}`);
    console.log(`  Monthly Revenue:   $${revenue.toFixed(2)} (${goldUserCount} × $10)`);
    console.log(`  AI Costs:          $${totalCost.toFixed(2)}`);
    console.log(`  Profit:            $${profit.toFixed(2)}`);
    console.log(`  Profit Margin:     ${profitMargin.toFixed(1)}%`);
    console.log('');

    // Warnings
    if (profitMargin < 50) {
      console.log('⚠️  Warning: Profit margin below 50%');
      console.log('    Consider implementing usage limits or increasing price');
      console.log('');
    }

    if (totalCost / goldUserCount > 5) {
      console.log('⚠️  Warning: Average cost per user exceeds $5');
      console.log('    Some users may be using features excessively');
      console.log('');
    }

    // Top users
    console.log('Top 5 Users by Usage:');
    console.log('---------------------');

    const userCosts = [];
    usersSnapshot.forEach(doc => {
      const userData = doc.data();
      const usage = userData.goldUsage || {};

      let userCost = 0;
      Object.keys(COSTS).forEach(feature => {
        const count = usage[feature]?.count || 0;
        userCost += count * COSTS[feature];
      });

      userCosts.push({
        id: doc.id,
        email: userData.email,
        cost: userCost,
      });
    });

    userCosts
      .sort((a, b) => b.cost - a.cost)
      .slice(0, 5)
      .forEach((user, index) => {
        console.log(`  ${index + 1}. ${user.email.padEnd(30)} $${user.cost.toFixed(2)}`);
      });

    console.log('');

    // Recommendations
    console.log('Recommendations:');
    console.log('----------------');

    if (profitMargin > 80) {
      console.log('  ✅ Excellent profit margin! Consider expanding features.');
    } else if (profitMargin > 60) {
      console.log('  ✅ Good profit margin. Monitor closely.');
    } else {
      console.log('  ⚠️  Low profit margin. Consider:');
      console.log('      - Implementing rate limits');
      console.log('      - Using more gpt-4o-mini instead of gpt-4o');
      console.log('      - Increasing Gold price');
    }

    console.log('');

    // Next monitoring
    console.log('Next Steps:');
    console.log('-----------');
    console.log('  1. Monitor OpenAI usage: https://platform.openai.com/usage');
    console.log('  2. Set billing alerts in OpenAI dashboard');
    console.log('  3. Run this script daily to track trends');
    console.log('  4. Review top users for unusual patterns');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

monitorGoldCosts();
