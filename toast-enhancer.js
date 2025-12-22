// ST-CustomTheme Toast Enhancer Module
// Enhances toastr notifications with progress bar and copy/close buttons

(function () {
    'use strict';

    // Check if already initialized
    if (window.STToastEnhancer) return;

    window.STToastEnhancer = {
        initialized: false,
        observers: new Map(), // Track multiple observers for different containers
        documentObserver: null,

        init: function () {
            if (this.initialized) return;

            // Override toastr default options
            this.overrideToastrOptions();

            // Start observing for new toasts
            this.startObserver();

            // Backup periodic check - needed as MutationObserver may miss some cases
            setInterval(() => this.scanAndEnhance(), 5000);

            this.initialized = true;
            console.log('ST-CustomTheme: Toast Enhancer initialized');
        },

        overrideToastrOptions: function () {
            if (typeof toastr === 'undefined') {
                setTimeout(() => this.overrideToastrOptions(), 500);
                return;
            }

            // Override the toastr functions to always use our options
            const self = this;
            const originalSuccess = toastr.success;
            const originalError = toastr.error;
            const originalWarning = toastr.warning;
            const originalInfo = toastr.info;

            const enhanceOptions = (options) => {
                return {
                    ...options,
                    progressBar: true,
                    closeButton: false,
                    tapToDismiss: false,
                    onclick: null,
                };
            };

            toastr.success = function (message, title, options) {
                return originalSuccess.call(toastr, message, title, enhanceOptions(options || {}));
            };
            toastr.error = function (message, title, options) {
                return originalError.call(toastr, message, title, enhanceOptions(options || {}));
            };
            toastr.warning = function (message, title, options) {
                return originalWarning.call(toastr, message, title, enhanceOptions(options || {}));
            };
            toastr.info = function (message, title, options) {
                return originalInfo.call(toastr, message, title, enhanceOptions(options || {}));
            };

            // Also set default options
            toastr.options = {
                ...toastr.options,
                progressBar: true,
                closeButton: false,
                tapToDismiss: false,
                onclick: null,
            };
        },

        startObserver: function () {
            // Observe the entire document for any toast containers
            this.documentObserver = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1) {
                            // Check if this is a toast container
                            if (node.id === 'toast-container' || node.classList?.contains('toast-container')) {
                                this.observeContainer(node);
                            }
                            // Check for toasts added anywhere
                            if (node.classList?.contains('toast')) {
                                this.enhanceToast(node);
                            }
                            // Check for nested toast containers or toasts
                            if (node.querySelectorAll) {
                                node.querySelectorAll('#toast-container, .toast-container').forEach(c => {
                                    this.observeContainer(c);
                                });
                                node.querySelectorAll('.toast').forEach(t => {
                                    this.enhanceToast(t);
                                });
                            }
                        }
                    });
                });
            });

            this.documentObserver.observe(document.body, {
                childList: true,
                subtree: true
            });

            // Initial scan
            this.scanAndEnhance();
        },

        observeContainer: function (container) {
            // Skip if already observing this container
            if (this.observers.has(container)) return;

            const observer = new MutationObserver((mutations) => {
                mutations.forEach(mutation => {
                    mutation.addedNodes.forEach(node => {
                        if (node.nodeType === 1 && node.classList.contains('toast')) {
                            this.enhanceToast(node);
                        }
                    });
                });
            });

            observer.observe(container, { childList: true });
            this.observers.set(container, observer);

            // Enhance existing toasts in this container
            container.querySelectorAll('.toast').forEach(toast => {
                this.enhanceToast(toast);
            });
        },

        scanAndEnhance: function () {
            // Find all toast containers and observe them
            document.querySelectorAll('#toast-container, .toast-container').forEach(c => {
                this.observeContainer(c);
            });

            // Enhance any unenhanced toasts
            document.querySelectorAll('.toast:not([data-st-enhanced])').forEach(toast => {
                this.enhanceToast(toast);
            });
        },

        enhanceToast: function (toast) {
            // Mark as enhanced to prevent double processing
            if (toast.hasAttribute('data-st-enhanced')) return;
            toast.setAttribute('data-st-enhanced', 'true');

            // Remove click-to-dismiss behavior
            toast.style.cursor = 'default';

            // Prevent default click behavior
            toast.addEventListener('click', (e) => {
                if (!e.target.closest('.st-toast-btn')) {
                    e.stopPropagation();
                    e.preventDefault();
                }
            }, true);

            // Find the message element
            const messageEl = toast.querySelector('.toast-message');
            if (!messageEl) return;

            // Create button container
            const btnContainer = document.createElement('div');
            btnContainer.className = 'st-toast-buttons';

            // Copy button
            const copyBtn = document.createElement('button');
            copyBtn.className = 'st-toast-btn st-toast-copy';
            copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
            copyBtn.title = '내용 복사';
            copyBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.copyToastContent(toast);
            });

            // Close button
            const closeBtn = document.createElement('button');
            closeBtn.className = 'st-toast-btn st-toast-close';
            closeBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
            closeBtn.title = '닫기';
            closeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.closeToast(toast);
            });

            btnContainer.appendChild(copyBtn);
            btnContainer.appendChild(closeBtn);
            toast.appendChild(btnContainer);
        },

        copyToastContent: function (toast) {
            const title = toast.querySelector('.toast-title');
            const message = toast.querySelector('.toast-message');

            let content = '';
            if (title) content += title.textContent + '\n';
            if (message) content += message.textContent;

            navigator.clipboard.writeText(content.trim()).then(() => {
                const copyBtn = toast.querySelector('.st-toast-copy');
                if (copyBtn) {
                    copyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                    setTimeout(() => {
                        copyBtn.innerHTML = '<i class="fa-solid fa-copy"></i>';
                    }, 1500);
                }
                // Auto-close toast 2 seconds after copy (since toastr timer may be stuck)
                setTimeout(() => {
                    if (toast.parentNode) {
                        this.closeToast(toast);
                    }
                }, 2000);
            }).catch(err => {
                console.error('Failed to copy toast content:', err);
            });
        },

        closeToast: function (toast) {
            toast.style.transition = 'opacity 0.3s ease';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            window.STToastEnhancer.init();
        });
    } else {
        window.STToastEnhancer.init();
    }
})();
