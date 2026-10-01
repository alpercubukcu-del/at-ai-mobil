# Degree history V17.4.6

A personal performance is compared with the median winner time for that historical city, surface, distance, full class and age/breed group. Its residual, scaled by distance, is carried to the target condition reference. All references precede their cutoff; historical references also precede the historical performance. Missing class support is marked and downweighted; unknown breed/age group has no mixed reference. Different surfaces are excluded rather than assigned an invented conversion.

Recent performances receive exponentially more weight. A robust pairwise development slope requires at least three normalized personal performances and is shrunk and bounded. It is a conservative heuristic, not a measured causal age coefficient. Kilo adjustments activate only with at least 30 comparable consecutive performance pairs across 10 horses, a positive bounded median kg slope and limited dispersion. These observational estimates are not causal guarantees.

Historical workouts are joined to the intervals between personal races and to the interval after the last race. Comparable splits require matching city, surface and workout type. The observed changes are stored in `workoutDevelopment`. Without measured effort/tempo, they affect uncertainty, not an invented seconds correction. Workout dates are filtered again after local archive merge, protecting both G and D on historical reruns. Workout failures still get two retries and prevent final saves.

No personal performance means `predictedSec: null`, `referenceOnly: true`, no D score and no D rank. The shared reference remains separately visible. Sparse and unnormalized histories get wider heuristic intervals. `confidence` is an evidence score out of 100, not a probability or validated coverage rate. UI labels reflect that distinction. No accuracy improvement is claimed without a chronological multi-race holdout evaluation.

The new model keeps the existing pre-race capture/locking and calibration behavior. Calibration samples from the legacy model cannot adjust the new model. The surface compatibility layer cannot overwrite normalized predictions. F/O/G/D weights, the nine column coupon templates and the independent tenth method remain unchanged.

Validation command:

```sh
node --test tests/*.test.mjs fogd-nine-coupon-core.test.mjs fogd-condition-core.test.mjs
```

Build from a clean source checkout: `node build-runtime-v17-clean.cjs`. The legacy build chain mutates some source inputs; do not commit those unrelated generated migrations or reuse those mutated inputs for another build.

## V17.4.7 timeout correction

Degree preparation no longer requests horse/workout contexts for every race. Network context requests belong to the selected DNA race's existing three-worker fetch stage, with the same retries and failure-save protection. Once contexts complete, workouts are attached idempotently to the copied final degree metadata and uncertainty interval without changing predicted seconds, calibration or rank. The degree stage retains its 60-second protection; unrelated races cannot consume that deadline with workout requests.
