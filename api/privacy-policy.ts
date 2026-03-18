import type { VercelRequest, VercelResponse } from '@vercel/node';

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thamili – Privacy Policy</title>
    <style>
      body {
        font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        margin: 0;
        padding: 0;
        background: #f5f5f5;
        color: #111827;
      }
      .container {
        max-width: 800px;
        margin: 0 auto;
        padding: 32px 20px 48px;
      }
      h1, h2, h3 {
        color: #111827;
      }
      h1 {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
      h2 {
        font-size: 1.25rem;
        margin-top: 1.75rem;
        margin-bottom: 0.5rem;
      }
      p, li {
        line-height: 1.6;
        font-size: 0.95rem;
      }
      ul {
        padding-left: 1.2rem;
      }
      .card {
        background: #ffffff;
        border-radius: 16px;
        padding: 24px 20px 28px;
        box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
        border: 1px solid rgba(148, 163, 184, 0.35);
      }
      .muted {
        color: #6b7280;
        font-size: 0.85rem;
        margin-bottom: 1.5rem;
      }
      a {
        color: #0f766e;
        text-decoration: none;
      }
      a:hover {
        text-decoration: underline;
      }
      @media (prefers-color-scheme: dark) {
        body {
          background: #020617;
          color: #e5e7eb;
        }
        .card {
          background: rgba(15, 23, 42, 0.98);
          border-color: rgba(148, 163, 184, 0.4);
          box-shadow: 0 24px 60px rgba(15, 23, 42, 0.8);
        }
        h1, h2, h3 {
          color: #f9fafb;
        }
        .muted {
          color: #9ca3af;
        }
      }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="card">
        <h1>Privacy Policy</h1>
        <p class="muted">Last updated: February 25, 2026</p>

        <p>
          This Privacy Policy explains how <strong>Thamili</strong> ("we", "us", or "our") collects,
          uses, and protects your information when you use the Thamili mobile application and related
          services (together, the "Service"). Thamili is a fish and vegetable delivery platform
          serving the Tamil community in <strong>Germany</strong> and <strong>Denmark</strong>.
        </p>

        <h2>1. Information We Collect</h2>
        <p>We collect the following types of information when you use Thamili:</p>
        <ul>
          <li>
            <strong>Account information</strong> – name, email address, phone number, username,
            password, profile details, and delivery addresses that you provide when creating and
            managing your account.
          </li>
          <li>
            <strong>Order and transaction data</strong> – items in your cart, orders you place,
            selected pickup points or delivery locations, payment status, delivery method (home
            delivery or pickup), and related order history.
          </li>
          <li>
            <strong>Payment information</strong> – we use Stripe as our third‑party payment
            processor. We do not store your full card details on our servers; card data is handled
            directly by Stripe. We store only the payment status, last 4 digits, and transaction
            identifiers for order tracking.
          </li>
          <li>
            <strong>Account security information</strong> – your username and encrypted password
            used for login. You may also sign in using your Google account, in which case we
            receive your name, email address, and profile photo from Google.
          </li>
          <li>
            <strong>Location information</strong> – approximate or precise location (when you grant
            permission) to show nearby pickup points, delivery areas, or improve logistics.
          </li>
          <li>
            <strong>Country preference</strong> – your selected country (Germany or Denmark) which
            determines applicable prices, stock availability, and pickup points shown to you.
          </li>
          <li>
            <strong>Device and usage data</strong> – device model, OS version, app version,
            language, IP address, and in‑app activity (such as screens visited and interactions) to
            help us improve performance, reliability, and user experience.
          </li>
          <li>
            <strong>Push notification token</strong> – a device token used to send you order
            updates and service notifications. You can disable these in your device settings.
          </li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We use the information we collect to:</p>
        <ul>
          <li>Create and manage your Thamili account and user profile.</li>
          <li>Process orders, payments, refunds, and manage order history.</li>
          <li>Provide delivery or pickup services, including route and pickup point selection.</li>
          <li>Send important notifications about your orders, account, and service changes.</li>
          <li>Personalize the app experience, such as remembering your preferences and locations.</li>
          <li>Monitor performance, fix bugs, and improve reliability and security of the Service.</li>
          <li>Comply with legal obligations and enforce our Terms and Conditions.</li>
        </ul>

        <h2>3. Legal Bases for Processing (GDPR)</h2>
        <p>As we operate in Germany and Denmark (EU/EEA), we comply with the General Data Protection
          Regulation (GDPR). We rely on one or more of the following legal bases:</p>
        <ul>
          <li>Your consent (for example, for push notifications or marketing communications).</li>
          <li>Performance of a contract (to provide the Service and fulfill your orders).</li>
          <li>Compliance with legal obligations under applicable EU or national law.</li>
          <li>Legitimate interests (such as preventing fraud or improving our services).</li>
        </ul>

        <h2>4. How We Share Information</h2>
        <p>We may share your information with:</p>
        <ul>
          <li>
            <strong>Service providers</strong> – such as Stripe (payments), Supabase (database and
            authentication), Twilio (WhatsApp OTP), Mapbox (maps), and Expo (push notifications),
            who help us operate the Service.
          </li>
          <li>
            <strong>Delivery and logistics partners</strong> – where necessary to fulfill your
            deliveries or pickups, your order details and delivery address may be shared with
            assigned delivery partners.
          </li>
          <li>
            <strong>Authorities or regulators</strong> – when required by law or to protect our
            rights, users, and the public.
          </li>
        </ul>
        <p>We do not sell your personal data.</p>

        <h2>5. Payments</h2>
        <p>
          Payments in Thamili are processed by Stripe. Your payment details are transmitted
          directly to Stripe and handled in accordance with their security and privacy practices.
          We receive limited information such as the payment status, last digits of your card, and
          transaction identifiers. We also support Cash on Delivery (COD) for eligible orders.
        </p>

        <h2>6. Location Data</h2>
        <p>
          With your permission, we may use location data to show nearby pickup points, delivery
          availability, or to improve routing. You can control location access in your device
          settings. Some features may not work correctly without location access.
        </p>

        <h2>7. International Data Transfers</h2>
        <p>
          Our service providers (such as Stripe, Supabase, and Twilio) may process data outside the
          EEA. Where such transfers occur, we ensure adequate safeguards are in place, such as
          Standard Contractual Clauses (SCCs) approved by the European Commission.
        </p>

        <h2>8. Cookies and Similar Technologies</h2>
        <p>
          If you access web components of our Service, we may use cookies or similar technologies to
          remember your preferences and understand how the Service is used. Where required, we will
          ask for your consent.
        </p>

        <h2>9. Data Retention</h2>
        <p>
          We keep your information for as long as necessary to provide the Service, comply with our
          legal obligations, resolve disputes, and enforce our agreements. When we no longer need
          your data, we will delete or anonymize it.
        </p>

        <h2>10. Security</h2>
        <p>
          We use reasonable technical and organizational measures to protect your information.
          However, no system is completely secure, and we cannot guarantee absolute security of your
          data.
        </p>

        <h2>11. Your Rights (GDPR)</h2>
        <p>As a resident of Germany or Denmark (EU/EEA), you have the following rights:</p>
        <ul>
          <li>Accessing the personal data we hold about you.</li>
          <li>Correcting inaccurate or incomplete information.</li>
          <li>Requesting deletion of your data ("right to be forgotten"), subject to legal obligations.</li>
          <li>Requesting restriction of processing or objecting to processing.</li>
          <li>Data portability – receiving your data in a structured, machine-readable format.</li>
          <li>Withdrawing consent at any time where processing is based on consent.</li>
          <li>Lodging a complaint with your national data protection authority (e.g., the German
            BfDI or the Danish Datatilsynet).</li>
        </ul>
        <p>
          To exercise these rights, please contact us using the details in the "Contact Us" section
          below.
        </p>

        <h2>12. Children's Privacy</h2>
        <p>
          Thamili is not intended for children under the age of 13 (or the minimum age required in
          your country). We do not knowingly collect personal information from children. If you
          believe that a child has provided us with personal data, please contact us and we will
          take appropriate steps to remove it.
        </p>

        <h2>13. Changes to This Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. When we do, we will change the "Last
          updated" date at the top of this page. We encourage you to review this Policy periodically
          to stay informed about how we protect your information.
        </p>

        <h2>14. Contact Us</h2>
        <p>
          If you have any questions or concerns about this Privacy Policy or how we handle your
          data, or to exercise your GDPR rights, you can contact us at:
        </p>
        <p>
          <strong>Thamili</strong><br />
          Website: <a href="https://thamili.de">thamili.de</a><br />
          Email: <a href="mailto:newthamili@gmail.com">newthamili@gmail.com</a>
        </p>
      </div>
    </div>
  </body>
</html>`;

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method Not Allowed');
  }

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(html);
}

