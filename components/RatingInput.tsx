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
              className="flex h-12 w-12 cursor-pointer items-center justify-center rounded-xl text-line has-[:checked]:text-gold has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-green [&:has(~label_input:checked)]:text-gold"
            >
              <input
                type="radio"
                name="rating"
                value={n}
                required
                defaultChecked={defaultValue === String(n)}
                className="sr-only"
              />
              <Star aria-hidden className="h-9 w-9 fill-current" />
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
