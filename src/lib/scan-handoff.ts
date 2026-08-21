// Carries the scanned photo's preview across the client-side redirect so the
// menu page can keep showing it while no dish is ready yet.
type ScanHandoff = { menuId: string; photoUrl: string };

let handoff: ScanHandoff | null = null;

const setScanHandoff = (value: ScanHandoff) => {
  handoff = value;
};

const takeScanHandoff = (menuId: string): string | null => {
  if (handoff?.menuId !== menuId) {
    return null;
  }
  const url = handoff.photoUrl;
  handoff = null;
  return url;
};

export { setScanHandoff, takeScanHandoff };
