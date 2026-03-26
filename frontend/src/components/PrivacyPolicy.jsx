import React from "react";

const privacyPolicyText = `Shine Privacy Policy
Effective Date: [Insert Date]
1. Introduction
Welcome to Shine (“we,” “our,” or “us”). Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our website and services. By using Shine, you agree to the terms outlined here.
2. Information We Collect
We collect information to provide and improve our services, including:
Personal Information: Name, email, username, profile picture, and any details you provide during registration.
User Content: Posts, comments, messages, and any media you share.
Usage Data: IP address, browser type, device information, pages visited, clicks, and activity logs.
Cookies & Tracking: Cookies and similar tools are used to enhance your experience, measure engagement, and personalize content.
3. How We Use Your Information
Your information is used to:
Provide and maintain Shine services.
Improve your experience and personalize content.
Send notifications, updates, or marketing (if you opt-in).
Monitor, detect, and prevent fraud or abuse.
Comply with legal obligations.
4. Sharing Your Information
We may share information:
With trusted service providers who help operate Shine.
To comply with law enforcement or legal requirements.
To protect rights, safety, or property.
With your consent or in the event of a business transfer.
5. Your Rights
You have the right to:
Access, update, or delete your personal data.
Withdraw consent for certain data processing.
Opt-out of marketing communications.
Request a copy of your data in a portable format.
6. Data Retention
We retain your information only as long as necessary to provide services or comply with legal requirements. Deleted accounts will have data removed within a reasonable timeframe.
7. Security
We implement reasonable measures to protect your information. However, no platform is completely secure.
8. Children’s Privacy
Shine is not intended for users under 13. We do not knowingly collect personal information from children under 13.
9. Cookies & Tracking
We use cookies for functional, analytics, and personalized content purposes. You can manage cookie preferences through your browser settings.
10. Third-Party Services
Shine may use third-party services (e.g., analytics, embedded media). These services have their own privacy policies; Shine is not responsible for third-party practices.
11. Changes to Privacy Policy
We may update this Privacy Policy. Major changes will be communicated via email or website notification.
12. Contact Us
Questions about this Privacy Policy can be directed to: contact@sshine.org`;

export default function PrivacyPolicy() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "inherit", paddingTop: "60px" }}>
        {privacyPolicyText}
      </pre>
    </main>
  );
}
