// /**
//  * Orders Routes
//  * CRUD operations for orders
//  */

// const express = require('express');
// const router = express.Router();
// const { body, validationResult } = require('express-validator');
// const db = require('../config/database');
// const { protect, adminOnly } = require('../middleware/auth');

// // Generate order number
// const generateOrderNumber = () => {
//   return 'EVY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
// };

// // @route   GET /api/orders
// // @desc    Get all orders (admin) or user's orders
// // @access  Private
// router.get('/', protect, async (req, res) => {
//   try {
//     const { status, startDate, endDate } = req.query;
//     let query, params;

//     if (req.user.role === 'admin') {
//       query = `
//         SELECT o.*, u.first_name, u.last_name, u.email as user_email
//         FROM orders o
//         LEFT JOIN users u ON o.user_id = u.id
//         WHERE 1=1
//       `;
//       params = [];
//     } else {
//       query = 'SELECT * FROM orders WHERE user_id = ?';
//       params = [req.user.id];
//     }

//     if (status && status !== 'all') {
//       query += ' AND o.status = ?';
//       params.push(status);
//     }

//     if (startDate) {
//       query += ' AND DATE(o.created_at) >= ?';
//       params.push(startDate);
//     }

//     if (endDate) {
//       query += ' AND DATE(o.created_at) <= ?';
//       params.push(endDate);
//     }

//     query += ' ORDER BY o.created_at DESC';

//     const [orders] = await db.query(query, params);

//     // Get order items for each order
//     for (let order of orders) {
//       const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
//       order.items = items;
//     }

//     res.json({
//       success: true,
//       count: orders.length,
//       data: orders
//     });
//   } catch (error) {
//     console.error('Get orders error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   GET /api/orders/:id
// // @desc    Get single order
// // @access  Private
// router.get('/:id', protect, async (req, res) => {
//   try {
//     let query = 'SELECT * FROM orders WHERE id = ?';
//     const params = [req.params.id];

//     // Non-admin users can only see their own orders
//     if (req.user.role !== 'admin') {
//       query += ' AND user_id = ?';
//       params.push(req.user.id);
//     }

//     const [orders] = await db.query(query, params);

//     if (orders.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found'
//       });
//     }

//     const order = orders[0];

//     // Get order items
//     const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
//     order.items = items;

//     // Get status history
//     const [history] = await db.query(
//       'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
//       [order.id]
//     );
//     order.statusHistory = history;

//     res.json({
//       success: true,
//       data: order
//     });
//   } catch (error) {
//     console.error('Get order error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   POST /api/orders
// // @desc    Create new order
// // @access  Private
// router.post('/', protect, [
//   body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
//   body('deliveryType').isIn(['delivery', 'pickup']).withMessage('Invalid delivery type'),
//   body('paymentMethod').isIn(['cash', 'telebirr', 'cbe', 'card']).withMessage('Invalid payment method')
// ], async (req, res) => {
//   const connection = await db.getConnection();
  
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     await connection.beginTransaction();

//     const {
//       items,
//       subtotal,
//       discountAmount,
//       deliveryFee,
//       total,
//       deliveryType,
//       deliveryAddress,
//       deliveryCity,
//       deliveryArea,
//       deliveryInstructions,
//       paymentMethod,
//       scheduledFor
//     } = req.body;

//     const orderNumber = generateOrderNumber();

//     // Create order
//     const [orderResult] = await connection.query(
//       `INSERT INTO orders (
//         order_number, user_id, customer_name, customer_email, customer_phone,
//         subtotal, discount_amount, delivery_fee, total,
//         status, delivery_type, delivery_address, delivery_city, delivery_area,
//         delivery_instructions, payment_method, scheduled_for, estimated_delivery
//       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//       [
//         orderNumber,
//         req.user.id,
//         `${req.user.first_name} ${req.user.last_name}`,
//         req.user.email,
//         req.user.phone,
//         subtotal,
//         discountAmount || 0,
//         deliveryFee || 0,
//         total,
//         'pending',
//         deliveryType,
//         deliveryAddress || null,
//         deliveryCity || null,
//         deliveryArea || null,
//         deliveryInstructions || null,
//         paymentMethod,
//         scheduledFor || null,
//         deliveryType === 'pickup' ? '15-20 mins' : '30-45 mins'
//       ]
//     );

//     const orderId = orderResult.insertId;

//     // Insert order items
//     for (const item of items) {
//       await connection.query(
//         `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
//          VALUES (?, ?, ?, ?, ?, ?)`,
//         [orderId, item.id, item.name, item.quantity, item.finalPrice, item.finalPrice * item.quantity]
//       );
//     }

//     // Insert initial status history
//     await connection.query(
//       'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
//       [orderId, 'pending', 'Order placed successfully']
//     );

//     await connection.commit();

//     res.status(201).json({
//       success: true,
//       message: 'Order placed successfully',
//       data: {
//         id: orderId,
//         orderNumber,
//         status: 'pending',
//         estimatedDelivery: deliveryType === 'pickup' ? '15-20 mins' : '30-45 mins'
//       }
//     });
//   } catch (error) {
//     await connection.rollback();
//     console.error('Create order error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   } finally {
//     connection.release();
//   }
// });

// // @route   PUT /api/orders/:id/status
// // @desc    Update order status
// // @access  Private/Admin
// router.put('/:id/status', protect, adminOnly, async (req, res) => {
//   try {
//     const { status, message } = req.body;
    
//     const validStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid status'
//       });
//     }

//     // Update order status
//     await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

//     // Add to status history
//     await db.query(
//       'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
//       [req.params.id, status, message || `Order ${status}`]
//     );

//     // Update payment status if delivered
//     if (status === 'delivered') {
//       await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', req.params.id]);
//     }

//     res.json({
//       success: true,
//       message: 'Order status updated'
//     });
//   } catch (error) {
//     console.error('Update order status error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   PUT /api/orders/:id/cancel
// // @desc    Cancel order
// // @access  Private
// router.put('/:id/cancel', protect, async (req, res) => {
//   try {
//     let query = 'SELECT * FROM orders WHERE id = ?';
//     const params = [req.params.id];

//     if (req.user.role !== 'admin') {
//       query += ' AND user_id = ?';
//       params.push(req.user.id);
//     }

//     const [orders] = await db.query(query, params);

//     if (orders.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'Order not found'
//       });
//     }

//     const order = orders[0];

//     // Can only cancel pending or confirmed orders
//     if (!['pending', 'confirmed'].includes(order.status)) {
//       return res.status(400).json({
//         success: false,
//         message: 'Cannot cancel order at this stage'
//       });
//     }

//     await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

//     await db.query(
//       'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
//       [req.params.id, 'cancelled', 'Order cancelled by customer']
//     );

//     res.json({
//       success: true,
//       message: 'Order cancelled successfully'
//     });
//   } catch (error) {
//     console.error('Cancel order error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// module.exports = router;


/**
 * Orders Routes
 * CRUD operations for orders
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// Generate order number
const generateOrderNumber = () => {
  return 'EVY-' + Math.random().toString(36).substring(2, 8).toUpperCase();
};

// ⭐ MANUAL SALE ENDPOINT - MUST BE FIRST!
// @route   POST /api/orders/manual-sale
// @desc    Admin create manual sale (not from customer order)
// @access  Private/Admin
router.post('/manual-sale', protect, adminOnly, [
  body('customer_name').trim().notEmpty().withMessage('Customer name is required'),
  body('items').isArray({ min: 1 }).withMessage('Sale must have at least one item'),
  body('paymentMethod').isIn(['cash', 'bank', 'mobile']).withMessage('Invalid payment method'),
  body('total').isNumeric().withMessage('Total must be a number')
], async (req, res) => {
  console.log('✅ Manual sale endpoint called!');
  console.log('User:', req.user.id, 'Role:', req.user.role);
  console.log('Body:', req.body);
  
  const connection = await db.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.log('❌ Validation errors:', errors.array());
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connection.beginTransaction();

    const {
      customer_name,
      items,
      subtotal,
      discountAmount,
      deliveryFee,
      total,
      paymentMethod,
      notes
    } = req.body;

    const orderNumber = generateOrderNumber();

    console.log('📝 Creating order:', { orderNumber, customer_name, total });

    // Create order (manual sale)
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        subtotal, discount_amount, delivery_fee, total,
        status, delivery_type, payment_method, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        req.user.id,
        customer_name,
        '',
        '',
        subtotal || total,
        discountAmount || 0,
        deliveryFee || 0,
        total,
        'delivered',
        'pickup',
        paymentMethod,
        'Completed'
      ]
    );

    const orderId = orderResult.insertId;
    console.log('✅ Order created:', orderId);

    // Insert order items
    for (const item of items) {
      console.log('📦 Adding item:', item.name);
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          orderId, 
          item.id, 
          item.name, 
          item.quantity, 
          item.finalPrice, 
          item.finalPrice * item.quantity
        ]
      );
    }

    // Insert status history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
      [orderId, 'delivered', 'Manual sale recorded by admin']
    );

    await connection.commit();

    console.log('✅ Sale recorded successfully!');
    res.status(201).json({
      success: true,
      message: 'Sale recorded successfully',
      data: {
        id: orderId,
        orderNumber,
        status: 'delivered'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('❌ Create manual sale error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  } finally {
    connection.release();
  }
});

// @route   GET /api/orders
// @desc    Get all orders (admin) or user's orders
// @access  Private
router.get('/', protect, async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    let query, params;

    if (req.user.role === 'admin') {
      query = `
        SELECT o.*, u.first_name, u.last_name, u.email as user_email
        FROM orders o
        LEFT JOIN users u ON o.user_id = u.id
        WHERE 1=1
      `;
      params = [];

      if (status && status !== 'all') {
        query += ' AND o.status = ?';
        params.push(status);
      }

      if (startDate) {
        query += ' AND DATE(o.created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(o.created_at) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY o.created_at DESC';
    } else {
      query = 'SELECT * FROM orders WHERE user_id = ?';
      params = [req.user.id];

      if (status && status !== 'all') {
        query += ' AND status = ?';
        params.push(status);
      }

      if (startDate) {
        query += ' AND DATE(created_at) >= ?';
        params.push(startDate);
      }

      if (endDate) {
        query += ' AND DATE(created_at) <= ?';
        params.push(endDate);
      }

      query += ' ORDER BY created_at DESC';
    }

    const [orders] = await db.query(query, params);

    // Get order items for each order
    for (let order of orders) {
      const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
      order.items = items;
    }

    res.json({
      success: true,
      count: orders.length,
      data: orders
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get single order
// @access  Private
router.get('/:id', protect, async (req, res) => {
  try {
    let query = 'SELECT * FROM orders WHERE id = ?';
    const params = [req.params.id];

    // Non-admin users can only see their own orders
    if (req.user.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [orders] = await db.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Get order items
    const [items] = await db.query('SELECT * FROM order_items WHERE order_id = ?', [order.id]);
    order.items = items;

    // Get status history
    const [history] = await db.query(
      'SELECT * FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC',
      [order.id]
    );
    order.statusHistory = history;

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', protect, [
  body('items').isArray({ min: 1 }).withMessage('Order must have at least one item'),
  body('deliveryType').isIn(['delivery', 'pickup']).withMessage('Invalid delivery type'),
  body('paymentMethod').isIn(['cash', 'telebirr', 'cbe', 'card']).withMessage('Invalid payment method')
], async (req, res) => {
  const connection = await db.getConnection();
  
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    await connection.beginTransaction();

    const {
      items,
      subtotal,
      discountAmount,
      deliveryFee,
      total,
      deliveryType,
      deliveryAddress,
      deliveryCity,
      deliveryArea,
      deliveryInstructions,
      paymentMethod,
      scheduledFor
    } = req.body;

    const orderNumber = generateOrderNumber();

    // Create order
    const [orderResult] = await connection.query(
      `INSERT INTO orders (
        order_number, user_id, customer_name, customer_email, customer_phone,
        subtotal, discount_amount, delivery_fee, total,
        status, delivery_type, delivery_address, delivery_city, delivery_area,
        delivery_instructions, payment_method, scheduled_for, estimated_delivery
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        orderNumber,
        req.user.id,
        `${req.user.first_name} ${req.user.last_name}`,
        req.user.email,
        req.user.phone,
        subtotal,
        discountAmount || 0,
        deliveryFee || 0,
        total,
        'pending',
        deliveryType,
        deliveryAddress || null,
        deliveryCity || null,
        deliveryArea || null,
        deliveryInstructions || null,
        paymentMethod,
        scheduledFor || null,
        deliveryType === 'pickup' ? '15-20 mins' : '30-45 mins'
      ]
    );

    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of items) {
      await connection.query(
        `INSERT INTO order_items (order_id, product_id, product_name, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [orderId, item.id, item.name, item.quantity, item.finalPrice, item.finalPrice * item.quantity]
      );
    }

    // Insert initial status history
    await connection.query(
      'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
      [orderId, 'pending', 'Order placed successfully']
    );

    await connection.commit();

    res.status(201).json({
      success: true,
      message: 'Order placed successfully',
      data: {
        id: orderId,
        orderNumber,
        status: 'pending',
        estimatedDelivery: deliveryType === 'pickup' ? '15-20 mins' : '30-45 mins'
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Create order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    connection.release();
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', protect, adminOnly, async (req, res) => {
  try {
    const { status, message } = req.body;
    
    const validStatuses = ['pending', 'confirmed', 'preparing', 'out-for-delivery', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status'
      });
    }

    // Update order status
    await db.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);

    // Add to status history
    await db.query(
      'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
      [req.params.id, status, message || `Order ${status}`]
    );

    // Update payment status if delivered
    if (status === 'delivered') {
      await db.query('UPDATE orders SET payment_status = ? WHERE id = ?', ['paid', req.params.id]);
    }

    res.json({
      success: true,
      message: 'Order status updated'
    });
  } catch (error) {
    console.error('Update order status error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id/cancel
// @desc    Cancel order
// @access  Private
router.put('/:id/cancel', protect, async (req, res) => {
  try {
    let query = 'SELECT * FROM orders WHERE id = ?';
    const params = [req.params.id];

    if (req.user.role !== 'admin') {
      query += ' AND user_id = ?';
      params.push(req.user.id);
    }

    const [orders] = await db.query(query, params);

    if (orders.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const order = orders[0];

    // Can only cancel pending or confirmed orders
    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel order at this stage'
      });
    }

    await db.query('UPDATE orders SET status = ? WHERE id = ?', ['cancelled', req.params.id]);

    await db.query(
      'INSERT INTO order_status_history (order_id, status, message) VALUES (?, ?, ?)',
      [req.params.id, 'cancelled', 'Order cancelled by customer']
    );

    res.json({
      success: true,
      message: 'Order cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel order error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;