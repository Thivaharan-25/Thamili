import type { VercelRequest, VercelResponse } from '@vercel/node';

const html = `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Thamili – Terms and Conditions</title>
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
      ul, ol {
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
        <h1>Terms and Conditions</h1>
        <p class="muted">Last updated: February 25, 2026</p>

        <p>
          These Terms and Conditions ("Terms") govern your use of the <strong>Thamili</strong> mobile
          application and related services (together, the "Service"). By creating an account or using
          the Service, you agree to be bound by these Terms. Thamili is a fish and vegetable delivery
          platform serving the Tamil community in <strong>Germany</strong> and <strong>Denmark</strong>.
        </p>

        <h2>1. About Thamili</h2>
        <p>
          Thamili is a digital platform that allows customers to browse products (fresh and frozen
          fish and vegetables), place orders for home delivery or pickup at designated pickup points,
          and track their orders. Thamili also supports delivery partners for order logistics and
          admin users to manage products, orders, and operations across Germany and Denmark.
        </p>

        <h2>2. Eligibility and Account</h2>
        <ul>
          <li>You must be at least 18 years old or the age of majority in your country.</li>
          <li>You are responsible for maintaining the confidentiality of your login details.</li>
          <li>
            You agree that all information you provide to us is accurate, complete, and kept
            up‑to‑date.
          </li>
          <li>
            You are responsible for all activities that occur under your account. Notify us
            immediately at <a href="mailto:newthamili@gmail.com">newthamili@gmail.com</a> if you
            suspect unauthorized use.
          </li>
        </ul>

        <h2>3. Use of the Service</h2>
        <p>You agree that you will not:</p>
        <ul>
          <li>Use the Service for any illegal or unauthorized purpose.</li>
          <li>Interfere with or disrupt the integrity or performance of the Service.</li>
          <li>Attempt to gain unauthorized access to our systems or other users' data.</li>
          <li>Use automated means (bots, scripts) to interact with the Service, except where allowed.</li>
        </ul>

        <h2>4. Country Selection and Pricing</h2>
        <p>
          Thamili operates in two countries – Germany and Denmark. Prices, stock availability,
          delivery fees, and pickup points are <strong>country-specific</strong>. When you select
          your country in the app, all prices displayed will reflect the applicable local pricing.
          We reserve the right to update prices at any time. Country-specific promotions or
          availability may vary.
        </p>

        <h2>5. Orders, Pricing, and Availability</h2>
        <ul>
          <li>
            Product prices, availability, and descriptions may change at any time. We make reasonable
            efforts to keep information accurate, but errors may occur.
          </li>
          <li>
            An order is considered accepted when we confirm it in the app or via notification. We
            may cancel or adjust orders if there are stock issues, pricing errors, or other
            operational constraints.
          </li>
          <li>
            Some products are sold by weight (grams/kg) and others as pre-packed units. Quantities
            and weights shown are indicative and may vary slightly for fresh produce.
          </li>
        </ul>

        <h2>6. Payments and Refunds</h2>
        <ul>
          <li>
            Payments may be processed by Stripe (online card payments). By completing a payment,
            you agree to Stripe's terms and policies.
          </li>
          <li>
            You authorize us and our payment partners to charge the selected payment method for the
            total order amount, including any applicable delivery fees.
          </li>
          <li>
            We also offer Cash on Delivery (COD) for eligible orders. COD orders must be paid in
            full upon delivery.
          </li>
          <li>
            Refunds, if applicable, will be processed according to our refund policy and may take
            several business days to appear on your statement.
          </li>
        </ul>

        <h2>7. Delivery and Pickup</h2>
        <ul>
          <li>
            Delivery times are estimates and may vary due to traffic, weather, and operational
            factors. We will make reasonable efforts to deliver within the indicated window.
          </li>
          <li>
            You are responsible for providing accurate delivery address details and being available
            to receive the order.
          </li>
          <li>
            For pickup orders, you are responsible for collecting your order from the selected
            pickup point within the specified time.
          </li>
          <li>
            In some cases, orders may be fulfilled via van sales – direct delivery from a mobile
            sales vehicle operated by an authorized Thamili delivery partner.
          </li>
        </ul>

        <h2>8. Cancellations</h2>
        <p>
          Cancellation options may depend on the status of your order. If your order has already been
          prepared or dispatched, cancellation may not be possible or may incur a fee. Specific
          cancellation and refund rules may be communicated in the app or at checkout.
        </p>

        <h2>9. User Content and Feedback</h2>
        <p>
          If you submit feedback, suggestions, or other content to us, you grant us a non‑exclusive,
          worldwide, royalty‑free license to use that content to improve our products and services
          without obligation to you.
        </p>

        <h2>10. Intellectual Property</h2>
        <p>
          All content and materials in the Service, including trademarks, logos, app design, and
          underlying software, are owned by or licensed to Thamili and are protected by applicable
          laws. You may not copy, modify, distribute, or reverse engineer any part of the Service
          except where expressly allowed by law.
        </p>

        <h2>11. Third‑Party Services</h2>
        <p>
          The Service integrates with third‑party services including Stripe (payments), Supabase
          (database), and Mapbox (maps). We are not responsible for the
          content or practices of those third parties. Your use of their services is governed by
          their own terms and policies.
        </p>

        <h2>12. Limitation of Liability</h2>
        <p>
          To the maximum extent permitted by law, Thamili and its affiliates will not be liable for
          any indirect, incidental, special, consequential, or punitive damages, or any loss of
          profits or revenues, arising from or related to your use of the Service.
        </p>
        <p>
          Our total aggregate liability arising out of or relating to these Terms or the Service is
          limited to the amount you have paid to us for orders in the last six (6) months, or the
          minimum amount required by applicable law.
        </p>

        <h2>13. Indemnity</h2>
        <p>
          You agree to indemnify and hold harmless Thamili and its affiliates from any claims,
          liabilities, damages, losses, and expenses (including legal fees) arising out of or in any
          way connected with your use of the Service or violation of these Terms.
        </p>

        <h2>14. Changes to the Service and Terms</h2>
        <p>
          We may modify or discontinue parts of the Service at any time. We may also update these
          Terms from time to time. When we do, we will update the "Last updated" date above. Your
          continued use of the Service after changes take effect constitutes acceptance of the
          updated Terms.
        </p>

        <h2>15. Termination</h2>
        <p>
          We may suspend or terminate your access to the Service if you violate these Terms, misuse
          the Service, or if required by law. You may also stop using the Service and request
          deletion of your account at any time by contacting us.
        </p>

        <h2>16. Governing Law</h2>
        <p>
          These Terms are governed by the laws of the jurisdiction where Thamili is established.
          Users in Germany and Denmark are also protected by applicable EU consumer protection laws.
          Any disputes will be subject to the exclusive jurisdiction of the courts in the applicable
          country, unless otherwise required by applicable law.
        </p>

        <h2>17. Contact Us</h2>
        <p>
          If you have any questions about these Terms or the Service, you can contact us at:
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

