// middleware/roleCheck.middleware.js

// Check if user is a vendor
exports.isVendor = (req, res, next) => {
  console.log('🔐 Checking vendor role for user:', req.user?.email, 'Role:', req.user?.role);
  
  if (req.user && (req.user.role === 'vendor' || req.user.role === 'admin')) {
    console.log('✅ User is vendor/admin');
    return next();
  }
  
  console.log('❌ User is not vendor/admin');
  return res.status(403).json({
    success: false,
    message: 'Access denied. Vendor role required.'
  });
};

// Check if user is admin
exports.isAdmin = (req, res, next) => {
  console.log('🔐 Checking admin role for user:', req.user?.email, 'Role:', req.user?.role);
  
  if (req.user && req.user.role === 'admin') {
    console.log('✅ User is admin');
    return next();
  }
  
  console.log('❌ User is not admin');
  return res.status(403).json({
    success: false,
    message: 'Access denied. Admin role required.'
  });
};

// Check if user is customer
exports.isCustomer = (req, res, next) => {
  if (req.user && req.user.role === 'customer') {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: 'Access denied. Customer role required.'
  });
};