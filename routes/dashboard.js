/**
 * Dashboard Routes
 * Analytics and statistics endpoints
 */

const express = require('express');
const router = express.Router();
const db = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/dashboard/stats
// @desc    Get dashboard statistics
// @access  Private/Admin
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    // Today's stats
    const [todayOrders] = await db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM orders
      WHERE DATE(created_at) = CURDATE()
    `);

    // This month's stats
    const [monthOrders] = await db.query(`
      SELECT COUNT(*) as count, COALESCE(SUM(total), 0) as total
      FROM orders
      WHERE MONTH(created_at) = MONTH(CURDATE()) AND YEAR(created_at) = YEAR(CURDATE())
    `);

    // This month's expenses
    const [monthExpenses] = await db.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM expenses
      WHERE MONTH(date) = MONTH(CURDATE()) AND YEAR(date) = YEAR(CURDATE())
    `);

    // Pending orders count
    const [pendingOrders] = await db.query(`
      SELECT COUNT(*) as count FROM orders WHERE status = 'pending'
    `);

    // Employee count
    const [employees] = await db.query(`
      SELECT COUNT(*) as total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) as active
      FROM employees
    `);

    const monthSales = parseFloat(monthOrders[0].total);
    const monthExp = parseFloat(monthExpenses[0].total);

    res.json({
      success: true,
      data: {
        todaySales: parseFloat(todayOrders[0].total),
        todayOrders: todayOrders[0].count,
        monthSales,
        monthOrders: monthOrders[0].count,
        monthExpenses: monthExp,
        monthProfit: monthSales - monthExp,
        pendingOrders: pendingOrders[0].count,
        totalEmployees: employees[0].total,
        activeEmployees: employees[0].active
      }
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/sales-chart
// @desc    Get sales chart data
// @access  Private/Admin
router.get('/sales-chart', protect, adminOnly, async (req, res) => {
  try {
    const { period } = req.query;
    let query, labels;

    switch (period) {
      case 'week':
        query = `
          SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as total
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        break;
      case 'month':
        query = `
          SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as total
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
        break;
      case 'year':
        query = `
          SELECT DATE_FORMAT(created_at, '%Y-%m') as date, COALESCE(SUM(total), 0) as total
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 12 MONTH)
          GROUP BY DATE_FORMAT(created_at, '%Y-%m')
          ORDER BY date ASC
        `;
        break;
      default:
        query = `
          SELECT DATE(created_at) as date, COALESCE(SUM(total), 0) as total
          FROM orders
          WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `;
    }

    const [salesData] = await db.query(query);

    res.json({
      success: true,
      data: salesData.map(s => ({
        date: s.date,
        total: parseFloat(s.total)
      }))
    });
  } catch (error) {
    console.error('Get sales chart error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/recent-orders
// @desc    Get recent orders for dashboard
// @access  Private/Admin
router.get('/recent-orders', protect, adminOnly, async (req, res) => {
  try {
    const [orders] = await db.query(`
      SELECT o.id, o.order_number, o.total, o.status, o.created_at,
             u.first_name, u.last_name
      FROM orders o
      LEFT JOIN users u ON o.user_id = u.id
      ORDER BY o.created_at DESC
      LIMIT 10
    `);

    // Get items count for each order
    for (let order of orders) {
      const [items] = await db.query(
        'SELECT COUNT(*) as count FROM order_items WHERE order_id = ?',
        [order.id]
      );
      order.itemsCount = items[0].count;
    }

    res.json({
      success: true,
      data: orders
    });
  } catch (error) {
    console.error('Get recent orders error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/top-products
// @desc    Get top selling products
// @access  Private/Admin
router.get('/top-products', protect, adminOnly, async (req, res) => {
  try {
    const [products] = await db.query(`
      SELECT 
        oi.product_name as name,
        SUM(oi.quantity) as totalSold,
        SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY oi.product_name
      ORDER BY totalSold DESC
      LIMIT 5
    `);

    res.json({
      success: true,
      data: products.map(p => ({
        name: p.name,
        totalSold: p.totalSold,
        revenue: parseFloat(p.revenue)
      }))
    });
  } catch (error) {
    console.error('Get top products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/dashboard/category-sales
// @desc    Get sales by category
// @access  Private/Admin
router.get('/category-sales', protect, adminOnly, async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT 
        p.category,
        COUNT(DISTINCT oi.order_id) as orders,
        SUM(oi.quantity) as itemsSold,
        SUM(oi.total_price) as revenue
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      JOIN orders o ON oi.order_id = o.id
      WHERE o.status != 'cancelled'
      GROUP BY p.category
      ORDER BY revenue DESC
    `);

    res.json({
      success: true,
      data: categories.map(c => ({
        category: c.category,
        orders: c.orders,
        itemsSold: c.itemsSold,
        revenue: parseFloat(c.revenue)
      }))
    });
  } catch (error) {
    console.error('Get category sales error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
