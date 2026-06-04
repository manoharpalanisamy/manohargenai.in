/* ============================================================
   MANOHAR GenAI — Auth pages (login + signup)
   Shared logic: Google OAuth, validation, UX states
   ============================================================ */
(() => {
    'use strict';

    /* ============================================================
       GOOGLE OAUTH CONFIG
       ------------------------------------------------------------
       Only the PUBLIC client_id lives here — this is safe to ship
       to the browser. The client_secret must NEVER appear in
       front-end code; it is used only on a backend server to
       exchange the authorization `code` for tokens.

       Registered in Google Cloud Console (project divine-voice-498406-m8):
         • Authorised JavaScript origins:  https://manohargenai.in
         • Authorised redirect URIs:        https://manohargenai.in
       To complete real sign-in you still need a backend endpoint
       that performs the secure code→token exchange.
       ============================================================ */
    const GOOGLE_OAUTH = {
        CONFIGURED: true,
        CLIENT_ID: '113629175249-pdc6b48cpes5k6hn0dsa540gosk7ilsd.apps.googleusercontent.com',
        REDIRECT_URI: 'https://manohargenai.in',  // must exactly match a registered redirect URI
        SCOPE: 'openid email profile',
        RESPONSE_TYPE: 'code',                    // 'code' (needs backend) — use 'token' for pure client-side
        AUTH_ENDPOINT: 'https://accounts.google.com/o/oauth2/v2/auth'
    };

    /**
     * Build the Google authorization URL.
     * `state` carries the intent (login/signup) and a CSRF nonce.
     */
    function buildGoogleAuthUrl(intent) {
        const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
        try { sessionStorage.setItem('oauth_state', nonce); } catch (_) {}

        const params = new URLSearchParams({
            client_id: GOOGLE_OAUTH.CLIENT_ID,
            redirect_uri: GOOGLE_OAUTH.REDIRECT_URI,
            response_type: GOOGLE_OAUTH.RESPONSE_TYPE,
            scope: GOOGLE_OAUTH.SCOPE,
            state: intent + ':' + nonce,
            access_type: 'offline',
            include_granted_scopes: 'true',
            prompt: 'select_account'
        });
        return GOOGLE_OAUTH.AUTH_ENDPOINT + '?' + params.toString();
    }

    document.addEventListener('DOMContentLoaded', () => {
        injectSpinner();
        initGoogleButton();
        initPasswordToggles();
        initLogin();
        initSignup();
        handleOAuthRedirect(); // graceful handling if Google redirects back
    });

    /* ── Google OAuth button ── */
    function initGoogleButton() {
        const btn = document.getElementById('googleBtn');
        if (!btn) return;
        const intent = document.getElementById('signupForm') ? 'signup' : 'login';

        btn.addEventListener('click', () => {
            if (GOOGLE_OAUTH.CONFIGURED &&
                !GOOGLE_OAUTH.CLIENT_ID.startsWith('YOUR_')) {
                // Real flow — redirect to Google's consent screen
                window.location.href = buildGoogleAuthUrl(intent);
            } else {
                // Not configured yet — fail gracefully with guidance
                const msg = getMsgEl();
                showMsg(msg, 'err',
                    'Google sign-in isn\'t connected yet. Add your Client ID in js/auth.js (see the GOOGLE_OAUTH block) to enable it.');
            }
        });
    }

    /* ── If Google redirected back with ?code= or ?error= ── */
    function handleOAuthRedirect() {
        const q = new URLSearchParams(window.location.search);
        if (!q.has('code') && !q.has('error')) return;
        const msg = getMsgEl();
        if (!msg) return;

        if (q.has('error')) {
            showMsg(msg, 'err', 'Google sign-in was cancelled or failed. Please try again.');
        } else {
            // A real app would now exchange the `code` server-side for tokens.
            showMsg(msg, 'ok', 'Google authorization received. Connect your backend to complete sign-in.');
        }
        // Clean the URL so refresh doesn't re-trigger
        window.history.replaceState({}, document.title, window.location.pathname);
    }

    /* ── Password show/hide ── */
    function initPasswordToggles() {
        document.querySelectorAll('.toggle-pw').forEach(btn => {
            btn.addEventListener('click', () => {
                const id = btn.dataset.toggle;
                const input = document.getElementById(id);
                if (!input) return;
                const show = input.type === 'password';
                input.type = show ? 'text' : 'password';
                btn.innerHTML = show
                    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
                    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" stroke="currentColor" stroke-width="1.6"/><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="1.6"/></svg>';
            });
        });
    }

    /* ── LOGIN form ── */
    function initLogin() {
        const form = document.getElementById('loginForm');
        if (!form) return;

        const email = form.querySelector('#email');
        const pw = form.querySelector('#password');
        const msg = document.getElementById('authMsg');
        const btn = document.getElementById('submitBtn');
        const forgot = document.getElementById('forgotLink');

        if (forgot) {
            forgot.addEventListener('click', e => {
                e.preventDefault();
                const v = (email.value || '').trim();
                if (!isEmail(v)) {
                    setError(email, 'Enter your email above first, then click reset.');
                    email.focus();
                    return;
                }
                showMsg(msg, 'ok', 'If an account exists for ' + v + ', a reset link is on its way.');
            });
        }

        form.addEventListener('submit', e => {
            e.preventDefault();
            clearErrors(form);
            hideMsg(msg);
            let ok = true;

            if (!isEmail((email.value || '').trim())) { setError(email, 'Enter a valid email address.'); ok = false; }
            if (!pw.value) { setError(pw, 'Enter your password.'); ok = false; }
            if (!ok) return;

            submitting(btn, 'Signing in…');
            // Simulated auth. Wire this to your backend / Google later.
            setTimeout(() => {
                showMsg(msg, 'ok', 'Signed in successfully. Redirecting…');
                setTimeout(() => { window.location.href = 'index.html'; }, 1100);
            }, 1100);
        });

        liveClear([email, pw]);
    }

    /* ── SIGNUP form ── */
    function initSignup() {
        const form = document.getElementById('signupForm');
        if (!form) return;

        const name = form.querySelector('#name');
        const email = form.querySelector('#email');
        const pw = form.querySelector('#password');
        const terms = form.querySelector('#terms');
        const msg = document.getElementById('authMsg');
        const btn = document.getElementById('submitBtn');

        // Password strength meter
        const bars = form.querySelectorAll('.pw-bar');
        const hint = document.getElementById('pwHint');
        pw.addEventListener('input', () => {
            const { score, label } = scorePassword(pw.value);
            bars.forEach((b, i) => {
                b.className = 'pw-bar';
                if (i < score) b.classList.add(score <= 1 ? 'w' : score === 2 ? 'm' : 's');
            });
            if (hint && pw.value) {
                hint.textContent = 'Strength: ' + label;
                hint.style.color = score <= 1 ? '#f87171' : score === 2 ? 'var(--amber)' : 'var(--accent)';
            } else if (hint) {
                hint.textContent = 'Use 8+ characters with a mix of letters, numbers & symbols.';
                hint.style.color = '';
            }
        });

        form.addEventListener('submit', e => {
            e.preventDefault();
            clearErrors(form);
            hideMsg(msg);
            let ok = true;

            if (!(name.value || '').trim()) { setError(name, 'Please enter your name.'); ok = false; }
            if (!isEmail((email.value || '').trim())) { setError(email, 'Enter a valid work email.'); ok = false; }
            if ((pw.value || '').length < 8) { setError(pw, 'Password must be at least 8 characters.'); ok = false; }
            if (!terms.checked) { setError(terms, 'Please accept the Terms to continue.'); ok = false; }
            if (!ok) return;

            submitting(btn, 'Creating account…');
            setTimeout(() => {
                showMsg(msg, 'ok', 'Account created! Redirecting to sign in…');
                setTimeout(() => { window.location.href = 'login.html'; }, 1200);
            }, 1200);
        });

        liveClear([name, email, pw]);
        terms.addEventListener('change', () => clearError(terms));
    }

    /* ── Password scoring ── */
    function scorePassword(v) {
        let s = 0;
        if (!v) return { score: 0, label: '' };
        if (v.length >= 8) s++;
        if (/[A-Z]/.test(v) && /[a-z]/.test(v)) s++;
        if (/\d/.test(v)) s++;
        if (/[^A-Za-z0-9]/.test(v)) s++;
        if (v.length >= 12 && s >= 3) s = 4;
        const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
        return { score: Math.min(s, 4), label: labels[Math.min(s, 4)] };
    }

    /* ── Helpers ── */
    function isEmail(v) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

    function getMsgEl() { return document.getElementById('authMsg'); }

    function showMsg(el, type, text) {
        if (!el) return;
        el.className = 'auth-msg show ' + type;
        el.textContent = text;
    }
    function hideMsg(el) { if (el) el.className = 'auth-msg'; }

    function setError(field, text) {
        const input = field.matches('input') ? field : field;
        if (input.classList) input.classList.add('invalid');
        const key = field.id;
        const err = document.querySelector('.field-error[data-for="' + key + '"]');
        if (err) { err.textContent = text; err.classList.add('show'); }
    }
    function clearError(field) {
        if (field.classList) field.classList.remove('invalid');
        const err = document.querySelector('.field-error[data-for="' + field.id + '"]');
        if (err) { err.textContent = ''; err.classList.remove('show'); }
    }
    function clearErrors(form) {
        form.querySelectorAll('.invalid').forEach(el => el.classList.remove('invalid'));
        form.querySelectorAll('.field-error.show').forEach(el => { el.textContent = ''; el.classList.remove('show'); });
    }
    function liveClear(fields) {
        fields.forEach(f => f && f.addEventListener('input', () => clearError(f)));
    }
    function submitting(btn, label) {
        if (!btn) return;
        btn.disabled = true;
        btn.style.opacity = '0.75';
        btn.dataset.original = btn.dataset.original || btn.innerHTML;
        btn.innerHTML = '<span class="spin"></span> ' + label;
    }

    function injectSpinner() {
        const s = document.createElement('style');
        s.textContent =
            '@keyframes spin{to{transform:rotate(360deg)}}' +
            '.spin{display:inline-block;width:15px;height:15px;border:2px solid rgba(4,35,26,.3);' +
            'border-top-color:#04231a;border-radius:50%;animation:spin .7s linear infinite;vertical-align:-2px}';
        document.head.appendChild(s);
    }
})();
