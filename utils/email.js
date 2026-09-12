const nodemailer = require('nodemailer');
const config = require('../config');

// Create a transporter using SMTP settings from config
const transporter = nodemailer.createTransport({
    host: config.smtpHost,
    port: config.smtpPort,
    secure: config.smtpPort === 465, // true for 465, false for other ports
    auth: {
        user: config.smtpUser,
        pass: config.smtpPass
    }
});

/**
 * Sends a welcome/registration email to the newly registered user.
 * 
 * @param {string} toEmail - The recipient's email address
 * @param {string} fullName - The recipient's full name
 */
async function sendRegistrationEmail(toEmail, fullName) {
    // If SMTP credentials aren't configured, log a warning and skip
    if (!config.smtpUser || !config.smtpPass || config.smtpUser.includes('your_email@gmail.com')) {
        console.warn(`[Email Skip] Registration email to ${toEmail} skipped because SMTP is not configured.`);
        return;
    }

    const mailOptions = {
        from: config.emailFrom,
        to: toEmail,
        subject: 'Welcome to PharmaCast! Your Registration is Pending',
        html: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
                <h2 style="color: #059669; text-align: center;">Welcome to PharmaCast</h2>
                <p style="font-size: 16px; color: #333;">Hello <strong>${fullName}</strong>,</p>
                <p style="font-size: 16px; color: #333;">Thank you for registering with the PharmaCast AI-Based Medicine Demand Prediction System.</p>
                <div style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; color: #065f46; font-weight: 500;">Your account is currently pending administrator approval.</p>
                </div>
                <p style="font-size: 16px; color: #333;">You will receive another notification once an administrator reviews and approves your registration.</p>
                <p style="font-size: 16px; color: #333;">Best regards,<br>The PharmaCast Team</p>
            </div>
        `
    };

    try {
        const info = await transporter.sendMail(mailOptions);
        console.log(`[Email Sent] Registration email successfully sent to ${toEmail}. Message ID: ${info.messageId}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send registration email to ${toEmail}:`, error);
        // We do not rethrow because we don't want the email failure to rollback a successful registration
    }
}

module.exports = {
    sendRegistrationEmail
};
