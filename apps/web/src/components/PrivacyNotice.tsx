export function PrivacyNotice({ items, title }: { items: readonly string[]; title: string }) {
  return (
    <section className="notice privacy-notice">
      <h2>{title}</h2>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
