(function () {
  const canvas = document.querySelector("#stack-map-canvas");
  if (canvas && canvas.getContext) {
    const context = canvas.getContext("2d");
    const colors = ["#22d3ee", "#60a5fa", "#a78bfa", "#f59e0b", "#fb7185"];

    function drawStackMap() {
      const bounds = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(420, Math.round(bounds.height));

      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);

      context.globalCompositeOperation = "lighter";
      context.shadowBlur = 22;

      context.globalAlpha = 0.08;
      for (let i = 0; i < 8; i += 1) {
        const x = (width * ((i * 23 + 9) % 100)) / 100;
        const y = (height * ((i * 37 + 13) % 100)) / 100;
        const w = 96 + (i % 3) * 28;
        const h = 20 + (i % 2) * 10;
        context.fillStyle = colors[i % colors.length];
        context.shadowColor = colors[i % colors.length];
        context.fillRect(x - w / 2, y - h / 2, w, h);
      }

      context.globalAlpha = 0.14;
      context.lineWidth = 1.2;
      for (let i = 0; i < 5; i += 1) {
        const y = 58 + i * 72;
        const color = colors[(i + 2) % colors.length];
        context.strokeStyle = color;
        context.shadowColor = color;
        context.beginPath();
        context.moveTo(-40, y + Math.sin(i) * 12);
        context.bezierCurveTo(
          width * 0.28,
          y - 34,
          width * 0.62,
          y + 46,
          width + 40,
          y + ((i % 2) * 28 - 14)
        );
        context.stroke();
      }

      context.shadowBlur = 0;
      context.globalCompositeOperation = "source-over";
      context.globalAlpha = 1;
    }

    drawStackMap();
    window.addEventListener("resize", drawStackMap);
  }

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
