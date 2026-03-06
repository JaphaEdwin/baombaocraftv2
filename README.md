# BaoMbao Craft - Premium Woodwork Website

A virtual showroom website for BaoMbao Craft, Uganda's premier bespoke woodwork studio. This ultra-premium website replaces the need for physical showroom visits by providing an immersive, high-end digital experience.

## Features

- **5-Layer Parallax Hero** - Custom parallax system with configurable depth speeds
- **Lenis Smooth Scrolling** - Buttery smooth inertial scrolling
- **GSAP Animations** - ScrollTrigger-powered scroll-driven animations
- **Custom Cursor** - Magnetic, context-aware cursor effects
- **Virtual Showroom Gallery** - Masonry grid with category filtering
- **Responsive Design** - Mobile-first approach with breakpoints at 768px, 1024px, 1200px, 1440px
- **Accessibility** - WCAG 2.1 AA compliant with reduced motion support
- **SVG Graphics** - Vector-based icons, patterns, and logo

## Pages

| Page | Description |
|------|-------------|
| `index.html` | Main landing page with hero, services, process, testimonials, contact |
| `gallery.html` | Portfolio showroom with filtering and masonry layout |
| `about.html` | Company story, timeline, team, and values |

## Project Structure

```
BaoMbao/
├── index.html              # Main landing page
├── gallery.html            # Portfolio gallery
├── about.html              # Our Story page
├── image-preview.html      # Image audit/preview tool
├── DESIGN-GUIDE.md         # Design documentation & mood board
├── README.md               # This file
├── css/
│   ├── style.css           # Main stylesheet (~1300 lines)
│   ├── animations.css      # Scroll animations & parallax
│   ├── gallery.css         # Gallery-specific styles
│   └── images.css          # Image/picture element styles
├── js/
│   ├── main.js             # All interactive functionality
│   └── parallax.js         # Custom parallax engine
└── assets/
    ├── favicon.svg         # B monogram favicon
    ├── logo.svg            # Full BaoMbao Craft logo
    ├── patterns/
    │   └── wood-grain.svg  # Tileable background pattern
    ├── icons/
    │   ├── door.svg        # Custom doors icon
    │   ├── furniture.svg   # Furniture icon
    │   ├── iot.svg         # Smart IoT icon
    │   └── restoration.svg # Restoration icon
    ├── hero/               # Hero section images (3)
    │   ├── hero-1.avif
    │   ├── hero-2.avif
    │   └── hero-3.avif
    ├── doors/              # Door product images (12)
    │   ├── door-1.avif
    │   └── ...
    ├── furniture/          # Furniture images (12)
    │   ├── furniture-1.avif
    │   └── ...
    ├── details/            # Detail/close-up shots (10)
    │   ├── detail-1.avif
    │   └── ...
    ├── workshop/           # Workshop/process images (8)
    │   ├── workshop-1.avif
    │   └── ...
    └── gallery/            # Additional gallery images (5)
        └── extra-1.avif
```

## Technology Stack

- **Smooth Scrolling**: [Lenis](https://lenis.darkroom.engineering/) v1.1.14
- **Animations**: [GSAP](https://gsap.com/) v3.12.5 + ScrollTrigger
- **Typography**: [Playfair Display](https://fonts.google.com/specimen/Playfair+Display) + [Montserrat](https://fonts.google.com/specimen/Montserrat) + Cormorant Garamond
- **Icons**: Custom SVG icons
- **CSS**: Custom properties design system, no frameworks

## Color Palette

| Name | Hex | Usage |
|------|-----|-------|
| Mahogany | `#4B3832` | Primary wood tone |
| Walnut | `#8B4513` | Secondary wood |
| Oak Light | `#C4A35A` | Highlights |
| Teak | `#5C4033` | Rich accents |
| Cream | `#FAF8F5` | Light backgrounds |
| Gold | `#D4AF37` | Premium accents, CTAs |
| Charcoal | `#2D2D2D` | Text |

## Quick Start

1. **Clone/Download** the project files
2. **Open** `index.html` in a browser (no build step required)
3. **For development**, use a local server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (npx)
npx serve .

# Using PHP
php -S localhost:8000
```

4. Navigate to `http://localhost:8000`

## Adding Images

### Current Image Organization

Images are organized into semantic categories in `/assets/`:

| Folder | Count | Usage |
|--------|-------|-------|
| `hero/` | 3 | Parallax hero backgrounds |
| `doors/` | 12 | Door product showcases |
| `furniture/` | 12 | Furniture pieces |
| `details/` | 10 | Close-ups, textures, joinery |
| `workshop/` | 8 | Process, team, behind-scenes |
| `gallery/` | 5 | Additional overflow items |

### Image Preview Tool

Open `image-preview.html` in a browser to review all images and their intended placements. Use this to validate which images should be moved between categories.

### Picture Element Pattern

All images use the `<picture>` element with AVIF format for optimal compression:

### Hero Section (index.html)
```css
/* In css/style.css, find .hero__layer classes */
.hero__layer--1 {
    background-image: url('/assets/images/hero/workshop-texture.jpg');
}
.hero__layer--2 {
    background-image: url('/assets/images/hero/wood-grain.jpg');
}
/* etc. */
```

### Gallery Items (gallery.html)
```html
<!-- Replace inline backgrounds with your portfolio images -->
<div class="gallery-item__image" style="background-image: url('/assets/images/portfolio/mahogany-door.jpg')"></div>
```

### Recommended Image Sizes

| Use Case | Resolution | Format |
|----------|------------|--------|
| Hero layers | 1920×1080 | WebP/JPG |
| Gallery thumbnails | 800×600 | WebP/JPG |
| Team photos | 400×400 | WebP/PNG |
| Logo | any (vector) | SVG |

## Customization

### Brand Colors
Edit CSS custom properties in `css/style.css`:

```css
:root {
    --mahogany: #4B3832;
    --gold: #D4AF37;
    /* etc. */
}
```

### Parallax Speeds
Adjust `data-speed` attributes on parallax elements (0.1 = slow, 1.0 = fast):

```html
<div class="hero__layer" data-speed="0.3">...</div>
```

### Animations
Modify timing in `css/animations.css`:

```css
:root {
    --duration-default: 0.6s;  /* Animation speed */
    --ease-smooth: cubic-bezier(0.25, 0.1, 0.25, 1);
}
```

## Accessibility

- Skip-to-content link
- ARIA labels on interactive elements
- Semantic HTML structure
- Keyboard navigable
- `prefers-reduced-motion` support (disables parallax/animations)
- Color contrast WCAG AA compliant

## Browser Support

| Browser | Support |
|---------|---------|
| Chrome | ✓ Latest |
| Firefox | ✓ Latest |
| Safari | ✓ Latest |
| Edge | ✓ Latest |
| Mobile Safari | ✓ iOS 14+ |
| Chrome Mobile | ✓ Android 10+ |

## Production Deployment

For production, consider:

1. **Image Optimization**
   - Use WebP format with JPG fallbacks
   - Implement lazy loading with `loading="lazy"`
   - Use responsive images with `srcset`

2. **Performance**
   - Minify CSS/JS files
   - Enable Gzip/Brotli compression
   - Add caching headers

3. **SEO**
   - Update meta descriptions
   - Add Open Graph tags
   - Create sitemap.xml
   - Add robots.txt

4. **Contact Form**
   - Connect form to backend (Formspree, Netlify Forms, custom API)

## File Sizes

| File | Size (approx) |
|------|---------------|
| index.html | 23 KB |
| gallery.html | 15 KB |
| about.html | 18 KB |
| style.css | 35 KB |
| animations.css | 10 KB |
| gallery.css | 7 KB |
| main.js | 15 KB |
| parallax.js | 6 KB |
| **Total** | ~130 KB |

## Credits

- Fonts: Google Fonts
- Smooth Scroll: [Lenis](https://lenis.darkroom.engineering/)
- Animations: [GSAP](https://gsap.com/)
- Built for: BaoMbao Craft, Kampala, Uganda

## License

This website design is created exclusively for BaoMbao Craft. All rights reserved.

---

**BaoMbao Craft** - *Where Tradition Meets Tomorrow*
