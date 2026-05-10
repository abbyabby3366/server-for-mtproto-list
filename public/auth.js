// public/auth.js
document.addEventListener('DOMContentLoaded', () => {
    const token = localStorage.getItem('jwt');
    let user = {};
    try {
        user = JSON.parse(localStorage.getItem('user') || '{}');
    } catch (e) {}

    const isLoginPage = window.location.pathname.endsWith('login.html');

    if (!token && !isLoginPage) {
        window.location.href = '/login.html';
        return;
    }

    if (token && isLoginPage) {
        window.location.href = '/analytics.html'; // default page
        return;
    }

    const nav = document.querySelector('nav');
    if (nav && !isLoginPage) {
        // Find the configs link to push everything after it to the right
        const configLink = Array.from(nav.children).find(c => c.tagName === 'A' && c.getAttribute('href') && c.getAttribute('href').includes('/config'));
        if (configLink) {
            configLink.style.marginRight = 'auto';
        }

        // Clean up any stray margin-left auto from old scripts or cached i18n
        Array.from(nav.children).forEach(c => {
            if (c.style.marginLeft === 'auto') {
                c.style.marginLeft = '0px';
            }
        });

        // Add Users tab if admin
        if (user.role === 'admin') {
            const usersLink = document.createElement('a');
            usersLink.href = '/users.html';
            usersLink.textContent = window.t ? window.t('Users') : 'Users';
            usersLink.style.background = window.location.pathname.endsWith('users.html') ? '' : '#bdc3c7';
            usersLink.style.color = window.location.pathname.endsWith('users.html') ? '' : '#333';
            nav.appendChild(usersLink);
        }

        // Move the language button to the end if it exists (so Users is before Language)
        const langBtn = document.getElementById('langBtn') || Array.from(nav.children).find(c => c.tagName === 'BUTTON' && (c.textContent.includes('English') || c.textContent.includes('中文')));
        if (langBtn) {
            langBtn.style.marginLeft = '0px';
            nav.appendChild(langBtn);
        }

        // Add Logout button
        const logoutBtn = document.createElement('a');
        logoutBtn.href = '#';
        logoutBtn.textContent = 'Logout';
        logoutBtn.style.background = '#e74c3c';
        logoutBtn.style.color = 'white';
        logoutBtn.onclick = (e) => {
            e.preventDefault();
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');
            window.location.href = '/login.html';
        };
        nav.appendChild(logoutBtn);
    }
});

// Override fetch to automatically add Authorization header and handle 401
const originalFetch = window.fetch;
window.fetch = async function() {
    let [resource, config] = arguments;
    if (!config) config = {};
    if (!config.headers) config.headers = {};
    
    const token = localStorage.getItem('jwt');
    if (token) {
        config.headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await originalFetch(resource, config);
    if (response.status === 401) {
        localStorage.removeItem('jwt');
        localStorage.removeItem('user');
        if (!window.location.pathname.endsWith('login.html')) {
            window.location.href = '/login.html';
        }
    }
    return response;
};
