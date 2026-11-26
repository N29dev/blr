// Independent factual notes from the supplied client snapshot. No original game code.
export const RARE_LUA_REVIEW={
  "isagi": {
    "kit": "Regular: C Direct Shot, V Fadeaway; awakened B Final Shot. Outside awakening, mastery I changes C by possession, II changes V by Vision Stoppage state, III adds B Side Step Dribble. Mastery IV awakening replaces C/V/B with Demon King / Two Gun Volley / Adaptive Win. Disabled mastery levels are respected.",
    "moves": {
      "Direct Shot|Regular|base": {
        "summary": "On-ball camera-directed shot, additive vertical tilt.",
        "phases": [
          {
            "at": "Activation",
            "text": "Apply configured cooldown, or 15 s during awakening; play shot sequence."
          },
          {
            "at": "Response",
            "text": "Launch using camera direction plus configured tilt; drag begins."
          }
        ],
        "stats": [
          {
            "label": "Awakened client cooldown",
            "value": 15,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Direct Shot|Mastery I|base": {
        "summary": "On-ball mastery shot; the implemented client cooldown is 43 s, distinct from the configured 35 s.",
        "phases": [
          {
            "at": "Activation",
            "text": "Apply 43 s client cooldown and request mastery Direct Shot."
          },
          {
            "at": "Response",
            "text": "Clamp camera Y to the configured minimum; multiply by power without normalizing."
          }
        ],
        "stats": [],
        "shot": {
          "p": 170,
          "k": 0.15,
          "mode": "minimum",
          "conditional": true
        }
      },
      "Direct Shot|Mastery I|chemical": {
        "summary": "Hiori reaction dispatches to its own receiver logic instead of the regular mastery shot. Do not reuse the ordinary trajectory.",
        "phases": [],
        "stats": [],
        "hideShot": true
      },
      "I AM... A STRIKER!": {
        "summary": "Bachira reaction dispatches through a dedicated receiver, not the ordinary Direct Shot. Source contains multiple release branches.",
        "phases": [],
        "stats": [],
        "hideShot": true
      },
      "Fadeaway": {
        "summary": "Requires possession, unanchored ball, ready V and nearby eligible opponent.",
        "phases": [
          {
            "at": "Activation",
            "text": "Request targeted move and set ability state."
          },
          {
            "at": "0.35 s",
            "text": "Scheduled state reset; not measured animation length."
          }
        ],
        "stats": []
      },
      "Omnivision": {
        "summary": "Mastery I off-ball C state. The client uses a 33 s cooldown and schedules an 8 s callback; possession can change its behavior.",
        "phases": [],
        "stats": []
      },
      "Meta-Burst Point": {
        "summary": "Off-ball grounded V branch; 3 s initial slot lock, not necessarily the final cooldown.",
        "phases": [
          {
            "at": "Activation",
            "text": "Initialize state and short lock."
          },
          {
            "at": "During state",
            "text": "Client proximity condition references 12 studs; not a measured tackle hitbox."
          },
          {
            "at": "5 s",
            "text": "Conditional configured cooldown application."
          }
        ],
        "stats": [
          {
            "label": "Proximity check",
            "value": 12,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Conditional cooldown check",
            "value": 5,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Vision Stoppage": {
        "summary": "Off-ball V follow-up, grounded on entry. Jump-height label is used as vertical velocity, not achieved height.",
        "phases": [
          {
            "at": "0.15 s",
            "text": "Apply configured upward velocity."
          },
          {
            "at": "0.55 / 0.75 s",
            "text": "Later jump stages."
          },
          {
            "at": "Response",
            "text": "Ball velocity supplied by response; not a camera-shot formula."
          }
        ],
        "stats": []
      },
      "Side Step Dribble": {
        "summary": "Three successive movement targets; requires possession, grounded state and no trap.",
        "phases": [
          {
            "at": "0 s",
            "text": "20 right and 20 forward, 0.5 s tween."
          },
          {
            "at": "0.5 s",
            "text": "20 left and 20 forward, 0.5 s tween."
          },
          {
            "at": "1.5 s",
            "text": "Configured forward distance, 0.5 s tween."
          },
          {
            "at": "2.3 s",
            "text": "Scheduled cleanup."
          }
        ],
        "stats": [
          {
            "label": "Singularity cooldown",
            "value": 34,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "First diagonal target",
            "value": 28.28,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Scheduled cleanup",
            "value": 2.3,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ],
        "motion": [
          {
            "kind": "ease-out",
            "distance": 28.284271247461902,
            "duration": 0.5,
            "direction": "Right + forward"
          },
          {
            "kind": "ease-out",
            "distance": 28.284271247461902,
            "duration": 0.5,
            "direction": "Left + forward"
          }
        ]
      },
      "Final Shot": {
        "summary": "Grounded on-ball awakened B. Shared cutscene helper; effective power unresolved in the available record.",
        "phases": [],
        "stats": []
      },
      "Demon King": {
        "summary": "Off-ball awakening aerial attack; ball must be within a character-relative selection box.",
        "phases": [
          {
            "at": "Activation",
            "text": "Loose ball in 12 × 24 × 12 stud box centered 20 studs above and 6 forward of the root."
          },
          {
            "at": "0.1 s",
            "text": "Request move and capture horizontal facing."
          },
          {
            "at": "Response",
            "text": "Velocity is horizontal facing × 225 plus 45 stud/s upward; no camera-dependent curve."
          },
          {
            "at": "6.333 s",
            "text": "Scheduled cutscene cleanup."
          }
        ],
        "stats": [
          {
            "label": "Box width",
            "value": 12,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Box height",
            "value": 24,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Box depth",
            "value": 12,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Horizontal launch speed",
            "value": 225,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Upward launch speed",
            "value": 45,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          }
        ],
        "shot": {
          "p": 225,
          "k": 0.2,
          "mode": "fixed",
          "horizontalFacing": true,
          "conditional": true
        }
      },
      "Two Gun Volley": {
        "summary": "Mastery IV awakened V; modeled shared minimum-vertical launch only.",
        "phases": [],
        "stats": []
      },
      "Adaptive Win": {
        "summary": "Mastery IV awakened B; modeled shared minimum-vertical launch only.",
        "phases": [],
        "stats": []
      }
    }
  },
  "kurona": {
    "kit": "C OneTwo (Planet Hotline during awakening). V Bait Dribble on-ball or Shark Steal off-ball.",
    "moves": {
      "OneTwo": {
        "summary": "Guided teammate pass and return sequence; initial use checks possession and grounded state.",
        "phases": [
          {
            "at": "Activation",
            "text": "Select teammate within 150 studs; 40 s normal client cooldown, 2 s Planet Hotline branch."
          },
          {
            "at": "Pass / receive response",
            "text": "Initial direction toward predicted receiver plus 0.5 upward; multiplier min(150, 2.75 × separation)."
          },
          {
            "at": "Guidance",
            "text": "Direction interpolation 6.5 × dt; velocity interpolation 7 × dt; upward target 0.1. Three-second timer and possession-dependent completion."
          }
        ],
        "stats": [
          {
            "label": "Teammate selection threshold",
            "value": 150,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Guidance timer",
            "value": 3,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ],
        "pass": {
          "initial": 2.75,
          "guided": 2.75,
          "tilt": 0.5,
          "cap": 150,
          "description": "Guidance uses direction interpolation 6.5 × dt and velocity interpolation 7 × dt. The outgoing branch uses player separation; return branch uses ball-to-receiver separation. Upward target 0.1; three-second timer."
        }
      },
      "Bait Dribble": {
        "summary": "On-ball targeted two-stage diagonal dribble.",
        "phases": [
          {
            "at": "0.1 s",
            "text": "First target at −45° yaw, configured travel distance, 0.3 s tween."
          },
          {
            "at": "0.5 s",
            "text": "Second target at +45° yaw, same distance and tween."
          },
          {
            "at": "0.7 s",
            "text": "Cleanup may truncate the second target tween."
          }
        ],
        "stats": [
          {
            "label": "Scheduled cleanup",
            "value": 0.7,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Shark Steal": {
        "summary": "Off-ball grounded tackle; eligible opponent has possession, is not dribbling and is within 20 studs.",
        "phases": [
          {
            "at": "Activation",
            "text": "Apply 45 s cooldown and begin movement."
          },
          {
            "at": "Movement",
            "text": "Loop ends after 1 s or within 3 studs of target."
          }
        ],
        "stats": [
          {
            "label": "Opponent selection threshold",
            "value": 20,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Movement termination proximity",
            "value": 3,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Movement timeout",
            "value": 1,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Planet Hotline": {
        "summary": "Awakened off-ball grounded C with eligible nearby teammate. Shot preview represents identified helper branch only.",
        "phases": [],
        "stats": []
      }
    }
  },
  "gagamaru": {
    "kit": "C Instincts Reaction only when goalkeeper and currently diving, otherwise Scorpion Kick. V Fast Reactions when goalkeeper in penalty area, otherwise Diving Header. Awakening adds B Super Reflexes.",
    "moves": {
      "Instincts Reaction": {
        "summary": "Off-ball C; picks a direction from current horizontal movement, then uses a 25-stud target.",
        "phases": [
          {
            "at": "Activation",
            "text": "Choose directional animation; side branches target opposite horizontal motion."
          },
          {
            "at": "0–0.5 s",
            "text": "Dash target tween."
          },
          {
            "at": "0.5 s",
            "text": "Scheduled ability-state reset."
          }
        ],
        "stats": [
          {
            "label": "Dash target distance",
            "value": 25,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          }
        ],
        "motion": [
          {
            "kind": "ease-out",
            "distance": 25,
            "duration": 0.5,
            "direction": "Selected movement branch"
          }
        ]
      },
      "Scorpion Kick": {
        "summary": "Off-ball ball-seeking movement, with different goalkeeper and outfield branches. Shot goes through basic Shoot response, not the generic ability-shot helper.",
        "phases": [
          {
            "at": "Outfield",
            "text": "Movement velocity magnitude clamps twice ball distance to 75–90 stud/s, with upward-biased direction."
          },
          {
            "at": "Goalkeeper in penalty area",
            "text": "Horizontal velocity scales with distance; separate vertical velocity."
          },
          {
            "at": "Possession acquired",
            "text": "Request shot using configured Scorpion power. Actual release follows basic-shot response."
          }
        ],
        "stats": [
          {
            "label": "Outfield movement speed min",
            "value": 75,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Outfield movement speed max",
            "value": 90,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Fast Reactions": {
        "summary": "Goalkeeper V inside own penalty area; normal and awakened branches differ.",
        "phases": [
          {
            "at": "Normal",
            "text": "Cooldown = configured Diving Header cooldown − 5; apply speed boost, reset on leaving penalty area or after 7 s."
          },
          {
            "at": "Awakened",
            "text": "Handstand branch rotates character 180°, waits for response marker, then requests shot power 170."
          },
          {
            "at": "2.3 s",
            "text": "Handstand fallback cleanup; not measured active save window."
          }
        ],
        "stats": [
          {
            "label": "Normal client cooldown",
            "value": 45,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Normal speed boost",
            "value": 12,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Normal maximum timer",
            "value": 7,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Handstand requested shot power",
            "value": 170,
            "unit": "",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Diving Header": {
        "summary": "Outfield V requires no possession. Non-goalkeeper outside penalty area checks loose ball and height.",
        "phases": [
          {
            "at": "Selection",
            "text": "Ball world Y 18–45; vertical separation at most 37; distance must satisfy configured activation range."
          },
          {
            "at": "Movement",
            "text": "Velocity controller clamps target distance to speed 100–110 and adds upward 25 stud/s."
          },
          {
            "at": "1.05 s",
            "text": "Scheduled ability-state reset in non-goalkeeper branch."
          }
        ],
        "stats": [
          {
            "label": "Minimum ball world Y",
            "value": 18,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Maximum ball world Y",
            "value": 45,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Maximum vertical separation",
            "value": 37,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Movement speed minimum",
            "value": 100,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Movement speed maximum",
            "value": 110,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Super Reflexes": {
        "summary": "Goalkeeper-only in penalty area, off-ball grounded, loose aerial ball within 70 studs; selects farthest eligible teammate ahead within configured pass range.",
        "phases": [
          {
            "at": "Activation",
            "text": "Request cutscene and selected teammate."
          },
          {
            "at": "Response",
            "text": "Pass direction toward receiver plus 0.35 upward; speed multiplier min(150, 1.5 × separation)."
          },
          {
            "at": "Guidance",
            "text": "Upward target 0.35 then 0.15 after 0.55 s; multiplier min(150, 2.75 × separation). Ends within 7 studs, on possession, missing ball, or after 2 s."
          }
        ],
        "stats": [],
        "pass": {
          "initial": 1.5,
          "guided": 2.75,
          "tilt": 0.35,
          "cap": 150,
          "description": "Direction and velocity interpolation 6.5 × dt. Guided upward target switches 0.35 → 0.15 after 0.55 s; ends within 7 studs, on possession, missing ball, or 2 s."
        }
      }
    }
  },
  "chigiri": {
    "kit": "Regular C Speedster, V Accelerate, awakened B Blast. Mastery I C High-Speed Speedster / Parkour Shot state; II V Panther Illusion; III B No-Break Dribble. Mastery IV awakening C 44° Red Panther Sniper, V Panther Illusion, B Match Cut-In.",
    "moves": {
      "Speedster": {
        "summary": "Applies configured additive speed boost; duration uses a balancing parameter, not inferred from cooldown.",
        "phases": [],
        "stats": []
      },
      "Accelerate": {
        "summary": "Ready V, ability lock elapsed, not ragdolled; request movement. Full cooldown uses balancing configuration, actual motion is not in this wrapper.",
        "phases": [],
        "stats": []
      },
      "High-Speed Speedster": {
        "summary": "Grounded C. Initial cooldown uses MoveSpeedDuration; later cleanup applies configured cooldown. Parkour Shot follow-up can be enabled.",
        "phases": [],
        "stats": []
      },
      "Parkour Shot": {
        "summary": "Follow-up uses the shared minimum-vertical shot helper; actual release depends on response.",
        "phases": [],
        "stats": []
      },
      "Panther Illusion": {
        "summary": "Two-charge V, first use has 1.5 s recast; second clears charge and applies Accelerate's configured cooldown.",
        "phases": [],
        "stats": [
          {
            "label": "Uses per sequence",
            "value": 2,
            "unit": "",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Recast cooldown",
            "value": 1.5,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "No-Break Dribble": {
        "summary": "On-ball B with steerable dash; 0.8 s nominal helper duration.",
        "phases": [
          {
            "at": "0–0.4 s",
            "text": "Speed callback returns 6 stud/s."
          },
          {
            "at": "After 0.4 s",
            "text": "Speed eases from configured 150 toward 70% over 0.5 s; helper ends nominally at 0.8 s. Field collisions can stop movement."
          },
          {
            "at": "Cleanup",
            "text": "Reset speed boost and animation."
          }
        ],
        "stats": [
          {
            "label": "Helper duration",
            "value": 0.8,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Slow phase",
            "value": 0.4,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Configured end-speed target",
            "value": 105,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Temporary speed boost",
            "value": 10,
            "unit": "stud/s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "Blast": {
        "summary": "Regular awakening B uses two charges; first cooldown 1.5 s, second full configured cooldown. Copied variant can differ.",
        "phases": [],
        "stats": [
          {
            "label": "Uses per sequence",
            "value": 2,
            "unit": "",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Recast cooldown",
            "value": 1.5,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ]
      },
      "44° Red Panther Sniper": {
        "summary": "Awakened on-ball grounded C; the name is not evidence of a fixed 44° launch. Shared helper model uses the configured minimum vertical component.",
        "phases": [],
        "stats": []
      },
      "Match Cut-In": {
        "summary": "Grounded on-ball B with three movement stages.",
        "phases": [
          {
            "at": "0.05 s",
            "text": "Left 20 studs, 0.15 s target tween."
          },
          {
            "at": "0.3 s",
            "text": "Right 20 studs, 0.25 s target tween."
          },
          {
            "at": "0.6 s",
            "text": "Configured forward distance, linear 0.6 s tween."
          },
          {
            "at": "1.2 s",
            "text": "Scheduled cleanup."
          }
        ],
        "stats": [
          {
            "label": "Lateral target",
            "value": 20,
            "unit": "stud",
            "kind": "Client-derived · reviewed"
          },
          {
            "label": "Scheduled cleanup",
            "value": 1.2,
            "unit": "s",
            "kind": "Client-derived · reviewed"
          }
        ],
        "motion": [
          {
            "kind": "ease-out",
            "distance": 20,
            "duration": 0.15,
            "direction": "Left"
          },
          {
            "kind": "ease-out",
            "distance": 20,
            "duration": 0.25,
            "direction": "Right"
          }
        ]
      }
    }
  },
  "raichi": {
    "kit": "C Victory Pass on-ball / Stoppage off-ball; V Disruption; awakened C Matchup Victory replaces both.",
    "moves": {
      "Victory Pass": {
        "summary": "Grounded on-ball C, selects teammate within configured range; guided pass.",
        "phases": [
          {
            "at": "Activation",
            "text": "Select eligible teammate, apply cooldown."
          },
          {
            "at": "Response",
            "text": "Aim toward receiver position plus horizontal receiver velocity; add 0.5 upward, multiplier min(150, 1.5 × separation)."
          },
          {
            "at": "Guidance",
            "text": "Upward target 0.35 then 0.15; multiplier min(150, 2.75 × player separation). Stops after 1 s, on possession, low ball or near receiver."
          }
        ],
        "stats": [],
        "pass": {
          "initial": 1.5,
          "guided": 2.75,
          "tilt": 0.5,
          "cap": 150,
          "description": "Direction and velocity interpolation 6.5 × dt; stop at 1 s, possession, ball Y < 5 or receiver separation ≤ 7 studs."
        }
      },
      "Stoppage": {
        "summary": "Off-ball grounded C. Speed boost and own-walk state end on response or 3 s fallback. Configured selection radius does not establish a hitbox.",
        "phases": [
          {
            "at": "Activation",
            "text": "Apply cooldown, enable movement state and speed boost."
          },
          {
            "at": "Response / 3 s",
            "text": "Cleanup resets speed and state."
          }
        ],
        "stats": []
      },
      "Disruption": {
        "summary": "Off-ball grounded V; anchored ball excluded. Conditional movement and ball-position checks, not an unconditional tackle.",
        "phases": [
          {
            "at": "Activation",
            "text": "Select branch according to ball state and field geometry."
          },
          {
            "at": "0.6 s",
            "text": "Scheduled branch callback; cooldown only applied on subsequent qualifying ball-distance check."
          },
          {
            "at": "Additional 0.5 s",
            "text": "Conditional cleanup."
          }
        ],
        "stats": []
      },
      "Matchup Victory": {
        "summary": "Awakened on-ball grounded C with teammate selection. Guided pass uses distinct initial and tracking distance calculations.",
        "phases": [
          {
            "at": "Activation",
            "text": "Select teammate and apply cooldown."
          },
          {
            "at": "Response",
            "text": "Predicted receiver direction + 0.5 upward; min(150, 1.5 × separation)."
          },
          {
            "at": "Guidance",
            "text": "Min(150, 2.75 × current receiver-to-ball separation), with 6.5 × dt interpolation."
          }
        ],
        "stats": [],
        "pass": {
          "initial": 1.5,
          "guided": 2.75,
          "tilt": 0.5,
          "cap": 150,
          "description": "The tracking multiplier uses receiver-to-ball separation rather than initial player separation; upward target changes from 0.35 to 0.15. Stops on low ball or receiver proximity."
        }
      }
    }
  }
};
const el=(tag,txt)=>{const n=document.createElement(tag);if(txt!=null)n.textContent=txt;return n;};
export function renderRarePass(spec){
 const root=el('details');root.append(el('summary','Guided pass · distance model'),el('p','Initial multiplier = min('+spec.cap+', '+spec.initial+' × separation); tracking multiplier = min('+spec.cap+', '+spec.guided+' × separation). Initial upward component: '+spec.tilt+'. '+spec.description));
 const input=el('input'),out=el('output');input.type='range';input.min=0;input.max=330;input.value=50;input.style.width='100%';input.setAttribute('aria-label','Illustrative separation in studs');function draw(){const d=Number(input.value);out.textContent=d+' studs · initial multiplier '+Math.min(spec.cap,d*spec.initial).toFixed(1)+' · tracking multiplier '+Math.min(spec.cap,d*spec.guided).toFixed(1);}input.addEventListener('input',draw);draw();root.append(input,out,el('p','Multipliers are not actual speed magnitude, flight distance or a hitbox. Receiver motion changes the trajectory.'));return root;
}
// Separate basic-shot branch. Illustrates horizontal acceleration only, not flight or landing.
export function curveHorizontal({power=100,charge=100,divisor=3.5,launchDivisor=2,seconds=2,sign=1,dt=1/60}={}){
 let x=0,z=0,vx=sign*power/launchDivisor,vz=power,correction=-charge/divisor,active=true;const points=[[0,0]];for(let t=0;t<seconds;t+=dt){if(active){correction+=charge/6*dt;if(correction>=-charge/8)active=false;vx+=sign*correction*6.5*dt;}x+=vx*dt;z+=vz*dt;points.push([x,z]);}return points;
}
export function renderCurveReference(){
 const root=el('details');root.append(el('summary','Shared basic shots · curve model'),el('p','The grounded basic-shot response can add a sideways launch component and then bend back using a decaying lateral velocity adjustment. The shared ability-shot helper instead clamps vertical aim and does not itself apply this curve. No Rare ability should be labeled curved merely because this branch exists.'));
 const body=el('div');root.append(body);let built=false;root.addEventListener('toggle',()=>{if(!root.open||built)return;built=true;
 const make=(label,min,max,value,step)=>{const row=el('label',label+' '),input=el('input');input.type='range';input.min=min;input.max=max;input.step=step;input.value=value;input.style.width='100%';row.style.display='block';row.append(input);body.append(row);return input;};
 const power=make('Illustrative effective launch power',50,200,100,1),charge=make('Charge variable',50,110,100,1),div=make('Curve divisor (scenario)',2,7,3.5,.1),launch=make('Launch divisor (scenario)',1,5,2,.1);
 const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');svg.setAttribute('viewBox','0 0 400 220');svg.style.cssText='width:100%;background:#101923;border:1px solid #405267;border-radius:6px';svg.setAttribute('role','img');svg.setAttribute('aria-label','Illustrative top-down curved and straight shot comparison');const path=(color)=>{const p=document.createElementNS(ns,'polyline');p.setAttribute('fill','none');p.setAttribute('stroke',color);p.setAttribute('stroke-width','2');svg.append(p);return p;};const straight=path('#8192a5'),curve=path('#89d6a9'),out=el('p');body.append(svg,out,el('p','Top-down 2-second scenario at 60 Hz. Gray = straight; green = curve. The nearest goal and character facing determine the side in the client. No gravity, drag, collisions, possession changes or server correction are modeled here; this is not landing range. Flow-specific divisors were not present in the supplied stats export. The 3.5 divisor is the explicit awakened NEL Rin fallback, not a verified Rare-style flow value.'));
 function draw(){const p=+power.value,c=+charge.value,d=+div.value,l=+launch.value,pts=curveHorizontal({power:p,charge:c,divisor:d,launchDivisor:l});const maxX=Math.max(1,...pts.map(q=>Math.abs(q[0]))),scale=Math.min(170/(2*p),180/maxX),proj=q=>[200+q[0]*scale,200-q[1]*scale].join(',');straight.setAttribute('points',[[0,0],[0,2*p]].map(proj).join(' '));curve.setAttribute('points',pts.map(proj).join(' '));out.textContent='Power '+p+' · charge '+c+' · divisor '+d.toFixed(1)+' · launch divisor '+l.toFixed(1)+' · nominal correction duration '+Math.max(0,6*(1/d-1/8)).toFixed(2)+' s (possession may end it earlier).';}
 for(const input of [power,charge,div,launch])input.addEventListener('input',draw);draw();
 });return root;
}
