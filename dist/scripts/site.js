const navToggle = document.querySelector(".nav-toggle");
const navLinks = document.querySelector(".nav-links");

if (navToggle && navLinks) {
  const closeNavigation = () => {
    navToggle.setAttribute("aria-expanded", "false");
    navToggle.setAttribute("aria-label", "Open navigation");
    navLinks.classList.remove("is-open");
  };

  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    navToggle.setAttribute("aria-expanded", String(!isOpen));
    navToggle.setAttribute("aria-label", isOpen ? "Open navigation" : "Close navigation");
    navLinks.classList.toggle("is-open", !isOpen);
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeNavigation);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  window.addEventListener("resize", () => {
    if (window.matchMedia("(min-width: 901px)").matches) closeNavigation();
  });
}

const portfolioPreviewVideos = document.querySelectorAll(".category-card-video");
const reducedMotionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");

const protectedMediaSelector = ".category-work-media, .portfolio-lightbox-media, .category-card, .featured-card, .featured-project-media, .service-visual, .about-photo, .hero";
document.addEventListener("contextmenu", (event) => {
  if (event.target instanceof Element && event.target.closest(protectedMediaSelector)) {
    event.preventDefault();
  }
});

document.addEventListener("dragstart", (event) => {
  if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) {
    event.preventDefault();
  }
});

document.querySelectorAll("img").forEach((image) => {
  image.draggable = false;
});

document.querySelectorAll("video").forEach((video) => {
  video.setAttribute("controlsList", "nodownload noplaybackrate");
  video.disablePictureInPicture = true;
});

const syncPortfolioPreviewMotion = () => {
  portfolioPreviewVideos.forEach((video) => {
    if (reducedMotionPreference.matches) {
      video.pause();
      return;
    }

    video.play().catch(() => {});
  });
};

syncPortfolioPreviewMotion();
reducedMotionPreference.addEventListener("change", syncPortfolioPreviewMotion);

const galleryVideoPreviews = document.querySelectorAll(".category-work-preview[data-preview-src]");
if ("IntersectionObserver" in window) {
  const previewObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const video = entry.target;
      if (entry.isIntersecting && !video.dataset.loaded) {
        video.addEventListener("loadedmetadata", () => {
          if (video.duration > 0) video.currentTime = Math.min(0.1, video.duration / 2);
        }, { once: true });
        video.src = video.dataset.previewSrc;
        video.preload = "metadata";
        video.dataset.loaded = "true";
        video.load();
      } else if (!entry.isIntersecting) {
        video.pause();
      }
    });
  }, { rootMargin: "240px" });

  galleryVideoPreviews.forEach((video) => previewObserver.observe(video));
} else {
  galleryVideoPreviews.forEach((video) => {
    video.src = video.dataset.previewSrc;
    video.preload = "metadata";
  });
}

const setupPortfolioGallery = () => {
  const portfolioCards = [...document.querySelectorAll(".category-work-card")];
  if (!portfolioCards.length) return;

  let activeIndex = 0;
  const modal = document.createElement("div");
  modal.className = "portfolio-lightbox";
  modal.setAttribute("hidden", "hidden");
  modal.innerHTML = `
    <div class="portfolio-lightbox-shell" role="dialog" aria-modal="true" aria-labelledby="portfolio-lightbox-title">
      <div class="portfolio-lightbox-media"></div>
      <aside class="portfolio-lightbox-panel">
        <div class="portfolio-lightbox-top">
          <button class="portfolio-lightbox-close" type="button" aria-label="Close gallery">Close</button>
        </div>
        <div class="portfolio-lightbox-copy">
          <p class="portfolio-lightbox-label">Featured work</p>
          <h3 id="portfolio-lightbox-title">Project</h3>
          <p class="portfolio-lightbox-meta"></p>
        </div>
        <div class="portfolio-lightbox-actions">
          <button class="portfolio-lightbox-nav portfolio-lightbox-prev" type="button" aria-label="Previous project">Previous</button>
          <button class="portfolio-lightbox-nav portfolio-lightbox-next" type="button" aria-label="Next project">Next</button>
        </div>
      </aside>
    </div>
  `;

  const mediaHost = modal.querySelector(".portfolio-lightbox-media");
  const titleEl = modal.querySelector("#portfolio-lightbox-title");
  const metaEl = modal.querySelector(".portfolio-lightbox-meta");
  const closeButton = modal.querySelector(".portfolio-lightbox-close");
  const prevButton = modal.querySelector(".portfolio-lightbox-prev");
  const nextButton = modal.querySelector(".portfolio-lightbox-next");

  document.body.appendChild(modal);

  const mediaEntries = portfolioCards.map((card) => {
    const media = card.querySelector(".category-work-media");
    const image = media?.querySelector("img");
    const video = media?.querySelector("video");
    const title = card.querySelector("h2")?.textContent.trim() || "Project";
    const category = card.querySelector("span")?.textContent.trim() || "Portfolio";
    const source = video ? video.querySelector("source")?.src || video.src : image?.src;

    return {
      card,
      title,
      category,
      type: video ? "video" : "image",
      source: video?.dataset.previewSrc || source,
      alt: image?.alt || title,
      poster: video?.poster || "",
    };
  });

  const renderCurrent = () => {
    const current = mediaEntries[activeIndex];
    if (!current) return;

    const fragment = document.createDocumentFragment();
    if (current.type === "video") {
      const video = document.createElement("video");
      video.src = current.source;
      video.poster = current.poster;
      video.controls = true;
      video.playsInline = true;
      video.autoplay = true;
      video.preload = "metadata";
      video.setAttribute("controlsList", "nodownload noplaybackrate");
      video.disablePictureInPicture = true;
      fragment.appendChild(video);
    } else {
      const image = document.createElement("img");
      image.src = current.source;
      image.alt = current.title;
      fragment.appendChild(image);
    }

    mediaHost.replaceChildren(fragment);
    titleEl.textContent = current.title;
    metaEl.textContent = current.category;
  };

  const closeGallery = () => {
    const activeVideo = mediaHost.querySelector("video");
    if (activeVideo) activeVideo.pause();
    mediaHost.replaceChildren();
    modal.setAttribute("hidden", "hidden");
    document.body.classList.remove("modal-open");
    mediaEntries[activeIndex]?.card.focus();
  };

  const openGallery = (index) => {
    const boundedIndex = (index + mediaEntries.length) % mediaEntries.length;
    activeIndex = boundedIndex;
    renderCurrent();
    modal.removeAttribute("hidden");
    document.body.classList.add("modal-open");
    closeButton.focus();
  };

  portfolioCards.forEach((card, index) => {
    card.setAttribute("tabindex", "0");
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `Open ${card.querySelector("h2")?.textContent.trim() || "portfolio item"} in gallery`);
    card.addEventListener("click", () => openGallery(index));
    card.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openGallery(index);
      }
    });
  });

  closeButton.addEventListener("click", closeGallery);
  prevButton.addEventListener("click", () => openGallery(activeIndex - 1));
  nextButton.addEventListener("click", () => openGallery(activeIndex + 1));
  modal.addEventListener("click", (event) => {
    if (event.target === modal) closeGallery();
  });

  document.addEventListener("keydown", (event) => {
    if (modal.hasAttribute("hidden")) return;
    if (event.key === "Escape") closeGallery();
    if (event.key === "ArrowRight") openGallery(activeIndex + 1);
    if (event.key === "ArrowLeft") openGallery(activeIndex - 1);
    if (event.key === "Tab") {
      const focusable = [...modal.querySelectorAll("button")];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  });
};

setupPortfolioGallery();

document.querySelectorAll(".contact-form").forEach((contactForm) => {
  const formStatus = contactForm.querySelector(".form-status");
  const submitButton = contactForm.querySelector('button[type="submit"]');
  const submitLabel = contactForm.querySelector(".submit-label");
  const endpoint = contactForm.dataset.endpoint?.trim();

  if (!formStatus || !submitButton || !submitLabel) return;

  contactForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!contactForm.reportValidity()) return;

    if (!endpoint) {
      formStatus.textContent = "Not connected: your inquiry has not been sent. Please contact us by phone or WhatsApp.";
      formStatus.dataset.state = "error";
      return;
    }

    const honeypot = contactForm.elements.namedItem("website");
    if (honeypot.value.trim()) {
      formStatus.textContent = "Your inquiry could not be submitted. Please try again.";
      formStatus.dataset.state = "error";
      return;
    }

    submitButton.disabled = true;
    submitLabel.textContent = "Sending…";
    contactForm.setAttribute("aria-busy", "true");
    formStatus.textContent = "Sending your inquiry…";
    formStatus.dataset.state = "loading";

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactForm.elements.namedItem("name").value.trim(),
          email: contactForm.elements.namedItem("email").value.trim(),
          service: contactForm.querySelector('input[name="service"]:checked').value,
          timeline: contactForm.elements.namedItem("timeline").value,
          message: contactForm.elements.namedItem("message").value.trim(),
          website: honeypot.value.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`The inquiry service returned ${response.status}.`);
      }

      const result = await response.json();
      if (result.success !== true) {
        throw new Error("The inquiry service did not confirm delivery.");
      }

      contactForm.reset();
      formStatus.textContent = "Thank you. Your inquiry has been sent successfully.";
      formStatus.dataset.state = "success";
    } catch (error) {
      console.error("Contact form submission failed:", error);
      formStatus.textContent = "We couldn't send your inquiry. Your details are still here; please try again.";
      formStatus.dataset.state = "error";
    } finally {
      submitButton.disabled = false;
      submitLabel.textContent = "Send inquiry";
      contactForm.removeAttribute("aria-busy");
    }
  });
});
