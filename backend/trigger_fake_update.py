import asyncio
import redis.asyncio as redis
import json

async def trigger_fake_update():
    r = redis.from_url('redis://localhost:6383/0')
    payload = json.dumps({
        "commodity_id": "test-id",
        "price": 123456.0,
        "timestamp": "2026-01-25T13:05:00.000000"
    })
    print(f"Publishing fake update: {payload}")
    await r.publish('price_updates', payload)
    await r.set("price:latest:test-id", payload)
    print("Fake update published and cached.")

if __name__ == "__main__":
    asyncio.run(trigger_fake_update())
