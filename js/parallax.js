/**
 * BaoMbao Craft - Custom Parallax System
 * Smooth parallax effects with Lenis integration
 * 
 * Features:
 * - Multi-layer parallax with different speeds
 * - 3D depth perception using CSS perspective
 * - Performance optimized with RAF and will-change
 * - Reduced motion support
 */

(function() {
    'use strict';

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Parallax configuration
    const config = {
        // Speed multipliers for each layer depth
        defaultSpeed: 0.5,
        // Smoothing factor (0-1, higher = less smooth but more responsive)
        smoothing: 0.1,
        // Whether to enable 3D transforms
        enable3D: true,
        // Perspective value for 3D effect
        perspective: 1000,
        // Maximum offset to prevent extreme movements
        maxOffset: 200
    };

    // Store parallax elements and their properties
    let parallaxElements = [];
    let scrollY = 0;
    let targetScrollY = 0;
    let ticking = false;

    /**
     * ParallaxLayer class for managing individual parallax elements
     */
    class ParallaxLayer {
        constructor(element) {
            this.element = element;
            this.speed = parseFloat(element.dataset.speed) || config.defaultSpeed;
            this.direction = element.dataset.direction || 'vertical';
            this.reverse = element.dataset.reverse === 'true';
            this.currentOffset = 0;
            this.targetOffset = 0;
            
            // Get element bounds
            this.updateBounds();
            
            // Cache original transform
            this.originalTransform = getComputedStyle(element).transform;
            if (this.originalTransform === 'none') {
                this.originalTransform = '';
            }
        }

        updateBounds() {
            const rect = this.element.getBoundingClientRect();
            this.top = rect.top + window.scrollY;
            this.height = rect.height;
            this.windowHeight = window.innerHeight;
        }

        calculate(scrollPosition) {
            // Calculate how far through the element we've scrolled
            const elementMiddle = this.top + this.height / 2;
            const viewportMiddle = scrollPosition + this.windowHeight / 2;
            const distanceFromCenter = viewportMiddle - elementMiddle;
            
            // Calculate offset based on speed
            let offset = distanceFromCenter * (1 - this.speed);
            
            // Apply reverse if needed
            if (this.reverse) {
                offset = -offset;
            }
            
            // Clamp to max offset
            offset = Math.max(-config.maxOffset, Math.min(config.maxOffset, offset));
            
            this.targetOffset = offset;
        }

        update() {
            // Smooth interpolation
            this.currentOffset += (this.targetOffset - this.currentOffset) * config.smoothing;
            
            // Apply transform
            let transform = '';
            
            if (this.direction === 'vertical') {
                transform = `translateY(${this.currentOffset}px)`;
            } else if (this.direction === 'horizontal') {
                transform = `translateX(${this.currentOffset}px)`;
            } else if (this.direction === 'both') {
                transform = `translate(${this.currentOffset * 0.5}px, ${this.currentOffset}px)`;
            }
            
            // Add 3D depth if enabled
            if (config.enable3D && this.speed < 1) {
                const zDepth = (1 - this.speed) * -50;
                const scale = 1 + Math.abs(zDepth) / config.perspective;
                transform += ` translateZ(${zDepth}px) scale(${scale})`;
            }
            
            this.element.style.transform = transform;
        }

        reset() {
            this.element.style.transform = this.originalTransform || '';
        }
    }

    /**
     * Initialize parallax system
     */
    function init() {
        // Don't initialize if reduced motion is preferred
        if (prefersReducedMotion) {
            console.log('Parallax disabled: User prefers reduced motion');
            return;
        }

        // Find all parallax elements
        const elements = document.querySelectorAll('.parallax-layer, [data-parallax]');
        
        elements.forEach(el => {
            parallaxElements.push(new ParallaxLayer(el));
        });

        if (parallaxElements.length === 0) {
            console.log('No parallax elements found');
            return;
        }

        console.log(`Parallax initialized with ${parallaxElements.length} elements`);

        // Set up scroll listener
        setupScrollListener();

        // Handle resize
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                parallaxElements.forEach(layer => layer.updateBounds());
            }, 200);
        });

        // Initial update
        targetScrollY = window.scrollY;
        scrollY = targetScrollY;
        updateParallax();
    }

    /**
     * Set up scroll listener with Lenis integration
     */
    function setupScrollListener() {
        // If Lenis is available, use its scroll event
        if (window.lenis) {
            window.lenis.on('scroll', ({ scroll }) => {
                targetScrollY = scroll;
                requestUpdate();
            });
        } else {
            // Fallback to native scroll
            window.addEventListener('scroll', () => {
                targetScrollY = window.scrollY;
                requestUpdate();
            }, { passive: true });
        }

        // Start animation loop
        animate();
    }

    /**
     * Request animation frame update
     */
    function requestUpdate() {
        if (!ticking) {
            ticking = true;
        }
    }

    /**
     * Animation loop
     */
    function animate() {
        if (ticking) {
            // Smooth scroll value interpolation
            scrollY += (targetScrollY - scrollY) * config.smoothing;
            
            // Update all parallax elements
            updateParallax();
            
            // Check if we've reached target
            if (Math.abs(targetScrollY - scrollY) < 0.5) {
                ticking = false;
            }
        }

        requestAnimationFrame(animate);
    }

    /**
     * Update all parallax elements
     */
    function updateParallax() {
        parallaxElements.forEach(layer => {
            layer.calculate(scrollY);
            layer.update();
        });
    }

    /**
     * Destroy parallax system
     */
    function destroy() {
        parallaxElements.forEach(layer => layer.reset());
        parallaxElements = [];
    }

    /**
     * Add element to parallax system dynamically
     */
    function add(element) {
        if (prefersReducedMotion) return;
        
        const layer = new ParallaxLayer(element);
        parallaxElements.push(layer);
        return layer;
    }

    /**
     * Remove element from parallax system
     */
    function remove(element) {
        const index = parallaxElements.findIndex(layer => layer.element === element);
        if (index > -1) {
            parallaxElements[index].reset();
            parallaxElements.splice(index, 1);
        }
    }

    // Expose API
    window.BaoMbaoParallax = {
        init,
        destroy,
        add,
        remove,
        config
    };

    // Auto-initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();

/**
 * Hero-specific parallax controller
 * Manages the 5-layer hero parallax scene
 */
const HeroParallax = (function() {
    'use strict';

    let heroSection = null;
    let layers = [];
    let isInView = false;

    const speeds = {
        1: 0.1,   // Deepest - slowest
        2: 0.25,
        3: 0.5,
        4: 0.7,
        5: 1.0    // Foreground - normal speed
    };

    function init() {
        heroSection = document.querySelector('.hero');
        if (!heroSection) return;

        // Get all hero layers
        for (let i = 1; i <= 5; i++) {
            const layer = heroSection.querySelector(`.hero__layer--${i}`);
            if (layer) {
                layers.push({
                    element: layer,
                    speed: speeds[i],
                    currentY: 0,
                    targetY: 0
                });
            }
        }

        // Set up intersection observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                isInView = entry.isIntersecting;
            });
        }, { threshold: 0 });

        observer.observe(heroSection);

        // If Lenis is available, hook into its scroll
        if (window.lenis) {
            window.lenis.on('scroll', updateHeroParallax);
        } else {
            window.addEventListener('scroll', () => {
                updateHeroParallax({ scroll: window.scrollY });
            }, { passive: true });
        }
    }

    function updateHeroParallax({ scroll }) {
        if (!isInView) return;

        const heroHeight = heroSection.offsetHeight;
        const scrollProgress = Math.min(scroll / heroHeight, 1);

        layers.forEach((layer, index) => {
            // Calculate offset based on layer speed
            const offset = scroll * (1 - layer.speed);
            layer.targetY = offset;

            // Smooth interpolation
            layer.currentY += (layer.targetY - layer.currentY) * 0.1;

            // Apply transform with 3D depth
            const zOffset = (1 - layer.speed) * -50;
            const scale = 1 + (1 - layer.speed) * 0.05;
            
            layer.element.style.transform = `
                translateY(${layer.currentY}px) 
                translateZ(${zOffset}px) 
                scale(${scale})
            `;

            // Fade out deeper layers as we scroll
            if (index < 3) {
                const opacity = 1 - scrollProgress * 0.5;
                layer.element.style.opacity = opacity;
            }
        });
    }

    return { init };
})();

// Initialize hero parallax
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', HeroParallax.init);
} else {
    HeroParallax.init();
}
