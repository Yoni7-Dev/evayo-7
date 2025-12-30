/**
 * Employees Routes
 * CRUD operations for employees
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private/Admin
router.get('/', protect, adminOnly, async (req, res) => {
  try {
    const { status, role, search } = req.query;
    
    let query = 'SELECT * FROM employees WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (role) {
      query += ' AND role = ?';
      params.push(role);
    }

    if (search) {
      query += ' AND (first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)';
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    const [employees] = await db.query(query, params);

    // Calculate stats
    const totalEmployees = employees.length;
    const activeEmployees = employees.filter(e => e.status === 'active').length;
    const totalSalaries = employees.reduce((sum, e) => sum + parseFloat(e.salary), 0);

    res.json({
      success: true,
      count: totalEmployees,
      stats: {
        total: totalEmployees,
        active: activeEmployees,
        totalSalaries
      },
      data: employees.map(e => ({
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        phone: e.phone,
        role: e.role,
        salary: parseFloat(e.salary),
        startDate: e.start_date,
        status: e.status,
        createdAt: e.created_at
      }))
    });
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee
// @access  Private/Admin
router.get('/:id', protect, adminOnly, async (req, res) => {
  try {
    const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [req.params.id]);

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    const e = employees[0];
    res.json({
      success: true,
      data: {
        id: e.id,
        firstName: e.first_name,
        lastName: e.last_name,
        email: e.email,
        phone: e.phone,
        role: e.role,
        salary: parseFloat(e.salary),
        startDate: e.start_date,
        status: e.status,
        createdAt: e.created_at
      }
    });
  } catch (error) {
    console.error('Get employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/employees
// @desc    Create new employee
// @access  Private/Admin
router.post('/', protect, adminOnly, [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('role').isIn(['baker', 'cashier', 'delivery', 'manager', 'admin']).withMessage('Invalid role'),
  body('salary').isNumeric().withMessage('Salary must be a number'),
  body('startDate').notEmpty().withMessage('Start date is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, phone, role, salary, startDate, status } = req.body;

    // Check if email exists
    const [existing] = await db.query('SELECT id FROM employees WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already exists'
      });
    }

    const [result] = await db.query(
      `INSERT INTO employees (first_name, last_name, email, phone, role, salary, start_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [firstName, lastName, email, phone || null, role, salary, startDate, status || 'active']
    );

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: {
        id: result.insertId,
        firstName,
        lastName,
        email,
        phone,
        role,
        salary,
        startDate,
        status: status || 'active'
      }
    });
  } catch (error) {
    console.error('Create employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, salary, startDate, status } = req.body;

    const [existing] = await db.query('SELECT id FROM employees WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    // Check email uniqueness (excluding current employee)
    if (email) {
      const [emailCheck] = await db.query(
        'SELECT id FROM employees WHERE email = ? AND id != ?',
        [email, req.params.id]
      );
      if (emailCheck.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }

    await db.query(
      `UPDATE employees SET
        first_name = COALESCE(?, first_name),
        last_name = COALESCE(?, last_name),
        email = COALESCE(?, email),
        phone = COALESCE(?, phone),
        role = COALESCE(?, role),
        salary = COALESCE(?, salary),
        start_date = COALESCE(?, start_date),
        status = COALESCE(?, status)
      WHERE id = ?`,
      [firstName, lastName, email, phone, role, salary, startDate, status, req.params.id]
    );

    res.json({
      success: true,
      message: 'Employee updated successfully'
    });
  } catch (error) {
    console.error('Update employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM employees WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({
        success: false,
        message: 'Employee not found'
      });
    }

    res.json({
      success: true,
      message: 'Employee deleted successfully'
    });
  } catch (error) {
    console.error('Delete employee error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
