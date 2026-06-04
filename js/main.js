// ============================================
// HARNESS AGENT — Premium Interactions
// Vercel/Supabase-quality animations
// ============================================

(() => {
    'use strict';

    // ─── Init ───
    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initScrollAnimations();
        initMetricCounters();
        initTerminalTyping();
        initFormHandler();
        initSmoothScroll();
        initMobileMenu();
    });

    // ═══════════════════════════════════════════
    // NAVIGATION
    // ═══════════════════════════════════════════
    function initNav() {
        const nav = document.getElementById('nav');
        if (!nav) return;

        let ticking = false;

        window.addEventListener('scroll', () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    if (window.scrollY > 20) {
                        nav.classList.add('scrolled');
                    } else {
                        nav.classList.remove('scrolled');
                    }
                    ticking = false;
                });
                ticking = true;
            }
        });
    }

    // ═══════════════════════════════════════════
    // MOBILE MENU
    // ═══════════════════════════════════════════
    function initMobileMenu() {
        const btn = document.getElementById('nav-mobile-btn');
        const links = document.getElementById('nav-links');
        if (!btn || !links) return;

        let open = false;

        btn.addEventListener('click', () => {
            open = !open;
            if (open) {
                links.style.display = 'flex';
                links.style.position = 'fixed';
                links.style.top = 'var(--nav-h)';
                links.style.left = '0';
                links.style.right = '0';
                links.style.flexDirection = 'column';
                links.style.padding = '24px';
                links.style.gap = '16px';
                links.style.background = 'rgba(5,5,5,0.98)';
                links.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
                links.style.zIndex = '999';
                links.style.backdropFilter = 'blur(20px)';
            } else {
                links.removeAttribute('style');
            }
        });

        // Close on link click
        links.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                open = false;
                links.removeAttribute('style');
            });
        });
    }

    // ═══════════════════════════════════════════
    // SCROLL ANIMATIONS (Intersection Observer)
    // ═══════════════════════════════════════════
    function initScrollAnimations() {
        const targets = document.querySelectorAll(
            '.product-card, .step-item, .metric-card, .about-feature, ' +
            '.about-stat-card, .arch-card, .cta-card, .hero-terminal, ' +
            '.section-eyebrow, .section-heading, .section-subheading'
        );

        if (!targets.length) return;

        // Set initial state
        targets.forEach((el, i) => {
            el.setAttribute('data-animate', '');
            el.style.transitionDelay = `${Math.min(i % 6, 4) * 80}ms`;
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.1,
                rootMargin: '0px 0px -60px 0px'
            }
        );

        targets.forEach(el => observer.observe(el));
    }

    // ═══════════════════════════════════════════
    // METRIC COUNTERS
    // ═══════════════════════════════════════════
    function initMetricCounters() {
        const metrics = document.querySelectorAll('.metric-value[data-target]');
        if (!metrics.length) return;

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        animateCounter(entry.target);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.5 }
        );

        metrics.forEach(el => observer.observe(el));
    }

    function animateCounter(el) {
        const target = parseInt(el.dataset.target, 10);
        const unit = el.querySelector('.metric-unit');
        const unitText = unit ? unit.textContent : '';
        const duration = 2000;
        const start = performance.now();

        function tick(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out expo
            const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            const current = Math.round(eased * target);

            el.textContent = current;
            if (unit) {
                const span = document.createElement('span');
                span.className = 'metric-unit';
                span.textContent = unitText;
                el.appendChild(span);
            }

            if (progress < 1) {
                requestAnimationFrame(tick);
            }
        }

        requestAnimationFrame(tick);
    }

    // ═══════════════════════════════════════════
    // TERMINAL TYPING EFFECT
    // ═══════════════════════════════════════════
    function initTerminalTyping() {
        const terminal = document.querySelector('.hero-terminal');
        if (!terminal) return;

        const lines = terminal.querySelectorAll('.terminal-line');

        // Hide all lines initially
        lines.forEach(line => {
            line.style.opacity = '0';
            line.style.transform = 'translateY(4px)';
        });

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        revealTerminalLines(lines);
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.3 }
        );

        observer.observe(terminal);
    }

    function revealTerminalLines(lines) {
        lines.forEach((line, i) => {
            setTimeout(() => {
                line.style.transition = 'opacity 0.4s ease, transform 0.4s ease';
                line.style.opacity = '1';
                line.style.transform = 'translateY(0)';
            }, i * 180);
        });
    }

    // ═══════════════════════════════════════════
    // FORM HANDLER
    // ═══════════════════════════════════════════
    function initFormHandler() {
        const form = document.getElementById('cta-form');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();

            const btn = form.querySelector('button[type="submit"]');
            const input = form.querySelector('input[type="email"]');
            const originalHTML = btn.innerHTML;

            // Loading state
            btn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" class="spinner">
                    <circle cx="8" cy="8" r="6" stroke="currentColor" stroke-width="1.5" stroke-dasharray="28" stroke-dashoffset="8" stroke-linecap="round"/>
                </svg>
                Submitting...
            `;
            btn.disabled = true;
            btn.style.opacity = '0.7';

            // Simulate API call
            setTimeout(() => {
                btn.innerHTML = `
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8l4 4 6-6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    You're on the list!
                `;
                btn.style.opacity = '1';
                input.value = '';

                setTimeout(() => {
                    btn.innerHTML = originalHTML;
                    btn.disabled = false;
                }, 3000);
            }, 1500);
        });
    }

    // ═══════════════════════════════════════════
    // SMOOTH SCROLL
    // ═══════════════════════════════════════════
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                const href = this.getAttribute('href');
                if (href === '#') return;

                e.preventDefault();
                const target = document.querySelector(href);
                if (!target) return;

                const offset = 80;
                const top = target.getBoundingClientRect().top + window.pageYOffset - offset;

                window.scrollTo({
                    top,
                    behavior: 'smooth'
                });
            });
        });
    }

})();

// ─── Spinner CSS injection ───
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
    @keyframes spin { to { transform: rotate(360deg); } }
    .spinner { animation: spin 0.8s linear infinite; }
`;
document.head.appendChild(spinnerStyle);
