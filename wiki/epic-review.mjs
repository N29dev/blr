// Hand-reviewed, paraphrased gameplay observations from the 26 Nov 2026 client exports.
export const EPIC_REVIEW={
  "bachira": {
    "profile": "Epic in the exported style configuration; dribbling and unpredictable play. The separate old NEL Bachira record is marked unobtainable. The active selector uses mastery levels on Bachira.",
    "grades": [
      "D",
      "C",
      "C",
      "N/A",
      "C",
      "Skilled"
    ],
    "kit": "Mastery I unlocks Heel Center (B, outside awakening). II replaces V with The Butterfly / Butterfly Lift. III replaces C with Roulette / Stinger Shot. IV replaces awakened V/B with Bee Freestyle / Ginga Monster. A Studio-only Heel Center branch is not a regular live unlock.",
    "chem": [
      "Bachira X Lavinho: Lavinho → Bachira; configured 120 s cooldown and ≤160 studs separation.",
      "I AM... A STRIKER!: Bachira → Isagi; server-armed, configured cooldown 0 is not proof of unrestricted repeat use."
    ],
    "moves": {
      "Bee Flick": {
        "summary": "Lift the ball and follow its direction-dependent movement.",
        "phases": [
          [
            "0 s",
            "Start ability and select movement direction, with facing fallback when nearly stationary."
          ],
          [
            "0.2 s",
            "Second request after the initial lift request."
          ],
          [
            "Response",
            "Launch uses a horizontal direction with 0.5 upward component and travel-distance parameter + 30; movement targets the opposite direction relative to the selected vector."
          ],
          [
            "Response + 0.5 s",
            "Nominal dash target tween completes; actual travel is not measured."
          ]
        ]
      },
      "Monster Shot": {
        "summary": "Camera-directed shot requiring possession and a ready V slot."
      },
      "Heel Center": {
        "summary": "Mastery I on-ball pass; the regular selector assignment is Studio-only.",
        "selection": [
          "Mastery I outside awakening; regular row represents Studio-only assignment."
        ]
      },
      "Stinger Shot": {
        "summary": "Mastery III follow-up shown after the Roulette lift state.",
        "selection": [
          "Mastery III; Roulette lift state active."
        ]
      },
      "Roulette": {
        "summary": "Mastery III move with separate possession-dependent implementations.",
        "selection": [
          "Mastery III; no Roulette lift state."
        ],
        "phases": [
          [
            "Selection",
            "Dispatch to the possession or non-possession branch."
          ],
          [
            "On-ball",
            "Cooldown argument is 50 s when a valid target is found, otherwise 0.5 s initially; later cleanup can apply 50 s."
          ],
          [
            "Off-ball",
            "30 s client cooldown and possession-target check within 27 studs."
          ]
        ],
        "stats": [
          [
            "Off-ball target threshold",
            27,
            "stud"
          ],
          [
            "On-ball speed boost",
            5,
            "stud/s"
          ]
        ]
      },
      "The Butterfly": {
        "summary": "Mastery II on-ball opponent-targeted dribble opening Butterfly Lift.",
        "selection": [
          "Mastery II; lift state not active."
        ],
        "phases": [
          [
            "Activation",
            "Select enemy within configured range, start dribble animation; apply 1.5 s recast cooldown."
          ],
          [
            "3 s",
            "Conditional expiry applies full configured cooldown if lift remains pending."
          ]
        ]
      },
      "Butterfly Lift": {
        "summary": "Mastery II follow-up lifting the ball and moving forward.",
        "selection": [
          "Mastery II; Butterfly lift state active."
        ],
        "stats": [
          [
            "Actual launch upward component",
            0.75,
            ""
          ]
        ],
        "phases": [
          [
            "Activation",
            "Consume follow-up state and play character/ball animations."
          ],
          [
            "Response",
            "Launch along character facing with +0.75 vertical component; move toward configured 55-stud forward target."
          ],
          [
            "Response + 0.6 s",
            "Nominal target tween completes."
          ]
        ],
        "motion": [
          {
            "kind": "ease-out",
            "distance": 55,
            "duration": 0.6,
            "direction": "Character facing"
          }
        ]
      },
      "Scissor Kicks": {
        "summary": "Awakening dribble, opens Scissor Shot.",
        "selection": [
          "Awakened; Scissor Shot follow-up not active."
        ],
        "stats": [
          [
            "Forward velocity target",
            60,
            "stud/s"
          ],
          [
            "Movement controller lifetime",
            1.5,
            "s"
          ],
          [
            "Follow-up expiry check",
            2.5,
            "s"
          ]
        ],
        "phases": [
          [
            "0 s",
            "Start animation and forward velocity controller; 1 s recast cooldown."
          ],
          [
            "1.5 s",
            "Movement controller scheduled for removal."
          ],
          [
            "2.5 s",
            "Apply full configured cooldown if follow-up remains unused."
          ]
        ]
      },
      "Scissor Shot": {
        "summary": "Awakening shot replacing Scissor Kicks while its follow-up is active.",
        "selection": [
          "Awakened; Scissor Shot state active."
        ]
      },
      "Monster Trance": {
        "summary": "Regular awakening cutscene shot; on-ball with opponent target within 25 studs.",
        "stats": [
          [
            "Enemy selection threshold",
            25,
            "stud"
          ]
        ]
      },
      "Bee Freestyle": {
        "summary": "Mastery IV awakening shot; on-ball with opponent target within 35 studs.",
        "stats": [
          [
            "Enemy selection threshold",
            35,
            "stud"
          ]
        ]
      },
      "Ginga Monster": {
        "summary": "Mastery IV awakening off-ball cutscene; opponent target within 25 studs.",
        "stats": [
          [
            "Enemy selection threshold",
            25,
            "stud"
          ]
        ]
      }
    }
  },
  "hiori": {
    "profile": "NEL Hiori is listed as Epic in the extracted style configuration; specialized passing and support.",
    "grades": [
      "N/A",
      "N/A",
      "D",
      "N/A",
      "A",
      "Easy"
    ],
    "kit": "C alternates Cold Logic Turn / Link Pass. V is Below Zero Pass with possession and Absolute Zero Defense without it. Awakening replaces C with Permafrost Defense and unlocks B Hard Freeze Counter-Attack.",
    "chem": [
      "No-Look Away Cross: Hiori → Isagi; server-armed, configured cooldown 0 is not proof of unrestricted repeat use."
    ],
    "moves": {
      "Cold Logic Turn": {
        "summary": "Three-stage movement that enables Link Pass.",
        "selection": [
          "Link Pass follow-up not active."
        ],
        "stats": [
          [
            "Initial forward velocity target",
            50,
            "stud/s"
          ],
          [
            "Initial movement controller lifetime",
            0.7,
            "s"
          ],
          [
            "Lateral target each stage",
            30,
            "stud"
          ],
          [
            "Final forward target",
            30,
            "stud"
          ]
        ],
        "phases": [
          [
            "0 s",
            "Initial forward velocity; 3 s recast lock and Link Pass enabled."
          ],
          [
            "0.7 s",
            "Right target 30 studs, tween 0.4 s."
          ],
          [
            "1.8 s",
            "Left target 30 studs, tween 0.3 s."
          ],
          [
            "2.85 s",
            "Forward target 30 studs, tween 0.15 s."
          ],
          [
            "3 s",
            "Cleanup scheduled; after another 2 s, unused Link Pass state may expire and apply configured cooldown."
          ]
        ],
        "motion": [
          {
            "kind": "ease-out",
            "distance": 30,
            "duration": 0.4,
            "direction": "Right"
          },
          {
            "kind": "ease-out",
            "distance": 30,
            "duration": 0.3,
            "direction": "Left"
          },
          {
            "kind": "ease-out",
            "distance": 30,
            "duration": 0.15,
            "direction": "Facing direction"
          }
        ]
      },
      "Link Pass": {
        "summary": "Guided teammate pass, unlocked by Cold Logic Turn.",
        "selection": [
          "Link Pass follow-up active."
        ],
        "pass": {
          "tilt": 0.75,
          "cap": 150
        },
        "phases": [
          [
            "Activation",
            "Select a teammate in configured 95-stud range; clear follow-up state."
          ],
          [
            "0.15 s",
            "Scheduled animation/state callback."
          ],
          [
            "Response",
            "Launch toward predicted receiver position; distance-dependent speed and guided flight."
          ]
        ]
      },
      "Below Zero Pass": {
        "summary": "On-ball guided pass to a teammate within the configured 120-stud selection range.",
        "pass": {
          "tilt": 0.35,
          "cap": 150
        },
        "phases": [
          [
            "Activation",
            "Choose eligible teammate and start pass."
          ],
          [
            "0.5 s",
            "Scheduled animation/state callback."
          ],
          [
            "Response",
            "Launch toward predicted teammate, followed by guided flight."
          ]
        ]
      },
      "Absolute Zero Defense": {
        "summary": "Off-ball jump/interception with a guided movement component; the 125-stud value selects a teammate, not a steal radius.",
        "stats": [
          [
            "Scheduled fallback",
            5,
            "s"
          ]
        ],
        "phases": [
          [
            "Activation",
            "Start defense, select teammate and initialize movement."
          ],
          [
            "0.15 s",
            "Set upward character velocity from configured JumpHeight; 100 is a velocity parameter here, not actual height."
          ],
          [
            "0.55 s",
            "Next jump sequence stage."
          ],
          [
            "0.75 s",
            "Following stage."
          ],
          [
            "Response",
            "Ball velocity supplied by response; no camera-shot model."
          ],
          [
            "0.8 / 5 s",
            "Scheduled conditional callbacks."
          ]
        ]
      },
      "Hard Freeze Counter-Attack": {
        "summary": "Awakened aerial loose-ball interception and guided teammate pass.",
        "pass": {
          "tilt": 0.5,
          "cap": 150
        },
        "phases": [
          [
            "Activation",
            "Loose aerial ball within configured 40 studs, choose teammate within separate configured pass range."
          ],
          [
            "Response",
            "Launch toward predicted teammate position; guided follow-through."
          ],
          [
            "20 s",
            "Fallback cutscene cleanup, not measured length."
          ]
        ]
      },
      "Permafrost Defense": {
        "summary": "Awakened loose-ball defensive cutscene with a direction-dependent clearance.",
        "phases": [
          [
            "Activation",
            "Grounded, awakened, loose ball in configured range; additional own/opponent penalty-area checks."
          ],
          [
            "Response",
            "Ball launch uses character facing plus configured shot tilt vector, multiplied by power."
          ],
          [
            "10 s",
            "Fallback cleanup, not cutscene length."
          ]
        ]
      }
    }
  },
  "sendou": {
    "profile": "Epic in the exported configuration; U20 striker.",
    "grades": [
      "A",
      "B",
      "S+",
      "N/A",
      "N/A",
      "Medium"
    ],
    "kit": "C Ace Shot. V Decoy Striker with possession or active Tiki Taka charges, otherwise Line Clearance. While awakened and off-ball, V becomes Star Clear; B becomes Star Strike.",
    "chem": [],
    "moves": {
      "Ace Shot": {
        "summary": "On-ball camera-directed shot using additive vertical tilt.",
        "shot": {
          "p": 180,
          "k": 0.1,
          "mode": "additive",
          "conditional": true
        },
        "phases": [
          [
            "Activation",
            "Apply 40 s client cooldown and start shot animation."
          ],
          [
            "Response",
            "Launch using camera direction plus 0.1 upward component, scaled by configured power."
          ],
          [
            "2 s",
            "Fallback cleanup."
          ]
        ]
      },
      "Decoy Striker": {
        "summary": "Two-stage teammate passing sequence with a short recast and temporary speed boost.",
        "stats": [
          [
            "Teammate selection threshold",
            230,
            "stud"
          ],
          [
            "Initial charge state",
            2,
            ""
          ],
          [
            "Recast cooldown",
            1,
            "s"
          ],
          [
            "Speed boost",
            5,
            "stud/s"
          ],
          [
            "Conditional expiry",
            7,
            "s"
          ]
        ],
        "phases": [
          [
            "First use",
            "Select teammate; initialize two-charge state, start speed boost and 1 s recast."
          ],
          [
            "Follow-up",
            "Requires a teammate still holding the ball; seek another eligible teammate within 230 studs. Missing targets end the sequence."
          ],
          [
            "Second use / expiry",
            "Clear charge state and speed boost; full configured cooldown is applied conditionally."
          ]
        ]
      },
      "Line Clearance": {
        "summary": "Off-ball direction-dependent clearance movement.",
        "stats": [
          [
            "Velocity tween duration",
            0.5,
            "s"
          ],
          [
            "Miss cleanup check",
            0.6,
            "s"
          ],
          [
            "Fallback cleanup",
            1,
            "s"
          ]
        ],
        "phases": [
          [
            "Activation",
            "Choose lateral animation from movement direction; facing fallback when stationary."
          ],
          [
            "0–0.5 s",
            "Velocity controller targets configured movement speed and decelerates; exact displacement unknown."
          ],
          [
            "Response",
            "Ball receives response velocity on successful clearance."
          ],
          [
            "0.6 / 1 s",
            "Conditional miss cleanup and fallback."
          ]
        ]
      },
      "Star Strike": {
        "summary": "Awakening shot with possession or eligible loose-ball branches; 25-stud configured ball threshold.",
        "phases": [
          [
            "Activation",
            "Awakened, grounded and ability ready; possession or loose-ball branch."
          ],
          [
            "Response",
            "Shared modeled shot release; 8.7 s duration parameter is not measured cutscene length."
          ]
        ]
      },
      "Star Clear": {
        "summary": "Awakening off-ball clearance for loose ball in own penalty box and player near own penalty box."
      }
    }
  },
  "otoya": {
    "profile": "The exported style configuration still says Epic. The website currently lists Legendary following the later announcement; this review preserves the website rarity.",
    "grades": [
      "B",
      "B",
      "C",
      "N/A",
      "N/A",
      "Medium"
    ],
    "kit": "C Sneaky Steps if enemy target selection succeeds, otherwise Ninjistic Presence. V Nin. with possession or Shuriken Volley without. Awakening conditionally replaces C and B; the B slot can retain its previous display during cooldown.",
    "chem": [
      "Karasu x Otoya: eligible Karasu teammate and awakening context; see dedicated reaction slot. Its exact current server acceptance and duration need testing."
    ],
    "moves": {
      "Sneaky Steps": {
        "summary": "Off-ball opponent-targeted two-stage diagonal movement.",
        "stats": [
          [
            "Enemy selection threshold",
            20,
            "stud"
          ],
          [
            "First stage tween",
            0.4,
            "s"
          ],
          [
            "Second stage tween",
            0.6,
            "s"
          ],
          [
            "Scheduled cleanup",
            1,
            "s"
          ]
        ],
        "phases": [
          [
            "0 s",
            "Select opponent, start movement toward forward-left direction (2 forward : 1 left); first distance parameter unresolved."
          ],
          [
            "0.4 s",
            "Move forward-right (2 forward : 1 right) toward configured 40-stud target over 0.6 s."
          ],
          [
            "1 s",
            "Scheduled cleanup."
          ]
        ]
      },
      "Ninjistic Presence": {
        "summary": "Off-ball speed/stealth state when the Sneaky Steps selector has no eligible target.",
        "stats": [
          [
            "Speed boost",
            20,
            "stud/s"
          ],
          [
            "Maximum client timer",
            5,
            "s"
          ]
        ],
        "phases": [
          [
            "Activation",
            "Apply 45 s cooldown and speed boost."
          ],
          [
            "Possession change or cleanup",
            "Can terminate state early."
          ],
          [
            "5 s",
            "Scheduled cleanup if still active."
          ]
        ]
      },
      "Nin.": {
        "summary": "On-ball camera-directed shot through the shared shooting helper."
      },
      "Shuriken Volley": {
        "summary": "Off-ball teammate-assisted volley.",
        "stats": [
          [
            "Teammate selection threshold",
            20,
            "stud"
          ]
        ],
        "phases": [
          [
            "Activation",
            "Select teammate within 20 studs holding ball and not dribbling, or eligible training dummy."
          ],
          [
            "Response",
            "Shared shot helper handles release."
          ],
          [
            "2 s",
            "Scheduled cleanup."
          ]
        ]
      },
      "Not Happening": {
        "summary": "Conditional awakening C move; configured enemy range is a selection parameter rather than hitbox."
      },
      "Center of the World": {
        "summary": "Conditional awakening B cutscene shot; may be replaced by the eligible Karasu reaction."
      },
      "Karasu x Otoya": {
        "summary": "Conditional awakening chemical reaction with eligible Karasu teammate; configured power and duration do not prove actual trajectory."
      }
    }
  }
};
