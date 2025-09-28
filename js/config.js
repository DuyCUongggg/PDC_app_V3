// App Configuration - Easy to modify
const APP_CONFIG = {
    // Logo settings - Change these to update logo throughout the app
    LOGO: {
        // Main logo file (SVG recommended for scalability)
        FILE: 'paw-solid-full.svg',
        
        // Logo dimensions
        WIDTH: 28,
        HEIGHT: 28,
        
        // Logo path (relative to wwwroot)
        PATH: 'img/',
        
        // Full logo URL (automatically generated)
        get URL() {
            return `${this.PATH}${this.FILE}`;
        },
        
        // Logo with cache busting (automatically generated)
        get URL_WITH_VERSION() {
            return `${this.URL}?v=${window.APP_VERSION || '1.0.0'}`;
        }
    },
    
    // App branding
    BRANDING: {
        TITLE: 'AI Sales',
        SUBTITLE: 'Assistant',
        ALT_TEXT: 'Logo'
    }
};

// Export for other modules
window.APP_CONFIG = APP_CONFIG;