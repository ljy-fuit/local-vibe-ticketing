-- reserve-stock.lua
-- Atomically reserve stock for a user
-- KEYS[1] = tkt:{eventId}:state:{userId}    (STRING)
-- KEYS[2] = tkt:{eventId}:stock              (HASH)
-- KEYS[3] = tkt:{eventId}:rsv:{userId}       (STRING)
-- ARGV[1] = ticketTypeId
-- ARGV[2] = quantity
-- ARGV[3] = reservationJson (full reservation data)
-- ARGV[4] = reservationTtlSeconds
-- Returns: {ok: true, remaining} or {ok: false, reason: string}

local stateKey = KEYS[1]
local stockKey = KEYS[2]
local rsvKey = KEYS[3]
local ticketTypeId = ARGV[1]
local quantity = tonumber(ARGV[2])
local reservationJson = ARGV[3]
local rsvTtl = tonumber(ARGV[4])

-- Step 1: Verify user is ACTIVE
local state = redis.call('GET', stateKey)
if state ~= 'ACTIVE' then
  return cjson.encode({ ok = false, reason = 'NOT_ACTIVE', currentState = state or 'NONE' })
end

-- Step 2: Check for duplicate reservation
local existingRsv = redis.call('GET', rsvKey)
if existingRsv then
  return cjson.encode({ ok = false, reason = 'ALREADY_RESERVED' })
end

-- Step 3: Check and decrement stock atomically
local currentStock = tonumber(redis.call('HGET', stockKey, ticketTypeId))
if not currentStock or currentStock < quantity then
  return cjson.encode({ ok = false, reason = 'OUT_OF_STOCK', remaining = currentStock or 0 })
end

local newStock = currentStock - quantity
redis.call('HSET', stockKey, ticketTypeId, tostring(newStock))

-- Step 4: Create reservation with TTL
redis.call('SET', rsvKey, reservationJson, 'EX', rsvTtl)

-- Step 5: Update user state to RESERVING
redis.call('SET', stateKey, 'RESERVING', 'EX', rsvTtl)

return cjson.encode({ ok = true, remaining = newStock })
