/* ============================================================
   MANOHAR GenAI — Auth pages (login + signup)
   Shared logic: Google OAuth, validation, UX states
   ============================================================ */
(() => {
    'use strict';

    /* ============================================================
       GOOGLE SIGN-IN (Google Identity Services — ID token flow)
       ------------------------------------------------------------
       Uses the official "Sign in with Google" button, which signs
       users in entirely in the browser and returns a signed JWT
       credential (the user's identity). It needs ONLY the public
       client_id — no backend, no client_secret, and NO redirect URI.

       Requires the GIS library (loaded on the page via):
         <script src="https://accounts.google.com/gsi/client" async></script>

       Google Cloud Console (project divine-voice-498406-m8):
         • Authorised JavaScript origins MUST include the exact
           origin you load the site from, e.g. https://manohargenai.in
           (add https://www.manohargenai.in too if you use www).
         • The OAuth consent screen must be configured; while it is in
           "Testing", only added test users can sign in — add your
           email as a test user, or publish the app.
       Google sign-in will NOT work from file:// or localhost unless
       that origin is also added in the console.
       ============================================================ */
    const GOOGLE_OAUTH = {
        CLIENT_ID: '113629175249-pdc6b48cpes5k6hn0dsa540gosk7ilsd.apps.googleusercontent.com'
    };

    let _intent = 'login';
    let _gsiReady = false;

    document.addEventListener('DOMContentLoaded', () => {
        injectSpinner();
        initGoogleAuth();
        initPasswordToggles();
        initLogin();
        initSignup();
    });

    /* ── Wire up Google sign-in ── */
    function initGoogleAuth() {
        const host = document.getElementById('gsiButton');
        if (!host) return;
        _intent = document.getElementById('signupForm') ? 'signup' : 'login';

        // The GIS library loads async. Set the official load hook AND poll,
        // so we initialise whichever order things load in.
        window.onGoogleLibraryLoad = setupGoogle;
        if (gisAvailable()) {
            setupGoogle();
        } else {
            let tries = 0;
            const timer = setInterval(() => {
                if (gisAvailable()) { clearInterval(timer); setupGoogle(); }
                else if (++tries > 50) { clearInterval(timer); showFallback(); }
            }, 100);
        }
    }

    function gisAvailable() {
        return !!(window.google && google.accounts && google.accounts.id);
    }

    function setupGoogle() {
        if (_gsiReady || !gisAvailable()) return;
        _gsiReady = true;
        try {
            google.accounts.id.initialize({
                client_id: GOOGLE_OAUTH.CLIENT_ID,
                callback: handleCredential,
                ux_mode: 'popup',
                auto_select: false,
                cancel_on_tap_outside: true,
                itp_support: true
            });

            const host = document.getElementById('gsiButton');
            const width = Math.min(Math.max((host && host.offsetWidth) || 320, 240), 400);
            google.accounts.id.renderButton(host, {
                type: 'standard',
                theme: 'filled_black',
                size: 'large',
                text: _intent === 'signup' ? 'signup_with' : 'signin_with',
                shape: 'pill',
                logo_alignment: 'center',
                width: width
            });
        } catch (e) {
            showFallback();
        }
    }

    /* GIS returns a signed JWT credential (the user's identity). */
    function handleCredential(resp) {
        const msg = getMsgEl();
        if (!resp || !resp.credential) {
            showMsg(msg, 'err', 'Google sign-in was cancelled. Please try again.');
            return;
        }
        const profile = decodeJwt(resp.credential);
        if (!profile) {
            showMsg(msg, 'err', 'Could not read the Google response. Please try again.');
            return;
        }
        try {
            localStorage.setItem('mg_user', JSON.stringify({
                email: profile.email || '',
                name: profile.name || '',
                picture: profile.picture || '',
                ts: Date.now()
            }));
        } catch (_) {}
        const who = profile.name || profile.email || 'your Google account';
        showMsg(msg, 'ok', 'Signed in as ' + who + '. Redirecting…');
        setTimeout(() => { window.location.href = 'index.html'; }, 1100);
    }

    /* Decode a JWT payload (no verification — identity display only).
       For production, verify the token signature on a backend. */
    function decodeJwt(token) {
        try {
            const part = token.split('.')[1];
            const json = decodeURIComponent(
                atob(part.replace(/-/g, '+').replace(/_/g, '/'))
                    .split('')
                    .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                    .join('')
            );
            return JSON.parse(json);
        } catch (e) {
            return null;
        }
    }

    /* If GIS can't load (offline, blocked, or unauthorised origin),
       reveal the styled fallback button with a helpful message. */
    function showFallback() {
        const host = document.getElementById('gsiButton');
        const btn = document.getElementById('googleBtn');
        if (host) host.style.display = 'none';
        if (!btn) return;
        btn.hidden = false;
        btn.addEventListener('click', () => {
            showMsg(getMsgEl(), 'err',
                'Google sign-in must run on the authorised domain (https://manohargenai.in). ' +
                'If you are already there, check that the origin is listed in the Google Console.');
        });
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
