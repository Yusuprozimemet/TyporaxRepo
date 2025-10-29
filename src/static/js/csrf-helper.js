// CSRF Token Helper for AJAX requests
// This script should be included in templates that make AJAX POST requests

window.CSRFHelper = {
    // Get CSRF token from meta tag
    getToken: function() {
        const metaTag = document.querySelector('meta[name="csrf-token"]');
        return metaTag ? metaTag.getAttribute('content') : null;
    },
    
    // Add CSRF token to fetch options
    addToFetch: function(options = {}) {
        const token = this.getToken();
        if (token) {
            // Add to headers
            if (!options.headers) {
                options.headers = {};
            }
            options.headers['X-CSRFToken'] = token;
            
            // Add to FormData if body is FormData
            if (options.body instanceof FormData) {
                options.body.append('csrf_token', token);
            }
            
            // Add to JSON body if it's an object
            if (options.body && typeof options.body === 'string') {
                try {
                    const parsed = JSON.parse(options.body);
                    parsed.csrf_token = token;
                    options.body = JSON.stringify(parsed);
                } catch (e) {
                    // Not JSON, ignore
                }
            }
        }
        return options;
    },
    
    // Helper for fetch with automatic CSRF token
    fetch: function(url, options = {}) {
        return fetch(url, this.addToFetch(options));
    }
};

// Make it globally available
window.csrfFetch = window.CSRFHelper.fetch.bind(window.CSRFHelper);