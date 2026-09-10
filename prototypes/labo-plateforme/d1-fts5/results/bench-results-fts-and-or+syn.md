# Bench FTS5 (D1) contre variante A (MiniSearch) — 2026-09-09T13:02:30.825Z

Base : https://aec-lab-fts.baoleka.workers.dev ; corpus d29c7422004ab27c ; jeu 1.0.0 ; 0 neuron.

| Configuration | rappel@5 (50 dorées / 20 glossaire / 70) | rappel@10 (70) | hit@5 (70) | hit@10 (70) | MRR (70) | rappel section@3 (70) | interdits top 5 (89) | rappel@5 (89) | latence p50 / p95 (ms) |
|---|---|---|---|---|---|---|---|---|---|
| A-sans-synonymes (MiniSearch, navigateur) | 0,764 / 0,767 / 0,765 | 0,812 | 0,929 | 0,957 | 0,806 | 0,891 | 5 | 0,712 | 0.37 / 0.75 (in-process) |
| A-synonymes-0.25 (MiniSearch, navigateur) | 0,831 / 0,767 / 0,813 | 0,876 | 0,986 | 0,986 | 0,819 | 0,927 | 5 | 0,785 | 0.67 / 3.08 (in-process) |
| fts-and-or+syn (D1 FTS5, Worker) | 0,803 / 0,767 / 0,792 | 0,844 | 0,957 | 0,957 | 0,859 | 0,912 | 5 | 0,772 | 108.2 / 147.7 (HTTP depuis la machine) |

| Configuration | requêtes D1 / question | lignes lues / question (p50 / p95 / max) | durée D1 p50 / p95 (ms) | SQL p50 / p95 (ms) | repli OR utilisé (sur 70) |
|---|---:|---|---|---|---:|
| fts-and-or+syn | 2.61 | 245 / 831 / 1127 | 1.7 / 2.7 | 1.7 / 2.7 | 68 |

## Cache Q/R (`/cache`, table `q_cache`)

| Question | appel 1 | lignes lues / écrites | latence (ms) | appel 2 | lignes lues / écrites | latence (ms) |
|---|---|---|---:|---|---|---:|
