/* =====================================================
   STYLEVERSE E-COMMERCE - BACKEND SERVER
   Works with FLAT file structure (all files in root)
   ===================================================== */

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// =====================================================
// CONFIGURATION
// =====================================================
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/styleverse';
const JWT_SECRET = process.env.JWT_SECRET || 'styleverse-secret-key-2025';

// Razorpay Configuration (Get keys from https://dashboard.razorpay.com)
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_test_RpBhlIlEdxdQkX';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'ObIbdPXPfjEGRSi1ooxnWgQ6';

// Try to load Razorpay (optional - works without it in demo mode)
let razorpay = null;
try {
    const Razorpay = require('razorpay');
    razorpay = new Razorpay({
        key_id: RAZORPAY_KEY_ID,
        key_secret: RAZORPAY_KEY_SECRET
    });
    console.log('✅ Razorpay initialized');
} catch (e) {
    console.log('⚠️ Razorpay not installed - running in demo mode');
}

// =====================================================
// MIDDLEWARE
// =====================================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from SAME directory (flat structure)
app.use(express.static(__dirname));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Create uploads directory if not exists
if (!fs.existsSync(path.join(__dirname, 'uploads'))) {
    fs.mkdirSync(path.join(__dirname, 'uploads'), { recursive: true });
}

// =====================================================
// SERVE HTML PAGES
// =====================================================

// Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Admin Panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Other pages (optional - static middleware handles these)
app.get('/products', (req, res) => {
    res.sendFile(path.join(__dirname, 'products.html'));
});

app.get('/cart', (req, res) => {
    res.sendFile(path.join(__dirname, 'cart.html'));
});

app.get('/checkout', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});

// =====================================================
// MONGODB SCHEMAS
// =====================================================

// User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    addresses: [{
        name: String,
        street: String,
        city: String,
        state: String,
        zip: String,
        country: String,
        isDefault: Boolean
    }],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
    createdAt: { type: Date, default: Date.now },
    lastLogin: { type: Date }
});

// Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    brand: { type: String, required: true },
    description: { type: String },
    category: { type: String, required: true },
    subcategory: { type: String },
    price: { type: Number, required: true },
    originalPrice: { type: Number },
    discount: { type: Number, default: 0 },
    images: [{ type: String }],
    colors: [{ name: String, code: String }],
    sizes: [{ type: String }],
    stock: { type: Number, default: 0 },
    rating: { type: Number, default: 4.5 },
    reviewCount: { type: Number, default: 0 },
    badge: { type: String, default: '' },
    featured: { type: Boolean, default: false },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Order Schema
const orderSchema = new mongoose.Schema({
    orderNumber: { type: String, required: true, unique: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    guestEmail: { type: String },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        name: String,
        price: Number,
        quantity: Number,
        color: String,
        size: String,
        image: String
    }],
    subtotal: { type: Number, required: true },
    shipping: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, required: true },
    shippingAddress: {
        name: String,
        email: String,
        phone: String,
        street: String,
        apartment: String,
        city: String,
        state: String,
        zip: String,
        country: String
    },
    shippingMethod: { type: String },
    paymentMethod: { type: String },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'refunded'], default: 'pending' },
    orderStatus: { type: String, enum: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'], default: 'pending' },
    paymentDetails: {
        razorpay_order_id: String,
        razorpay_payment_id: String,
        razorpay_signature: String,
        paidAt: Date
    },
    trackingNumber: { type: String },
    notes: { type: String },
    couponCode: { type: String },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Coupon Schema
const couponSchema = new mongoose.Schema({
    code: { type: String, required: true, unique: true },
    description: { type: String },
    type: { type: String, enum: ['percentage', 'fixed'], default: 'percentage' },
    value: { type: Number, required: true },
    minPurchase: { type: Number, default: 0 },
    maxDiscount: { type: Number },
    usageLimit: { type: Number },
    usedCount: { type: Number, default: 0 },
    startDate: { type: Date },
    endDate: { type: Date },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    description: { type: String },
    image: { type: String },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});

// Create Models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Order = mongoose.model('Order', orderSchema);
const Coupon = mongoose.model('Coupon', couponSchema);
const Category = mongoose.model('Category', categorySchema);

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function generateOrderNumber() {
    const prefix = 'SV';
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// =====================================================
// AUTH ROUTES
// =====================================================

// Register
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'Email already registered' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        res.status(201).json({
            message: 'Registration successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Login
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }
        
        user.lastLogin = new Date();
        await user.save();
        
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
        
        res.json({
            message: 'Login successful',
            token,
            user: { id: user._id, name: user.name, email: user.email, role: user.role }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// PRODUCT ROUTES
// =====================================================

// Get all products
app.get('/api/products', async (req, res) => {
    try {
        const { category, featured, sale, search, badge, sort, page = 1, limit = 50 } = req.query;
        
        let query = { active: true };
        
        if (category) query.category = { $regex: new RegExp(category, 'i') };
        if (featured === 'true') query.featured = true;
        if (sale === 'true') query.discount = { $gt: 0 };
        if (badge) query.badge = { $regex: new RegExp(badge, 'i') };
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { brand: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }
        
        let sortOption = { createdAt: -1 };
        switch (sort) {
            case 'price-low': sortOption = { price: 1 }; break;
            case 'price-high': sortOption = { price: -1 }; break;
            case 'newest': sortOption = { createdAt: -1 }; break;
            case 'rating': sortOption = { rating: -1 }; break;
            case 'name-az': sortOption = { name: 1 }; break;
            case 'name-za': sortOption = { name: -1 }; break;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const products = await Product.find(query)
            .sort(sortOption)
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Product.countDocuments(query);
        
        res.json({
            products,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single product
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json(product);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create product
app.post('/api/products', async (req, res) => {
    try {
        const productData = req.body;
        
        // Handle sizes
        if (typeof productData.sizes === 'string') {
            try { productData.sizes = JSON.parse(productData.sizes); } catch { }
        }
        if (!Array.isArray(productData.sizes)) {
            productData.sizes = productData.sizes ? [productData.sizes] : [];
        }
        
        // Handle images
        if (!Array.isArray(productData.images)) {
            productData.images = productData.images ? [productData.images] : [];
        }
        
        const product = new Product(productData);
        await product.save();
        
        res.status(201).json({ message: 'Product created', product });
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update product
app.put('/api/products/:id', async (req, res) => {
    try {
        const productData = req.body;
        
        if (typeof productData.sizes === 'string') {
            try { productData.sizes = JSON.parse(productData.sizes); } catch { }
        }
        if (!Array.isArray(productData.sizes)) {
            productData.sizes = productData.sizes ? [productData.sizes] : [];
        }
        if (!Array.isArray(productData.images)) {
            productData.images = productData.images ? [productData.images] : [];
        }
        
        productData.updatedAt = new Date();
        
        const product = await Product.findByIdAndUpdate(req.params.id, productData, { new: true });
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        
        res.json({ message: 'Product updated', product });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete product
app.delete('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findByIdAndDelete(req.params.id);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }
        res.json({ message: 'Product deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// CATEGORY ROUTES
// =====================================================

// Get all categories
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find({ active: true }).sort({ order: 1, name: 1 });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create category
app.post('/api/categories', async (req, res) => {
    try {
        const category = new Category(req.body);
        await category.save();
        res.status(201).json({ message: 'Category created', category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update category
app.put('/api/categories/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category updated', category });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete category
app.delete('/api/categories/:id', async (req, res) => {
    try {
        const category = await Category.findByIdAndDelete(req.params.id);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }
        res.json({ message: 'Category deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// PAYMENT ROUTES (Razorpay)
// =====================================================

// Create payment order
app.post('/api/payment/create-order', async (req, res) => {
    try {
        const { amount, currency = 'INR', receipt } = req.body;
        
        if (razorpay) {
            // Real Razorpay order
            const options = {
                amount: Math.round(amount * 100),
                currency,
                receipt: receipt || `order_${Date.now()}`
            };
            const order = await razorpay.orders.create(options);
            res.json({ success: true, order, key_id: RAZORPAY_KEY_ID });
        } else {
            // Demo mode - fake order
            const demoOrder = {
                id: 'order_demo_' + Date.now(),
                amount: Math.round(amount * 100),
                currency,
                receipt: receipt || `order_${Date.now()}`,
                status: 'created'
            };
            res.json({ success: true, order: demoOrder, key_id: 'rzp_test_demo', demo: true });
        }
    } catch (error) {
        console.error('Payment order error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verify payment
app.post('/api/payment/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body;
        
        // In production, verify signature here
        // For now, accept all payments
        
        // Create order
        orderData.orderNumber = generateOrderNumber();
        orderData.paymentStatus = 'paid';
        orderData.orderStatus = 'confirmed';
        orderData.paymentDetails = {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            paidAt: new Date()
        };
        
        const order = new Order(orderData);
        await order.save();
        
        // Update stock
        for (const item of orderData.items || []) {
            if (item.product) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
            }
        }
        
        // Update coupon usage
        if (orderData.couponCode) {
            await Coupon.findOneAndUpdate({ code: orderData.couponCode }, { $inc: { usedCount: 1 } });
        }
        
        res.json({ success: true, message: 'Payment verified', order });
    } catch (error) {
        console.error('Payment verify error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Razorpay key
app.get('/api/payment/key', (req, res) => {
    res.json({ key_id: RAZORPAY_KEY_ID });
});

// =====================================================
// ORDER ROUTES
// =====================================================

// Create order (for COD or direct orders)
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        orderData.orderNumber = generateOrderNumber();
        
        const order = new Order(orderData);
        await order.save();
        
        // Update stock
        for (const item of orderData.items || []) {
            if (item.product) {
                await Product.findByIdAndUpdate(item.product, { $inc: { stock: -item.quantity } });
            }
        }
        
        res.status(201).json({ message: 'Order placed', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get single order
app.get('/api/orders/:id', async (req, res) => {
    try {
        const order = await Order.findById(req.params.id).populate('user', 'name email');
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Track order by order number
app.get('/api/orders/track/:orderNumber', async (req, res) => {
    try {
        const order = await Order.findOne({ orderNumber: req.params.orderNumber });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get all orders (Admin)
app.get('/api/admin/orders', async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        
        let query = {};
        if (status && status !== 'all') {
            query.orderStatus = status;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const orders = await Order.find(query)
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await Order.countDocuments(query);
        
        res.json({
            orders,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update order (Admin)
app.put('/api/admin/orders/:id', async (req, res) => {
    try {
        const { orderStatus, paymentStatus, trackingNumber, notes } = req.body;
        
        const updateData = { updatedAt: new Date() };
        if (orderStatus) updateData.orderStatus = orderStatus;
        if (paymentStatus) updateData.paymentStatus = paymentStatus;
        if (trackingNumber) updateData.trackingNumber = trackingNumber;
        if (notes) updateData.notes = notes;
        
        const order = await Order.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        res.json({ message: 'Order updated', order });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// USER/CUSTOMER ROUTES (Admin)
// =====================================================

// Get all users
app.get('/api/admin/users', async (req, res) => {
    try {
        const { page = 1, limit = 20, search } = req.query;
        
        let query = {};
        if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } }
            ];
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
        
        const total = await User.countDocuments(query);
        
        res.json({
            users,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / parseInt(limit)),
                total
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete user
app.delete('/api/admin/users/:id', async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// COUPON ROUTES
// =====================================================

// Validate coupon (Frontend)
app.post('/api/coupons/validate', async (req, res) => {
    try {
        const { code, cartTotal } = req.body;
        
        const coupon = await Coupon.findOne({ code: code.toUpperCase(), active: true });
        
        if (!coupon) {
            return res.json({ valid: false, error: 'Invalid coupon code' });
        }
        
        // Check dates
        const now = new Date();
        if (coupon.startDate && now < coupon.startDate) {
            return res.json({ valid: false, error: 'Coupon not yet active' });
        }
        if (coupon.endDate && now > coupon.endDate) {
            return res.json({ valid: false, error: 'Coupon has expired' });
        }
        
        // Check usage limit
        if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
            return res.json({ valid: false, error: 'Coupon usage limit reached' });
        }
        
        // Check minimum purchase
        if (cartTotal < coupon.minPurchase) {
            return res.json({ valid: false, error: `Minimum purchase of ₹${coupon.minPurchase} required` });
        }
        
        // Calculate discount
        let discount = 0;
        if (coupon.type === 'percentage') {
            discount = Math.round((cartTotal * coupon.value) / 100);
            if (coupon.maxDiscount && discount > coupon.maxDiscount) {
                discount = coupon.maxDiscount;
            }
        } else {
            discount = coupon.value;
        }
        
        res.json({
            valid: true,
            coupon: {
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                maxDiscount: coupon.maxDiscount
            },
            discount
        });
    } catch (error) {
        res.status(500).json({ valid: false, error: error.message });
    }
});

// Get all coupons (Admin)
app.get('/api/admin/coupons', async (req, res) => {
    try {
        const coupons = await Coupon.find().sort({ createdAt: -1 });
        res.json(coupons);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create coupon
app.post('/api/admin/coupons', async (req, res) => {
    try {
        const couponData = req.body;
        couponData.code = couponData.code.toUpperCase();
        
        const coupon = new Coupon(couponData);
        await coupon.save();
        
        res.status(201).json({ message: 'Coupon created', coupon });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update coupon
app.put('/api/admin/coupons/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.json({ message: 'Coupon updated', coupon });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Delete coupon
app.delete('/api/admin/coupons/:id', async (req, res) => {
    try {
        const coupon = await Coupon.findByIdAndDelete(req.params.id);
        if (!coupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }
        res.json({ message: 'Coupon deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// DASHBOARD (Admin)
// =====================================================

app.get('/api/admin/dashboard', async (req, res) => {
    try {
        // Stats
        const totalProducts = await Product.countDocuments({ active: true });
        const totalOrders = await Order.countDocuments();
        const totalUsers = await User.countDocuments();
        const pendingOrders = await Order.countDocuments({ orderStatus: 'pending' });
        
        // Revenue
        const revenue = await Order.aggregate([
            { $match: { paymentStatus: 'paid' } },
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        
        // Recent orders
        const recentOrders = await Order.find()
            .populate('user', 'name email')
            .sort({ createdAt: -1 })
            .limit(10);
        
        // Top products
        const topProducts = await Product.find({ active: true })
            .sort({ reviewCount: -1, rating: -1 })
            .limit(5);
        
        res.json({
            stats: {
                totalProducts,
                totalOrders,
                totalUsers,
                pendingOrders,
                totalRevenue: revenue[0]?.total || 0
            },
            recentOrders,
            topProducts
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// SEED DATA (Create sample data)
// =====================================================

app.post('/api/seed', async (req, res) => {
    try {
        // Create admin user
        const adminExists = await User.findOne({ email: 'admin@styleverse.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({
                name: 'Admin',
                email: 'admin@styleverse.com',
                password: hashedPassword,
                role: 'admin'
            });
        }
        
        // Create categories
        const categoriesExist = await Category.countDocuments();
        if (categoriesExist === 0) {
            await Category.insertMany([
                { name: 'Women', slug: 'women', order: 1 },
                { name: 'Men', slug: 'men', order: 2 },
                { name: 'Accessories', slug: 'accessories', order: 3 },
                { name: 'Shoes', slug: 'shoes', order: 4 },
                { name: 'Bags', slug: 'bags', order: 5 }
            ]);
        }
        
        // Create sample products
        const productsExist = await Product.countDocuments();
        if (productsExist === 0) {
            await Product.insertMany([
                {
                    name: 'Elegant Silk Midi Dress',
                    brand: 'StyleVerse',
                    description: 'Beautiful silk blend midi dress perfect for any occasion.',
                    category: 'Women',
                    price: 2999,
                    originalPrice: 4999,
                    discount: 40,
                    images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'],
                    colors: [{ name: 'Navy', code: '#1a1a2e' }, { name: 'Wine', code: '#722f37' }],
                    sizes: ['XS', 'S', 'M', 'L', 'XL'],
                    stock: 50,
                    rating: 4.5,
                    reviewCount: 128,
                    badge: 'Sale',
                    featured: true
                },
                {
                    name: 'Premium Running Sneakers',
                    brand: 'SportMax',
                    description: 'High-performance running shoes with advanced cushioning.',
                    category: 'Shoes',
                    price: 3499,
                    images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'],
                    colors: [{ name: 'Red', code: '#e63946' }, { name: 'Black', code: '#000000' }],
                    sizes: ['38', '39', '40', '41', '42', '43'],
                    stock: 75,
                    rating: 4.8,
                    reviewCount: 256,
                    badge: 'Bestseller',
                    featured: true
                },
                {
                    name: 'Leather Crossbody Bag',
                    brand: 'Luxe',
                    description: 'Genuine leather crossbody bag with adjustable strap.',
                    category: 'Bags',
                    price: 1999,
                    originalPrice: 2999,
                    discount: 33,
                    images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'],
                    colors: [{ name: 'Brown', code: '#8b4513' }, { name: 'Black', code: '#000000' }],
                    sizes: ['One Size'],
                    stock: 30,
                    rating: 4.3,
                    reviewCount: 89,
                    badge: 'Sale',
                    featured: true
                },
                {
                    name: 'Classic Denim Jacket',
                    brand: 'Urban Style',
                    description: 'Timeless denim jacket for everyday wear.',
                    category: 'Men',
                    price: 2499,
                    images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600'],
                    colors: [{ name: 'Blue', code: '#4a90d9' }, { name: 'Black', code: '#1a1a1a' }],
                    sizes: ['S', 'M', 'L', 'XL', 'XXL'],
                    stock: 40,
                    rating: 4.6,
                    reviewCount: 167,
                    badge: 'New',
                    featured: true
                },
                {
                    name: 'Gold Pendant Necklace',
                    brand: 'Jewel Box',
                    description: 'Elegant gold-plated pendant necklace.',
                    category: 'Accessories',
                    price: 899,
                    originalPrice: 1299,
                    discount: 31,
                    images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600'],
                    colors: [{ name: 'Gold', code: '#ffd700' }, { name: 'Silver', code: '#c0c0c0' }],
                    sizes: ['One Size'],
                    stock: 100,
                    rating: 4.4,
                    reviewCount: 203,
                    badge: 'Trending',
                    featured: true
                },
                {
                    name: 'Casual Cotton Shirt',
                    brand: 'ComfortWear',
                    description: 'Soft cotton casual shirt for a relaxed look.',
                    category: 'Men',
                    price: 1299,
                    images: ['https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=600'],
                    colors: [{ name: 'White', code: '#ffffff' }, { name: 'Sky Blue', code: '#87ceeb' }],
                    sizes: ['S', 'M', 'L', 'XL'],
                    stock: 60,
                    rating: 4.2,
                    reviewCount: 94,
                    badge: '',
                    featured: false
                }
            ]);
        }
        
        // Create coupon
        const couponExists = await Coupon.findOne({ code: 'WELCOME20' });
        if (!couponExists) {
            await Coupon.create({
                code: 'WELCOME20',
                description: '20% off for new customers',
                type: 'percentage',
                value: 20,
                minPurchase: 500,
                maxDiscount: 500,
                active: true
            });
        }
        
        res.json({ message: 'Sample data created successfully!' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});


// Also allow GET for easy browser access
app.get('/api/seed', async (req, res) => {
    // Redirect to POST handler
    try {
        // Same logic as POST
        const adminExists = await User.findOne({ email: 'admin@styleverse.com' });
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await User.create({ name: 'Admin', email: 'admin@styleverse.com', password: hashedPassword, role: 'admin' });
        }
        
        const categoriesExist = await Category.countDocuments();
        if (categoriesExist === 0) {
            await Category.insertMany([
                { name: 'Women', slug: 'women', order: 1 },
                { name: 'Men', slug: 'men', order: 2 },
                { name: 'Accessories', slug: 'accessories', order: 3 },
                { name: 'Shoes', slug: 'shoes', order: 4 },
                { name: 'Bags', slug: 'bags', order: 5 }
            ]);
        }
        
        const productsExist = await Product.countDocuments();
        if (productsExist === 0) {
            await Product.insertMany([
                { name: 'Elegant Silk Midi Dress', brand: 'StyleVerse', category: 'Women', price: 2999, originalPrice: 4999, discount: 40, images: ['https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=600'], sizes: ['XS', 'S', 'M', 'L', 'XL'], stock: 50, rating: 4.5, reviewCount: 128, badge: 'Sale', featured: true },
                { name: 'Premium Running Sneakers', brand: 'SportMax', category: 'Shoes', price: 3499, images: ['https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600'], sizes: ['38', '39', '40', '41', '42'], stock: 75, rating: 4.8, reviewCount: 256, badge: 'Bestseller', featured: true },
                { name: 'Leather Crossbody Bag', brand: 'Luxe', category: 'Bags', price: 1999, originalPrice: 2999, images: ['https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=600'], sizes: ['One Size'], stock: 30, rating: 4.3, badge: 'Sale', featured: true },
                { name: 'Classic Denim Jacket', brand: 'Urban Style', category: 'Men', price: 2499, images: ['https://images.unsplash.com/photo-1576995853123-5a10305d93c0?w=600'], sizes: ['S', 'M', 'L', 'XL'], stock: 40, rating: 4.6, badge: 'New', featured: true },
                { name: 'Gold Pendant Necklace', brand: 'Jewel Box', category: 'Accessories', price: 899, images: ['https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?w=600'], sizes: ['One Size'], stock: 100, rating: 4.4, badge: 'Trending', featured: true }
            ]);
        }
        
        const couponExists = await Coupon.findOne({ code: 'WELCOME20' });
        if (!couponExists) {
            await Coupon.create({ code: 'WELCOME20', description: '20% off', type: 'percentage', value: 20, minPurchase: 500, maxDiscount: 500 });
        }
        
        res.json({ message: '✅ Sample data created! Visit /admin to manage your store.' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// =====================================================
// START SERVER
// =====================================================

mongoose.connect(MONGODB_URI)
    .then(() => {
        console.log('✅ Connected to MongoDB');
        
        app.listen(PORT, () => {
            console.log(`\n🚀 Server running on http://localhost:${PORT}`);
            console.log(`📦 Website: http://localhost:${PORT}`);
            console.log(`⚙️  Admin Panel: http://localhost:${PORT}/admin`);
            console.log(`🌱 Seed Data: http://localhost:${PORT}/api/seed`);
            console.log('\n📁 File Structure: FLAT (all files in same folder)\n');
        });
    })
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.log('\n⚠️  Starting server without database...');
        console.log('   Make sure MongoDB is running!\n');
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT} (NO DATABASE)`);
        });
    });
    

module.exports = app;