export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <p className="visually-hidden">Loading films</p>
      <div className="skeleton" style={{ height: 32, width: "60%", marginBottom: 16 }} />
      <ul className="grid" aria-hidden="true">
        {Array.from({ length: 12 }, (_, i) => (
          <li key={i}>
            <div className="skeleton" style={{ aspectRatio: "2 / 3" }} />
          </li>
        ))}
      </ul>
    </div>
  );
}
