# BaoMbao Craft - Premium Carpentry Website Design Guide

## 🎨 Mood Board & Inspirations

### Reference Sites
1. **Firewatchgame.com** - Layered parallax depth with 5+ layers creating immersive scroll experiences
2. **Apple.com/airpods-pro** - Product showcases with scroll-driven animations, minimalist premium feel
3. **Roche Bobois** - Luxury furniture presentation, generous whitespace, sophisticated typography
4. **Awwwards.com/sites/resn** - Custom cursors, micro-interactions, buttery-smooth scrolling
5. **Stripe.com** - Clean gradients, subtle animations, premium tech aesthetic

### Visual Direction
- **Feeling**: Walking through a high-end gallery at golden hour
- **Texture**: Visible wood grain, tactile digital surfaces
- **Movement**: Slow, deliberate, luxurious scroll animations
- **Light**: Warm amber accents, soft shadows, depth illusion

---

## 🎨 Color Palette

```css
:root {
  /* Primary Woods */
  --mahogany: #4B3832;
  --walnut: #8B4513;
  --oak-light: #C4A35A;
  --teak: #5C4033;
  
  /* Neutrals */
  --cream: #FAF8F5;
  --off-white: #F5F5F5;
  --charcoal: #2D2D2D;
  --dark-charcoal: #1A1A1A;
  
  /* Accents */
  --gold: #D4AF37;
  --gold-soft: #E8D5A3;
  --copper: #B87333;
  
  /* Functional */
  --success: #4A7C59;
  --error: #8B3A3A;
}
```

---

## 📝 Typography

### Font Stack
```css
/* Headings - Elegant Serif */
font-family: 'Playfair Display', Georgia, serif;

/* Body - Clean Sans-serif */
font-family: 'Montserrat', -apple-system, sans-serif;

/* Accent/Labels */
font-family: 'Cormorant Garamond', serif;
```

### Scale
| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero H1 | 72px (4.5rem) | 500 | 1.1 |
| H2 Sections | 48px (3rem) | 500 | 1.2 |
| H3 Cards | 32px (2rem) | 500 | 1.3 |
| Body Large | 24px (1.5rem) | 400 | 1.6 |
| Body | 18px (1.125rem) | 400 | 1.7 |
| Caption | 14px (0.875rem) | 500 | 1.5 |

---

## 🏗️ Site Architecture

```
HOME (/)
├── Hero Parallax Scene (5 layers)
├── Brand Story Intro
├── Featured Projects Showcase
├── Services Overview
├── Testimonials
├── CTA Section
└── Footer

GALLERY (/gallery)
├── Category Filter
├── Masonry Grid
├── Project Detail Modals
└── Load More / Infinite Scroll

SERVICES (/services)
├── Hero with SVG Icons
├── Service Cards (Parallax)
├── Process Timeline
├── IoT Integration Showcase
└── Pricing/Quote CTA

ABOUT (/about)
├── Founder Story
├── Scroll Timeline
├── Workshop Tour Video
├── Team Section
└── Values/Philosophy

CONTACT (/contact)
├── Hero Map
├── Booking Form (Calendly)
├── Location Details
├── FAQ Accordion
```

---

## ✨ Animation Guidelines

### Scroll Animations
```javascript
// Entry animations trigger at 20% viewport intersection
const observerOptions = {
  threshold: 0.2,
  rootMargin: '0px 0px -10% 0px'
};
```

### Timing Functions
```css
/* Premium easing curves */
--ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
--ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
--ease-in-out-circ: cubic-bezier(0.85, 0, 0.15, 1);

/* Durations */
--duration-fast: 300ms;
--duration-normal: 600ms;
--duration-slow: 1200ms;
--duration-dramatic: 2000ms;
```

### Parallax Layer Speeds
| Layer | Speed | Z-Index | Example |
|-------|-------|---------|---------|
| Background | 0.1 | 1 | Wood texture |
| Mid-back | 0.3 | 2 | Ambient elements |
| Mid | 0.5 | 3 | Supporting images |
| Mid-front | 0.7 | 4 | Product images |
| Foreground | 1.0 | 5 | Text content |

---

## 📱 Responsive Breakpoints

```css
/* Mobile First */
--mobile: 320px;
--mobile-lg: 480px;
--tablet: 768px;
--desktop: 1024px;
--desktop-lg: 1440px;
--ultra-wide: 1920px;
```

---

## 🔧 Technical Implementation

### Lenis Configuration
```javascript
const lenis = new Lenis({
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
```

### Performance Targets
- **LCP**: < 2.5s
- **FID**: < 100ms
- **CLS**: < 0.1
- **PageSpeed Score**: 95+
- **Initial Bundle**: < 150KB (gzipped)

### Asset Optimization
- Images: WebP with AVIF fallback
- Videos: MP4 H.265, max 1080p, 30fps
- SVGs: SVGO optimized, inline critical
- Fonts: Subset, WOFF2, preload critical

---

## 🎯 Conversion Elements

### Primary CTAs
- "Book Consultation" - Gold background, white text
- "View Gallery" - Outline, mahogany border
- "Get Quote" - Floating, glass-morphism effect

### Micro-conversions
- Newsletter signup (value: wood care tips)
- Download lookbook PDF
- Save favorites (session storage)
- Share project functionality

---

## ♿ Accessibility Checklist

- [ ] WCAG 2.1 AA compliant
- [ ] Color contrast 4.5:1 minimum
- [ ] Focus states visible
- [ ] Skip navigation link
- [ ] ARIA labels on interactive elements
- [ ] Reduced motion support
- [ ] Keyboard navigation complete
- [ ] Screen reader tested
- [ ] Alt text on all images

---

## 🛠️ Recommended Tools

| Purpose | Tool |
|---------|------|
| Design | Figma |
| Prototyping | Figma + Protopie |
| SVG Creation | Adobe Illustrator / Figma |
| Image Optimization | Squoosh / ImageOptim |
| Animation | GSAP + Lenis |
| 3D Models | Spline / Three.js |
| Forms | Formspree / Netlify Forms |
| Booking | Calendly embed |
| Analytics | Plausible (privacy-first) |
| Hosting | Vercel / Netlify |

---

## 📋 Next Steps

1. **Phase 1**: Static HTML/CSS/JS prototype (this repo)
2. **Phase 2**: Figma high-fidelity designs
3. **Phase 3**: Photography/video shoot of real woodwork
4. **Phase 4**: IoT integration demos (door lock configurator)
5. **Phase 5**: CMS integration (Sanity/Contentful)
6. **Phase 6**: Launch + SEO optimization

---

*Design Guide Version 1.0 - BaoMbao Craft*
