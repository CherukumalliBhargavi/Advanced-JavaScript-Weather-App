"use strict";

// 1. API CONFIGURATION
// Get your API key from https://newsapi.org/
const API_KEY = "YOUR_NEWSAPI_KEY";
const API_BASE_URL = "https://newsapi.org/v2";

// 2. APPLICATION STATE
let currentCategory = "general";
let currentQuery = "";
let currentPage = 1;
let totalResults = 0;
let isLoading = false;

const PAGE_SIZE = 12;

// ES6 arrow function
const $ = (selector) => document.querySelector(selector);

const newsGrid = $("#newsGrid");
const statusMessage = $("#statusMessage");
const loadMoreBtn = $("#loadMoreBtn");
const searchInput = $("#searchInput");

// Sample articles for preview when no API key is configured.
// These are demonstration stories, not live news.
const demoArticles = [
  {
    title: "How Artificial Intelligence Is Changing Everyday Life",
    description:
      "Discover how AI tools are transforming education, communication and modern workplaces.",
    source: { name: "Technology Desk" },
    url: "https://www.bbc.com/news/technology",
    urlToImage: "https://images.unsplash.com/photo-1677442136019-21780ecad995?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-14T08:00:00Z"
  },
  {
    title: "Global Markets and the Future of Business",
    description:
      "Explore the economic trends, business decisions and innovations shaping markets around the world.",
    source: { name: "Business Desk" },
    url: "https://www.reuters.com/business/",
    urlToImage: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-14T07:00:00Z"
  },
  {
    title: "The Next Generation of Digital Innovation",
    description:
      "New digital technologies are creating opportunities for students, developers and businesses.",
    source: { name: "Innovation Desk" },
    url: "https://techcrunch.com/",
    urlToImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-13T09:00:00Z"
  },
  {
    title: "Sports, Fitness and the Power of Teamwork",
    description:
      "Learn how preparation, collaboration and technology are influencing modern sports.",
    source: { name: "Sports Desk" },
    url: "https://www.espn.com/",
    urlToImage: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-13T06:00:00Z"
  },
  {
    title: "Creative Industries Embrace New Technology",
    description:
      "Digital platforms are opening new ways for creators to share ideas and reach audiences.",
    source: { name: "Culture Desk" },
    url: "https://www.bbc.com/culture",
    urlToImage: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-12T10:00:00Z"
  },
  {
    title: "Building Healthier Habits in a Digital World",
    description:
      "Practical approaches to balancing technology, wellbeing and everyday routines.",
    source: { name: "Health Desk" },
    url: "https://www.who.int/news",
    urlToImage: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=80",
    publishedAt: "2026-10-12T08:00:00Z"
  }
];

// 3. ES6 DESTRUCTURING + ARROW FUNCTIONS
const formatDate = (dateString) => {
  if (!dateString) return "Date unavailable";

  const date = new Date(dateString);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
};

const getCategoryLabel = (category) => {
  const labels = {
    general: "Top Stories",
    technology: "Technology",
    business: "Business",
    sports: "Sports",
    entertainment: "Entertainment",
    health: "Health"
  };

  return labels[category] || "Latest News";
};

// 4. CREATE NEWS CARD
const createNewsCard = (article, index) => {
  // Object destructuring
  const {
    title = "Untitled story",
    description = "Open this article to learn more.",
    source = {},
    url = "",
    urlToImage = "",
    publishedAt = ""
  } = article;

  // Nested destructuring
  const { name: sourceName = "News Desk" } = source;

  const safeTitle = title.trim() || "Untitled story";
  const safeDescription =
    description && description.trim()
      ? description
      : "Read the full story for more details.";

  const card = document.createElement("article");
  card.className = "news-card";

  const image = document.createElement("img");
  image.className = "news-image";
  image.alt = safeTitle;
  image.loading = index < 3 ? "eager" : "lazy";

  // A local SVG placeholder avoids broken-image icons.
  const placeholder = `data:image/svg+xml,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="400">
      <rect width="100%" height="100%" fill="#e8edf5"/>
      <text x="50%" y="50%" text-anchor="middle"
        dominant-baseline="middle" fill="#123b68"
        font-family="Arial" font-size="30">DailyPulse News</text>
    </svg>
  `)}`;

  image.src = urlToImage || placeholder;

  image.addEventListener("error", () => {
    image.src = placeholder;
    image.classList.add("placeholder");
  }, { once: true });

  const content = document.createElement("div");
  content.className = "card-content";

  const meta = document.createElement("div");
  meta.className = "card-meta";

  const tag = document.createElement("span");
  tag.className = "category-tag";
  tag.textContent = getCategoryLabel(currentCategory);

  const date = document.createElement("span");
  date.textContent = formatDate(publishedAt);

  meta.append(tag, date);

  const heading = document.createElement("h3");
  const titleLink = document.createElement("a");
  titleLink.textContent = safeTitle;

  const validUrl = isSafeExternalUrl(url);

  if (validUrl) {
    titleLink.href = validUrl;
    titleLink.target = "_blank";
    titleLink.rel = "noopener noreferrer";
  } else {
    titleLink.href = "#";
    titleLink.addEventListener("click", (event) => {
      event.preventDefault();
    });
  }

  heading.appendChild(titleLink);

  const descriptionText = document.createElement("p");
  descriptionText.className = "news-description";
  descriptionText.textContent =
    safeDescription.length > 150
      ? `${safeDescription.slice(0, 150)}...`
      : safeDescription;

  const footer = document.createElement("div");
  footer.className = "card-footer";

  const sourceElement = document.createElement("span");
  sourceElement.className = "source-name";
  sourceElement.textContent = sourceName;

  const readMore = document.createElement("a");
  readMore.className = "read-more";
  readMore.textContent = "Read Story →";

  if (validUrl) {
    readMore.href = validUrl;
    readMore.target = "_blank";
    readMore.rel = "noopener noreferrer";
  } else {
    readMore.href = "#";
    readMore.addEventListener("click", (event) => {
      event.preventDefault();
    });
  }

  footer.append(sourceElement, readMore);
  content.append(meta, heading, descriptionText, footer);
  card.append(image, content);

  return card;
};

const isSafeExternalUrl = (value) => {
  try {
    const url = new URL(value);

    return ["https:", "http:"].includes(url.protocol)
      ? url.href
      : "";
  } catch {
    return "";
  }
};

// 5. DISPLAY NEWS
const renderNews = (articles, append = false) => {
  if (!append) {
    newsGrid.replaceChildren();
  }

  if (!articles.length && !append) {
    statusMessage.textContent =
      "No articles found. Try another search or category.";
    return;
  }

  const fragment = document.createDocumentFragment();

  articles.forEach((article, index) => {
    fragment.appendChild(createNewsCard(article, index));
  });

  newsGrid.appendChild(fragment);
};

// 6. FETCH NEWS API USING ASYNC/AWAIT
const fetchNews = async ({ category, query, page = 1 }) => {
  const params = new URLSearchParams({
    country: "in",
    pageSize: String(PAGE_SIZE),
    page: String(page),
    apiKey: API_KEY
  });

  if (query) {
    // Search for a keyword.
    params.set("q", query);
    params.delete("country");
  } else {
    // Fetch headlines from the selected category.
    params.set("category", category);
  }

  const endpoint = query
    ? `${API_BASE_URL}/everything`
    : `${API_BASE_URL}/top-headlines`;

  const response = await fetch(`${endpoint}?${params.toString()}`);

  if (!response.ok) {
    throw new Error(
      response.status === 401
        ? "Invalid API key. Check your NewsAPI configuration."
        : response.status === 426
          ? "Your API plan does not support this request."
          : `News request failed (${response.status}).`
    );
  }

  // Promise resolves with parsed JSON.
  const data = await response.json();

  if (data.status !== "ok") {
    throw new Error(data.message || "Unable to retrieve news.");
  }

  // Destructuring the API response.
  const { articles = [], totalResults: total = 0 } = data;

  return { articles, total };
};

// 7. LOAD NEWS WITH ERROR HANDLING
const loadNews = async ({ append = false } = {}) => {
  if (isLoading) return;

  isLoading = true;
  statusMessage.textContent = "Fetching the latest news...";
  loadMoreBtn.disabled = true;

  if (!append) {
    newsGrid.replaceChildren();
    loadMoreBtn.hidden = true;
  }

  try {
    let articles;

    // Preview mode when the API key has not been configured.
    if (API_KEY === "YOUR_NEWSAPI_KEY") {
      await new Promise((resolve) => setTimeout(resolve, 350));

      articles = currentQuery
        ? demoArticles.filter((article) =>
            `${article.title} ${article.description}`
              .toLowerCase()
              .includes(currentQuery.toLowerCase())
          )
        : demoArticles.filter((article) =>
            currentCategory === "general" ||
            article.title.toLowerCase().includes(currentCategory) ||
            article.description.toLowerCase().includes(currentCategory)
          );

      totalResults = articles.length;

      const start = (currentPage - 1) * PAGE_SIZE;
      articles = articles.slice(start, start + PAGE_SIZE);

      statusMessage.textContent =
        "Preview mode: connect your API key for live headlines.";

    } else {
      // API calls return Promises, awaited here.
      const result = await fetchNews({
        category: currentCategory,
        query: currentQuery,
        page: currentPage
      });

      articles = result.articles;
      totalResults = result.total;

      statusMessage.textContent = "";
    }

    renderNews(articles, append);

    if (articles.length > 0 && !append) {
      $("#breakingText").textContent = articles[0].title;
    }

    if (articles.length > 0) {
      statusMessage.textContent =
        API_KEY === "YOUR_NEWSAPI_KEY"
          ? "Preview articles shown. Add an API key to access live news."
          : `Showing ${newsGrid.children.length} article(s).`;
    }

    loadMoreBtn.hidden =
      newsGrid.children.length >= totalResults ||
      articles.length === 0;

  } catch (error) {
    console.error("News loading error:", error);

    statusMessage.textContent =
      `${error.message} Please check your API key, network, and API access settings.`;

  } finally {
    // Runs whether the Promise succeeds or fails.
    isLoading = false;
    loadMoreBtn.disabled = false;
  }
};

// 8. CATEGORY FILTERING
const handleCategoryChange = (event) => {
  const link = event.target.closest("[data-category]");

  if (!link) return;

  event.preventDefault();

  currentCategory = link.dataset.category;
  currentQuery = "";
  currentPage = 1;
  searchInput.value = "";

  document.querySelectorAll(".nav-link").forEach((navLink) => {
    navLink.classList.toggle("active", navLink === link);
  });

  $("#sectionTitle").textContent =
    getCategoryLabel(currentCategory);

  $("#sectionEyebrow").textContent =
    currentCategory === "general"
      ? "STAY INFORMED"
      : `EXPLORE ${currentCategory.toUpperCase()}`;

  $("#navigation").classList.remove("open");
  $("#menuToggle").setAttribute("aria-expanded", "false");

  loadNews();
};

$("#navigation").addEventListener("click", handleCategoryChange);

// 9. SEARCH NEWS
$("#searchForm").addEventListener("submit", async (event) => {
  event.preventDefault();

  const query = searchInput.value.trim();

  if (!query) {
    statusMessage.textContent = "Enter a keyword to search for news.";
    searchInput.focus();
    return;
  }

  currentQuery = query;
  currentPage = 1;

  $("#sectionTitle").textContent = `Search: ${query}`;
  $("#sectionEyebrow").textContent = "SEARCH RESULTS";

  document.querySelectorAll(".nav-link").forEach((link) => {
    link.classList.remove("active");
  });

  await loadNews();
});

// 10. REFRESH NEWS
$("#refreshBtn").addEventListener("click", () => {
  currentPage = 1;
  loadNews();
});

// 11. LOAD MORE ARTICLES
loadMoreBtn.addEventListener("click", async () => {
  currentPage += 1;
  await loadNews({ append: true });
});

// 12. MOBILE NAVIGATION
$("#menuToggle").addEventListener("click", () => {
  const navigation = $("#navigation");
  const isOpen = navigation.classList.toggle("open");

  $("#menuToggle").setAttribute("aria-expanded", String(isOpen));
});

// 13. NEWSLETTER FORM VALIDATION
$("#newsletterForm").addEventListener("submit", (event) => {
  event.preventDefault();

  const email = $("#newsletterEmail").value.trim();
  const message = $("#newsletterMessage");

  if (!email) {
    message.textContent = "Please enter your email address.";
    return;
  }

  // Frontend demo only; no email is sent or stored.
  message.textContent =
    "Thank you! This demo form is working. Connect a backend to save subscriptions.";

  event.target.reset();
});

// 14. DATE AND FOOTER YEAR
$("#currentDate").textContent = new Intl.DateTimeFormat("en-IN", {
  weekday: "short",
  day: "numeric",
  month: "short",
  year: "numeric"
}).format(new Date());

$("#currentYear").textContent = new Date().getFullYear();

// 15. START APPLICATION
loadNews();