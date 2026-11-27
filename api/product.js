const SUPABASE_URL = "https://mrqvzmtdsohvzsnryogp.supabase.co";

const SUPABASE_KEY =
  process.env.SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_YLYkDHgLQvNzCL1UvqvxkQ_EX3oLE9z";

const BASE_URL = "https://sparkcircuit.in";

function escapeHtml(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getImage(p) {
  if (p.image) return p.image;

  if (Array.isArray(p.images) && p.images.length) {
    return p.images[0];
  }

  return "https://mrqvzmtdsohvzsnryogp.supabase.co/storage/v1/object/public/product-images/sparkcircuit-logo.jpeg";
}

function getDescription(p) {
  return String(
    p.description ||
      `Buy ${p.name} online from SparkCircuit. Genuine electronic components with fast delivery across India.`
  )
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 160);
}

function getFullDescription(p) {
  return String(
    p.description ||
      `Buy ${p.name} online from SparkCircuit. Genuine electronic components with fast delivery across India.`
  ).trim();
}

function getPrice(value) {
  const n = Number(value);

  if (!Number.isFinite(n)) {
    return "Price unavailable";
  }

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR"
  }).format(n);
}

function replaceElementById(html, id, innerHtml) {
  const openRegex = new RegExp(
    `<([a-z][\\w:-]*)\\b[^>]*\\bid=["']${id}["'][^>]*>`,
    "i"
  );

  const match = openRegex.exec(html);

  if (!match) {
    return html;
  }

  const tagName = match[1];

  const start = match.index + match[0].length;

  const rest = html.slice(start);

  const closeRegex = new RegExp(`</${tagName}>`, "i");

  const closeMatch = closeRegex.exec(rest);

  if (!closeMatch) {
    return html;
  }

  const closeIndex = start + closeMatch.index;

  return (
    html.slice(0, start) +
    innerHtml +
    html.slice(closeIndex)
  );
}

function renderServerProductTabs(html, product) {
  const fullDescription = getFullDescription(product);

  /*
   * IMPORTANT:
   * pdDescription already exists as a <p> in product.html.
   * Therefore we put only text + <br> inside it.
   * We DO NOT put a <div> inside <p>.
   */
  const descriptionHtml = fullDescription
    ? escapeHtml(fullDescription).replace(/\r?\n/g, "<br>")
    : "Product details will be updated soon.";

  html = replaceElementById(
    html,
    "pdDescription",
    descriptionHtml
  );

  /*
   * Make the product tabs visible in the server-rendered HTML.
   * JavaScript can still control them later.
   */
  html = html.replace(
    /(<[^>]*\bid=["']pdTabsSection["'][^>]*?)\sstyle=["'][^"']*["']/i,
    '$1 style="display:block;"'
  );

  /*
   * If the template does not already contain a style attribute,
   * add one.
   */
  if (
    !/<[^>]*\bid=["']pdTabsSection["'][^>]*\sstyle=["']/i.test(html)
  ) {
    html = html.replace(
      /(<[^>]*\bid=["']pdTabsSection["'][^>]*)(>)/i,
      '$1 style="display:block;"$2'
    );
  }

  /*
   * Do not leave the server-rendered page with a generic
   * "Loading reviews..." message.
   */
  html = html.replace(
    /Loading reviews\.\.\./gi,
    "Customer reviews are displayed here when available."
  );

  /*
   * Keep related products from showing a misleading loading
   * message in the raw HTML.
   */
  html = html.replace(
    /Loading similar products\.\.\./gi,
    "Related products will be displayed here when available."
  );

  return html;
}

function getProductContent(p) {
  const name = escapeHtml(p.name);

  const description = escapeHtml(
    p.description || getDescription(p)
  );

  const image = escapeHtml(getImage(p));

  const category = escapeHtml(
    p.category || "Electronics"
  );

  const inStock =
    p.stock_quantity != null
      ? Number(p.stock_quantity) > 0
      : p.in_stock !== false;

  const originalPrice =
    Number(p.original_price) > Number(p.price)
      ? `<del>${escapeHtml(
          getPrice(p.original_price)
        )}</del>`
      : "";

  return `
    <article class="pd-card pd-server-rendered">
      <div class="pd-grid">

        <div class="pd-gallery">
          <div class="pd-main-image">
            <img
              id="mainProductImage"
              src="${image}"
              alt="${name}"
              loading="eager"
              fetchpriority="high"
              style="max-width:100%;height:auto;"
            >
          </div>
        </div>

        <div class="pd-info">

          <div class="pd-category">
            ${category}
          </div>

          <h1 class="pd-title">
            ${name}
          </h1>

          <div class="pd-price">
            ${escapeHtml(getPrice(p.price))}
            ${originalPrice}
          </div>

          <div class="pd-stock ${
            inStock ? "in-stock" : "out-of-stock"
          }">
            ${inStock ? "In Stock" : "Out of Stock"}
          </div>

          <div class="pd-server-description">
            <h2>Product Description</h2>
            <p>${description}</p>
          </div>

          <p>
            Genuine electronic components from SparkCircuit.
          </p>

        </div>

      </div>
    </article>
  `;
}

export default async function handler(req, res) {
  try {
    const requestUrl = new URL(
      req.url,
      "https://sparkcircuit.in"
    );

    /*
     * Product path can come from:
     *
     * /products/product-name-45
     *
     * or:
     *
     * /api/product?id=45
     *
     * or legacy:
     *
     * /product.html?id=45
     */
    const pathValue =
      requestUrl.searchParams.get("path") ||
      requestUrl.searchParams.get("id") ||
      "";

    /*
     * Extract numeric product ID from the end.
     */
    const idMatch = pathValue.match(/(\d+)\/?$/);

    const id = idMatch ? idMatch[1] : "";

    if (!/^\d+$/.test(id)) {
      return res.status(404).send("Product not found");
    }

    /*
     * Fetch product from Supabase.
     */
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/products?id=eq.${id}&select=*&limit=1`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`
        }
      }
    );

    if (!response.ok) {
      console.error(
        "Supabase product error:",
        response.status
      );

      return res
        .status(502)
        .send("Unable to load product");
    }

    const products = await response.json();

    const product = products?.[0];

    if (!product) {
      return res.status(404).send("Product not found");
    }

    /*
     * Build canonical clean product URL.
     */
    const productUrl =
      `${BASE_URL}/products/${slugify(
        product.name
      )}-${product.id}`;

    /*
     * Legacy product.html?id=45
     * permanently redirects to clean URL.
     */
    if (
      requestUrl.searchParams.get("legacy") === "1"
    ) {
      return res.redirect(301, productUrl);
    }

    /*
     * Load the existing product.html template.
     *
     * We are NOT replacing the whole design.
     * We are using the existing template and injecting
     * product data into it.
     */
    const templateResponse = await fetch(
      `${BASE_URL}/product.html?template=1`
    );

    if (!templateResponse.ok) {
      console.error(
        "Product template error:",
        templateResponse.status
      );

      return res
        .status(502)
        .send("Product template unavailable");
    }

    let html = await templateResponse.text();

    /*
     * SEO TITLE
     */
    const title =
      `${product.name} | Buy Online in India | SparkCircuit`;

    /*
     * META DESCRIPTION
     */
    const description =
      getDescription(product);

    /*
     * PRODUCT IMAGE
     */
    const image =
      getImage(product);

    /*
     * Replace <title>
     */
    html = html.replace(
      /<title>[\s\S]*?<\/title>/i,
      `<title>${escapeHtml(title)}</title>`
    );

    /*
     * Replace meta description.
     */
    html = html.replace(
      /<meta\s+name=["']description["'][^>]*>/i,
      `<meta name="description" content="${escapeHtml(
        description
      )}">`
    );

    /*
     * Replace canonical URL.
     */
    html = html.replace(
      /<link\s+rel=["']canonical["'][^>]*>/i,
      `<link rel="canonical" href="${escapeHtml(
        productUrl
      )}">`
    );

    /*
     * Open Graph metadata.
     */
    const og = [
      ["og:title", title],
      ["og:description", description],
      ["og:image", image],
      ["og:url", productUrl],
      ["og:type", "product"]
    ];

    for (const [key, value] of og) {
      const tag =
        `<meta property="${key}" content="${escapeHtml(
          value
        )}">`;

      const regex = new RegExp(
        `<meta\\s+property=["']${key}["'][^>]*>`,
        "i"
      );

      if (regex.test(html)) {
        html = html.replace(
          regex,
          tag
        );
      } else {
        html = html.replace(
          /<\/head>/i,
          `${tag}\n</head>`
        );
      }
    }

    /*
     * Product JSON-LD schema.
     */
    const schema = {
      "@context": "https://schema.org",
      "@type": "Product",
      "@id": `${productUrl}#product`,

      name: product.name,

      image: [image],

      description:
        product.description ||
        description,

      sku: `SPC-${product.id}`,

      brand: {
        "@type": "Brand",
        name: "SparkCircuit"
      },

      offers: {
        "@type": "Offer",

        url: productUrl,

        priceCurrency: "INR",

        price:
          String(
            Number(product.price) || 0
          ),

        availability:
          (
            product.stock_quantity != null
              ? Number(product.stock_quantity) > 0
              : product.in_stock !== false
          )
            ? "https://schema.org/InStock"
            : "https://schema.org/OutOfStock"
      }
    };

    const schemaHtml =
      `<script type="application/ld+json" id="productSchema">${JSON.stringify(
        schema
      ).replace(/</g, "\\u003c")}</script>`;

    /*
     * Replace existing Product schema.
     */
    html = html.replace(
      /<script\s+type=["']application\/ld\+json["']\s+id=["']productSchema["'][\s\S]*?<\/script>/i,
      schemaHtml
    );

    /*
     * Server-render the main product section.
     */
    const containerRegex =
      /(<([a-z][\w:-]*)\b[^>]*\bid=["']productDetailContent["'][^>]*>)[\s\S]*?(<\/\2>)/i;

    if (!containerRegex.test(html)) {
      console.error(
        "Product detail container missing"
      );

      return res
        .status(500)
        .send(
          "Product template structure invalid"
        );
    }

    html = html.replace(
      containerRegex,
      `$1${getProductContent(product)}$3`
    );

    /*
     * Server-render description/specification tab content.
     *
     * This is important for crawlers because the
     * actual product description is now present
     * directly in the HTML source.
     */
    html = renderServerProductTabs(
      html,
      product
    );

    /*
     * Expose complete product data to the existing
     * frontend JavaScript.
     */
    const bootstrap = `
      <script>
        window.__SPARKCIRCUIT_PRODUCT__ =
          ${JSON.stringify(product).replace(
            /</g,
            "\\u003c"
          )};

        window.__SPARKCIRCUIT_PRODUCT_URL__ =
          ${JSON.stringify(productUrl)};
      </script>
    `;

    html = html.replace(
      /<\/head>/i,
      `${bootstrap}</head>`
    );

    /*
     * Response headers.
     */
    res.setHeader(
      "Content-Type",
      "text/html; charset=utf-8"
    );

    res.setHeader(
      "Cache-Control",
      "public, s-maxage=300, stale-while-revalidate=86400"
    );

    /*
     * Return final server-rendered product page.
     */
    return res
      .status(200)
      .send(html);

  } catch (error) {
    console.error(
      "Product rendering error:",
      error
    );

    return res
      .status(500)
      .send(
        "Unable to render product page"
      );
  }
}
