import {
  ArrowRight,
  Basket,
  Bell,
  CaretDown,
  CaretLeft,
  CaretRight,
  ChartLineUp,
  CheckCircle,
  Clock,
  CurrencyRub,
  DeviceMobile,
  FlowerLotus,
  Funnel,
  House,
  Leaf,
  MagnifyingGlass,
  MagnifyingGlassPlus,
  MapPin,
  Package,
  Plant,
  Plus,
  ShoppingBagOpen,
  SlidersHorizontal,
  Sparkle,
  Storefront,
  Truck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useEffect, useMemo, useRef, useState } from "react";

// На WordPress тема задаёт window.ANUTKIN_BASE (URL папки темы). На GitHub Pages — BASE_URL из сборки.
const baseUrl =
  (typeof window !== "undefined" && window.ANUTKIN_BASE) || import.meta.env.BASE_URL || "/";

function assetUrl(path) {
  const s = String(path || "");
  if (/^https?:\/\//.test(s)) return s; // абсолютные URL (живые медиа Woo) — как есть
  return `${baseUrl}${s.replace(/^\/+/, "")}`;
}

function formatRub(value) {
  return `${new Intl.NumberFormat("ru-RU").format(value || 0)}\u00a0\u20bd`;
}

function compactRub(value) {
  return `${new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0)}\u00a0\u20bd`;
}

function plural(n, one, few, many) {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return one;
  if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return few;
  return many;
}

function stockLabel(product) {
  if (product.kind === "guide") return `PDF · ${product.guide?.pages || ""} стр.`;
  if (product.stock === 0) return "нет в наличии";
  if (product.stock <= 3) return `${product.stock} шт. осталось`;
  return `${product.stock} шт.`;
}

function useCatalog() {
  const [data, setData] = useState(null);

  useEffect(() => {
    // extras.json — пособия и готовые композиции (необязательный файл: на WP его может не быть)
    const extras = fetch(`${baseUrl}data/extras.json`, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .catch(() => null);
    Promise.all([fetch(`${baseUrl}data/catalog.json`, { cache: "no-cache" }).then((response) => response.json()), extras]).then(
      ([catalog, more]) => {
        if (!more) return setData(catalog);
        setData({
          ...catalog,
          products: [...catalog.products, ...(more.products || [])],
          categories: [...catalog.categories, ...(more.categories || [])],
        });
      },
    );
  }, []);

  return data;
}

function useRoute() {
  const initial = () => {
    if (window.location.pathname.endsWith("/admin")) return "admin";
    return window.location.hash.replace("#/", "") || "shop";
  };
  const [route, setRoute] = useState(initial);
  const routeRef = useRef(route);
  const scrollMem = useRef(new Map()); // route -> scrollY (память позиции по страницам)

  useEffect(() => {
    routeRef.current = route;
  }, [route]);

  useEffect(() => {
    const onHash = () => {
      const next = window.location.hash.replace("#/", "") || "shop";
      if (next !== routeRef.current) {
        scrollMem.current.set(routeRef.current, window.scrollY);
        setRoute(next);
      }
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (next) => {
    scrollMem.current.set(routeRef.current, window.scrollY);
    window.location.hash = `/${next}`;
    setRoute(next);
  };

  return [route, go, scrollMem];
}

export function App() {
  const data = useCatalog();
  const [route, go, scrollMem] = useRoute();

  // Storefront hides out-of-stock products entirely (admin still sees everything).
  // Category counts are recomputed from the visible products.
  const storefrontData = useMemo(() => {
    if (!data) return null;
    const products = data.products.filter((product) => product.stock > 0);
    const productKey = (key) => (key === "shrubs" ? "other" : key);
    const categories = data.categories.map((category) => ({
      ...category,
      count: products.filter((product) => product.categoryKey === productKey(category.key)).length,
    }));
    return { ...data, products, categories };
  }, [data]);

  if (!data) {
    return (
      <main className="loading-screen">
        <FlowerLotus size={34} weight="duotone" />
        <span>Загружаю каталог</span>
      </main>
    );
  }

  // Кабинета в демо нет — все маршруты ведут на витрину.
  return <StorefrontAppV2 data={storefrontData} route={route} go={go} scrollMem={scrollMem} />;
}

function StorefrontAppV2({ data, route, go, scrollMem }) {
  // восстановление позиции: была память — возвращаем на место, нет — в самый верх
  useEffect(() => {
    const saved = scrollMem?.current?.get(route) ?? 0;
    requestAnimationFrame(() => {
      requestAnimationFrame(() => window.scrollTo({ top: saved, left: 0, behavior: "instant" }));
    });
  }, [route, scrollMem]);

  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(null);

  const availableProducts = useMemo(
    () => data.products.filter((product) => product.stock > 0 && product.image),
    [data.products],
  );

  const featured = useMemo(() => {
    // round-robin across categories so the home grid shows variety, not a hydrangea monoculture.
    // NOTE: real product keys — "other" === кустарники/спиреи (there is no "shrubs" categoryKey on products).
    const order = ["hydrangea", "annuals", "perennials", "other"];
    const buckets = order.map((key) => availableProducts.filter((product) => product.categoryKey === key));
    const out = [];
    for (let i = 0; out.length < 12 && buckets.some((bucket) => bucket[i]); i += 1) {
      for (const bucket of buckets) {
        if (bucket[i]) out.push(bucket[i]);
      }
    }
    return out.slice(0, 12);
  }, [availableProducts]);

  const galleryProducts = useMemo(
    () => data.products.filter((product) => product.image),
    [data.products],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const matched = data.products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categoryKey === activeCategory;
      const matchesQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
    // in-stock first so greyed-out items sink to the bottom of the grid
    return [...matched.filter((product) => product.stock > 0), ...matched.filter((product) => product.stock === 0)];
  }, [activeCategory, data.products, query]);

  const routeName = route === "shop" ? "home" : route.split("/")[0];
  const productId = Number(route.split("/")[1]);
  const selectedProduct = data.products.find((product) => product.id === productId) || featured[0] || data.products[0];
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const lightboxProduct = lightboxIndex === null ? null : galleryProducts[lightboxIndex];

  const addToCart = (product, variant = null) => {
    if (!product) return;
    // вариативный товар без явного выбора — берём доступный размер по умолчанию
    if (!variant && product.variants?.length) variant = defaultVariant(product);
    const stock = variant ? variant.stock : product.stock;
    if (!stock || stock <= 0) return;
    const lineKey = variant ? `${product.id}:${variant.id}` : `${product.id}`;
    setCart((items) => {
      const existing = items.find((item) => item.lineKey === lineKey);
      if (existing) {
        return items.map((item) =>
          item.lineKey === lineKey ? { ...item, qty: Math.min(item.qty + 1, stock) } : item,
        );
      }
      return [
        ...items,
        {
          ...product,
          variants: undefined,
          lineKey,
          qty: 1,
          stock,
          price: variant ? variant.price : product.price,
          variantId: variant ? variant.id : null,
          variantLabel: variant ? variant.label : product.cartNote || "",
        },
      ];
    });
    setDrawerOpen(true);
  };

  const openLightbox = (product) => {
    const index = galleryProducts.findIndex((item) => item.id === product.id);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  // Decor base (GitHub Pages / WP safe), scroll reveals, and pink-sun parallax.
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--decor-sprig", `url("${baseUrl}assets/decor/sprig.svg")`);
    root.style.setProperty("--decor-leaf", `url("${baseUrl}assets/decor/leaf.svg")`);

    const revealAll = () =>
      document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => el.classList.add("in-view"));

    if (
      window.matchMedia("(prefers-reduced-motion: reduce)").matches ||
      !("IntersectionObserver" in window)
    ) {
      revealAll();
      return undefined;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    const reveals = Array.from(document.querySelectorAll(".reveal:not(.in-view)"));
    reveals.forEach((el) => io.observe(el));

    // re-renders (filters, search) mount fresh .reveal nodes — pick them up too
    const mo = new MutationObserver(() => {
      document.querySelectorAll(".reveal:not(.in-view)").forEach((el) => io.observe(el));
    });
    mo.observe(document.body, { childList: true, subtree: true });

    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const mid = window.innerHeight / 2;
        document.querySelectorAll(".sun-photo, .hero-leaf").forEach((el) => {
          const rect = el.getBoundingClientRect();
          el.style.setProperty("--scrollY", String(Math.round(rect.top + rect.height / 2 - mid)));
        });
        const header = document.querySelector(".experience-header");
        if (header) header.classList.toggle("is-stuck", window.scrollY > 28);
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    return () => {
      io.disconnect();
      mo.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, [data, route]);

  return (
    <main className="experience-shell redesign">
      <StoreHeader
        routeName={routeName}
        go={go}
        cartCount={cartCount}
        openCart={() => setDrawerOpen(true)}
        data={data}
        setQuery={setQuery}
        setActiveCategory={setActiveCategory}
      />

      {routeName === "home" && (
        <HomeExperience
          data={data}
          featured={featured}
          galleryProducts={galleryProducts}
          go={go}
          addToCart={addToCart}
          openLightbox={openLightbox}
          setActiveCategory={setActiveCategory}
        />
      )}
      {routeName === "catalog" && (
        <CatalogExperience
          data={data}
          filtered={filtered}
          activeCategory={activeCategory}
          setActiveCategory={setActiveCategory}
          query={query}
          setQuery={setQuery}
          go={go}
          addToCart={addToCart}
          openLightbox={openLightbox}
        />
      )}
      {routeName === "product" &&
        (selectedProduct.kind === "guide" ? (
          <GuideExperience key={selectedProduct.id} product={selectedProduct} data={data} go={go} addToCart={addToCart} />
        ) : (
          <ProductExperience product={selectedProduct} products={featured} go={go} addToCart={addToCart} openLightbox={openLightbox} />
        ))}
      {routeName === "delivery" && <DeliveryExperience data={data} go={go} />}
      {routeName === "about" && <AboutExperience data={data} go={go} />}
      {!["home", "catalog", "product", "delivery", "about"].includes(routeName) && (
        <HomeExperience data={data} featured={featured} galleryProducts={galleryProducts} go={go} addToCart={addToCart} openLightbox={openLightbox} />
      )}

      <StoreFooter data={data} go={go} />

      <CartDrawer
        cart={cart}
        cartTotal={cartTotal}
        open={drawerOpen}
        setCart={setCart}
        setOpen={setDrawerOpen}
      />
      <PhotoLightbox
        product={lightboxProduct}
        onClose={() => setLightboxIndex(null)}
        addToCart={addToCart}
        go={go}
      />
      <MobileTabbar routeName={routeName} go={go} />
    </main>
  );
}

function MobileTabbar({ routeName, go }) {
  const tabs = [
    ["home", "Главная", House, "shop"],
    ["catalog", "Каталог", Plant, "catalog"],
    ["delivery", "Доставка", Truck, "delivery"],
    ["about", "О нас", Leaf, "about"],
  ];
  return (
    <nav className="mobile-tabbar" aria-label="Навигация">
      {tabs.map(([key, label, Icon, target]) => (
        <button
          key={key}
          type="button"
          className={routeName === key ? "active" : ""}
          onClick={() => go(target)}
        >
          <Icon size={21} weight={routeName === key ? "fill" : "regular"} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

function BrandLogo({ go, variant = "berry" }) {
  return (
    <button
      className={`brand brand-lockup brand-lockup--${variant}`}
      type="button"
      onClick={() => go("shop")}
      aria-label="Анюткин сад — на главную"
    >
      <img className="brand-mark-img" src={assetUrl(`assets/logo/mark-${variant}.svg`)} alt="" aria-hidden="true" />
      <span className="brand-text">
        <strong>Анюткин сад</strong>
        <small>цветочное хозяйство</small>
      </span>
    </button>
  );
}

function StoreHeader({ routeName, go, cartCount, openCart, data, setQuery, setActiveCategory }) {
  const hasGuides = (data?.products || []).some((product) => product.kind === "guide");
  const links = [
    ["home", "Главная", "shop"],
    ["catalog", "Каталог", "catalog"],
    ...(hasGuides ? [["guides", "Пособия", "catalog"]] : []),
    ["delivery", "Доставка", "delivery"],
    ["about", "О хозяйстве", "about"],
  ];

  const galleryProducts = data?.products?.filter((product) => product.image) || [];
  const catProduct = (key) =>
    galleryProducts.find((product) => product.categoryKey === key && product.stock > 0) ||
    galleryProducts.find((product) => product.categoryKey === key);
  const sortWord = (n) => {
    const m10 = n % 10;
    const m100 = n % 100;
    if (m10 === 1 && m100 !== 11) return "сорт";
    if (m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14)) return "сорта";
    return "сортов";
  };
  // динамически из данных — работает с любым числом категорий
  const productKey = (key) => (key === "shrubs" ? "other" : key);
  const megaCats = (data?.categories || [])
    .filter((category) => category.count > 0)
    .map((category) => ({
      key: productKey(category.key),
      label: category.name,
      count: category.count,
      product: catProduct(productKey(category.key)),
    }));

  const openCategory = (key) => {
    if (setActiveCategory) setActiveCategory(key);
    go("catalog");
  };

  return (
    <>
      <div className="header-topbar" aria-label="Условия магазина">
        <div className="header-topbar__inner">
          <span>
            <Truck size={14} weight="duotone" />
            Доставка СДЭК по всей России
          </span>
          <span className="header-topbar__place">
            <MapPin size={14} weight="duotone" />
            Московская область, дп. Лесной городок
          </span>
        </div>
      </div>
    <header className="experience-header">
      <div className="header-brand-zone">
        <BrandLogo go={go} />
      </div>
      <nav className="experience-nav" aria-label="Навигация сайта">
        {links.map(([key, label, target]) =>
          key === "catalog" ? (
            <div className="nav-mega" key={key}>
              <button className={routeName === key ? "active" : ""} type="button" onClick={() => go(target)}>
                {label}
                <CaretDown size={12} weight="bold" />
              </button>
              <div className="mega-menu" role="menu" aria-label="Категории каталога">
                <div className="mega-grid">
                  {megaCats.map((category) => (
                    <button className="mega-card" type="button" key={category.key} onClick={() => openCategory(category.key)} role="menuitem">
                      {category.product?.image ? (
                        <img src={assetUrl(category.product.image)} alt={category.label} />
                      ) : (
                        <span className="mega-card__ph"><Leaf size={22} weight="duotone" /></span>
                      )}
                      <span className="mega-card__text">
                        <strong>{category.label}</strong>
                        <small>{category.count} {sortWord(category.count)}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <button className="mega-all" type="button" onClick={() => go("catalog")}>
                  Весь каталог
                  <ArrowRight size={15} weight="bold" />
                </button>
              </div>
            </div>
          ) : (
            <button
              className={routeName === key ? "active" : ""}
              key={key}
              type="button"
              onClick={() => (key === "guides" ? openCategory("guides") : go(target))}
            >
              {label}
            </button>
          ),
        )}
      </nav>
      <div className="header-actions">
        <button className="cart-button" type="button" onClick={openCart} aria-label="Корзина">
          <Basket size={20} weight="duotone" />
          <span className="cart-button__label">Корзина</span>
          {cartCount > 0 && <span className="cart-button__count">{cartCount}</span>}
        </button>
      </div>
    </header>
    </>
  );
}

const SOCIALS = [
  { key: "tg", label: "Telegram", url: "https://t.me/Anytkin_sad", vb: "0 0 496 512", d: "M248 8C111 8 0 119 0 256s111 248 248 248 248-111 248-248S385 8 248 8zm121.8 169.9l-40.7 191.8c-3 13.6-11.1 16.9-22.4 10.5l-62-45.7-29.9 28.8c-3.3 3.3-6.1 6.1-12.5 6.1l4.4-63.1 114.9-103.8c5-4.4-1.1-6.9-7.7-2.5l-142 89.4-61.2-19.1c-13.3-4.2-13.6-13.3 2.8-19.7l239.1-92.2c11.1-4 20.8 2.7 17.2 19.5z" },
  { key: "vk", label: "ВКонтакте", url: "https://vk.com/anytkin_sad", vb: "0 0 576 512", d: "M545 117.7c3.7-12.5 0-21.7-17.8-21.7h-58.9c-15 0-21.9 7.9-25.6 16.7 0 0-30 73.1-72.4 120.5-13.7 13.7-20 18.1-27.5 18.1-3.7 0-9.4-4.4-9.4-16.9V117.7c0-15-4.2-21.7-16.6-21.7h-92.6c-9.4 0-15 7-15 13.5 0 14.2 21.2 17.5 23.4 57.5v86.8c0 19-3.4 22.5-10.9 22.5-20 0-68.6-73.4-97.4-157.4-5.8-16.3-11.5-22.9-26.6-22.9H38.8c-16.8 0-20.2 7.9-20.2 16.7 0 15.6 20 93.1 93.1 195.5C160.4 378.1 229 416 291.4 416c37.5 0 42.1-8.4 42.1-22.9 0-66.8-3.4-73.1 15.4-73.1 8.7 0 23.7 4.4 58.7 38.1 40 40 46.6 57.9 69 57.9h58.9c16.8 0 25.3-8.4 20.4-25-11.2-34.9-86.9-106.7-90.3-111.5-8.7-11.2-6.2-16.2 0-26.2.1-.1 72-101.3 79.4-135.6z" },
  { key: "wa", label: "WhatsApp", url: "https://wtsp.cc/79127063040", vb: "0 0 448 512", d: "M224 122.8c-72.7 0-131.8 59.1-131.9 131.8 0 24.9 7 49.2 20.2 70.1l3.1 5-13.3 48.6 49.9-13.1 4.8 2.9c20.2 12 43.4 18.4 67.1 18.4h.1c72.6 0 133.3-59.1 133.3-131.8 0-35.2-15.2-68.3-40.1-93.2-25-25-58-38.7-93.2-38.7zm77.5 188.4c-3.3 9.3-19.1 17.7-26.7 18.8-12.6 1.9-22.4.9-47.5-9.9-39.7-17.2-65.7-57.2-67.7-59.8-2-2.6-16.2-21.5-16.2-41s10.2-29.1 13.9-33.1c3.6-4 7.9-5 10.6-5 2.6 0 5.3 0 7.6.1 2.4.1 5.7-.9 8.9 6.8 3.3 7.9 11.2 27.4 12.2 29.4s1.7 4.3.3 6.9c-7.6 15.2-15.7 14.6-11.6 21.6 15.3 26.3 30.6 35.4 53.9 47.1 4 2 6.3 1.7 8.6-1 2.3-2.6 9.9-11.6 12.5-15.5 2.6-4 5.3-3.3 8.9-2 3.6 1.3 23.1 10.9 27.1 12.9s6.6 3 7.6 4.6c.9 1.9.9 9.9-2.4 19.1zM400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48zM223.9 413.2c-26.6 0-52.7-6.7-75.8-19.3L64 416l22.5-82.2c-13.9-24-21.2-51.3-21.2-79.3C65.4 167.1 136.5 96 223.9 96c42.4 0 82.2 16.5 112.2 46.5 29.9 30 47.9 69.8 47.9 112.2 0 87.4-72.7 158.5-160.1 158.5z" },
  { key: "yt", label: "YouTube", url: "https://youtube.com/@anytkin_sad?si=xCr2EryDQCVqnpCH", vb: "0 0 576 512", d: "M549.655 124.083c-6.281-23.65-24.787-42.276-48.284-48.597C458.781 64 288 64 288 64S117.22 64 74.629 75.486c-23.497 6.322-42.003 24.947-48.284 48.597-11.412 42.867-11.412 132.305-11.412 132.305s0 89.438 11.412 132.305c6.281 23.65 24.787 41.5 48.284 47.821C117.22 448 288 448 288 448s170.78 0 213.371-11.486c23.497-6.321 42.003-24.171 48.284-47.821 11.412-42.867 11.412-132.305 11.412-132.305s0-89.438-11.412-132.305zm-317.51 213.508V175.185l142.739 81.205-142.739 81.201z" },
];

function FooterSocial() {
  return (
    <div className="footer-social" aria-label="Мы в соцсетях">
      {SOCIALS.map((s) => (
        <a key={s.key} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
          <svg viewBox={s.vb} xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d={s.d} /></svg>
        </a>
      ))}
    </div>
  );
}

function StoreFooter({ data, go }) {
  return (
    <footer className="store-footer" id="contacts">
      <div className="footer-hero">
        <BrandLogo go={go} variant="white" />
        <p>
          Декоративные растения: живое наличие, реальные фото, аккуратная упаковка. СДЭК по России и самовывоз в Москве.
        </p>
        <div className="footer-proof">
          <span>{data.products.length} товаров</span>
          <span>{data.categories.length} категорий</span>
          <span>СДЭК и самовывоз в Москве</span>
        </div>
        <FooterSocial />
      </div>

      <div className="footer-columns">
        <section>
          <h3>Каталог</h3>
          {data.categories.slice(0, 5).map((category) => (
            <button type="button" key={category.key} onClick={() => go("catalog")}>
              <span>{category.name}</span>
              <em>{category.count}</em>
            </button>
          ))}
        </section>
        <section>
          <h3>Покупателям</h3>
          <button type="button" onClick={() => go("delivery")}>Доставка СДЭК</button>
          <button type="button" onClick={() => go("about")}>О хозяйстве</button>
          <button type="button" onClick={() => go("catalog")}>Растения в наличии</button>
        </section>
        <section className="footer-contact-card">
          <h3>Контакты</h3>
          <a href="tel:+79127063040">+7 (912) 706-30-40</a>
          <a href="mailto:Anytkin.sad@mail.ru">Anytkin.sad@mail.ru</a>
          <span>Московская область, дп. Лесной городок</span>
          <small>Заказы согласовываются перед отправкой растений.</small>
        </section>
      </div>

      <div className="footer-strip">
        <small className="footer-copy">© Анюткин сад · цветочное хозяйство</small>
        <button className="primary-button" type="button" onClick={() => go("catalog")}>
          Перейти в каталог
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
    </footer>
  );
}

function HomeExperience({ data, featured, galleryProducts, go, addToCart, openLightbox, setActiveCategory }) {
  const hydrangeas = galleryProducts.filter((product) => product.categoryKey === "hydrangea" && product.stock > 0);
  const heroProduct =
    hydrangeas.find((product) => product.image?.includes("laymlayt")) ||
    hydrangeas.find((product) => product.image?.includes("silver-dollar")) ||
    hydrangeas.find((product) => product.image?.includes("polar-bir")) ||
    featured[0] ||
    data.products[0];
  const heroPicks = [
    heroProduct,
    ...hydrangeas.filter((product) => product.id !== heroProduct.id),
    ...featured.filter((product) => product.id !== heroProduct.id),
  ].filter((product, index, items) => product && items.findIndex((item) => item.id === product.id) === index);
  const categoryCount = (key) => data.categories.find((category) => category.key === key)?.count || 0;
  const categoryProduct = (key, fallbackIndex = 0) =>
    galleryProducts.find((product) => product.categoryKey === key && product.stock > 0) ||
    galleryProducts.find((product) => product.categoryKey === key) ||
    featured[fallbackIndex] ||
    heroProduct;
  const goCategory = (key) => {
    if (setActiveCategory) setActiveCategory(key === "other" ? "other" : key);
    go("catalog");
  };
  const categoryStories = [
    {
      key: "hydrangea",
      title: "Гортензии",
      text: "Метельчатые сорта для выразительных посадок и долгого цветения.",
      product: categoryProduct("hydrangea"),
      count: categoryCount("hydrangea"),
      Icon: Plant,
      feature: true,
    },
    {
      key: "perennials",
      title: "Многолетники",
      text: "Эхинацеи, шалфеи и растения, которые возвращаются каждый сезон.",
      product: categoryProduct("perennials", 1),
      count: categoryCount("perennials"),
      Icon: Leaf,
    },
    {
      // NOTE: shrubs live under categoryKey "other"; count is declared under category.key "shrubs".
      key: "other",
      title: "Кустарники и сад",
      text: "Спиреи, лапчатки, туи и практичные растения для структуры участка.",
      product: categoryProduct("other", 3),
      count: categoryCount("shrubs") || 16,
      Icon: Package,
    },
    {
      key: "annuals",
      title: "Цветущие однолетники",
      text: "Яркие сорта для кашпо, клумб и быстрого сезонного обновления сада.",
      product: categoryProduct("annuals", 2),
      count: categoryCount("annuals"),
      Icon: Sparkle,
    },
  ];

  const plants = galleryProducts.filter((product) => !product.kind);
  const guides = data.products.filter((product) => product.kind === "guide");

  return (
    <>
      <HeroSection
        slides={plants}
        productCount={data.products.filter((product) => !product.kind).length}
        categoryCount={data.categories.length}
        go={go}
        addToCart={addToCart}
        openLightbox={openLightbox}
      />

      <FeatureStrip />

      <section className="category-band reveal" aria-label="Категории растений">
        <div className="section-head center">
          <h2 className="section-title">Категории питомника</h2>
          <p>Подберите растения под задачу, участок и сезон посадки.</p>
        </div>
        <div className="category-story-grid">
          {categoryStories.map(({ key, title, text, product, count, Icon, feature }, index) => (
            <button
              className={`category-story-card elev reveal${feature ? " is-feature" : ""}`}
              style={{ "--i": index }}
              key={key}
              type="button"
              onClick={() => goCategory(key)}
            >
              <img src={assetUrl(product.image)} alt={product.name} />
              <span className="category-story-shade" />
              <span className="category-story-content">
                <Icon size={24} weight="duotone" />
                <strong>{title}</strong>
                <small>{count} сортов</small>
                <em>{text}</em>
              </span>
              <ArrowRight size={18} weight="bold" />
            </button>
          ))}
        </div>
      </section>

      <SeasonalPromo
        product={
          galleryProducts.find((item) => /спирея/i.test(item.name) && item.stock > 0) ||
          galleryProducts.find((item) => /пузыреплодник/i.test(item.name) && item.stock > 0) ||
          categoryProduct("other")
        }
        go={go}
        goCategory={goCategory}
        openLightbox={openLightbox}
      />

      <section className="editorial-section reveal">
        <div className="section-head center">
          <h2 className="section-title">Сезонный выбор</h2>
          <p>Живое наличие — бережно упакуем и отправим ваш заказ.</p>
        </div>
        <div className="editorial-grid">
          {featured.slice(0, 8).map((product, index) => (
            <LuxuryProductCard
              key={product.id}
              product={product}
              index={index}
              feature={index === 2}
              go={go}
              addToCart={addToCart}
              openLightbox={openLightbox}
            />
          ))}
        </div>
      </section>

      <GuidesShowcase products={guides} go={go} />

      <SignatureCollection data={data} products={plants} go={go} openLightbox={openLightbox} />

      <WhyUs photo={heroProduct} openLightbox={openLightbox} />

      <AvitoReviews />
    </>
  );
}

function CountUp({ value, duration = 1300 }) {
  const ref = useRef(null);
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) {
      setDisplay(value);
      return undefined;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          const start = performance.now();
          const step = (now) => {
            const progress = Math.min(1, (now - start) / duration);
            const eased = 1 - Math.pow(1 - progress, 3);
            setDisplay(Math.round(value * eased));
            if (progress < 1) raf = requestAnimationFrame(step);
          };
          raf = requestAnimationFrame(step);
          io.disconnect();
        }
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (raf) cancelAnimationFrame(raf);
    };
  }, [value, duration]);
  return <strong ref={ref}>{display}</strong>;
}

function HeroPetals({ count = 16 }) {
  const petals = useMemo(() => {
    // deterministic pseudo-random per (index, salt) — stable across renders, varied per petal
    const rand = (i, s) => {
      const x = Math.sin(i * 99.13 + s * 37.7) * 43758.5453;
      return x - Math.floor(x);
    };
    return Array.from({ length: count }, (_, i) => ({
      x: (rand(i, 1) * 100).toFixed(1),
      size: (9 + rand(i, 2) * 13).toFixed(1),
      dur: (9 + rand(i, 3) * 9).toFixed(1),
      delay: (-rand(i, 4) * 18).toFixed(1),
      sway: (16 + rand(i, 5) * 46).toFixed(0),
      swayDur: (2.4 + rand(i, 6) * 2.8).toFixed(1),
      spinDur: (3.2 + rand(i, 7) * 5.5).toFixed(1),
      spinDir: rand(i, 8) > 0.5 ? 1 : -1,
      opacity: (0.35 + rand(i, 9) * 0.4).toFixed(2),
      blur: rand(i, 10) > 0.72 ? 1 : 0,
    }));
  }, [count]);

  return (
    <div className="hero-petals" aria-hidden="true">
      {petals.map((p, i) => (
        <span
          key={i}
          className="petal"
          style={{
            left: `${p.x}%`,
            "--size": `${p.size}px`,
            "--dur": `${p.dur}s`,
            "--delay": `${p.delay}s`,
            "--sway": `${p.sway}px`,
            "--sway-dur": `${p.swayDur}s`,
            "--spin-dur": `${p.spinDur}s`,
            "--spin-dir": p.spinDir,
            "--opacity": p.opacity,
            "--blur": `${p.blur}px`,
          }}
        >
          <span className="petal__sway">
            <span className="petal__shape" />
          </span>
        </span>
      ))}
    </div>
  );
}

function HeroSection({ slides, productCount, categoryCount, go, addToCart, openLightbox }) {
  const total = slides.length;
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || total < 2) return undefined;
    const id = setInterval(() => setActive((value) => (value + 1) % total), 4500);
    return () => clearInterval(id);
  }, [paused, total]);

  const current = slides[active] || slides[0];
  if (!current) return null;
  const prev = (active - 1 + total) % total;
  const next = (active + 1) % total;

  return (
    <section className="experience-hero">
      <span className="hero-leaf hero-leaf--1" aria-hidden="true" />
      <span className="hero-leaf hero-leaf--2" aria-hidden="true" />
      <HeroPetals />
      <div className="hero-copy hero-copy-v2">
        <p className="eyebrow reveal" style={{ "--i": 0 }}>
          <Sparkle size={16} weight="fill" />
          СДЭК по России · самовывоз в Москве
        </p>
        <h1 className="reveal" style={{ "--i": 1 }}>
          Растения для <span className="accent-word">сада</span> с доставкой по России
        </h1>
        <p className="hero-lede reveal" style={{ "--i": 2 }}>
          Выбирайте гортензии, многолетники, кустарники и сезонные цветы по реальным фото,
          актуальному наличию и понятным условиям отправки.
        </p>
        <div className="hero-rating reveal" style={{ "--i": 3 }}>
          <span className="stars" aria-hidden="true">★★★★★</span>
          <strong>4,9</strong>
          <span>отзывы садоводов</span>
        </div>
        <div className="hero-actions reveal" style={{ "--i": 4 }}>
          <button className="primary-button" type="button" onClick={() => go("catalog")}>
            Открыть каталог
            <ArrowRight size={18} weight="bold" />
          </button>
          <button className="round-link" type="button" onClick={() => go("about")}>
            О хозяйстве
            <Sparkle size={18} weight="duotone" />
          </button>
        </div>
        <div className="hero-trust reveal" style={{ "--i": 5 }} aria-label="Преимущества">
          <span><Leaf size={14} weight="duotone" />Собственное производство</span>
          <span><Sparkle size={14} weight="duotone" />Зимостойкие сорта</span>
          <span><Package size={14} weight="duotone" />Бережная доставка</span>
        </div>
        <div className="proof-row reveal" style={{ "--i": 6 }}>
          <div><CountUp value={productCount} /><span>сортов в каталоге</span></div>
          <div><CountUp value={categoryCount} /><span>категорий</span></div>
          <div><strong>СДЭК</strong><span>по всей России</span></div>
        </div>
      </div>

      <div
        className="hero-visual-v3"
        aria-label="Лучшие растения хозяйства"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
      >
        <div className="hero-stage sun-photo">
          <div
            className={`hero-carousel${paused ? " is-paused" : ""}`}
            onClick={() => openLightbox(current)}
            role="button"
            tabIndex={-1}
            aria-label="Открыть фото крупно"
          >
            {slides.map((product, index) => {
              const inWindow = index === active || index === prev || index === next;
              return (
                <img
                  key={product.id}
                  src={inWindow ? assetUrl(product.image) : undefined}
                  alt={index === active ? product.name : ""}
                  className={index === active ? "is-active" : ""}
                  loading="lazy"
                />
              );
            })}
            <button className="hero-zoom" type="button" onClick={() => openLightbox(current)} aria-label="Открыть фото крупно">
              <MagnifyingGlass size={18} weight="bold" />
            </button>
            <span className="hero-progress" key={active} aria-hidden="true" />
          </div>
        </div>

        <div className="hero-caption">
          <div className="hero-caption__info">
            <strong>{current.name}</strong>
            <span>{formatRub(current.price)} · {stockLabel(current)}</span>
          </div>
          <button
            className="hero-caption__add"
            type="button"
            onClick={() => addToCart(current)}
            disabled={current.stock === 0}
          >
            <Plus size={15} weight="bold" />
            В корзину
          </button>
        </div>

      </div>
    </section>
  );
}

function FeatureStrip() {
  const chips = [
    [Plant, "Свежие саженцы", "из собственной теплицы"],
    [Truck, "Доставка СДЭК", "по всей России"],
    [Leaf, "Собственный питомник", "выращиваем сами"],
    [Sparkle, "Для любого сада", "зимостойкость, зона 4"],
    [Package, "Бережная упаковка", "растения едут с комом"],
  ];

  return (
    <section className="feature-strip" aria-label="Преимущества хозяйства">
      <div className="feature-strip__inner">
        {chips.map(([Icon, title, sub], index) => (
          <div className="feature-chip reveal" style={{ "--i": index }} key={title}>
            <span className="feature-chip__icon">
              <Icon size={22} weight="duotone" />
            </span>
            <strong>{title}</strong>
            <small>{sub}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function SeasonalPromo({ product, go, goCategory, openLightbox }) {
  if (!product) return null;
  return (
    <section className="promo-banner has-corners reveal" aria-label="Акция на кустарники">
      <div className="promo-banner__photo sun-photo">
        <button className="photo-open" type="button" onClick={() => openLightbox(product)} aria-label={`Фото: ${product.name}`}>
          <img src={assetUrl(product.image)} alt={product.name} />
        </button>
      </div>
      <div className="promo-banner__copy">
        <p className="script">Акция на кустарники</p>
        <h2>От 24 шт — цена ниже</h2>
        <p className="promo-sub">спиреи и пузыреплодники для живых изгородей и массовых посадок</p>
        <p className="promo-body">Доставка СДЭК по России и самовывоз в Москве.</p>
        <div className="promo-actions">
          <button className="round-link" type="button" onClick={() => (goCategory ? goCategory("other") : go("catalog"))}>
            Смотреть кустарники
            <ArrowRight size={18} weight="bold" />
          </button>
          <button className="primary-button" type="button" onClick={() => (goCategory ? goCategory("other") : go("catalog"))}>
            Заказать
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
      </div>
    </section>
  );
}

function SignatureCollection({ data, products, go, openLightbox }) {
  const hydrangeas = products.filter((product) => product.categoryKey === "hydrangea");
  const lead =
    hydrangeas.find((product) => product.image?.includes("polar-bir")) || hydrangeas[0] || products[0];
  if (!lead) return null;
  const side = [
    ...hydrangeas.filter((product) => product.id !== lead.id),
    ...products.filter((product) => product.id !== lead.id),
  ].slice(0, 4);
  const byId = (id) => data.products.find((product) => product.id === id);
  const sorts = [
    { id: 711, name: "Гортензия метельчатая «Лаймлайт»", latin: "Hydrangea paniculata", price: 950, highlight: true },
    { id: 726, name: "Гортензия «Полар Бир»", latin: "Hydrangea paniculata", price: 850 },
    { id: 647, name: "Спирея японская «Литл Принцесс»", latin: "Spiraea japonica", price: 350 },
    { id: 2286, name: "Эхинацея «Mellow Yellows»", latin: "Echinacea purpurea", price: 300 },
    { id: 756, name: "Котовник Фассена", latin: "Nepeta × faassenii", price: 300 },
  ].filter((sort) => byId(sort.id));

  return (
    <section className="signature-section reveal" aria-label="Коллекция питомника">
      <div className="signature-list">
        <p className="eyebrow">Коллекция питомника</p>
        <h2 className="section-title left">Сортовые гортензии и многолетники</h2>
        <p className="signature-sub">Проверенные сорта из собственного производства.</p>
        <ul>
          {sorts.map((sort) => (
            <li key={sort.id} className={sort.highlight ? "is-highlight" : ""}>
              <button type="button" onClick={() => go(`product/${sort.id}`)}>
                <span className="sort-name">{sort.name}</span>
                <span className="sort-latin">{sort.latin}</span>
                <span className="sort-price">{formatRub(sort.price)}</span>
              </button>
            </li>
          ))}
        </ul>
        <button className="round-link" type="button" onClick={() => go("catalog")}>
          Весь каталог
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
      <div className="signature-frame">
        <button className="signature-photo sun-photo" type="button" onClick={() => openLightbox(lead)}>
          <img src={assetUrl(lead.image)} alt={lead.name} />
          <span className="signature-photo__zoom">
            <MagnifyingGlass size={18} weight="duotone" />
            Смотреть фото
          </span>
          <strong className="signature-photo__name">{lead.name}</strong>
        </button>
        <div className="signature-thumbs">
          {side.map((product) => (
            <button className="signature-thumb" type="button" key={product.id} onClick={() => openLightbox(product)}>
              <img src={assetUrl(product.image)} alt={product.name} />
              <span className="signature-thumb__cap">
                <strong>{product.name}</strong>
                <small>{formatRub(product.price)}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyUs({ photo, openLightbox }) {
  const points = [
    ["01", "Собственное производство", "Выращиваем саженцы сами, без перекупа. Каждое растение проверяем перед отправкой."],
    ["02", "Зимостойкие сорта", "Гортензии, спиреи и пузыреплодники зоны 3–4, переносят до −34 °C."],
    ["03", "Рекомендации в подарок", "К каждому растению — памятка по посадке и уходу."],
    ["04", "Бережная доставка СДЭК", "Упаковываем с земляным комом, отправляем по всей России."],
  ];
  const left = [points[0], points[2]];
  const right = [points[1], points[3]];

  return (
    <section className="why-us reveal" aria-label="Почему выбирают Анюткин сад">
      <div className="section-head center">
        <h2 className="section-title">Почему выбирают Анюткин сад</h2>
        <p>Собственное производство, зимостойкие сорта и бережная доставка.</p>
      </div>
      <div className="why-grid">
        <div className="why-col why-col--left">
          {left.map(([num, title, text]) => (
            <div className="why-item reveal" key={num}>
              <span className="ghost-num">{num}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
        <div className="why-center">
          <span className="dash-line" aria-hidden="true" />
          <div className="sun-disc sun-photo">
            <button className="photo-open" type="button" onClick={() => openLightbox(photo)} aria-label={`Фото: ${photo.name}`}>
              <img src={assetUrl(photo.image)} alt={photo.name} />
            </button>
          </div>
        </div>
        <div className="why-col why-col--right">
          {right.map(([num, title, text]) => (
            <div className="why-item reveal" key={num}>
              <span className="ghost-num">{num}</span>
              <strong>{title}</strong>
              <p>{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function AvitoReviews() {
  const [data, setData] = useState(undefined); // undefined = loading, null = no data
  // на телефонах ряд должен быть коротким: ширина ленты × DPR упирается
  // в лимит GPU-текстуры (≈16384px) — длинный ряд перестаёт анимироваться
  const [mobile, setMobile] = useState(() => window.matchMedia("(max-width: 760px)").matches);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 760px)");
    const onChange = () => setMobile(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    fetch(`${baseUrl}data/reviews.json`, { cache: "no-cache" })
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => setData(json && json.reviews && json.reviews.length ? json : null))
      .catch(() => setData(null));
  }, []);

  // Мобильные ряды: вместо CSS-анимации — нативный скролл с авто-дрейфом.
  // CSS-marquee на реальных телефонах рендерится рывками (гигантские слои),
  // а нативный скролл браузеры тайлят идеально + можно листать пальцем.
  const rowARef = useRef(null);
  const rowBRef = useRef(null);
  useEffect(() => {
    if (!mobile || !data) return undefined;
    const rows = [rowARef.current, rowBRef.current].filter(Boolean);
    if (!rows.length) return undefined;

    // период = расстояние между первой карточкой и её дублем
    const periodOf = (el) => {
      const kids = el.children;
      const half = Math.floor(kids.length / 2);
      return kids[half] && kids[0] ? kids[half].offsetLeft - kids[0].offsetLeft : el.scrollWidth / 2;
    };
    // позицию держим в JS как float: scrollLeft округляется браузером,
    // и дробное приращение иначе затирается (read-modify-write замерзает)
    const lanes = rows.map((el, index) => ({
      el,
      speed: index === 0 ? 26 : -20, // px/сек (не px/кадр — иначе на 120Гц вдвое быстрее)
      pos: index === 1 ? periodOf(el) / 2 : 0,
    }));
    lanes.forEach((lane) => {
      lane.el.scrollLeft = lane.pos;
    });

    let pausedUntil = 0;
    const onTouch = () => {
      pausedUntil = Date.now() + 3500;
    };
    rows.forEach((el) => el.addEventListener("touchstart", onTouch, { passive: true }));

    let raf = 0;
    let last = 0;
    const tick = (now) => {
      const dt = last ? Math.min(now - last, 64) : 16;
      last = now;
      const paused = Date.now() < pausedUntil;
      lanes.forEach((lane) => {
        if (paused) {
          // пользователь листает сам — синхронизируем нашу позицию
          lane.pos = lane.el.scrollLeft;
          return;
        }
        const period = periodOf(lane.el);
        if (period > 0) {
          lane.pos += (lane.speed * dt) / 1000;
          if (lane.pos >= period) lane.pos -= period;
          if (lane.pos < 0) lane.pos += period;
          lane.el.scrollLeft = lane.pos;
        }
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      rows.forEach((el) => el.removeEventListener("touchstart", onTouch));
    };
  }, [mobile, data]);

  if (data === undefined) return null;
  if (data === null) return <Testimonial />;

  const formatDate = (iso) => {
    if (!iso) return "";
    try {
      return new Date(iso).toLocaleDateString("ru-RU", { month: "long", year: "numeric" });
    } catch {
      return "";
    }
  };
  const starRow = (score) => "★".repeat(Math.max(0, Math.min(5, Math.round(score)))) + "☆".repeat(5 - Math.max(0, Math.min(5, Math.round(score))));
  const ratingLabel = data.rating != null ? data.rating.toFixed(1).replace(".", ",") : null;
  const reviewsWord = (n) => {
    const mod10 = n % 10;
    const mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return "отзыв";
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "отзыва";
    return "отзывов";
  };

  return (
    <section className="reviews-band mosaic-bg reveal" aria-label="Отзывы покупателей с Авито">
      <div className="reviews-inner">
        <h2 className="section-title">Отзывы садоводов</h2>
        <div className="reviews-summary">
          {ratingLabel && <strong className="reviews-score">{ratingLabel}</strong>}
          <div className="reviews-summary__meta">
            <span className="stars" aria-hidden="true">{starRow(data.rating ?? 5)}</span>
            <span>{data.reviewsCount} {reviewsWord(data.reviewsCount)} на Авито</span>
          </div>
          {data.profileUrl && (
            <a className="round-link" href={data.profileUrl} target="_blank" rel="noreferrer">
              Все отзывы
              <ArrowRight size={16} weight="bold" />
            </a>
          )}
        </div>
      </div>
      <div className="reviews-marquee" aria-label="Отзывы покупателей">
        {(mobile
          ? [
              { items: data.reviews.slice(0, 4), reverse: false, speed: "34s" },
              { items: data.reviews.slice(4, 8), reverse: true, speed: "42s" },
            ]
          : [
              { items: data.reviews.slice(0, 9), reverse: false, speed: "56s" },
              { items: data.reviews.slice(9, 18), reverse: true, speed: "68s" },
            ]
        ).map(({ items, reverse, speed }, rowIndex) =>
          items.length ? (
            <div
              className={`marquee-row${reverse ? " marquee-row--reverse" : ""}`}
              style={{ "--speed": speed }}
              key={rowIndex}
              ref={rowIndex === 0 ? rowARef : rowBRef}
            >
              {[...items, ...items].map((review, index) => (
                <article
                  className="review-card"
                  key={`${review.id || index}-${index}`}
                  aria-hidden={index >= items.length || undefined}
                >
                  <span className="stars" aria-hidden="true">{starRow(review.score)}</span>
                  <p>{review.text}</p>
                  <footer>
                    <strong>{review.author}</strong>
                    <small>{formatDate(review.date)}</small>
                  </footer>
                </article>
              ))}
            </div>
          ) : null,
        )}
      </div>
    </section>
  );
}

function Testimonial() {
  return (
    <section className="testimonial-band mosaic-bg reveal" aria-label="Отзывы садоводов">
      <div className="testimonial-inner">
        <h2 className="section-title">Отзывы садоводов</h2>
        <span className="quote-mark" aria-hidden="true">«</span>
        <p className="testimonial-quote">
          Заказывала три гортензии метельчатые и спирею. Пришли с комом земли, упакованы отлично —
          ничего не сломалось за дорогу. Прижились все, к августу «Лаймлайт» уже зацвёл.
          Спасибо за памятки по уходу!
        </p>
        <div className="testimonial-author">
          <span className="author-avatar">И</span>
          <div className="author-name">
            <strong>Ирина П.</strong>
            <small>Одинцово · садовод-любитель</small>
          </div>
          <span className="author-rating">
            <span className="stars" aria-hidden="true">★★★★★</span>
            5,0
          </span>
        </div>
      </div>
    </section>
  );
}

function CatalogExperience({ data, filtered, activeCategory, setActiveCategory, query, setQuery, go, addToCart, openLightbox }) {
  // products carry categoryKey "other" for shrubs while categories[] declares "shrubs"
  const filterKey = (key) => (key === "shrubs" ? "other" : key);

  return (
    <>
      <section className="catalog-hero">
        <div className="catalog-hero__copy">
          <p className="eyebrow">
            <Sparkle size={16} weight="fill" />
            Каталог
          </p>
          <h1>Каталог садовых растений</h1>
          <p className="catalog-hero__sub">
            Актуальные позиции по категориям, наличию и сезону — фото, цена и живой остаток в каждой карточке.
          </p>
        </div>
        <div className="catalog-hero__stats">
          <div className="stat-pill stat-pill--berry">
            <strong>{filtered.length}</strong>
            <span>в наличии</span>
          </div>
          <div className="stat-pill">
            <strong>{data.categories.length}</strong>
            <span>категорий</span>
          </div>
          <div className="stat-pill">
            <strong>СДЭК</strong>
            <span>по всей России</span>
          </div>
        </div>
      </section>

      <section className="catalog-toolbar floating-toolbar" aria-label="Фильтры каталога">
        <div className="search-field">
          <MagnifyingGlass size={18} weight="duotone" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти гортензию, шалфей, хризантему"
          />
        </div>
        <div className="chip-row">
          <button className={activeCategory === "all" ? "chip active" : "chip"} type="button" onClick={() => setActiveCategory("all")}>
            Все
          </button>
          {data.categories.map((category) => (
            <button
              className={activeCategory === filterKey(category.key) ? "chip active" : "chip"}
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(filterKey(category.key))}
            >
              {category.name}<span>{category.count}</span>
            </button>
          ))}
        </div>
      </section>

      {filtered.length === 0 ? (
        <section className="catalog-empty">
          <Leaf size={44} weight="duotone" />
          <h2>Ничего не нашлось</h2>
          <p>Попробуйте изменить запрос или выберите другую категорию.</p>
          <button
            className="primary-button"
            type="button"
            onClick={() => {
              setQuery("");
              setActiveCategory("all");
            }}
          >
            Сбросить фильтры
          </button>
        </section>
      ) : (
        <section className="editorial-grid catalog-page-grid">
          {filtered.slice(0, 36).map((product) => (
            <LuxuryProductCard key={product.id} product={product} go={go} addToCart={addToCart} openLightbox={openLightbox} />
          ))}
        </section>
      )}
    </>
  );
}

// Доступный по умолчанию размер: первый в наличии, иначе первый из списка.
function defaultVariant(product) {
  if (!product?.variants?.length) return null;
  return product.variants.find((v) => v.inStock) || product.variants[0];
}

// Выбор размера/объёма «как в Woo»: таблетки с ценой, недоступные — серые.
function SizePicker({ product, selectedId, onSelect }) {
  if (!product?.variants?.length) return null;
  return (
    <div className="size-picker">
      <span className="size-picker__label">{product.variantAttr || "Размер"}</span>
      <div className="size-picker__options" role="radiogroup" aria-label={product.variantAttr || "Размер"}>
        {product.variants.map((v) => (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={v.id === selectedId}
            disabled={!v.inStock}
            className={`size-pill${v.id === selectedId ? " is-active" : ""}${v.inStock ? "" : " is-out"}`}
            onClick={() => v.inStock && onSelect(v.id)}
          >
            <span className="size-pill__label">{v.label}</span>
            <span className="size-pill__price">{v.inStock ? formatRub(v.price) : "нет"}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ProductExperience({ product, products, go, addToCart, openLightbox }) {
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);
  const hasVariants = !!product.variants?.length;
  const [variantId, setVariantId] = useState(() => defaultVariant(product)?.id ?? null);
  useEffect(() => { setVariantId(defaultVariant(product)?.id ?? null); }, [product.id]);
  const selectedVariant = hasVariants ? product.variants.find((v) => v.id === variantId) || null : null;
  const displayPrice = selectedVariant ? selectedVariant.price : product.price;
  const canBuy = hasVariants ? !!selectedVariant?.inStock : product.stock > 0;

  return (
    <>
      <section className="product-detail-page">
        <div className="detail-gallery">
          <button className="detail-photo-button" type="button" onClick={() => openLightbox(product)}>
            <img src={assetUrl(product.image)} alt={product.name} />
            <span>
              <MagnifyingGlass size={17} weight="duotone" />
              Открыть фото
            </span>
          </button>
          <div className="detail-float">
            <span>{product.category}</span>
            <strong>{stockLabel(product)}</strong>
          </div>
        </div>
        <div className="detail-copy">
          <button className="back-link" type="button" onClick={() => go("catalog")}>
            Каталог
          </button>
          <h1>{product.name}</h1>
          <p>{product.description}</p>
          <div className="detail-price">
            <strong>{hasVariants ? `${formatRub(displayPrice)}` : formatRub(product.price)}</strong>
            <span>{canBuy ? "можно добавить в заказ" : "нет в наличии"}</span>
          </div>
          <SizePicker product={product} selectedId={variantId} onSelect={setVariantId} />
          <div className="care-facts">
            {Object.entries(product.care || {}).slice(0, 4).map(([key, value]) => (
              <article key={key}>
                <span>{careName(key)}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => addToCart(product, selectedVariant)} disabled={!canBuy}>
              Добавить в корзину
              <Plus size={18} weight="bold" />
            </button>
            <button className="round-link" type="button" onClick={() => go("delivery")}>
              Рассчитать доставку
              <Truck size={18} weight="duotone" />
            </button>
          </div>
        </div>
      </section>

      <section className="section-head">
        <p className="eyebrow">Похожие растения</p>
        <h2>Продолжаем покупку</h2>
      </section>
      <section className="editorial-grid compact-grid">
        {related.map((item) => (
          <LuxuryProductCard key={item.id} product={item} go={go} addToCart={addToCart} openLightbox={openLightbox} />
        ))}
      </section>
    </>
  );
}

function DeliveryExperience({ data, go }) {
  return (
    <>
      <section className="page-hero delivery-hero">
        <div>
          <p className="eyebrow">Доставка растений</p>
          <h1>СДЭК по России и самовывоз в Москве</h1>
          <p>
            Отправляем растения после подтверждения заказа и погоды. Перед передачей в доставку
            проверяем корневую, фиксируем бирку и упаковываем так, чтобы растение спокойно доехало.
          </p>
          <button className="primary-button" type="button" onClick={() => go("catalog")}>
            Выбрать растения
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
        <div className="delivery-card-3d">
          <Truck size={44} weight="duotone" />
          <strong>СДЭК</strong>
          <span>ПВЗ · курьер · бережная упаковка · трек-номер</span>
        </div>
      </section>

      <section className="process-board">
        {[
          ["01", "Оплата", "Реквизиты приходят после подтверждения заказа."],
          ["02", "Сборка", "Сверяем состав заказа, наличие и состояние растений перед упаковкой."],
          ["03", "Упаковка", "Чек-лист: влажность, корневая, бирка, фото перед отправкой."],
          ["04", "СДЭК", "Передаем заказ в доставку и отправляем трек-номер для отслеживания."],
        ].map(([num, title, text]) => (
          <article key={num}>
            <strong>{num}</strong>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="shipping-simulator">
        <div>
          <p className="eyebrow">Расчет доставки</p>
          <h2>Подскажем срок и удобный способ доставки</h2>
          <p>Укажите город, а мы подберем вариант СДЭК, рассчитаем примерный срок и согласуем упаковку под сезон.</p>
        </div>
        <div className="simulator-card">
          <label>Город</label>
          <input value="Санкт-Петербург" readOnly />
          <label>Способ</label>
          <input value="СДЭК до пункта выдачи" readOnly />
          <div>
            <span>Примерный срок</span>
            <strong>3-5 дней</strong>
          </div>
          <button type="button" onClick={() => go("catalog")}>Продолжить выбор</button>
        </div>
      </section>
    </>
  );
}

function AboutExperience({ data, go }) {
  return (
    <>
      <section className="page-hero about-hero">
        <div>
          <p className="eyebrow">О хозяйстве</p>
          <h1>Анюткин сад: свои растения с понятной доставкой</h1>
          <p>
            Мы выращиваем и подбираем декоративные растения для сада, показываем актуальное наличие,
            помогаем выбрать сорта по сезону и бережно отправляем заказы СДЭК.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={() => go("catalog")}>
          Перейти в каталог
          <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <section className="value-ladder">
        {[
          ["Выбор", "Каталог собран по категориям, наличию и сезону, чтобы быстро найти подходящие растения."],
          ["Упаковка", "Перед отправкой растения проверяются, маркируются и готовятся к дороге."],
          ["Доставка", "Заказы отправляются СДЭК или передаются самовывозом после согласования."],
        ].map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

    </>
  );
}

function LookbookGallery({ products, go, openLightbox }) {
  const hydrangeas = products.filter((product) => product.categoryKey === "hydrangea");
  const lead =
    hydrangeas.find((product) => product.image?.includes("polar-bir")) ||
    hydrangeas[0] ||
    products[1] ||
    products[0];
  const side = [
    ...hydrangeas.filter((product) => product.id !== lead?.id),
    ...products.filter((product) => product.id !== lead?.id),
  ].slice(0, 4);

  if (!lead) return null;

  return (
    <section className="lookbook-section">
      <div className="lookbook-copy">
        <p className="eyebrow">Сезонная коллекция</p>
        <h2>Гортензии крупным планом</h2>
        <p>
          Подборка сортов, которые легко сравнить по фото, цене и наличию перед заказом. Каждая карточка открывает крупную галерею растения.
        </p>
        <button className="round-link" type="button" onClick={() => go("catalog")}>
          Все растения
          <ArrowRight size={18} weight="bold" />
        </button>
      </div>
      <div className="lookbook-frame">
        <button className="lookbook-main" type="button" onClick={() => openLightbox(lead)}>
          <img src={assetUrl(lead.image)} alt={lead.name} />
          <span>
            <MagnifyingGlass size={18} weight="duotone" />
            Смотреть фото
          </span>
          <strong>{lead.name}</strong>
        </button>
        <div className="lookbook-side">
          {side.map((product) => (
            <button type="button" key={product.id} onClick={() => openLightbox(product)}>
              <img src={assetUrl(product.image)} alt={product.name} />
              <span>
                <strong>{product.name}</strong>
                <small>{formatRub(product.price)} · {stockLabel(product)}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

function PhotoLightbox({ product, onClose, addToCart, go }) {
  const [full, setFull] = useState(false); // фото на весь экран
  const [zoom, setZoom] = useState(null); // null | {x, y} — точка увеличения в %
  const [idx, setIdx] = useState(0); // индекс ФОТО внутри товара

  // Все фото текущего товара (а не других товаров!).
  const images = product
    ? (product.images && product.images.length ? product.images : [product.image]).filter(Boolean)
    : [];
  const total = images.length;
  const move = (d) => setIdx((i) => (total ? (i + d + total) % total : 0));

  useEffect(() => {
    setFull(false);
    setZoom(null);
    setIdx(0);
  }, [product]);

  useEffect(() => {
    if (!product) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") { if (full) setFull(false); else onClose(); }
      if (event.key === "ArrowLeft") move(-1);
      if (event.key === "ArrowRight") move(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [product, total, full]);

  if (!product) return null;

  const current = assetUrl(images[idx] || product.image);

  const pointPct = (clientX, clientY, el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  return (
    <aside className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Фотографии растения">
      <button className="photo-backdrop" type="button" onClick={onClose} aria-label="Закрыть фото" />
      <div className="photo-panel">
        <button className="modal-close icon-button" type="button" onClick={onClose} aria-label="Закрыть">
          <X size={20} weight="bold" />
        </button>
        <figure className="photo-stage">
          <button
            className="photo-stage-open"
            type="button"
            onClick={() => setFull(true)}
            aria-label="Открыть фото на весь экран"
          >
            <img src={current} alt={`${product.name} — фото ${idx + 1}`} />
            <span className="photo-stage-hint">
              <MagnifyingGlass size={15} weight="bold" />
              Фото целиком
            </span>
          </button>
          {total > 1 && (
            <>
              <button className="gallery-nav gallery-prev" type="button" onClick={() => move(-1)} aria-label="Предыдущее фото">
                <CaretLeft size={24} weight="bold" />
              </button>
              <button className="gallery-nav gallery-next" type="button" onClick={() => move(1)} aria-label="Следующее фото">
                <CaretRight size={24} weight="bold" />
              </button>
              <span className="photo-counter">{idx + 1} / {total}</span>
            </>
          )}
        </figure>

        {total > 1 && (
          <div className="photo-thumbs" role="tablist" aria-label="Фотографии товара">
            {images.map((im, i) => (
              <button
                key={i}
                type="button"
                className={`photo-thumb${i === idx ? " is-active" : ""}`}
                onClick={() => setIdx(i)}
                aria-label={`Фото ${i + 1}`}
                aria-selected={i === idx}
              >
                <img src={assetUrl(im)} alt="" loading="lazy" />
              </button>
            ))}
          </div>
        )}

        {full && (
          <div className="photo-fullview" role="dialog" aria-label="Фото на весь экран">
            <button
              className={`photo-fullview__stage${zoom ? " is-zoomed" : ""}`}
              type="button"
              aria-label={zoom ? "Уменьшить" : "Увеличить"}
              onClick={(event) => {
                const point = pointPct(event.clientX, event.clientY, event.currentTarget);
                setZoom((value) => (value ? null : point));
              }}
              onMouseMove={(event) => {
                if (zoom) setZoom(pointPct(event.clientX, event.clientY, event.currentTarget));
              }}
              onTouchMove={(event) => {
                const touch = event.touches[0];
                if (zoom && touch) setZoom(pointPct(touch.clientX, touch.clientY, event.currentTarget));
              }}
            >
              <img
                src={current}
                alt={`${product.name} — фото ${idx + 1}`}
                style={zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%`, transform: "scale(2.4)" } : undefined}
              />
            </button>
            <button
              className="photo-fullview__close icon-button"
              type="button"
              onClick={() => {
                setFull(false);
                setZoom(null);
              }}
              aria-label="Свернуть фото"
            >
              <X size={22} weight="bold" />
            </button>
            {total > 1 && (
              <>
                <button className="gallery-nav gallery-prev" type="button" onClick={() => move(-1)} aria-label="Предыдущее фото">
                  <CaretLeft size={26} weight="bold" />
                </button>
                <button className="gallery-nav gallery-next" type="button" onClick={() => move(1)} aria-label="Следующее фото">
                  <CaretRight size={26} weight="bold" />
                </button>
              </>
            )}
          </div>
        )}
        <section className="photo-details">
          <div className="photo-details__scroll">
            <p className="eyebrow">{product.category}</p>
            <h2>{product.name}</h2>
            <p>{product.description}</p>
          </div>
          <div className="photo-foot">
            <div className="photo-meta">
              <strong>{product.variants?.length ? `от ${formatRub(product.price)}` : formatRub(product.price)}</strong>
              <span>{stockLabel(product)}</span>
            </div>
            <div className="photo-actions">
              {product.variants?.length ? (
                <button className="primary-button" type="button" onClick={() => { onClose(); go(`product/${product.id}`); }} disabled={product.stock === 0}>
                  Выбрать размер
                  <ArrowRight size={17} weight="bold" />
                </button>
              ) : (
                <>
                  <button className="primary-button" type="button" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                    В корзину
                    <Plus size={17} weight="bold" />
                  </button>
                  <button className="round-link" type="button" onClick={() => { onClose(); go(`product/${product.id}`); }}>
                    Подробнее
                    <ArrowRight size={17} weight="bold" />
                  </button>
                </>
              )}
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

// Книжка-превью: страницы — картинки первых страниц PDF, последняя — призыв купить.
// DOM книги собирается вручную: page-flip сам переставляет узлы и удаляет корень при destroy,
// поэтому React им не управляет (иначе конфликт при размонтировании).
// Закрытая книга стоит по центру; уголок обложки подсвечен, пока человек не навёл мышь на книжку
// или не перелистнул. Сама книга ничего не загибает: это спорило с мышью и с прокруткой пальцем.
// На телефоне жесты page-flip выключены — они загибали страницу при прокрутке и листали сами.
// Там касание страницы листает вперёд (левый край — назад), свайп вбок листает, вертикаль — прокрутка.
// Режим showCover у page-flip рассчитан на жёсткую (картонную) обложку и ломает перелистывание назад
// на бумажную, а жёсткая при наведении даёт серую полосу. Поэтому перед обложкой стоит пустая
// прозрачная страница: обложка — обычная бумажная страница справа, листается штатно в обе стороны.
// Индексы page-flip: 0 — пустая, 1 — обложка, n — n-я страница превью; на экране номер = индекс.
// Появление: книжка всплывает, стоит на обложке, чтобы её успели рассмотреть, и сама открывается.
// Если человек уже навёл мышь, коснулся или перелистнул сам — автоматически не открываем.
// При листании назад на обложку page-flip кладёт «нижнюю» страницу (нашу пустую) поверх оглавления —
// прозрачная его не закрывает. На время такого листания пустая страница красится фоном панели
// (тот же градиент, совмещённый с панелью), в закрытой книге она снова прозрачная.
// появление книжки (0,9 с) + остановка на обложке, чтобы её рассмотрели
const AUTO_OPEN_DELAY = 900 + 2600;

function Flipbook({ pages, total, onBuy, onRead }) {
  const hostRef = useRef(null);
  const rootRef = useRef(null);
  const bookRef = useRef(null);
  const placed = useRef(false);
  const engagedRef = useRef(false); // человек сам взялся за книжку — автооткрытие отменяется
  const buyRef = useRef(onBuy);
  buyRef.current = onBuy;
  const [touchUI] = useState(() => window.matchMedia("(hover: none), (pointer: coarse)").matches);
  const [page, setPage] = useState(0);
  const [count, setCount] = useState(pages.length + 1);
  const [geom, setGeom] = useState(null);
  const [leaving, setLeaving] = useState(false);
  const [noticed, setNoticed] = useState(false);
  const [coverLoaded, setCoverLoaded] = useState(false);
  const pagesKey = pages.join("|");

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    let flip = null;
    let cancelled = false;
    let autoTimer = 0;
    let io = null;
    const root = document.createElement("div");
    root.className = "flipbook-root";
    host.appendChild(root);
    rootRef.current = root;
    placed.current = false;
    setPage(0);
    setLeaving(false);
    setNoticed(false);
    setCoverLoaded(false);
    engagedRef.current = false;

    const blank = document.createElement("div");
    blank.className = "flip-page flip-blank";
    root.appendChild(blank);
    pages.forEach((src, i) => {
      const el = document.createElement("div");
      el.className = i === 0 ? "flip-page is-cover" : "flip-page";
      const img = document.createElement("img");
      img.src = assetUrl(src);
      img.alt = "";
      img.draggable = false;
      el.appendChild(img);
      if (i === 0) {
        const hint = document.createElement("div");
        hint.className = "flip-corner";
        hint.setAttribute("aria-hidden", "true");
        hint.innerHTML = '<span class="flip-corner__glow"></span><span class="flip-corner__curl"></span>';
        el.appendChild(hint);
      }
      root.appendChild(el);
    });
    const rest = Math.max(0, (total || 0) - pages.length);
    const end = document.createElement("div");
    end.className = "flip-page flip-end";
    end.innerHTML = `<div class="flip-end__in"><span>Это превью</span><strong>Дальше ещё ${rest} ${plural(rest, "страница", "страницы", "страниц")}</strong><p>Полная версия в PDF придёт на почту после оплаты.</p><button type="button">Купить пособие</button></div>`;
    end.querySelector("button").addEventListener("click", (event) => {
      event.stopPropagation();
      buyRef.current?.();
    });
    root.appendChild(end);

    const measure = () => {
      if (!flip) return;
      const r = flip.getBoundsRect();
      if (!r || !r.pageWidth) return;
      setGeom({ pw: r.pageWidth, landscape: flip.getOrientation() === "landscape" });
    };
    const onResize = () => requestAnimationFrame(measure);

    // мышь пришла на книжку — дальше подсказывают родные загибы уголков page-flip
    const onPointerEnter = (event) => {
      if (event.pointerType === "mouse") {
        setNoticed(true);
        engagedRef.current = true;
      }
    };
    host.addEventListener("pointerenter", onPointerEnter);

    // телефон: свои жесты поверх page-flip (его обработчики выключены)
    const next = () => {
      if (!flip || flip.getState() !== "read") return;
      if (flip.getCurrentPageIndex() <= 1) setLeaving(true);
      flip.flipNext("bottom");
    };
    const prev = () => {
      if (flip && flip.getState() === "read" && flip.getCurrentPageIndex() > 1) flip.flipPrev("bottom");
    };
    let touch = null;
    const onTouchStart = (event) => {
      engagedRef.current = true;
      const t = event.touches[0];
      touch = event.touches.length === 1 ? { x: t.clientX, y: t.clientY, time: Date.now() } : null;
    };
    const onTouchEnd = (event) => {
      if (!touch || !flip) return;
      const t = event.changedTouches[0];
      const dx = t.clientX - touch.x;
      const dy = t.clientY - touch.y;
      const dt = Date.now() - touch.time;
      touch = null;
      if (event.target.closest("button")) return; // «Купить пособие» на последней странице
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 800) {
        if (dx < 0) next();
        else prev();
        return;
      }
      if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 500) {
        const box = host.getBoundingClientRect();
        if (t.clientX - box.left < box.width * 0.3 && flip.getCurrentPageIndex() > 1) prev();
        else next();
      }
    };
    if (touchUI) {
      host.addEventListener("touchstart", onTouchStart, { passive: true });
      host.addEventListener("touchend", onTouchEnd, { passive: true });
    }

    import("page-flip").then(({ PageFlip }) => {
      if (cancelled) return;
      flip = new PageFlip(root, {
        width: 420,
        height: 594,
        size: "stretch",
        minWidth: 220,
        maxWidth: 560,
        minHeight: 311,
        maxHeight: 792,
        showCover: false,
        usePortrait: true,
        // на узком экране страницы идут по одной — начинаем с обложки, а не с пустой страницы
        startPage: host.clientWidth < 440 ? 1 : 0,
        mobileScrollSupport: true,
        useMouseEvents: !touchUI,
        showPageCorners: !touchUI,
        maxShadowOpacity: 0.32,
        flippingTime: 750,
      });
      flip.loadFromHTML(root.querySelectorAll(".flip-page"));
      setCount(flip.getPageCount() - 1);
      setPage(flip.getCurrentPageIndex());
      let quiet = false;
      flip.on("flip", (event) => {
        setPage(event.data);
        setLeaving(false);
        if (!quiet) setNoticed(true);
      });
      flip.on("changeState", (event) => {
        const idx = flip.getCurrentPageIndex();
        if (event.data === "read") delete host.dataset.turn;
        else if (idx === 2 && !host.dataset.turn) {
          const panel = (host.closest(".guide-book") || host).getBoundingClientRect();
          const block = root.querySelector(".stf__block")?.getBoundingClientRect();
          const r = flip.getBoundsRect();
          if (block && r) {
            host.style.setProperty("--blank-x", `${Math.round(panel.left - block.left - r.left)}px`);
            host.style.setProperty("--blank-y", `${Math.round(panel.top - block.top - r.top)}px`);
            host.style.setProperty("--panel-w", `${Math.round(panel.width)}px`);
            host.style.setProperty("--panel-h", `${Math.round(panel.height)}px`);
            host.dataset.turn = "back";
          }
        }
        // обложку открывают — книга одновременно съезжает в разворот
        if (event.data === "flipping" && idx <= 1) setLeaving(true);
        if (event.data === "read" && idx <= 1) setLeaving(false);
      });
      flip.on("changeOrientation", () => {
        // стал узкий экран, а открыта пустая страница — переходим на обложку без анимации
        if (flip.getOrientation() === "portrait" && flip.getCurrentPageIndex() === 0) {
          quiet = true;
          flip.turnToPage(1);
          quiet = false;
        }
        requestAnimationFrame(measure);
      });
      bookRef.current = flip;
      requestAnimationFrame(measure);

      // обложка загрузилась → книжка появляется; как только она на экране — пауза и открытие
      const coverImg = root.querySelector(".is-cover img");
      const coverReady = new Promise((resolve) => {
        if (!coverImg || (coverImg.complete && coverImg.naturalWidth)) resolve();
        else {
          coverImg.addEventListener("load", resolve, { once: true });
          coverImg.addEventListener("error", resolve, { once: true });
        }
      });
      coverReady.then(() => {
        if (cancelled) return;
        setCoverLoaded(true);
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || !("IntersectionObserver" in window)) return;
        io = new IntersectionObserver(
          (entries) => {
            if (!entries.some((entry) => entry.isIntersecting)) return;
            io.disconnect();
            io = null;
            autoTimer = window.setTimeout(() => {
              if (cancelled || engagedRef.current || document.hidden || !flip) return;
              if (flip.getCurrentPageIndex() > 1 || flip.getState() !== "read") return;
              next();
            }, AUTO_OPEN_DELAY);
          },
          { threshold: 0.6 },
        );
        io.observe(host);
      });
    });
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.clearTimeout(autoTimer);
      io?.disconnect();
      window.removeEventListener("resize", onResize);
      host.removeEventListener("pointerenter", onPointerEnter);
      host.removeEventListener("touchstart", onTouchStart);
      host.removeEventListener("touchend", onTouchEnd);
      try {
        flip?.destroy();
      } catch {
        /* уже удалено */
      }
      if (root.parentNode) root.parentNode.removeChild(root);
      rootRef.current = null;
      bookRef.current = null;
    };
  }, [pagesKey, total, touchUI]);

  // Закрытая книга в развороте занимает только правую половину — сдвигаем её к центру.
  const closed = page <= 1 && !leaving;
  const shown = Math.max(page, 1); // номер страницы на экране (0 — пустая страница перед обложкой)
  const pageTotal = count + 1;
  const lastIndex = geom?.landscape ? (pageTotal % 2 === 0 ? pageTotal - 2 : pageTotal - 1) : pageTotal - 1;
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !geom) return;
    const shift = geom.landscape && closed ? -geom.pw / 2 : 0;
    const value = shift ? `translateX(${shift}px)` : "";
    if (!placed.current) {
      // первое положение — без анимации, чтобы книга не «приезжала» при открытии страницы
      root.style.transition = "none";
      root.style.transform = value;
      void root.offsetWidth;
      root.style.transition = "";
      placed.current = true;
    } else {
      root.style.transform = value;
    }
  }, [geom, closed]);

  // стрелки: пока страница переворачивается, второй клик не листает дальше
  const openBook = () => {
    const book = bookRef.current;
    engagedRef.current = true;
    if (!book || book.getState() !== "read") return;
    if (closed) setLeaving(true);
    book.flipNext();
  };
  const goBack = () => {
    const book = bookRef.current;
    engagedRef.current = true;
    if (!book || book.getState() !== "read" || page <= 1) return;
    book.flipPrev();
  };

  const hint = closed
    ? touchUI
      ? "Нажмите на обложку, чтобы открыть"
      : "Нажмите на обложку или потяните за уголок — книга откроется"
    : touchUI
      ? "Листайте касанием или свайпом"
      : "Потяните за уголок страницы или нажмите на стрелки";

  return (
    <div className={`flipbook${closed ? " is-closed" : ""}${closed && !noticed ? " show-hint" : ""}${geom && coverLoaded ? " is-ready" : ""}`}>
      <div className="flipbook-host" ref={hostRef} />
      <div className="flipbook-nav">
        <button type="button" onClick={goBack} aria-label="Назад" disabled={page <= 1}>
          <CaretLeft size={20} weight="bold" />
        </button>
        <span>
          {shown} / {count}
        </span>
        <button type="button" onClick={openBook} aria-label="Вперёд" disabled={page >= lastIndex}>
          <CaretRight size={20} weight="bold" />
        </button>
        {onRead && (
          <button className="flipbook-read" type="button" onClick={() => {
              engagedRef.current = true;
              onRead(Math.min(shown - 1, pages.length - 1));
            }}>
            <MagnifyingGlassPlus size={18} weight="bold" />
            Читать крупно
          </button>
        )}
      </div>
      <p className="flipbook-hint">{hint}</p>
    </div>
  );
}

function GuideCard({ product, go }) {
  return (
    <button className="guide-card reveal" type="button" onClick={() => go(`product/${product.id}`)}>
      <span className="guide-card__book">
        <img src={assetUrl(product.image)} alt={product.name} />
      </span>
      <span className="guide-card__meta">
        <strong>{product.name.replace(/^Пособие\s*/, "")}</strong>
        <small>
          {product.guide?.pages} стр. · PDF
        </small>
        <em>{formatRub(product.price)}</em>
      </span>
      <span className="guide-card__cta">
        Листать превью
        <ArrowRight size={15} weight="bold" />
      </span>
    </button>
  );
}

function GuidesShowcase({ products, go }) {
  if (!products.length) return null;
  return (
    <section className="guides-band reveal" aria-label="Пособия по выращиванию">
      <div className="section-head center">
        <p className="eyebrow">Пособия по выращиванию</p>
        <h2 className="section-title">Растите, как в питомнике</h2>
        <p>Пошаговые руководства от Анны: посадка, полив, подкормки, обрезка и защита от вредителей. Электронная книга в PDF.</p>
      </div>
      <div className="guides-row">
        {products.map((product) => (
          <GuideCard key={product.id} product={product} go={go} />
        ))}
      </div>
    </section>
  );
}

// Режим «Читать крупно»: превью-страницы в высоком разрешении одна под другой, как в PDF.
// В книжке на странице A4 видна целиком, но текст мелкий — здесь страница шириной до 860 px.
function GuideReader({ product, start = 0, onClose, onBuy }) {
  const guide = product.guide || {};
  const pages = guide.previewHd?.length ? guide.previewHd : guide.preview || [];
  const rest = Math.max(0, (guide.pages || 0) - pages.length);
  const scrollRef = useRef(null);
  const closeBtnRef = useRef(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event) => {
      if (event.key === "Escape") closeRef.current?.();
    };
    window.addEventListener("keydown", onKey);
    closeBtnRef.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // открываем на той странице, где читатель был в книжке
  useEffect(() => {
    const box = scrollRef.current;
    const el = box?.querySelector(`[data-page="${start}"]`);
    if (box && el && start > 0) box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 12;
  }, [start]);

  const closeOnBackdrop = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="guide-reader" role="dialog" aria-modal="true" aria-label={`${product.name} — превью`}>
      <div className="guide-reader__bar">
        <div className="guide-reader__title">
          <strong>{product.name}</strong>
          <span>
            Превью: {pages.length} из {guide.pages} стр.
          </span>
        </div>
        <button className="primary-button" type="button" onClick={onBuy}>
          Купить · {formatRub(product.price)}
        </button>
        <button className="guide-reader__close" ref={closeBtnRef} type="button" onClick={onClose} aria-label="Закрыть">
          <X size={22} weight="bold" />
        </button>
      </div>
      <div className="guide-reader__scroll" ref={scrollRef} onClick={closeOnBackdrop}>
        {pages.map((src, index) => (
          <img key={src} data-page={index} src={assetUrl(src)} alt={`Страница ${index + 1}`} loading={Math.abs(index - start) < 2 ? "eager" : "lazy"} />
        ))}
        <div className="guide-reader__end">
          <span>Это превью</span>
          <strong>
            Дальше ещё {rest} {plural(rest, "страница", "страницы", "страниц")}
          </strong>
          <p>Полная версия в PDF придёт на почту после оплаты.</p>
          <button type="button" onClick={onBuy}>
            Купить пособие
          </button>
        </div>
      </div>
    </div>
  );
}

function GuideExperience({ product, data, go, addToCart }) {
  const guide = product.guide || {};
  const others = data.products.filter((item) => item.kind === "guide" && item.id !== product.id);
  const [reading, setReading] = useState(null); // индекс страницы или null
  useEffect(() => setReading(null), [product.id]);
  const buy = () => {
    setReading(null);
    addToCart(product);
  };

  return (
    <>
      <section className="guide-page">
        <div className="guide-book">
          <Flipbook pages={guide.preview || [product.image]} total={guide.pages} onBuy={buy} onRead={guide.preview?.length ? setReading : undefined} />
        </div>
        <div className="guide-copy">
          <button className="back-link" type="button" onClick={() => go("catalog")}>
            Каталог
          </button>
          <p className="eyebrow">Электронное пособие · PDF</p>
          <h1>{product.name}</h1>
          <p className="guide-lead">{product.description}</p>
          <div className="guide-facts">
            <article>
              <span>Страниц</span>
              <strong>{guide.pages}</strong>
            </article>
            <article>
              <span>Формат</span>
              <strong>PDF, читается с телефона</strong>
            </article>
            <article>
              <span>Как получить</span>
              <strong>на почту после оплаты</strong>
            </article>
            <article>
              <span>Фото</span>
              <strong>растения нашего питомника</strong>
            </article>
          </div>
          <div className="detail-price">
            <strong>{formatRub(product.price)}</strong>
            <span>оплата после подтверждения заказа</span>
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={buy}>
              Купить пособие
              <Plus size={18} weight="bold" />
            </button>
          </div>
          {guide.chapters?.length > 0 && (
            <div className="guide-toc">
              <p className="eyebrow">Что внутри</p>
              <ol>
                {guide.chapters.map((title, index) => (
                  <li key={title}>
                    <span>{String(index + 1).padStart(2, "0")}</span>
                    {title}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </div>
      </section>

      {others.length > 0 && (
        <>
          <section className="section-head">
            <p className="eyebrow">Другие пособия</p>
            <h2>Ещё руководства</h2>
          </section>
          <section className="guides-row guides-row--compact">
            {others.map((item) => (
              <GuideCard key={item.id} product={item} go={go} />
            ))}
          </section>
        </>
      )}

      {reading !== null && <GuideReader product={product} start={reading} onClose={() => setReading(null)} onBuy={buy} />}
    </>
  );
}

function LuxuryProductCard({ product, go, addToCart, openLightbox, index = 0, feature = false }) {
  const isVariable = !!product.variants?.length;
  const isGuide = product.kind === "guide";
  const openImage = () => (product.kind ? go(`product/${product.id}`) : openLightbox(product));
  return (
    <article
      className={`luxury-card elev reveal ${product.status}${feature ? " is-feature" : ""}${product.kind ? ` kind-${product.kind}` : ""}`}
      style={{ "--i": index % 4 }}
    >
      <button className="luxury-image" type="button" onClick={openImage}>
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <Leaf size={44} weight="duotone" />}
        <span>{product.category}</span>
        <em>
          <MagnifyingGlass size={15} weight="duotone" />
          {isGuide ? "листать" : "фото"}
        </em>
      </button>
      <div className="luxury-body">
        <button className="text-link" type="button" onClick={() => go(`product/${product.id}`)}>
          <h3>{product.name}</h3>
        </button>
        <p>{product.description}</p>
        <div className="product-meta">
          <strong>
            {isVariable ? `от ${formatRub(product.price)}` : formatRub(product.price)}
            {product.oldPrice > product.price && <s className="old-price">{formatRub(product.oldPrice)}</s>}
          </strong>
          <span>{stockLabel(product)}</span>
        </div>
        <div className="card-actions">
          <button
            type="button"
            onClick={() => (isVariable ? go(`product/${product.id}`) : addToCart(product))}
            disabled={product.stock === 0}
          >
            {product.stock === 0 ? "Нет в наличии" : isVariable ? "Выбрать размер" : isGuide ? "Купить" : "В корзину"}
          </button>
          <button type="button" onClick={() => go(`product/${product.id}`)}>
            Подробнее
          </button>
        </div>
      </div>
    </article>
  );
}

function careName(key) {
  return {
    height: "Высота",
    bloom: "Цветение",
    light: "Свет",
    hardiness: "Зимостойкость",
  }[key] || key;
}

function StorefrontApp({ data, go }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const availableProducts = useMemo(
    () => data.products.filter((product) => product.stock > 0),
    [data.products],
  );

  const featured = useMemo(() => {
    const priority = ["hydrangea", "shrubs", "annuals", "perennials"];
    return priority
      .flatMap((key) => availableProducts.filter((product) => product.categoryKey === key))
      .slice(0, 8);
  }, [availableProducts]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.products.filter((product) => {
      const matchesCategory = activeCategory === "all" || product.categoryKey === activeCategory;
      const matchesQuery =
        !needle ||
        product.name.toLowerCase().includes(needle) ||
        product.description.toLowerCase().includes(needle);
      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, data.products, query]);

  const heroProduct = featured[0] || data.products[0];
  const heroImages = data.heroImages
    .map((image) => assetUrl(image))
    .filter(Boolean)
    .slice(0, 5);

  const addToCart = (product) => {
    if (product.stock === 0) return;
    setCart((items) => {
      const existing = items.find((item) => item.id === product.id);
      if (existing) {
        return items.map((item) =>
          item.id === product.id ? { ...item, qty: Math.min(item.qty + 1, product.stock) } : item,
        );
      }
      return [...items, { ...product, qty: 1 }];
    });
    setDrawerOpen(true);
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

  return (
    <main className="site-shell">
      <header className="site-header">
        <a className="brand" href="#/shop" aria-label="Анюткин сад">
          <span className="brand-mark">
            <Leaf size={19} weight="fill" />
          </span>
          <span>
            <strong>Анюткин сад</strong>
            <small>цветочное хозяйство</small>
          </span>
        </a>
        <nav className="top-nav" aria-label="Основная навигация">
          <a href="#catalog">Каталог</a>
          <a href="#delivery">Доставка</a>
          <a href="#care">Уход</a>
          <a href="#contacts">Контакты</a>
        </nav>
        <div className="header-actions">
          <button className="soft-button" type="button" onClick={() => go("admin")}>
            <Storefront size={17} weight="duotone" />
            Админка
          </button>
          <button className="icon-button" type="button" onClick={() => setDrawerOpen(true)} aria-label="Корзина">
            <Basket size={20} weight="duotone" />
            {cartCount > 0 && <span>{cartCount}</span>}
          </button>
        </div>
      </header>

      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">
            <Sparkle size={16} weight="fill" />
            Доставка растений по России с апреля по октябрь
          </p>
          <h1>Анюткин сад</h1>
          <p className="hero-lede">
            Декоративные растения, гортензии, кустарники и сезонная рассада из частного цветочного
            хозяйства. В каталоге сохранены реальные товары, цены и остатки текущего ассортимента.
          </p>
          <div className="hero-actions">
            <a className="primary-button" href="#catalog">
              Смотреть каталог
              <ArrowRight size={18} weight="bold" />
            </a>
            <button className="round-link" type="button" onClick={() => addToCart(heroProduct)}>
              <Plus size={18} weight="bold" />
              Добавить хит
            </button>
          </div>
          <div className="rating-row" aria-label="Преимущества">
            <span>89 позиций</span>
            <span>5 категорий</span>
            <span>СДЭК и самовывоз в Москве</span>
          </div>
        </div>
        <div className="hero-media" aria-label="Подборка растений">
          <div className="hero-main-photo">
            <img src={assetUrl(heroProduct.image)} alt={heroProduct.name} />
            <div className="hero-price">
              <span>{heroProduct.name}</span>
              <strong>{formatRub(heroProduct.price)}</strong>
            </div>
          </div>
          <div className="photo-orbit">
            {heroImages.slice(1).map((image, index) => (
              <img key={image} src={image} alt="" className={`orbit-photo orbit-${index + 1}`} />
            ))}
          </div>
        </div>
      </section>

      <section className="benefit-strip" id="delivery">
        {[
          ["Свежая выкопка", "Подбираем растения под дату отправки", Plant],
          ["СДЭК", "ПВЗ, курьер, контроль упаковки", Truck],
          ["Актуальное наличие", "В наличии и под заказ", Package],
          ["Самовывоз", "Москва, Одинцово, Дорохово", MapPin],
        ].map(([title, text, Icon]) => (
          <article key={title}>
            <Icon size={22} weight="duotone" />
            <strong>{title}</strong>
            <span>{text}</span>
          </article>
        ))}
      </section>

      <section className="section-head" id="catalog">
        <p className="eyebrow">Каталог</p>
        <h2>Растения для сада и сезона</h2>
        <p>
          Быстрый выбор по категориям, остаткам и названию. Кнопки и корзина работают как
          в обычном интернет-магазине.
        </p>
      </section>

      <section className="catalog-toolbar" aria-label="Фильтры каталога">
        <div className="search-field">
          <MagnifyingGlass size={18} weight="duotone" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Найти гортензию, шалфей, хризантему"
          />
        </div>
        <div className="chip-row">
          <button
            className={activeCategory === "all" ? "chip active" : "chip"}
            type="button"
            onClick={() => setActiveCategory("all")}
          >
            Все
          </button>
          {data.categories.map((category) => (
            <button
              className={activeCategory === category.key ? "chip active" : "chip"}
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
            >
              {category.name}
              <span>{category.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="product-rail">
        {featured.slice(0, 6).map((product) => (
          <article className="rail-item" key={product.id}>
            <img src={assetUrl(product.image)} alt={product.name} />
            <strong>{product.name}</strong>
            <span>{formatRub(product.price)}</span>
          </article>
        ))}
      </section>

      <section className="promo-band">
        <div>
          <p className="script">Сезонная подборка</p>
          <h2>Гортензии и кустарники для посадки</h2>
          <p>Подберите растения для посадки: гортензии, кустарники, многолетники и сезонные цветы с отправкой СДЭК.</p>
        </div>
        <a className="primary-button alt" href="#catalog">
          Смотреть растения
          <ArrowRight size={18} weight="bold" />
        </a>
      </section>

      <section className="product-grid" aria-live="polite">
        {filtered.slice(0, 24).map((product) => (
          <ProductCard key={product.id} product={product} addToCart={addToCart} />
        ))}
      </section>

      <section className="care-section" id="care">
        <div className="section-head">
          <p className="eyebrow">Почему удобно</p>
          <h2>Растения проще выбрать и получить</h2>
          <p>В карточках указаны фото, цена, наличие и основные характеристики растения.</p>
        </div>
        <div className="care-layout">
          <div className="care-point">
            <strong>01</strong>
            <h3>Реальные остатки</h3>
            <p>Товары с малым количеством подсвечиваются, нет в наличии не добавляется в корзину.</p>
          </div>
          <div className="care-photo">
            <img src={assetUrl(featured[2]?.image || heroProduct.image)} alt="" />
          </div>
          <div className="care-point">
            <strong>02</strong>
            <h3>Доставка СДЭК</h3>
            <p>Перед отправкой согласуем способ доставки, дату передачи и упаковку под состояние растения.</p>
          </div>
        </div>
      </section>

      <section className="admin-preview" id="admin-preview">
        <div>
          <p className="eyebrow">Для владельца</p>
          <h2>Кабинет заказов и остатков</h2>
          <p>
            На первом экране видны продажи, заказы, товары с риском закончиться и очередь отправок.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={() => go("admin")}>
          Открыть кабинет
          <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <footer className="site-footer" id="contacts">
        <div>
          <a className="brand" href="#/shop">
            <span className="brand-mark">
              <Leaf size={18} weight="fill" />
            </span>
            <span>
              <strong>Анюткин сад</strong>
              <small>цветочное хозяйство</small>
            </span>
          </a>
          <p>Продажа декоративных растений с доставкой по России напрямую из хозяйства.</p>
        </div>
        <div>
          <strong>Контакты</strong>
          <span>+7 (912) 706-30-40</span>
          <span>Anytkin.sad@mail.ru</span>
        </div>
        <div>
          <strong>Адрес</strong>
          <span>Московская область</span>
          <span>дп. Лесной городок</span>
        </div>
      </footer>

      <CartDrawer
        cart={cart}
        cartTotal={cartTotal}
        open={drawerOpen}
        setCart={setCart}
        setOpen={setDrawerOpen}
      />
    </main>
  );
}

function ProductCard({ product, addToCart }) {
  return (
    <article className={`product-card ${product.status}`}>
      <div className="product-image">
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <Leaf size={44} weight="duotone" />}
        <span>{product.category}</span>
      </div>
      <div className="product-body">
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <div className="product-meta">
          <strong>{formatRub(product.price)}</strong>
          <span>{stockLabel(product)}</span>
        </div>
        <button type="button" onClick={() => addToCart(product)} disabled={product.stock === 0}>
          {product.stock === 0 ? "Нет в наличии" : "В корзину"}
          {product.stock > 0 && <Plus size={17} weight="bold" />}
        </button>
      </div>
    </article>
  );
}

function CartDrawer({ cart, cartTotal, open, setCart, setOpen }) {
  const updateQty = (key, delta) => {
    setCart((items) =>
      items
        .map((item) => ((item.lineKey ?? item.id) === key ? { ...item, qty: Math.max(0, Math.min(item.stock, item.qty + delta)) } : item))
        .filter((item) => item.qty > 0),
    );
  };

  // Демо на GitHub Pages: оформление показываем в самой корзине — те же поля, что в кассе Woo.
  const [step, setStep] = useState("cart"); // cart | form | done
  const [form, setForm] = useState({ name: "", phone: "", email: "", comment: "" });
  const [formError, setFormError] = useState("");
  const [done, setDone] = useState(null);
  const hasGuide = cart.some((item) => item.kind === "guide");
  const hasGoods = cart.some((item) => item.kind !== "guide");

  useEffect(() => {
    if (!open && step === "done") setStep("cart");
  }, [open, step]);

  // На WordPress (window.ANUTKIN_WOO) — переносим корзину в нативный Woo и идём в его checkout
  // (СДЭК + самовывоз + оплата при получении). На GitHub-демо — демо-оформление в корзине.
  // Формат: ID:QTY  или  ID:QTY:VARID (выбранная вариация — размер/объём).
  const checkout = () => {
    const W = typeof window !== "undefined" ? window.ANUTKIN_WOO : null;
    if (!cart.length) return;
    if (!W) {
      setFormError("");
      setStep("form");
      return;
    }
    const items = cart
      .map((item) => (item.variantId ? `${item.id}:${item.qty}:${item.variantId}` : `${item.id}:${item.qty}`))
      .join(",");
    window.location.href = `${W.home}?anutkin_co=${encodeURIComponent(items)}`;
  };

  const submitDemo = (event) => {
    event.preventDefault();
    const digits = form.phone.replace(/\D/g, "");
    if (!form.name.trim()) return setFormError("Укажите имя");
    if (digits.length < 10) return setFormError("Укажите телефон");
    if (hasGuide && !/\S+@\S+\.\S+/.test(form.email)) return setFormError("Для пособия нужна почта — на неё придёт PDF");
    setDone({ email: form.email.trim(), hasGuide, hasGoods, total: cartTotal });
    setCart([]);
    setStep("done");
  };

  const field = (key) => ({
    value: form[key],
    onChange: (event) => {
      setFormError("");
      setForm((value) => ({ ...value, [key]: event.target.value }));
    },
  });

  const headTitle = step === "form" ? "Оформление" : step === "done" ? "Заявка принята" : "Корзина";
  const headSub =
    step === "form"
      ? "заполните контакты"
      : step === "done"
        ? "спасибо!"
        : cart.length
          ? `${cart.length} ${plural(cart.length, "позиция", "позиции", "позиций")}`
          : "пока пусто";

  return (
    <aside className={open ? "cart-drawer open" : "cart-drawer"} aria-hidden={!open}>
      <div className="drawer-panel">
        <header>
          <div>
            <span>{headTitle}</span>
            <strong>{headSub}</strong>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
            <X size={20} weight="bold" />
          </button>
        </header>
        {step === "form" && (
          <form className="demo-checkout" onSubmit={submitDemo} noValidate>
            <label>
              <span>Имя *</span>
              <input {...field("name")} placeholder="Как к вам обращаться" autoComplete="name" />
            </label>
            <label>
              <span>Телефон *</span>
              <input {...field("phone")} type="tel" inputMode="tel" placeholder="+7 (___) ___-__-__" autoComplete="tel" />
            </label>
            <label>
              <span>Email {hasGuide ? "*" : ""}</span>
              <input
                {...field("email")}
                type="email"
                inputMode="email"
                placeholder={hasGuide ? "На неё придёт пособие" : "Для подтверждения заказа"}
                autoComplete="email"
              />
            </label>
            <label>
              <span>Комментарий</span>
              <textarea {...field("comment")} rows={3} placeholder="Город, удобный способ связи, СДЭК или самовывоз" />
            </label>
            <div className="demo-checkout__note">
              {hasGoods && <p>Растения: соберём заказ, свяжемся с вами и пришлём итоговый счёт. Оплата при получении.</p>}
              {hasGuide && <p>Пособие: пришлём реквизиты, после оплаты PDF придёт на почту.</p>}
            </div>
            {formError && <p className="demo-checkout__error">{formError}</p>}
            <div className="demo-checkout__total">
              <span>Итого</span>
              <strong>{formatRub(cartTotal)}</strong>
            </div>
            <button className="primary-button" type="submit">
              Отправить заявку
              <ArrowRight size={18} weight="bold" />
            </button>
            <button className="demo-checkout__back" type="button" onClick={() => setStep("cart")}>
              ← вернуться в корзину
            </button>
          </form>
        )}
        {step === "done" && done && (
          <div className="demo-done">
            <CheckCircle size={48} weight="duotone" />
            <h3>{form.name.trim() ? `${form.name.trim()}, спасибо за заявку!` : "Спасибо за заявку!"}</h3>
            {done.hasGoods && <p>Анна соберёт растения, свяжется с вами и пришлёт итоговый счёт.</p>}
            {done.hasGuide && (
              <p>
                По пособию пришлём реквизиты для оплаты. После оплаты PDF придёт на <b>{done.email}</b>.
              </p>
            )}
            <small>Это демо-версия сайта: заявка никуда не отправляется.</small>
            <button className="primary-button" type="button" onClick={() => setOpen(false)}>
              Вернуться в магазин
            </button>
          </div>
        )}
        {step === "cart" && (
        <>
        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-state">Добавьте растения из каталога, чтобы оформить заказ.</p>
          ) : (
            cart.map((item) => (
              <article key={item.lineKey ?? item.id}>
                <img src={assetUrl(item.image)} alt="" />
                <div>
                  <strong>{item.name}{item.variantLabel ? <em className="cart-variant"> · {item.variantLabel}</em> : null}</strong>
                  <span>{formatRub(item.price)}</span>
                  <div className="qty-control">
                    <button type="button" onClick={() => updateQty(item.lineKey ?? item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.lineKey ?? item.id, 1)}>+</button>
                  </div>
                </div>
              </article>
            ))
          )}
        </div>
        <footer>
          <div>
            <span>Итого</span>
            <strong>{formatRub(cartTotal)}</strong>
          </div>
          <button className="primary-button" type="button" disabled={!cart.length} onClick={checkout}>
            Оформить заказ
            <ArrowRight size={18} weight="bold" />
          </button>
        </footer>
        </>
        )}
      </div>
      <button className="drawer-backdrop" type="button" onClick={() => setOpen(false)} aria-label="Закрыть корзину" />
    </aside>
  );
}

function AdminApp({ data, go }) {
  const [tab, setTab] = useState("overview");
  const [query, setQuery] = useState("");

  const lowStock = useMemo(
    () => data.products.filter((product) => product.status !== "ok").slice(0, 14),
    [data.products],
  );

  const filteredProducts = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return data.products
      .filter((product) => !needle || product.name.toLowerCase().includes(needle))
      .slice(0, 16);
  }, [data.products, query]);

  const tabs = [
    ["overview", "Обзор", House],
    ["orders", "Заказы", ShoppingBagOpen],
    ["stock", "Остатки", Package],
    ["sales", "Продажи", ChartLineUp],
    ["delivery", "СДЭК", Truck],
  ];

  return (
    <main className="admin-shell">
      <aside className="admin-sidebar">
        <button className="admin-brand" type="button" onClick={() => go("shop")}>
          <span className="brand-mark">
            <Leaf size={18} weight="fill" />
          </span>
          <span>
            <strong>Анюткин сад</strong>
            <small>панель управления</small>
          </span>
        </button>
        <nav aria-label="Разделы админки">
          {tabs.map(([key, label, Icon]) => (
            <button className={tab === key ? "active" : ""} key={key} type="button" onClick={() => setTab(key)}>
              <Icon size={20} weight="duotone" />
              {label}
            </button>
          ))}
        </nav>
        <button className="soft-button" type="button" onClick={() => go("shop")}>
          <Storefront size={17} weight="duotone" />
          В магазин
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">Рабочая панель</p>
            <h1>{adminTitle(tab)}</h1>
          </div>
          <div className="admin-actions">
            <div className="admin-search">
              <MagnifyingGlass size={18} weight="duotone" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Найти товар" />
            </div>
            <button className="icon-button" type="button" aria-label="Уведомления">
              <Bell size={20} weight="duotone" />
              <span>{data.metrics.stockAlerts}</span>
            </button>
          </div>
        </header>

        {tab === "overview" && (
          <Overview data={data} lowStock={lowStock} setTab={setTab} />
        )}
        {tab === "orders" && <Orders orders={data.orders} />}
        {tab === "stock" && <Stock products={filteredProducts} lowStock={lowStock} />}
        {tab === "sales" && <Sales data={data} />}
        {tab === "delivery" && <Delivery orders={data.orders} />}
      </section>

      <nav className="mobile-admin-tabs" aria-label="Мобильные разделы админки">
        {tabs.map(([key, label, Icon]) => (
          <button className={tab === key ? "active" : ""} key={key} type="button" onClick={() => setTab(key)}>
            <Icon size={20} weight="duotone" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
    </main>
  );
}

function adminTitle(tab) {
  return {
    overview: "Панель управления",
    orders: "Заказы",
    stock: "Остатки и товары",
    sales: "Продажи",
    delivery: "Доставка СДЭК",
  }[tab];
}

function Overview({ data, lowStock, setTab }) {
  const cards = [
    ["Продажи месяца", compactRub(data.metrics.revenueMonth), "+18% к прошлому", CurrencyRub],
    ["Заказы сегодня", data.metrics.ordersToday, "6 ждут сборки", ShoppingBagOpen],
    ["Риски по остаткам", data.metrics.stockAlerts, "проверить закупку", WarningCircle],
    ["Очередь СДЭК", data.metrics.deliveryQueue, "4 этикетки готовы", Truck],
  ];
  const commandCards = [
    ["Утренний сценарий", "Собрать 6 заказов, распечатать СДЭК и списать растения одним проходом.", "Запустить сборку", Truck],
    ["Контроль остатков", `Поднять в каталоге ${lowStock[0]?.name || "товар с низким остатком"} и убрать из рекламы позиции с риском.`, "Обновить план", Sparkle],
    ["Промо недели", `Сделать подборку из ${data.products.length} растений с автоскидкой для постоянных покупателей.`, "Подготовить подборку", Package],
  ];

  return (
    <>
      <section className="ops-command-strip" aria-label="Приоритеты дня">
        {commandCards.map(([label, text, action, Icon]) => (
          <article className="ops-command-card" key={label}>
            <Icon size={24} weight="duotone" />
            <div>
              <span>{label}</span>
              <strong>{text}</strong>
            </div>
            <button type="button">{action}</button>
          </article>
        ))}
      </section>

      <section className="metrics-grid">
        {cards.map(([label, value, note, Icon]) => (
          <article className="metric-card" key={label}>
            <Icon size={24} weight="duotone" />
            <span>{label}</span>
            <strong>{value}</strong>
            <small>{note}</small>
          </article>
        ))}
      </section>

      <section className="admin-grid">
        <article className="panel wide">
          <PanelTitle icon={ChartLineUp} title="Продажи по неделе" action="Экспорт" />
          <div className="sales-chart" aria-label="График продаж">
            {[42, 58, 51, 76, 63, 92, 84].map((height, index) => (
              <span key={index} style={{ height: `${height}%` }} />
            ))}
          </div>
          <div className="chart-footer">
            <span>Средний чек {formatRub(data.metrics.avgCheck)}</span>
            <span>Конверсия {data.metrics.conversion}%</span>
          </div>
        </article>

        <article className="panel">
          <PanelTitle icon={WarningCircle} title="Низкие остатки" action="Открыть" onAction={() => setTab("stock")} />
          <div className="stock-list">
            {lowStock.slice(0, 6).map((product) => (
              <ProductStockRow key={product.id} product={product} />
            ))}
          </div>
        </article>

        <article className="panel">
          <PanelTitle icon={Clock} title="Сегодня" action="Все заказы" onAction={() => setTab("orders")} />
          <div className="timeline">
            {data.orders.map((order) => (
              <div key={order.id}>
                <span />
                <p>
                  <strong>{order.id}</strong> {order.status}
                  <small>{order.client} · {order.eta}</small>
                </p>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}

function Orders({ orders }) {
  return (
    <section className="panel table-panel">
      <PanelTitle icon={ShoppingBagOpen} title="Заказы магазина" action="Создать" />
      <div className="order-table">
        <div className="table-head">
          <span>Заказ</span>
          <span>Клиент</span>
          <span>Доставка</span>
          <span>Сумма</span>
          <span>Статус</span>
        </div>
        {orders.map((order) => (
          <article key={order.id}>
            <strong>{order.id}</strong>
            <span>{order.client}<small>{order.city}, {order.items} поз.</small></span>
            <span>{order.delivery}<small>{order.eta}</small></span>
            <b>{formatRub(order.amount)}</b>
            <em>{order.status}</em>
          </article>
        ))}
      </div>
    </section>
  );
}

function Stock({ products, lowStock }) {
  return (
    <section className="admin-grid">
      <article className="panel wide">
        <PanelTitle icon={Package} title="Товары каталога" action="Импорт CSV" />
        <div className="product-admin-list">
          {products.map((product) => (
            <article key={product.id}>
              <img src={assetUrl(product.image)} alt="" />
              <div>
                <strong>{product.name}</strong>
                <span>{product.category}</span>
              </div>
              <b>{formatRub(product.price)}</b>
              <em className={product.status}>{stockLabel(product)}</em>
              <button className="icon-button" type="button" aria-label="Настроить товар">
                <SlidersHorizontal size={18} weight="duotone" />
              </button>
            </article>
          ))}
        </div>
      </article>
      <article className="panel">
        <PanelTitle icon={Funnel} title="Что пополнить" action="Заявка" />
        <div className="stock-list">
          {lowStock.map((product) => (
            <ProductStockRow key={product.id} product={product} />
          ))}
        </div>
      </article>
    </section>
  );
}

function Sales({ data }) {
  const groups = data.categories.map((category) => ({
    ...category,
    revenue: data.products
      .filter((product) => product.categoryKey === category.key)
      .reduce((sum, product) => sum + product.price * Math.max(1, Math.min(product.stock, 6)), 0),
  }));

  return (
    <section className="admin-grid">
      <article className="panel wide">
        <PanelTitle icon={ChartLineUp} title="Выручка по категориям" action="Период" />
        <div className="category-bars">
          {groups.map((group) => (
            <div key={group.key}>
              <span>{group.name}</span>
              <strong>{compactRub(group.revenue)}</strong>
              <i style={{ width: `${Math.max(14, Math.min(100, group.revenue / 2600))}%` }} />
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <PanelTitle icon={DeviceMobile} title="Каналы" action="Отчет" />
        <div className="channel-list">
          <div><strong>Сайт</strong><span>64%</span></div>
          <div><strong>WhatsApp</strong><span>21%</span></div>
          <div><strong>Постоянные покупатели</strong><span>15%</span></div>
        </div>
      </article>
    </section>
  );
}

function Delivery({ orders }) {
  return (
    <section className="admin-grid">
      <article className="panel wide">
        <PanelTitle icon={Truck} title="Очередь СДЭК" action="Печать этикеток" />
        <div className="delivery-board">
          {["Подтвердить", "Упаковать", "Передать СДЭК"].map((status, columnIndex) => (
            <div key={status}>
              <h3>{status}</h3>
              {orders.slice(columnIndex, columnIndex + 2).map((order) => (
                <article key={`${status}-${order.id}`}>
                  <strong>{order.id}</strong>
                  <span>{order.city}</span>
                  <small>{order.delivery}</small>
                </article>
              ))}
            </div>
          ))}
        </div>
      </article>
      <article className="panel">
        <PanelTitle icon={CheckCircle} title="Контроль упаковки" action="Шаблон" />
        <div className="checklist">
          {["Влажный субстрат", "Корневая система закрыта", "Бирка растения", "Фото перед отправкой"].map((item) => (
            <label key={item}>
              <input type="checkbox" defaultChecked={item !== "Фото перед отправкой"} />
              <span>{item}</span>
            </label>
          ))}
        </div>
      </article>
    </section>
  );
}

function PanelTitle({ icon: Icon, title, action, onAction }) {
  return (
    <header className="panel-title">
      <div>
        <Icon size={20} weight="duotone" />
        <strong>{title}</strong>
      </div>
      <button type="button" onClick={onAction}>
        {action}
        <ArrowRight size={15} weight="bold" />
      </button>
    </header>
  );
}

function ProductStockRow({ product }) {
  return (
    <div className="stock-row">
      <img src={assetUrl(product.image)} alt="" />
      <div>
        <strong>{product.name}</strong>
        <span>{stockLabel(product)}</span>
      </div>
      <em className={product.status}>{product.status === "out" ? "0" : product.stock}</em>
    </div>
  );
}
