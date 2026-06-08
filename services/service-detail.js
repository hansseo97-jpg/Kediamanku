const revealItems = document.querySelectorAll("[data-reveal]");
const faqItems = document.querySelectorAll("[data-faq-item]");
const galleryTrack = document.querySelector("[data-gallery-track]");
const heroMedia = document.querySelector("[data-hero-media]");
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
      threshold: 0.16,
      rootMargin: "0px 0px -8% 0px",
    }
  );

  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

faqItems.forEach((item) => {
  const trigger = item.querySelector("[data-faq-trigger]");
  const panel = item.querySelector("[data-faq-panel]");
  if (!trigger || !panel) return;

  trigger.addEventListener("click", () => {
    const isOpen = item.classList.toggle("is-open");
    trigger.setAttribute("aria-expanded", String(isOpen));
    panel.setAttribute("aria-hidden", String(!isOpen));
  });
});

if (galleryTrack) {
  let isDragging = false;
  let startX = 0;
  let startScrollLeft = 0;
  let dragged = false;

  galleryTrack.addEventListener("pointerdown", (event) => {
    if (event.button !== 0) return;
    isDragging = true;
    dragged = false;
    startX = event.clientX;
    startScrollLeft = galleryTrack.scrollLeft;
    galleryTrack.classList.add("is-dragging");
    galleryTrack.setPointerCapture(event.pointerId);
  });

  galleryTrack.addEventListener("pointermove", (event) => {
    if (!isDragging) return;
    const delta = event.clientX - startX;

    if (Math.abs(delta) > 6) {
      dragged = true;
    }

    galleryTrack.scrollLeft = startScrollLeft - delta;
  });

  function endGalleryDrag(event) {
    if (!isDragging) return;
    isDragging = false;
    galleryTrack.classList.remove("is-dragging");

    if (galleryTrack.hasPointerCapture(event.pointerId)) {
      galleryTrack.releasePointerCapture(event.pointerId);
    }
  }

  galleryTrack.addEventListener("pointerup", endGalleryDrag);
  galleryTrack.addEventListener("pointercancel", endGalleryDrag);
  galleryTrack.addEventListener(
    "click",
    (event) => {
      if (!dragged) return;
      event.preventDefault();
      event.stopPropagation();
      dragged = false;
    },
    true
  );
}

if (heroMedia && !reduceMotion && desktopHover) {
  heroMedia.addEventListener("mousemove", (event) => {
    const image = heroMedia.querySelector("img");
    if (!image) return;

    const rect = heroMedia.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    image.style.transform = `scale(1.02) translate(${(x * 12).toFixed(2)}px, ${(y * 10).toFixed(2)}px)`;
  });

  heroMedia.addEventListener("mouseleave", () => {
    const image = heroMedia.querySelector("img");
    if (image) {
      image.style.transform = "";
    }
  });
}
