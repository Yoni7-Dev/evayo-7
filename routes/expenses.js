/**
 * Expenses Routes
 * CRUD operations for expenses
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/expenses
// @desc    Get all expenses
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { category, startDate, endDate } = req.query;
    
    let query = 'SELECT * FROM expenses WHERE 1=1';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (startDate) {
      query += ' AND date >= ?';
      params.push(startDate);
    }

    if (endDate) {
      query += ' AND date <= ?';
      params.push(endDate);
    }

    query += ' ORDER BY date DESC, created_at DESC';

    const [expenses] = await db.query(query, params);

    // Calculate totals by category
    const [categoryTotals] = await db.query(`
      SELECT category, SUM(amount) as total
      FROM expenses
      ${startDate ? 'WHERE date >= ?' : ''}
      ${startDate && endDate ? 'AND date <= ?' : endDate ? 'WHERE date <= ?' : ''}
      GROUP BY category
    `, startDate && endDate ? [startDate, endDate] : startDate ? [startDate] : endDate ? [endDate] : []);

    const totals = {
      ingredients: 0,
      utilities: 0,
      salaries: 0,
      rent: 0,
      equipment: 0,
      marketing: 0,
      transport: 0,
      maintenance: 0,
      other: 0
    };

    categoryTotals.forEach(ct => {
      totals[ct.category] = parseFloat(ct.total);
    });

    const grandTotal = Object.values(totals).reduce((sum, val) => sum + val, 0);

    res.json({
      success: true,
      count: expenses.length,
      totals,
      grandTotal,
      data: expenses.map(e => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category,
        amount: parseFloat(e.amount),
        paymentMethod: e.payment_method,
        notes: e.notes,
        addedBy: e.added_by,
        createdAt: e.created_at
      }))
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/expenses/summary
// @desc    Get expense summary for dashboard
// @access  Private/Admin
router.get('/summary', protect, adminOnly, async (req, res) => {
  try {
    // This month's expenses
    const [monthExpenses] = await db.query(`
      SELECT category, SUM(amount) as total
      FROM expenses
      WHERE MONTH(date) = MONTH(CURRENT_DATE()) AND YEAR(date) = YEAR(CURRENT_DATE())
      GROUP BY category
    `);

    // Last 6 months trend
    const [monthlyTrend] = await db.query(`
      SELECT 
        DATE_FORMAT(date, '%Y-%m') as month,
        SUM(amount) as total
      FROM expenses
      WHERE date >= DATE_SUB(CURRENT_DATE(), INTERVAL 6 MONTH)
      GROUP BY DATE_FORMAT(date, '%Y-%m')
      ORDER BY month ASC
    `);

    res.json({
      success: true,
      data: {
        byCategory: monthExpenses,
        monthlyTrend
      }
    });
  } catch (error) {
    console.error('Get expense summary error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/expenses/:id
// @desc    Get single expense
// @access  Private/Admin
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const [expenses] = await db.query('SELECT * FROM expenses WHERE id = ?', [req.params.id]);

    if (expenses.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    const e = expenses[0];
    res.json({
      success: true,
      data: {
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category,
        amount: parseFloat(e.amount),
        paymentMethod: e.payment_method,
        notes: e.notes,
        addedBy: e.added_by,
        createdAt: e.created_at
      }
    });
  } catch (error) {
    console.error('Get expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/expenses
// @desc    Create new expense
// @access  Private/Admin
router.post('/', protect, adminOnly, [
  body('date').notEmpty().withMessage('Date is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('category').isIn(['ingredients', 'utilities', 'salaries', 'rent', 'equipment', 'marketing', 'transport', 'maintenance', 'other']).withMessage('Invalid category'),
  body('amount').isNumeric().withMessage('Amount must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { date, description, category, amount, paymentMethod, notes } = req.body;
    const addedBy = `${req.user.first_name} ${req.user.last_name}`;

    const [result] = await db.query(
      `INSERT INTO expenses (date, description, category, amount, payment_method, notes, added_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, description, category, amount, paymentMethod || 'cash', notes || null, addedBy]
    );

    res.status(201).json({
      success: true,
      message: 'Expense created successfully',
      data: {
        id: result.insertId,
        date,
        description,
        category,
        amount,
        paymentMethod: paymentMethod || 'cash',
        notes,
        addedBy
      }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { date, description, category, amount, paymentMethod, notes } = req.body;

    const [existing] = await db.query('SELECT id FROM expenses WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    await db.query(
      `UPDATE expenses SET
        date = COALESCE(?, date),
        description = COALESCE(?, description),
        category = COALESCE(?, category),
        amount = COALESCE(?, amount),
        payment_method = COALESCE(?, payment_method),
        notes = COALESCE(?, notes)
      WHERE id = ?`,
      [date, description, category, amount, paymentMethod, notes, req.params.id]
    );

    res.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM expenses WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Expense not found'
      });
    }

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
