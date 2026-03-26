import { createClient } from 'redis';

const client = createClient({
    username: 'default',
    password: 'SVA5jpli1iOd0vt8qILEuGGhz8APMHUy',
    socket: {
        host: 'redis-16521.c276.us-east-1-2.ec2.cloud.redislabs.com',
        port: 16521
    }
});

client.on('error', err => console.log('Redis Client Error', err));

await client.connect();

await client.set('foo', 'bar');
const result = await client.get('foo');
console.log(result)  // >>> bar


module.exports = redisClient;