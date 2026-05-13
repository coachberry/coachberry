// Coach Berry Footer - Insert into all pages
function insertFooter() {
    const footerHTML = `
        <footer>
            <p>&copy; 2026 Coach Berry | 3D Hockey LLC</p>
        </footer>
    `;

    // Remove any existing footers first
    const existingFooter = document.querySelector('footer');
    if (existingFooter) {
        existingFooter.remove();
    }

    // Insert footer at the end of the body
    document.body.insertAdjacentHTML('beforeend', footerHTML);
}

// Try to insert footer immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', insertFooter);
} else {
    insertFooter();
}

// Also try again after a short delay to ensure it loads
setTimeout(insertFooter, 100);
