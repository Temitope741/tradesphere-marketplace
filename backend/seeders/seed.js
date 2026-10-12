const mongoose = require('mongoose');
const dotenv = require('dotenv');
const Category = require('../models/Category.model');
const User = require('../models/User.model');
const Product = require('../models/Product.model');

// Load env vars
dotenv.config();

// Connect to database
mongoose.connect(process.env.MONGODB_URI);
// Sample categories
const categories = [
  {
    name: 'Electronics',
    description: 'Phones, laptops, gadgets and electronic devices',
    slug: 'electronics'
  },
  {
    name: 'Fashion',
    description: 'Clothing, shoes, accessories and fashion items',
    slug: 'fashion'
  },
  {
    name: 'Home & Garden',
    description: 'Furniture, decor, kitchen and garden items',
    slug: 'home-garden'
  },
  {
    name: 'Sports',
    description: 'Sports equipment, fitness gear and outdoor activities',
    slug: 'sports'
  },
  {
    name: 'Books',
    description: 'Books, ebooks, educational materials',
    slug: 'books'
  },
  {
    name: 'Beauty',
    description: 'Cosmetics, skincare, personal care products',
    slug: 'beauty'
  }
];

// Sample admin user
const adminUser = {
  fullName: 'Admin User',
  email: 'admin@marketplace.com',
  password: 'admin123',
  role: 'admin'
};

// Sample vendor user
const vendorUser = {
  fullName: 'John Vendor',
  email: 'vendor@marketplace.com',
  password: 'vendor123',
  role: 'vendor',
  phone: '+234 800 123 4567',
  address: '123 Vendor Street, Lagos, Nigeria'
};

// Sample customer user
const customerUser = {
  fullName: 'Jane Customer',
  email: 'customer@marketplace.com',
  password: 'customer123',
  role: 'customer',
  phone: '+234 800 987 6543',
  address: '456 Customer Avenue, Lagos, Nigeria'
};

// Import data
const importData = async () => {
  try {
    console.log('🌱 Starting data import...');

    // Clear existing data
    await Category.deleteMany();
    await User.deleteMany();
    await Product.deleteMany();
    console.log('🗑️  Cleared existing data');

    // Import categories
    const createdCategories = await Category.insertMany(categories);
    console.log(`✅ ${createdCategories.length} categories imported`);

    // Import users
    const admin = await User.create(adminUser);
    const vendor = await User.create(vendorUser);
    const customer = await User.create(customerUser);
    console.log('✅ Sample users created');

    // Create sample products
    const sampleProducts = [
      {
        vendor: vendor._id,
        name: 'iPhone 15 Pro',
        description: 'Latest iPhone with A17 Pro chip, titanium design, and advanced camera system',
        price: 450000,
        stockQuantity: 50,
        category: createdCategories[0]._id, // Electronics
        imageUrl: 'https://images.unsplash.com/photo-1592286927505-39137a6a1e79',
        sku: 'IP15P-001'
      },
      {
        vendor: vendor._id,
        name: 'MacBook Pro 14"',
        description: 'M3 Pro chip, 16GB RAM, 512GB SSD, Liquid Retina XDR display',
        price: 850000,
        stockQuantity: 30,
        category: createdCategories[0]._id, // Electronics
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8',
        sku: 'MBP14-001'
      },
      {
        vendor: vendor._id,
        name: 'Nike Air Max 2024',
        description: 'Premium running shoes with Air cushioning technology',
        price: 45000,
        stockQuantity: 100,
        category: createdCategories[3]._id, // Sports
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
        sku: 'NAM24-001'
      },
      {
        vendor: vendor._id,
        name: 'Designer Watch',
        description: 'Luxury automatic watch with leather strap',
        price: 120000,
        stockQuantity: 25,
        category: createdCategories[1]._id, // Fashion
        imageUrl: 'https://images.unsplash.com/photo-1523275335684-37898b6baf30',
        sku: 'DW-001'
      },
      {
        vendor: vendor._id,
        name: 'Modern Sofa Set',
        description: '3-seater comfortable sofa with premium fabric',
        price: 250000,
        stockQuantity: 15,
        category: createdCategories[2]._id, // Home & Garden
        imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc',
        sku: 'MSS-001'
      },
      {
        vendor: vendor._id,
        name: 'Bestseller Book Collection',
        description: 'Collection of top 10 bestselling books',
        price: 15000,
        stockQuantity: 200,
        category: createdCategories[4]._id, // Books
        imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f',
        sku: 'BBC-001'
      },
      {
        vendor: vendor._id,
        name: 'Skincare Gift Set',
        description: 'Complete skincare routine with natural ingredients',
        price: 35000,
        stockQuantity: 80,
        category: createdCategories[5]._id, // Beauty
        imageUrl: 'https://images.unsplash.com/photo-1556228720-195a672e8a03',
        sku: 'SGS-001'
      },
      {
        vendor: vendor._id,
        name: 'Wireless Headphones',
        description: 'Noise-cancelling Bluetooth headphones with 30-hour battery',
        price: 65000,
        stockQuantity: 60,
        category: createdCategories[0]._id, // Electronics
        imageUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e',
        sku: 'WH-001'
      }
    ];

    const createdProducts = await Product.insertMany(sampleProducts);
    console.log(`✅ ${createdProducts.length} sample products created`);

    console.log('\n✨ Data import completed successfully!\n');
    console.log('📧 Test Credentials:');
    console.log('   Admin:    admin@marketplace.com / admin123');
    console.log('   Vendor:   vendor@marketplace.com / vendor123');
    console.log('   Customer: customer@marketplace.com / customer123\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error importing data:', error);
    process.exit(1);
  }
};

// Delete data
const deleteData = async () => {
  try {
    console.log('🗑️  Starting data deletion...');

    await Category.deleteMany();
    await User.deleteMany();
    await Product.deleteMany();

    console.log('✅ Data deleted successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error deleting data:', error);
    process.exit(1);
  }
};

// Check command line arguments
if (process.argv[2] === '-d') {
  deleteData();
} else {
  importData();
}