export default function StringLights() {
  return (
    <div className="lights" aria-hidden="true">
      {Array.from({ length: 14 }).map((_, i) => (
        <b key={i} />
      ))}
    </div>
  );
}
