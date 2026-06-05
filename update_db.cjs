const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://postgres.acwqgvoelgsbaixjbwqp:8NQderHR4vPqeiwq@aws-1-us-east-1.pooler.supabase.com:6543/postgres' });
client.connect().then(() => {
    return client.query("UPDATE agent_task_executions SET plan_id = '17708adf-ead0-4aa9-a27d-65c07fdab3ac' WHERE id = '7b139023-c171-4cbc-9ed7-e83f276e6046'");
}).then((res) => {
    console.log('Update successful:', res.rowCount);
    client.end();
}).catch(err => {
    console.error('Error:', err);
    client.end();
});
