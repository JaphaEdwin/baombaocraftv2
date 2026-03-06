/**
 * BaoMbao Craft - Main JavaScript
 * Premium woodwork website interactions and animations
 * 
 * Features:
 * - Lenis smooth scrolling
 * - GSAP scroll-triggered animations
 * - Custom cursor
 * - Mobile menu
 * - Gallery filtering
 * - Form handling
 * - Testimonial slider
 * - Counter animations
 */

(function() {
    'use strict';

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ========================================
    // LENIS SMOOTH SCROLL
    // ========================================

    let lenis = null;

    function initLenis() {
        if (prefersReducedMotion) {
            console.log('Lenis disabled: User prefers reduced motion');
            return;
        }

        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            direction: 'vertical',
            gestureDirection: 'vertical',
            smooth: true,
            mouseMultiplier: 1,
            smoothTouch: false,
            touchMultiplier: 2,
            infinite: false,
        });

        // Expose lenis globally for other scripts
        window.lenis = lenis;

        // Animation frame loop
        function raf(time) {
            lenis.raf(time);
            requestAnimationFrame(raf);
        }
        requestAnimationFrame(raf);

        // Connect to GSAP ScrollTrigger if available
        if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
            lenis.on('scroll', ScrollTrigger.update);

            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });

            gsap.ticker.lagSmoothing(0);
        }

        console.log('Lenis smooth scroll initialized');
    }

    // ========================================
    // SCROLL ANIMATIONS
    // ========================================

    function initScrollAnimations() {
        // Get all elements to animate
        const animatedElements = document.querySelectorAll('.animate-on-scroll, .animate-fade-up');

        if (animatedElements.length === 0) return;

        // Create intersection observer
        const observerOptions = {
            root: null,
            rootMargin: '0px 0px -10% 0px',
            threshold: 0.1
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Add visible class with optional delay
                    const delay = entry.target.dataset.delay || 0;
                    setTimeout(() => {
                        entry.target.classList.add('is-visible');
                    }, parseInt(delay));

                    // Stop observing once animated
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe all animated elements
        animatedElements.forEach(el => observer.observe(el));
    }

    // ========================================
    // GSAP SCROLL TRIGGERS (if GSAP is available)
    // ========================================

    function initGSAPAnimations() {
        if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
            console.log('GSAP not available, using CSS animations');
            return;
        }

        gsap.registerPlugin(ScrollTrigger);

        // Hero title animation
        const heroTitle = document.querySelector('.hero__title');
        if (heroTitle) {
            gsap.from('.hero__title-line', {
                y: 100,
                opacity: 0,
                duration: 1,
                stagger: 0.15,
                ease: 'power4.out',
                delay: 0.5
            });
        }

        // Process timeline animation
        const processTimeline = document.querySelector('.process__timeline');
        if (processTimeline) {
            gsap.to('.process__line-progress', {
                height: '100%',
                ease: 'none',
                scrollTrigger: {
                    trigger: '.process__timeline',
                    start: 'top center',
                    end: 'bottom center',
                    scrub: 1
                }
            });
        }

        // Parallax effects for images
        gsap.utils.toArray('.story__image--main').forEach(img => {
            gsap.to(img, {
                y: -50,
                ease: 'none',
                scrollTrigger: {
                    trigger: img,
                    start: 'top bottom',
                    end: 'bottom top',
                    scrub: 1
                }
            });
        });

        // Gallery items stagger
        ScrollTrigger.batch('.showroom__item', {
            onEnter: elements => {
                gsap.from(elements, {
                    y: 60,
                    opacity: 0,
                    duration: 0.8,
                    stagger: 0.15,
                    ease: 'power3.out'
                });
            },
            once: true
        });

        // Service cards
        ScrollTrigger.batch('.service-card', {
            onEnter: elements => {
                gsap.from(elements, {
                    y: 40,
                    opacity: 0,
                    duration: 0.6,
                    stagger: 0.1,
                    ease: 'power2.out'
                });
            },
            once: true
        });
    }

    // ========================================
    // CUSTOM CURSOR
    // ========================================

    function initCustomCursor() {
        // Only on devices with fine pointer (mouse)
        if (!window.matchMedia('(pointer: fine)').matches) return;

        const cursor = document.querySelector('.cursor');
        const cursorDot = document.querySelector('.cursor-dot');
        const cursorOutline = document.querySelector('.cursor-outline');

        if (!cursor || !cursorDot || !cursorOutline) return;

        let mouseX = 0;
        let mouseY = 0;
        let dotX = 0;
        let dotY = 0;
        let outlineX = 0;
        let outlineY = 0;

        // Track mouse position
        document.addEventListener('mousemove', (e) => {
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        // Animate cursor
        function animateCursor() {
            // Dot follows instantly
            dotX = mouseX;
            dotY = mouseY;
            cursorDot.style.left = dotX + 'px';
            cursorDot.style.top = dotY + 'px';

            // Outline follows with delay
            outlineX += (mouseX - outlineX) * 0.15;
            outlineY += (mouseY - outlineY) * 0.15;
            cursorOutline.style.left = outlineX + 'px';
            cursorOutline.style.top = outlineY + 'px';

            requestAnimationFrame(animateCursor);
        }
        animateCursor();

        // Hover states
        const hoverElements = document.querySelectorAll('a, button, .showroom__item, input, textarea, select');
        
        hoverElements.forEach(el => {
            el.addEventListener('mouseenter', () => cursor.classList.add('cursor--hover'));
            el.addEventListener('mouseleave', () => cursor.classList.remove('cursor--hover'));
        });

        // Click state
        document.addEventListener('mousedown', () => cursor.classList.add('cursor--click'));
        document.addEventListener('mouseup', () => cursor.classList.remove('cursor--click'));

        // Hide when leaving window
        document.addEventListener('mouseleave', () => cursor.style.opacity = '0');
        document.addEventListener('mouseenter', () => cursor.style.opacity = '1');
    }

    // ========================================
    // HEADER SCROLL BEHAVIOR
    // ========================================

    function initHeader() {
        const header = document.querySelector('.header');
        if (!header) return;

        let lastScrollY = 0;
        const scrollThreshold = 50;

        function updateHeader() {
            const scrollY = window.scrollY || lenis?.scroll || 0;

            // Add scrolled class for background
            if (scrollY > scrollThreshold) {
                header.classList.add('header--scrolled');
            } else {
                header.classList.remove('header--scrolled');
            }

            // Detect if we're in dark section
            const darkSections = document.querySelectorAll('.section--dark');
            let inDarkSection = false;

            darkSections.forEach(section => {
                const rect = section.getBoundingClientRect();
                if (rect.top <= 80 && rect.bottom >= 80) {
                    inDarkSection = true;
                }
            });

            if (inDarkSection) {
                header.classList.add('header--dark');
            } else {
                header.classList.remove('header--dark');
            }

            lastScrollY = scrollY;
        }

        // Use Lenis scroll event or fallback
        if (lenis) {
            lenis.on('scroll', updateHeader);
        } else {
            window.addEventListener('scroll', updateHeader, { passive: true });
        }

        // Initial check
        updateHeader();
    }

    // ========================================
    // MOBILE MENU
    // ========================================

    function initMobileMenu() {
        const toggle = document.getElementById('nav-toggle');
        const menu = document.getElementById('mobile-menu');
        const links = menu?.querySelectorAll('.mobile-menu__link');

        if (!toggle || !menu) return;

        function openMenu() {
            toggle.setAttribute('aria-expanded', 'true');
            menu.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            
            // Pause Lenis scrolling
            if (lenis) lenis.stop();
        }

        function closeMenu() {
            toggle.setAttribute('aria-expanded', 'false');
            menu.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            
            // Resume Lenis scrolling
            if (lenis) lenis.start();
        }

        toggle.addEventListener('click', () => {
            const isOpen = toggle.getAttribute('aria-expanded') === 'true';
            if (isOpen) {
                closeMenu();
            } else {
                openMenu();
            }
        });

        // Close on link click
        links?.forEach(link => {
            link.addEventListener('click', closeMenu);
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
                closeMenu();
            }
        });
    }

    // ========================================
    // SHOWROOM CAROUSEL
    // ========================================

    function initShowroomCarousel() {
        const carousel = document.getElementById('showroom-carousel');
        if (!carousel) return;

        const track = carousel.querySelector('.showroom__track');
        const slides = track.querySelectorAll('.showroom__slide');
        const prevBtn = document.querySelector('.showroom__nav-btn--prev');
        const nextBtn = document.querySelector('.showroom__nav-btn--next');
        const progressBar = document.querySelector('.showroom__progress-bar');

        if (slides.length === 0) return;

        // Clone slides for infinite scroll effect
        slides.forEach(slide => {
            const clone = slide.cloneNode(true);
            track.appendChild(clone);
        });

        // Calculate slide width for navigation
        const getSlideWidth = () => {
            const slide = track.querySelector('.showroom__slide');
            const style = window.getComputedStyle(slide);
            const gap = parseInt(window.getComputedStyle(track).gap) || 32;
            return slide.offsetWidth + gap;
        };

        let isHovered = false;
        let scrollPosition = 0;
        let animationId = null;

        // Pause animation on hover
        track.addEventListener('mouseenter', () => {
            isHovered = true;
            track.style.animationPlayState = 'paused';
            if (progressBar) progressBar.style.animationPlayState = 'paused';
        });

        track.addEventListener('mouseleave', () => {
            isHovered = false;
            track.style.animationPlayState = 'running';
            if (progressBar) progressBar.style.animationPlayState = 'running';
        });

        // Navigation buttons
        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                const slideWidth = getSlideWidth();
                track.style.animation = 'none';
                const currentTranslate = getComputedStyle(track).transform;
                const matrix = new DOMMatrix(currentTranslate);
                scrollPosition = matrix.m41 + slideWidth;
                
                // Prevent scrolling past start
                if (scrollPosition > 0) scrollPosition = 0;
                
                track.style.transform = `translateX(${scrollPosition}px)`;
                
                // Resume animation after a delay
                setTimeout(() => {
                    if (!isHovered) {
                        track.style.transform = '';
                        track.style.animation = '';
                    }
                }, 3000);
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                const slideWidth = getSlideWidth();
                track.style.animation = 'none';
                const currentTranslate = getComputedStyle(track).transform;
                const matrix = new DOMMatrix(currentTranslate);
                scrollPosition = matrix.m41 - slideWidth;
                
                // Calculate max scroll
                const maxScroll = -(track.scrollWidth / 2);
                if (scrollPosition < maxScroll) scrollPosition = 0;
                
                track.style.transform = `translateX(${scrollPosition}px)`;
                
                // Resume animation after a delay
                setTimeout(() => {
                    if (!isHovered) {
                        track.style.transform = '';
                        track.style.animation = '';
                    }
                }, 3000);
            });
        }

        // Touch/drag support for mobile
        let isDragging = false;
        let startX = 0;
        let currentX = 0;

        track.addEventListener('touchstart', (e) => {
            isDragging = true;
            startX = e.touches[0].clientX;
            track.style.animationPlayState = 'paused';
            if (progressBar) progressBar.style.animationPlayState = 'paused';
        }, { passive: true });

        track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
            const diff = currentX - startX;
            track.style.animation = 'none';
            const currentTranslate = getComputedStyle(track).transform;
            const matrix = new DOMMatrix(currentTranslate);
            track.style.transform = `translateX(${matrix.m41 + diff}px)`;
            startX = currentX;
        }, { passive: true });

        track.addEventListener('touchend', () => {
            isDragging = false;
            // Resume animation after a delay
            setTimeout(() => {
                track.style.transform = '';
                track.style.animation = '';
                track.style.animationPlayState = 'running';
                if (progressBar) progressBar.style.animationPlayState = 'running';
            }, 2000);
        });

        console.log('Showroom carousel initialized');
    }

    // ========================================
    // GALLERY FILTER
    // ========================================

    function initGalleryFilter() {
        const filters = document.querySelectorAll('.gallery__filter');
        const items = document.querySelectorAll('.gallery__item');
        const grid = document.querySelector('.gallery__grid');

        if (filters.length === 0 || items.length === 0) return;

        filters.forEach(filter => {
            filter.addEventListener('click', () => {
                const category = filter.dataset.filter;

                // Update active filter
                filters.forEach(f => {
                    f.classList.remove('active');
                    f.setAttribute('aria-selected', 'false');
                });
                filter.classList.add('active');
                filter.setAttribute('aria-selected', 'true');

                // Filter items with animation
                items.forEach(item => {
                    const itemCategory = item.dataset.category || '';
                    
                    if (category === 'all' || itemCategory === category) {
                        item.style.opacity = '1';
                        item.style.transform = 'scale(1)';
                        item.style.display = '';
                    } else {
                        item.style.opacity = '0';
                        item.style.transform = 'scale(0.8)';
                        setTimeout(() => {
                            if (!item.classList.contains('active')) {
                                item.style.display = 'none';
                            }
                        }, 300);
                    }
                });

                // Update filter counts visibility
                const visibleItems = document.querySelectorAll('.gallery__item[style*="display: none"]');
                console.log(`Gallery filter: ${category}, showing ${items.length - visibleItems.length} items`);
            });
        });

        // Add transition styles to items
        items.forEach(item => {
            item.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        });

        console.log('Gallery filter initialized');
    }

    // ========================================
    // TESTIMONIAL SLIDER
    // ========================================

    function initTestimonialSlider() {
        const track = document.querySelector('.testimonials__track');
        const testimonials = document.querySelectorAll('.testimonial');
        const prevBtn = document.querySelector('.testimonials__arrow--prev');
        const nextBtn = document.querySelector('.testimonials__arrow--next');
        const dots = document.querySelectorAll('.testimonials__dot');

        if (!track || testimonials.length === 0) return;

        let currentIndex = 0;
        const total = testimonials.length;

        function updateSlider() {
            // Move track
            track.style.transform = `translateX(-${currentIndex * 100}%)`;

            // Update dots
            dots.forEach((dot, i) => {
                dot.classList.toggle('active', i === currentIndex);
                dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
            });
        }

        function goTo(index) {
            currentIndex = Math.max(0, Math.min(index, total - 1));
            updateSlider();
        }

        function next() {
            goTo((currentIndex + 1) % total);
        }

        function prev() {
            goTo((currentIndex - 1 + total) % total);
        }

        prevBtn?.addEventListener('click', prev);
        nextBtn?.addEventListener('click', next);

        dots.forEach((dot, i) => {
            dot.addEventListener('click', () => goTo(i));
        });

        // Auto-play (optional)
        let autoplayInterval = setInterval(next, 6000);

        // Pause on hover
        track.addEventListener('mouseenter', () => clearInterval(autoplayInterval));
        track.addEventListener('mouseleave', () => {
            autoplayInterval = setInterval(next, 6000);
        });

        // Initialize
        updateSlider();
    }

    // ========================================
    // COUNTER ANIMATION
    // ========================================

    function initCounters() {
        const counters = document.querySelectorAll('[data-count]');
        if (counters.length === 0) return;

        const observerOptions = {
            threshold: 0.5
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateCounter(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        counters.forEach(counter => observer.observe(counter));

        function animateCounter(element) {
            const target = parseInt(element.dataset.count);
            const duration = 2000;
            const startTime = performance.now();

            function update(currentTime) {
                const elapsed = currentTime - startTime;
                const progress = Math.min(elapsed / duration, 1);
                
                // Easing function
                const easeOutQuart = 1 - Math.pow(1 - progress, 4);
                const current = Math.round(easeOutQuart * target);

                element.textContent = current;

                if (progress < 1) {
                    requestAnimationFrame(update);
                }
            }

            requestAnimationFrame(update);
        }
    }

    // ========================================
    // MODAL
    // ========================================

    function initModal() {
        const modal = document.getElementById('project-modal');
        if (!modal) return;

        const closeButtons = modal.querySelectorAll('[data-close-modal]');
        const showcaseItems = document.querySelectorAll('.showroom__item-cta, .showroom__hotspot');

        function openModal(data = {}) {
            modal.setAttribute('aria-hidden', 'false');
            document.body.style.overflow = 'hidden';
            if (lenis) lenis.stop();

            // Populate modal with data if provided
            if (data.title) {
                modal.querySelector('.modal__title').textContent = data.title;
            }
            if (data.category) {
                modal.querySelector('.modal__category').textContent = data.category;
            }
            if (data.description) {
                modal.querySelector('.modal__description').textContent = data.description;
            }
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
            if (lenis) lenis.start();
        }

        // Open modal from showcase items
        showcaseItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const card = item.closest('.showroom__item');
                const data = {
                    title: card.querySelector('.showroom__item-title')?.textContent,
                    category: card.querySelector('.showroom__item-category')?.textContent,
                    description: card.querySelector('.showroom__item-description')?.textContent
                };
                openModal(data);
            });
        });

        // Close modal
        closeButtons.forEach(btn => {
            btn.addEventListener('click', closeModal);
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && modal.getAttribute('aria-hidden') === 'false') {
                closeModal();
            }
        });
    }

    // ========================================
    // FORM HANDLING
    // ========================================

    function initForms() {
        const contactForm = document.getElementById('contact-form');
        const newsletterForms = document.querySelectorAll('.footer__newsletter-form');

        if (contactForm) {
            contactForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                const submitBtn = contactForm.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                
                // Show loading state
                submitBtn.innerHTML = '<span>Sending...</span>';
                submitBtn.disabled = true;

                // Simulate form submission (replace with actual API call)
                try {
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Success
                    submitBtn.innerHTML = '<span>Message Sent!</span>';
                    contactForm.reset();
                    
                    setTimeout(() => {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }, 3000);

                } catch (error) {
                    submitBtn.innerHTML = '<span>Error - Try Again</span>';
                    setTimeout(() => {
                        submitBtn.innerHTML = originalText;
                        submitBtn.disabled = false;
                    }, 3000);
                }
            });
        }

        newsletterForms.forEach(form => {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const input = form.querySelector('input[type="email"]');
                const btn = form.querySelector('button');
                
                // Simulate subscription
                btn.innerHTML = '✓';
                input.value = 'Subscribed!';
                input.disabled = true;
                
                setTimeout(() => {
                    input.value = '';
                    input.disabled = false;
                    btn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
                }, 3000);
            });
        });
    }

    // ========================================
    // SMOOTH ANCHOR SCROLLING
    // ========================================

    function initSmoothAnchors() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (!target) return;

                e.preventDefault();

                const headerHeight = document.querySelector('.header')?.offsetHeight || 0;
                const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;

                if (lenis) {
                    lenis.scrollTo(target, {
                        offset: -headerHeight,
                        duration: 1.5,
                        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
                    });
                } else {
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    // ========================================
    // SCROLL PROGRESS INDICATOR
    // ========================================

    function initScrollProgress() {
        const progressBar = document.createElement('div');
        progressBar.className = 'scroll-progress';
        document.body.appendChild(progressBar);

        function updateProgress() {
            const scrollY = window.scrollY || lenis?.scroll || 0;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const progress = (scrollY / docHeight) * 100;
            progressBar.style.width = progress + '%';
        }

        if (lenis) {
            lenis.on('scroll', updateProgress);
        } else {
            window.addEventListener('scroll', updateProgress, { passive: true });
        }
    }

    // ========================================
    // LAZY LOADING IMAGES
    // ========================================

    function initLazyLoading() {
        // Native lazy loading fallback
        if ('loading' in HTMLImageElement.prototype) {
            document.querySelectorAll('img[loading="lazy"]').forEach(img => {
                img.src = img.dataset.src || img.src;
            });
        } else {
            // Intersection Observer fallback
            const lazyImages = document.querySelectorAll('img[data-src]');
            
            const imageObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                        imageObserver.unobserve(img);
                    }
                });
            });

            lazyImages.forEach(img => imageObserver.observe(img));
        }
    }

    // ========================================
    // MAGNETIC BUTTONS (Optional Enhancement)
    // ========================================

    function initMagneticButtons() {
        if (prefersReducedMotion || !window.matchMedia('(pointer: fine)').matches) return;

        const magneticElements = document.querySelectorAll('.btn--magnetic, .btn--primary');
        
        magneticElements.forEach(el => {
            el.addEventListener('mousemove', (e) => {
                const rect = el.getBoundingClientRect();
                const x = e.clientX - rect.left - rect.width / 2;
                const y = e.clientY - rect.top - rect.height / 2;
                
                el.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
            });

            el.addEventListener('mouseleave', () => {
                el.style.transform = '';
            });
        });
    }

    // ========================================
    // INITIALIZE ALL
    // ========================================

    function init() {
        console.log('Initializing BaoMbao Craft website...');

        // Core functionality
        initLenis();
        initScrollAnimations();
        initGSAPAnimations();
        initHeader();
        initMobileMenu();
        initSmoothAnchors();

        // Interactive features
        initCustomCursor();
        initShowroomCarousel();
        initTestimonialSlider();
        initGalleryFilter();
        initCounters();
        initModal();
        initForms();

        // Enhancements
        initScrollProgress();
        initLazyLoading();
        initMagneticButtons();

        console.log('BaoMbao Craft website initialized successfully!');
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose functions globally if needed
    window.BaoMbao = {
        lenis: () => lenis,
        scrollTo: (target, options) => {
            if (lenis) {
                lenis.scrollTo(target, options);
            }
        }
    };

})();
