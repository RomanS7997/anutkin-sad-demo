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
  return new Intl.NumberFormat("ru-RU").format(value || 0) + " ₽";
}

function compactRub(value) {
  return new Intl.NumberFormat("ru-RU", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value || 0) + " ₽";
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

  return route === "admin" ? (
    <AdminApp data={data} go={go} />
  ) : (
    <StorefrontApp data={data} go={go} />
  );
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

  return (
    <>
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
