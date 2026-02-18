export function TruncationWarning() {
  return (
    <div className="rounded-[2px] bg-cv-warning/10 border border-cv-warning/20 px-4 py-3 text-[12px] text-cv-warning font-light">
      This scan was truncated at 200KB. Full analysis may not be complete.
    </div>
  );
}
