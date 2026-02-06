-- cancel-reservation.lua
-- Cancel a reservation and restore stock
-- KEYS[1] = tkt:{eventId}:rsv:{userId}       (STRING)
-- KEYS[2] = tkt:{eventId}:stock              (HASH)
-- KEYS[3] = tkt:{eventId}:state:{userId}     (STRING)
-- KEYS[4] = tkt:{eventId}:active             (HASH)
-- ARGV[1] = userId
-- ARGV[2] = activeTtlMs (remaining active TTL to restore)
-- ARGV[3] = now (unix timestamp ms)
-- Returns: {ok: true, ticketTypeId, quantity, remaining} or {ok: false, reason}

local rsvKey = KEYS[1]
local stockKey = KEYS[2]
local stateKey = KEYS[3]
local activeKey = KEYS[4]
local userId = ARGV[1]
local activeTtlMs = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

-- Step 1: Get reservation
local rsvJson = redis.call('GET', rsvKey)
if not rsvJson then
  return cjson.encode({ ok = false, reason = 'NO_RESERVATION' })
end

local rsv = cjson.decode(rsvJson)

-- Step 2: Restore stock
local ticketTypeId = rsv.ticketTypeId
local quantity = tonumber(rsv.quantity)
local currentStock = tonumber(redis.call('HGET', stockKey, ticketTypeId)) or 0
redis.call('HSET', stockKey, ticketTypeId, tostring(currentStock + quantity))

-- Step 3: Delete reservation
redis.call('DEL', rsvKey)

-- Step 4: Restore user to ACTIVE state with fresh TTL
local expiresAt = now + activeTtlMs
local activeData = cjson.encode({
  enteredAt = now,
  expiresAt = expiresAt,
})
redis.call('HSET', activeKey, userId, activeData)
redis.call('SET', stateKey, 'ACTIVE', 'EX', math.ceil(activeTtlMs / 1000))

return cjson.encode({
  ok = true,
  ticketTypeId = ticketTypeId,
  quantity = quantity,
  remaining = currentStock + quantity,
})
