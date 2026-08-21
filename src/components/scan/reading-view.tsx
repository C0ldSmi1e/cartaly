"use client";

const ReadingView = ({
  photoUrl,
  text,
}: {
  photoUrl: string | null;
  text: string;
}) => (
  <div className="flex flex-col items-center gap-7">
    <div className="relative h-64 w-48 -rotate-2 overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
      {photoUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photoUrl}
          alt="Your menu photo"
          className="size-full object-cover"
        />
      )}
      <div className="animate-sweep" aria-hidden="true">
        <div className="absolute inset-x-0 top-1/2 h-px bg-accent shadow-[0_0_14px_2px_rgba(79,154,110,0.8)]" />
      </div>
    </div>
    <div className="text-center" role="status">
      <p className="font-medium">{text}</p>
      <div className="mt-2 flex justify-center gap-1.5" aria-hidden="true">
        <span className="size-1.5 animate-pulse rounded-full bg-accent" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:200ms]" />
        <span className="size-1.5 animate-pulse rounded-full bg-accent [animation-delay:400ms]" />
      </div>
    </div>
  </div>
);

export { ReadingView };
