(() => {
  const STORAGE_KEY = "readingRoomBooks";

  const form = document.getElementById("book-form");
  const list = document.getElementById("book-list");
  const empty = document.getElementById("empty");
  const countEl = document.getElementById("count");
  const searchEl = document.getElementById("search");
  const toastEl = document.getElementById("toast");

  let books = load();
  let newestId = null;

  /* ---------- Storage ---------- */
  function load() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    } catch {
      return [];
    }
  }

  function save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
    } catch {
      /* storage unavailable; the app still works for this session */
    }
  }

  /* ---------- Helpers ---------- */
  function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function formatDate(ts) {
    return new Date(ts).toLocaleDateString(undefined, {
      day: "numeric", month: "short", year: "numeric"
    });
  }

  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => toastEl.classList.remove("show"), 2200);
  }

  const heartSvg =
    '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z"/></svg>';

  /* ---------- Rendering ---------- */
  function render() {
    const query = searchEl.value.trim().toLowerCase();
    const visible = books.filter(b =>
      b.title.toLowerCase().includes(query) || b.author.toLowerCase().includes(query)
    );

    list.replaceChildren(...visible.map(buildCard));
    countEl.textContent = books.length;

    empty.hidden = visible.length > 0;
    empty.textContent = books.length
      ? "No books match your search."
      : "No books yet. Fill in the form to add the first one.";
  }

  function buildCard(book) {
    const card = el("article", "book" + (book.id === newestId ? " new" : ""));

    // Top row: title, author, like and delete buttons
    const top = el("div", "book-top");
    const heading = el("div");
    heading.append(el("h3", "book-title", book.title));
    if (book.author) heading.append(el("p", "book-author", "by " + book.author));

    const actions = el("div", "actions");

    const like = el("button", "icon-btn like-btn" + (book.liked ? " liked" : ""));
    like.type = "button";
    like.setAttribute("aria-pressed", String(book.liked));
    like.setAttribute("aria-label", book.liked ? "Unlike this book" : "Like this book");
    like.innerHTML = heartSvg;
    like.append(el("span", "", String(book.likes)));
    like.addEventListener("click", () => toggleLike(book.id, like));

    const del = el("button", "icon-btn delete-btn", "Delete");
    del.type = "button";
    del.addEventListener("click", () => removeBook(book.id));

    actions.append(like, del);
    top.append(heading, actions);

    // Summary
    const summaryLabel = el("h4", "section-label", "Summary");
    const summary = el("p", "text", book.summary);

    // Reviews
    const reviewLabel = el("h4", "section-label",
      book.reviews.length === 1 ? "1 review" : book.reviews.length + " reviews");
    const reviews = el("ul", "reviews");
    book.reviews.forEach(r => {
      const li = el("li");
      li.append(el("span", "", r.text),
        el("time", "", formatDate(r.date)));
      reviews.append(li);
    });

    // Add another review
    const addForm = el("form", "add-review");
    const input = el("input");
    input.type = "text";
    input.maxLength = 600;
    input.placeholder = "Add another review";
    input.setAttribute("aria-label", "Add another review for " + book.title);
    const addBtn = el("button", "btn", "Post review");
    addBtn.type = "submit";
    addForm.append(input, addBtn);
    addForm.addEventListener("submit", e => {
      e.preventDefault();
      const text = input.value.trim();
      if (!text) return;
      book.reviews.push({ text, date: Date.now() });
      save();
      render();
      toast("Review posted");
    });

    card.append(top, summaryLabel, summary, reviewLabel, reviews, addForm);
    return card;
  }

  /* ---------- Actions ---------- */
  function toggleLike(id, button) {
    const book = books.find(b => b.id === id);
    book.liked = !book.liked;
    book.likes += book.liked ? 1 : -1;
    save();
    render();
    // Replay the small pop animation on the re-rendered button
    const fresh = list.querySelectorAll(".like-btn")[
      books.filter(b => visibleMatch(b)).findIndex(b => b.id === id)
    ];
    if (fresh) {
      fresh.classList.add("pop");
      fresh.focus();
    }
  }

  function visibleMatch(b) {
    const q = searchEl.value.trim().toLowerCase();
    return b.title.toLowerCase().includes(q) || b.author.toLowerCase().includes(q);
  }

  function removeBook(id) {
    if (!confirm("Delete this book and its reviews?")) return;
    books = books.filter(b => b.id !== id);
    save();
    render();
    toast("Book deleted");
  }

  /* ---------- Form ---------- */
  function setError(fieldId, message) {
    const input = document.getElementById(fieldId);
    document.getElementById(fieldId + "-error").textContent = message;
    input.closest(".field").classList.toggle("invalid", Boolean(message));
  }

  form.addEventListener("submit", e => {
    e.preventDefault();

    const title = document.getElementById("title").value.trim();
    const author = document.getElementById("author").value.trim();
    const summary = document.getElementById("summary").value.trim();
    const review = document.getElementById("review").value.trim();

    setError("title", title ? "" : "Enter the book title.");
    setError("summary", summary ? "" : "Write a short summary.");
    setError("review", review ? "" : "Write your review.");
    if (!title || !summary || !review) return;

    const book = {
      id: Date.now(),
      title,
      author,
      summary,
      likes: 0,
      liked: false,
      reviews: [{ text: review, date: Date.now() }]
    };

    books.unshift(book);
    newestId = book.id;
    save();
    form.reset();
    searchEl.value = "";
    render();
    toast("“" + title + "” added to the shelf");

    // On small screens, bring the new entry into view
    if (window.matchMedia("(max-width: 860px)").matches) {
      list.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  ["title", "summary", "review"].forEach(id =>
    document.getElementById(id).addEventListener("input", () => setError(id, ""))
  );

  searchEl.addEventListener("input", render);

  render();
})();