(function () {
  const selector = document.querySelector("#software-selector");
  if (selector) {
    selector.addEventListener("submit", function (event) {
      event.preventDefault();
      const category = selector.querySelector("#category").value || "scheduling";
      window.location.href = `/categories/${encodeURIComponent(category)}/`;
    });
  }

  const newsletter = document.querySelector("#newsletter-form");
  if (newsletter) {
    newsletter.addEventListener("submit", function () {
      const status = newsletter.querySelector(".form-status");
      if (status) {
        status.textContent = "Opening the checklist.";
      }
      if (window.gtag) {
        window.gtag("event", "newsletter_signup", {
          event_category: "lead",
          event_label: "software_checklist"
        });
      }
    });
  }

  document.addEventListener("click", function (event) {
    const link = event.target.closest("a[data-track='outbound']");
    if (!link || !window.gtag) return;
    window.gtag("event", "affiliate_click", {
      event_category: "outbound",
      event_label: link.dataset.product || link.href,
      transport_type: "beacon"
    });
  });
})();
