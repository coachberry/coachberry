// Coach Berry Footer - Insert into all pages
document.addEventListener('DOMContentLoaded', function() {
    const footerHTML = `
        <footer>
            <p>&copy; 2026 Coach Berry | 3D Hockey LLC</p>
        </footer>
    `;

    // Insert footer at the end of the body
    document.body.insertAdjacentHTML('beforeend', footerHTML);
});
