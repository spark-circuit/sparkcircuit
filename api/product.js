export default async function handler(req, res) {
  try {
    // =====================================================
    // 1. GET PRODUCT ID FROM SEO URL
    //
    // Example:
    // /products/water-level-depth-sensor-module-45
    //
    // Vercel rewrite:
    // /api/product?path=water-level-depth-sensor-module-45
    // =====================================================

    let productId = null;

    if (req.query.path) {
      const path = String(req.query.path).trim();

      // Product ID is the final number in the URL
      const match = path.match(/-(\d+)\/?$/);

      if (match) {
        productId = match[1];
      }
    }

    // =====================================================
    // 2. OPTIONAL DIRECT PRODUCT ID SUPPORT
    //
    // This is only for internal/server use.
    // Customer-facing URL remains /products/slug-ID
    // =====================================================

    if (!productId && req.query.product_id) {
      productId = String(req.query.product_id).trim();
    }

    // =====================================================
    // 3. PRODUCT ID NOT FOUND
    // =====================================================

    if (!productId) {
      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      return res.status(404).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Product Not Found | SparkCircuit</title>
</head>

<body>
  <h1>Product Not Found</h1>
  <p>The requested product could not be found.</p>
</body>
</html>
      `);
    }

    // =====================================================
    // 4. SUPABASE DYNAMIC WORKER
    // =====================================================

    const workerUrl =
      "https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1/dynamic-worker" +
      "?product_id=" +
      encodeURIComponent(productId);

    const response = await fetch(workerUrl);

    const html = await response.text();

    // =====================================================
    // 5. RETURN PRODUCT HTML
    // =====================================================

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=86400"
    );

    return res.status(response.status).send(html);

  } catch (error) {

    console.error("Product proxy error:", error);

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.status(500).send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>Server Error | SparkCircuit</title>
</head>

<body>
  <h1>Server Error</h1>
  <p>Unable to load product.</p>
</body>
</html>
    `);
  }
}
