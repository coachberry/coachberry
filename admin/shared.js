// Coach Berry Admin - Shared Firebase Configuration

export const firebaseConfig = {
    apiKey: "AIzaSyAtLNJJoVBqWdKjDxfddEkdBYAWGrnpuhw",
    authDomain: "coach-berry.firebaseapp.com",
    projectId: "coach-berry",
    storageBucket: "coach-berry.firebasestorage.app",
    messagingSenderId: "170282824286",
    appId: "1:170282824286:web:5387ec9826c38466c07acf"
};

// Utility function to escape HTML
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Show message
export function showMessage(elementId, message, type = 'success') {
    const messageDiv = document.getElementById(elementId);
    messageDiv.textContent = message;
    messageDiv.classList.add('show', type);
    
    setTimeout(() => {
        messageDiv.classList.remove('show');
    }, 3000);
}

// Format date
export function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp.seconds * 1000);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    });
}

// Normalize category name
export function normalizeCategory(category) {
    if (!category || typeof category !== 'string') return '';
    return category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();
}

// Get all categories from post (handles both formats)
export function getAllCategories(post) {
    if (Array.isArray(post.categories)) {
        return post.categories;
    } else if (post.category) {
        return [post.category];
    }
    return [];
}
