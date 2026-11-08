# idempotency-keys

Date: 2026-11-01
Updated: 2026-11-08 (timeout-based reclaim)

## What I tried
When a request times out or the response gets lost, the client retries. The server can't tell it's a retry, so the same action runs twice. Example: one payment request sent twice creates two payment records.

Fix: the client sends an idempotency key with each request. If the server sees the same key again, it returns the saved response instead of doing the work again.

## Run
Postgres via Docker, no local install.

Start Postgres:
```bash
docker run --name idem-pg \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=idem_demo \
  -p 5432:5432 \
  -v "$PWD/schema.sql:/docker-entrypoint-initdb.d/schema.sql" \
  -d postgres:18
```

If db container already exists:
```bash
docker start idem-pg
```

Test unique constraint (run twice):
```bash
psql "postgresql://postgres:dev@localhost:5432/idem_demo" -c "insert into idempotency_keys (user_id, key) values (1, 'abc');"
```

Start server:
```bash
npm i
node server.js
```

Race (two requests at once):
```bash
curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k8' & curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k8'; wait
```

Retry (same key, later):
```bash
curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k8'
```

Crash + reclaim:
```bash
node server.js & S=$!; sleep 1
curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k13' &
sleep 1; kill -9 $S; echo "--- crashed"
sleep 1
node server.js & S=$!; sleep 1
echo "--- Immediate retry:"; curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k13'; echo
sleep 11
echo "--- retry after 11s:"; curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k13'; echo
echo "--- again"; curl -s -X POST localhost:3000/payments -H 'Idempotency-Key: k13'; echo
kill $S
```


## What happened
Unique constraint:
```
INSERT 0 1
ERROR: duplicate key value violates unique constraint "idempotency_keys_user_id_key_key"
```
The unique constraint on (user_id, key) blocked the second row at the DB level, even without any app code.

Race:
```
{"error":"request in progress"}
{"paymentId":1793548885700,"amount":100}
```
One request claimed the key and made the payment. The other got 409.

Retry:
```
{"amount":100,"paymentId":1793548885700}
```
Same paymentId as the race. The server returned the saved response, no new payment.

Crash + reclaim:
```
--- crashed
--- Immediate retry:
{"error":"request in progress"}
--- retry after 11s:
{"paymentId":1794131524441,"amount":100}
--- again
{"amount":100,"paymentId":1794131524441}
```

Case when server stop while the request was processing: Server crash, key stuck in processing -> Immediate retry gave 409 -> retry after 11 secs reclaim and payment done


## Doubts
- Two identical requests at the same time? -> Insert the key first (claim). The DB lets only one insert win.
- Hundreds or thousands of users? -> Only the same (user_id, key) collide. Different users don't block each other.
- Server crashes mid-request? -> Key stays stuck in `processing`. -> locked_at + reclaim after 10s.
- If payment takes more time than timeout (ex - 10 secs) then retry would reclaim and payment would be done twice (open) -> timeout only reduces risk. Real fix is to pass the same key to the payment provider, or heartbeat.

Write-up:



