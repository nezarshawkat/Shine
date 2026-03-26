import React from "react";

const termsConditionsText = `Shine Terms & Conditions
Effective Date: [Insert Date]
1. Acceptance of Terms
By using Shine, you agree to these Terms & Conditions. If you do not agree, you may not use the platform.
2. Eligibility
You must be at least 13 years old to use Shine. Certain features may require parental consent for minors under 16 (depending on local law).
3. Account Responsibility
You are responsible for all activity under your account.
Protect your login credentials. Sharing accounts is prohibited.
We may suspend or terminate accounts for suspicious activity.
4. Prohibited Content & Behavior
Shine strictly prohibits the posting or sharing of any content or behavior that is:
Illegal (e.g., fraud, drug trafficking, violence).
Offensive, hateful, or discriminatory.
Harassing, threatening, or abusive.
Pornographic, sexually explicit, or obscene.
Spam, scams, or misleading information.
Violating intellectual property rights.
Promoting self-harm or harm to others.
Any content Shine deems inappropriate or unsafe.
Violation may lead to immediate account suspension or termination without notice.
5. User-Generated Content
You retain ownership of your content but grant Shine a worldwide, royalty-free license to display, distribute, and modify it for platform purposes.
Shine does not endorse user content and is not responsible for accuracy.
Shine reserves the right to remove any content violating rules or harmful to the community.
6. Privacy
Your use of Shine is governed by our Privacy Policy. By using the platform, you consent to data collection as described therein.
7. Intellectual Property
Shine owns all intellectual property related to the platform (logo, design, code, content).
You may not copy, reproduce, or distribute Shine’s content without permission.
8. Termination & Suspension
Shine may suspend or terminate accounts violating rules or for security reasons.
Users may delete their accounts at any time, subject to data retention policies.
9. Disclaimers & Limitation of Liability
Shine is provided “as-is.” We do not guarantee uninterrupted access or accuracy of user content.
Shine is not liable for damages arising from your use or inability to use the platform.
10. Changes to Terms
We may update these Terms periodically. Continued use constitutes acceptance of changes.
11. Governing Law & Disputes
These Terms are governed by the laws of Egypt. Disputes will be handled in the courts of Egypt.
12. Contact
For questions about these Terms, contact: contact@sshine.org`;

export default function TermsConditions() {
  return (
    <main style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem" }}>
      <pre style={{ whiteSpace: "pre-wrap", lineHeight: 1.6, fontFamily: "inherit" }}>
        {termsConditionsText}
      </pre>
    </main>
  );
}
