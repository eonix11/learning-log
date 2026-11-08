const express = require('express');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: "postgresql://postgres:dev@localhost:5432/idem_demo"
});

const app = express();
app.use(express.json());

app.post("/payments", async (req, res) => {
    const key = req.header('Idempotency-Key');
    if (!key) return res.status(400).json({ error: 'Idempotency-Key header required' });

    const user_id = 1

    const claim = await pool.query(
        `insert into idempotency_keys (user_id, key)
         values($1, $2)
         on conflict (user_id, key) do nothing
         returning id
        `,
        [user_id, key]
    )

    let owned = claim.rowCount === 1; //is this a fresh claim

    if (!owned) { // record already in db, means not first request and not a fresh claim
        //reclaim
        const reclaim = await pool.query(
            `update idempotency_keys
             set locked_at = now()
             where user_id = $1 and key = $2
                and status = 'processing'
                and locked_at < now() - interval '10 seconds'
             returning id
            `, [user_id, key]
        )

        owned = reclaim.rowCount === 1;//is this reclaim
    }

    if (!owned) {//neither fresh claim not reclaim
        const {rows} = await pool.query(
        `select status, response, code from idempotency_keys
         where user_id=$1 and key=$2
        `,
        [user_id, key]
        )
        const row = rows[0];
        if(row.status == 'done') return res.status(row.code).json(row.response);
        return res.status(409).json({ error: 'request in progress' });
    }

    await new Promise((r) => setTimeout(r, 2000)); // fake payment 

    const body = { paymentId: Date.now(), amount: 100 };

    await pool.query(
        `update idempotency_keys
        set status='done', response=$1, code=201, updated_at=now()
        where user_id=$2 and key=$3
        `,
        [body, user_id, key]
    )

    res.status(201).json( body );
})

app.listen(3000, () => console.log('listening on 3000'));