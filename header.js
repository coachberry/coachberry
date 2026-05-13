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
    }, 100);
});
