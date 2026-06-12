import { useAnimatedNumber } from '../hooks/useAnimatedNumber'

/**
 * Odometer-style count-up number.
 * format: 'money' | 'int' | 'cy' | custom fn
 */
export default function AnimatedNumber({
  value,
  format = 'int',
  duration = 900,
  delay = 0,
  className = '',
  prefix = '',
  suffix = '',
}) {
  const animated = useAnimatedNumber(value, { duration, delay })

  let text
  if (typeof format === 'function') text = format(animated)
  else if (format === 'money')
    text = animated.toLocaleString('en-US', {
      style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0,
    })
  else if (format === 'cy') text = (Math.round(animated * 10) / 10).toFixed(1)
  else text = Math.round(animated).toLocaleString('en-US')

  return (
    <span className={`tabular ${className}`}>
      {prefix}{text}{suffix}
    </span>
  )
}
