import {
  ArrowRight,
  Basket,
  Bell,
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
import { useEffect, useMemo, useState } from "react";

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

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace("#/", "") || "shop");
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = (next) => {
    window.location.hash = `/${next}`;
    setRoute(next);
  };

  return [route, go];
}

export function App() {
  const data = useCatalog();
  const [route, go] = useRoute();

  if (!data) {
    return (
      <main className="loading-screen">
        <FlowerLotus size={34} weight="duotone" />
        <span>Загружаю каталог</span>
      </main>
    );
  }

  return route.startsWith("admin") ? (
    <AdminApp data={data} route={route} go={go} />
  ) : (
    <StorefrontAppV2 data={data} route={route} go={go} />
  );
}

function StorefrontAppV2({ data, route, go }) {
  const [activeCategory, setActiveCategory] = useState("all");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const availableProducts = useMemo(
    () => data.products.filter((product) => product.stock > 0 && product.image),
    [data.products],
  );

  const featured = useMemo(() => {
    const priority = ["hydrangea", "shrubs", "annuals", "perennials"];
    return priority
      .flatMap((key) => availableProducts.filter((product) => product.categoryKey === key))
      .slice(0, 12);
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

  const routeName = route === "shop" ? "home" : route.split("/")[0];
  const productId = Number(route.split("/")[1]);
  const selectedProduct = data.products.find((product) => product.id === productId) || featured[0] || data.products[0];
  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const cartCount = cart.reduce((sum, item) => sum + item.qty, 0);

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

  return (
    <main className="experience-shell">
      <StoreHeader routeName={routeName} go={go} cartCount={cartCount} openCart={() => setDrawerOpen(true)} />

      {routeName === "home" && (
        <HomeExperience
          data={data}
          featured={featured}
          go={go}
          addToCart={addToCart}
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
        />
      )}
      {routeName === "product" && (
        <ProductExperience product={selectedProduct} products={featured} go={go} addToCart={addToCart} />
      )}
      {routeName === "delivery" && <DeliveryExperience data={data} go={go} />}
      {routeName === "proposal" && <ProposalExperience data={data} go={go} />}
      {!["home", "catalog", "product", "delivery", "proposal"].includes(routeName) && (
        <HomeExperience data={data} featured={featured} go={go} addToCart={addToCart} />
      )}

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

function StoreHeader({ routeName, go, cartCount, openCart }) {
  const links = [
    ["home", "Главная", "shop"],
    ["catalog", "Каталог", "catalog"],
    ["delivery", "Доставка", "delivery"],
    ["proposal", "Презентация", "proposal"],
  ];

  return (
    <header className="experience-header">
      <button className="brand admin-brand" type="button" onClick={() => go("shop")}>
        <span className="brand-mark">
          <Leaf size={19} weight="fill" />
        </span>
        <span>
          <strong>Анюткин сад</strong>
          <small>новый ecommerce</small>
        </span>
      </button>
      <nav className="experience-nav" aria-label="Навигация демо">
        {links.map(([key, label, target]) => (
          <button className={routeName === key ? "active" : ""} key={key} type="button" onClick={() => go(target)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="header-actions">
        <button className="soft-button" type="button" onClick={() => go("admin")}>
          <Storefront size={17} weight="duotone" />
          Админка
        </button>
        <button className="icon-button" type="button" onClick={openCart} aria-label="Корзина">
          <Basket size={20} weight="duotone" />
          {cartCount > 0 && <span>{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}

function HomeExperience({ data, featured, go, addToCart }) {
  const heroProduct = featured[0] || data.products[0];
  const carousel = featured.slice(0, 8);

  return (
    <>
      <section className="experience-hero">
        <div className="hero-copy hero-copy-v2">
          <p className="eyebrow">
            <Sparkle size={16} weight="fill" />
            Демо нового сайта, каталога и админки
          </p>
          <h1>Сад, который продает до первого звонка</h1>
          <p className="hero-lede">
            Не просто красивая витрина: покупатель видит живые остатки, подборки по сезону,
            понятную доставку СДЭК и карточки растений, которые выглядят дороже стандартного WooCommerce.
          </p>
          <div className="hero-actions">
            <button className="primary-button" type="button" onClick={() => go("catalog")}>
              Открыть каталог
              <ArrowRight size={18} weight="bold" />
            </button>
            <button className="round-link" type="button" onClick={() => go("proposal")}>
              Почему это продает
              <Sparkle size={18} weight="duotone" />
            </button>
          </div>
          <div className="proof-row">
            <div><strong>89</strong><span>реальных товаров</span></div>
            <div><strong>5</strong><span>категорий</span></div>
            <div><strong>СДЭК</strong><span>в сценарии заказа</span></div>
          </div>
        </div>

        <div className="scene3d" aria-label="3D витрина растений">
          <div className="plant-carousel">
            {carousel.slice(0, 6).map((product, index) => (
              <button
                className={`carousel-card showcase-card showcase-card-${index + 1}`}
                key={product.id}
                style={{ "--angle": `${index * 60}deg` }}
                type="button"
                onClick={() => go(`product/${product.id}`)}
              >
                <img src={assetUrl(product.image)} alt={product.name} />
                <span>{product.name}</span>
              </button>
            ))}
          </div>
          <article className="hero-live-card">
            <span>Хит сезона</span>
            <strong>{heroProduct.name}</strong>
            <p>{formatRub(heroProduct.price)} · {stockLabel(heroProduct)}</p>
            <button type="button" onClick={() => addToCart(heroProduct)}>
              В корзину
              <Plus size={16} weight="bold" />
            </button>
          </article>
        </div>
      </section>

      <section className="journey-grid">
        {[
          ["Каталог с живыми остатками", "Фильтры, быстрый поиск, статусы наличия и красивые карточки растений.", "catalog", Package],
          ["Страница растения", "Большое фото, характеристики, наличие и понятный следующий шаг.", `product/${heroProduct.id}`, Plant],
          ["Доставка СДЭК", "Отдельный экран про упаковку, сроки, самовывоз и ожидания клиента.", "delivery", Truck],
          ["Админка хозяйства", "Продажи, заказы, остатки, очередь отправок и ежедневные действия.", "admin", ChartLineUp],
        ].map(([title, text, target, Icon]) => (
          <button className="journey-card" key={title} type="button" onClick={() => go(target)}>
            <Icon size={28} weight="duotone" />
            <strong>{title}</strong>
            <span>{text}</span>
            <ArrowRight size={18} weight="bold" />
          </button>
        ))}
      </section>

      <section className="immersive-band">
        <div className="band-copy">
          <p className="script">Season drop</p>
          <h2>Не скидка ради скидки, а сезонные сценарии покупки</h2>
          <p>
            Вместо плоского списка товаров демо показывает подборки: гортензии для посадки, цветущие
            однолетники, кустарники и рассада. Это проще продать и проще объяснить клиенту.
          </p>
          <button className="primary-button alt" type="button" onClick={() => go("catalog")}>
            Смотреть подборки
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
        <div className="stacked-products">
          {featured.slice(2, 5).map((product, index) => (
            <article key={product.id} style={{ "--stack": index }}>
              <img src={assetUrl(product.image)} alt={product.name} />
              <strong>{product.name}</strong>
              <span>{formatRub(product.price)}</span>
            </article>
          ))}
        </div>
      </section>

      <section className="editorial-section">
        <div className="section-head">
          <p className="eyebrow">Витрина</p>
          <h2>Главная продает не товар, а доверие к хозяйству</h2>
          <p>Больше воздуха, крупнее фото, понятные сценарии и движение, которое делает демо живым.</p>
        </div>
        <div className="editorial-grid">
          {featured.slice(0, 6).map((product) => (
            <LuxuryProductCard key={product.id} product={product} go={go} addToCart={addToCart} />
          ))}
        </div>
      </section>
    </>
  );
}

function CatalogExperience({ data, filtered, activeCategory, setActiveCategory, query, setQuery, go, addToCart }) {
  return (
    <>
      <section className="page-hero compact">
        <div>
          <p className="eyebrow">Каталог</p>
          <h1>Каталог, который выглядит как магазин</h1>
          <p>
            Отдельная страница каталога показывает, как можно уйти от WooCommerce-шаблона: поиск,
            фильтры, быстрый просмотр и карточки, которые хорошо смотрятся на мобильном.
          </p>
        </div>
        <div className="catalog-stats">
          <strong>{filtered.length}</strong>
          <span>позиций показано</span>
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
              className={activeCategory === category.key ? "chip active" : "chip"}
              key={category.key}
              type="button"
              onClick={() => setActiveCategory(category.key)}
            >
              {category.name}<span>{category.count}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="editorial-grid catalog-page-grid">
        {filtered.slice(0, 36).map((product) => (
          <LuxuryProductCard key={product.id} product={product} go={go} addToCart={addToCart} />
        ))}
      </section>
    </>
  );
}

function ProductExperience({ product, products, go, addToCart }) {
  const related = products.filter((item) => item.id !== product.id).slice(0, 4);

  return (
    <>
      <section className="product-detail-page">
        <div className="detail-gallery">
          <img src={assetUrl(product.image)} alt={product.name} />
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
            <span>{product.stock > 0 ? "можно добавить в заказ" : "показываем как sold out"}</span>
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
          <LuxuryProductCard key={item.id} product={item} go={go} addToCart={addToCart} />
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
          <p className="eyebrow">СДЭК и самовывоз</p>
          <h1>Доставка объяснена до оформления заказа</h1>
          <p>
            Отдельная страница снимает тревогу: когда отправляют растения, как упаковывают, где
            самовывоз и что происходит после оплаты.
          </p>
          <button className="primary-button" type="button" onClick={() => go("catalog")}>
            Выбрать растения
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
        <div className="delivery-card-3d">
          <Truck size={44} weight="duotone" />
          <strong>СДЭК</strong>
          <span>ПВЗ · курьер · этикетки · контроль упаковки</span>
        </div>
      </section>

      <section className="process-board">
        {[
          ["01", "Оплата", "Реквизиты приходят после подтверждения заказа."],
          ["02", "Сборка", "Админка показывает, какие растения собрать и что заканчивается."],
          ["03", "Упаковка", "Чек-лист: влажность, корневая, бирка, фото перед отправкой."],
          ["04", "СДЭК", "Этикетка, трек-номер и статус отправки в одном месте."],
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
          <p className="eyebrow">Демо-фича</p>
          <h2>Расчет доставки как продающий блок</h2>
          <p>Можно показать клиенту будущий блок: город, способ, примерный срок и подсказка про упаковку.</p>
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
          <button type="button" onClick={() => go("admin")}>Посмотреть очередь СДЭК</button>
        </div>
      </section>
    </>
  );
}

function ProposalExperience({ data, go }) {
  return (
    <>
      <section className="page-hero proposal-hero">
        <div>
          <p className="eyebrow">Презентация для клиента</p>
          <h1>Что именно продаем владельцу хозяйства</h1>
          <p>
            Не “красивый сайт”, а связку витрина + админка: меньше ручной рутины, понятнее остатки,
            лучше мобильный опыт и больше доверия у покупателя.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={() => go("admin")}>
          Открыть админку
          <ArrowRight size={18} weight="bold" />
        </button>
      </section>

      <section className="value-ladder">
        {[
          ["Сейчас", "WooCommerce выглядит как каталог с карточками, где клиенту нужно самому разбираться."],
          ["В демо", "Появились сценарии: сезонные подборки, доставка, карточка растения, корзина, админка."],
          ["Дальше", "Подключаем WooCommerce REST API, СДЭК, реальные заказы и управление остатками."],
        ].map(([title, text]) => (
          <article key={title}>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </section>

      <section className="admin-sell-mock">
        <div>
          <p className="eyebrow">Операционная ценность</p>
          <h2>Админка, которую хочется открыть утром</h2>
          <p>
            На одном экране видно {data.metrics.ordersToday} заказов за сегодня, {data.metrics.stockAlerts}
            {" "}рисков по остаткам и очередь отправки СДЭК.
          </p>
          <button className="primary-button" type="button" onClick={() => go("admin")}>
            Перейти в админку
            <ArrowRight size={18} weight="bold" />
          </button>
        </div>
        <div className="mini-dashboard">
          <article><span>Продажи</span><strong>{compactRub(data.metrics.revenueMonth)}</strong></article>
          <article><span>Заказы</span><strong>{data.metrics.ordersToday}</strong></article>
          <article><span>СДЭК</span><strong>{data.metrics.deliveryQueue}</strong></article>
        </div>
      </section>
    </>
  );
}

function LuxuryProductCard({ product, go, addToCart }) {
  return (
    <article className={`luxury-card ${product.status}`}>
      <button className="luxury-image" type="button" onClick={() => go(`product/${product.id}`)}>
        {product.image ? <img src={assetUrl(product.image)} alt={product.name} /> : <Leaf size={44} weight="duotone" />}
        <span>{product.category}</span>
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
            хозяйства. В демо сохранены реальные товары, цены и остатки текущего каталога.
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
            <span>СДЭК и самовывоз</span>
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
          ["Остатки онлайн", "Покупатель видит доступность", Package],
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
          Быстрый выбор по категориям, остаткам и названию. В демо кнопки и корзина работают как
          прототип клиентского магазина.
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
          <p>Покажите клиенту готовые наборы: растения, упаковка, расчет доставки СДЭК и статус оплаты.</p>
        </div>
        <a className="primary-button alt" href="#admin-preview">
          Смотреть админку
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
          <h2>Покупатель получает не просто список товаров</h2>
          <p>Карточка показывает остаток, цену, фото и краткие характеристики растения.</p>
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
            <p>Флоу магазина заранее учитывает упаковку, способ отправки и согласование даты.</p>
          </div>
        </div>
      </section>

      <section className="admin-preview" id="admin-preview">
        <div>
          <p className="eyebrow">Для владельца</p>
          <h2>Админка быстрее стандартного WooCommerce</h2>
          <p>
            На первом экране видны продажи, заказы, товары с риском закончиться и очередь отправок.
          </p>
        </div>
        <button className="primary-button" type="button" onClick={() => go("admin")}>
          Открыть админку
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
            <p className="empty-state">Добавьте растения из каталога, чтобы показать клиенту сценарий заказа.</p>
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
            <small>control center</small>
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
          На витрину
        </button>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <p className="eyebrow">WooCommerce demo</p>
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
    ["AI-подсказка", `Поднять в каталоге ${lowStock[0]?.name || "товар с низким остатком"} и убрать из рекламы позиции с риском.`, "Принять план", Sparkle],
    ["Промо недели", `Сделать подборку из ${data.products.length} растений с автоскидкой для повторных клиентов.`, "Собрать витрину", Package],
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
        <PanelTitle icon={Package} title="Товары WooCommerce" action="Импорт CSV" />
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
          <div><strong>Повторные клиенты</strong><span>15%</span></div>
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
