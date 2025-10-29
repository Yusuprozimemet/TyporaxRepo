// src/static/js/upgrade.js
document.addEventListener('DOMContentLoaded', () => {
    // Load PayPal SDK script
    const paypalScript = document.createElement('script');
    paypalScript.src = "https://www.paypal.com/sdk/js?client-id=AX-91KFs4Ogw6myev5nNWWYLYpaA9MstuVREa9-VhB4t3Vj0lslG1bd-b-V-wdfWUKPW4rWljWamPEYh&currency=EUR";
    document.head.appendChild(paypalScript);

    // Create modal HTML structure and append to body
    const modalHTML = `
        <div id="upgradeModal" class="upgrade-modal">
            <div class="upgrade-modal-content">
                <div class="upgrade-modal-header">
                    <h2>Account Management</h2>
                    <span class="close-modal" role="button" aria-label="Close modal">&times;</span>
                </div>
                <div class="upgrade-modal-body">
                    <div id="subscriptionInfo" class="subscription-info hidden">
                        <div class="subscription-status">
                            <h3>Your Subscription</h3>
                            <div class="status-badge premium">Premium</div>
                        </div>
                        <div class="subscription-details">
                            <div class="detail-item">
                                <span class="detail-label">Started On:</span>
                                <span id="subscriptionStartDate" class="detail-value">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Next Billing:</span>
                                <span id="nextBillingDate" class="detail-value">-</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Monthly Price:</span>
                                <span class="detail-value">€20.00</span>
                            </div>
                        </div>
                        <div class="subscription-actions">
                            <button id="unsubscribeButton" class="btn danger">Unsubscribe</button>
                        </div>
                        <div id="unsubscribeConfirm" class="unsubscribe-confirm hidden">
                            <p>Are you sure you want to cancel your subscription?</p>
                            <p class="subscription-note">Your premium access will continue until the end of your current billing period.</p>
                            <div class="confirm-actions">
                                <button id="confirmUnsubscribe" class="btn danger">Yes, Cancel</button>
                                <button id="cancelUnsubscribe" class="btn secondary">Keep Subscription</button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="pricing-container" id="pricingContainer">
                        <div class="pricing-plan active" id="premium-plan">
                            <h3>Premium Plan</h3>
                            <div class="price">€20.00<span>/month</span></div>
                            <ul class="features">
                                <li>✓ Advanced AI features</li>
                                <li>✓ Priority support</li>
                                <li>✓ No usage limits</li>
                                <li>✓ Early access to new features</li>
                            </ul>
                            <button class="btn primary btn-premium-purchase" aria-label="Subscribe to Premium Plan">Subscribe Now</button>
                            <div id="paypal-button-container-premium" class="paypal-button-container hidden"></div>
                        </div>
                    </div>
                    <div id="statusMessage" class="status-message"></div>
                </div>
            </div>
        </div>
        `;

    // Create style element
    // Create style element
    const modalStyle = document.createElement('style');
    modalStyle.textContent = `
            /* Upgrade Modal Base Styles */
            .upgrade-modal {
                display: none;
                position: fixed;
                z-index: 1000;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(0, 0, 0, 0.5);
                backdrop-filter: blur(5px);
                overflow: auto;
                animation: fadeIn 0.3s ease-in-out;
                -ms-overflow-style: none;
                scrollbar-width: none;
            }

            .upgrade-modal::-webkit-scrollbar {
                display: none;
            }

            @keyframes fadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }

            .upgrade-modal .upgrade-modal-content {
                background: var(--menu-bg, #ffffff);
                margin: 10% auto;
                max-width: 520px;
                padding: 25px;
                border-radius: 12px;
                box-shadow: 0 10px 25px var(--header-shadow, rgba(0, 0, 0, 0.15));
                position: relative;
                animation: slideDown 0.4s ease-out;
                border: 1px solid var(--menu-border, #d9e1e8);
                color: var(--text-color, #1f2a44);
                font-family: 'Poppins', sans-serif;
                overflow-y: auto;
                max-height: 85vh;
            }

            @keyframes slideDown {
                from { transform: translateY(-50px); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }

            .upgrade-modal .upgrade-modal-header {
                padding: 0 0 15px;
                border-bottom: 1px solid var(--menu-border, #eee);
                display: flex;
                justify-content: space-between;
                align-items: center;
            }

            .upgrade-modal .upgrade-modal-header h2 {
                margin: 0;
                color: var(--text-color, #333);
                font-size: 1.6em;
                font-weight: 600;
                font-family: 'Poppins', sans-serif;
            }

            .upgrade-modal .close-modal {
                color: var(--menu-item-color, #999);
                font-size: 24px;
                font-weight: bold;
                cursor: pointer;
                transition: color 0.2s, background-color 0.2s;
                height: 32px;
                width: 32px;
                display: flex;
                align-items: center;
                justify-content: center;
                border-radius: 50%;
            }

            .upgrade-modal .close-modal:hover {
                color: var(--menu-item-hover-color, #0366d6);
                background-color: var(--menu-item-hover-bg, #f0f0f0);
            }

            .upgrade-modal .upgrade-modal-body {
                padding: 20px 0;
            }

            .upgrade-modal .pricing-container {
                margin-bottom: 20px;
            }

            .upgrade-modal .pricing-plan {
                border: 1px solid var(--menu-border, #e0e0e0);
                border-radius: 10px;
                padding: 20px;
                text-align: center;
                transition: transform 0.3s, box-shadow 0.3s;
                background-color: var(--sidebar-bg, #ffffff);
            }

            .upgrade-modal .pricing-plan:hover {
                transform: translateY(-5px);
                box-shadow: 0 6px 15px rgba(0, 0, 0, 0.1);
            }

            .upgrade-modal .pricing-plan h3 {
                color: var(--text-color, #333);
                margin: 0 0 10px;
                font-size: 1.2em;
                font-weight: 500;
            }

            .upgrade-modal .price {
                font-size: 2em;
                font-weight: bold;
                color: #0366d6;
                margin: 10px 0;
            }

            .upgrade-modal .price span {
                font-size: 0.5em;
                font-weight: normal;
                color: var(--menu-item-color, #999);
            }

            .upgrade-modal .features {
                list-style: none;
                padding: 0;
                margin: 15px 0;
                text-align: left;
            }

            .upgrade-modal .features li {
                padding: 8px 0;
                color: var(--header-tagline, #666);
                font-size: 0.9em;
                display: flex;
                align-items: center;
            }

            .upgrade-modal .features li::before {
                content: "\\f058";
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                color: #28a745;
                margin-right: 8px;
                font-size: 0.8em;
            }

            .upgrade-modal .btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                font-size: 0.9em;
                cursor: pointer;
                transition: background-color 0.3s, transform 0.2s;
                font-weight: 500;
                font-family: 'Poppins', sans-serif;
            }

            .upgrade-modal .btn.primary {
                background-color: #0366d6;
                color: #ffffff;
            }

            .upgrade-modal .btn.primary:hover {
                background-color: #0256b3;
                transform: translateY(-2px);
            }

            .upgrade-modal .btn.secondary {
                background-color: transparent;
                color: var(--text-color, #333);
                border: 1px solid var(--menu-border, #e0e0e0);
            }

            .upgrade-modal .btn.secondary:hover {
                background-color: var(--menu-item-hover-bg, #f0f0f0);
                transform: translateY(-2px);
            }

            .upgrade-modal .btn.danger {
                background-color: #dc3545;
                color: #ffffff;
            }

            .upgrade-modal .btn.danger:hover {
                background-color: #c82333;
                transform: translateY(-2px);
            }

            .upgrade-modal .btn:disabled {
                opacity: 0.6;
                cursor: not-allowed;
                transform: none;
            }

            .upgrade-modal .status-message {
                padding: 12px;
                margin: 10px 0;
                border-radius: 8px;
                font-size: 0.9em;
                text-align: center;
                display: flex;
                align-items: center;
                justify-content: center;
            }

            .upgrade-modal .status-message.success {
                background-color: rgba(40, 167, 69, 0.1);
                color: #28a745;
                border: 1px solid #28a745;
            }

            .upgrade-modal .status-message.success::before {
                content: "\\f058";
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                margin-right: 8px;
            }

            .upgrade-modal .status-message.error {
                background-color: rgba(220, 53, 69, 0.1);
                color: #dc3545;
                border: 1px solid #dc3545;
            }

            .upgrade-modal .status-message.error::before {
                content: "\\f057";
                font-family: "Font Awesome 5 Free";
                font-weight: 900;
                margin-right: 8px;
            }

            .upgrade-modal .paypal-button-container {
                margin-top: 15px;
            }

            .upgrade-modal .btn-premium-purchase {
                width: 100%;
                margin-top: 12px;
                transition: all 0.3s;
            }

            .upgrade-modal .btn-premium-purchase.clicked {
                transform: scale(0.95);
                opacity: 0.8;
            }

            .upgrade-modal .payment-success {
                text-align: center;
                padding: 15px;
                margin-top: 10px;
                color: #28a745;
            }

            .upgrade-modal .payment-success i {
                font-size: 2.5em;
                margin-bottom: 10px;
            }

            .upgrade-modal .spinner {
                display: inline-block;
                width: 16px;
                height: 16px;
                border: 2px solid rgba(255, 255, 255, 0.3);
                border-radius: 50%;
                border-top-color: white;
                animation: spin 1s ease-in-out infinite;
                margin-right: 8px;
            }

            @keyframes spin {
                to { transform: rotate(360deg); }
            }

            /* Subscription Info Styles */
            .upgrade-modal .subscription-info {
                border: 1px solid var(--menu-border, #e0e0e0);
                border-radius: 10px;
                padding: 20px;
                margin-bottom: 20px;
                background-color: var(--sidebar-bg, #ffffff);
            }

            .upgrade-modal .subscription-status {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .upgrade-modal .subscription-status h3 {
                margin: 0;
                color: var(--text-color, #333);
                font-size: 1.1em;
            }

            .upgrade-modal .status-badge {
                padding: 6px 12px;
                border-radius: 12px;
                font-size: 0.8em;
                font-weight: 500;
            }

            .upgrade-modal .status-badge.premium {
                background-color: #ffd700;
                color: #333;
            }

            .upgrade-modal .subscription-details {
                margin-bottom: 15px;
            }

            .upgrade-modal .detail-item {
                display: flex;
                justify-content: space-between;
                padding: 8px 0;
                border-bottom: 1px solid var(--menu-border, #f0f0f0);
                font-size: 0.9em;
            }

            .upgrade-modal .detail-item:last-child {
                border-bottom: none;
            }

            .upgrade-modal .detail-label {
                color: var(--menu-item-color, #666);
            }

            .upgrade-modal .detail-value {
                font-weight: 500;
                color: var(--text-color, #333);
            }

            .upgrade-modal .subscription-actions {
                margin-top: 15px;
            }

            .upgrade-modal .unsubscribe-confirm {
                margin-top: 15px;
                padding: 12px;
                border-radius: 8px;
                background-color: rgba(220, 53, 69, 0.1);
                border: 1px solid #dc3545;
            }

            .upgrade-modal .subscription-note {
                font-size: 0.85em;
                color: var(--menu-item-color, #666);
                margin-bottom: 10px;
            }

            .upgrade-modal .confirm-actions {
                display: flex;
                gap: 12px;
            }

            .upgrade-modal .hidden {
                display: none;
            }

            /* Dark Theme Adjustments */
            [data-theme="dark"] .upgrade-modal .upgrade-modal-content {
                background-color: var(--editor-bg, #1e2a3c);
                border-color: var(--menu-border, #3a4a5a);
            }

            [data-theme="dark"] .upgrade-modal .pricing-plan,
            [data-theme="dark"] .upgrade-modal .subscription-info {
                background-color: var(--editor-bg, #1e2a3c);
                border-color: var(--menu-border, #3a4a5a);
            }

            [data-theme="dark"] .upgrade-modal .btn.secondary {
                border-color: var(--menu-border, #3a4a5a);
                color: var(--text-color, #d1d5da);
            }

            [data-theme="dark"] .upgrade-modal .status-message.success {
                background-color: rgba(40, 167, 69, 0.2);
                border-color: #2c974b;
                color: #2c974b;
            }

            [data-theme="dark"] .upgrade-modal .status-message.error {
                background-color: rgba(220, 53, 69, 0.2);
                border-color: #e25563;
                color: #e25563;
            }

            /* Responsive Design */
            @media (max-width: 768px) {
                .upgrade-modal .upgrade-modal-content {
                    width: 95%;
                    margin: 15% auto;
                    padding: 20px;
                }

                .upgrade-modal .upgrade-modal-header h2 {
                    font-size: 1.4em;
                }

                .upgrade-modal .close-modal {
                    font-size: 22px;
                    height: 28px;
                    width: 28px;
                }

                .upgrade-modal .pricing-plan {
                    padding: 15px;
                }

                .upgrade-modal .price {
                    font-size: 1.8em;
                }

                .upgrade-modal .btn {
                    padding: 10px 20px;
                    font-size: 0.85em;
                }

                .upgrade-modal .subscription-info {
                    padding: 15px;
                }
            }
        `;

    // Append the style element to the document head
    document.head.appendChild(modalStyle);

    // Append modal HTML to body
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHTML;
    document.body.appendChild(modalContainer.firstElementChild);

    // Get references to DOM elements
    const upgradeButton = document.getElementById('upgrade');
    const upgradeModal = document.getElementById('upgradeModal');
    const closeModal = upgradeModal.querySelector('.close-modal');
    const statusMessage = document.getElementById('statusMessage');
    const premiumPurchaseBtn = upgradeModal.querySelector('.btn-premium-purchase');
    const subscriptionInfo = document.getElementById('subscriptionInfo');
    const pricingContainer = document.getElementById('pricingContainer');
    const unsubscribeButton = document.getElementById('unsubscribeButton');
    const unsubscribeConfirm = document.getElementById('unsubscribeConfirm');
    const confirmUnsubscribe = document.getElementById('confirmUnsubscribe');
    const cancelUnsubscribe = document.getElementById('cancelUnsubscribe');

    // Show modal when clicking "Upgrade" button
    if (upgradeButton) {
        upgradeButton.addEventListener('click', () => {
            upgradeModal.style.display = 'block';
            checkUserStatus();
        });
    }

    // Close modal when clicking the close button
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            upgradeModal.style.display = 'none';
            statusMessage.classList.remove('success', 'error');
            // Reset unsubscribe confirmation if it was open
            if (!unsubscribeConfirm.classList.contains('hidden')) {
                unsubscribeConfirm.classList.add('hidden');
            }
        });
    }

    // Close modal when clicking outside the modal content
    window.addEventListener('click', (event) => {
        if (event.target === upgradeModal) {
            upgradeModal.style.display = 'none';
            statusMessage.classList.remove('success', 'error');
            // Reset unsubscribe confirmation if it was open
            if (!unsubscribeConfirm.classList.contains('hidden')) {
                unsubscribeConfirm.classList.add('hidden');
            }
        }
    });

    // Premium button click handler
    if (premiumPurchaseBtn) {
        premiumPurchaseBtn.addEventListener('click', function () {
            this.classList.add('clicked');
            setTimeout(() => {
                this.classList.add('hidden');
                document.querySelector('#paypal-button-container-premium').classList.remove('hidden');

                // Initialize PayPal button for Premium Plan if not already initialized
                initPayPalButtons();
            }, 300);
        });
    }

    // Unsubscribe button click handler
    if (unsubscribeButton) {
        unsubscribeButton.addEventListener('click', function () {
            unsubscribeConfirm.classList.remove('hidden');
            this.classList.add('hidden');
        });
    }

    // Cancel unsubscribe button click handler
    if (cancelUnsubscribe) {
        cancelUnsubscribe.addEventListener('click', function () {
            unsubscribeConfirm.classList.add('hidden');
            unsubscribeButton.classList.remove('hidden');
        });
    }

    // Confirm unsubscribe button click handler
    if (confirmUnsubscribe) {
        confirmUnsubscribe.addEventListener('click', function () {
            this.disabled = true;
            this.innerHTML = '<span class="spinner"></span>Processing...';

            // Process unsubscribe request
            fetch('/upgrade/unsubscribe', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                }
            })
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        // Show success message
                        statusMessage.textContent = 'Your subscription has been canceled. Premium features will remain active until the end of your current billing period.';
                        statusMessage.classList.add('success');

                        // Update UI to reflect changes
                        subscriptionInfo.querySelector('.status-badge').textContent = 'Canceling';
                        subscriptionInfo.querySelector('.status-badge').classList.remove('premium');
                        subscriptionInfo.querySelector('.status-badge').classList.add('canceling');

                        // Hide unsubscribe confirmation
                        unsubscribeConfirm.innerHTML = `
                        <div class="unsubscribe-success">
                            <i class="fas fa-check-circle"></i>
                            <p>Your subscription has been canceled.</p>
                            <p class="subscription-note">Your premium access will continue until ${document.getElementById('nextBillingDate').textContent}.</p>
                        </div>
                    `;

                        // Refresh page after 5 seconds
                        setTimeout(() => {
                            window.location.reload();
                        }, 5000);
                    } else {
                        // Show error message
                        statusMessage.textContent = data.error || 'Failed to cancel subscription. Please contact support.';
                        statusMessage.classList.add('error');

                        // Reset UI
                        this.disabled = false;
                        this.innerHTML = 'Yes, Cancel';
                    }
                })
                .catch(error => {
                    console.error('Error canceling subscription:', error);
                    statusMessage.textContent = 'An error occurred while canceling your subscription.';
                    statusMessage.classList.add('error');

                    // Reset UI
                    this.disabled = false;
                    this.innerHTML = 'Yes, Cancel';
                });
        });
    }

    // Initialize PayPal buttons
    function initPayPalButtons() {
        // Wait for PayPal SDK to load
        if (typeof paypal === 'undefined') {
            setTimeout(initPayPalButtons, 100);
            return;
        }

        // Only initialize if not already rendered
        if (!document.querySelector('#paypal-button-container-premium').hasChildNodes()) {
            // PayPal button for Premium Plan
            paypal.Buttons({
                style: {
                    color: 'gold',
                    shape: 'rect',
                    label: 'pay',
                    height: 40
                },
                createOrder: function (data, actions) {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: '20.00'
                            },
                            description: 'Premium Monthly Subscription',
                            payee: {
                                email_address: 'rouzimaimaiti.yusufu@studenti.unicam.it'
                            }
                        }],
                        application_context: {
                            brand_name: 'TyporaX',
                            user_action: 'SUBSCRIBE_NOW',
                            payment_method: {
                                payee_preferred: 'IMMEDIATE_PAYMENT_REQUIRED'
                            }
                        },
                        plan_id: 'YOUR_PAYPAL_SUBSCRIPTION_PLAN_ID'  // Replace with your PayPal plan ID
                    });
                },
                onApprove: function (data, actions) {
                    return actions.order.capture().then(function (details) {
                        // Process the payment on the server
                        return fetch('/upgrade/process-payment', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderId: data.orderID,
                                paymentDetails: details
                            })
                        })
                            .then(response => response.json())
                            .then(serverResponse => {
                                if (serverResponse.success) {
                                    // Get current date
                                    const startDate = new Date();
                                    // Calculate next billing date (1 month from now)
                                    const nextBillingDate = new Date(startDate);
                                    nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

                                    // Format dates
                                    const formattedStartDate = startDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });
                                    const formattedNextBillingDate = nextBillingDate.toLocaleDateString('en-US', {
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                    });

                                    // Show success message
                                    const successMessage = document.createElement('div');
                                    successMessage.className = 'payment-success';
                                    successMessage.innerHTML = `
                                    <i class="fas fa-check-circle"></i>
                                    <h3>Payment Successful!</h3>
                                    <p>Thank you, ${details.payer.name.given_name}! Your premium account has been activated.</p>
                                    <p>Your subscription started on ${formattedStartDate}.</p>
                                    <p>Next billing date: ${formattedNextBillingDate}</p>
                                `;
                                    document.querySelector('#paypal-button-container-premium').replaceWith(successMessage);

                                    // Update status message
                                    statusMessage.textContent = 'Premium account activated successfully';
                                    statusMessage.classList.add('success');

                                    // Store subscription dates in localStorage
                                    localStorage.setItem('subscriptionStartDate', formattedStartDate);
                                    localStorage.setItem('nextBillingDate', formattedNextBillingDate);

                                    // Refresh page after 3 seconds
                                    setTimeout(() => {
                                        window.location.reload();
                                    }, 3000);
                                } else {
                                    // Show error message if server processing failed
                                    statusMessage.textContent = serverResponse.error || 'Failed to activate premium features. Please contact support.';
                                    statusMessage.classList.add('error');
                                }
                            });
                    });
                },
                onError: function (err) {
                    console.error('PayPal error:', err);
                    statusMessage.textContent = 'Payment processing error. Please try again later.';
                    statusMessage.classList.add('error');

                    // Show the subscribe button again
                    document.querySelector('#paypal-button-container-premium').classList.add('hidden');
                    premiumPurchaseBtn.classList.remove('hidden', 'clicked');
                }
            }).render('#paypal-button-container-premium');
        }
    }

    // Check user status
    function checkUserStatus() {
        fetch('/upgrade/status')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    if (data.user_type === 'premium') {
                        // User is already premium
                        showPremiumInfo(data);
                    } else {
                        // User is free
                        showFreeUserInfo();
                    }
                } else {
                    statusMessage.textContent = data.error || 'Failed to retrieve user status.';
                    statusMessage.classList.add('error');
                }
            })
            .catch(error => {
                console.error('Error checking user status:', error);
                statusMessage.textContent = 'An error occurred while checking status.';
                statusMessage.classList.add('error');
            });
    }

    // Show premium user information
    function showPremiumInfo(data) {
        // Hide pricing container
        pricingContainer.classList.add('hidden');

        // Show subscription info
        subscriptionInfo.classList.remove('hidden');

        // Get subscription dates (from API or local storage)
        let startDate = data.subscription_start_date || localStorage.getItem('subscriptionStartDate');
        let nextBillingDate = data.next_billing_date || localStorage.getItem('nextBillingDate');

        // If we don't have data, create placeholder dates
        if (!startDate) {
            // For demo purposes, if no data from server, use some default values
            const today = new Date();
            startDate = today.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Calculate next billing date (1 month from now)
            const nextBilling = new Date(today);
            nextBilling.setMonth(nextBilling.getMonth() + 1);
            nextBillingDate = nextBilling.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });

            // Store dates in local storage
            localStorage.setItem('subscriptionStartDate', startDate);
            localStorage.setItem('nextBillingDate', nextBillingDate);
        }

        // Set subscription details
        document.getElementById('subscriptionStartDate').textContent = startDate;
        document.getElementById('nextBillingDate').textContent = nextBillingDate;

        // Update subscription status based on cancellation status
        if (data.is_canceled) {
            subscriptionInfo.querySelector('.status-badge').textContent = 'Canceling';
            subscriptionInfo.querySelector('.status-badge').classList.remove('premium');
            subscriptionInfo.querySelector('.status-badge').classList.add('canceling');
            unsubscribeButton.style.display = 'none';

            statusMessage.textContent = `Your subscription has been canceled. Premium features will remain active until ${nextBillingDate}.`;
            statusMessage.classList.add('success');
        } else {
            statusMessage.textContent = `You are currently a Premium user with access to all features.`;
            statusMessage.classList.add('success');
        }
    }

    // Show free user information
    function showFreeUserInfo() {
        // Hide subscription info
        subscriptionInfo.classList.add('hidden');

        // Show pricing container
        pricingContainer.classList.remove('hidden');

        statusMessage.textContent = `Current Status: Free User`;
        statusMessage.classList.remove('success', 'error');
    }

    // For local testing: Simulate already having a premium subscription
    // Comment out this section in production
    /* 
    if (localStorage.getItem('debugMode') === 'true') {
        localStorage.setItem('subscriptionStartDate', 'April 15, 2025');
        localStorage.setItem('nextBillingDate', 'May 15, 2025');
    }
    */
});