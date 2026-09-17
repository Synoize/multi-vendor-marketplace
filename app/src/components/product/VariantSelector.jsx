import { useMemo } from "react";

const COLOR_KEYS = ["color", "colour", "shade"];

function titleCase(str) {
  return str ? String(str).charAt(0).toUpperCase() + String(str).slice(1) : str;
}

function isColorKey(key) {
  const k = String(key).toLowerCase();

  return COLOR_KEYS.includes(k) || k.includes("color") || k.includes("colour");
}

function isCssColor(value) {
  if (typeof document === "undefined") return false;

  try {
    const el = document.createElement("div");
    el.style.color = String(value);
    return el.style.color !== "";
  } catch {
    return false;
  }
}

function toAttrs(variant) {
  const raw =
    variant &&
    typeof variant === "object" &&
    variant.attributes &&
    typeof variant.attributes === "object"
      ? variant.attributes
      : {};

  return Object.fromEntries(
    Object.entries(raw).map(([k, val]) => [k, String(val)]),
  );
}

export default function VariantSelector({
  variants = [],
  selectedVariant = null,
  onSelect,
  compact = false,
}) {
  const normalized = useMemo(
    () =>
      variants.map((v) => ({
        v,
        attrs: toAttrs(v),
      })),
    [variants],
  );

  const selectedAttrs = useMemo(
    () => toAttrs(selectedVariant),
    [selectedVariant],
  );

  const groups = useMemo(() => {
    const keyOrder = [];
    const valueMap = new Map();

    for (const { v, attrs } of normalized) {
      for (const [key, value] of Object.entries(attrs)) {
        if (!valueMap.has(key)) {
          valueMap.set(key, new Map());
          keyOrder.push(key);
        }

        const vm = valueMap.get(key);

        if (!vm.has(value)) {
          vm.set(value, {
            value,
            image: v?.image || null,
          });
        }
      }
    }

    const score = (key) =>
      isColorKey(key) ? 0 : String(key).toLowerCase() === "size" ? 1 : 2;

    keyOrder.sort((a, b) => score(a) - score(b));

    return keyOrder.map((key) => ({
      key,
      label: titleCase(key),
      options: Array.from(valueMap.get(key).values()).map((opt) => {
        const selected = selectedAttrs[key] === opt.value;

        let available = false;
        let stock = 0;
        let inStock = false;

        for (const { v, attrs } of normalized) {
          if (attrs[key] !== opt.value) continue;

          let ok = true;

          for (const [k, val] of Object.entries(selectedAttrs)) {
            if (k === key) continue;

            if (attrs[k] !== undefined && attrs[k] !== val) {
              ok = false;
              break;
            }
          }

          if (ok) {
            available = true;
            if (Number(v?.stock) > 0) inStock = true;
            if (!stock) stock = Number(v?.stock ?? 0);
          }
        }

        return {
          ...opt,
          selected,
          available,
          outOfStock: available && !inStock,
          stock,
        };
      }),
    }));
  }, [normalized, selectedAttrs]);

  if (!normalized.length) return null;

  const handleClick = (key, value) => {
    const option = groups
      .find((g) => g.key === key)
      ?.options.find((o) => o.value === value);

    if (option && (option.outOfStock || !option.available)) return;

    const next = { ...selectedAttrs, [key]: value };

    if (selectedAttrs[key] === value) {
      delete next[key];
    }

    if (!Object.keys(next).length) {
      onSelect(null);
      return;
    }

    let matches = normalized.filter(({ attrs }) =>
      Object.entries(next).every(([k, val]) => attrs[k] === val),
    );

    if (!matches.length) {
      matches = normalized.filter(({ attrs }) => attrs[key] === value);
    }

    if (!matches.length) {
      onSelect(null);
      return;
    }

    const target = matches.find(({ v }) => Number(v?.stock) > 0) || matches[0];

    onSelect({
      ...target.v,
      attributes: { ...next },
    });
  };

  return (
    <div className={compact ? "space-y-4" : "space-y-6"}>
      {groups.map((group) => {
        const colorKey = isColorKey(group.key);

        return (
          <section key={group.key}>
            {/* Header */}
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold text-slate-900">
                {group.label}:
              </span>

              {selectedAttrs[group.key] && (
                <span className="text-sm text-slate-700">
                  {selectedAttrs[group.key]}
                </span>
              )}
            </div>

            {/* COLOR SELECTOR */}
            {colorKey ? (
              <div className="flex flex-wrap gap-3">
                {group.options.map((opt) => {
                  const disabled = !opt.available || opt.outOfStock;
                  const selected = opt.selected;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleClick(group.key, opt.value)}
                      aria-label={`Color ${opt.value}`}
                      aria-pressed={selected}
                      title={
                        opt.outOfStock
                          ? `${opt.value} - Currently unavailable`
                          : opt.value
                      }
                      className={`
                        group relative
                        flex flex-col items-center
                        gap-1.5
                        rounded-lg
                        transition-all
                        ${
                          disabled
                            ? "cursor-not-allowed opacity-40"
                            : "cursor-pointer"
                        }
                      `}
                    >
                      {/* Swatch */}
                      <span
                        className={`
                          relative
                          flex
                          h-14
                          w-14
                          items-center
                          justify-center
                          overflow-hidden
                          rounded-md
                          border
                          bg-white
                          transition-all
                          ${
                            selected
                              ? "border-primary "
                              : "border-slate-300 group-hover:border-slate-400"
                          }
                        `}
                      >
                        {opt.image ? (
                          <img
                            src={opt.image}
                            alt={opt.value}
                            className={`
                              h-full
                              w-full
                              object-cover
                              ${disabled ? "grayscale" : ""}
                            `}
                          />
                        ) : isCssColor(opt.value) ? (
                          <span
                            className={`h-10 w-10 rounded-full border border-slate-300 ${disabled ? "grayscale opacity-50" : ""}`}
                            style={{
                              backgroundColor: String(opt.value),
                            }}
                          />
                        ) : (
                          <span
                            className={`px-1 text-[10px] font-medium text-center ${disabled ? "text-slate-400" : "text-slate-700"}`}
                          >
                            {opt.value}
                          </span>
                        )}

                        {/* Selected check */}
                        {selected && (
                          <span className="absolute bottom-0 right-0 flex h-4 w-4 items-center justify-center rounded-tl-md bg-primary text-[10px] font-bold text-white">
                            ✓
                          </span>
                        )}

                        {/* Out of stock line */}
                        {opt.outOfStock && (
                          <span className="absolute left-1/2 top-1/2 h-px w-16 -translate-x-1/2 -translate-y-1/2 rotate-[-45deg] bg-slate-500" />
                        )}
                      </span>

                      {/* Color name */}
                      <span
                        className={`
                          max-w-[70px]
                          truncate
                          text-center
                          text-xs
                          ${
                            disabled
                              ? "text-slate-400"
                              : selected
                                ? "font-semibold text-slate-900"
                                : "text-slate-700"
                          }
                        `}
                      >
                        {opt.value}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              /* SIZE / OTHER ATTRIBUTES */
              <div className="flex flex-wrap gap-2">
                {group.options.map((opt) => {
                  const disabled = !opt.available || opt.outOfStock;
                  const selected = opt.selected;

                  return (
                    <button
                      key={opt.value}
                      type="button"
                      disabled={disabled}
                      onClick={() => handleClick(group.key, opt.value)}
                      aria-label={`${group.label} ${opt.value}`}
                      aria-pressed={selected}
                      title={
                        opt.outOfStock
                          ? `${opt.value} - Currently unavailable`
                          : opt.value
                      }
                      className={`
                        relative
                        min-w-[56px]
                        rounded-md
                        border
                        px-4
                        py-1.5
                        text-sm
                        font-medium
                        transition-all
                        ${
                          disabled
                            ? "border-slate-200 text-slate-400 bg-slate-50 line-through cursor-not-allowed"
                            : selected
                              ? "border-primary bg-primary-50 text-primary "
                              : "border-slate-300 bg-white text-slate-900 hover:border-slate-400"
                        }
                        ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
                      `}
                    >
                      <span>{opt.value}</span>

                      {/* Selected check */}
                      {selected && (
                        <span className="absolute -right-1.5 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[9px] text-white">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
