# Bench FTS5 (D1) contre variante A (MiniSearch) — 2026-09-09T12:59:55.123Z

Base : https://aec-lab-fts.baoleka.workers.dev ; corpus d29c7422004ab27c ; jeu 1.0.0 ; 0 neuron.

| Configuration | rappel@5 (50 dorées / 20 glossaire / 70) | rappel@10 (70) | hit@5 (70) | hit@10 (70) | MRR (70) | rappel section@3 (70) | interdits top 5 (89) | rappel@5 (89) | latence p50 / p95 (ms) |
|---|---|---|---|---|---|---|---|---|---|
| A-sans-synonymes (MiniSearch, navigateur) | 0,764 / 0,767 / 0,765 | 0,812 | 0,929 | 0,957 | 0,806 | 0,891 | 5 | 0,712 | 0.37 / 0.75 (in-process) |
| A-synonymes-0.25 (MiniSearch, navigateur) | 0,831 / 0,767 / 0,813 | 0,876 | 0,986 | 0,986 | 0,819 | 0,927 | 5 | 0,785 | 0.67 / 3.08 (in-process) |
| fts-and-or (D1 FTS5, Worker) | 0,781 / 0,754 / 0,773 | 0,818 | 0,943 | 0,943 | 0,822 | 0,891 | 5 | 0,738 | 73.2 / 94.3 (HTTP depuis la machine) |
| fts-or (D1 FTS5, Worker) | 0,781 / 0,754 / 0,773 | 0,818 | 0,943 | 0,943 | 0,822 | 0,891 | 5 | 0,738 | 50.8 / 70.2 (HTTP depuis la machine) |
| fts-and-or-p4 (D1 FTS5, Worker) | 0,756 / 0,738 / 0,751 | 0,806 | 0,929 | 0,929 | 0,803 | 0,891 | 4 | 0,709 | 66.4 / 79.9 (HTTP depuis la machine) |
| fts-and-or+syn (D1 FTS5, Worker) | 0,803 / 0,767 / 0,792 | 0,844 | 0,957 | 0,957 | 0,859 | 0,912 | 5 | 0,772 | 82.1 / 100.8 (HTTP depuis la machine) |

| Configuration | requêtes D1 / question | lignes lues / question (p50 / p95 / max) | durée D1 p50 / p95 (ms) | SQL p50 / p95 (ms) | repli OR utilisé (sur 70) |
|---|---:|---|---|---|---:|
| fts-and-or | 1.97 | 119 / 475 / 615 | 1.2 / 1.8 | 1.2 / 1.8 | 68 |
| fts-or | 1 | 118 / 474 / 614 | 0.8 / 1.6 | 0.8 / 1.6 | 70 |
| fts-and-or-p4 | 1.97 | 113 / 461 / 519 | 1.1 / 2.2 | 1.1 / 2.2 | 68 |
| fts-and-or+syn | 2.61 | 245 / 831 / 1127 | 1.7 / 2.8 | 1.7 / 2.8 | 68 |

## Cache Q/R (`/cache`, table `q_cache`)

| Question | appel 1 | lignes lues / écrites | latence (ms) | appel 2 | lignes lues / écrites | latence (ms) |
|---|---|---|---:|---|---|---:|
| q001 | miss | 0 / 3 | 133.9 | hit | 1 / 0 | 51.6 |
| q002 | miss | 0 / 3 | 114.1 | hit | 1 / 0 | 60 |
| q003 | miss | 0 / 3 | 127.1 | hit | 1 / 0 | 48.1 |
| q004 | miss | 0 / 3 | 132.4 | hit | 1 / 0 | 49.7 |
| q005 | miss | 0 / 3 | 113 | hit | 1 / 0 | 42.3 |
