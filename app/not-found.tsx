// Friendly 404 for unknown products and collections. The demo banner comes from the root layout.
export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-6 py-16 text-center">
      <h1 className="font-display text-2xl font-bold">We couldn&apos;t find that page.</h1>
      <p className="text-ink-secondary">The product or collection you are looking for is not part of this demo.</p>
    </main>
  )
}
