import { Star } from 'lucide-react'

// Five radio buttons styled as stars. Pure HTML and CSS: works without JavaScript, by keyboard
// (Tab into the group, arrow keys to move) and with a screen reader ("1 star" ... "5 stars").
// The chosen star and every star before it are filled, using CSS :has().
export function RatingInput({ defaultValue, error }: { defaultValue?: string; error?: string }) {
  return (
    <fieldset className="flex flex-col gap-2" aria-describedby={error ? 'rating-error' : undefined}>
      <legend className="mb-2 text-base font-semibold">How do you rate this chocolate?</legend>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => {
          const label = n === 1 ? '1 star' : `${n} stars`
          return (
            <label
              key={n}
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl text-caramel has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-caramel [&_svg]:fill-transparent [&_svg]:transition-colors hover:[&_svg]:fill-caramel/25 has-[:checked]:[&_svg]:fill-caramel [&:has(~label_input:checked)_svg]:fill-caramel"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                required
                defaultChecked={defaultValue === String(n)}
                className="sr-only"
              />
              {/* Empty stars are a caramel outline (3.4:1 on cream, WCAG 1.4.11); chosen stars fill in. */}
              <Star aria-hidden className="h-9 w-9" strokeWidth={1.75} />
              <span className="sr-only">{label}</span>
            </label>
          )
        })}
      </div>
      {error && (
        <p id="rating-error" className="text-sm font-medium text-red-700">
          {error}
        </p>
      )}
    </fieldset>
  )
}
