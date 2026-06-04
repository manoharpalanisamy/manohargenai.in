/* ============================================================
   MANOHAR GenAI — Landing page interactions
   ============================================================ */
(() => {
    'use strict';

    document.addEventListener('DOMContentLoaded', () => {
        initNav();
        initMobileMenu();
        initSmoothScroll();
        initReveal();
        initMetrics();
        initTerminal();
        initCtaForm();
    });

    /* ── Sticky nav shadow on scroll ── */
    function initNav() {
        const nav = document.getElementById('nav');
        if (!nav) return;
        let ticking = false;
        const onScroll = () => {
            if (!ticking) {
                requestAnimationFrame(() => {
                    nav.classList.toggle('scrolled', window.scrollY > 20);
                    ticking = false;
                });
                ticking = true;
            }
        };
        window.addEventListener('scroll', onScroll, { passive: true });
        onScroll();
    }

    /* ── Mobile menu ── */
    function initMobileMenu() {
        const burger = document.getElementById('burger');
        const menu = document.getElementById('mobileMenu');
        if (!burger || !menu) return;

        burger.addEventListener('click', () => menu.classList.toggle('open'));
        menu.querySelectorAll('a').forEach(a =>
            a.addEventListener('click', () => menu.classList.remove('open'))
        );
        // Close when resizing up to desktop
        window.addEventListener('resize', () => {
            if (window.innerWidth > 768) menu.classList.remove('open');
        });
    }

    /* ── Smooth scroll for in-page anchors ── */
    function initSmoothScroll() {
        document.querySelectorAll('a[href^="#"]').forEach(link => {
            link.addEventListener('click', e => {
                const href = link.getAttribute('href');
                if (href === '#' || href.length < 2) return;
                const target = document.querySelector(href);
                if (!target) return;
                e.preventDefault();
                const top = target.getBoundingClientRect().top + window.pageYOffset - 76;
                window.scrollTo({ top, behavior: 'smooth' });
            });
        });
    }

    /* ── Scroll reveal ── */
    function initReveal() {
        const els = document.querySelectorAll('[data-reveal]');
        if (!els.length) return;

        if (!('IntersectionObserver' in window)) {
            els.forEach(el => el.classList.add('in'));
            return;
        }
        const io = new IntersectionObserver((entries) => {
            entries.forEach((entry, i) => {
                if (entry.isIntersecting) {
                    const delay = (i % 4) * 70;
                    setTimeout(() => entry.target.classList.add('in'), delay);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.12, rootMargin: '0px 0px -50px 0px' });

        els.forEach(el => io.observe(el));
    }

    /* ── Animated metric counters ── */
    function initMetrics() {
        const metrics = document.querySelectorAll('.metric-val[data-target]');
        if (!metrics.length) return;

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    countUp(entry.target);
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 });

        metrics.forEach(m => io.observe(m));
    }

    function countUp(el) {
        const target = parseInt(el.dataset.target, 10) || 0;
        const prefix = el.dataset.prefix || '';
        const unitEl = el.querySelector('.metric-unit');
        const unitHTML = unitEl ? unitEl.outerHTML : '';
        const duration = 1600;
        const start = performance.now();

        function frame(now) {
            const p = Math.min((now - start) / duration, 1);
            const eased = 1 - Math.pow(1 - p, 3); // ease-out cubic
            const val = Math.round(eased * target);
            el.innerHTML = prefix + val + unitHTML;
            if (p < 1) requestAnimationFrame(frame);
        }
        requestAnimationFrame(frame);
    }

    /* ── Terminal line reveal ── */
    function initTerminal() {
        const body = document.getElementById('terminalBody');
        if (!body) return;
        const lines = Array.from(body.querySelectorAll('.tline'));
        lines.forEach(l => {
            l.style.opacity = '0';
            l.style.transform = 'translateY(4px)';
        });

        const io = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    lines.forEach((l, i) => {
                        setTimeout(() => {
                            l.style.transition = 'opacity .4s ease, transform .4s ease';
                            l.style.opacity = '1';
                            l.style.transform = 'translateY(0)';
                        }, i * 160);
                    });
                    io.unobserve(entry.target);
                }
            });
        }, { threshold: 0.3 });
        io.observe(body);
    }

    /* ── CTA email capture ── */
    function initCtaForm() {
        const form = document.getElementById('ctaForm');
        if (!form) return;
        const email = document.getElementById('ctaEmail');
        const msg = document.getElementById('ctaMsg');
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;

        form.addEventListener('submit', e => {
            e.preventDefault();
            const value = (email.value || '').trim();

            if (!isEmail(value)) {
                msg.style.color = '#f87171';
                msg.textContent = 'Please enter a valid email address.';
                email.focus();
                return;
            }

            msg.style.color = '';
            msg.textContent = '';
            btn.disabled = true;
            btn.style.opacity = '0.75';
            btn.innerHTML = '<span class="spin"></span> Submitting…';

            // Simulated submit. Replace with real endpoint / API call later.
            setTimeout(() => {
                btn.innerHTML = '✓ You\'re on the list!';
                btn.style.opacity = '1';
                msg.style.color = 'var(--accent)';
                msg.textContent = 'Thanks — we\'ll reach out to ' + value + ' shortly.';
                email.value = '';
                // Persist locally so the demo feels real across reloads
                try { localStorage.setItem('mg_waitlist', value); } catch (_) {}

                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = original;
                }, 3200);
            }, 1200);
        });
    }

    function isEmail(v) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
    }

    /* ── Spinner style (shared) ── */
    const s = document.createElement('style');
    s.textContent =
        '@keyframes spin{to{transform:rotate(360deg)}}' +
        '.spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(4,35,26,.3);' +
        'border-top-color:#04231a;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-2px}';
    document.head.appendChild(s);
})();
