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
                    <h1 style="color: white; margin: 0; font-size: 24px;">Flexify Admin Alert</h1>
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
                    <p style="margin: 0;">This is an automated notification from the Flexify Platform.</p>
                </div>
            </div>
        `;

        const emailPromises = subadmins.map(admin => 
            sendEmail({
                to: admin.email,
                subject: subject,
                html: html
            }).catch(err => console.error(`Failed to send email to ${admin.email}:`, err))
        );

        await Promise.all(emailPromises);
        console.log(`Sub-admin alerts sent for ${type}`);
        
    } catch (error) {
        console.error("Error in sendSubadminAlert:", error);
    }
};
