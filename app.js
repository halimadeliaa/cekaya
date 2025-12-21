export function setActiveNav() {
  const path = location.pathname.split("/").pop() || "index.html";
  document.querySelectorAll("[data-nav]").forEach(a => {
    if (a.getAttribute("href") === path) a.classList.add("active");
  });
}

export function money(n){
  const num = Number(n);
  if (!Number.isFinite(num)) return "-";
  return num.toLocaleString("id-ID");
}
