# REVORA racing-language ruleset v2

REVORA uses a deterministic racing-language ruleset for intent detection. It is
versioned as `revora-racing-language-rules-v2` in every radio response so a
stored result can always be traced to the rules that produced it.

This is a documented rules engine, not a statistically calibrated probability
model. Its `confidence` value expresses rule strength and corroboration and must
not be interpreted as empirical model accuracy.

## Confidence calculation

Each intent has a reviewed base confidence. A multi-word phrase adds `0.04`
because it is more specific than a single token. Every additional matching term
adds `0.06`, capped at `0.12`. The final value is capped at `0.95`.

| Intent | Base confidence | Recognized language |
| --- | ---: | --- |
| `URGENT_REQUEST` | 0.82 | box this lap, box now, urgent, immediately, stop the car |
| `STRATEGY_FRUSTRATION` | 0.66 | why are we, strategy, too late, should have, still on |
| `TYRE_COMPLAINT` | 0.70 | tyre, tire, fronts are gone, rears are gone |
| `GRIP_ISSUE` | 0.72 | grip, sliding, traction, no rear, no front |
| `HANDLING_CONCERN` | 0.72 | understeer, oversteer, balance, can't control, cannot control, moving around |
| `PERFORMANCE_DIFFICULTY` | 0.64 | losing time, slow, pace, struggling, difficult |

Risk and racing-intelligence consumers ignore intent matches below `0.55`.
Changes to phrases, bases, bonuses, or thresholds require a classifier-version
increment and corresponding regression tests. A future learned classifier must
publish validation-set precision/recall before replacing this ruleset.
