// ui-effects.js
(() => {
  // 1) Scroll reveal (ringan, tanpa library)
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!reduceMotion) {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
  } else {
    document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
  }

  // 2) Active nav link (opsional, kalau nav kamu pakai <a href="...">)
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("nav a[href]").forEach((a) => {
    const href = a.getAttribute("href");
    if (href && href.includes(path)) a.classList.add("is-active");
  });
})();
