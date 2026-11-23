export default async function handler(req, res) {
  try {
    let productId = null;
    let isLegacyUrl = false;

    // =====================================================
    // 1. OLD URL
    // /product.html?id=15
    // =====================================================

    if (req.query.id) {
      productId = String(req.query.id);
      isLegacyUrl = true;
    }

    // =====================================================
    // 2. NEW SEO URL
    // /products/product-name-15
    // =====================================================

    if (!productId && req.query.path) {
      const path = String(req.query.path);

      const match = path.match(/-(\d+)\/?$/);

      if (match) {
        productId = match[1];
      }
    }

    // =====================================================
    // 3. OPTIONAL product_id SUPPORT
    // =====================================================

    if (!productId && req.query.product_id) {
      productId = String(req.query.product_id);
    }

    // =====================================================
    // NO PRODUCT ID
    // =====================================================

    if (!productId) {
      res.setHeader(
        "Content-Type",
        "text/html; charset=utf-8"
      );

      return res.status(400).send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>Product ID Missing | SparkCircuit</title>
</head>
<body>
<h1>Product ID Missing</h1>
</body>
</html>
`);
    }

    // =====================================================
    // SUPABASE DYNAMIC WORKER
    // =====================================================

    const workerUrl =
      "https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1/dynamic-worker" +
      "?product_id=" +
      encodeURIComponent(productId);

    const response = await fetch(workerUrl);

    const html = await response.text();

    // =====================================================
    // OLD URL → 301 REDIRECT TO SEO URL
    //
    // Example:
    // /product.html?id=15
    //
    // →
    //
    // /products/color-sensor-tcs230-tcs3200-color-recognition-sensor-detector-module-15
    // =====================================================

    if (isLegacyUrl && response.ok) {
      const canonicalMatch = html.match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
      );

      if (canonicalMatch && canonicalMatch[1]) {
        const canonicalUrl = canonicalMatch[1];

        res.setHeader(
          "Location",
          canonicalUrl
        );

        res.setHeader(
          "Cache-Control",
          "public, s-maxage=3600, stale-while-revalidate=86400"
        );

        return res.status(301).end();
      }
    }

    // =====================================================
    // RETURN HTML
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

    console.error(
      "Product proxy error:",
      error
    );

    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    return res.status(500).send(`
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
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
