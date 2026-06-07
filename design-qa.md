# Design QA

final result: passed

## Source And Evidence

- Source visual truth: `C:\Users\romas\OneDrive\Рабочий стол\681232cdb37e1f2b1d46f2d14f76d168.webp`
- Local reference copy: `C:\Users\romas\Documents\Codex\2026-06-07\https-xn-7sbbqrluc1bf5k-xn-p1ai\reference-design.webp`
- Full-view comparison evidence: `C:\Users\romas\Documents\Codex\2026-06-07\https-xn-7sbbqrluc1bf5k-xn-p1ai\qa-comparison-v2.png`
- Implementation screenshots:
  - `final-local-home.png`, 1440x1200, `#/shop`
  - `final-local-catalog-mobile.png`, 390x1300, `#/catalog`
  - `final-local-admin.png`, 1440x1100, `#/admin`
  - `fix2-hero-1280.png`, 1280x900, `#/shop`
  - `fix2-hero-mobile.png`, 390x1350, `#/shop`
  - `outputs/anutkin-home-desktop-v5.png`, 1280x900, `#/shop`
  - `outputs/anutkin-lookbook-viewport-v7.png`, 1280x900, lookbook section
  - `outputs/anutkin-photo-modal-v6.png`, 1280x900, desktop photo modal
  - `outputs/anutkin-home-mobile-v5.png`, 390x844, mobile storefront
  - `outputs/anutkin-photo-modal-mobile-v2.png`, 390x844, mobile photo modal
  - `outputs/anutkin-redesign-hero-desktop-v1.png`, 1280x900, redesigned storefront hero
  - `outputs/anutkin-redesign-modal-desktop-v1.png`, 1280x900, redesigned desktop photo modal
  - `outputs/anutkin-redesign-hero-mobile-v5.png`, 390x844, compact mobile storefront hero
  - `outputs/anutkin-redesign-modal-mobile-v4.png`, 390x844, redesigned mobile photo modal
- Focused regions checked: mobile header/nav, catalog hero, product card grid, 3D carousel, admin overview command cards. Extra focused composite was not needed after the full-view mobile comparison because the remaining differences are intentional product-scope changes, not unresolved fidelity defects.

## Findings

No actionable P0/P1/P2 issues remain.

- Fonts and typography: the storefront keeps the reference's editorial serif direction for large selling headlines and uses heavier sans UI text for controls, admin labels, filters, and metrics. Mobile catalog headline wrapping was corrected to a cleaner Russian store message.
- Spacing and layout rhythm: desktop storefront keeps a wide premium header, large hero, proof cards, product sections, and soft card shadows. Mobile header was changed from a clipped horizontal nav to a 2x2 grid so all routes are visible without a gesture.
- Colors and visual tokens: blush, berry, soft white, and muted green remain close to the reference, with added operational green in admin dashboards for stock/sales context.
- Image quality and assets: catalog/product imagery uses the extracted real nursery photos. Some old product photos retain source watermarks; acceptable for this build because they are real catalog assets, but should be replaced in a production content pass.
- Copy and content: the site now reads as a ready store: storefront, catalog, product detail, delivery/SDEK explanation, about page, and admin panel.

## Patches Made Since Previous QA

- Replaced the single-page storefront feel with routed pages: `#/shop`, `#/catalog`, `#/product/:id`, `#/delivery`, `#/about`, `#/admin`.
- Added 3D product carousel, hover elevation, animated live product card, stacked product presentation, and deeper editorial/product sections.
- Added admin overview command cards for morning fulfillment, AI stock/promo suggestion, and weekly promo setup.
- Fixed 3D carousel backface rendering so mirrored card backs no longer show.
- Fixed mobile storefront navigation so route buttons are visible in a compact grid.
- Shortened the mobile catalog headline to avoid bad wrapping.
- Reworked the first-screen hero after visual review: reduced display headline scale, replaced the rotating product wheel with a controlled 3D showcase, and separated the live product card from the main image stack.
- Added generated bitmap floral decor assets for hero/lookbook framing: `public/assets/decor/floral-corner-left.webp`, `floral-corner-right.webp`, `floral-garland.webp`, and `floral-mosaic.webp`.
- Added a seasonal lookbook block with a large clickable hydrangea photo, side previews, and a direct catalog action.
- Added photo lightbox interaction across hero cards, product cards, lookbook, and product detail: desktop/mobile layout, previous/next navigation, Escape close, thumbnails around the active item, add-to-cart, and product detail navigation.
- Fixed mobile photo modal arrows so they stay centered over the image area instead of overlapping product text.
- Added disabled button styling for out-of-stock products in the modal and shared primary button state.
- Replaced the weak 3D hero card collage with one large real product photo, an overlay purchase panel, and compact real-product picks.
- Replaced the home-page "site features" grid with image-led plant category cards so the storefront reads as a nursery shop, not a web-design pitch.
- Moved modal previous/next buttons into the photo stage itself, preventing overlap with text on every viewport.
- Tightened the mobile header and mobile hero so the first screen shows product photography instead of only navigation and copy.
- Removed buyer-facing copy that explained the website mechanics instead of selling plants.

## Verification

- `npm run build` passed.
- `npm run pages` passed.
- Local browser QA passed for desktop storefront, mobile catalog, desktop admin, and mobile admin.
- Follow-up interaction smoke test passed for storefront navigation: shop, catalog, delivery, and admin.
- Photo modal smoke test passed: lookbook click opened a product photo, next arrow changed product, close button removed the modal.
- Mobile modal smoke test passed at 390x844: body width remained 375px, failed images were 0, nav arrows stayed inside the photo area.
- Redesign QA passed: old hero carousel count is 0, category cards count is 4, failed images are 0, mobile hero photo appears in the first viewport, and modal arrows report `nextOverText: false` on desktop/mobile.
- Failed network resources: 0 in the focused final local check.
- Horizontal overflow: none on 1440px desktop and 390px mobile.

## Remaining P3 Polish

- Replace source-watermarked product photos where the client has cleaner originals.
- In the connected version, wire admin metrics/orders/stock to the production catalog API and live SDEK statuses instead of mock data.
