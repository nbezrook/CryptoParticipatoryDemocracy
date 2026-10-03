# Model specification · version 1.0.0

## Institutions and scope

The model is a static, one-period federation with six councils and 120 members. Every member receives the same credit entitlement. Credits are accounting budgets: they cannot be transferred, traded, carried into another period, or exchanged for governance rights in this model.

Council preferences differ, but are deterministic under a given seed. The simulation has no clocks, external data, or unseeded randomness. A Mulberry32-style generator produces preference shares; exporting the model version and complete configuration identifies the experiment.

This prototype represents proposal revision and resource accounting. It omits the wider institutions of participatory economics: workplace democracy, balanced job complexes, remuneration by effort and sacrifice, need-based support, and participatory determination of investment and social costs.

## Goods and fixed production recipes

Final goods are vegetable baskets, bread loaves, and household electricity in kWh. Recipes include the upstream inputs required to deliver these goods. They are reduced-form requirements, not separate simulations of each enterprise's production decisions.

| Resource | Vegetable basket | Bread loaf | Household kWh | Baseline capacity |
| --- | ---: | ---: | ---: | ---: |
| Effective farm labor, hours | 0.6 | 0.4 | 0 | 210 |
| Bakery labor, hours | 0 | 0.5 | 0 | 150 |
| Shared electricity, kWh | 0.2 | 0.3 | 1 | 360 |
| Harvested grain, kg | 0 | 0.8 | 0 | 240 |

Bread includes the farm labor associated with its grain input. Harvested grain is also subject to an independent availability constraint. Shared electricity must cover household use and the farm/bakery inputs.

The energy scenario reduces electricity capacity. The harvest scenario reduces both effective farm labor capacity and grain availability. Both changes apply from round zero; they are comparative supply scenarios, not shocks introduced midway through a dynamic economy. Preferences and budgets stay identical when supply changes under the same seed.

## Demand and price updates

Let `A[r,g]` denote resource requirements, `K[r]` capacities, `B[c]` council budgets, and `w[c,g]` positive preference shares summing to one for each council.

Base indicative prices are `[1, 1.5, 0.7]` credits per unit. They are illustrative fixed accounting costs, not empirically estimated labor values. Nonnegative scarcity premiums `lambda[r]` start at zero.

For each recorded round:

```text
p[g] = basePrice[g] + sum_r A[r,g] * lambda[r]
q[c,g] = B[c] * w[c,g] / p[g]
D[g] = sum_c q[c,g]
requested[r] = sum_g A[r,g] * D[g]
utilization[r] = requested[r] / K[r]
```

Council proposals are Cobb–Douglas budget demands. Their expenditure equals their budget at the current indicative prices. They do not measure minimum nutritional, energy, or other needs.

Unless convergence has occurred or the update limit has been reached:

```text
lambdaNext[r] = max(0, lambda[r] + adjustmentRate * (utilization[r] - 1))
```

This is a normalized, projected scarcity-feedback heuristic. Its convergence is observed for the tested configurations; it is not claimed to converge for all parameters or production systems. The normalization and adjustment rate set the numerical scale of the update.

## Allocation and convergence are distinct

Each round records a feasible provisional allocation:

```text
alpha = min(1, min_r K[r] / requested[r])
allocated[c,g] = alpha * q[c,g]
```

With fixed nonnegative recipes, this common factor ensures that every allocated resource quantity is within capacity. Allocated expenditure is `alpha * B[c]`, so no council overspends. This proportional rationing rule is simple and explicit; it is not an optimal or needs-prioritized allocation rule.

For each constraint, the convergence residual is:

```text
abs(utilization[r] - 1)       if lambda[r] > 1e-10
max(0, utilization[r] - 1)    otherwise
```

The run converges when the maximum residual is at most the configured tolerance, default 0.008. This checks approximate capacity feasibility and complementarity: a positive scarcity premium should correspond to a nearly full resource. When the maximum update count is reached first, `outcome` is `round-limit`, even though provisional allocations remain feasible.

## Initial-basket quantity index

The council index compares allocation to its unallocated round-zero proposal:

```text
index[c] = exp(sum_g w[c,g] * log(allocated[c,g] / initialProposal[c,g]))
```

Council indices are reported to 12 decimal places to suppress insignificant differences in logarithm/exponential implementations across JavaScript runtimes. They never feed back into price updates or allocations. The displayed federation index is the member-weighted arithmetic mean of council indices. This makes allocation changes visible with a preference-weighted quantity measure. It is not a measure of basic needs met, interpersonal welfare, or a distributional fairness theorem.

## Limits to interpretation

- All goods are divisible; no minimum batch sizes, spoilage, or discrete scheduling are modeled.
- Capacities and production recipes are reported truthfully and remain fixed within a run.
- Preference shares are fixed and proposals are generated automatically. There is no strategic demand reporting, bargaining, or council voting.
- Credits and prices cannot establish that economic claims are true or that entitlements are just.
- There are no savings, inventories, investment, ecological externalities, credit defaults, or external trade.
- Higher prices can reduce proposals until they fit. Capacity feasibility must therefore be interpreted alongside consumption quantities.
- Full run exports reveal preferences and budgets. Privacy and cryptographic verification are future work, not current capabilities.
