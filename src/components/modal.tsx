"use client";

const Modal = ({
  ariaLabel,
  onClose,
  children,
}: {
  ariaLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div
    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    onClick={onClose}
  >
    <div
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className="w-full max-w-md rounded-2xl bg-surface p-5 shadow-xl"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="flex size-8 items-center justify-center rounded-full text-muted-fg"
        >
          ✕
        </button>
      </div>
      {children}
    </div>
  </div>
);

export { Modal };
