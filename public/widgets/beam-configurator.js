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
        { value: "8x8", label: "8 × 8 cm" },
        { value: "10x10", label: "10 × 10 cm" },
        { value: "12x12", label: "12 × 12 cm" },
        { value: "15x15", label: "15 × 15 cm" },
      ],
      lengths: [
        { value: "300", label: "300 cm" },
        { value: "400", label: "400 cm" },
        { value: "500", label: "500 cm" },
        { value: "600", label: "600 cm" },
      ],
      prices: {
        "8x8": { 300: 198, 400: 272, 500: 290, 600: 348 },
        "10x10": { 300: 338, 400: 450, 500: 473, 600: 568 },
        "12x12": { 300: 489, 400: 612, 500: 739, 600: 888 },
        "15x15": { 300: 690, 400: 920, 500: 1145, 600: 1375 },
      },
    },
  };

  const IMAGE_KEYS = ["one", "two", "three", "five", "seven", "eleven", "eighteen"];

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

  function preloadImages(images) {
    IMAGE_KEYS.forEach((key) => {
      const image = new Image();
      image.decoding = "async";
      image.src = images[key];
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
    const firstLength = options.catalog.lengths[0]?.value || "300";

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

    let frameId = 0;

    function render() {
      frameId = 0;

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
      quantityRange.setAttribute("aria-valuetext", `${snapshot.quantity} kusů`);
      quantityInput.setAttribute("aria-valuenow", String(snapshot.quantity));

      summaryOutput.textContent = `${snapshot.profileLabel} · ${snapshot.lengthLabel} | ${snapshot.quantity} ks`;
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

      images.forEach((image) => {
        const isActive = image.getAttribute("data-image-key") === snapshot.imageKey;
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

    function scheduleRender() {
      if (frameId) {
        return;
      }

      frameId = window.requestAnimationFrame(render);
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
      scheduleRender();
    });

    lengthSelect.addEventListener("change", function () {
      state.length = lengthSelect.value;
      scheduleRender();
    });

    quantityRange.addEventListener("input", function () {
      state.quantity = clamp(Number(quantityRange.value), options.slider.min, options.maxQuantity);
      scheduleRender();
    });

    quantityInput.addEventListener("input", function () {
      if (quantityInput.value === "") {
        return;
      }

      state.quantity = clamp(Number(quantityInput.value), options.slider.min, options.maxQuantity);
      scheduleRender();
    });

    quantityInput.addEventListener("blur", function () {
      if (!quantityInput.value) {
        state.quantity = options.slider.min;
        scheduleRender();
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
        scheduleRender();
      },
      setProfile: function (profile) {
        state.profile = profile;
        scheduleRender();
      },
      setLength: function (length) {
        state.length = length;
        scheduleRender();
      },
      destroy: function () {
        if (frameId) {
          window.cancelAnimationFrame(frameId);
        }

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
