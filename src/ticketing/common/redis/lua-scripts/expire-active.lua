-- expire-active.lua
-- Clean up expired active users and expired reservations (restoring stock)
-- KEYS[1] = tkt:{eventId}:active        (HASH)
-- KEYS[2] = tkt:{eventId}:active_count  (STRING)
-- KEYS[3] = tkt:{eventId}:stock         (HASH)
-- ARGV[1] = now (unix timestamp ms)
-- ARGV[2] = eventId
-- Returns: JSON {expiredActive: number, expiredReservations: number}

local activeKey = KEYS[1]
local activeCountKey = KEYS[2]
local stockKey = KEYS[3]
local now = tonumber(ARGV[1])
local eventId = ARGV[2]

-- Step 1: Clean expired active users
local allActive = redis.call('HGETALL', activeKey)
local expiredActive = 0
for i = 1, #allActive, 2 do
  local userId = allActive[i]
  local data = cjson.decode(allActive[i + 1])
  if data.expiresAt and tonumber(data.expiresAt) <= now then
    redis.call('HDEL', activeKey, userId)
    local stateKey = 'tkt:' .. eventId .. ':state:' .. userId
    redis.call('SET', stateKey, 'EXPIRED', 'EX', 3600)
    expiredActive = expiredActive + 1
  end
end

-- Update active count
local newCount = tonumber(redis.call('HLEN', activeKey))
redis.call('SET', activeCountKey, tostring(newCount))

return cjson.encode({
  expiredActive = expiredActive,
})
