-- Replay Studio Live: server-side ModuleScript for developer-authorized experiences.
-- Requires an approved, opt-in sample callback. Does not inject into another game.
local HttpService = game:GetService("HttpService")
local RunService = game:GetService("RunService")
local Live = {}
local Origin = "https://blr-live-demo.scp343hey.workers.dev"
local Watch = "https://blr.n29.kz/replays/?live=personal&room="
local active = nil

local function request(room, action, data)
    local result = HttpService:RequestAsync({
        Url = Origin .. "/stream/" .. room .. "/" .. action,
        Method = "POST",
        Headers = {
            ["Content-Type"] = "application/json",
            ["Authorization"] = HttpService:GetSecret("BLR_LIVE_TOKEN"):AddPrefix("Bearer ")
        },
        Body = HttpService:JSONEncode(data)
    })
    if not result.Success then error("Live request failed: HTTP " .. tostring(result.StatusCode)) end
    return HttpService:JSONDecode(result.Body)
end

-- sample() must return a fresh table containing:
-- players = { {id=1, team="Home", cf={x,y,z}, hasBall=false, style="...", awk=0}, ... },
-- optional ball={cf={x,y,z},owner=1}, scoreboard={home=0,away=0,timer=300},
-- optional playerScoreboard with anonymous IDs and public counters/positions.
-- Allocate IDs 1..128 per match; never pass account IDs or private metadata.
-- consentCheck() must check that recording and broadcasting are authorized and
-- every included participant has opted in, including later joiners.
function Live.Start(sample, consentCheck)
    assert(RunService:IsServer(), "Use a server ModuleScript")
    assert(type(sample) == "function" and type(consentCheck) == "function", "Supply approved telemetry and consent callbacks")
    assert(not active, "Already streaming")
    assert(consentCheck() == true, "Broadcast consent required")
    local room = HttpService:GenerateGUID(false):gsub("-", ""):lower()
    local start = request(room, "start", {consent=true})
    local state = {room=room,id=start.id,seq=0,frames={},running=true,sending=false,start=os.clock(),lastSample=-1}
    active = state
    state.connection = RunService.Heartbeat:Connect(function()
        if not state.running then return end
        local t = os.clock() - state.start
        if t >= 600 or #state.frames >= 24 then state.running=false;return end
        -- Heartbeat may be slower than 60 Hz; do not duplicate missed observations.
        if t-state.lastSample < 1/60-0.001 then return end
        local ok, consent = pcall(consentCheck)
        if not ok or consent ~= true then state.running=false;table.clear(state.frames);return end
        local okFrame, frame = pcall(sample)
        if not okFrame or type(frame) ~= "table" then state.running=false;return end
        frame.t = t
        state.lastSample=t
        table.insert(state.frames, frame)
    end)
    task.spawn(function()
        while state.running or #state.frames > 0 do
            task.wait(0.25)
            if #state.frames > 0 then
                local okConsent, consent=pcall(consentCheck)
                if not okConsent or consent ~= true then state.running=false;table.clear(state.frames);break end
                local frames=state.frames
                state.frames={}
                local payload={id=state.id,seq=state.seq,frames=frames}
                local ok, result=pcall(request,room,"batch",payload)
                if not ok then
                    -- Retry the identical sequence once. Backend deduplicates accepted packets.
                    task.wait(0.1)
                    local consentOK, stillConsenting=pcall(consentCheck)
                    if consentOK and stillConsenting==true then ok,result=pcall(request,room,"batch",payload) end
                end
                if not ok or not result.accepted then
                    warn("Replay Studio stream stopped: network or packet failure")
                    state.running=false;table.clear(state.frames);break
                end
                state.seq+=1
            end
        end
        state.connection:Disconnect()
        pcall(request,room,"stop",{})
        if active==state then active=nil end
    end)
    return Watch .. room
end

function Live.Stop()
    if active then active.running=false end
end

return Live
