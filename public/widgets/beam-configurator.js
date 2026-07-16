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
      one: "/images/widgets/1TramDIPI_2.webp",
      two: "/images/widgets/2TramDIPI.webp",
      three: "/images/widgets/3TramDIPI.webp",
      five: "/images/widgets/5TramDIPI.webp",
      seven: "/images/widgets/7TramDIPI.webp",
      eleven: "/images/widgets/11TramDIPI.webp",
      eighteen: "/images/widgets/18TramDIPI.webp",
    },
    catalog: {
      profiles: [
        { value: "8x8", label: "8 \u00d7 8 cm" },
        { value: "10x10", label: "10 \u00d7 10 cm" },
        { value: "12x12", label: "12 \u00d7 12 cm" },
        { value: "14x14", label: "14 \u00d7 14 cm" },
        { value: "16x16", label: "16 \u00d7 16 cm" },
        { value: "20x20", label: "20 \u00d7 20 cm" },
      ],
      lengths: [
        { value: "400", label: "400 cm" },
        { value: "500", label: "500 cm" },
      ],
      prices: {
        "8x8": { 400: 272, 500: 290 },
        "10x10": { 400: 450, 500: 473 },
        "12x12": { 400: 612, 500: 739 },
        "14x14": { 400: 741, 500: 926 },
        "16x16": { 400: 1087, 500: 1313 },
        "20x20": { 400: 1512, 500: 1890 },
      },
    },
  };

  const IMAGE_KEYS = ["one", "two", "three", "five", "seven", "eleven", "eighteen"];
  const CHOPPED_IMAGES = {
    one: "/images/widgets/1TramDIPICHOPPED.png",
    two: "/images/widgets/2TramDIPICHOPPED.png",
    three: "/images/widgets/3TramDIPICHOPPED.png",
    five: "/images/widgets/5TramDIPICHOPPED.png",
    seven: "/images/widgets/7TramDIPICHOPPED.webp",
    eleven: "/images/widgets/11TramDIPICHOPPED.webp",
    eighteen: "/images/widgets/18TramDIPICHOPPED.webp",
  };
  const PROFILE_SCALES = {
    "8x8": 0.92,
    "10x10": 0.95,
    "12x12": 0.98,
    "14x14": 1,
    "16x16": 1.04,
    "18x18": 1.04,
    "20x20": 1.08,
  };
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
    if (quantity <= 6) return "five";
    if (quantity <= 10) return "seven";
    if (quantity <= 16) return "eleven";
    return "eighteen";
  }

  function getProfileScale(profile) {
    return PROFILE_SCALES[profile] || 1;
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
    const firstLength = options.catalog.lengths[0]?.value || "400";

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
    populateSelect(lengthSelect, options.catalog.lengths, state.length);

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
        previewStage.style.transform = `scale(${getProfileScale(snapshot.profile)})`;
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
      const hasLength = options.catalog.lengths.some((length) => length.value === state.length);

      if (!hasLength) {
        state.length = options.catalog.lengths[0]?.value || firstLength;
      }
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

    quantityRange.addEventListener("input", function () {
      state.quantity = clamp(Number(quantityRange.value), options.slider.min, options.maxQuantity);
      scheduleRender("quantity");
    });

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
