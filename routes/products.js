/**
 * Products Routes
 * CRUD operations for products
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { protect, adminOnly } = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products
// @access  Public
router.get('/', async (req, res) => {
  try {
    const { category, search, sort } = req.query;
    
    let query = 'SELECT * FROM products WHERE is_available = TRUE';
    const params = [];

    if (category && category !== 'all') {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (name LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Sorting
    switch (sort) {
      case 'price_low':
        query += ' ORDER BY price ASC';
        break;
      case 'price_high':
        query += ' ORDER BY price DESC';
        break;
      case 'rating':
        query += ' ORDER BY rating DESC';
        break;
      case 'newest':
        query += ' ORDER BY created_at DESC';
        break;
      default:
        query += ' ORDER BY id ASC';
    }

    const [products] = await db.query(query, params);

    res.json({
      success: true,
      count: products.length,
      data: products.map(p => ({
        id: p.id,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price),
        discount: p.discount,
        rating: parseFloat(p.rating),
        reviews: p.reviews_count,
        image: p.image_url,
        description: p.description
      }))
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/products/:id
// @desc    Get single product
// @access  Public
router.get('/:id', async (req, res) => {
  try {
    const [products] = await db.query('SELECT * FROM products WHERE id = ?', [req.params.id]);

    if (products.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }

    const p = products[0];
    res.json({
      success: true,
      data: {
        id: p.id,
        name: p.name,
        category: p.category,
        price: parseFloat(p.price),
        discount: p.discount,
        rating: parseFloat(p.rating),
        reviews: p.reviews_count,
        image: p.image_url,
        description: p.description,
        isAvailable: p.is_available
      }
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/products
// @desc    Create new product
// @access  Private/Admin
router.post('/', protect, adminOnly, [
  body('name').notEmpty().withMessage('Product name is required'),
  body('category').isIn(['breads', 'pastries', 'cakes', 'cookies', 'beverages']).withMessage('Invalid category'),
  body('price').isNumeric().withMessage('Price must be a number')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { name, category, price, discount, image, description } = req.body;

    const [result] = await db.query(
      'INSERT INTO products (name, category, price, discount, image_url, description) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, price, discount || 0, image || '', description || '']
    );

    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { id: result.insertId, name, category, price, discount, image, description }
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/products/:id
// @desc    Update product
// @access  Private/Admin
router.put('/:id', protect, adminOnly, async (req, res) => {
  try {
    const { name, category, price, discount, image, description, isAvailable } = req.body;

    const [existing] = await db.query('SELECT id FROM products WHERE id = ?', [req.params.id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    await db.query(
      `UPDATE products SET 
        name = COALESCE(?, name),
        category = COALESCE(?, category),
        price = COALESCE(?, price),
        discount = COALESCE(?, discount),
        image_url = COALESCE(?, image_url),
        description = COALESCE(?, description),
        is_available = COALESCE(?, is_available)
      WHERE id = ?`,
      [name, category, price, discount, image, description, isAvailable, req.params.id]
    );

    res.json({
      success: true,
      message: 'Product updated successfully'
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete product
// @access  Private/Admin
router.delete('/:id', protect, adminOnly, async (req, res) => {
  try {
    const [result] = await db.query('DELETE FROM products WHERE id = ?', [req.params.id]);

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
