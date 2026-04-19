import User from "../models/User.js";
import sendEmail from "./sendEmail.js";

/**
 * Sends an email alert to all users with the role 'subadmin'
 * @param {Object} params
 * @param {string} params.subject - Email subject
 * @param {string} params.type - 'KYC' or 'Vehicle'
 * @param {Object} params.details - Summary details for the email body
 * @param {string} params.linkPath - Path to the specific dashboard tab
 */
export const sendSubadminAlert = async ({ subject, type, details, linkPath }) => {
    try {
        const subadmins = await User.find({ role: "subadmin" });
        
        if (!subadmins || subadmins.length === 0) {
            console.log("No subadmins found to notify.");
            return;
        }

        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + (linkPath || "/subadmin");

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #0d9488; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Rentify Admin Alert</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <h2 style="font-size: 20px; color: #0d9488; margin-top: 0;">New Pending ${type}</h2>
                    <p style="font-size: 16px; line-height: 1.6;">A new ${type.toLowerCase()} request has been submitted and requires your attention.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <h3 style="font-size: 14px; text-transform: uppercase; color: #64748b; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.05em;">Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px;">
                            ${Object.entries(details).map(([key, value]) => `
                                <li style="margin-bottom: 8px;">
                                    <strong style="color: #475569;">${key}:</strong> ${value}
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #0d9488; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Review in Dashboard</a>
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">This is an automated notification from the Rentify Platform.</p>
                </div>
            </div>
        `;

        const emailPromises = subadmins.map(admin => {
            // Determine recipient email: use notificationEmail if active, otherwise fallback to login email
            const recipientEmail = (admin.isNotificationEmailActive && admin.notificationEmail) 
                ? admin.notificationEmail 
                : admin.email;

            return sendEmail({
                to: recipientEmail,
                subject: subject,
                html: html
            }).catch(err => console.error(`Failed to send email to ${recipientEmail}:`, err));
        });

        await Promise.all(emailPromises);
        console.log(`Sub-admin alerts sent for ${type}`);
        
    } catch (error) {
        console.error("Error in sendSubadminAlert:", error);
    }
};

/**
 * Sends a rejection notification to a user
 * @param {Object} user - User document
 * @param {string} type - 'KYC', 'Vehicle', or 'Review'
 * @param {string} reason - Selected rejection reason
 * @param {string} comment - Optional additional feedback
 */
export const sendRejectionEmail = async (user, type, reason, comment) => {
    try {
        const resubmitLinks = {
            'KYC': '/profile/verify',
            'Vehicle': '/owner/vehicles',
            'Review': '/bookings'
        };

        const linkPath = resubmitLinks[type] || '/';
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + linkPath;

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ef4444; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Action Required: Rentify</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <h2 style="font-size: 20px; color: #ef4444; margin-top: 0;">Your ${type} submission was not approved</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
                    <p style="font-size: 16px; line-height: 1.6;">Our moderation team has reviewed your ${type.toLowerCase()} submission and unfortunately, it could not be approved at this time.</p>
                    
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 24px 0; border-left: 4px solid #ef4444;">
                        <h3 style="font-size: 14px; text-transform: uppercase; color: #991b1b; margin-top: 0; margin-bottom: 8px;">Reason for Rejection</h3>
                        <p style="font-size: 15px; margin-bottom: 0; font-weight: 600; color: #1e293b;">${reason}</p>
                        ${comment ? `<p style="font-size: 14px; margin-top: 8px; color: #475569; font-style: italic;">"${comment}"</p>` : ''}
                    </div>

                    <p style="font-size: 15px; line-height: 1.6;"><strong>Next Steps:</strong> Please address the issue above and resubmit your details for review.</p>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Go to Resubmit</a>
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">This is an automated message from Rentify. If you have questions, please contact support.</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: `Rentify: Your ${type} Submission Status Update`,
            html: html
        });

        console.log(`Rejection email sent to ${user.email} for ${type}`);
    } catch (error) {
        console.error("Error in sendRejectionEmail:", error);
    }
};

/**
 * Sends an approval notification to a user
 * @param {Object} user - User document
 * @param {string} type - 'KYC' or 'Vehicle'
 * @param {string} itemName - Optional name of the approved item (e.g. vehicle title)
 */
export const sendApprovalEmail = async (user, type, itemName) => {
    try {
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + (type === 'KYC' ? '/dashboard' : '/owner/vehicles');
        
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #10b981; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Congratulations!</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <h2 style="font-size: 20px; color: #10b981; margin-top: 0;">Your ${type} has been approved</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
                    <p style="font-size: 16px; line-height: 1.6;">We're happy to inform you that your ${type.toLowerCase()} ${itemName ? `(${itemName}) ` : ''}has been successfully reviewed and approved by our team.</p>
                    
                    ${type === 'KYC' ? '<p style="font-size: 15px; line-height: 1.6;">You can now book vehicles and access all premium features of the platform.</p>' : ''}
                    ${type === 'Vehicle' ? '<p style="font-size: 15px; line-height: 1.6;">Your listing is now live and visible to potential renters. Good luck with your first booking!</p>' : ''}

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Go to Dashboard</a>
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">Thank you for being part of Rentify!</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: user.email,
            subject: `Rentify: Your ${type} has been Approved!`,
            html: html
        });

        console.log(`Approval email sent to ${user.email} for ${type}`);
    } catch (error) {
        console.error("Error in sendApprovalEmail:", error);
    }
};

/**
 * Sends a generic booking update (rejection/cancellation)
 */
export const sendBookingUpdateEmail = async (bookingOwner, renter, vehicle, status) => {
    try {
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/dashboard";
        const isCancellation = status === 'CANCELLED';
        
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #64748b; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Booking ${isCancellation ? 'Cancelled' : 'Update'}</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <p style="font-size: 16px; line-height: 1.6;">Hello,</p>
                    <p style="font-size: 16px; line-height: 1.6;">This is to notify you that the booking for <strong>${vehicle.title}</strong> has been <strong>${status.toLowerCase()}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0;">
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px;">
                            <li style="margin-bottom: 8px;"><strong style="color: #475569;">Vehicle:</strong> ${vehicle.title}</li>
                            <li style="margin-bottom: 8px;"><strong style="color: #475569;">Status:</strong> ${status}</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">View Dashboard</a>
                    </div>
                </div>
            </div>
        `;

        // Notify both parties of the update
        const participants = [renter.email, bookingOwner.email];
        await Promise.all(participants.map(email => 
            sendEmail({
                to: email,
                subject: `Rentify: Booking ${status} - ${vehicle.title}`,
                html: html
            })
        ));

        console.log(`Booking update (${status}) emails sent to renter and owner`);
    } catch (error) {
        console.error("Error in sendBookingUpdateEmail:", error);
    }
};

/**
 * Sends a notification to the owner about a new booking request
 */
export const sendNewBookingEmail = async (owner, renterName, vehicleTitle, startDate, endDate, totalAmount) => {
    try {
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/dashboard";
        
        // Determine recipient email: use notificationEmail if active, otherwise fallback to login email
        const recipientEmail = (owner.isNotificationEmailActive && owner.notificationEmail) 
            ? owner.notificationEmail 
            : owner.email;

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #2563eb; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">New Booking Request</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <p style="font-size: 16px; line-height: 1.6;">Hello <strong>${owner.name}</strong>,</p>
                    <p style="font-size: 16px; line-height: 1.6;">You have received a new booking request for your vehicle, <strong>${vehicleTitle}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; margin: 24px 0; border: 1px solid #e2e8f0;">
                        <h3 style="font-size: 14px; text-transform: uppercase; color: #64748b; margin-top: 0; margin-bottom: 12px; letter-spacing: 0.05em;">Reservation Details</h3>
                        <ul style="list-style: none; padding: 0; margin: 0; font-size: 15px;">
                            <li style="margin-bottom: 8px;"><strong style="color: #475569;">Renter:</strong> ${renterName}</li>
                            <li style="margin-bottom: 8px;"><strong style="color: #475569;">Dates:</strong> ${new Date(startDate).toDateString()} - ${new Date(endDate).toDateString()}</li>
                            <li style="margin-bottom: 8px;"><strong style="color: #475569;">Total Amount:</strong> LKR ${totalAmount.toLocaleString()}</li>
                        </ul>
                    </div>

                    <p style="font-size: 15px; line-height: 1.6;">Please review this request in your dashboard to accept or reject it.</p>

                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #2563eb; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Manage Booking</a>
                    </div>
                </div>
                <div style="background-color: #f1f5f9; padding: 16px; text-align: center; font-size: 12px; color: #64748b;">
                    <p style="margin: 0;">This request will expire if not handled promptly.</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: recipientEmail,
            subject: `🔔 New Booking Request: ${vehicleTitle}`,
            html: html
        });

        console.log(`New booking email sent to ${recipientEmail}`);
    } catch (error) {
        console.error("Error in sendNewBookingEmail:", error);
    }
};

/**
 * Sends a subscription expiry reminder
 * @param {Object} user - User document
 * @param {number} daysLeft - 7 or 1
 */
export const sendSubscriptionReminder = async (user, daysLeft) => {
    try {
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/subscription";
        const subject = daysLeft === 1 
            ? "Urgent: Your Rentify Subscription expires tomorrow!" 
            : `Reminder: Your Rentify Subscription expires in ${daysLeft} days`;

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #f59e0b; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Subscription Renewal</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <p style="font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
                    <p style="font-size: 16px; line-height: 1.6;">Your ${user.subscription.tier} plan is set to expire in <strong>${daysLeft} ${daysLeft === 1 ? 'day' : 'days'}</strong> (${new Date(user.subscription.endDate).toLocaleDateString()}).</p>
                    <p style="font-size: 16px; line-height: 1.6;">To avoid any interruption in your listing visibility, please renew your subscription soon.</p>
                    
                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Renew Now</a>
                    </div>
                </div>
            </div>
        `;

        await sendEmail({ to: user.email, subject, html });
    } catch (err) {
        console.error("Error in sendSubscriptionReminder:", err);
    }
};

/**
 * Sends a notification when the grace period ends and listings are hidden
 */
export const sendSubscriptionExpired = async (user) => {
    try {
        const dashboardUrl = (process.env.FRONTEND_URL || "http://localhost:5173") + "/subscription";
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
                <div style="background-color: #ef4444; padding: 24px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Listings Hidden</h1>
                </div>
                <div style="padding: 32px; color: #1e293b;">
                    <h2 style="font-size: 20px; color: #ef4444; margin-top: 0;">Your Subscription has Expired</h2>
                    <p style="font-size: 16px; line-height: 1.6;">Hello ${user.name},</p>
                    <p style="font-size: 16px; line-height: 1.6;">Your subscription and grace period have ended. As a result, your vehicle listings are no longer visible to the public.</p>
                    <p style="font-size: 16px; line-height: 1.6;">Renew your plan today to instantly reactivate all your listings.</p>
                    
                    <div style="text-align: center; margin-top: 32px;">
                        <a href="${dashboardUrl}" style="background-color: #1e293b; color: white; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">Renew Now</a>
                    </div>
                </div>
            </div>
        `;

        await sendEmail({ to: user.email, subject: "Rentify: Your listings are now hidden", html });
    } catch (err) {
        console.error("Error in sendSubscriptionExpired:", err);
    }
};
