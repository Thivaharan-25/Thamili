import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const { productId } = req.query;

  if (!productId) {
    return res.status(400).send('Product ID is required');
  }

  const appScheme = `thamili://product/${productId}`;
  const playStoreUrl = 'https://play.google.com/store/apps/details?id=com.thamili.thamili';

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>Opening Thamili...</title>
        <meta property="og:title" content="View on Thamili" />
        <meta property="og:description" content="Click to view this product in the Thamili app." />
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background-color: #f9fafb; text-align: center; }
          .container { padding: 20px; max-width: 400px; }
          .logo { width: 80px; height: 80px; margin-bottom: 20px; }
          .title { font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 10px; }
          .subtitle { color: #6b7280; margin-bottom: 30px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #059669; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; transition: background-color 0.2s; }
          .button:hover { background-color: #047857; }
        </style>
      </head>
      <body>
        <div class="container">
          <img src="https://play-lh.googleusercontent.com/V7J_6XzX_oA7vH_8VqP9_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z_9z=w240-h480-rw" alt="Thamili" class="logo">
          <div class="title">Opening in Thamili</div>
          <p class="subtitle">We're taking you to the app. If it doesn't open automatically, click the button below.</p>
          <a href="${appScheme}" id="openApp" class="button">Open App</a>
          <p style="margin-top: 20px; font-size: 0.875rem; color: #9ca3af;">Don't have the app? <a href="${playStoreUrl}" style="color: #059669;">Download on Play Store</a></p>
        </div>

        <script>
          window.onload = function() {
            // Attempt to open the app
            window.location.href = "${appScheme}";

            // Fallback to Play Store
            setTimeout(function() {
              if (!document.hidden) {
                window.location.href = "${playStoreUrl}";
              }
            }, 3000);
          };
        </script>
      </body>
    </html>
  `;

  res.setHeader('Content-Type', 'text/html');
  return res.status(200).send(html);
}
