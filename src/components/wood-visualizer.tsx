type WoodVisualizerProps = {
  imageSrc: string;
  name: string;
  quantity: number;
};

const MAX_STACK_ITEMS = 12;

export function WoodVisualizer({ imageSrc, name, quantity }: WoodVisualizerProps) {
  const visibleCount = Math.min(quantity, MAX_STACK_ITEMS);
  const overflowCount = Math.max(quantity - MAX_STACK_ITEMS, 0);

  return (
    <div className="rounded-[2rem] border border-[#A86D38]/15 bg-[linear-gradient(180deg,#fffdf8_0%,#f5f2e9_100%)] p-4 shadow-sm sm:p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#A86D38]">
            Vizualizace množství
          </p>
          <h2 className="text-xl font-black tracking-tight text-[#1E293B]">{name}</h2>
        </div>
        <div className="rounded-full bg-white/90 px-3 py-1 text-sm font-bold text-[#234A33] shadow-sm">
          {quantity} ks
        </div>
      </div>

      <div className="relative flex h-[300px] items-end justify-center overflow-hidden rounded-[1.5rem] border border-white/70 bg-[radial-gradient(circle_at_top,#fdfbf5_0%,#f0e7d7_60%,#eadfce_100%)] px-3 pb-5 pt-10 sm:h-[360px]">
        <div
          aria-hidden
          className="absolute inset-x-6 bottom-5 h-7 rounded-full bg-[#6B4A2F]/15 blur-xl"
        />

        {Array.from({ length: visibleCount }).map((_, index) => {
          const reverseIndex = visibleCount - index - 1;
          const isTopItem = index === visibleCount - 1;

          return (
            <div
              key={`${name}-${index}`}
              className="absolute bottom-8 left-1/2 flex -translate-x-1/2 items-center justify-center"
              style={{
                transform: `translateX(calc(-50% + ${reverseIndex * 16}px)) translateY(-${reverseIndex * 10}px)`,
                zIndex: index + 1,
              }}
            >
              <img
                src={imageSrc}
                alt=""
                loading="lazy"
                draggable={false}
                className="h-24 w-auto select-none object-contain drop-shadow-[0_12px_20px_rgba(107,74,47,0.28)] sm:h-28"
              />
              {isTopItem && overflowCount > 0 ? (
                <div className="absolute -right-3 -top-3 rounded-full bg-[#234A33] px-3 py-1 text-xs font-black text-white shadow-lg">
                  +{overflowCount} more
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
