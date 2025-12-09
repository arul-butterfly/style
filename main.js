/* =====================================================
   STYLEVERSE - MAIN FRONTEND JAVASCRIPT
   Works with flat file structure
   ===================================================== */

const API_URL = '/api';

// =====================================================
// STATE
// =====================================================
let products = [];
let cart = [];
let wishlist = [];
let currentProduct = null;

// =====================================================
// INITIALIZATION
// =====================================================

document.addEventListener('DOMContentLoaded', () => {
    loadCart();
    loadWishlist();
    setupEventListeners();
    
    // Determine which page we're on and load appropriate data
    const path = window.location.pathname;
    
    if (path === '/' || path === '/index.html' || path.endsWith('index.html')) {
        loadFeaturedProducts();
    } else if (path.includes('products.html')) {
        loadProducts();
    } else if (path.includes('product-detail.html')) {
        loadProductDetail();
    } else if (path.includes('cart.html')) {
        renderCartPage();
    } else if (path.includes('checkout.html')) {
        // Checkout has its own JS
    }
    
    updateCartUI();
});

function setupEventListeners() {
    // Cart toggle
    document.querySelectorAll('[data-cart-toggle], .cart-toggle, #cartToggle').forEach(btn => {
        btn.addEventListener('click', toggleMiniCart);
    });
    
    // Close mini cart
    document.querySelectorAll('.mini-cart-close, .cart-overlay').forEach(el => {
        el.addEventListener('click', closeMiniCart);
    });
    
    // Mobile menu
    const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
    if (mobileMenuBtn) {
        mobileMenuBtn.addEventListener('click', toggleMobileMenu);
    }
    
    // Search
    const searchForm = document.querySelector('.search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', handleSearch);
    }
}

// =====================================================
// PRODUCTS
// =====================================================

async function loadProducts() {
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const search = params.get('search');
    const sale = params.get('sale');
    const badge = params.get('badge');
    const sort = params.get('sort');
    
    try {
        const queryParams = new URLSearchParams();
        if (category) queryParams.append('category', category);
        if (search) queryParams.append('search', search);
        if (sale) queryParams.append('sale', sale);
        if (badge) queryParams.append('badge', badge);
        if (sort) queryParams.append('sort', sort);
        
        const response = await fetch(`${API_URL}/products?${queryParams}`);
        const data = await response.json();
        products = data.products || data;
        
        renderProductsGrid();
        updatePageTitle(category, search);
    } catch (error) {
        console.error('Failed to load products:', error);
        showEmptyState('products-grid', 'Failed to load products');
    }
}

async function loadFeaturedProducts() {
    try {
        const response = await fetch(`${API_URL}/products?featured=true&limit=8`);
        const data = await response.json();
        products = data.products || data;
        
        renderFeaturedProducts();
    } catch (error) {
        console.error('Failed to load featured products:', error);
    }
}

async function loadProductDetail() {
    const params = new URLSearchParams(window.location.search);
    const productId = params.get('id');
    
    if (!productId) {
        window.location.href = 'products.html';
        return;
    }
    
    try {
        const response = await fetch(`${API_URL}/products/${productId}`);
        if (!response.ok) throw new Error('Product not found');
        
        currentProduct = await response.json();
        renderProductDetail();
    } catch (error) {
        console.error('Failed to load product:', error);
        showToast('Product not found', 'error');
        setTimeout(() => window.location.href = 'products.html', 2000);
    }
}

function renderFeaturedProducts() {
    const container = document.getElementById('featured-products') || document.querySelector('.featured-products-grid');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;grid-column:1/-1;">No featured products yet</p>';
        return;
    }
    
    container.innerHTML = products.slice(0, 8).map(product => createProductCard(product)).join('');
}

function renderProductsGrid() {
    const container = document.getElementById('products-grid') || document.querySelector('.products-grid');
    if (!container) return;
    
    if (products.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#6b7280;grid-column:1/-1;padding:40px;">No products found</p>';
        return;
    }
    
    container.innerHTML = products.map(product => createProductCard(product)).join('');
}

function createProductCard(product) {
    const inWishlist = wishlist.includes(product._id);
    const hasDiscount = product.originalPrice && product.originalPrice > product.price;
    
    return `
        <div class="product-card" data-id="${product._id}">
            <div class="product-image">
                <a href="product-detail.html?id=${product._id}">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/300x400?text=No+Image'}" alt="${product.name}" loading="lazy" onerror="this.src='https://via.placeholder.com/300x400?text=No+Image'">
                </a>
                ${product.badge ? `<span class="product-badge badge-${product.badge.toLowerCase()}">${product.badge}</span>` : ''}
                <div class="product-actions">
                    <button class="action-btn wishlist-btn ${inWishlist ? 'active' : ''}" onclick="toggleWishlist('${product._id}')" title="Add to Wishlist">
                        <i class="fa${inWishlist ? 's' : 'r'} fa-heart"></i>
                    </button>
                    <button class="action-btn quick-view-btn" onclick="quickView('${product._id}')" title="Quick View">
                        <i class="far fa-eye"></i>
                    </button>
                </div>
                <button class="quick-add-btn" onclick="addToCart('${product._id}')">
                    <i class="fas fa-shopping-bag"></i> Add to Cart
                </button>
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand}</span>
                <h3 class="product-title">
                    <a href="product-detail.html?id=${product._id}">${product.name}</a>
                </h3>
                <div class="product-rating">
                    ${generateStars(product.rating || 0)}
                    <span>(${product.reviewCount || 0})</span>
                </div>
                <div class="product-price">
                    <span class="current-price">₹${product.price.toLocaleString()}</span>
                    ${hasDiscount ? `<span class="original-price">₹${product.originalPrice.toLocaleString()}</span>` : ''}
                    ${product.discount ? `<span class="discount-badge">${product.discount}% OFF</span>` : ''}
                </div>
            </div>
        </div>
    `;
}

function renderProductDetail() {
    if (!currentProduct) return;
    
    const product = currentProduct;
    
    // Update page title
    document.title = `${product.name} | StyleVerse`;
    
    // Main image
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) {
        mainImage.src = product.images?.[0] || 'https://via.placeholder.com/600x800?text=No+Image';
    }
    
    // Thumbnails
    const thumbnailsContainer = document.getElementById('product-thumbnails');
    if (thumbnailsContainer && product.images?.length > 1) {
        thumbnailsContainer.innerHTML = product.images.map((img, i) => `
            <img src="${img}" alt="${product.name} ${i+1}" class="${i === 0 ? 'active' : ''}" onclick="changeMainImage('${img}', this)">
        `).join('');
    }
    
    // Product info
    const brandEl = document.getElementById('product-brand');
    const nameEl = document.getElementById('product-name');
    const ratingEl = document.getElementById('product-rating');
    const priceEl = document.getElementById('product-price');
    const descEl = document.getElementById('product-description');
    const stockEl = document.getElementById('product-stock');
    
    if (brandEl) brandEl.textContent = product.brand;
    if (nameEl) nameEl.textContent = product.name;
    if (descEl) descEl.textContent = product.description || 'No description available.';
    
    if (ratingEl) {
        ratingEl.innerHTML = `${generateStars(product.rating || 0)} <span>(${product.reviewCount || 0} reviews)</span>`;
    }
    
    if (priceEl) {
        const hasDiscount = product.originalPrice && product.originalPrice > product.price;
        priceEl.innerHTML = `
            <span class="current-price">₹${product.price.toLocaleString()}</span>
            ${hasDiscount ? `<span class="original-price">₹${product.originalPrice.toLocaleString()}</span>` : ''}
            ${product.discount ? `<span class="discount-badge">${product.discount}% OFF</span>` : ''}
        `;
    }
    
    if (stockEl) {
        if (product.stock > 0) {
            stockEl.innerHTML = `<i class="fas fa-check-circle"></i> In Stock (${product.stock} available)`;
            stockEl.className = 'stock-status in-stock';
        } else {
            stockEl.innerHTML = `<i class="fas fa-times-circle"></i> Out of Stock`;
            stockEl.className = 'stock-status out-of-stock';
        }
    }
    
    // Colors
    const colorsContainer = document.getElementById('product-colors');
    if (colorsContainer && product.colors?.length > 0) {
        colorsContainer.innerHTML = product.colors.map((color, i) => `
            <button class="color-btn ${i === 0 ? 'active' : ''}" 
                    style="background-color: ${color.code}" 
                    data-color="${color.name}"
                    onclick="selectColor(this)"
                    title="${color.name}">
            </button>
        `).join('');
    }
    
    // Sizes
    const sizesContainer = document.getElementById('product-sizes');
    if (sizesContainer && product.sizes?.length > 0) {
        sizesContainer.innerHTML = product.sizes.map((size, i) => `
            <button class="size-btn ${i === 0 ? 'active' : ''}" data-size="${size}" onclick="selectSize(this)">${size}</button>
        `).join('');
    }
}

function changeMainImage(src, thumb) {
    const mainImage = document.getElementById('main-product-image');
    if (mainImage) mainImage.src = src;
    
    document.querySelectorAll('#product-thumbnails img').forEach(img => img.classList.remove('active'));
    if (thumb) thumb.classList.add('active');
}

function selectColor(btn) {
    document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function selectSize(btn) {
    document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
}

function generateStars(rating) {
    const fullStars = Math.floor(rating);
    const halfStar = rating % 1 >= 0.5;
    const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);
    
    return `
        ${'<i class="fas fa-star"></i>'.repeat(fullStars)}
        ${halfStar ? '<i class="fas fa-star-half-alt"></i>' : ''}
        ${'<i class="far fa-star"></i>'.repeat(emptyStars)}
    `;
}

// =====================================================
// CART
// =====================================================

function loadCart() {
    const saved = localStorage.getItem('cart');
    if (saved) {
        try { cart = JSON.parse(saved); } catch { cart = []; }
    }
}

function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartUI();
}

async function addToCart(productId, quantity = 1, color = null, size = null) {
    let product = products.find(p => p._id === productId);
    
    if (!product) {
        try {
            const response = await fetch(`${API_URL}/products/${productId}`);
            product = await response.json();
        } catch (error) {
            showToast('Failed to add product', 'error');
            return;
        }
    }
    
    // Get selected color/size if on product detail page
    if (!color) {
        const activeColor = document.querySelector('.color-btn.active');
        color = activeColor?.dataset.color || product.colors?.[0]?.name || '';
    }
    
    if (!size) {
        const activeSize = document.querySelector('.size-btn.active');
        size = activeSize?.dataset.size || product.sizes?.[0] || '';
    }
    
    // Get quantity from input if exists
    const qtyInput = document.getElementById('quantity');
    if (qtyInput) {
        quantity = parseInt(qtyInput.value) || 1;
    }
    
    // Check if item already in cart
    const existingIndex = cart.findIndex(item => 
        item.id === productId && item.color === color && item.size === size
    );
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: productId,
            name: product.name,
            brand: product.brand,
            price: product.price,
            image: product.images?.[0] || '',
            color: color,
            colorName: color,
            size: size,
            quantity: quantity
        });
    }
    
    saveCart();
    showToast(`${product.name} added to cart!`);
    openMiniCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    saveCart();
    renderCartPage();
    updateMiniCart();
}

function updateCartQuantity(index, change) {
    cart[index].quantity += change;
    if (cart[index].quantity < 1) cart[index].quantity = 1;
    saveCart();
    renderCartPage();
    updateMiniCart();
}

function setCartQuantity(index, quantity) {
    cart[index].quantity = Math.max(1, parseInt(quantity) || 1);
    saveCart();
    renderCartPage();
}

function clearCart() {
    if (confirm('Are you sure you want to clear your cart?')) {
        cart = [];
        saveCart();
        renderCartPage();
        updateMiniCart();
        showToast('Cart cleared');
    }
}

function updateCartUI() {
    const count = cart.reduce((sum, item) => sum + item.quantity, 0);
    
    document.querySelectorAll('.cart-count, #cart-count').forEach(el => {
        el.textContent = count;
        el.style.display = count > 0 ? 'flex' : 'none';
    });
}

function updateMiniCart() {
    const itemsContainer = document.getElementById('mini-cart-items');
    const subtotalEl = document.getElementById('mini-cart-subtotal');
    const emptyEl = document.getElementById('mini-cart-empty');
    const contentEl = document.getElementById('mini-cart-content');
    
    if (!itemsContainer) return;
    
    if (cart.length === 0) {
        if (emptyEl) emptyEl.style.display = 'block';
        if (contentEl) contentEl.style.display = 'none';
        return;
    }
    
    if (emptyEl) emptyEl.style.display = 'none';
    if (contentEl) contentEl.style.display = 'block';
    
    itemsContainer.innerHTML = cart.map((item, index) => `
        <div class="mini-cart-item">
            <img src="${item.image || 'https://via.placeholder.com/60x70'}" alt="${item.name}">
            <div class="mini-cart-item-info">
                <h4>${item.name}</h4>
                <p>${item.colorName || ''} ${item.size ? '/ ' + item.size : ''}</p>
                <span class="mini-cart-item-price">₹${item.price.toLocaleString()} × ${item.quantity}</span>
            </div>
            <button class="mini-cart-remove" onclick="removeFromCart(${index})">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    if (subtotalEl) subtotalEl.textContent = '₹' + subtotal.toLocaleString();
}

function renderCartPage() {
    const container = document.getElementById('cart-items');
    if (!container) return;
    
    if (cart.length === 0) {
        container.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-bag"></i>
                <h2>Your cart is empty</h2>
                <p>Looks like you haven't added anything to your cart yet.</p>
                <a href="products.html" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        updateCartTotals();
        return;
    }
    
    container.innerHTML = cart.map((item, index) => `
        <div class="cart-item">
            <div class="cart-item-image">
                <img src="${item.image || 'https://via.placeholder.com/100x120'}" alt="${item.name}">
            </div>
            <div class="cart-item-details">
                <h3 class="cart-item-name">${item.name}</h3>
                <p class="cart-item-brand">${item.brand || ''}</p>
                <p class="cart-item-variant">${item.colorName || ''} ${item.size ? '/ ' + item.size : ''}</p>
                <p class="cart-item-price">₹${item.price.toLocaleString()}</p>
            </div>
            <div class="cart-item-quantity">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, -1)">-</button>
                <input type="number" value="${item.quantity}" min="1" onchange="setCartQuantity(${index}, this.value)">
                <button class="qty-btn" onclick="updateCartQuantity(${index}, 1)">+</button>
            </div>
            <div class="cart-item-total">
                <span>₹${(item.price * item.quantity).toLocaleString()}</span>
            </div>
            <button class="cart-item-remove" onclick="removeFromCart(${index})">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `).join('');
    
    updateCartTotals();
}

function updateCartTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const shipping = subtotal >= 999 ? 0 : 99;
    const tax = Math.round(subtotal * 0.18);
    const total = subtotal + shipping + tax;
    
    const subtotalEl = document.getElementById('cart-subtotal');
    const shippingEl = document.getElementById('cart-shipping');
    const taxEl = document.getElementById('cart-tax');
    const totalEl = document.getElementById('cart-total');
    const progressEl = document.getElementById('shipping-progress');
    const progressTextEl = document.getElementById('shipping-progress-text');
    
    if (subtotalEl) subtotalEl.textContent = '₹' + subtotal.toLocaleString();
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : '₹' + shipping;
    if (taxEl) taxEl.textContent = '₹' + tax.toLocaleString();
    if (totalEl) totalEl.textContent = '₹' + total.toLocaleString();
    
    // Shipping progress
    if (progressEl) {
        const progress = Math.min((subtotal / 999) * 100, 100);
        progressEl.style.width = progress + '%';
    }
    if (progressTextEl) {
        if (subtotal >= 999) {
            progressTextEl.innerHTML = '<i class="fas fa-check-circle"></i> You qualify for FREE shipping!';
        } else {
            const remaining = 999 - subtotal;
            progressTextEl.textContent = `Add ₹${remaining.toLocaleString()} more for FREE shipping`;
        }
    }
}

// =====================================================
// MINI CART
// =====================================================

function toggleMiniCart() {
    const miniCart = document.getElementById('mini-cart') || document.querySelector('.mini-cart');
    const overlay = document.getElementById('cart-overlay') || document.querySelector('.cart-overlay');
    
    if (miniCart) {
        miniCart.classList.toggle('active');
        updateMiniCart();
    }
    if (overlay) overlay.classList.toggle('active');
    document.body.classList.toggle('cart-open');
}

function openMiniCart() {
    const miniCart = document.getElementById('mini-cart') || document.querySelector('.mini-cart');
    const overlay = document.getElementById('cart-overlay') || document.querySelector('.cart-overlay');
    
    if (miniCart) {
        miniCart.classList.add('active');
        updateMiniCart();
    }
    if (overlay) overlay.classList.add('active');
    document.body.classList.add('cart-open');
}

function closeMiniCart() {
    const miniCart = document.getElementById('mini-cart') || document.querySelector('.mini-cart');
    const overlay = document.getElementById('cart-overlay') || document.querySelector('.cart-overlay');
    
    if (miniCart) miniCart.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.classList.remove('cart-open');
}

// =====================================================
// WISHLIST
// =====================================================

function loadWishlist() {
    const saved = localStorage.getItem('wishlist');
    if (saved) {
        try { wishlist = JSON.parse(saved); } catch { wishlist = []; }
    }
}

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist');
    } else {
        wishlist.push(productId);
        showToast('Added to wishlist');
    }
    
    localStorage.setItem('wishlist', JSON.stringify(wishlist));
    
    // Update button state
    document.querySelectorAll(`.wishlist-btn[onclick*="${productId}"]`).forEach(btn => {
        btn.classList.toggle('active', wishlist.includes(productId));
        btn.innerHTML = `<i class="fa${wishlist.includes(productId) ? 's' : 'r'} fa-heart"></i>`;
    });
}

// =====================================================
// QUICK VIEW
// =====================================================

async function quickView(productId) {
    let product = products.find(p => p._id === productId);
    
    if (!product) {
        try {
            const response = await fetch(`${API_URL}/products/${productId}`);
            product = await response.json();
        } catch {
            showToast('Failed to load product', 'error');
            return;
        }
    }
    
    // Create modal
    const modal = document.createElement('div');
    modal.className = 'quick-view-modal';
    modal.innerHTML = `
        <div class="quick-view-overlay" onclick="closeQuickView()"></div>
        <div class="quick-view-content">
            <button class="quick-view-close" onclick="closeQuickView()">&times;</button>
            <div class="quick-view-grid">
                <div class="quick-view-image">
                    <img src="${product.images?.[0] || 'https://via.placeholder.com/400x500'}" alt="${product.name}">
                </div>
                <div class="quick-view-info">
                    <span class="product-brand">${product.brand}</span>
                    <h2>${product.name}</h2>
                    <div class="product-rating">${generateStars(product.rating || 0)} <span>(${product.reviewCount || 0})</span></div>
                    <div class="product-price">
                        <span class="current-price">₹${product.price.toLocaleString()}</span>
                        ${product.originalPrice ? `<span class="original-price">₹${product.originalPrice.toLocaleString()}</span>` : ''}
                    </div>
                    <p class="product-description">${product.description || 'No description available.'}</p>
                    <div class="quick-view-actions">
                        <button class="btn btn-primary" onclick="addToCart('${product._id}'); closeQuickView();">
                            <i class="fas fa-shopping-bag"></i> Add to Cart
                        </button>
                        <a href="product-detail.html?id=${product._id}" class="btn btn-outline">View Details</a>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => modal.classList.add('active'), 10);
}

function closeQuickView() {
    const modal = document.querySelector('.quick-view-modal');
    if (modal) {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.remove();
            document.body.style.overflow = '';
        }, 300);
    }
}

// =====================================================
// UTILITY FUNCTIONS
// =====================================================

function showToast(message, type = 'success') {
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;
    toast.innerHTML = `
        <i class="fas fa-${type === 'error' ? 'times-circle' : 'check-circle'}"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function toggleMobileMenu() {
    const nav = document.querySelector('.main-nav');
    if (nav) nav.classList.toggle('active');
}

function handleSearch(e) {
    e.preventDefault();
    const input = e.target.querySelector('input');
    const query = input.value.trim();
    if (query) {
        window.location.href = `products.html?search=${encodeURIComponent(query)}`;
    }
}

function updatePageTitle(category, search) {
    const titleEl = document.querySelector('.page-title h1');
    if (titleEl) {
        if (search) {
            titleEl.textContent = `Search: "${search}"`;
        } else if (category) {
            titleEl.textContent = category.charAt(0).toUpperCase() + category.slice(1);
        }
    }
}

function showEmptyState(containerId, message) {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `<p style="text-align:center;color:#6b7280;padding:40px;">${message}</p>`;
    }
}

// =====================================================
// PRODUCT DETAIL PAGE FUNCTIONS
// =====================================================

function incrementQuantity() {
    const input = document.getElementById('quantity');
    if (input) input.value = parseInt(input.value) + 1;
}

function decrementQuantity() {
    const input = document.getElementById('quantity');
    if (input && parseInt(input.value) > 1) {
        input.value = parseInt(input.value) - 1;
    }
}

function addCurrentProductToCart() {
    if (currentProduct) {
        addToCart(currentProduct._id);
    }
}

// =====================================================
// ADDITIONAL STYLES (Injected)
// =====================================================

const additionalStyles = document.createElement('style');
additionalStyles.textContent = `
    .toast-notification {
        position: fixed;
        bottom: 20px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #1f2937;
        color: white;
        padding: 14px 24px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        gap: 10px;
        z-index: 10000;
        opacity: 0;
        transition: all 0.3s ease;
        box-shadow: 0 10px 40px rgba(0,0,0,0.2);
    }
    .toast-notification.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
    .toast-notification.success { background: #059669; }
    .toast-notification.error { background: #dc2626; }
    
    .quick-view-modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 9999;
        opacity: 0;
        visibility: hidden;
        transition: all 0.3s ease;
    }
    .quick-view-modal.active {
        opacity: 1;
        visibility: visible;
    }
    .quick-view-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.6);
    }
    .quick-view-content {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 20px;
        max-width: 900px;
        width: 90%;
        max-height: 90vh;
        overflow: auto;
        padding: 30px;
    }
    .quick-view-close {
        position: absolute;
        top: 15px;
        right: 20px;
        background: none;
        border: none;
        font-size: 28px;
        cursor: pointer;
        color: #6b7280;
    }
    .quick-view-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
    }
    @media (max-width: 768px) {
        .quick-view-grid { grid-template-columns: 1fr; }
    }
    .quick-view-image img {
        width: 100%;
        border-radius: 12px;
    }
    .quick-view-info h2 {
        font-size: 24px;
        margin: 10px 0;
    }
    .quick-view-actions {
        display: flex;
        gap: 10px;
        margin-top: 20px;
    }
`;
document.head.appendChild(additionalStyles);