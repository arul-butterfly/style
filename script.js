/* =====================================================
   STYLEVERSE E-COMMERCE - COMPLETE WORKING JAVASCRIPT
   ===================================================== */

// =====================================================
// PRODUCT DATA - 12 PRODUCTS
// =====================================================
let products = [];
const API_URL = "/api"; 

async function loadProductsFromServer() {
    try {
        const res = await fetch("/api/products");

        if (!res.ok) {
            throw new Error("API response not OK");
        }

        const data = await res.json();

        if (!data || !data.products || !Array.isArray(data.products)) {
            throw new Error("Invalid API format");
        }

        products = data.products.map(p => ({
            ...p,
            id: p._id,
            category: (p.category || "").toLowerCase(),
            image: (p.images && p.images.length) ? p.images[0] : "https://via.placeholder.com/300",

            colors: Array.isArray(p.colors) && p.colors.length ? p.colors.map(c => c.code) : ["#000000"],
            colorNames: Array.isArray(p.colors) && p.colors.length ? p.colors.map(c => c.name) : ["Default"],
            sizes: Array.isArray(p.sizes) && p.sizes.length ? p.sizes : ["M"],

            rating: p.rating || 4,
            reviews: p.reviewCount || 0,
            discount: p.discount || 0,
            badge: (p.badge || "").toLowerCase(),
            featured: Boolean(p.featured)
        }));

        console.log("✅ PRODUCTS READY:", products.length);

        if (typeof initProductsPage === "function") {
            initProductsPage();
        } else {
            console.error("❌ initProductsPage is undefined");
        }

        if (typeof initHomePage === "function") initHomePage();
        if (typeof initProductDetail === "function") initProductDetail();
        if (typeof updateMiniCart === "function") updateMiniCart();

    } catch (err) {
        console.error("🔥 CRITICAL FRONTEND ERROR:", err);
        alert("JS crashed. Open console now.");
    }
}





// =====================================================
// GLOBAL VARIABLES
// =====================================================
let cart = [];
let wishlist = [];

// =====================================================
// UTILITY FUNCTIONS
// =====================================================
function formatPrice(price) {
    return '₹' + Number(price).toLocaleString();
}


function generateStars(rating) {
    let stars = '';
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    
    for (let i = 0; i < fullStars; i++) {
        stars += '<i class="fas fa-star"></i>';
    }
    if (hasHalf) {
        stars += '<i class="fas fa-star-half-alt"></i>';
    }
    for (let i = fullStars + (hasHalf ? 1 : 0); i < 5; i++) {
        stars += '<i class="far fa-star"></i>';
    }
    return stars;
}

function showToast(message, type) {
    // Remove existing toast
    const existing = document.querySelector('.toast-notification');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    toast.style.cssText = `
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'error' ? '#dc3545' : '#2e8b57'};
        color: white;
        padding: 16px 32px;
        border-radius: 10px;
        font-size: 15px;
        font-weight: 500;
        z-index: 99999;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        animation: toastIn 0.4s ease;
    `;
    toast.innerHTML = `<i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'toastOut 0.4s ease forwards';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Add toast animation styles
const toastStyles = document.createElement('style');
toastStyles.textContent = `
    @keyframes toastIn {
        from { opacity: 0; transform: translateX(-50%) translateY(30px); }
        to { opacity: 1; transform: translateX(-50%) translateY(0); }
    }
    @keyframes toastOut {
        from { opacity: 1; transform: translateX(-50%) translateY(0); }
        to { opacity: 0; transform: translateX(-50%) translateY(30px); }
    }
`;
document.head.appendChild(toastStyles);

// =====================================================
// CART FUNCTIONS
// =====================================================
function initCart() {
    const saved = localStorage.getItem('styleverse_cart');
    if (saved) {
        try {
            cart = JSON.parse(saved);
        } catch (e) {
            cart = [];
        }
    }
    updateCartBadges();
}

function saveCart() {
    localStorage.setItem('styleverse_cart', JSON.stringify(cart));
    updateCartBadges();
}

function addToCart(productId, quantity, selectedColor, selectedSize) {
    const product = products.find(p => String(p.id) === String(productId));

    if (!product) {
        console.error("❌ Add To Cart Failed. Product not found:", productId);
        return;
    }
    
    quantity = quantity || 1;
    selectedColor = selectedColor || product.colors[0];
    selectedSize = selectedSize || product.sizes[0];
    
    const colorIndex = product.colors.indexOf(selectedColor);
    const colorName = product.colorNames[colorIndex] || product.colorNames[0];
    
    // Check if item already exists
    const existingIndex = cart.findIndex(item => 
        item.id === productId && 
        item.color === selectedColor && 
        item.size === selectedSize
    );
    
    if (existingIndex > -1) {
        cart[existingIndex].quantity += quantity;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            brand: product.brand,
            price: product.price,
            originalPrice: product.originalPrice,
            image: product.image,
            color: selectedColor,
            colorName: colorName,
            size: selectedSize,
            quantity: quantity
        });
    }
    
    saveCart();
    updateMiniCart();
    showToast(product.name + ' added to bag!', 'success');
}

function removeFromCart(index) {
    if (index >= 0 && index < cart.length) {
        const item = cart[index];
        cart.splice(index, 1);
        saveCart();
        updateMiniCart();
        renderCartPage();
        showToast(item.name + ' removed from bag', 'success');
    }
}

function updateCartItemQty(index, newQty) {
    if (index >= 0 && index < cart.length) {
        if (newQty <= 0) {
            removeFromCart(index);
        } else if (newQty <= 10) {
            cart[index].quantity = newQty;
            saveCart();
            updateMiniCart();
            renderCartPage();
        }
    }
}

function clearCart() {
    cart = [];
    saveCart();
    updateMiniCart();
    renderCartPage();
    showToast('Cart cleared', 'success');
}

function getCartTotal() {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

function getCartCount() {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
}

function updateCartBadges() {
    const count = getCartCount();
    document.querySelectorAll('.cart-count').forEach(badge => {
        badge.textContent = count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    });
}

function updateMiniCart() {
    const body = document.getElementById('miniCartBody');
    const footer = document.getElementById('miniCartFooter');
    
    if (!body) return;
    
    if (cart.length === 0) {
        body.innerHTML = `
            <div class="empty-mini-cart">
                <i class="fas fa-shopping-bag"></i>
                <p>Your bag is empty</p>
                <a href="products.html" class="btn btn-primary">Start Shopping</a>
            </div>
        `;
        if (footer) footer.style.display = 'none';
    } else {
        let itemsHtml = '';
        cart.forEach((item, index) => {
            itemsHtml += `
                <div class="mini-cart-item">
                    <div class="mini-item-image">
                        <img src="${item.image}" alt="${item.name}">
                    </div>
                    <div class="mini-item-details">
                        <h4>${item.name}</h4>
                        <p class="mini-item-variant">${item.colorName} / ${item.size}</p>
                        <p class="mini-item-price">${formatPrice(item.price)}</p>
                        <div class="mini-item-qty">
                            <button onclick="updateCartItemQty(${index}, ${item.quantity - 1})">-</button>
                            <span>${item.quantity}</span>
                            <button onclick="updateCartItemQty(${index}, ${item.quantity + 1})">+</button>
                            <button class="mini-remove-btn" onclick="removeFromCart(${index})"><i class="fas fa-trash-alt"></i></button>
                        </div>
                    </div>
                </div>
            `;
        });
        body.innerHTML = itemsHtml;
        
        if (footer) {
            footer.style.display = 'block';
            const subtotal = footer.querySelector('.subtotal-amount');
            if (subtotal) subtotal.textContent = formatPrice(getCartTotal());
        }
    }
    
    // Update count text
    document.querySelectorAll('.cart-count-text').forEach(el => {
        el.textContent = `(${getCartCount()} items)`;
    });
}

// =====================================================
// WISHLIST FUNCTIONS
// =====================================================
function initWishlist() {
    const saved = localStorage.getItem('styleverse_wishlist');
    if (saved) {
        try {
            wishlist = JSON.parse(saved);
        } catch (e) {
            wishlist = [];
        }
    }
    updateWishlistBadges();
}

function saveWishlist() {
    localStorage.setItem('styleverse_wishlist', JSON.stringify(wishlist));
    updateWishlistBadges();
}

function toggleWishlist(productId) {
    const index = wishlist.indexOf(productId);
    if (index > -1) {
        wishlist.splice(index, 1);
        showToast('Removed from wishlist', 'success');
    } else {
        wishlist.push(productId);
        showToast('Added to wishlist!', 'success');
    }
    saveWishlist();
    updateWishlistButtons();
}

function isInWishlist(productId) {
    return wishlist.includes(productId);
}

function updateWishlistBadges() {
    document.querySelectorAll('.wishlist-count').forEach(badge => {
        badge.textContent = wishlist.length;
        badge.style.display = wishlist.length > 0 ? 'flex' : 'none';
    });
}

function updateWishlistButtons() {
    document.querySelectorAll('.product-wishlist').forEach(btn => {
        const id = btn.dataset.productId;
        const icon = btn.querySelector('i');
        if (isInWishlist(id)) {
            btn.classList.add('active');
            if (icon) {
                icon.className = 'fas fa-heart';
            }
        } else {
            btn.classList.remove('active');
            if (icon) {
                icon.className = 'far fa-heart';
            }
        }
    });
}

// =====================================================
// PRODUCT CARD RENDERER
// ====================================================
function createProductCard(product) {
    const inWishlist = isInWishlist(product.id);
    
    let badgeHtml = '';
    if (product.badge) {
        const badgeText = product.badge === 'sale' ? `-${product.discount}%` : product.badge;
        badgeHtml = `<span class="product-badge badge-${product.badge}">${badgeText}</span>`;
    }
    
    let priceHtml = `<span class="current-price">${formatPrice(product.price)}</span>`;
    if (product.originalPrice) {
        priceHtml += `<span class="original-price">${formatPrice(product.originalPrice)}</span>`;
    }
    
    return `
        <div class="product-card" data-product-id="${product.id}">
            <div class="product-image">
                <a href="product-detail.html?id=${product.id}">
                    <img src="${product.image}" alt="${product.name}" loading="lazy">
                </a>
                ${badgeHtml}
                <button class="product-wishlist ${inWishlist ? 'active' : ''}" 
    data-product-id="${product.id}" 
    onclick="event.preventDefault(); toggleWishlist('${product.id}'); this.classList.toggle('active'); this.querySelector('i').className = this.classList.contains('active') ? 'fas fa-heart' : 'far fa-heart';">
    
    <i class="${inWishlist ? 'fas' : 'far'} fa-heart"></i>
</button>

<div class="product-overlay">
    <button class="overlay-btn" onclick="event.preventDefault(); openQuickView('${product.id}')">
        <i class="fas fa-eye"></i> Quick View
    </button>

    <button class="overlay-btn" onclick="event.preventDefault(); addToCart('${product.id}')">
        <i class="fas fa-shopping-bag"></i> Add to Bag
    </button>
</div>

                </div>
            </div>
            <div class="product-info">
                <span class="product-brand">${product.brand}</span>
                <h3 class="product-name">
                    <a href="product-detail.html?id=${product.id}">${product.name}</a>
                </h3>
                <div class="product-rating">
                    <div class="stars">${generateStars(product.rating)}</div>
                    <span class="review-count">(${product.reviews})</span>
                </div>
                <div class="product-price">
                    ${priceHtml}
                </div>
            </div>
        </div>
    `;
}

// =====================================================
// PRODUCTS PAGE
// =====================================================
let currentProducts = [];
let currentPage = 1;
const productsPerPage = 12;

function initProductsPage() {
    const grid = document.getElementById('productsGrid');
    if (!grid) return;
    
    console.log('Initializing products page with', products.length, 'products');
    
    // Get URL params for filtering
    const params = new URLSearchParams(window.location.search);
    const category = params.get('category');
    const sale = params.get('sale');
    const newArrivals = params.get('new');
    
    // Filter products
    if (category) {
        currentProducts = products.filter(p => p.category === category);
        updateBreadcrumb(category.charAt(0).toUpperCase() + category.slice(1));
    } else if (sale === 'true') {
        currentProducts = products.filter(p => p.discount > 0);
        updateBreadcrumb('Sale');
    } else if (newArrivals === 'true') {
        currentProducts = products.filter(p => p.badge === 'new');
        updateBreadcrumb('New Arrivals');
    } else {
        currentProducts = [...products];
    }
    
    renderProductsGrid();
    setupFilters();
    setupSort();
    setupViewToggle();
}

function renderProductsGrid() {
    const grid = document.getElementById('productsGrid');
    const noResults = document.getElementById('noResults');
    const resultsCount = document.getElementById('resultsCount');
    
    if (!grid) return;
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * productsPerPage;
    const endIndex = startIndex + productsPerPage;
    const pageProducts = currentProducts.slice(startIndex, endIndex);
    
    if (currentProducts.length === 0) {
        grid.innerHTML = '';
        if (noResults) noResults.style.display = 'block';
        if (resultsCount) resultsCount.textContent = 'No products found';
    } else {
        if (noResults) noResults.style.display = 'none';
        grid.innerHTML = pageProducts.map(p => createProductCard(p)).join('');
        
        if (resultsCount) {
            const start = startIndex + 1;
            const end = Math.min(endIndex, currentProducts.length);
            resultsCount.textContent = `Showing ${start}-${end} of ${currentProducts.length} products`;
        }
    }
    
    renderPagination();
    updateWishlistButtons();
}

function renderPagination() {
    const pagination = document.getElementById('pagination');
    if (!pagination) return;
    
    const totalPages = Math.ceil(currentProducts.length / productsPerPage);
    
    if (totalPages <= 1) {
        pagination.style.display = 'none';
        return;
    }
    
    pagination.style.display = 'flex';
    
    let html = `
        <button class="pagination-btn prev" onclick="changePage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-chevron-left"></i> Previous
        </button>
        <div class="pagination-numbers">
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        html += `<button class="pagination-num ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    
    html += `
        </div>
        <button class="pagination-btn next" onclick="changePage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            Next <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    pagination.innerHTML = html;
}

function changePage(page) {
    const totalPages = Math.ceil(currentProducts.length / productsPerPage);
    if (page < 1 || page > totalPages) return;
    
    currentPage = page;
    renderProductsGrid();
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateBreadcrumb(text) {
    const breadcrumb = document.getElementById('breadcrumbCurrent');
    if (breadcrumb) breadcrumb.textContent = text;
}

function setupFilters() {
    // Category filters
    document.querySelectorAll('input[name="category"]').forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Price filters
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    if (priceMin) priceMin.addEventListener('change', applyFilters);
    if (priceMax) priceMax.addEventListener('change', applyFilters);
    
    // Size filters
    document.querySelectorAll('input[name="size"]').forEach(input => {
        input.addEventListener('change', applyFilters);
    });
    
    // Clear filters
    const clearBtn = document.getElementById('clearAllFilters');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllFilters);
    }
    
    // Mobile filter toggle
    const filterToggle = document.getElementById('filterToggleMobile');
    const filterSidebar = document.getElementById('filterSidebar');
    const filterOverlay = document.getElementById('filterOverlay');
    const filterClose = document.getElementById('filterCloseMobile');
    
    if (filterToggle) {
        filterToggle.onclick = () => {
            filterSidebar?.classList.add('active');
            filterOverlay?.classList.add('active');
            document.body.style.overflow = 'hidden';
        };
    }
    
    if (filterClose) {
        filterClose.onclick = closeFilterSidebar;
    }
    
    if (filterOverlay) {
        filterOverlay.onclick = closeFilterSidebar;
    }
}

function closeFilterSidebar() {
    document.getElementById('filterSidebar')?.classList.remove('active');
    document.getElementById('filterOverlay')?.classList.remove('active');
    document.body.style.overflow = '';
}

function applyFilters() {
    let filtered = [...products];
    
    // Category
    const selectedCategories = Array.from(document.querySelectorAll('input[name="category"]:checked')).map(i => i.value);
    if (selectedCategories.length > 0) {
        filtered = filtered.filter(p => selectedCategories.includes(p.category));
    }
    
    // Price
    const minPrice = parseFloat(document.getElementById('priceMin')?.value) || 0;
    const maxPrice = parseFloat(document.getElementById('priceMax')?.value) || 999;
    filtered = filtered.filter(p => p.price >= minPrice && p.price <= maxPrice);
    
    // Size
    const selectedSizes = Array.from(document.querySelectorAll('input[name="size"]:checked')).map(i => i.value.toUpperCase());
    if (selectedSizes.length > 0) {
        filtered = filtered.filter(p => p.sizes.some(s => selectedSizes.includes(s.toUpperCase())));
    }
    
    currentProducts = filtered;
    currentPage = 1;
    renderProductsGrid();
}

function clearAllFilters() {
    document.querySelectorAll('.filter-checkbox input, .size-option input, .color-option input').forEach(input => {
        input.checked = false;
    });
    
    const priceMin = document.getElementById('priceMin');
    const priceMax = document.getElementById('priceMax');
    if (priceMin) priceMin.value = 0;
    if (priceMax) priceMax.value = 500;
    
    currentProducts = [...products];
    currentPage = 1;
    renderProductsGrid();
}

function setupSort() {
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            const value = sortSelect.value;
            
            switch (value) {
                case 'price-low':
                    currentProducts.sort((a, b) => a.price - b.price);
                    break;
                case 'price-high':
                    currentProducts.sort((a, b) => b.price - a.price);
                    break;
                case 'rating':
                    currentProducts.sort((a, b) => b.rating - a.rating);
                    break;
                case 'newest':
                    currentProducts.sort((a, b) => (b.badge === 'new' ? 1 : 0) - (a.badge === 'new' ? 1 : 0));
                    break;
            }
            
            renderProductsGrid();
        });
    }
}

function setupViewToggle() {
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const grid = document.getElementById('productsGrid');
            if (grid) {
                grid.className = 'products-grid ' + btn.dataset.view;
            }
        });
    });
}

// =====================================================
// QUICK VIEW MODAL
// =====================================================
function openQuickView(productId) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) {
        console.error("❌ Quick View Product Not Found:", productId);
        return;
    }

    
    let modal = document.getElementById('quickViewModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'quickViewModal';
        modal.className = 'modal-overlay';
        document.body.appendChild(modal);
    }
    
    const sizesHtml = product.sizes.map((size, i) => 
        `<button class="qv-size-btn ${i === 0 ? 'active' : ''}" onclick="selectQvSize(this, '${size}')">${size}</button>`
    ).join('');
    
    modal.innerHTML = `
        <div class="quick-view-modal">
            <button class="qv-close" onclick="closeQuickView()"><i class="fas fa-times"></i></button>
            <div class="qv-image">
                <img src="${product.image}" alt="${product.name}">
            </div>
            <div class="qv-content">
                <span class="qv-brand">${product.brand}</span>
                <h2 class="qv-name">${product.name}</h2>
                <div class="qv-rating">
                    <div class="stars">${generateStars(product.rating)}</div>
                    <span>(${product.reviews} reviews)</span>
                </div>
                <div class="qv-price">
                    <span class="current">${formatPrice(product.price)}</span>
                    ${product.originalPrice ? `<span class="original">${formatPrice(product.originalPrice)}</span>` : ''}
                    ${product.discount > 0 ? `<span class="discount">-${product.discount}%</span>` : ''}
                </div>
                <div class="qv-sizes">
                    <label>Size:</label>
                    <div class="size-buttons">${sizesHtml}</div>
                </div>
                <input type="hidden" id="qvSelectedSize" value="${product.sizes[0]}">
                <div class="qv-actions">
                    <button class="btn btn-primary btn-block" onclick="addFromQuickView(${product.id})">
                        <i class="fas fa-shopping-bag"></i> Add to Bag
                    </button>
                    <a href="product-detail.html?id=${product.id}" class="btn btn-outline btn-block">View Details</a>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
    
    modal.onclick = (e) => {
        if (e.target === modal) closeQuickView();
    };
}

function selectQvSize(btn, size) {
    document.querySelectorAll('.qv-size-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('qvSelectedSize').value = size;
}

function addFromQuickView(productId) {
    const size = document.getElementById('qvSelectedSize')?.value;
    addToCart(productId, 1, null, size);
    closeQuickView();
}

function closeQuickView() {
    const modal = document.getElementById('quickViewModal');
    if (modal) {
        modal.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// =====================================================
// CART PAGE
// =====================================================
function initCartPage() {
    if (!document.querySelector('.cart-page')) return;
    console.log('Initializing cart page');
    renderCartPage();
    setupCartActions();
}

function renderCartPage() {
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCartPage');
    const cartWrapper = document.getElementById('cartWrapper');
    
    if (!cartItemsContainer) return;
    
    if (cart.length === 0) {
        if (emptyCart) emptyCart.style.display = 'block';
        if (cartWrapper) cartWrapper.style.display = 'none';
        return;
    }
    
    if (emptyCart) emptyCart.style.display = 'none';
    if (cartWrapper) cartWrapper.style.display = 'grid';
    
    let itemsHtml = '';
    cart.forEach((item, index) => {
        itemsHtml += `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-product">
                    <div class="item-image">
                        <a href="product-detail.html?id=${item.id}">
                            <img src="${item.image}" alt="${item.name}">
                        </a>
                    </div>
                    <div class="item-details">
                        <a href="product-detail.html?id=${item.id}" class="item-name">${item.name}</a>
                        <p class="item-variant">Color: ${item.colorName} | Size: ${item.size}</p>
                        <span class="item-stock in-stock"><i class="fas fa-check-circle"></i> In Stock</span>
                    </div>
                </div>
                <div class="cart-item-price">
                    <span class="current-price">${formatPrice(item.price)}</span>
                    ${item.originalPrice ? `<span class="original-price">${formatPrice(item.originalPrice)}</span>` : ''}
                </div>
                <div class="cart-item-quantity">
                    <div class="quantity-selector">
                        <button class="qty-btn" onclick="updateCartItemQty(${index}, ${item.quantity - 1})">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="text" value="${item.quantity}" readonly class="qty-input">
                        <button class="qty-btn" onclick="updateCartItemQty(${index}, ${item.quantity + 1})">
                            <i class="fas fa-plus"></i>
                        </button>
                    </div>
                </div>
                <div class="cart-item-total">
                    ${formatPrice(item.price * item.quantity)}
                </div>
                <div class="cart-item-actions">
                    <button class="action-btn wishlist" onclick="toggleWishlist(${item.id})" title="Save for later">
                        <i class="${isInWishlist(item.id) ? 'fas' : 'far'} fa-heart"></i>
                    </button>
                    <button class="action-btn remove" onclick="removeFromCart(${index})" title="Remove">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    });
    
    cartItemsContainer.innerHTML = itemsHtml;
    updateCartTotals();
    updateShippingProgress();
}

function updateCartTotals() {
    const subtotal = getCartTotal();
    const shipping = subtotal >= 99 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    const subtotalEl = document.getElementById('subtotal');
    const shippingEl = document.getElementById('shippingAmount');
    const taxEl = document.getElementById('taxAmount');
    const totalEl = document.getElementById('totalAmount');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : formatPrice(shipping);
    if (taxEl) taxEl.textContent = formatPrice(tax);
    if (totalEl) totalEl.textContent = formatPrice(total);
}

function updateShippingProgress() {
    const subtotal = getCartTotal();
    const progressBar = document.getElementById('shippingProgress');
    const message = document.getElementById('shippingMessage');
    
    if (progressBar) {
        const progress = Math.min((subtotal / 99) * 100, 100);
        progressBar.style.width = progress + '%';
    }
    
    if (message) {
        if (subtotal >= 99) {
            message.innerHTML = '<i class="fas fa-check-circle"></i> You\'ve unlocked <strong>FREE Shipping!</strong>';
        } else {
            const remaining = 99 - subtotal;
            message.innerHTML = `Add <strong>${formatPrice(remaining)}</strong> more for FREE Shipping`;
        }
    }
}

function setupCartActions() {
    // Clear cart button
    const clearCartBtn = document.getElementById('clearCart');
    if (clearCartBtn) {
        clearCartBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear your cart?')) {
                clearCart();
            }
        });
    }
    
    // Coupon code
    const applyCouponBtn = document.getElementById('applyCoupon');
    if (applyCouponBtn) {
        applyCouponBtn.addEventListener('click', () => {
            const input = document.getElementById('couponInput');
            if (input && input.value.trim().toUpperCase() === 'STYLE20') {
                showToast('Coupon applied! 20% off', 'success');
            } else {
                showToast('Invalid coupon code', 'error');
            }
        });
    }
}

// =====================================================
// CHECKOUT PAGE
// =====================================================
function initCheckoutPage() {
    if (!document.querySelector('.checkout-page')) return;
    console.log('Initializing checkout page');
    renderCheckoutSummary();
    setupCheckoutForm();
}

function renderCheckoutSummary() {
    const summaryItems = document.getElementById('summaryItems');
    if (!summaryItems) return;
    
    let itemsHtml = '';
    cart.forEach(item => {
        itemsHtml += `
            <div class="checkout-item">
                <div class="checkout-item-image">
                    <img src="${item.image}" alt="${item.name}">
                    <span class="checkout-item-qty">${item.quantity}</span>
                </div>
                <div class="checkout-item-info">
                    <span class="checkout-item-name">${item.name}</span>
                    <span class="checkout-item-variant">${item.colorName} / ${item.size}</span>
                </div>
                <span class="checkout-item-price">${formatPrice(item.price * item.quantity)}</span>
            </div>
        `;
    });
    
    summaryItems.innerHTML = itemsHtml;
    
    // Update totals
    const subtotal = getCartTotal();
    const shipping = subtotal >= 99 ? 0 : 9.99;
    const tax = subtotal * 0.08;
    const total = subtotal + shipping + tax;
    
    const subtotalEl = document.getElementById('checkoutSubtotal');
    const shippingEl = document.getElementById('checkoutShipping');
    const taxEl = document.getElementById('checkoutTax');
    const totalEl = document.getElementById('checkoutTotal');
    
    if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
    if (shippingEl) shippingEl.textContent = shipping === 0 ? 'FREE' : formatPrice(shipping);
    if (taxEl) taxEl.textContent = formatPrice(tax);
    if (totalEl) totalEl.textContent = formatPrice(total);
    
    // Update item count
    const itemCount = document.querySelector('.items-toggle span');
    if (itemCount) itemCount.textContent = `${getCartCount()} items`;
}

function setupCheckoutForm() {
    // Shipping method selection
    document.querySelectorAll('.shipping-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.shipping-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
        });
    });
    
    // Payment method selection
    document.querySelectorAll('.payment-option').forEach(option => {
        option.addEventListener('click', function() {
            document.querySelectorAll('.payment-option').forEach(o => o.classList.remove('selected'));
            this.classList.add('selected');
            const radio = this.querySelector('input[type="radio"]');
            if (radio) radio.checked = true;
            
            // Show/hide card form
            const cardForm = document.getElementById('cardForm');
            if (cardForm) {
                cardForm.style.display = radio?.value === 'card' ? 'block' : 'none';
            }
        });
    });
    
    // Place order button
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    if (placeOrderBtn) {
        placeOrderBtn.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Validate terms
            const termsCheckbox = document.getElementById('agreeTerms');
            if (termsCheckbox && !termsCheckbox.checked) {
                showToast('Please agree to the terms and conditions', 'error');
                return;
            }
            
            // Validate email
            const email = document.getElementById('email');
            if (!email || !email.value.trim()) {
                showToast('Please enter your email address', 'error');
                return;
            }
            
            // Success - show confirmation
            showToast('Order placed successfully! Redirecting...', 'success');
            clearCart();
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        });
    }
}

// =====================================================
// HOME PAGE
// =====================================================
function initHomePage() {
    if (!document.querySelector('.hero')) return;
    console.log('Initializing home page');
    
    loadFeaturedProducts();
    loadNewArrivals();
    loadDeals();
    initHeroSlider();
    initCountdown();
}

function loadFeaturedProducts() {
    const container = document.getElementById('featuredProducts');
    if (!container) return;
    
    const featured = products.filter(p => p.featured).slice(0, 8);
    container.innerHTML = featured.map(p => createProductCard(p)).join('');
    updateWishlistButtons();
}

function loadNewArrivals() {
    const container = document.getElementById('newArrivals');
    if (!container) return;
    
    const newProducts = products.filter(p => p.badge === 'new' || p.badge === 'bestseller').slice(0, 8);
    container.innerHTML = newProducts.map(p => createProductCard(p)).join('');
    updateWishlistButtons();
}

function loadDeals() {
    const container = document.getElementById('dealsSlider');
    if (!container) return;
    
    const deals = products.filter(p => p.discount > 0).slice(0, 6);
    container.innerHTML = deals.map(p => createProductCard(p)).join('');
    updateWishlistButtons();
}

function initHeroSlider() {
    let currentSlide = 1;
    const totalSlides = 3;
    
    function goToSlide(n) {
        document.querySelector('.hero-slide.active')?.classList.remove('active');
        document.querySelector('.hero-dot.active')?.classList.remove('active');
        
        const slide = document.querySelector(`.hero-slide[data-slide="${n}"]`);
        const dot = document.querySelector(`.hero-dot[data-slide="${n}"]`);
        
        if (slide) slide.classList.add('active');
        if (dot) dot.classList.add('active');
        
        currentSlide = n;
    }
    
    // Navigation buttons
    const prevBtn = document.getElementById('heroPrev');
    const nextBtn = document.getElementById('heroNext');
    
    if (prevBtn) {
        prevBtn.onclick = () => goToSlide(currentSlide === 1 ? totalSlides : currentSlide - 1);
    }
    
    if (nextBtn) {
        nextBtn.onclick = () => goToSlide(currentSlide === totalSlides ? 1 : currentSlide + 1);
    }
    
    // Dots
    document.querySelectorAll('.hero-dot').forEach(dot => {
        dot.onclick = () => goToSlide(parseInt(dot.dataset.slide));
    });
    
    // Auto play
    setInterval(() => {
        goToSlide(currentSlide === totalSlides ? 1 : currentSlide + 1);
    }, 5000);
}

function initCountdown() {
    function updateCountdown() {
        const now = new Date();
        const endOfDay = new Date(now);
        endOfDay.setHours(23, 59, 59, 999);
        
        const diff = endOfDay - now;
        
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        
        const hoursEl = document.getElementById('hours');
        const minutesEl = document.getElementById('minutes');
        const secondsEl = document.getElementById('seconds');
        
        if (hoursEl) hoursEl.textContent = String(hours).padStart(2, '0');
        if (minutesEl) minutesEl.textContent = String(minutes).padStart(2, '0');
        if (secondsEl) secondsEl.textContent = String(seconds).padStart(2, '0');
    }
    
    updateCountdown();
    setInterval(updateCountdown, 1000);
}

// =====================================================
// PRODUCT DETAIL PAGE
// =====================================================
function initProductDetail() {
    if (!document.querySelector('.product-detail-page')) return;
    console.log('Initializing product detail page');
    
    // Get product ID from URL
    const params = new URLSearchParams(window.location.search);
   const productId = params.get('id');
const product = products.find(p => String(p.id) === String(productId));
if (!product) {
    console.error("❌ Add To Cart Failed. Product not found:", productId);
    return;
}

if (!product) {
    console.error("Product not found for ID:", productId);
    return;
}

    if (!product) return;
    
    let selectedColor = product.colors[0];
    let selectedSize = null;
    let quantity = 1;
    
    // Color selection
    document.querySelectorAll('.color-option-btn').forEach((btn, index) => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.color-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            selectedColor = product.colors[index];
            
            const colorName = document.getElementById('selectedColor');
            if (colorName) colorName.textContent = product.colorNames[index];
        });
    });
    
    // Size selection
    document.querySelectorAll('.size-option-btn:not(.disabled)').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.size-option-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const input = btn.querySelector('input');
            if (input) {
                selectedSize = input.value;
                const sizeName = document.getElementById('selectedSize');
                if (sizeName) sizeName.textContent = selectedSize;
            }
        });
    });
    
    // Quantity
    const qtyInput = document.getElementById('qtyInput');
    const qtyMinus = document.getElementById('qtyMinus');
    const qtyPlus = document.getElementById('qtyPlus');
    
    if (qtyMinus) {
        qtyMinus.onclick = () => {
            if (quantity > 1) {
                quantity--;
                if (qtyInput) qtyInput.value = quantity;
            }
        };
    }
    
    if (qtyPlus) {
        qtyPlus.onclick = () => {
            if (quantity < 10) {
                quantity++;
                if (qtyInput) qtyInput.value = quantity;
            }
        };
    }
    
    // Add to cart
    const addToCartBtn = document.getElementById('addToCartBtn');
    if (addToCartBtn) {
        addToCartBtn.onclick = () => {
            if (!selectedSize && product.sizes[0] !== 'One Size') {
                showToast('Please select a size', 'error');
                return;
            }
            addToCart(product.id, quantity, selectedColor, selectedSize || product.sizes[0]);
        };
    }
    
    // Buy now
    const buyNowBtn = document.getElementById('buyNowBtn');
    if (buyNowBtn) {
        buyNowBtn.onclick = () => {
            if (!selectedSize && product.sizes[0] !== 'One Size') {
                showToast('Please select a size', 'error');
                return;
            }
            addToCart(product.id, quantity, selectedColor, selectedSize || product.sizes[0]);
            window.location.href = 'checkout.html';
        };
    }
    
    // Product tabs
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.onclick = () => {
            const tabId = btn.dataset.tab;
            
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(tabId)?.classList.add('active');
        };
    });
    
    // Image gallery
    document.querySelectorAll('.thumbnail').forEach(thumb => {
        thumb.onclick = () => {
            document.querySelectorAll('.thumbnail').forEach(t => t.classList.remove('active'));
            thumb.classList.add('active');
            
            const mainImg = document.getElementById('productMainImg');
            if (mainImg && thumb.dataset.img) {
                mainImg.src = thumb.dataset.img;
            }
        };
    });
    
    // Load related products
    const relatedContainer = document.getElementById('relatedProducts');
    if (relatedContainer) {
        const related = products.filter(p => p.id !== product.id && p.category === product.category).slice(0, 4);
        relatedContainer.innerHTML = related.map(p => createProductCard(p)).join('');
    }
    
    // Load recently viewed
    const recentContainer = document.getElementById('recentlyViewed');
    if (recentContainer) {
        const recent = products.filter(p => p.id !== product.id).slice(0, 4);
        recentContainer.innerHTML = recent.map(p => createProductCard(p)).join('');
    }
    
    updateWishlistButtons();
}

// =====================================================
// HEADER FUNCTIONALITY
// =====================================================
function initHeader() {
    // Scroll effect
    const header = document.getElementById('header');
    if (header) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                header.classList.add('scrolled');
            } else {
                header.classList.remove('scrolled');
            }
        });
    }
    
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const navMain = document.getElementById('navMain');
    
    if (mobileMenuToggle && navMain) {
        mobileMenuToggle.onclick = () => {
            mobileMenuToggle.classList.toggle('active');
            navMain.classList.toggle('active');
        };
    }
    
    // Search overlay
    const searchToggle = document.querySelector('.search-toggle');
    const searchOverlay = document.getElementById('searchOverlay');
    const searchClose = document.querySelector('.search-close');
    
    if (searchToggle && searchOverlay) {
        searchToggle.onclick = () => searchOverlay.classList.add('active');
    }
    
    if (searchClose && searchOverlay) {
        searchClose.onclick = () => searchOverlay.classList.remove('active');
    }
    
    if (searchOverlay) {
        searchOverlay.onclick = (e) => {
            if (e.target === searchOverlay) {
                searchOverlay.classList.remove('active');
            }
        };
    }
    
    // Mini cart
    const cartToggle = document.getElementById('cartToggle');
    const miniCart = document.getElementById('miniCart');
    const miniCartOverlay = document.getElementById('miniCartOverlay');
    const miniCartClose = document.getElementById('miniCartClose');
    
    function openMiniCart() {
        miniCart?.classList.add('active');
        miniCartOverlay?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
    
    function closeMiniCart() {
        miniCart?.classList.remove('active');
        miniCartOverlay?.classList.remove('active');
        document.body.style.overflow = '';
    }
    
    if (cartToggle) cartToggle.onclick = openMiniCart;
    if (miniCartClose) miniCartClose.onclick = closeMiniCart;
    if (miniCartOverlay) miniCartOverlay.onclick = closeMiniCart;
    
    // Announcement bar close
    const announcementClose = document.querySelector('.announcement-close');
    const announcementBar = document.querySelector('.announcement-bar');
    
    if (announcementClose && announcementBar) {
        announcementClose.onclick = () => {
            announcementBar.style.display = 'none';
        };
    }
}

// =====================================================
// BACK TO TOP BUTTON
// =====================================================
function initBackToTop() {
    const backToTop = document.getElementById('backToTop');
    if (!backToTop) return;
    
    window.addEventListener('scroll', () => {
        if (window.scrollY > 300) {
            backToTop.classList.add('visible');
        } else {
            backToTop.classList.remove('visible');
        }
    });
    
    backToTop.onclick = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// =====================================================
// INITIALIZATION
// =====================================================
document.addEventListener("DOMContentLoaded", function () {
    initCart();
    initWishlist();
    initHeader();
    initBackToTop();
    initCartPage();
    initCheckoutPage();

    loadProductsFromServer(); // ✅ THIS ALONE IS ENOUGH
});
