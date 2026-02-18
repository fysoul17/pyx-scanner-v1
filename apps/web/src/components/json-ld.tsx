export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape closing script tags to prevent XSS when injecting DB-sourced values
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
