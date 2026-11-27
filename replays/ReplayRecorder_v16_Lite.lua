-- Replay Recorder v0.16 Lite — passive local-file test adapter.
-- Use only in an experience or test session where the developer permits recording this way.
-- Passive OnClientEvent listeners only; no remote firing/invocation, hooks, automation or network upload.
-- Records visible match actors, ball, camera, scoreboard and replicated match-stat changes for all active players.
-- Reads replicated Stunned rising edges and Sliding state for offline tackle animation.
-- No shot/steal-attempt/dribble events. A stun does not prove an ankle break.
-- Reads replicated style at 5 Hz; writes changes and chunk baselines.
-- Records assigned positions from known player/character fields and match UI.
-- Retains the last observed position for the same active player/team when UI is closed.
-- Records observed ability-slot names and cooldown changes, not raw network traffic.
-- Awakening: -1 unknown, 0 unavailable, 1 candidate ready, 2 active.
-- No live ability overlay. Data is for authorized post-match replay only.
-- Names are in-game usernames of match participants; obtain permission before recording or sharing.
-- No user IDs are written to disk.
-- F6 starts, F7 stops; on-screen button is a fallback.
local Players = game:GetService("Players")
local RS = game:GetService("ReplicatedStorage")
local RunService = game:GetService("RunService")
local HttpService = game:GetService("HttpService")
local UserInputService = game:GetService("UserInputService")
local me = Players.LocalPlayer
local ROOT = "ReplayRecordings"
assert(type(writefile)=="function" and type(makefolder)=="function" and type(isfolder)=="function", "Local filesystem API unavailable")
if not isfolder(ROOT) then makefolder(ROOT) end
local pg = me:WaitForChild("PlayerGui")
local old = pg:FindFirstChild("ReplayRecorder06")
if old then warn("[Replay] Recorder already running"); return end
local gui = Instance.new("ScreenGui")
gui.Name = "ReplayRecorder06"
gui.ResetOnSpawn = false
gui.Parent = pg
local panel = Instance.new("Frame")
panel.Size = UDim2.fromOffset(260, 83)
panel.Position = UDim2.new(1,-275,0,15)
panel.BackgroundColor3 = Color3.fromRGB(22,29,39)
panel.Parent = gui
local button = Instance.new("TextButton")
button.Size = UDim2.new(1,-12,0,37)
button.Position = UDim2.fromOffset(6,6)
button.Text = "● Record"
button.BackgroundColor3 = Color3.fromRGB(58,105,157)
button.TextColor3 = Color3.new(1,1,1)
button.TextSize = 17
button.Parent = panel
local status = Instance.new("TextLabel")
status.Size = UDim2.new(1,-12,0,29)
status.Position = UDim2.fromOffset(6,47)
status.BackgroundTransparency = 1
status.TextColor3 = Color3.fromRGB(207,218,232)
status.TextSize = 13
status.Text = "Lite · ready"
status.Parent = panel
-- Set RATE to 60 if smoother POV playback is more important than file size.
local RATE, STATS_RATE, CHUNK_SECONDS = 30, 5, 5
local BOARD_RATE = 1 -- one scoreboard snapshot check per second
local MAX_FRAMES = RATE * 60 * 30 -- 30-minute recording guard
local counterNames = {"AnkleBreakers","Assists","FilteredPasses","Goals","Points","Saves","Steals","Ping"}
local playerStatNames = {"Style","Flow"}
local counterEvents = {AnkleBreakers="ankle_break",Assists="assist",FilteredPasses="pass_count",Goals="goal_credit",Saves="save",Steals="steal"}
local session, accumulator, busy = nil, 0, false
local function round(x) return math.round(x*1000)/1000 end
local function cf(c)
    local a,b,d = c:ToOrientation()
    return {round(c.X),round(c.Y),round(c.Z),round(a),round(b),round(d)}
end
local function saveValue(folder,name,data)
    writefile(folder .. "/" .. name, HttpService:JSONEncode(data))
end
local function path(root,...)
    for _,name in ipairs({...}) do
        if not root then return nil end
        root=root:FindFirstChild(name)
    end
    return root
end
local function part(obj) return obj and obj:IsA("BasePart") and obj or nil end
local function label(obj) return obj and obj:IsA("TextLabel") and obj.Text or nil end
local function team(p) return p.Team and p.Team.Name or "" end
local function idFor(s,p)
    if s.ids[p] then return s.ids[p] end
    s.nextId += 1
    local id = s.nextId; s.ids[p] = id
    local info = {id = id, team = team(p), kind = "player", username = p.Name}
    s.players[tostring(id)] = info
    return id
end
local function readValue(folder,name)
    local obj=folder and folder:FindFirstChild(name)
    if obj and (obj:IsA("NumberValue") or obj:IsA("IntValue") or obj:IsA("BoolValue") or obj:IsA("StringValue")) then
        return obj.Value
    end
    return nil
end
-- Read only the known scoreboard rows, never scan the whole GUI.
-- A hidden or unpopulated GUI may have stale values; replicated counters take priority.
local boardKeys={"Points","Goals","Assists","Saves","Steals","Ping"}
-- Role codes observed in the supplied PickTeam hierarchy, plus common position codes
-- accepted only in explicitly named role fields (never from world coordinates).
local knownRoles={CF=true,CFL=true,CFR=true,CM=true,GK=true,LM=true,LW=true,RM=true,RW=true}
local extraRoles={CB=true,LB=true,RB=true,CDM=true,CAM=true,LCM=true,RCM=true,LCB=true,RCB=true,ST=true,LS=true,RS=true}
local roleKeys={"Position","Pos","Role","PlayerPosition","TeamPosition","AssignedPosition"}
local function normalizeRole(v,allowExtra)
    if type(v)~="string" or #v>24 then return nil end
    v=v:match("^%s*(.-)%s*$"):upper()
    if knownRoles[v] or (allowExtra and extraRoles[v]) then return v end
    return nil
end
local function roleText(o)
    if o and (o:IsA("TextLabel") or o:IsA("TextButton")) then return o.Text end
    return nil
end
local function isGuiVisible(o)
    while o and o~=pg do
        if o:IsA("GuiObject") and not o.Visible then return false end
        if o:IsA("LayerCollector") and not o.Enabled then return false end
        o=o.Parent
    end
    return o==pg
end
local function sameUsername(text,p)
    if type(text)~="string" then return false end
    return text:match("^%s*@?(.-)%s*$"):lower()==p.Name:lower()
end
local function scoreboardRole(ui)
    if not ui then return nil end
    -- First prefer explicitly named cells, including a nested text label.
    for _,key in ipairs(roleKeys) do
        local cell=ui:FindFirstChild(key)
        if cell then
            local v=normalizeRole(roleText(cell),true)
            if v and isGuiVisible(cell) then return v end
            local found=nil
            for _,o in ipairs(cell:GetDescendants()) do
                local r=normalizeRole(roleText(o),true)
                if r and isGuiVisible(o) then
                    if found and found~=r then return nil end
                    found=r
                end
            end
            if found then return found end
        end
    end
    -- The old probe omitted nonnumeric text. Read known role codes inside this row.
    -- Exclude the username and stat cells, and reject ambiguous matches.
    local found=nil
    for _,o in ipairs(ui:GetDescendants()) do
        local r=normalizeRole(roleText(o),false)
        if r and isGuiVisible(o) then
            local root=o
            while root.Parent and root.Parent~=ui do root=root.Parent end
            local n=root.Name
            if n~="Plr" and n~="Points" and n~="Goals" and n~="Assists" and n~="Saves" and n~="Steals" and n~="Ping" then
                if found and found~=r then return nil end
                found=r
            end
        end
    end
    return found
end
local function replicatedRole(p)
    -- These names are candidates, not confirmed BLR fields. Accept only role strings.
    local found=nil
    local function check(v)
        local role=normalizeRole(v,true)
        if role then
            if found and found~=role then return false end
            found=role
        end
        return true
    end
    for _,obj in ipairs({p,p.Character or p}) do
        for _,key in ipairs(roleKeys) do
            if not check(obj:GetAttribute(key)) or not check(readValue(obj,key)) then return nil end
        end
    end
    for _,obj in pairs({p:FindFirstChild("PlayerStats"),p:FindFirstChild("GameStats"),p.Character and p.Character:FindFirstChild("Values")}) do
        for _,key in ipairs(roleKeys) do
            if not check(obj:GetAttribute(key)) or not check(readValue(obj,key)) then return nil end
        end
    end
    return found
end
local function pickTeamRole(p,tm)
    local root=path(pg,"PickTeam",tm)
    if not root or not isGuiVisible(root) then return nil end
    local found=nil
    for _,slot in ipairs(root:GetChildren()) do
        local role=normalizeRole(slot.Name,false)
        if role then
            local name=slot:FindFirstChild("plr")
            if name and isGuiVisible(name) and sameUsername(roleText(name),p) then
                if found and found~=role then return nil end
                found=role
            end
        end
    end
    return found
end
local function snapshotBoard(s,frame)
    local rows={}
    local guiBoard=pg:FindFirstChild("Leaderbord")
    local bg=guiBoard and guiBoard:FindFirstChild("BG")
    local visible=guiBoard and guiBoard:IsA("ScreenGui") and guiBoard.Enabled and bg and bg.Visible
    local guiRows={}
    local activeRoles={}
    if visible then
        for _,tm in ipairs({"Home","Away"}) do
            local list=path(bg,"TeamsList",tm,"StatsList")
            if list then
                for _,row in ipairs(list:GetChildren()) do
                    local username=roleText(row:FindFirstChild("Plr"))
                    if username then guiRows[tm..":"..username:match("^%s*@?(.-)%s*$"):lower()]=row end
                end
            end
        end
    end
    for _,p in ipairs(Players:GetPlayers()) do
        local tm=team(p)
        if tm=="Home" or tm=="Away" then
            local id=idFor(s,p)
            local row={id=id,team=tm}
            local gameStats=p:FindFirstChild("GameStats")
            local ui=guiRows[tm..":"..p.Name:lower()]
            for _,key in ipairs(boardKeys) do
                local v=readValue(gameStats,key)
                if type(v)~="number" and ui then v=tonumber(label(ui:FindFirstChild(key))) end
                if type(v)=="number" and v==v and v>=0 and v<1e12 then row[key]=math.round(v) end
            end
            -- Prefer the visible official table, then an explicit replicated role,
            -- then the visible team-selection slot matched by exact username.
            local pos=scoreboardRole(ui)
            local source=pos and "scoreboard" or nil
            if not pos then pos=replicatedRole(p); if pos then source="replicated" end end
            if not pos then pos=pickTeamRole(p,tm); if pos then source="pickTeam" end end
            local previous=s.lastRoles[id]
            if pos then
                s.lastRoles[id]={team=tm,position=pos,source=source}
                row.position=pos
            elseif previous and previous.team==tm then
                row.position=previous.position
            else
                s.lastRoles[id]=nil
            end
            activeRoles[id]=true
            table.insert(rows,row)
        end
    end
    for id in pairs(s.lastRoles) do
        if not activeRoles[id] then s.lastRoles[id]=nil end
    end
    table.sort(rows,function(a,b) return a.id<b.id end)
    -- Stable fingerprint independent of JSON dictionary ordering.
    local bits={}
    for _,r in ipairs(rows) do
        local fields={tostring(r.id),r.team,r.position or "-"}
        for _,key in ipairs(boardKeys) do table.insert(fields,tostring(r[key] or "-")) end
        table.insert(bits,table.concat(fields,":"))
    end
    local signature=table.concat(bits,"|")
    if s.lastBoard~=signature or #s.frames==0 then
        frame.playerScoreboard=rows
        s.lastBoard=signature
    end
end
local function actorId(s,tm)
    local key="npc:"..tm
    if s.ids[key] then return s.ids[key] end
    s.nextId+=1
    local id=s.nextId; s.ids[key]=id
    s.players[tostring(id)]={id=id,team=tm,kind="npc",displayName=tm.." AI GK"}
    return id
end
local function metadata(s,complete)
    return {version=2,recorderVersion="0.16-lite",id=s.id,createdAt=s.createdAt,
        placeId=game.PlaceId, sampleRate=RATE,rotationUnit="radians",positionUnit="studs",
        frames=s.count,chunks=s.chunks,duration=s.lastT,complete=complete,includeNames=true,statsSampleRate=STATS_RATE,scoreboardSampleRate=BOARD_RATE,extensions={"npc","localStats","events","playerStyles","playerScoreboard","abilitySlots","awakeningStates","flowStates","slideState"},eventMode="match-counters-stuns-and-ability-state",abilityClock="server clock or tick (candidate; raw preserved)",awakeningReadySource="PlayerStats.Awakening (unverified)",counterScope="replicated-active-players",localPlayerId=s.localId,droppedAbilityUpdates=s.droppedAbilityUpdates}
end
local function flush(s,complete)
    if #s.frames > 0 then
        local nextChunk = s.chunks+1
        saveValue(s.folder,string.format("chunk_%06d.json",nextChunk),s.frames)
        s.chunks = nextChunk
        s.frames = {}
    end
    saveValue(s.folder,"players.json",s.players)
    saveValue(s.folder,"metadata.json",metadata(s,complete))
    s.lastFlush = os.clock()
end
-- Only the packet shape observed in the supplied ability probes is accepted.
-- User IDs are used for attribution in memory; only replay actor IDs reach disk.
local function validNumber(v)
    return type(v)=="number" and v==v and math.abs(v)<math.huge
end
local function activePlayer(p)
    return p and (team(p)=="Home" or team(p)=="Away")
end
local function slotValue(delta, key)
    local field=delta[key]
    if type(field)=="table" and field.o==0 then return field.v end
    return nil
end
local function queueEvent(s,e)
    -- Bound memory if recording is paused or a malformed source floods updates.
    if #s.pendingEvents<4096 then table.insert(s.pendingEvents,e)
    else s.droppedAbilityUpdates+=1 end
end
local function onAbilityPacket(payload)
    local s=session
    if not s or s.paused or type(payload)~="table" then return end
    local now=round(os.clock()-s.started)
    local serverNow=workspace:GetServerTimeNow()
    local localTick=tick()
    for _,packet in ipairs(payload) do
        if type(packet)=="table" and packet[1]==string.char(1) and type(packet[3])=="table" then
            for uid,slots in pairs(packet[3]) do
                local n=tonumber(uid)
                local p=n and n>0 and n%1==0 and Players:GetPlayerByUserId(n) or nil
                if activePlayer(p) and type(slots)=="table" then
                    local id=idFor(s,p)
                    local kit=s.abilityStates[id]
                    if not kit then kit={};s.abilityStates[id]=kit end
                    local updates={}
                    for i=1,3 do
                        local delta=slots[tostring(i)] or slots[i]
                        if type(delta)=="table" then
                            local name=slotValue(delta,"name")
                            local cd=slotValue(delta,"cooldown")
                            if type(name)~="string" or #name==0 or #name>128 or not utf8.len(name) then name=nil end
                            if not validNumber(cd) or cd<0 or cd>1e12 then cd=nil end
                            if name~=nil or cd~=nil then
                                local previous=kit[i] or {}
                                local changedName=name~=nil and name~=previous.name
                                local changedCD=cd~=nil and cd~=previous.rawCooldown
                                if changedName or changedCD then
                                    local e={t=now,type="ability_slot",playerId=id,slot=i,source="replicated",nameChanged=changedName,cooldownChanged=changedCD}
                                    if name~=nil then previous.name=name;previous.nameAt=now end
                                    -- An omitted name is a partial update, not a default variant.
                                    e.name=previous.name or "?"
                                    if changedCD then
                                        previous.rawCooldown=cd
                                        local remaining=cd-serverNow
                                        local tickRemaining=cd-localTick
                                        -- The timestamp's epoch has not yet been verified in a live run.
                                        -- Preserve the raw value and reference clock even if conversion fails.
                                        previous.serverAt=round(serverNow)
                                        previous.observedAt=now
                                        previous.tickAt=round(localTick)
                                        previous.cdUntil=nil;previous.clock=nil
                                        local serverPlausible=math.abs(remaining)<=600
                                        local tickPlausible=math.abs(tickRemaining)<=600
                                        if cd==0 then previous.cdUntil=now;previous.clock="zero"
                                        elseif serverPlausible and (not tickPlausible or math.abs(remaining-tickRemaining)<=2) then
                                            previous.cdUntil=round(now+math.max(0,remaining));previous.clock="server"
                                        elseif tickPlausible and not serverPlausible then
                                            previous.cdUntil=round(now+math.max(0,tickRemaining));previous.clock="tick"
                                        end
                                        e.rawCooldown=cd;e.serverAt=previous.serverAt;e.tickAt=previous.tickAt
                                        e.cdUntil=previous.cdUntil;e.clock=previous.clock
                                    end
                                    kit[i]=previous
                                    table.insert(updates,e)
                                end
                            end
                        end
                    end
                    -- A multi-slot refresh/reset is not multiple confirmed ability uses.
                    for _,e in ipairs(updates) do
                        e.batchSize=#updates
                        queueEvent(s,e)
                    end
                    if #updates>0 then s.dirtyAbility[id]=true end
                end
            end
        end
    end
end
local function copyKit(kit)
    local out={}
    for i=1,3 do
        local slot=kit and kit[i] or {}
        out[i]={slot=i,name=slot.name or "?",cdUntil=slot.cdUntil,rawCooldown=slot.rawCooldown,
            serverAt=slot.serverAt,tickAt=slot.tickAt,clock=slot.clock,observedAt=slot.observedAt}
    end
    return out
end
local function awakeningState(p)
    local stats=p:FindFirstChild("PlayerStats")
    local ready=readValue(stats,"Awakening")
    local active=readValue(stats,"InAwakening")
    if type(ready)~="boolean" then ready=nil end
    if type(active)~="boolean" then active=nil end
    if active==true then return 2,ready,active end
    if active==false and ready==true then return 1,ready,active end
    if active==false and ready==false then return 0,ready,active end
    return -1,ready,active
end
-- Invalidation prevents carrying a base ability name into a different kit.
-- Retain cooldown observations, but do not guess the new variant's name.
local function invalidateNames(s,id)
    local kit=s.abilityStates[id]
    if not kit then return end
    for _,slot in pairs(kit) do slot.name=nil;slot.nameAt=nil end
    s.dirtyAbility[id]=true
end
local watched={}
local function watchAbilityRemote(obj)
    if watched[obj] or not obj:IsA("RemoteEvent") then return end
    local parent=obj.Parent
    if obj.Name=="RemoteEvent" and parent and parent.Name=="__ReplicatorInternal" and parent.Parent==RS then
        watched[obj]=obj.OnClientEvent:Connect(function(payload)
            local ok,err=pcall(onAbilityPacket,payload)
            if not ok then warn("[Replay] Ability packet ignored: "..tostring(err)) end
        end)
    elseif obj.Name=="AwakenEveryone" and obj==path(RS,"Packages","Knit","Services","AwakeningService","RE","AwakenEveryone") then
        watched[obj]=obj.OnClientEvent:Connect(function(p)
            local s=session
            if not s or s.paused or typeof(p)~="Instance" or not p:IsA("Player") or not activePlayer(p) then return end
            local id=idFor(s,p)
            queueEvent(s,{t=round(os.clock()-s.started),type="awakening_start",playerId=id,source="replicated"})
        end)
    end
end
for _,obj in ipairs(RS:GetDescendants()) do watchAbilityRemote(obj) end
RS.DescendantAdded:Connect(watchAbilityRemote)
RS.DescendantRemoving:Connect(function(obj)
    if watched[obj] then watched[obj]:Disconnect();watched[obj]=nil end
end)

local function sample(s)
    local frame={t=round(os.clock()-s.started),players={}}
    local actors={}
    local events=s.pendingEvents
    s.pendingEvents={}
    local seenStuns={}
    local seenActors={}
    local pollStyles=frame.t>=s.nextStatsAt or #s.frames==0
    local function addEvent(kind,id,source,extra)
        local e={t=frame.t,type=kind,playerId=id,source=source}
        if extra then for k,v in pairs(extra) do e[k]=v end end
        table.insert(events,e)
    end
    local function appendActor(model,id,tm,kind,player)
        if not model or not model:IsA("Model") then return end
        local root=part(model:FindFirstChild("HumanoidRootPart")) or part(model:FindFirstChild("Torso"))
        if not root or not root:IsA("BasePart") then return end
        local values=model:FindFirstChild("Values")
        -- Parked NPC keepers are not active match actors. Match the viewer's height heuristic.
        -- Never apply this filter to human players.
        if kind=="npc" and (root.Position.Y>91.17 or root.Position.Y< -23.83) then return end
        local held=readValue(values,"HasBall")
        local entry={id=id,team=tm,kind=kind,cf=cf(root.CFrame),hasBall=held==true}
        if player then
            local sliding=readValue(values,"Sliding")
            if type(sliding)=="boolean" then
                entry.sliding=sliding
            end
            seenActors[id]=true
            -- Observe the existing boolean only, never infer the cause of a stun.
            local stunObject=values and values:FindFirstChild("Stunned")
            local prior=s.stunStates[id]
            if stunObject and stunObject:IsA("BoolValue") then
                local stunned=stunObject.Value
                seenStuns[id]=true
                if prior and prior.object==stunObject and prior.team==tm and prior.value==false and stunned then
                    addEvent("stunned",id,"state")
                end
                s.stunStates[id]={object=stunObject,team=tm,value=stunned}
            end
        end
        if player and pollStyles then
            local function validStyle(v) return type(v)=="string" and #v>0 and #v<=128 end
            local style=readValue(player:FindFirstChild("PlayerStats"),"Style")
            local source="playerStats"
            if not validStyle(style) then
                style=model:GetAttribute("Style")
                source="characterAttribute"
            end
            if validStyle(style) then
                if #s.frames==0 or s.lastStyles[id]~=style or s.lastStyleSources[id]~=source then
                    entry.style=style
                    entry.styleSource=source
                end
                local info=s.players[tostring(id)]
                if info and not info.firstObservedStyle then
                    info.firstObservedStyle=style
                    info.firstObservedStyleAt=frame.t
                    info.firstObservedStyleSource=source
                end
                if s.lastStyles[id] and s.lastStyles[id]~=style then
                    s.abilityStates[id]=nil
                    s.dirtyAbility[id]=true
                end
                s.lastStyles[id]=style
                s.lastStyleSources[id]=source
            end
        end
        if player then
            if pollStyles then
                -- Explicit replicated Flow fields only; unknown is not inactive.
                local stats=player:FindFirstChild("PlayerStats")
                local flow=readValue(stats,"Flow")
                local inFlow=readValue(stats,"InFlow")
                local flowBar=readValue(stats,"FlowBar")
                if type(flow)~="string" or #flow==0 or #flow>128 then flow=nil end
                if type(inFlow)~="boolean" then inFlow=nil end
                if type(flowBar)~="number" or flowBar~=flowBar or flowBar<0 or flowBar>100 then flowBar=nil end
                if flowBar~=nil then flowBar=round(flowBar) end
                local lastFlow=s.lastFlows[id]
                if not lastFlow or not s.actorSeen[id] or #s.frames==0 or lastFlow.name~=flow or lastFlow.active~=inFlow or lastFlow.bar~=flowBar then
                    entry.flowObserved=true
                    entry.flow=flow
                    entry.inFlow=inFlow
                    entry.flowBar=flowBar
                end
                s.lastFlows[id]={name=flow,active=inFlow,bar=flowBar}
                local awk,ready,active=awakeningState(player)
                local prior=s.lastAwakening[id]
                if prior and prior.active~=nil and active~=nil and prior.active~=active then
                    invalidateNames(s,id)
                end
                if not prior or prior.state~=awk or prior.ready~=ready or prior.active~=active or #s.frames==0 then
                    entry.awk=awk
                    -- Explicit booleans (when available) let the viewer revise ready-state interpretation.
                    entry.awkReadyFlag=ready
                    entry.inAwakening=active
                    if prior and prior.state~=awk then addEvent("awakening_state",id,"playerStats",{awk=awk,readyFlag=ready,inAwakening=active}) end
                end
                s.lastAwakening[id]={state=awk,ready=ready,active=active}
            end
            if #s.frames==0 or s.dirtyAbility[id] or not s.actorSeen[id] then
                entry.abilitySlots=copyKit(s.abilityStates[id])
                s.dirtyAbility[id]=nil
            end
        end
        table.insert(frame.players,entry)
        table.insert(actors,{model=model,id=id,held=held==true})
    end
    s.localId=idFor(s,me)
    for _,p in ipairs(Players:GetPlayers()) do
        local tm=team(p)
        if tm=="Home" or tm=="Away" then
            appendActor(p.Character,idFor(s,p),tm,"player",p)
        end
    end
    for _,tm in ipairs({"Home","Away"}) do
        local model=path(workspace,"AI",tm,"GK")
        if model and model:IsA("Model") then
            appendActor(model,actorId(s,tm),tm,"npc")
        end
    end
    for id in pairs(s.stunStates) do
        if not seenStuns[id] then s.stunStates[id]=nil end
    end
    for id in pairs(s.actorSeen) do
        if not seenActors[id] then
            s.lastAwakening[id]=nil
            s.abilityStates[id]=nil
            s.dirtyAbility[id]=nil
        end
    end
    s.actorSeen=seenActors
    frame.ball={state="unknown"}
    local balls={}
    local free=part(workspace:FindFirstChild("Football"))
    if free then table.insert(balls,{ball=free}) end
    for _,a in ipairs(actors) do
        local b=part(a.model:FindFirstChild("Football"))
        if b then table.insert(balls,{ball=b,owner=a.id}) end
    end
    -- Do not invent a ball position if replication temporarily exposes multiple copies.
    if #balls==1 then
        local b=balls[1]
        frame.ball={state=b.owner and "held" or "free",owner=b.owner,cf=cf(b.ball.CFrame)}
    end
    -- Poll only named replicated match counters, at 5 Hz (not on every frame).
    -- Baseline new/rejoined players and missing/recreated counters without inventing credits.
    if pollStyles then
        s.nextStatsAt=frame.t+1/STATS_RATE
        local stats={}
        local observed={}
        for _,p in ipairs(Players:GetPlayers()) do
            local tm=team(p)
            if p==me or tm=="Home" or tm=="Away" then
                local id=idFor(s,p)
                local folder=p:FindFirstChild("GameStats")
                local prior=s.previousStats[id]
                if not prior or prior.folder~=folder or prior.team~=tm then
                    prior={folder=folder,team=tm,values={},objects={}}
                    s.previousStats[id]=prior
                end
                observed[id]=true
                for _,name in ipairs(counterNames) do
                    if p==me or counterEvents[name] then
                        local obj=folder and folder:FindFirstChild(name)
                        local v=readValue(folder,name)
                        if type(v)=="number" and v==v and v>=0 and v<1e12 then
                            if p==me then stats[name]=v end
                            local previous=prior.values[name]
                            if prior.objects[name]==obj and previous~=nil and v>previous and counterEvents[name] then
                                addEvent(counterEvents[name],id,"counter",{delta=v-previous,value=v})
                            end
                            prior.values[name]=v
                            prior.objects[name]=obj
                        else
                            prior.values[name]=nil
                            prior.objects[name]=nil
                        end
                    end
                end
            end
        end
        for id in pairs(s.previousStats) do
            if not observed[id] then s.previousStats[id]=nil end
        end
        local playerStats=me:FindFirstChild("PlayerStats")
        for _,name in ipairs(playerStatNames) do
            local v=readValue(playerStats,name)
            if type(v)=="string" and #v<=128 then stats[name]=v end
        end
        local inFlow=readValue(playerStats,"InFlow")
        local flowBar=readValue(playerStats,"FlowBar")
        if type(inFlow)=="boolean" then stats.InFlow=inFlow end
        if type(flowBar)=="number" and flowBar==flowBar and flowBar>=0 and flowBar<=100 then stats.FlowBar=round(flowBar) end
        -- Full snapshot at each chunk boundary; changed fields otherwise.
        local delta={}
        if #s.frames==0 then delta=stats else
            for k,v in pairs(stats) do
                if s.lastStats[k]~=v then delta[k]=v end
            end
        end
        if next(delta) then frame.localStats=delta end
        for k,v in pairs(stats) do s.lastStats[k]=v end
    end
    if frame.t>=s.nextBoardAt or #s.frames==0 then
        s.nextBoardAt=frame.t+1/BOARD_RATE
        snapshotBoard(s,frame)
    end
    if #events>0 then
        frame.events=events
    end
    local cam=workspace.CurrentCamera
    if cam then frame.camera={cf=cf(cam.CFrame),fov=round(cam.FieldOfView)} end
    local board=path(pg,"InGameUI","Scoreboard")
    frame.scoreboard={home=label(path(board,"Frame","Home","Score","TextLabel")),
        away=label(path(board,"Frame","Away","Score","TextLabel")),timer=label(path(board,"Timer","TextLabel"))}
    s.count+=1;s.lastT=frame.t
    table.insert(s.frames,frame)
end
local function start()
    local now=DateTime.now()
    local id=HttpService:GenerateGUID(false)
    local name=now:FormatLocalTime("YYYY-MM-DD_HH-mm-ss","en-us").."_"..id:sub(1,8)
    local folder=ROOT.."/"..name
    makefolder(folder)
    local s={id=id,createdAt=math.floor(now.UnixTimestampMillis/1000),folder=folder,started=os.clock(),
        lastFlush=os.clock(),lastT=0,frames={},players={},ids={},nextId=0,count=0,chunks=0,
        nextStatsAt=0,nextBoardAt=0,previousStats={},lastStats={},lastStyles={},lastStyleSources={},lastRoles={},stunStates={},abilityStates={},dirtyAbility={},lastAwakening={},lastFlows={},actorSeen={},pendingEvents={},droppedAbilityUpdates=0}
    flush(s,false)
    session=s; accumulator=0
    button.Text="■ Stop & Save"
    button.BackgroundColor3=Color3.fromRGB(157,62,71)
    status.Text="Recording · 0 frames"
end
local function stop()
    local s=session
    if not s then return end
    if not s.paused and #s.pendingEvents>0 then
        local sampled,err=pcall(sample,s)
        if not sampled then warn("[Replay] Final sample failed: "..tostring(err)) end
    end
    s.paused=true
    local ok,err=pcall(flush,s,true)
    if not ok then status.Text="Save failed · click to retry";warn(err);return end
    session=nil
    button.Text="● Record"
    button.BackgroundColor3=Color3.fromRGB(58,105,157)
    status.Text=string.format("Saved %d frames · files",s.count)
    print("[Replay] Saved: "..s.folder)
end
local function toggle()
    if busy then return end
    busy=true
    local ok,err=pcall(function() if session then stop() else start() end end)
    busy=false
    if not ok then status.Text="Recorder error · see Output";warn(err) end
end
button.Activated:Connect(toggle)
UserInputService.InputBegan:Connect(function(input,processed)
    if input.KeyCode==Enum.KeyCode.F7 and session then toggle();return end
    if not processed and input.KeyCode==Enum.KeyCode.F6 and not session then toggle() end
end)
RunService:BindToRenderStep("ReplayRecorder06",Enum.RenderPriority.Camera.Value+1,function(dt)
    local s=session
    if not s or busy or s.paused then return end
    accumulator+=dt
    if accumulator>=1/RATE then
        accumulator%=1/RATE
        local ok,err=pcall(sample,s)
        if not ok then s.paused=true;status.Text="Sample failed · click to save";warn(err);return end
    end
    if s.count>=MAX_FRAMES then
        busy=true
        task.defer(function()
            local ok,err=pcall(stop)
            busy=false
            if not ok then s.paused=true;warn(err) end
        end)
        return
    end
    if os.clock()-s.lastFlush>=CHUNK_SECONDS then
        busy=true
        task.defer(function()
            local ok,err=pcall(flush,s,false)
            busy=false
            if not ok then s.paused=true;status.Text="Save failed · click to retry";warn(err);return end
            status.Text=string.format("REC %.0fs · %d frames",s.lastT,s.count)
        end)
    end
end)

print("[Replay] v0.16 Lite ready. F6 start / F7 stop. Local files only.")
