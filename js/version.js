// Version configuration - Single source of truth
const APP_VERSION = '2.1.0';

// Auto-update version in HTML
document.addEventListener('DOMContentLoaded', function() {
    // Update version badge
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) {
        versionBadge.textContent = `v${APP_VERSION}`;
    }
    
    // Update CSS version parameter
    const cssLink = document.querySelector('link[href*="styles.css"]');
    if (cssLink) {
        cssLink.href = cssLink.href.replace(/v=\d+\.\d+\.\d+\.\d+/, `v=${APP_VERSION}`);
    }
    
    // Wait a bit for config to load, then update logo
    setTimeout(() => {
    if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Updating logo from config...', window.APP_CONFIG);
        
        // Update logo with current config (if config is loaded)
        const logoImg = document.querySelector('.logo-img');
        if (logoImg && window.APP_CONFIG) {
            const newSrc = window.APP_CONFIG.LOGO.URL_WITH_VERSION;
            if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Updating logo src from', logoImg.src, 'to', newSrc);
            logoImg.src = newSrc;
            logoImg.width = window.APP_CONFIG.LOGO.WIDTH;
            logoImg.height = window.APP_CONFIG.LOGO.HEIGHT;
            logoImg.alt = window.APP_CONFIG.BRANDING.ALT_TEXT;
        }
        
        // Update favicon with current config
        const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
        if (window.APP_CONFIG) {
            faviconLinks.forEach(link => {
                const newHref = window.APP_CONFIG.LOGO.URL_WITH_VERSION;
                if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Updating favicon from', link.href, 'to', newHref);
                link.href = newHref;
            });
        }
    }, 500);

    // Store in localStorage
    localStorage.setItem('pdc_app_version', APP_VERSION);
});

// Export for other modules
window.APP_VERSION = APP_VERSION;

// Force update logo function
window.forceUpdateLogo = function() {
    if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Force updating logo...', window.APP_CONFIG);
    
    if (!window.APP_CONFIG) {
        console.error('APP_CONFIG not loaded yet!');
        return;
    }
    
    // Update logo image
    const logoImg = document.querySelector('.logo-img');
    if (logoImg) {
        const newSrc = window.APP_CONFIG.LOGO.URL_WITH_VERSION;
        if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Forcing logo update from', logoImg.src, 'to', newSrc);
        logoImg.src = newSrc;
        logoImg.width = window.APP_CONFIG.LOGO.WIDTH;
        logoImg.height = window.APP_CONFIG.LOGO.HEIGHT;
        logoImg.alt = window.APP_CONFIG.BRANDING.ALT_TEXT;
    }
    
    // Update favicon
    const faviconLinks = document.querySelectorAll('link[rel*="icon"]');
    faviconLinks.forEach(link => {
        const newHref = window.APP_CONFIG.LOGO.URL_WITH_VERSION;
        if (window.__PDC_DEBUG__ && console.log.__original) console.log.__original('Forcing favicon update from', link.href, 'to', newHref);
        link.href = newHref;
    });
};
