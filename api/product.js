export default async function handler(req, res) {
  try {
    let productId = null;
    let isLegacyUrl = false;

    // =====================================================
    // 1. OLD URL SUPPORT
    //
    // /product.html?id=15
    //
    // product.html file delete ho chuki hai,
    // lekin purane Google/indexed links ko todna nahi hai.
    // =====================================================

    if (req.query.id) {
      productId = String(req.query.id).trim();
      isLegacyUrl = true;
    }

    // =====================================================
    // 2. NEW SEO URL
    //
    // /products/product-name-15
    //
    // Vercel rewrite:
    // /api/product?path=product-name-15
    // =====================================================

    if (!productId && req.query.path) {
      const path = String(req.query.path).trim();

      const match = path.match(/-(\d+)\/?$/);

      if (match) {
        productId = match[1];
      }
    }

    // =====================================================
    // 3. OPTIONAL DIRECT PRODUCT ID
    // =====================================================

    if (!productId && req.query.product_id) {
      productId = String(req.query.product_id).trim();
    }

    // =====================================================
    // 4. PRODUCT ID MISSING
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
    // 5. SUPABASE DYNAMIC WORKER
    // =====================================================

    const workerUrl =
      "https://mrqvzmtdsohvzsnryogp.supabase.co/functions/v1/dynamic-worker" +
      "?product_id=" +
      encodeURIComponent(productId);

    const response = await fetch(workerUrl);

    const html = await response.text();

    // =====================================================
    // 6. OLD URL → CANONICAL SEO URL
    //
    // /product.html?id=15
    //
    // →
    //
    // /products/product-name-15
    //
    // Canonical URL dynamic-worker ke HTML se liya jayega.
    // =====================================================

    if (isLegacyUrl && response.ok) {
      const canonicalMatch = html.match(
        /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i
      );

      if (canonicalMatch && canonicalMatch[1]) {
        res.setHeader(
          "Location",
          canonicalMatch[1]
        );

        res.setHeader(
          "Cache-Control",
          "public, s-maxage=3600, stale-while-revalidate=86400"
        );

        return res.status(301).end();
      }
    }

    // =====================================================
    // 7. RETURN COMPLETE PRODUCT HTML
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
