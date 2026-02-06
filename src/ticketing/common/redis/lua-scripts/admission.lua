-- admission.lua
-- Atomically promote users from waiting queue to active set
-- KEYS[1] = tkt:{eventId}:waiting       (ZSET)
-- KEYS[2] = tkt:{eventId}:active        (HASH)
-- KEYS[3] = tkt:{eventId}:active_count  (STRING)
-- ARGV[1] = maxActive
-- ARGV[2] = now (unix timestamp ms)
-- ARGV[3] = activeTtlMs (how long active status lasts)
-- Returns: JSON array of promoted userIds

local waitingKey = KEYS[1]
local activeKey = KEYS[2]
local activeCountKey = KEYS[3]
local maxActive = tonumber(ARGV[1])
local now = tonumber(ARGV[2])
local activeTtlMs = tonumber(ARGV[3])

-- Step 1: Clean expired active users
local allActive = redis.call('HGETALL', activeKey)
local expiredCount = 0
for i = 1, #allActive, 2 do
  local userId = allActive[i]
  local data = cjson.decode(allActive[i + 1])
  if data.expiresAt and tonumber(data.expiresAt) <= now then
    redis.call('HDEL', activeKey, userId)
    -- Set state to EXPIRED
    local stateKey = 'tkt:' .. string.match(waitingKey, 'tkt:(.+):waiting') .. ':state:' .. userId
    redis.call('SET', stateKey, 'EXPIRED', 'EX', 3600)
    expiredCount = expiredCount + 1
  end
end

-- Update active count after cleanup
local currentCount = tonumber(redis.call('HLEN', activeKey))
redis.call('SET', activeCountKey, tostring(currentCount))

-- Step 2: Calculate available slots
local available = maxActive - currentCount
if available <= 0 then
  return '[]'
end

-- Step 3: Pop users from waiting queue
local members = redis.call('ZPOPMIN', waitingKey, available)
if #members == 0 then
  return '[]'
end

-- Step 4: Move to active set
local promoted = {}
local expiresAt = now + activeTtlMs
for i = 1, #members, 2 do
  local userId = members[i]
  local activeData = cjson.encode({
    enteredAt = now,
    expiresAt = expiresAt,
  })
  redis.call('HSET', activeKey, userId, activeData)

  -- Update user state
  local eventId = string.match(waitingKey, 'tkt:(.+):waiting')
  local stateKey = 'tkt:' .. eventId .. ':state:' .. userId
  redis.call('SET', stateKey, 'ACTIVE', 'EX', math.ceil(activeTtlMs / 1000))

  table.insert(promoted, userId)
end

-- Update active count
local newCount = tonumber(redis.call('HLEN', activeKey))
redis.call('SET', activeCountKey, tostring(newCount))

return cjson.encode(promoted)
