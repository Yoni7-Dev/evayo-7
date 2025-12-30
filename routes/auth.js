
// // This code for admin account create only one 
// const express = require('express');
// const router = express.Router();
// const bcrypt = require('bcryptjs');
// const jwt = require('jsonwebtoken')
// const { body, validationResult } = require('express-validator');
// const db = require('../config/database');
// const { protect } = require('../middleware/auth');

// // Generate JWT Token
// const generateToken = (id) => {
//   return jwt.sign({ id }, process.env.JWT_SECRET, {
//     expiresIn: process.env.JWT_EXPIRE || '7d'
//   });
// };

// // @route   POST /api/auth/register
// // @desc    Register a new user
// // @access  Public
// router.post('/register', [
//   body('firstName').notEmpty().withMessage('First name is required'),
//   body('lastName').notEmpty().withMessage('Last name is required'),
//   body('email').isEmail().withMessage('Please enter a valid email'),
//   body('phone').notEmpty().withMessage('Phone number is required'),
//   body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const { firstName, lastName, email, phone, password } = req.body;

//     // Check if user exists
//     const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
//     if (existing.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email already registered'
//       });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create user
//     const [result] = await db.query(
//       'INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
//       [firstName, lastName, email, phone, hashedPassword, 'customer']
//     );

//     const token = generateToken(result.insertId);

//     res.status(201).json({
//       success: true,
//       message: 'Registration successful',
//       data: {
//         id: result.insertId,
//         firstName,
//         lastName,
//         email,
//         phone,
//         role: 'customer',
//         token
//       }
//     });
//   } catch (error) {
//     console.error('Register error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   POST /api/auth/login
// // @desc    Login user
// // @access  Public
// router.post('/login', [
//   body('email').isEmail().withMessage('Please enter a valid email'),
//   body('password').notEmpty().withMessage('Password is required')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const { email, password } = req.body;

//     // Find user
//     const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
//     if (users.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     const user = users[0];

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       });
//     }

//     const token = generateToken(user.id);

//     res.json({
//       success: true,
//       message: 'Login successful',
//       data: {
//         id: user.id,
//         firstName: user.first_name,
//         lastName: user.last_name,
//         email: user.email,
//         phone: user.phone,
//         role: user.role,
//         token
//       }
//     });
//   } catch (error) {
//     console.error('Login error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   GET /api/auth/admin-exists
// // @desc    Check if admin account exists
// // @access  Public
// router.get('/admin-exists', async (req, res) => {
//   try {
//     const [admins] = await db.query('SELECT id FROM users WHERE role = ?', ['admin']);
    
//     res.json({
//       success: true,
//       exists: admins.length > 0
//     });
//   } catch (error) {
//     console.error('Check admin error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error checking admin status' 
//     });
//   }
// });

// // @route   POST /api/auth/admin-create
// // @desc    Create admin account
// // @access  Public (only if no admin exists)
// router.post('/admin-create', [
//   body('firstName').notEmpty().withMessage('First name is required'),
//   body('lastName').notEmpty().withMessage('Last name is required'),
//   body('email').isEmail().withMessage('Please enter a valid email'),
//   body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const { firstName, lastName, email, password } = req.body;

//     // Check if admin already exists (optional security check)
//     const [existingAdmin] = await db.query('SELECT id FROM users WHERE role = ?', ['admin']);
//     if (existingAdmin.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Admin account already exists. Please login instead.'
//       });
//     }

//     // Check if email is already in use
//     const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
//     if (existingUser.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email already registered'
//       });
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10);
//     const hashedPassword = await bcrypt.hash(password, salt);

//     // Create admin user
//     const [result] = await db.query(
//       'INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
//       [firstName, lastName, email, '', hashedPassword, 'admin']
//     );

//     const token = generateToken(result.insertId);

//     res.status(201).json({
//       success: true,
//       message: 'Admin account created successfully',
//       data: {
//         id: result.insertId,
//         firstName,
//         lastName,
//         email,
//         role: 'admin',
//         token
//       }
//     });
//   } catch (error) {
//     console.error('Create admin error:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Server error creating admin account' 
//     });
//   }
// });

// // @route   POST /api/auth/admin-login
// // @desc    Admin login
// // @access  Public
// router.post('/admin-login', [
//   body('email').isEmail().withMessage('Please enter a valid email'),
//   body('password').notEmpty().withMessage('Password is required')
// ], async (req, res) => {
//   try {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ success: false, errors: errors.array() });
//     }

//     const { email, password } = req.body;

//     // Find admin user
//     const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
//     if (users.length === 0) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid admin credentials'
//       });
//     }

//     const user = users[0];

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password);
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid admin credentials'
//       });
//     }

//     const token = generateToken(user.id);

//     res.json({
//       success: true,
//       message: 'Admin login successful',
//       data: {
//         id: user.id,
//         firstName: user.first_name,
//         lastName: user.last_name,
//         email: user.email,
//         role: user.role,
//         token
//       }
//     });
//   } catch (error) {
//     console.error('Admin login error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// // @route   GET /api/auth/me
// // @desc    Get current user
// // @access  Private
// router.get('/me', protect, async (req, res) => {
//   try {
//     const [users] = await db.query(
//       'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = ?',
//       [req.user.id]
//     );

//     if (users.length === 0) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found'
//       });
//     }

//     const user = users[0];
//     res.json({
//       success: true,
//       data: {
//         id: user.id,
//         firstName: user.first_name,
//         lastName: user.last_name,
//         email: user.email,
//         phone: user.phone,
//         role: user.role,
//         createdAt: user.created_at
//       }
//     });
//   } catch (error) {
//     console.error('Get profile error:', error);
//     res.status(500).json({ success: false, message: 'Server error' });
//   }
// });

// module.exports = router;


// The below code for create more than one  admin account 

/**
 * Authentication Routes
 * Register, Login, Get Profile, Admin Management
 */

const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { protect } = require('../middleware/auth');

// Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d'
  });
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, phone, password } = req.body;

    // Check if user exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, phone, hashedPassword, 'customer']
    );

    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        id: result.insertId,
        firstName,
        lastName,
        email,
        phone,
        role: 'customer',
        token
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/admin-exists
// @desc    Check if admin account exists
// @access  Public
router.get('/admin-exists', async (req, res) => {
  try {
    const [admins] = await db.query('SELECT id FROM users WHERE role = ?', ['admin']);
    
    res.json({
      success: true,
      exists: admins.length > 0
    });
  } catch (error) {
    console.error('Check admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error checking admin status' 
    });
  }
});

// @route   POST /api/auth/admin-create
// @desc    Create admin account
// @access  Public (allows multiple admins)
router.post('/admin-create', [
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, password } = req.body;

    // Check if email is already in use
    const [existingUser] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Email already registered'
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create admin user
    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, email, phone, password, role) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName, lastName, email, '', hashedPassword, 'admin']
    );

    const token = generateToken(result.insertId);

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      data: {
        id: result.insertId,
        firstName,
        lastName,
        email,
        role: 'admin',
        token
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Server error creating admin account' 
    });
  }
});

// @route   POST /api/auth/admin-login
// @desc    Admin login
// @access  Public
router.post('/admin-login', [
  body('email').isEmail().withMessage('Please enter a valid email'),
  body('password').notEmpty().withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find admin user
    const [users] = await db.query('SELECT * FROM users WHERE email = ? AND role = ?', [email, 'admin']);
    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const user = users[0];

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid admin credentials'
      });
    }

    const token = generateToken(user.id);

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        role: user.role,
        token
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', protect, async (req, res) => {
  try {
    const [users] = await db.query(
      'SELECT id, first_name, last_name, email, phone, role, created_at FROM users WHERE id = ?',
      [req.user.id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const user = users[0];
    res.json({
      success: true,
      data: {
        id: user.id,
        firstName: user.first_name,
        lastName: user.last_name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: user.created_at
      }
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;