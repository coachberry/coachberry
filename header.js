// Coach Berry Header - Insert into all pages
document.addEventListener('DOMContentLoaded', function() {
    const headerHTML = `
        <header>
            <nav>
                <a href="/" class="logo"><img src="https://coachberry.github.io/coachberry/CoachBerryLOGO-transparent-lightbg.png" alt="Coach Berry Logo"></a>
                <ul id="navMenu">
                    <li><a href="/">Home</a></li>
                    <li><a href="/#about">About</a></li>
                    <li><a href="/#services">Services</a></li>
                    <li><a href="/blog/">Blog</a></li>
                    <li><a href="/#content">Content</a></li>
                    <li id="authLink"><a href="/member-login/" class="cta-nav-secondary">Login</a></li>
                    <li><a href="/#membership" class="cta-nav">Join Now</a></li>
                </ul>
                <div class="hamburger" id="hamburger">
                    <span></span>
                    <span></span>
                    <span></span>
                </div>
            </nav>
        </header>
    `;

    // Insert header at the beginning of the body
    document.body.insertAdjacentHTML('afterbegin', headerHTML);

    // Initialize mobile menu after header is inserted
    setTimeout(function() {
        const hamburger = document.getElementById('hamburger');
        const navMenu = document.getElementById('navMenu');

        if (hamburger) {
            hamburger.addEventListener('click', () => {
                navMenu.classList.toggle('active');
            });

            document.querySelectorAll('#navMenu a').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                });
            });
        }

        // Check auth and update header
        checkAuthAndUpdateHeader();
    }, 100);
});

// Check Firebase auth and update header button
async function checkAuthAndUpdateHeader() {
    // Only check on pages where member dashboard exists (not on login page)
    if (window.location.pathname === '/member-login/' || window.location.pathname === '/admin/') {
        return;
    }

    try {
        const { initializeApp } = await import('https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js');
        const { getAuth, onAuthStateChanged } = await import('https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js');

        const firebaseConfig = {
            apiKey: "AIzaSyAtLNJJoVBqWdKjDxfddEkdBYAWGrnpuhw",
            authDomain: "coach-berry.firebaseapp.com",
            projectId: "coach-berry",
            storageBucket: "coach-berry.firebasestorage.app",
            messagingSenderId: "170282824286",
            appId: "1:170282824286:web:5387ec9826c38466c07acf"
        };

        const app = initializeApp(firebaseConfig);
        const auth = getAuth(app);

        onAuthStateChanged(auth, (user) => {
            const authLink = document.getElementById('authLink');
            if (authLink) {
                if (user) {
                    // User is logged in - show My Profile (with tab=profile parameter)
                    authLink.innerHTML = '<a href="/member-dashboard/?tab=profile" class="cta-nav-secondary">My Profile</a>';
                } else {
                    // User not logged in - show Login
                    authLink.innerHTML = '<a href="/member-login/" class="cta-nav-secondary">Login</a>';
                }
            }
        });
    } catch (error) {
        // Firebase check failed - keep default Login button
    }
}
