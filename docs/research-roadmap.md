# Research roadmap

## Research question

Can a federation conduct participatory planning with privately held consumption budgets and independently verifiable resource commitments, while keeping political participation independent of wealth?

The current simulator establishes an explicit baseline for experiments. It does not establish novelty, implement cryptographic guarantees, or validate real-world participatory economics.

## Relevant prior work

Start with Albert and Hahnel's *The Political Economy of Participatory Economics* (1991), Hahnel's *Democratic Economic Planning* (2021), Cockshott and Cottrell's *Towards a New Socialism* (1993), and Saros's *Information Technology and Socialist Construction* (2014). These are related but distinct economic approaches; their mechanisms should not be conflated.

For institutional design, consider Ostrom's *Governing the Commons* (1990). For the cryptocurrency connection, investigate Brett Scott's UNRISD paper on cryptocurrency, blockchain, and social and solidarity finance (2016), and Pazaitis, De Filippi, and Kostakis's Backfeed case study (2017).

Useful software precedents, whose project documentation was inspected during initial research:

- [pequod-plus](https://github.com/msszczep/pequod-plus): a participatory planning procedure prototype.
- [ValueFlows](https://github.com/valueflows/valueflows): resource, process, commitment, and event vocabularies.
- [hREA](https://github.com/h-REA/hREA): distributed economic coordination using ValueFlows and Holochain.
- [Backfeed](https://github.com/Backfeed/backfeed-protocol): contribution evaluation and reward protocols.
- [Circles](https://github.com/aboutcircles/circles-contracts-v2): trust-based personal currencies and demurrage.

This is an initial map, not a systematic or fully current literature review. A novelty claim requires a broader review of economic planning, privacy-preserving optimization, community currencies, and distributed accounting.

## Next experiments

1. **Establish economic robustness.** Sweep seeds, entitlement levels, adjustment rates, and capacities. Report nonconvergence and consumption reductions alongside convergence. Compare the planning heuristic with an explicitly specified optimization benchmark.
2. **Add institutional alternatives.** Implement needs-based floors and entitlements, council-controlled revisions, and alternative rationing rules. State the normative assumptions rather than embedding them silently.
3. **Model operational risk.** Add multiple periods, inventories, uncertain production, and late commitments. Keep realized production distinct from signed promises.
4. **Define adversaries.** Introduce duplicate membership claims, unauthorized credit issuance, double reservations, administrator tampering, and strategically false reports. Specify which attacks each mechanism can detect or prevent.
5. **Compare accounting implementations.** Run identical economic rules over a conventional database, a federated signed audit log, and a distributed ledger. Compare auditability, information disclosure, latency, and cost. Do not attribute improvements from changed allocation rules to cryptography.
6. **Add privacy proofs where useful.** Prove budget compliance and authorized issuance without publishing individual balances. Explicitly state membership, issuer, and proof-system trust assumptions. Cryptography cannot prove that a claimed harvest exists without trusted evidence.
7. **Consider a small cooperative pilot.** Co-design governance, appeals, privacy, and recovery processes with participants before using the system to make consequential allocations.

## A defensible contribution

One possible contribution is a reproducible protocol and experiment showing that, under specified assumptions, an implementation prevents unauthorized issuance and duplicate reservations while revealing less individual information than a transparent shared ledger.

Results that show a signed log is sufficient, that privacy costs are too high, or that a planning rule performs poorly are also useful research outcomes. Building a transferable token is not required to test the central question. Nontransferable credits should be described as cryptographic allocation rights if that is what the eventual system implements.
