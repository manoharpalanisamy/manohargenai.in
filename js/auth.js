/* ============================================================
   MANOHAR GenAI — Auth pages (login + signup)
   Shared logic: Google OAuth, validation, UX states
   ============================================================ */
(() => {
    'use strict';

    /* ============================================================
       GOOGLE SIGN-IN (Google Identity Services — client-side)
       ------------------------------------------------------------
       Uses GIS token flow, which signs users in entirely in the
       browser using only the PUBLIC client_id. No backend and no
       client_secret are required (the secret must never live in
       front-end code). The GIS library is loaded via:
         <script src="https://accounts.google.com/gsi/client" async></script>

       Google Cloud Console (project divine-voice-498406-m8):
         • Authorised JavaScript origins:  https://manohargenai.in
       NOTE: Google sign-in only works on an authorised origin
       (https://manohargenai.in), not file:// or localhost unless
       you also add that origin in the console.
       ============================================================ */
    const GOOGLE_OAUTH = {
        CLIENT_ID: '113629175249-pdc6b48cpes5k6hn0dsa540gosk7ilsd.apps.googleusercontent.com',
        SCOPE: 'openid email profile',
        USERINFO: 'https://www.googleapis.com/oauth2/v3/userinfo'
    };

    let _tokenClient = null;
    let _intent = 'login';

    document.addEventListener('DOMContentLoaded', () => {
        injectSpinner();
        initGoogleAuth();
        initPasswordToggles();
        initLogin();
        initSignup();
    });

    /* ── Wire up the Google button ── */
    function initGoogleAuth() {
        const btn = document.getElementById('googleBtn');
        if (!btn) return;
        _intent = document.getElementById('signupForm') ? 'signup' : 'login';
        btn.addEventListener('click', onGoogleClick);
    }

    /* Lazily create the GIS token client (the library loads async). */
    function ensureTokenClient() {
        if (_tokenClient) return _tokenClient;
        if (!(window.google && google.accounts && google.accounts.oauth2)) return null;
        _tokenClient = google.accounts.oauth2.initTokenClient({
            client_id: GOOGLE_OAUTH.CLIENT_ID,
            scope: GOOGLE_OAUTH.SCOPE,
            callback: handleTokenResponse
        });
        return _tokenClient;
    }

    function onGoogleClick() {
        const msg = getMsgEl();
        const client = ensureTokenClient();
        if (!client) {
            showMsg(msg, 'err',
                'Google sign-in is still loading (or this page isn\'t served from an authorised domain). Please retry on https://manohargenai.in.');
            return;
        }
        hideMsg(msg);
        setGoogleLoading(true);
        try {
            client.requestAccessToken();
        } catch (e) {
            setGoogleLoading(false);
            showMsg(msg, 'err', 'Could not open Google sign-in. Please try again.');
        }
    }

    /* GIS calls this with an access token (or an error). */
    function handleTokenResponse(resp) {
        const msg = getMsgEl();
        if (!resp || resp.error || !resp.access_token) {
            setGoogleLoading(false);
            showMsg(msg, 'err', 'Google sign-in was cancelled or failed. Please try again.');
            return;
        }
        fetch(GOOGLE_OAUTH.USERINFO, {
            headers: { Authorization: 'Bearer ' + resp.access_token }
        })
        .then(r => r.json())
        .then(profile => {
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
        })
        .catch(() => {
            setGoogleLoading(false);
            showMsg(msg, 'err', 'Signed in, but your profile couldn\'t be loaded. Please try again.');
        });
    }

    function setGoogleLoading(on) {
        const btn = document.getElementById('googleBtn');
        if (!btn) return;
        if (on) {
            btn.dataset.html = btn.dataset.html || btn.innerHTML;
            btn.disabled = true;
            btn.style.opacity = '0.7';
            btn.innerHTML = '<span class="spin"></span> Connecting to Google…';
        } else {
            btn.disabled = false;
            btn.style.opacity = '1';
            if (btn.dataset.html) btn.innerHTML = btn.dataset.html;
        }
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
