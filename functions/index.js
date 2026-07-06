const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

admin.initializeApp();

setGlobalOptions({ maxInstances: 10 });

// Configure email transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASSWORD
    }
});

// Send welcome email to new members
exports.sendWelcomeEmail = onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', 'https://coach-berry.com');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { firstName, lastName, email, tempPassword } = req.body;

        if (!firstName || !lastName || !email || !tempPassword) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }

        const mailOptions = {
            from: `"Coach Berry" <noreply@coach-berry.com>`,
            to: email,
            subject: 'Welcome to Coach Berry\'s Community - Your Account is Ready!',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <img src="https://coachberry.github.io/coachberry/CoachBerryLOGO-transparent-lightbg.png" alt="Coach Berry" style="max-width: 200px; height: auto;">
                    </div>
                    
                    <h1 style="color: #000000; text-align: center; margin-bottom: 20px;">Welcome, ${firstName}!</h1>
                    
                    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                        Your Coach Berry member account has been created successfully! You now have access to our hockey knowledge hub, exclusive drills, strategies, and coaching content.
                    </p>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 30px 0; border-left: 4px solid #FF2400;">
                        <h3 style="color: #000000; margin-top: 0; margin-bottom: 15px;">Your Login Information:</h3>
                        <p style="margin: 10px 0; color: #1a1a1a;">
                            <strong>Email:</strong><br>
                            <span style="font-family: monospace; background: #ffffff; padding: 8px; border-radius: 4px; display: block; word-break: break-all;">${email}</span>
                        </p>
                        <p style="margin: 15px 0 10px 0; color: #1a1a1a;">
                            <strong>Temporary Password:</strong><br>
                            <span style="font-family: monospace; background: #ffffff; padding: 8px; border-radius: 4px; display: block; font-weight: bold; letter-spacing: 1px;">${tempPassword}</span>
                        </p>
                        <p style="margin: 15px 0; color: #f44336; font-size: 14px;">
                            <strong>⚠️ Important:</strong> We recommend changing your password after your first login.
                        </p>
                    </div>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="https://coach-berry.com/member-login/" style="background-color: #FF2400; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Login to Your Dashboard</a>
                    </div>
                    
                    <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">
                    
                    <p style="color: #4a4a4a; font-size: 14px; margin-bottom: 10px;">
                        If you have any questions or need assistance, feel free to reach out through your dashboard messaging system.
                    </p>
                    
                    <p style="color: #4a4a4a; font-size: 14px;">
                        Looking forward to helping you elevate your hockey game!<br>
                        <strong>Coach Matt Berry</strong>
                    </p>
                    
                    <div style="text-align: center; color: #999999; font-size: 12px; margin-top: 30px;">
                        <p>Coach Berry's Hockey Community<br>
                        <a href="https://coach-berry.com" style="color: #FF2400; text-decoration: none;">coach-berry.com</a></p>
                    </div>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ success: true, message: 'Email sent successfully' });
    } catch (error) {
        console.error('Error sending email:', error);
        res.status(500).json({ error: 'Failed to send email', details: error.message });
    }
});

// Delete user from Firebase Auth
exports.deleteUserAuth = onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', 'https://coach-berry.com');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { email } = req.body;

        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }

        // Get user by email
        const user = await admin.auth().getUserByEmail(email);

        // Delete the user
        await admin.auth().deleteUser(user.uid);

        res.status(200).json({ success: true, message: 'User deleted from Auth successfully' });
    } catch (error) {
        console.error('Error deleting user from Auth:', error);
        
        // If user not found, that's okay - just return success
        if (error.code === 'auth/user-not-found') {
            res.status(200).json({ success: true, message: 'User not found in Auth (already deleted)' });
        } else {
            res.status(500).json({ error: 'Failed to delete user from Auth', details: error.message });
        }
    }
});

// Send broadcast message to multiple members
exports.sendBroadcastMessage = onRequest(async (req, res) => {
    // CORS headers
    res.set('Access-Control-Allow-Origin', 'https://coach-berry.com');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(204).send('');
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).send('Method Not Allowed');
        return;
    }

    try {
        const { subject, content, recipients } = req.body;

        if (!subject || !content || !recipients || !Array.isArray(recipients)) {
            res.status(400).json({ error: 'Missing required fields: subject, content, recipients' });
            return;
        }

        // Create a fresh transporter for this function
        const gmailTransporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: 'coachberry03@gmail.com',
                pass: 'ptdk tobh mwse srko'
            }
        });

        const db = admin.firestore();
        const timestamp = new Date();
        let successCount = 0;
        let emailCount = 0;

        // Send to each recipient
        for (const recipient of recipients) {
            try {
                // Create message in the messages collection so it appears in member inbox
                await db.collection('messages').add({
                    from: 'broadcast',
                    fromName: 'Coach Berry',
                    email: recipient.email,
                    subject: subject,
                    initialMessage: content,
                    dateSent: timestamp,
                    read: false,
                    isBroadcast: true,
                    broadcastTo: recipient.email,
                    replies: []
                });

                // Send email
                const mailOptions = {
                    from: `"Coach Berry" <noreply@coach-berry.com>`,
                    to: recipient.email,
                    subject: `Message from Coach Berry: ${subject}`,
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                            <div style="text-align: center; margin-bottom: 30px;">
                                <img src="https://coachberry.github.io/coachberry/CoachBerryLOGO-transparent-lightbg.png" alt="Coach Berry" style="max-width: 150px; height: auto;">
                            </div>
                            
                            <h2 style="color: #000000; margin-bottom: 20px;">Coach Berry sent you a message:</h2>
                            
                            <div style="background-color: #f9f9f9; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF2400;">
                                <h3 style="color: #000000; margin-top: 0; margin-bottom: 15px;">${escapeHtml(subject)}</h3>
                                <p style="color: #333333; font-size: 16px; line-height: 1.6; white-space: pre-wrap; margin: 0;">${escapeHtml(content)}</p>
                            </div>

                            <div style="text-align: center; margin: 30px 0;">
                                <a href="https://coach-berry.com/member-dashboard/" style="background-color: #FF2400; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">View in Dashboard</a>
                            </div>

                            <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 30px 0;">

                            <p style="color: #666666; font-size: 14px;">
                                You can view this message and reply through your member dashboard.
                            </p>

                            <div style="text-align: center; color: #999999; font-size: 12px; margin-top: 30px;">
                                <p>Coach Berry's Hockey Community<br>
                                <a href="https://coach-berry.com" style="color: #FF2400; text-decoration: none;">coach-berry.com</a></p>
                            </div>
                        </div>
                    `
                };

                await gmailTransporter.sendMail(mailOptions);
                emailCount++;
                successCount++;
            } catch (error) {
                console.error(`Error sending to ${recipient.email}:`, error);
            }
        }

        res.status(200).json({ 
            success: true, 
            message: `Message sent to ${successCount} member(s)`,
            emailsSent: emailCount
        });
    } catch (error) {
        console.error('Error sending broadcast message:', error);
        res.status(500).json({ error: 'Failed to send broadcast message', details: error.message });
    }
});

function escapeHtml(text) {
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, m => map[m]);
}
