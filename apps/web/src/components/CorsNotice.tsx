export function CorsNotice({ body, title }: { body: string; title: string }) {
  return (
    <section className="notice cors-notice">
      <h2>{title}</h2>
      <p>{body}</p>
    </section>
  );
}
