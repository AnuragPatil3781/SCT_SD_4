// Product Scraper Application
class ProductScraper {
    constructor() {
        this.products = [];
        this.initializeEventListeners();
        this.updateProductCount();
    }

    // Initialize all event listeners
    initializeEventListeners() {
        // Scrape button
        document.getElementById('scrapeBtn').addEventListener('click', () => {
            this.scrapeWebsite();
        });

        // Add product manually
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.addProductManually();
        });

        // Export to CSV
        document.getElementById('exportCsvBtn').addEventListener('click', () => {
            this.exportToCSV();
        });

        // Clear all data
        document.getElementById('clearDataBtn').addEventListener('click', () => {
            this.clearAllData();
        });

        // Load demo data
        document.getElementById('loadDemoBtn').addEventListener('click', () => {
            this.loadDemoData();
        });

        // Enter key support for URL input
        document.getElementById('websiteUrl').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.scrapeWebsite();
            }
        });
    }

    // Show status message
    showStatus(message, type = 'info') {
        const statusElement = document.getElementById('statusMessage');
        statusElement.textContent = message;
        statusElement.className = `status-message ${type}`;
        
        // Auto hide after 5 seconds
        setTimeout(() => {
            statusElement.style.display = 'none';
        }, 5000);
    }

    // Show/hide loading spinner
    showLoading(show = true) {
        const spinner = document.getElementById('loadingSpinner');
        spinner.style.display = show ? 'flex' : 'none';
    }

    // Attempt to scrape website (with CORS proxy or direct access)
    async scrapeWebsite() {
        const url = document.getElementById('websiteUrl').value.trim();
        
        if (!url) {
            this.showStatus('Please enter a valid URL', 'error');
            return;
        }

        if (!this.isValidUrl(url)) {
            this.showStatus('Please enter a valid URL format', 'error');
            return;
        }

        this.showLoading(true);
        this.showStatus('Attempting to access website...', 'info');

        try {
            // First, try to access the website directly
            const response = await this.attemptDirectScraping(url);
            
            if (response.success) {
                const products = this.parseProductsFromHTML(response.html, url);
                
                if (products.length > 0) {
                    products.forEach(product => this.addProduct(product));
                    this.showStatus(`Successfully extracted ${products.length} products from ${url}`, 'success');
                } else {
                    this.showStatus('No products found on this page. The website structure might not be supported.', 'error');
                    this.suggestAlternatives();
                }
            } else {
                this.showStatus(`Cannot access ${url} due to CORS restrictions. See alternatives below.`, 'error');
                this.suggestAlternatives();
            }
            
        } catch (error) {
            this.showStatus(`Error accessing website: ${error.message}`, 'error');
            this.suggestAlternatives();
        } finally {
            this.showLoading(false);
        }
    }

    // Try to access the website directly
    async attemptDirectScraping(url) {
        try {
            // Try using a CORS proxy service
            const proxyUrls = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
                `https://corsproxy.io/?${encodeURIComponent(url)}`,
                url // Direct access (will likely fail due to CORS)
            ];

            for (const proxyUrl of proxyUrls) {
                try {
                    const response = await fetch(proxyUrl, {
                        method: 'GET',
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (compatible; ProductScraper/1.0)'
                        }
                    });

                    if (response.ok) {
                        const data = await response.text();
                        // Handle proxy response format
                        const html = proxyUrl.includes('allorigins') ? 
                            JSON.parse(data).contents : data;
                        
                        return { success: true, html };
                    }
                } catch (e) {
                    continue; // Try next proxy
                }
            }
            
            return { success: false, error: 'All access methods failed' };
            
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    // Parse products from HTML content
    parseProductsFromHTML(html, sourceUrl) {
        try {
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            const products = [];

            // Common e-commerce selectors (add more as needed)
            const productSelectors = [
                // Generic product containers
                '.product-item', '.product-card', '.product', '.item',
                '[data-product]', '.product-tile', '.product-container',
                // Amazon-like
                '[data-component-type="s-search-result"]',
                '.s-result-item', '.product-item-container',
                // Shopify-like
                '.product-card', '.grid-product__content',
                // WooCommerce
                '.woocommerce-loop-product__title',
                // General
                '.card', '.listing-item'
            ];

            for (const selector of productSelectors) {
                const elements = doc.querySelectorAll(selector);
                if (elements.length > 0) {
                    elements.forEach((element, index) => {
                        if (index < 20) { // Limit to 20 products
                            const product = this.extractProductFromElement(element, sourceUrl);
                            if (product && product.name && product.price) {
                                products.push(product);
                            }
                        }
                    });
                    
                    if (products.length > 0) break; // Found products with this selector
                }
            }

            return products;
            
        } catch (error) {
            console.error('Error parsing HTML:', error);
            return [];
        }
    }

    // Extract product information from HTML element
    extractProductFromElement(element, sourceUrl) {
        try {
            const product = {
                sourceUrl: sourceUrl
            };

            // Extract name
            const nameSelectors = [
                'h1', 'h2', 'h3', '.title', '.name', '.product-title',
                '.product-name', '[data-product-title]', 'a[title]',
                '.card-title', '.item-title'
            ];
            
            product.name = this.extractTextFromSelectors(element, nameSelectors);

            // Extract price
            const priceSelectors = [
                '.price', '.cost', '.amount', '[data-price]',
                '.price-current', '.sale-price', '.regular-price',
                '.money', '.currency', '.product-price'
            ];
            
            const priceText = this.extractTextFromSelectors(element, priceSelectors);
            product.price = this.parsePrice(priceText);

            // Extract rating
            const ratingSelectors = [
                '.rating', '.stars', '.review-score', '[data-rating]',
                '.star-rating', '.product-rating'
            ];
            
            const ratingText = this.extractTextFromSelectors(element, ratingSelectors);
            product.rating = this.parseRating(ratingText) || 0;

            // Extract image
            const imgElement = element.querySelector('img');
            if (imgElement) {
                product.imageUrl = imgElement.src || imgElement.dataset.src || '';
            }

            // Extract description
            const descSelectors = [
                '.description', '.summary', '.excerpt', '.product-description'
            ];
            product.description = this.extractTextFromSelectors(element, descSelectors) || 'No description available';

            // Set default category
            product.category = 'Scraped Product';

            return product;
            
        } catch (error) {
            console.error('Error extracting product:', error);
            return null;
        }
    }

    // Helper function to extract text from multiple selectors
    extractTextFromSelectors(element, selectors) {
        for (const selector of selectors) {
            const foundElement = element.querySelector(selector);
            if (foundElement && foundElement.textContent.trim()) {
                return foundElement.textContent.trim();
            }
        }
        return null;
    }

    // Parse price from text
    parsePrice(priceText) {
        if (!priceText) return 0;
        
        // Remove currency symbols and extract number
        const cleanPrice = priceText.replace(/[^\d.,]/g, '');
        const price = parseFloat(cleanPrice.replace(',', ''));
        
        return isNaN(price) ? 0 : price;
    }

    // Parse rating from text
    parseRating(ratingText) {
        if (!ratingText) return 0;
        
        // Look for numbers that could be ratings
        const match = ratingText.match(/(\d+\.?\d*)/);
        if (match) {
            const rating = parseFloat(match[1]);
            return rating <= 5 ? rating : rating / 10; // Handle 0-10 scales
        }
        
        // Count stars if present
        const stars = (ratingText.match(/★/g) || []).length;
        return stars > 0 ? stars : 0;
    }

    // Suggest alternatives when scraping fails
    suggestAlternatives() {
        const alternatives = `
        <div style="margin-top: 15px; padding: 15px; background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">Alternative Solutions:</h4>
            <ul style="margin: 0; padding-left: 20px; color: #856404;">
                <li><strong>Browser Extension:</strong> Use a Chrome/Firefox extension for scraping</li>
                <li><strong>API Access:</strong> Check if the website offers product APIs</li>
                <li><strong>Desktop Tools:</strong> Use tools like Scrapy, BeautifulSoup, or Selenium</li>
                <li><strong>Manual Entry:</strong> Use the manual form below to add products</li>
                <li><strong>CSV Import:</strong> Export data from other tools and import here</li>
            </ul>
        </div>
        `;
        
        const statusElement = document.getElementById('statusMessage');
        statusElement.innerHTML = alternatives;
        statusElement.className = 'status-message info';
        statusElement.style.display = 'block';
    }

    // Simulate web scraping delay
    async simulateWebScraping(url) {
        return new Promise((resolve, reject) => {
            // Simulate network delay
            const delay = Math.random() * 2000 + 1000; // 1-3 seconds
            
            setTimeout(() => {
                // Simulate occasional failures
                if (Math.random() < 0.1) { // 10% failure rate
                    reject(new Error('Network timeout or access denied'));
                } else {
                    resolve();
                }
            }, delay);
        });
    }

    // Generate mock products based on URL
    generateMockProducts(url) {
        const domain = this.extractDomain(url);
        const productTemplates = [
            { name: 'Wireless Bluetooth Headphones', price: 89.99, rating: 4.5, category: 'Electronics' },
            { name: 'Organic Cotton T-Shirt', price: 29.99, rating: 4.2, category: 'Clothing' },
            { name: 'Smart Fitness Watch', price: 199.99, rating: 4.7, category: 'Electronics' },
            { name: 'Leather Crossbody Bag', price: 79.99, rating: 4.3, category: 'Accessories' },
            { name: 'Stainless Steel Water Bottle', price: 24.99, rating: 4.6, category: 'Home & Garden' },
            { name: 'Bluetooth Speaker', price: 59.99, rating: 4.4, category: 'Electronics' },
            { name: 'Running Shoes', price: 119.99, rating: 4.5, category: 'Sports' },
            { name: 'Coffee Mug Set', price: 34.99, rating: 4.1, category: 'Home & Garden' }
        ];

        const numProducts = Math.floor(Math.random() * 5) + 3; // 3-7 products
        const selectedProducts = [];

        for (let i = 0; i < numProducts; i++) {
            const template = productTemplates[Math.floor(Math.random() * productTemplates.length)];
            const product = {
                ...template,
                name: `${template.name} - ${domain}`,
                price: +(template.price + (Math.random() - 0.5) * 20).toFixed(2),
                rating: +(template.rating + (Math.random() - 0.5) * 0.8).toFixed(1),
                description: `High-quality ${template.name.toLowerCase()} from ${domain}. Great value for money.`,
                imageUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(template.name)}`,
                sourceUrl: url
            };

            // Ensure rating is between 1 and 5
            product.rating = Math.max(1, Math.min(5, product.rating));

            selectedProducts.push(product);
        }

        return selectedProducts;
    }

    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch {
            return 'unknown-site';
        }
    }

    // Validate URL format
    isValidUrl(string) {
        try {
            new URL(string);
            return true;
        } catch {
            return false;
        }
    }

    // Add product manually from form
    addProductManually() {
        const name = document.getElementById('productName').value.trim();
        const price = parseFloat(document.getElementById('productPrice').value);
        const rating = parseFloat(document.getElementById('productRating').value);
        const category = document.getElementById('productCategory').value.trim();
        const imageUrl = document.getElementById('productImage').value.trim();
        const description = document.getElementById('productDescription').value.trim();

        // Validation
        if (!name || isNaN(price) || isNaN(rating)) {
            this.showStatus('Please fill in all required fields (Name, Price, Rating)', 'error');
            return;
        }

        if (rating < 1 || rating > 5) {
            this.showStatus('Rating must be between 1 and 5', 'error');
            return;
        }

        const product = {
            name,
            price: +price.toFixed(2),
            rating: +rating.toFixed(1),
            category: category || 'Uncategorized',
            description: description || 'No description available',
            imageUrl: imageUrl || '',
            sourceUrl: 'Manual Entry'
        };

        this.addProduct(product);
        this.clearManualForm();
        this.showStatus('Product added successfully!', 'success');
    }

    // Add product to the list
    addProduct(product) {
        // Add unique ID
        product.id = Date.now() + Math.random();
        this.products.push(product);
        this.updateTable();
        this.updateProductCount();
        this.updateExportButton();
    }

    // Clear manual form
    clearManualForm() {
        document.getElementById('productName').value = '';
        document.getElementById('productPrice').value = '';
        document.getElementById('productRating').value = '';
        document.getElementById('productCategory').value = '';
        document.getElementById('productImage').value = '';
        document.getElementById('productDescription').value = '';
    }

    // Update products table
    updateTable() {
        const tbody = document.getElementById('productsTableBody');
        tbody.innerHTML = '';

        this.products.forEach(product => {
            const row = this.createTableRow(product);
            tbody.appendChild(row);
        });
    }

    // Create table row for product
    createTableRow(product) {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td class="product-name">${this.escapeHtml(product.name)}</td>
            <td class="product-price">$${product.price.toFixed(2)}</td>
            <td class="product-rating">
                <span class="stars">${this.generateStars(product.rating)}</span>
                <span>${product.rating}</span>
            </td>
            <td>${this.escapeHtml(product.category)}</td>
            <td class="product-description" title="${this.escapeHtml(product.description)}">
                ${this.escapeHtml(product.description)}
            </td>
            <td class="product-image">
                ${product.imageUrl ? this.escapeHtml(product.imageUrl) : 'No image'}
            </td>
            <td>
                <button class="delete-btn" onclick="scraper.deleteProduct('${product.id}')">
                    Delete
                </button>
            </td>
        `;

        return row;
    }

    // Generate star rating display
    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        return '★'.repeat(fullStars) + 
               (hasHalfStar ? '☆' : '') + 
               '☆'.repeat(emptyStars);
    }

    // Escape HTML to prevent XSS
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Delete product
    deleteProduct(productId) {
        this.products = this.products.filter(p => p.id != productId);
        this.updateTable();
        this.updateProductCount();
        this.updateExportButton();
        this.showStatus('Product deleted successfully!', 'success');
    }

    // Update product count display
    updateProductCount() {
        document.getElementById('productCount').textContent = this.products.length;
    }

    // Update export button state
    updateExportButton() {
        const exportBtn = document.getElementById('exportCsvBtn');
        exportBtn.disabled = this.products.length === 0;
    }

    // Export data to CSV
    exportToCSV() {
        if (this.products.length === 0) {
            this.showStatus('No products to export', 'error');
            return;
        }

        try {
            const csv = this.convertToCSV(this.products);
            this.downloadCSV(csv, `products_${new Date().toISOString().split('T')[0]}.csv`);
            this.showStatus(`Successfully exported ${this.products.length} products to CSV!`, 'success');
        } catch (error) {
            this.showStatus(`Error exporting CSV: ${error.message}`, 'error');
        }
    }

    // Convert products array to CSV format
    convertToCSV(products) {
        const headers = ['Name', 'Price', 'Rating', 'Category', 'Description', 'Image URL', 'Source URL'];
        const csvContent = [];

        // Add headers
        csvContent.push(headers.map(header => `"${header}"`).join(','));

        // Add product data
        products.forEach(product => {
            const row = [
                product.name,
                product.price,
                product.rating,
                product.category,
                product.description,
                product.imageUrl,
                product.sourceUrl
            ].map(field => `"${String(field).replace(/"/g, '""')}"`); // Escape quotes

            csvContent.push(row.join(','));
        });

        return csvContent.join('\n');
    }

    // Download CSV file
    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    // Clear all data
    clearAllData() {
        if (this.products.length === 0) {
            this.showStatus('No data to clear', 'info');
            return;
        }

        if (confirm(`Are you sure you want to delete all ${this.products.length} products?`)) {
            this.products = [];
            this.updateTable();
            this.updateProductCount();
            this.updateExportButton();
            this.showStatus('All products have been cleared', 'success');
        }
    }

    // Load demo data
    loadDemoData() {
        const demoProducts = [
            {
                name: 'Premium Wireless Headphones',
                price: 149.99,
                rating: 4.6,
                category: 'Electronics',
                description: 'High-quality wireless headphones with noise cancellation and 30-hour battery life.',
                imageUrl: 'https://via.placeholder.com/300x200?text=Wireless+Headphones',
                sourceUrl: 'Demo Data'
            },
            {
                name: 'Organic Cotton Hoodie',
                price: 59.99,
                rating: 4.3,
                category: 'Clothing',
                description: 'Comfortable and sustainable hoodie made from 100% organic cotton.',
                imageUrl: 'https://via.placeholder.com/300x200?text=Cotton+Hoodie',
                sourceUrl: 'Demo Data'
            },
            {
                name: 'Smart Home Security Camera',
                price: 89.99,
                rating: 4.7,
                category: 'Electronics',
                description: 'HD security camera with night vision, motion detection, and mobile app integration.',
                imageUrl: 'https://via.placeholder.com/300x200?text=Security+Camera',
                sourceUrl: 'Demo Data'
            },
            {
                name: 'Ceramic Coffee Mug Set',
                price: 34.99,
                rating: 4.2,
                category: 'Home & Kitchen',
                description: 'Set of 4 handcrafted ceramic coffee mugs with unique designs.',
                imageUrl: 'https://via.placeholder.com/300x200?text=Coffee+Mugs',
                sourceUrl: 'Demo Data'
            },
            {
                name: 'Yoga Mat with Alignment Lines',
                price: 39.99,
                rating: 4.5,
                category: 'Sports & Fitness',
                description: 'Non-slip yoga mat with alignment guides for proper positioning.',
                imageUrl: 'https://via.placeholder.com/300x200?text=Yoga+Mat',
                sourceUrl: 'Demo Data'
            }
        ];

        // Clear existing products and add demo data
        this.products = [];
        demoProducts.forEach(product => {
            this.addProduct(product);
        });

        this.showStatus(`Loaded ${demoProducts.length} demo products!`, 'success');
    }
}

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.scraper = new ProductScraper();
});



// Additional utility functions for potential future enhancements

// Function to validate product data
function validateProduct(product) {
    const required = ['name', 'price', 'rating'];
    const missing = required.filter(field => !product[field]);
    
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(', ')}`);
    }
    
    if (typeof product.price !== 'number' || product.price < 0) {
        throw new Error('Price must be a positive number');
    }
    
    if (typeof product.rating !== 'number' || product.rating < 1 || product.rating > 5) {
        throw new Error('Rating must be a number between 1 and 5');
    }
    
    return true;
}

// Function to format currency
function formatCurrency(amount, currency = 'USD') {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: currency
    }).format(amount);
}

// Function to truncate text
function truncateText(text, maxLength = 50) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// Function to debounce input (useful for search functionality)
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}