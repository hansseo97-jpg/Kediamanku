const revealItems = document.querySelectorAll("[data-reveal]");
const viewButtons = document.querySelectorAll(".view-circle");
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const desktopHover = window.matchMedia("(hover: hover) and (min-width: 900px)").matches;

if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.18,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

if (!reduceMotion && desktopHover) {
  viewButtons.forEach((button) => {
    const row = button.closest(".service-row");
    if (!row) return;

    row.addEventListener("mousemove", (event) => {
      const rect = button.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const x = Math.max(-12, Math.min(12, (event.clientX - centerX) * 0.12));
      const y = Math.max(-12, Math.min(12, (event.clientY - centerY) * 0.12));

      button.style.setProperty("--magnet-x", `${x.toFixed(2)}px`);
      button.style.setProperty("--magnet-y", `${y.toFixed(2)}px`);
    });

    row.addEventListener("mouseleave", () => {
      button.style.setProperty("--magnet-x", "0px");
      button.style.setProperty("--magnet-y", "0px");
    });
  });
}
