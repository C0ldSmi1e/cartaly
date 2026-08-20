"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Modal } from "@/src/components/modal";

const ShareModal = ({ onClose }: { onClose: () => void }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const url = window.location.href;

  useEffect(() => {
    QRCode.toDataURL(url, {
      width: 480,
      margin: 1,
      color: { dark: "#241f1bff", light: "#ffffffff" },
    })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [url]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the URL bar still works
    }
  };

  return (
    <Modal ariaLabel="Share" onClose={onClose}>
      <div className="flex flex-col items-center gap-4 pb-2">
        {qrDataUrl && (
          <div className="rounded-xl bg-white p-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR code for this menu" className="size-56" />
          </div>
        )}
        <p className="max-w-full truncate text-xs text-muted-fg">{url}</p>
        <button
          type="button"
          onClick={copyLink}
          className="w-full max-w-xs rounded-full bg-accent px-8 py-3 font-semibold text-white transition-transform active:scale-95"
        >
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>
    </Modal>
  );
};

export { ShareModal };
