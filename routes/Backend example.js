// // Example backend implementation (Node.js/Express)
// // Add these routes to your auth controller/routes

// const User = require('../models/User') // Adjust to your model
// const bcrypt = require('bcryptjs')
// const jwt = require('jsonwebtoken')

// // Check if admin account exists
// // GET /api/auth/admin/exists
// const checkAdminExists = async (req, res) => {
//   try {
//     const adminUser = await User.findOne({ 
//       $or: [
//         { role: 'admin' },
//         { isAdmin: true }
//       ]
//     })
    
//     res.json({
//       success: true,
//       exists: !!adminUser
//     })
//   } catch (error) {
//     console.error('Check admin error:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Server error checking admin status'
//     })
//   }
// }

// // Create admin account
// // POST /api/auth/admin/create
// const createAdmin = async (req, res) => {
//   try {
//     const { email, password, firstName, lastName } = req.body

//     // Check if admin already exists (optional - for security)
//     const existingAdmin = await User.findOne({ 
//       $or: [
//         { role: 'admin' },
//         { isAdmin: true }
//       ]
//     })
    
//     if (existingAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: 'Admin account already exists'
//       })
//     }

//     // Check if email is already in use
//     const existingUser = await User.findOne({ email })
//     if (existingUser) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email already registered'
//       })
//     }

//     // Hash password
//     const salt = await bcrypt.genSalt(10)
//     const hashedPassword = await bcrypt.hash(password, salt)

//     // Create admin user
//     const admin = await User.create({
//       email,
//       password: hashedPassword,
//       firstName,
//       lastName,
//       role: 'admin',
//       isAdmin: true
//     })

//     res.status(201).json({
//       success: true,
//       message: 'Admin account created successfully',
//       data: {
//         id: admin._id,
//         email: admin.email,
//         firstName: admin.firstName,
//         lastName: admin.lastName,
//         role: admin.role
//       }
//     })
//   } catch (error) {
//     console.error('Create admin error:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Server error creating admin account'
//     })
//   }
// }

// // Admin login
// // POST /api/auth/admin/login
// const adminLogin = async (req, res) => {
//   try {
//     const { email, password } = req.body

//     // Find user by email
//     const user = await User.findOne({ email }).select('+password')
    
//     if (!user) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       })
//     }

//     // Check if user is admin
//     if (user.role !== 'admin' && !user.isAdmin) {
//       return res.status(403).json({
//         success: false,
//         message: 'Access denied. Admin privileges required.'
//       })
//     }

//     // Check password
//     const isMatch = await bcrypt.compare(password, user.password)
//     if (!isMatch) {
//       return res.status(401).json({
//         success: false,
//         message: 'Invalid credentials'
//       })
//     }

//     // Generate token
//     const token = jwt.sign(
//       { id: user._id, role: user.role },
//       process.env.JWT_SECRET,
//       { expiresIn: '7d' }
//     )

//     res.json({
//       success: true,
//       data: {
//         id: user._id,
//         email: user.email,
//         firstName: user.firstName,
//         lastName: user.lastName,
//         role: user.role,
//         isAdmin: true,
//         token
//       }
//     })
//   } catch (error) {
//     console.error('Admin login error:', error)
//     res.status(500).json({
//       success: false,
//       message: 'Server error during login'
//     })
//   }
// }

// module.exports = {
//   checkAdminExists,
//   createAdmin,
//   adminLogin
// }


// // ============================================
// // Example routes file (routes/auth.js)
// // ============================================


// // const express = require('express')
// // const router = express.Router()
// // const { 
// //   checkAdminExists, 
// //   createAdmin, 
// //   adminLogin 
// // } = require('../controllers/authController')

// // router.get('/admin/exists', checkAdminExists)
// // router.post('/admin/create', createAdmin)
// // router.post('/admin/login', adminLogin)

// // module.exports = router
