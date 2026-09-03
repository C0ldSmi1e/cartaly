const TrashIcon = ({ size = 14 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <path d="M3.5 5.5h13" />
    <path d="M8 5.5V4a1.5 1.5 0 0 1 1.5-1.5h1A1.5 1.5 0 0 1 12 4v1.5" />
    <path d="m5.5 5.5.7 10.2a1.8 1.8 0 0 0 1.8 1.7h4a1.8 1.8 0 0 0 1.8-1.7l.7-10.2" />
    <path d="M8.3 9v5.2M11.7 9v5.2" />
  </svg>
);

export { TrashIcon };
