const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Create indexes
    await createIndexes();
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

const createIndexes = async () => {
  try {
    const User = require('../models/User.model');
    const Product = require('../models/Product.model');
    const Order = require('../models/Order.model');
    
    await User.createIndexes();
    await Product.createIndexes();
    await Order.createIndexes();
    
    console.log('✅ Database indexes created');
  } catch (error) {
    console.error('Index creation warning:', error.message);
  }
};

module.exports = connectDB;