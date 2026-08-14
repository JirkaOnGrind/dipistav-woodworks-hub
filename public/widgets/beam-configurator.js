(function () {
  const DEFAULTS = {
    locale: "cs-CZ",
    currency: "CZK",
    slider: {
      min: 1,
      max: 25,
    },
    maxQuantity: 150,
    images: {
      one: "/images/illustrations/configurator-v11/beam-1-master-v11.webp",
      two: "/images/illustrations/configurator-v11/beam-2-master-v11.webp",
      three: "/images/illustrations/configurator-v11/beam-3-4-master-v11.webp",
      five: "/images/illustrations/configurator-v11/beam-5-8-master-v11.webp",
      nine: "/images/illustrations/configurator-v11/beam-9-11-master-v11.webp",
      twelve: "/images/illustrations/configurator-v11/beam-12-15-master-v11.webp",
      eighteen: "/images/illustrations/configurator-v11/beam-16plus-master-v11.webp",
    },
    catalog: {
      profiles: [
        { value: "8x8", label: "8 \u00d7 8 cm" },
        { value: "8x10", label: "8 \u00d7 10 cm" },
        { value: "8x12", label: "8 \u00d7 12 cm" },
        { value: "8x14", label: "8 \u00d7 14 cm" },
        { value: "8x16", label: "8 \u00d7 16 cm" },
        { value: "8x20", label: "8 \u00d7 20 cm" },
        { value: "10x10", label: "10 \u00d7 10 cm" },
        { value: "10x12", label: "10 \u00d7 12 cm" },
        { value: "10x14", label: "10 \u00d7 14 cm" },
        { value: "10x16", label: "10 \u00d7 16 cm" },
        { value: "10x18", label: "10 \u00d7 18 cm" },
        { value: "10x20", label: "10 \u00d7 20 cm" },
        { value: "12x12", label: "12 \u00d7 12 cm" },
        { value: "12x14", label: "12 \u00d7 14 cm" },
        { value: "12x16", label: "12 \u00d7 16 cm" },
        { value: "12x18", label: "12 \u00d7 18 cm" },
        { value: "14x14", label: "14 \u00d7 14 cm" },
        { value: "14x16", label: "14 \u00d7 16 cm" },
        { value: "16x16", label: "16 \u00d7 16 cm" },
        { value: "16x18", label: "16 \u00d7 18 cm" },
        { value: "16x20", label: "16 \u00d7 20 cm" },
        { value: "20x20", label: "20 \u00d7 20 cm" },
      ],
      lengths: [
        { value: "400", label: "400 cm" },
        { value: "500", label: "500 cm" },
        { value: "600", label: "600 cm" },
        { value: "700", label: "700 cm" },
      ],
      prices: {
        "8x8": { 400: 302, 500: 322 },
        "8x10": { 400: 322, 500: 402 },
        "8x12": { 400: 453 },
        "8x14": { 400: 511, 500: 661 },
        "8x16": { 400: 604, 500: 755, 600: 960, 700: 1048 },
        "8x20": { 400: 819, 500: 840 },
        "10x10": { 400: 500, 500: 525, 600: 678 },
        "10x12": { 400: 566, 500: 708 },
        "10x14": { 400: 661, 500: 826, 600: 1025 },
        "10x16": { 400: 755, 500: 944, 600: 1200, 700: 1568 },
        "10x18": { 400: 850, 500: 1062, 600: 1177, 700: 1714 },
        "10x20": { 400: 912, 500: 1050, 600: 1680 },
        "12x12": { 400: 680, 500: 821 },
        "12x14": { 400: 598, 500: 806, 600: 1189 },
        "12x16": { 400: 906, 500: 1133, 600: 1544 },
        "12x18": { 400: 769, 500: 1318, 600: 1529 },
        "14x14": { 400: 823, 500: 1029, 600: 1352 },
        "14x16": { 400: 1093, 500: 1389, 600: 1693 },
        "16x16": { 400: 1208, 500: 1459, 600: 2058 },
        "16x18": { 400: 1025, 500: 1637 },
        "16x20": { 400: 1600, 500: 1888, 600: 2419 },
        "20x20": { 400: 1680, 500: 2100 },
      },
    },
  };

  const IMAGE_KEYS = ["one", "two", "three", "five", "nine", "twelve", "eighteen"];
  const CHOPPED_IMAGES = {};
  const RECOIL_DURATION_MS = 420;

  function mergeOptions(base, override) {
    const merged = { ...base, ...override };

    merged.slider = {
      ...base.slider,
      ...(override && override.slider ? override.slider : {}),
    };

    merged.images = {
      ...base.images,
      ...(override && override.images ? override.images : {}),
    };

    merged.catalog = {
      ...base.catalog,
      ...(override && override.catalog ? override.catalog : {}),
    };

    if (base.catalog && override && override.catalog) {
      merged.catalog.profiles = override.catalog.profiles || base.catalog.profiles;
      merged.catalog.lengths = override.catalog.lengths || base.catalog.lengths;
      merged.catalog.prices = {
        ...base.catalog.prices,
        ...(override.catalog.prices || {}),
      };
    }

    return merged;
  }

  function parseConfig(root) {
    const jsonNode = root.querySelector("[data-beam-config]");

    if (!jsonNode) {
      return DEFAULTS;
    }

    try {
      return mergeOptions(DEFAULTS, JSON.parse(jsonNode.textContent || "{}"));
    } catch (_error) {
      return DEFAULTS;
    }
  }

  function clamp(value, min, max) {
    if (Number.isNaN(value)) {
      return min;
    }

    return Math.min(Math.max(value, min), max);
  }

  function getVisualKey(quantity) {
    if (quantity <= 1) return "one";
    if (quantity === 2) return "two";
    if (quantity <= 4) return "three";
    if (quantity <= 8) return "five";
    if (quantity <= 11) return "nine";
    if (quantity <= 15) return "twelve";
    return "eighteen";
  }

  function getStageTransform(profile, length) {
    const dimensions = profile.split("x").map(Number);
    const width = dimensions[0] || 14;
    const height = dimensions[1] || width;
    const areaScale = clamp(Math.sqrt((width * height) / (14 * 14)), 0.88, 1.12);
    const ratio = width / height;
    const profileX = clamp(Math.sqrt(ratio), 0.94, 1.06);
    const profileY = clamp(1 / Math.sqrt(ratio), 0.94, 1.06);
    const lengthScale = { 400: 0.82, 500: 1, 600: 1.1, 700: 1.18 }[length] || 1;
    const scaleX = clamp(areaScale * lengthScale * profileX, 0.78, 1.18);
    const scaleY = clamp(areaScale * profileY, 0.82, 1.16);
    return `scaleX(${scaleX}) scaleY(${scaleY})`;
  }

  function getLengthsForProfile(profile, options) {
    const prices = options.catalog.prices[profile] || {};
    return options.catalog.lengths.filter((length) =>
      Object.prototype.hasOwnProperty.call(prices, length.value),
    );
  }

  function getImageSrc(imageKey, images, length) {
    if (length === "400" && CHOPPED_IMAGES[imageKey]) {
      return CHOPPED_IMAGES[imageKey];
    }

    return images[imageKey];
  }

  function preloadImages(images) {
    IMAGE_KEYS.forEach((key) => {
      const image = new Image();
      image.decoding = "async";
      image.src = images[key];

      if (CHOPPED_IMAGES[key]) {
        const choppedImage = new Image();
        choppedImage.decoding = "async";
        choppedImage.src = CHOPPED_IMAGES[key];
      }
    });
  }

  function createOption(option) {
    const element = document.createElement("option");
    element.value = option.value;
    element.textContent = option.label;
    return element;
  }

  function formatCurrency(value, locale, currency) {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  }

  function populateSelect(select, options, selectedValue) {
    select.replaceChildren(...options.map(createOption));
    select.value = selectedValue;
  }

  function getSnapshot(state, options) {
    const unitPrice = options.catalog.prices[state.profile]?.[state.length] || 0;
    const totalPrice = unitPrice * state.quantity;
    const profileLabel =
      options.catalog.profiles.find((profile) => profile.value === state.profile)?.label ||
      state.profile;
    const lengthLabel =
      options.catalog.lengths.find((length) => length.value === state.length)?.label ||
      state.length;

    return {
      imageKey: getVisualKey(state.quantity),
      length: state.length,
      lengthLabel,
      profile: state.profile,
      profileLabel,
      quantity: state.quantity,
      totalPrice,
      unitPrice,
    };
  }

  function init(root, runtimeOptions) {
    if (!root || root.__beamConfigurator) {
      return root && root.__beamConfigurator ? root.__beamConfigurator : null;
    }

    const options = mergeOptions(parseConfig(root), runtimeOptions || {});
    preloadImages(options.images);

    const profileSelect = root.querySelector("[data-beam-profile]");
    const lengthSelect = root.querySelector("[data-beam-length]");
    const quantityRange = root.querySelector("[data-beam-quantity-range]");
    const quantityInput = root.querySelector("[data-beam-quantity-input]");
    const quantityOutput = root.querySelector("[data-beam-quantity-output]");
    const summaryOutput = root.querySelector("[data-beam-summary]");
    const unitPriceOutput = root.querySelector("[data-beam-unit-price]");
    const totalPriceOutput = root.querySelector("[data-beam-total-price]");
    const addButton = root.querySelector("[data-beam-add]");
    const previewMotion = root.querySelector("[data-beam-preview-motion]");
    const previewStage = root.querySelector("[data-beam-preview-stage]");
    const images = Array.from(root.querySelectorAll("[data-beam-image]"));

    if (
      !profileSelect ||
      !lengthSelect ||
      !quantityRange ||
      !quantityInput ||
      !quantityOutput ||
      !summaryOutput ||
      !unitPriceOutput ||
      !totalPriceOutput ||
      images.length === 0
    ) {
      return null;
    }

    const firstProfile = options.catalog.profiles[0]?.value || "8x8";
    const firstLength = getLengthsForProfile(firstProfile, options)[0]?.value || "400";

    const state = {
      profile: root.getAttribute("data-default-profile") || firstProfile,
      length: root.getAttribute("data-default-length") || firstLength,
      quantity: clamp(
        Number(root.getAttribute("data-default-quantity") || quantityInput.value || 1),
        options.slider.min,
        options.maxQuantity,
      ),
    };

    populateSelect(profileSelect, options.catalog.profiles, state.profile);
    populateSelect(lengthSelect, getLengthsForProfile(state.profile, options), state.length);

    quantityRange.min = String(options.slider.min);
    quantityRange.max = String(options.slider.max);
    quantityInput.min = String(options.slider.min);
    quantityInput.max = String(options.maxQuantity);

    let renderFrameId = 0;
    let recoilFrameId = 0;
    let recoilTimeoutId = 0;
    let pendingRenderReason = "init";

    function stopRecoil() {
      if (recoilFrameId) {
        window.cancelAnimationFrame(recoilFrameId);
        recoilFrameId = 0;
      }

      if (recoilTimeoutId) {
        window.clearTimeout(recoilTimeoutId);
        recoilTimeoutId = 0;
      }

      if (previewMotion) {
        previewMotion.classList.remove("is-recoiling");
      }
    }

    function render() {
      renderFrameId = 0;

      const renderReason = pendingRenderReason;
      pendingRenderReason = "sync";

      const snapshot = getSnapshot(state, options);
      const rangeValue = Math.min(snapshot.quantity, options.slider.max);
      const progress =
        ((rangeValue - options.slider.min) / (options.slider.max - options.slider.min)) * 100;

      profileSelect.value = snapshot.profile;
      lengthSelect.value = snapshot.length;
      quantityRange.value = String(rangeValue);
      quantityInput.value = String(snapshot.quantity);
      quantityOutput.textContent = `${snapshot.quantity} ks`;
      quantityRange.style.setProperty("--beam-range-progress", `${progress}%`);
      quantityRange.setAttribute("aria-valuemin", String(options.slider.min));
      quantityRange.setAttribute("aria-valuemax", String(options.slider.max));
      quantityRange.setAttribute("aria-valuenow", String(rangeValue));
      quantityRange.setAttribute("aria-valuetext", `${snapshot.quantity} kus\u016f`);
      quantityInput.setAttribute("aria-valuenow", String(snapshot.quantity));

      summaryOutput.textContent = `${snapshot.profileLabel} \u00b7 ${snapshot.lengthLabel} | ${snapshot.quantity} ks`;
      unitPriceOutput.textContent = formatCurrency(
        snapshot.unitPrice,
        options.locale,
        options.currency,
      );
      totalPriceOutput.textContent = formatCurrency(
        snapshot.totalPrice,
        options.locale,
        options.currency,
      );

      if (previewStage) {
        previewStage.style.transform = getStageTransform(snapshot.profile, snapshot.length);
      }

      if (renderReason === "profile" && previewMotion) {
        stopRecoil();

        recoilFrameId = window.requestAnimationFrame(function () {
          previewMotion.classList.add("is-recoiling");
          recoilFrameId = 0;

          recoilTimeoutId = window.setTimeout(function () {
            previewMotion.classList.remove("is-recoiling");
            recoilTimeoutId = 0;
          }, RECOIL_DURATION_MS);
        });
      } else {
        stopRecoil();
      }

      images.forEach((image) => {
        const imageKey = image.getAttribute("data-image-key");
        const isActive = imageKey === snapshot.imageKey;

        if (imageKey && options.images[imageKey]) {
          image.src = getImageSrc(imageKey, options.images, snapshot.length);
        }

        image.classList.toggle("is-active", isActive);
        image.setAttribute("aria-hidden", isActive ? "false" : "true");
      });

      if (addButton) {
        addButton.dataset.profile = snapshot.profile;
        addButton.dataset.length = snapshot.length;
        addButton.dataset.quantity = String(snapshot.quantity);
      }

      root.dispatchEvent(
        new CustomEvent("beamconfigurator:change", {
          bubbles: true,
          detail: snapshot,
        }),
      );
    }

    function scheduleRender(reason) {
      pendingRenderReason = reason || pendingRenderReason;

      if (renderFrameId) {
        return;
      }

      renderFrameId = window.requestAnimationFrame(render);
    }

    function syncLengthValue() {
      const availableLengths = getLengthsForProfile(state.profile, options);
      const hasLength = availableLengths.some((length) => length.value === state.length);

      if (!hasLength) {
        state.length = availableLengths[0]?.value || firstLength;
      }

      populateSelect(lengthSelect, availableLengths, state.length);
    }

    profileSelect.addEventListener("change", function () {
      state.profile = profileSelect.value;
      syncLengthValue();
      scheduleRender("profile");
    });

    lengthSelect.addEventListener("change", function () {
      state.length = lengthSelect.value;
      scheduleRender("length");
    });

    function syncQuantityRange() {
      state.quantity = clamp(Number(quantityRange.value), options.slider.min, options.maxQuantity);
      scheduleRender("quantity");
    }

    quantityRange.addEventListener("input", syncQuantityRange);
    quantityRange.addEventListener("change", syncQuantityRange);

    quantityInput.addEventListener("input", function () {
      if (quantityInput.value === "") {
        return;
      }

      state.quantity = clamp(Number(quantityInput.value), options.slider.min, options.maxQuantity);
      scheduleRender("quantity");
    });

    quantityInput.addEventListener("blur", function () {
      if (!quantityInput.value) {
        state.quantity = options.slider.min;
        scheduleRender("quantity");
      }
    });

    if (addButton) {
      addButton.addEventListener("click", function () {
        root.dispatchEvent(
          new CustomEvent("beamconfigurator:add", {
            bubbles: true,
            detail: getSnapshot(state, options),
          }),
        );
      });
    }

    render();

    const api = {
      getState: function () {
        return getSnapshot(state, options);
      },
      setQuantity: function (quantity) {
        state.quantity = clamp(Number(quantity), options.slider.min, options.maxQuantity);
        scheduleRender("quantity");
      },
      setProfile: function (profile) {
        state.profile = profile;
        syncLengthValue();
        scheduleRender("profile");
      },
      setLength: function (length) {
        state.length = length;
        scheduleRender("length");
      },
      destroy: function () {
        if (renderFrameId) {
          window.cancelAnimationFrame(renderFrameId);
        }

        stopRecoil();
        delete root.__beamConfigurator;
      },
    };

    root.__beamConfigurator = api;
    return api;
  }

  function initAll(scope, options) {
    const roots = (scope || document).querySelectorAll("[data-beam-configurator]");
    return Array.from(roots).map(function (root) {
      return init(root, options);
    });
  }

  window.BeamConfigurator = {
    defaults: DEFAULTS,
    init: init,
    initAll: initAll,
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      initAll(document);
    });
  } else {
    initAll(document);
  }
})();
