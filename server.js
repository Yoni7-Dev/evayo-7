// /**
//  * Evayo Bakery - Express Server
//  * Main entry point for the backend API
//  */

// require('dotenv').config();
// const express = require('express');
// const cors = require('cors');

// // Import routes
// const authRoutes = require('./routes/auth');
// const productRoutes = require('./routes/products');
// const orderRoutes = require('./routes/orders');
// const employeeRoutes = require('./routes/employees');
// const expenseRoutes = require('./routes/expenses');
// const dashboardRoutes = require('./routes/dashboard');

// // Initialize express app
// const app = express();

// // Middleware
// app.use(cors({
//   origin: process.env.CLIENT_URL || 'https://evayo-7.onrender.com/',
//   credentials: true
// }));
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));

// // API Routes
// app.use('/api/auth', authRoutes);
// app.use('/api/products', productRoutes);
// app.use('/api/orders', orderRoutes);
// app.use('/api/employees', employeeRoutes);
// app.use('/api/expenses', expenseRoutes);
// app.use('/api/dashboard', dashboardRoutes);

// // Health check route
// app.get('/api/health', (req, res) => {
//   res.json({ status: 'OK', message: 'Evayo Bakery API is running' });
// });

// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({
//     success: false,
//     message: 'Something went wrong!',
//     error: process.env.NODE_ENV === 'development' ? err.message : undefined
//   });
// });

// // 404 handler
// app.use((req, res) => {
//   res.status(404).json({
//     success: false,
//     message: 'Route not found'
//   });
// });

// // Start server
// const PORT = process.env.PORT || 5000;
// app.listen(PORT, () => {
//   console.log(`🚀 Evayo Bakery Server running on port ${PORT}`);
//   console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
// });


/**
 * Evayo Bakery - Express Server
 * Main entry point for the backend API
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Import routes
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const orderRoutes = require('./routes/orders');
const employeeRoutes = require('./routes/employees');
const expenseRoutes = require('./routes/expenses');
const dashboardRoutes = require('./routes/dashboard');

// Initialize express app
const app = express();

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || 'https://evayo-7.onrender.com/',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`📨 ${req.method} ${req.path}`);
  next();
});

// API Routes
console.log('🔗 Registering routes...');
app.use('/api/auth', authRoutes);
console.log('✅ Auth routes registered');

app.use('/api/products', productRoutes);
console.log('✅ Products routes registered');

app.use('/api/orders', orderRoutes);
console.log('✅ Orders routes registered (includes /manual-sale)');

app.use('/api/employees', employeeRoutes);
console.log('✅ Employees routes registered');

app.use('/api/expenses', expenseRoutes);
console.log('✅ Expenses routes registered');

app.use('/api/dashboard', dashboardRoutes);
console.log('✅ Dashboard routes registered');

// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Evayo Bakery API is running' });
});

// Test manual-sale endpoint
app.get('/api/test-routes', (req, res) => {
  res.json({
    message: 'Available routes:',
    routes: [
      'POST /api/orders',
      'POST /api/orders/manual-sale',
      'GET /api/orders',
      'GET /api/orders/:id',
      'PUT /api/orders/:id/status',
      'PUT /api/orders/:id/cancel'
    ]
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`\n🚀 Evayo Bakery Server running on port ${PORT}`);
  console.log(`📦 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`🧪 Test routes: http://localhost:${PORT}/api/test-routes`);
  console.log(`📝 Manual Sale Endpoint: POST http://localhost:${PORT}/api/orders/manual-sale\n`);
});