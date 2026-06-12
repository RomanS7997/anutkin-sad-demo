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

const baseUrl = import.meta.env.BASE_URL || "/";

function assetUrl(path) {
  return `${baseUrl}${String(path || "").replace(/^\/+/, "")}`;
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

function stockLabel(product) {
  if (product.stock === 0) return "нет в наличии";
  if (product.stock <= 3) return `${product.stock} шт. осталось`;
  return `${product.stock} шт.`;
}

function useCatalog() {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${baseUrl}data/catalog.json`)
      .then((response) => response.json())
      .then(setData);
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

  const addToCart = (product) => {
    if (!product || product.stock === 0) return;
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

  const openLightbox = (product) => {
    const index = galleryProducts.findIndex((item) => item.id === product.id);
    setLightboxIndex(index >= 0 ? index : 0);
  };

  const moveLightbox = (direction) => {
    setLightboxIndex((current) => {
      if (current === null || galleryProducts.length === 0) return current;
      return (current + direction + galleryProducts.length) % galleryProducts.length;
    });
  };

  useEffect(() => {
    if (!lightboxProduct) return undefined;
    const onKey = (event) => {
      if (event.key === "Escape") setLightboxIndex(null);
      if (event.key === "ArrowLeft") moveLightbox(-1);
      if (event.key === "ArrowRight") moveLightbox(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxProduct, galleryProducts.length]);

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
      {routeName === "product" && (
        <ProductExperience product={selectedProduct} products={featured} go={go} addToCart={addToCart} openLightbox={openLightbox} />
      )}
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
        products={galleryProducts}
        index={lightboxIndex}
        onClose={() => setLightboxIndex(null)}
        onMove={moveLightbox}
        onPick={setLightboxIndex}
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
  const links = [
    ["home", "Главная", "shop"],
    ["catalog", "Каталог", "catalog"],
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
            <button className={routeName === key ? "active" : ""} key={key} type="button" onClick={() => go(target)}>
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

  return (
    <>
      <HeroSection
        slides={galleryProducts}
        productCount={data.products.length}
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

      <SignatureCollection data={data} products={galleryProducts} go={go} openLightbox={openLightbox} />

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
    fetch(`${baseUrl}data/reviews.json`)
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

function ProductExperience({ product, products, go, addToCart, openLightbox }) {
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);

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
            <strong>{formatRub(product.price)}</strong>
            <span>{product.stock > 0 ? "можно добавить в заказ" : "нет в наличии"}</span>
          </div>
          <div className="care-facts">
            {Object.entries(product.care || {}).slice(0, 4).map(([key, value]) => (
              <article key={key}>
                <span>{careName(key)}</span>
                <strong>{value}</strong>
              </article>
            ))}
          </div>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => addToCart(product)} disabled={product.stock === 0}>
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

function PhotoLightbox({ product, onClose, onMove, addToCart, go }) {
  const [full, setFull] = useState(false); // фото на весь экран
  const [zoom, setZoom] = useState(null); // null | {x, y} — точка увеличения в %
  useEffect(() => {
    setFull(false);
    setZoom(null);
  }, [product]);
  if (!product) return null;

  const pointPct = (clientX, clientY, el) => {
    const rect = el.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - rect.top) / rect.height) * 100)),
    };
  };

  return (
    <aside className="photo-lightbox" role="dialog" aria-modal="true" aria-label="Фотография растения">
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
            <img src={assetUrl(product.image)} alt={product.name} />
            <span className="photo-stage-hint">
              <MagnifyingGlass size={15} weight="bold" />
              Фото целиком
            </span>
          </button>
          <button className="gallery-nav gallery-prev" type="button" onClick={() => onMove(-1)} aria-label="Предыдущее фото">
            <CaretLeft size={24} weight="bold" />
          </button>
          <button className="gallery-nav gallery-next" type="button" onClick={() => onMove(1)} aria-label="Следующее фото">
            <CaretRight size={24} weight="bold" />
          </button>
        </figure>

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
                src={assetUrl(product.image)}
                alt={product.name}
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
            <button className="gallery-nav gallery-prev" type="button" onClick={() => onMove(-1)} aria-label="Предыдущее фото">
              <CaretLeft size={26} weight="bold" />
            </button>
            <button className="gallery-nav gallery-next" type="button" onClick={() => onMove(1)} aria-label="Следующее фото">
              <CaretRight size={26} weight="bold" />
            </button>
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
              <strong>{formatRub(product.price)}</strong>
              <span>{stockLabel(product)}</span>
            </div>
            <div className="photo-actions">
              <button className="primary-button" type="button" onClick={() => addToCart(product)} disabled={product.stock === 0}>
                В корзину
                <Plus size={17} weight="bold" />
              </button>
              <button className="round-link" type="button" onClick={() => { onClose(); go(`product/${product.id}`); }}>
                Подробнее
                <ArrowRight size={17} weight="bold" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </aside>
  );
}

function LuxuryProductCard({ product, go, addToCart, openLightbox, index = 0, feature = false }) {
  return (
    <article className={`luxury-card elev reveal ${product.status}${feature ? " is-feature" : ""}`} style={{ "--i": index % 4 }}>
      <button className="luxury-image" type="button" onClick={() => openLightbox(product)}>
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <Leaf size={44} weight="duotone" />}
        <span>{product.category}</span>
        <em>
          <MagnifyingGlass size={15} weight="duotone" />
          фото
        </em>
      </button>
      <div className="luxury-body">
        <button className="text-link" type="button" onClick={() => go(`product/${product.id}`)}>
          <h3>{product.name}</h3>
        </button>
        <p>{product.description}</p>
        <div className="product-meta">
          <strong>{formatRub(product.price)}</strong>
          <span>{stockLabel(product)}</span>
        </div>
        <div className="card-actions">
          <button type="button" onClick={() => addToCart(product)} disabled={product.stock === 0}>
            {product.stock === 0 ? "Нет в наличии" : "В корзину"}
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
  const updateQty = (id, delta) => {
    setCart((items) =>
      items
        .map((item) => (item.id === id ? { ...item, qty: Math.max(0, Math.min(item.stock, item.qty + delta)) } : item))
        .filter((item) => item.qty > 0),
    );
  };

  return (
    <aside className={open ? "cart-drawer open" : "cart-drawer"} aria-hidden={!open}>
      <div className="drawer-panel">
        <header>
          <div>
            <span>Корзина</span>
            <strong>{cart.length ? `${cart.length} позиций` : "пока пусто"}</strong>
          </div>
          <button className="icon-button" type="button" onClick={() => setOpen(false)} aria-label="Закрыть">
            <X size={20} weight="bold" />
          </button>
        </header>
        <div className="cart-items">
          {cart.length === 0 ? (
            <p className="empty-state">Добавьте растения из каталога, чтобы оформить заказ.</p>
          ) : (
            cart.map((item) => (
              <article key={item.id}>
                <img src={assetUrl(item.image)} alt="" />
                <div>
                  <strong>{item.name}</strong>
                  <span>{formatRub(item.price)}</span>
                  <div className="qty-control">
                    <button type="button" onClick={() => updateQty(item.id, -1)}>-</button>
                    <span>{item.qty}</span>
                    <button type="button" onClick={() => updateQty(item.id, 1)}>+</button>
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
          <button className="primary-button" type="button" disabled={!cart.length}>
            Оформить заказ
            <ArrowRight size={18} weight="bold" />
          </button>
        </footer>
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
