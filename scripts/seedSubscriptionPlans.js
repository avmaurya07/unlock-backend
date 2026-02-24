require('dotenv').config();
const connectDB = require('../src/config/db');
const SubscriptionPlan = require('../src/models/SubscriptionPlan');

(async () => {
  try {
    await connectDB();

    const samplePrices = {
      '3': process.env.PLAN_3_PRICE || 499,
      '6': process.env.PLAN_6_PRICE || 899,
      '9': process.env.PLAN_9_PRICE || 1299,
      '12': process.env.PLAN_12_PRICE || 1999,
    };

    const durations = [3, 6, 9, 12];

    for (const d of durations) {
      const price = Number(samplePrices[String(d)]) || 0;
      const plan = await SubscriptionPlan.findOneAndUpdate(
        { durationInMonths: d },
        { price, isActive: true },
        { new: true, upsert: true }
      );
      console.log(`Upserted plan: ${d} months — price: ${price}`);
    }

    console.log('Seeding completed');
    process.exit(0);
  } catch (err) {
    console.error('Seeding error:', err);
    process.exit(1);
  }
})();
