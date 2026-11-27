-- ReplayRecorder Live v0.1 — standalone Lua adapter for approved sample sources.
-- No game APIs, executor functions, injection, remote listeners or network calls.
-- Requires a host Lua runtime with standard io and an injected JSON encoder.
-- The Node local-publisher.mjs tails the live NDJSON file and owns the secret.
local Recorder = {}
Recorder.__index = Recorder

local function finite(x)
    return type(x) == "number" and x == x and math.abs(x) < math.huge
end

local function int(x, min, max)
    return finite(x) and x % 1 == 0 and x >= min and x <= max
end

local function xyz(cf)
    if type(cf) ~= "table" then return nil end
    local out = {}
    for i = 1, 3 do
        if not finite(cf[i]) or math.abs(cf[i]) > 10000 then return nil end
        out[i] = math.floor(cf[i] * 64 + 0.5) / 64
    end
    return out
end

-- Input must already contain session-local anonymous IDs, never account IDs.
-- Only public match fields are retained. Unknown data is not inferred.
local function clean(raw, t)
    assert(type(raw) == "table" and type(raw.players) == "table", "Invalid approved sample")
    assert(#raw.players <= 32, "Too many participants")
    local out = { t = t, players = {} }
    local seen = {}
    for _, p in ipairs(raw.players) do
        assert(type(p) == "table" and int(p.id, 1, 128) and not seen[p.id], "Invalid anonymous ID")
        assert(p.team == "Home" or p.team == "Away", "Invalid team")
        local pos = assert(xyz(p.cf), "Invalid player coordinates")
        seen[p.id] = true
        local row = { id = p.id, team = p.team, cf = pos, hasBall = p.hasBall == true }
        if type(p.style) == "string" and #p.style <= 40 and p.style:match("^[%w .'-]+$") then
            row.style = p.style
        end
        if int(p.awk, 0, 2) then row.awk = p.awk end
        if type(p.inAwakening) == "boolean" then row.inAwakening = p.inAwakening end
        out.players[#out.players + 1] = row
    end
    if type(raw.ball) == "table" then
        local pos = xyz(raw.ball.cf)
        if pos then
            out.ball = { cf = pos }
            if seen[raw.ball.owner] then out.ball.owner = raw.ball.owner end
        end
    end
    local score = raw.scoreboard
    if type(score) == "table" and int(score.home, 0, 999) and int(score.away, 0, 999) then
        out.scoreboard = { home = score.home, away = score.away }
        if int(score.timer, 0, 3600) then out.scoreboard.timer = score.timer end
    end
    if type(raw.playerScoreboard) == "table" and #raw.playerScoreboard <= 32 then
        out.playerScoreboard = {}
        local ids = {}
        for _, p in ipairs(raw.playerScoreboard) do
            if type(p) == "table" and seen[p.id] and not ids[p.id] then
                ids[p.id] = true
                local row = { id = p.id }
                if type(p.position) == "string" and #p.position <= 8 and p.position:match("^[A-Z][A-Z0-9]*$") then
                    row.position = p.position
                end
                for _, k in ipairs({"Points", "Goals", "Assists", "Saves", "Steals"}) do
                    if int(p[k], 0, 1000000) then row[k] = p[k] end
                end
                out.playerScoreboard[#out.playerScoreboard + 1] = row
            end
        end
    end
    return out
end

local function newFile(path)
    assert(type(path) == "string" and #path > 0, "Choose a new NDJSON path")
    local old = io.open(path, "rb")
    if old then old:close(); error("File exists; choose a new path") end
    return assert(io.open(path, "wb"))
end

function Recorder.new(options)
    assert(type(options) == "table" and type(options.encode) == "function", "Provide JSON encoder")
    assert(type(options.consentCheck) == "function", "Provide permission and participant consent check")
    return setmetatable({
        encode = options.encode, consentCheck = options.consentCheck,
        record = nil, live = nil, last = nil,
    }, Recorder)
end

function Recorder:StartRecording(path)
    assert(not self.record, "Already recording")
    assert(self.consentCheck() == true, "Permission and consent required")
    self.record = { file = newFile(path), path = path, first = nil, last = -1, count = 0 }
    return path
end

function Recorder:StartLive(path)
    assert(not self.live, "Already live")
    assert(self.consentCheck() == true, "Permission and consent required")
    self.live = { file = newFile(path), path = path, first = nil, last = -1, count = 0 }
    -- Start Node local-publisher.mjs with this path. It prints the viewing URL.
    return path
end

local function close(s)
    if s then
        local ok, err = s.file:close()
        return ok, err
    end
    return true
end

function Recorder:StopRecording()
    local s = self.record
    self.record = nil
    return close(s)
end

function Recorder:StopLive()
    local s = self.live
    self.live = nil
    return close(s)
end

function Recorder:Status()
    return {
        recording = self.record ~= nil,
        liveExport = self.live ~= nil,
        recordedSamples = self.record and self.record.count or 0,
        liveSamples = self.live and self.live.count or 0,
    }
end

local function push(self, sink, frame, t)
    sink.first = sink.first or t
    local relative = math.floor((t - sink.first) * 1000 + 0.5) / 1000
    if relative <= sink.last then return end
    frame.t = relative
    local line = self.encode(frame)
    assert(type(line) == "string" and #line < 65536 and not line:find("[\r\n]"), "Expected single-line JSON")
    assert(sink.file:write(line, "\n"))
    assert(sink.file:flush())
    sink.last = relative
    sink.count = sink.count + 1
end

-- Called by an approved source at its native sample rate (up to 60 Hz).
-- Use a monotonic seconds timestamp from the source. No fabricated frames.
function Recorder:PushFrame(raw, t)
    if not self.record and not self.live then return false end
    local allowed, consent = pcall(self.consentCheck)
    if not allowed or consent ~= true then
        self:StopLive()
        self:StopRecording()
        return false, "Consent unavailable or withdrawn"
    end
    assert(finite(t) and t >= 0, "Expected source timestamp in seconds")
    assert(not self.last or t >= self.last, "Timestamp moved backwards")
    self.last = t
    local frame = clean(raw, 0)
    if self.live then
        local sink = self.live
        if sink.first and t - sink.first >= 600 then
            self:StopLive()
        else
            local ok, err = pcall(push, self, sink, frame, t)
            if not ok then self:StopLive(); return false, tostring(err) end
        end
    end
    if self.record then
        local ok, err = pcall(push, self, self.record, frame, t)
        if not ok then self:StopRecording(); return false, tostring(err) end
    end
    return true
end

return Recorder
