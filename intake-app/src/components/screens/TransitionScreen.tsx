// Interstitial shown once between the functions track and the values track.
export function TransitionScreen() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-2 py-16 text-center">
      <p className="text-xs font-bold uppercase tracking-wide text-brand">Values</p>
      <h2 className="mt-2 text-2xl font-bold">Now, your values</h2>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed text-muted">
        We’ve got your top list of functions, now we’re going to get your top list of values: these
        are the words that describe what is important to you about yourself, other people, work, and
        culture.
      </p>
    </div>
  );
}
