import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAuth, signOut, onAuthStateChanged, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import { getFirestore, collection, query, where, getDocs, doc, updateDoc, addDoc, orderBy, getDoc } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

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
const db = getFirestore(app);

let currentUser = null;
let memberData = null;
let currentThreadId = null;
let currentThreadIsArchived = false;

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    let date;
    // Handle both Firestore Timestamp objects and JavaScript Date objects
    if (timestamp.seconds) {
        // Firestore Timestamp
        date = new Date(timestamp.seconds * 1000);
    } else if (timestamp instanceof Date) {
        // JavaScript Date
        date = timestamp;
    } else {
        // Try to parse as date
        date = new Date(timestamp);
    }
    
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

// Check authentication
onAuthStateChanged(auth, async (user) => {
    if (!user) {
        console.log('No user logged in, redirecting to login');
        window.location.href = '/member-login/';
        return;
    }

    currentUser = user;
    console.log('User logged in:', user.email);
    try {
        await loadMemberData();
        console.log('loadMemberData completed');
    } catch (error) {
        console.error('Error in onAuthStateChanged:', error);
    }
});

async function loadMemberData() {
    try {
        console.log('Loading member data for:', currentUser.email);
        const q = query(collection(db, 'members'), where('email', '==', currentUser.email));
        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.error('Member profile not found for:', currentUser.email);
            alert('Member profile not found. Please contact support to create your account.');
            await signOut(auth);
            window.location.href = '/member-login/';
            return;
        }

        memberData = snapshot.docs[0].data();
        memberData.id = snapshot.docs[0].id;
        console.log('Member data loaded successfully:', memberData);

        // Check permissions
        if (memberData.permissions && !memberData.permissions.viewDashboard) {
            console.error('User does not have viewDashboard permission');
            alert('Your account does not have access to the member dashboard');
            await signOut(auth);
            window.location.href = '/';
            return;
        }

        console.log('Loading profile fields...');
        // Load profile data
        document.getElementById('firstName').value = memberData.firstName || '';
        document.getElementById('lastName').value = memberData.lastName || '';
        document.getElementById('email').value = memberData.email || '';
        document.getElementById('phone').value = memberData.phone || '';
        console.log('Profile fields loaded');

        console.log('Member roles:', memberData.roles);
        // Show/hide sections based on roles
        if (memberData.roles && memberData.roles.includes('player')) {
            console.log('Showing player profile section');
            document.getElementById('playerProfileSection').style.display = 'block';
            displayPlayerProfile();
        } else {
            console.log('Hiding player profile section');
            const playerSection = document.getElementById('playerProfileSection');
            if (playerSection) playerSection.style.display = 'none';
        }

        if (memberData.roles && memberData.roles.includes('coach')) {
            console.log('Showing coach profile section');
            document.getElementById('coachProfileSection').style.display = 'block';
            displayCoachProfile();
        } else {
            console.log('Hiding coach profile section');
            const coachSection = document.getElementById('coachProfileSection');
            if (coachSection) coachSection.style.display = 'none';
        }

        if (memberData.roles && memberData.roles.includes('parent')) {
            console.log('Showing players section');
            document.getElementById('playersSection').style.display = 'block';
            loadPlayersList();
        } else {
            console.log('Hiding players section');
            const playersSection = document.getElementById('playersSection');
            if (playersSection) playersSection.style.display = 'none';
        }

        if (memberData.roles && (memberData.roles.includes('coach') || memberData.roles.includes('parent'))) {
            console.log('Showing teams section');
            document.getElementById('teamsSection').style.display = 'block';
            loadTeamsList();
        } else {
            console.log('Hiding teams section');
            const teamsSection = document.getElementById('teamsSection');
            if (teamsSection) teamsSection.style.display = 'none';
        }

        console.log('Checking for tab parameter in URL');
        // Check for tab parameter in URL first (from My Profile button)
        const urlParams = new URLSearchParams(window.location.search);
        const tabFromUrl = urlParams.get('tab');
        
        // Restore last viewed tab (only for this session/refresh) or use URL parameter
        const lastTab = tabFromUrl || sessionStorage.getItem('memberDashboardTab') || 'profile';
        console.log('Attempting to activate tab:', lastTab);
        const tabBtn = document.querySelector(`button[onclick="switchTab('${lastTab}')"]`);
        if (tabBtn) {
            console.log('Tab button found, clicking...');
            tabBtn.click();
        } else {
            console.log('Tab button not found for tab:', lastTab);
        }
        
        // Clear the URL parameter after using it
        if (tabFromUrl) {
            window.history.replaceState({}, document.title, '/member-dashboard/');
        }
        console.log('loadMemberData completed successfully');
    } catch (error) {
        console.error('Error loading member data:', error);
        console.error('Error details:', error.message, error.stack);
        alert('Error loading member data: ' + error.message);
    }
}

async function loadSavedPosts() {
    try {
        const container = document.getElementById('savedPostsList');
        const savedPosts = memberData.savedPosts || [];

        if (savedPosts.length === 0) {
            container.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No saved posts yet. Browse our blog and save posts to view them here!</div>';
            return;
        }

        container.innerHTML = '';
        
        // Deduplicate - track which post IDs we've already rendered
        const renderedIds = new Set();

        for (const savedItem of savedPosts) {
            try {
                // Handle both old format (string ID) and new format (object with id, title, savedDate)
                const postId = typeof savedItem === 'string' ? savedItem : savedItem.id;
                
                // Skip if we've already rendered this post
                if (renderedIds.has(postId)) {
                    continue;
                }
                renderedIds.add(postId);
                
                // Get the blog post by document ID
                const postRef = doc(db, 'blogPosts', postId);
                const postSnap = await getDoc(postRef);
                
                if (postSnap.exists()) {
                    const post = postSnap.data();
                    const excerpt = post.content.substring(0, 150) + (post.content.length > 150 ? '...' : '');
                    const dateString = post.datePublished ? new Date(post.datePublished.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date';
                    
                    // Build categories HTML
                    let categoriesHTML = '';
                    if (post.categories && post.categories.length > 0) {
                        categoriesHTML = post.categories.map(cat => `<span class="blog-category">${escapeHtml(cat)}</span>`).join('');
                    }

                    const card = document.createElement('div');
                    card.className = 'blog-card';
                    card.style.cursor = 'pointer';
                    card.onclick = (e) => {
                        // Don't open if clicking Remove button
                        if (e.target.classList.contains('remove-post-btn')) return;
                        window.openSavedPost(postId);
                    };
                    card.innerHTML = `
                        <div class="blog-card-header">
                            <h3>${escapeHtml(post.title)}</h3>
                        </div>
                        <div class="blog-card-body">
                            <div class="blog-categories">${categoriesHTML}</div>
                            <p class="blog-excerpt">${escapeHtml(excerpt)}</p>
                            <div class="blog-meta">
                                <span>${dateString}</span>
                            </div>
                            <div class="blog-actions">
                                <button class="remove-post-btn" onclick="window.removePost('${postId}', event)" style="padding: 0.6rem 1.2rem; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; font-size: 0.9rem;">🗑️ Remove</button>
                                <a class="read-more" onclick="window.openSavedPost('${postId}')">Read More →</a>
                            </div>
                        </div>
                    `;
                    container.appendChild(card);
                }
            } catch (e) {
                console.error('Error loading post:', e);
            }
        }
    } catch (error) {
        console.error('Error loading saved posts:', error);
    }
}

window.removePost = async function(postId, event) {
    // Prevent card click if event is passed
    if (event) {
        event.stopPropagation();
    }
    
    if (!confirm('Remove this post from saved items?')) return;

    try {
        const updatedPosts = memberData.savedPosts.filter(item => {
            const id = typeof item === 'string' ? item : item.id;
            return id !== postId;
        });
        await updateDoc(doc(db, 'members', memberData.id), {
            savedPosts: updatedPosts
        });

        memberData.savedPosts = updatedPosts;
        loadSavedPosts();
    } catch (error) {
        alert('Error removing post: ' + error.message);
    }
};

// Open saved blog post in a modal (match /blog page styling)
window.openSavedPost = async function(postId) {
    try {
        const postRef = doc(db, 'blogPosts', postId);
        const postSnap = await getDoc(postRef);
        
        if (!postSnap.exists()) {
            alert('Blog post not found');
            return;
        }

        const post = postSnap.data();
        const dateString = post.datePublished ? new Date(post.datePublished.seconds * 1000).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No date';
        
        // Build categories HTML
        let categoriesHTML = '';
        if (post.categories && post.categories.length > 0) {
            categoriesHTML = post.categories.map(cat => `<span class="blog-category">${escapeHtml(cat)}</span>`).join('');
        }

        // Create and show modal with proper styling
        const modal = document.createElement('div');
        modal.className = 'modal active';
        modal.onclick = (e) => {
            // Close if clicking outside the modal-content
            if (e.target === modal) {
                modal.remove();
            }
        };
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="blog-card-header" style="margin-bottom: 1rem; margin-left: -3rem; margin-right: -3rem; margin-top: -3rem; padding: 2rem; padding-bottom: 1rem; position: relative;">
                    <button onclick="this.closest('.modal').remove()" style="position: absolute; top: 0.5rem; right: 0.5rem; font-size: 2.5rem; cursor: pointer; background: none; border: none; color: white; z-index: 1001; line-height: 1; width: auto; height: auto; padding: 0; font-weight: 300;">×</button>
                    <h2 style="margin: 0; color: #ffffff; font-size: 1.8rem; line-height: 1.3; margin-right: 3rem;">${escapeHtml(post.title)}</h2>
                </div>
                
                <div class="blog-categories" style="margin-bottom: 1rem;">${categoriesHTML}</div>
                
                <div class="blog-meta" style="color: #666; font-size: 0.9rem; margin-bottom: 2rem;">
                    <span>${dateString}</span>
                </div>
                
                <div style="color: #333; line-height: 1.8; margin-bottom: 2rem; white-space: pre-wrap;">${escapeHtml(post.content)}</div>
                
                <div class="blog-actions" style="margin-top: 2rem; padding-top: 2rem; border-top: 1px solid #ddd;">
                    <button class="remove-post-btn" onclick="window.removePost('${postId}', event); this.closest('.modal').remove();" style="padding: 0.8rem 2rem; background: #dc3545; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">🗑️ Remove</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    } catch (error) {
        console.error('Error opening post:', error);
        alert('Error opening blog post');
    }
};

window.switchTab = function(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => {
        el.classList.remove('active');
    });
    document.getElementById(tabName).classList.add('active');

    document.querySelectorAll('.tab-btn').forEach(el => {
        el.classList.remove('active');
    });
    event.target.classList.add('active');

    // Save current tab to sessionStorage (only for current session/refresh)
    sessionStorage.setItem('memberDashboardTab', tabName);

    // Load content when tabs are clicked
    if (tabName === 'inbox') {
        loadInbox();
    }
    if (tabName === 'saved') {
        loadSavedPosts();
    }
};

window.toggleArchivedMessages = function() {
    const container = document.getElementById('archivedMessagesContainer');
    const icon = document.getElementById('archivedToggleIcon');
    
    if (container.style.display === 'none') {
        container.style.display = 'block';
        icon.style.transform = 'rotate(180deg)';
    } else {
        container.style.display = 'none';
        icon.style.transform = 'rotate(0deg)';
    }
};

window.handleProfileUpdate = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('.save-btn');
    const msgDiv = document.getElementById('profileMessage');

    btn.disabled = true;
    msgDiv.classList.remove('show');

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            firstName: document.getElementById('firstName').value,
            lastName: document.getElementById('lastName').value,
            phone: document.getElementById('phone').value,
            profileUpdated: new Date()
        });

        msgDiv.textContent = '✓ Profile updated successfully!';
        msgDiv.classList.add('show', 'success');
    } catch (error) {
        msgDiv.textContent = 'Error updating profile: ' + error.message;
        msgDiv.classList.add('show', 'error');
    } finally {
        btn.disabled = false;
    }
};

window.handleChangePassword = async function(event) {
    event.preventDefault();
    const btn = event.target.querySelector('.save-btn');
    const msgDiv = document.getElementById('passwordMessage');

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword !== confirmPassword) {
        msgDiv.textContent = 'New passwords do not match';
        msgDiv.classList.add('show', 'error');
        return;
    }

    if (newPassword.length < 6) {
        msgDiv.textContent = 'Password must be at least 6 characters';
        msgDiv.classList.add('show', 'error');
        return;
    }

    btn.disabled = true;
    msgDiv.classList.remove('show');

    try {
        const auth = getAuth();
        const user = auth.currentUser;

        if (!user) {
            msgDiv.textContent = 'Error: User not found';
            msgDiv.classList.add('show', 'error');
            return;
        }

        // Reauthenticate user with current password
        const credential = EmailAuthProvider.credential(user.email, currentPassword);
        await reauthenticateWithCredential(user, credential);

        // Update password
        await updatePassword(user, newPassword);

        msgDiv.textContent = '✓ Password changed successfully!';
        msgDiv.classList.add('show', 'success');
        event.target.reset();

        setTimeout(() => msgDiv.classList.remove('show'), 3000);
    } catch (error) {
        if (error.code === 'auth/wrong-password') {
            msgDiv.textContent = 'Current password is incorrect';
        } else if (error.code === 'auth/weak-password') {
            msgDiv.textContent = 'New password is too weak. Use a stronger password';
        } else {
            msgDiv.textContent = 'Error changing password: ' + error.message;
        }
        msgDiv.classList.add('show', 'error');
    } finally {
        btn.disabled = false;
    }
};


// Load inbox - show message threads
async function loadInbox() {
    try {
        const container = document.getElementById('inboxList');
        
        if (!currentUser) {
            console.error('currentUser not set');
            container.innerHTML = '<div class="empty-state">Error: User not authenticated</div>';
            return;
        }
        
        console.log('loadInbox called for user:', currentUser.email);
        container.innerHTML = '<div class="empty-state">Loading messages...</div>';

        // Get all messages for this member - both sent by them and broadcast to them
        const allMessages = [];
        
        // Query 1: Messages sent BY this member (NO orderBy - will sort in JS)
        const sentQ = query(
            collection(db, 'messages'),
            where('from', '==', currentUser.email)
        );
        const sentSnapshot = await getDocs(sentQ);
        console.log('Found messages sent by member:', sentSnapshot.size);
        
        sentSnapshot.forEach(doc => {
            const msg = doc.data();
            console.log('Message from member:', {subject: msg.subject, deleted: msg.deleted, archived: msg.archived});
            if (!msg.deleted && !msg.archived) {
                allMessages.push({ id: doc.id, ...msg, messageType: 'sent' });
            }
        });

        // Query 2: Broadcast messages sent TO this member (NO orderBy - will sort in JS)
        const broadcastQ = query(
            collection(db, 'messages'),
            where('broadcastTo', '==', currentUser.email)
        );
        const broadcastSnapshot = await getDocs(broadcastQ);
        console.log('Found broadcast messages sent to member:', broadcastSnapshot.size);
        
        broadcastSnapshot.forEach(doc => {
            const msg = doc.data();
            console.log('Broadcast message to member:', {subject: msg.subject, deleted: msg.deleted, archived: msg.archived});
            if (!msg.deleted && !msg.archived) {
                allMessages.push({ id: doc.id, ...msg, messageType: 'broadcast' });
            }
        });

        console.log('Total messages after filtering:', allMessages.length);

        // Count unread messages (messages where coach hasn't replied yet)
        const unreadCount = allMessages.filter(msg => !msg.replies || msg.replies.length === 0).length;
        const unreadBadge = document.getElementById('inboxUnreadBadge');
        if (unreadCount > 0) {
            unreadBadge.textContent = unreadCount;
            unreadBadge.style.display = 'inline-flex';
        } else {
            unreadBadge.style.display = 'none';
        }

        // Sort by date (descending) - doing this in JavaScript instead of Firestore
        allMessages.sort((a, b) => {
            const aTime = a.dateSent?.seconds ? a.dateSent.seconds : (a.dateSent instanceof Date ? a.dateSent.getTime() / 1000 : 0);
            const bTime = b.dateSent?.seconds ? b.dateSent.seconds : (b.dateSent instanceof Date ? b.dateSent.getTime() / 1000 : 0);
            return bTime - aTime;
        });

        container.innerHTML = '';
        
        if (allMessages.length === 0) {
            container.innerHTML = '<div class="empty-state">No messages yet.</div>';
            return;
        }

        allMessages.forEach(msg => {
            const replies = msg.replies || [];
            const hasNewReplies = replies.length > 0;
            
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--white); padding: 1.5rem; border-radius: 8px; cursor: pointer; border-left: 4px solid ' + (hasNewReplies ? 'var(--accent)' : '#ddd') + '; transition: all 0.3s ease; user-select: none;';
            card.onmouseover = () => card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            card.onmouseout = () => card.style.boxShadow = 'none';
            
            const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
            const lastDate = lastReply ? formatDate(lastReply.dateSent) : formatDate(msg.dateSent);
            const broadcastBadge = msg.messageType === 'broadcast' ? '<span style="display: inline-block; background: #FF2400; color: white; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">📢 BROADCAST</span>' : '';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--primary-dark);">${escapeHtml(msg.subject)}${broadcastBadge}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-light); font-size: 0.9rem;">${lastDate}</p>
                        ${hasNewReplies ? '<p style="margin: 0; color: var(--accent); font-weight: 600;">💬 ' + replies.length + ' reply(replies)</p>' : ''}
                    </div>
                </div>
            `;
            card.onclick = () => openThreadModal(msg.id);
            container.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading inbox:', error);
        document.getElementById('inboxList').innerHTML = '<div class="empty-state">Error loading messages: ' + error.message + '</div>';
    }

    // Also load archived messages
    try {
        const archivedContainer = document.getElementById('archivedMessagesList');
        
        // Query for archived messages - get all messages first, then filter in JS
        const allArchivedMessages = [];
        
        const sentQ = query(
            collection(db, 'messages'),
            where('from', '==', currentUser.email)
        );
        const sentSnapshot = await getDocs(sentQ);
        
        sentSnapshot.forEach(doc => {
            const msg = doc.data();
            // Include if archived is true OR if it exists and is truthy
            if (!msg.deleted && msg.archived === true) {
                allArchivedMessages.push({ id: doc.id, ...msg, messageType: 'sent' });
            }
        });

        const broadcastQ = query(
            collection(db, 'messages'),
            where('broadcastTo', '==', currentUser.email)
        );
        const broadcastSnapshot = await getDocs(broadcastQ);

        broadcastSnapshot.forEach(doc => {
            const msg = doc.data();
            if (!msg.deleted && msg.archived === true) {
                allArchivedMessages.push({ id: doc.id, ...msg, messageType: 'broadcast' });
            }
        });

        // Sort by date
        allArchivedMessages.sort((a, b) => {
            const aTime = a.dateSent?.seconds ? a.dateSent.seconds : (a.dateSent instanceof Date ? a.dateSent.getTime() / 1000 : 0);
            const bTime = b.dateSent?.seconds ? b.dateSent.seconds : (b.dateSent instanceof Date ? b.dateSent.getTime() / 1000 : 0);
            return bTime - aTime;
        });

        archivedContainer.innerHTML = '';

        if (allArchivedMessages.length === 0) {
            archivedContainer.innerHTML = '<div class="empty-state" style="grid-column: 1/-1;">No archived messages.</div>';
            return;
        }

        allArchivedMessages.forEach(msg => {
            const replies = msg.replies || [];
            const hasNewReplies = replies.length > 0;
            
            const card = document.createElement('div');
            card.style.cssText = 'background: var(--white); padding: 1.5rem; border-radius: 8px; cursor: pointer; border-left: 4px solid ' + (hasNewReplies ? 'var(--accent)' : '#ddd') + '; transition: all 0.3s ease; user-select: none; opacity: 0.7;';
            card.onmouseover = () => card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
            card.onmouseout = () => card.style.boxShadow = 'none';
            
            const lastReply = replies.length > 0 ? replies[replies.length - 1] : null;
            const lastDate = lastReply ? formatDate(lastReply.dateSent) : formatDate(msg.dateSent);
            const broadcastBadge = msg.messageType === 'broadcast' ? '<span style="display: inline-block; background: #FF2400; color: white; padding: 0.3rem 0.6rem; border-radius: 4px; font-size: 0.75rem; font-weight: 600; margin-left: 0.5rem;">📢 BROADCAST</span>' : '';
            
            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <div style="flex: 1;">
                        <h4 style="margin: 0 0 0.5rem 0; color: var(--primary-dark);">${escapeHtml(msg.subject)}${broadcastBadge}</h4>
                        <p style="margin: 0 0 0.5rem 0; color: var(--text-light); font-size: 0.9rem;">${lastDate}</p>
                        ${hasNewReplies ? '<p style="margin: 0; color: var(--accent); font-weight: 600;">💬 ' + replies.length + ' reply(replies)</p>' : ''}
                    </div>
                </div>
            `;
            card.onclick = () => openThreadModal(msg.id);
            archivedContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Error loading archived messages:', error);
    }
}

window.handleSendMessage = async function(event) {
    event.preventDefault();
    console.log('handleSendMessage called');

    const subject = document.getElementById('messageSubject').value.trim();
    const content = document.getElementById('messageContent').value.trim();
    const msgDiv = document.getElementById('messageMessage');

    console.log('Subject:', subject, 'Content:', content);

    if (!subject || !content) {
        msgDiv.textContent = 'Please fill in subject and message';
        msgDiv.classList.add('show', 'error');
        console.log('Missing fields');
        return;
    }

    try {
        console.log('Creating message with user:', currentUser?.email);
        
        // Create new message document
        const messageData = {
            from: currentUser.email,
            fromName: currentUser.displayName || 'Member',
            email: currentUser.email,
            subject: subject,
            initialMessage: content,
            dateSent: new Date(),
            read: false,
            deleted: false,
            archived: false,
            isBroadcast: false,
            replies: []
        };

        console.log('Message data:', messageData);
        const docRef = await addDoc(collection(db, 'messages'), messageData);
        console.log('Message created with ID:', docRef.id);

        msgDiv.textContent = '✓ Message sent to Coach!';
        msgDiv.classList.add('show', 'success');
        document.getElementById('messageForm').reset();

        setTimeout(() => msgDiv.classList.remove('show'), 3000);

        // Reload inbox to show the new message
        setTimeout(() => loadInbox(), 1000);
    } catch (error) {
        console.error('Error sending message:', error);
        msgDiv.textContent = 'Error sending message: ' + error.message;
        msgDiv.classList.add('show', 'error');
    }
};

window.openThreadModal = async function(messageId) {
    try {
        console.log('openThreadModal called with messageId:', messageId);
        const msgRef = doc(db, 'messages', messageId);
        const msgDoc = await getDoc(msgRef);
        
        if (!msgDoc.exists()) {
            console.error('Message not found:', messageId);
            return;
        }

        const msg = msgDoc.data();
        currentThreadId = messageId;
        currentThreadIsArchived = msg.archived || false;
        console.log('Message opened:', {subject: msg.subject, archived: currentThreadIsArchived});

        // Mark message as read (even though member is viewing their own message, we mark it as read)
        try {
            await updateDoc(msgRef, { read: true });
            console.log('Message marked as read');
        } catch (error) {
            console.error('Error marking message as read:', error);
        }

        document.getElementById('threadSubject').textContent = escapeHtml(msg.subject);
        document.getElementById('threadReplyContent').value = '';

        // Show/hide archive and unarchive buttons
        const archiveBtn = document.getElementById('archiveThreadBtn');
        const unarchiveBtn = document.getElementById('unarchiveThreadBtn');
        
        if (currentThreadIsArchived) {
            archiveBtn.style.display = 'none';
            unarchiveBtn.style.display = 'block';
        } else {
            archiveBtn.style.display = 'block';
            unarchiveBtn.style.display = 'none';
        }

        // Build the message thread
        let threadHTML = `
            <div style="background: #f9f9f9; padding: 1.5rem; border-radius: 6px; margin-bottom: 1rem;">
                <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem;">You • ${formatDate(msg.dateSent)}</div>
                <p style="margin: 0; white-space: pre-wrap; color: var(--text);">${escapeHtml(msg.initialMessage)}</p>
            </div>
        `;

        // Add all replies
        const replies = msg.replies || [];
        replies.forEach(reply => {
            const isFromCoach = reply.from === 'coach';
            threadHTML += `
                <div style="background: ${isFromCoach ? '#f0f8ff' : '#f9f9f9'}; padding: 1.5rem; border-radius: 6px; margin-bottom: 1rem; border-left: 3px solid ${isFromCoach ? 'var(--accent)' : '#ddd'};">
                    <div style="color: var(--text-light); font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">${isFromCoach ? '🏒 Coach' : 'You'} • ${formatDate(reply.dateSent)}</div>
                    <p style="margin: 0; white-space: pre-wrap; color: var(--text);">${escapeHtml(reply.content)}</p>
                </div>
            `;
        });

        document.getElementById('threadMessages').innerHTML = threadHTML;
        document.getElementById('threadModal').style.display = 'flex';
    } catch (error) {
        console.error('Error opening thread:', error);
    }
};

window.closeThreadModal = function() {
    document.getElementById('threadModal').style.display = 'none';
};

window.sendThreadReply = async function() {
    if (!currentThreadId) return;

    const replyContent = document.getElementById('threadReplyContent').value.trim();
    if (!replyContent) {
        alert('Please type a reply');
        return;
    }

    try {
        const msgRef = doc(db, 'messages', currentThreadId);
        const msgDoc = await getDoc(msgRef);

        if (!msgDoc.exists()) {
            alert('Message thread not found');
            return;
        }

        const replies = msgDoc.data().replies || [];
        replies.push({
            from: 'member',
            content: replyContent,
            dateSent: new Date()
        });

        // Mark as having unread replies for admin and set read to false
        await updateDoc(msgRef, { 
            replies, 
            read: false,
            hasUnreadReplies: true
        });

        alert('Reply sent!');
        document.getElementById('threadReplyContent').value = '';

        // Reload thread to show new reply
        openThreadModal(currentThreadId);
    } catch (error) {
        console.error('Error sending reply:', error);
        alert('Error sending reply: ' + error.message);
    }
};

window.deleteThreadMessage = async function() {
    if (!currentThreadId) return;

    if (!confirm('Delete this message thread? It will be hidden from your inbox, but will reappear if the coach replies.')) {
        return;
    }

    try {
        const msgRef = doc(db, 'messages', currentThreadId);
        await updateDoc(msgRef, { deleted: true });

        alert('Message deleted');
        closeThreadModal();
        loadInbox();
    } catch (error) {
        console.error('Error deleting message:', error);
        alert('Error deleting message: ' + error.message);
    }
};

window.archiveThreadMessage = async function() {
    if (!currentThreadId) return;

    try {
        const msgRef = doc(db, 'messages', currentThreadId);
        await updateDoc(msgRef, { archived: true });

        alert('Message archived');
        closeThreadModal();
        loadInbox();
    } catch (error) {
        console.error('Error archiving message:', error);
        alert('Error archiving message: ' + error.message);
    }
};

window.unarchiveThreadMessage = async function() {
    if (!currentThreadId) return;

    try {
        const msgRef = doc(db, 'messages', currentThreadId);
        await updateDoc(msgRef, { archived: false });

        alert('Message moved back to inbox');
        closeThreadModal();
        loadInbox();
    } catch (error) {
        console.error('Error unarchiving message:', error);
        alert('Error unarchiving message: ' + error.message);
    }
};

// Display player profile
function displayPlayerProfile() {
    // Load player data into form fields
    const playerProfile = memberData.playerProfile || {};
    
    // Set positions
    document.getElementById('posForward').checked = playerProfile.positions && playerProfile.positions.includes('Forward');
    document.getElementById('posDefense').checked = playerProfile.positions && playerProfile.positions.includes('Defense');
    document.getElementById('posGoalie').checked = playerProfile.positions && playerProfile.positions.includes('Goalie');
    
    // Set other fields
    document.getElementById('playerYearsExp').value = playerProfile.yearsOfExperience || '';
    document.getElementById('playerBirthYearProfile').value = playerProfile.birthYear || '';

    // Load teams into table
    const teamsTable = document.getElementById('playerTeamsTable');
    teamsTable.innerHTML = '';
    const teams = playerProfile.teams || [];
    
    // Show at least 2 rows
    const rowsToShow = Math.max(2, teams.length);
    for (let i = 0; i < rowsToShow; i++) {
        const team = teams[i] || { organization: '', ageLevel: '' };
        addPlayerTeamRow(team.organization || '', team.ageLevel || '', i);
    }
}

window.addPlayerTeamRow = function(organization = '', ageLevel = '', index = null) {
    const table = document.getElementById('playerTeamsTable');
    const rowId = index !== null ? index : Date.now();
    
    const row = document.createElement('tr');
    row.id = `playerTeam-${rowId}`;
    row.innerHTML = `
        <td style="padding: 0.75rem; border: 1px solid var(--border);">
            <input type="text" class="playerTeamOrg" value="${organization}" placeholder="e.g., Local Juniors" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">
        </td>
        <td style="padding: 0.75rem; border: 1px solid var(--border);">
            <input type="text" class="playerTeamAgeLevel" value="${ageLevel}" placeholder="e.g., 12UAA" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 4px; box-sizing: border-box;">
        </td>
        <td style="padding: 0.75rem; border: 1px solid var(--border); text-align: center;">
            <button type="button" onclick="removePlayerTeamRow('${rowId}')" style="background: #dc3545; color: white; border: none; padding: 0.5rem 0.9rem; border-radius: 4px; cursor: pointer; font-weight: 700; font-size: 1.1rem; line-height: 1;">×</button>
        </td>
    `;
    table.appendChild(row);
};

window.removePlayerTeamRow = function(rowId) {
    const row = document.getElementById(`playerTeam-${rowId}`);
    if (row) {
        row.remove();
    }
};

window.updatePlayerPositions = function() {
    // This is called when position checkboxes change
    // Currently just a placeholder - positions are saved when form is submitted
    console.log('Player positions updated');
};

window.handlePlayerProfileUpdate = async function(event) {
    event.preventDefault();

    const positions = [];
    if (document.getElementById('posForward').checked) positions.push('Forward');
    if (document.getElementById('posDefense').checked) positions.push('Defense');
    if (document.getElementById('posGoalie').checked) positions.push('Goalie');

    const yearsExp = document.getElementById('playerYearsExp').value;
    const birthYear = document.getElementById('playerBirthYearProfile').value;

    // Get teams from table rows
    const teams = [];
    document.querySelectorAll('#playerTeamsTable tr').forEach(row => {
        const orgField = row.querySelector('.playerTeamOrg');
        const ageLevelField = row.querySelector('.playerTeamAgeLevel');
        
        if (orgField && ageLevelField) {
            const organization = orgField.value.trim();
            const ageLevel = ageLevelField.value.trim();
            
            if (organization || ageLevel) {
                teams.push({ organization, ageLevel });
            }
        }
    });

    const msgDiv = document.getElementById('playerProfileMessage');
    const btn = event.target.querySelector('.save-btn');

    btn.disabled = true;
    msgDiv.classList.remove('show');

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            playerProfile: {
                positions: positions,
                yearsOfExperience: yearsExp ? parseInt(yearsExp) : null,
                birthYear: birthYear ? parseInt(birthYear) : null,
                teams: teams
            }
        });

        msgDiv.textContent = '✓ Player profile updated successfully!';
        msgDiv.classList.add('show', 'success');
        
        // Update memberData
        memberData.playerProfile = {
            positions: positions,
            yearsOfExperience: yearsExp ? parseInt(yearsExp) : null,
            birthYear: birthYear ? parseInt(birthYear) : null,
            teams: teams
        };

        setTimeout(() => msgDiv.classList.remove('show'), 3000);
    } catch (error) {
        msgDiv.textContent = 'Error updating profile: ' + error.message;
        msgDiv.classList.add('show', 'error');
    } finally {
        btn.disabled = false;
    }
};

function displayCoachProfile() {
    // Load coach data into form fields
    const coachProfile = memberData.coachProfile || {};
    
    document.getElementById('coachYearsExp').value = coachProfile.yearsOfExperience || '';
    document.getElementById('coachUSAHockeyLevel').value = coachProfile.usaHockeyLevel || '';

    // Load teams
    const teamsContainer = document.getElementById('coachTeamsList');
    teamsContainer.innerHTML = '';
    const teams = coachProfile.teams || [];
    
    teams.forEach((team, index) => {
        addCoachTeamField(team.name, team.position, index);
    });

    // If no teams, add one empty field
    if (teams.length === 0) {
        addCoachTeamField();
    }
}

window.addCoachTeamField = function(teamName = '', position = '', index = null) {
    const container = document.getElementById('coachTeamsList');
    const fieldId = index !== null ? index : Date.now();
    
    const div = document.createElement('div');
    div.id = `coachTeam-${fieldId}`;
    div.style.cssText = 'display: flex; gap: 0.5rem; margin-bottom: 1rem; align-items: flex-end;';
    div.innerHTML = `
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label style="display: block; font-size: 0.9rem;">Team Name</label>
            <input type="text" class="coachTeamName" value="${teamName}" placeholder="e.g., Local Juniors" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 4px;">
        </div>
        <div class="form-group" style="flex: 1; margin-bottom: 0;">
            <label style="display: block; font-size: 0.9rem;">Position</label>
            <input type="text" class="coachTeamPosition" value="${position}" placeholder="e.g., Head Coach" style="width: 100%; padding: 0.6rem; border: 1px solid var(--border); border-radius: 4px;">
        </div>
        <button type="button" onclick="removeCoachTeamField('${fieldId}')" style="background: var(--danger); color: white; border: none; padding: 0.6rem 1rem; border-radius: 4px; cursor: pointer; font-weight: 600;">Remove</button>
    `;
    container.appendChild(div);
};

window.removeCoachTeamField = function(fieldId) {
    const field = document.getElementById(`coachTeam-${fieldId}`);
    if (field) {
        field.remove();
    }
};

window.handleCoachProfileUpdate = async function(event) {
    event.preventDefault();

    const yearsExp = document.getElementById('coachYearsExp').value;
    const usaLevel = document.getElementById('coachUSAHockeyLevel').value;

    // Get teams
    const teams = [];
    document.querySelectorAll('#coachTeamsList .coachTeamName').forEach((nameField, index) => {
        const name = nameField.value.trim();
        const posField = document.querySelectorAll('#coachTeamsList .coachTeamPosition')[index];
        const position = posField ? posField.value.trim() : '';
        
        if (name) {
            teams.push({ name, position });
        }
    });

    const msgDiv = document.getElementById('coachProfileMessage');
    const btn = event.target.querySelector('.save-btn');

    btn.disabled = true;
    msgDiv.classList.remove('show');

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            coachProfile: {
                yearsOfExperience: yearsExp ? parseInt(yearsExp) : null,
                usaHockeyLevel: usaLevel ? parseInt(usaLevel) : null,
                teams: teams
            }
        });

        msgDiv.textContent = '✓ Coach profile updated successfully!';
        msgDiv.classList.add('show', 'success');

        // Update memberData
        memberData.coachProfile = {
            yearsOfExperience: yearsExp ? parseInt(yearsExp) : null,
            usaHockeyLevel: usaLevel ? parseInt(usaLevel) : null,
            teams: teams
        };

        setTimeout(() => msgDiv.classList.remove('show'), 3000);
    } catch (error) {
        msgDiv.textContent = 'Error updating profile: ' + error.message;
        msgDiv.classList.add('show', 'error');
    } finally {
        btn.disabled = false;
    }
};

// Load players list
async function loadPlayersList() {
    const container = document.getElementById('playersList');
    const players = memberData.players || [];

    container.innerHTML = '';
    if (players.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center;">No players added yet.</p>';
        return;
    }

    players.forEach((player, index) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: var(--light-gray); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;';
        card.innerHTML = `
            <div>
                <strong>${escapeHtml(player.name)}</strong> - Born ${player.birthYear} ${player.team ? `(${escapeHtml(player.team)})` : ''}
            </div>
            <button type="button" onclick="window.removePlayer(${index})" style="padding: 0.5rem 1rem; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Remove</button>
        `;
        container.appendChild(card);
    });
}

// Add player
window.handleAddPlayer = async function(event) {
    event.preventDefault();

    const playerName = document.getElementById('playerName').value;
    const playerBirthYear = document.getElementById('playerBirthYear').value;
    const playerTeam = document.getElementById('playerTeam').value;

    if (!memberData.players) memberData.players = [];

    memberData.players.push({
        name: playerName,
        birthYear: playerBirthYear,
        team: playerTeam
    });

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            players: memberData.players
        });

        document.getElementById('playerForm').reset();
        loadPlayersList();
    } catch (error) {
        alert('Error adding player: ' + error.message);
    }
};

// Remove player
window.removePlayer = async function(index) {
    if (!confirm('Remove this player?')) return;

    memberData.players.splice(index, 1);

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            players: memberData.players
        });

        loadPlayersList();
    } catch (error) {
        alert('Error removing player: ' + error.message);
    }
};

// Load teams list
async function loadTeamsList() {
    const container = document.getElementById('teamsList');
    const teams = memberData.teams || [];

    container.innerHTML = '';
    if (teams.length === 0) {
        container.innerHTML = '<p style="color: var(--text-light); text-align: center;">No teams added yet.</p>';
        return;
    }

    teams.forEach((team, index) => {
        const card = document.createElement('div');
        card.style.cssText = 'background: var(--light-gray); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: flex; justify-content: space-between; align-items: center;';
        card.innerHTML = `
            <div>
                <strong>${escapeHtml(team.name)}</strong> - ${escapeHtml(team.ageGroup)} • ${escapeHtml(team.city)}, ${escapeHtml(team.state)}
            </div>
            <button type="button" onclick="window.removeTeam(${index})" style="padding: 0.5rem 1rem; background: var(--danger); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600;">Remove</button>
        `;
        container.appendChild(card);
    });
}

// Add team
window.handleAddTeam = async function(event) {
    event.preventDefault();

    const teamName = document.getElementById('teamName').value;
    const teamAgeGroup = document.getElementById('teamAgeGroup').value;
    const teamCity = document.getElementById('teamCity').value;
    const teamState = document.getElementById('teamState').value;

    if (!memberData.teams) memberData.teams = [];

    memberData.teams.push({
        name: teamName,
        ageGroup: teamAgeGroup,
        city: teamCity,
        state: teamState
    });

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            teams: memberData.teams
        });

        document.getElementById('teamForm').reset();
        loadTeamsList();
    } catch (error) {
        alert('Error adding team: ' + error.message);
    }
};

// Remove team
window.removeTeam = async function(index) {
    if (!confirm('Remove this team?')) return;

    memberData.teams.splice(index, 1);

    try {
        await updateDoc(doc(db, 'members', memberData.id), {
            teams: memberData.teams
        });

        loadTeamsList();
    } catch (error) {
        alert('Error removing team: ' + error.message);
    }
};

window._handleLogout = async function() {
    try {
        await signOut(auth);
        window.location.href = '/';
    } catch (error) {
        alert('Error logging out: ' + error.message);
    }
};
