/**
 * cooking.builtbyjoshstudio.com — Checkout Configuration
 * ======================================================
 * One product lives on this site: the cookbook. Its entry was moved here from
 * builtbyjoshstudio.com/js/checkout-config.js so each product has exactly one owner.
 * /js/checkout.js reads this config and wires every [data-checkout] element.
 *
 *   - `ls` is the Lemon Squeezy overlay URL. The ?embed=1 parameter is required
 *     for the overlay; checkout.js strips it for the hosted-page fallback.
 *   - `etsy` is the Etsy listing (used only if `ls` is ever set back to "PENDING").
 *
 * The upgrade code is never published on the site or in this file.
 * NEVER hardcode a checkout URL outside this file.
 */

window.CHECKOUT_CONFIG = {

  "nuoc-mam-cookbook": {
    name: "Nước Mắm — A Vietnamese Family Cookbook (EPUB + PDF)",
    price: 3.99,
    category: "Ebook",
    ls: "https://builtbyjoshstudio.lemonsqueezy.com/checkout/buy/b6341e82-a171-4fdd-9b03-43956c74cea3?embed=1",
    etsy: "https://www.etsy.com/listing/4551851115/nc-mm-vietnamese-family-cookbook-o"
  }

};
