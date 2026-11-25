/* ============================================================
   Hostel Fit Plan — shared data (exercises, shopping, targets, profile)
   Monthly meal + workout plans live in assets/plans/YYYY-MM.js
   pure veg · no egg · no rice · no tea/coffee
   kcal / protein are practical estimates for mess portions
   (1 katori ≈ 150 ml, 1 chapati ≈ 35–40 g).
   ============================================================ */

const M = (n, q, k, p) => ({ n, q, k, p, src: 'mess' }); // from mess
const O = (n, q, k, p) => ({ n, q, k, p, src: 'own' });  // your own stock
const X = (n, q, k, p) => ({ n, q, k, p, src: 'mix' });  // mess + own

/* ---------- reusable food items ---------- */
const PROTEIN_MILK = X('Protein milk', 'Mess milk 1 glass (no sugar, no Boost/Bournvita) + 1 scoop plant protein, shaken', 240, 30);
const SHAKE = O('Plant protein shake', '1 scoop (~30 g) in 300 ml water, within 30 min of finishing', 120, 24);
const SATTU = O('Sattu drink', '40 g sattu + 300 ml water + ½ lemon, black salt, roasted jeera', 160, 8);
const CHANA = O('Roasted chana', '30 g (one small fistful)', 110, 6);

const DINNER_B = {
  label: 'Hostel kit',
  note: 'Your “shake + small items” habit, upgraded with real protein and fibre. Use it when the mess dinner is heavy or you are late.',
  items: [
    O('Sprout chaat', '1 bowl: 150 g sprouted moong + onion, tomato, cucumber, lemon, chaat masala', 160, 10),
    O('Roasted chana', '30 g', 110, 6),
    O('Soy milk, unsweetened', '200 ml', 80, 7),
  ],
};

/* ============================================================
   EXERCISE LIBRARY
   img = folder in assets/img (two frames: start / finish)
   ============================================================ */
const EX = {
  /* ---- warm-up / cardio / stretch ---- */
  treadmill_walk: {
    name: 'Treadmill brisk walk', img: 'Walking_Treadmill', muscles: 'Warm-up · heart & legs',
    steps: ['Step on and start at 3 km/h, then raise it to 5–5.5 km/h.', 'Walk tall, arms swinging naturally.', 'Keep it easy. You are only warming up.'],
    mistakes: ['Holding the handrails', 'Starting too fast'],
  },
  elliptical_easy: {
    name: 'Elliptical, easy', img: 'Elliptical_Trainer', muscles: 'Warm-up · full body',
    steps: ['Step on and hold the moving handles.', 'Pedal smoothly at low resistance (level 2–4).', 'Push AND pull the handles so your arms warm up too.'],
    mistakes: ['Leaning on the handles', 'Rising onto your toes'],
  },
  mobility_lower: {
    name: 'Dynamic mobility (lower body)', img: 'Worlds_Greatest_Stretch', muscles: 'Hips · hamstrings · ankles',
    steps: ['Leg swings, front-back: 10 per leg (hold the wall).', 'Hip circles: 10 each direction.', 'Bodyweight squats: 10 slow reps.', 'Glute bridges: 10 reps.', 'World’s greatest stretch (pictured): 3 per side. Step into a deep lunge, put your hand down inside your foot, rotate your other arm up to the ceiling.'],
    mistakes: ['Rushing', 'Bouncing into stretches'],
  },
  mobility_upper: {
    name: 'Dynamic mobility (upper body)', img: 'Arm_Circles', muscles: 'Shoulders · upper back',
    steps: ['Arm circles (pictured): 10 forward, 10 backward, small then big.', 'Scapular push-ups: 10. In a plank, squeeze your shoulder blades together, then push them apart, keeping your arms straight.', 'Thoracic rotations: 8 per side on hands and knees.', 'Then do one light warm-up set of your first exercise (about 50% weight).'],
    mistakes: ['Skipping the light warm-up set before heavy pressing'],
  },
  incline_walk: {
    name: 'Treadmill incline walk', img: 'Walking_Treadmill', muscles: 'Fat burn · glutes · calves',
    steps: ['Set speed to 5.0 km/h, then raise the incline to the number in the plan.', 'Do not hold the handrails. Let your arms swing.', 'Effort: you can talk in short sentences but are clearly working (Zone 2).', 'Finish with 2 min flat and slow to cool down.'],
    mistakes: ['Hanging on the rails (cuts calories burned by ~20–30%)', 'Leaning far forward'],
    tip: 'Incline walking burns a lot of calories without the knee impact of running. It’s ideal at 100 kg.',
  },
  elliptical_steady: {
    name: 'Elliptical, steady', img: 'Elliptical_Trainer', muscles: 'Fat burn · full body',
    steps: ['Resistance at a level where you are working but can still talk (level 5–8).', 'Keep a steady rhythm of ~130–140 steps/min.', 'Push and pull the handles.'],
    mistakes: ['Resistance too low, so you just spin', 'Slouching'],
  },
  elliptical_intervals: {
    name: 'Elliptical intervals', img: 'Elliptical_Trainer', muscles: 'Fitness · fat burn',
    steps: ['3 min easy warm-up.', 'Then 1 min HARD (faster + higher resistance; breathing heavy) followed by 1 min EASY. That’s 1 round. Tick a bubble after each round.', 'After 6 rounds, finish with 5 min easy.'],
    mistakes: ['Going all-out on round 1, then dying'],
  },
  walk_drills: {
    name: 'Brisk walk + walking drills', img: 'Trail_Running_Walking', muscles: 'Warm-up',
    steps: ['5 min brisk walk around the ground.', 'Then 20 m each: high-knee march, walking butt kicks, leg swings (10/side), ankle circles.'],
    mistakes: ['Skipping the warm-up before jogging'],
  },
  walk_jog: {
    name: 'Walk-jog intervals', img: 'Trail_Running_Walking', muscles: 'Heart · legs · fat burn',
    steps: ['Jog EASY for 1 min, slow enough to talk.', 'Then brisk walk 2 min. That’s 1 round. Tick a bubble after each round.', 'Short steps, land softly under your hips, relax your shoulders.'],
    mistakes: ['Long heavy strides (hard on knees)', 'Jogging too fast'],
    tip: 'Sharp knee or shin pain = stop jogging and finish the session walking.',
  },
  brisk_walk: {
    name: 'Brisk walk', img: 'Trail_Running_Walking', muscles: 'Fat burn · recovery',
    steps: ['Walk at a pace where you are slightly out of breath but can talk.', 'Upright posture, arms swinging.'],
    mistakes: ['Strolling: keep it brisk'],
  },
  stretch_lower: {
    name: 'Lower-body stretch', img: 'Kneeling_Hip_Flexor', muscles: 'Cool-down',
    steps: ['Kneeling hip-flexor stretch (pictured): 40 s per side.', 'Standing hamstring stretch: 40 s per side.', 'Standing quad stretch (hold the wall): 30 s per side.', 'Figure-4 glute stretch lying on your back: 40 s per side.', 'Calf stretch against the wall: 30 s per side.'],
    mistakes: ['Bouncing', 'Holding your breath. Breathe slowly.'],
  },
  stretch_upper: {
    name: 'Upper-body stretch', img: 'Chest_And_Front_Of_Shoulder_Stretch', muscles: 'Cool-down',
    steps: ['Chest + shoulder stretch (pictured): 40 s per side.', 'Lat stretch: hold a pole and sit your hips back, 40 s per side.', 'Cross-body shoulder stretch: 30 s per side.', 'Overhead triceps stretch: 30 s per side.', 'Child’s pose: 60 s.'],
    mistakes: ['Stretching into pain'],
  },
  mobility_full: {
    name: 'Full-body mobility', img: 'Cat_Stretch', muscles: 'Recovery',
    steps: ['Cat-cow (pictured): 10 slow reps.', 'Kneeling hip-flexor stretch: 40 s per side.', 'Pigeon stretch: 40 s per side.', 'Thoracic rotations: 8 per side.', 'Calf stretch: 30 s per side.'],
    mistakes: ['Rushing'],
  },
  stretch_flow: {
    name: 'Full-body stretch flow', img: 'Childs_Pose', muscles: 'Recovery',
    steps: ['Cat-cow ×10 → downward dog 40 s → low lunge 40 s/side → pigeon 40 s/side.', 'Seated hamstring stretch 60 s → child’s pose (pictured) 60 s.', 'Doorway chest stretch 40 s → lying spinal twist 40 s/side.'],
    mistakes: ['Holding your breath'],
  },

  /* ---- lower body ---- */
  goblet_squat: {
    name: 'Goblet squat', img: 'Goblet_Squat', muscles: 'Quads · glutes · core', start: '8–12 kg dumbbell',
    steps: ['Hold one dumbbell upright against your chest, both hands under the top end.', 'Feet slightly wider than your shoulders, toes turned out a little.', 'Breathe in, brace your stomach, and sit DOWN between your heels. Knees follow your toes.', 'Go as low as you can with a flat back (thighs parallel is great), then push the floor away to stand up.'],
    mistakes: ['Knees caving inwards', 'Heels lifting off the floor', 'Rounding your back or looking down'],
    tip: 'Depth hard? Put a bench behind you and lightly touch it each rep.',
  },
  tempo_squat: {
    name: 'Leg press (or tempo goblet squat)', img: 'Leg_Press', muscles: 'Quads · glutes', start: 'Sled + 20–40 kg',
    steps: ['Sit with your back and head flat on the pad, feet shoulder-width in the middle of the platform.', 'Release the safety handles. Lower slowly until your knees are at ~90°.', 'Press through your whole foot back up. Do not snap your knees straight.', 'Re-lock the safety handles when finished.', 'No leg press? Do goblet squats taking 3 seconds on the way down.'],
    mistakes: ['Lower back peeling off the pad (going too deep)', 'Locking the knees at the top', 'Knees caving in'],
  },
  db_rdl: {
    name: 'Dumbbell Romanian deadlift', img: 'Stiff-Legged_Dumbbell_Deadlift', muscles: 'Hamstrings · glutes · back', start: '2 × 8–10 kg',
    steps: ['Stand tall, dumbbells in front of your thighs, feet hip-width apart.', 'Unlock your knees slightly. They stay at this bend the whole time.', 'Push your hips straight BACK (like closing a car door with your butt). Let the dumbbells slide down close to your legs.', 'Stop when you feel a strong stretch in your hamstrings (around knee to mid-shin), then squeeze your glutes to stand up.'],
    mistakes: ['Rounding the back', 'Turning it into a squat (bending the knees a lot)', 'Dumbbells drifting away from your legs'],
    tip: 'The photo shows straight legs. Keep a small knee bend for safety.',
  },
  reverse_lunge: {
    name: 'Reverse lunge', img: 'Dumbbell_Rear_Lunge', muscles: 'Quads · glutes · balance', start: 'Bodyweight → later 2 × 5–8 kg',
    steps: ['Stand tall. Step ONE foot ~2 feet straight back.', 'Lower until your back knee is just above the floor and your front thigh is about parallel to it.', 'Push through your FRONT heel to return to standing.', 'Do all reps on one leg, then switch.'],
    mistakes: ['Front knee collapsing inward', 'Step too short, so your front heel lifts', 'Leaning far forward'],
    tip: 'Hold a rack or wall with one hand if balance is shaky. That’s completely fine.',
  },
  split_squat: {
    name: 'Split squat', img: 'Split_Squat_with_Dumbbells', muscles: 'Quads · glutes', start: 'Bodyweight, hold a rack',
    steps: ['Take a long staggered stance: front foot flat, back heel up.', 'Drop STRAIGHT down until your back knee nearly touches the floor.', 'Drive up through your front foot. Keep your chest tall.', 'Finish all reps, then switch legs.'],
    mistakes: ['Front heel lifting', 'Stance too short'],
  },
  glute_bridge: {
    name: 'Glute bridge', img: 'Butt_Lift_Bridge', muscles: 'Glutes · hamstrings', start: 'Bodyweight → 10–15 kg dumbbell on hips',
    steps: ['Lie on your back, knees bent, feet flat and hip-width apart, heels ~1 hand from your butt.', 'Press through your heels and lift your hips until your body is straight from shoulders to knees.', 'Squeeze your glutes hard for 1–2 s at the top.', 'Lower slowly.'],
    mistakes: ['Arching the lower back at the top', 'Pushing through your toes', 'Rushing the reps'],
  },
  hip_thrust: {
    name: 'Hip thrust', img: 'Barbell_Hip_Thrust', muscles: 'Glutes', start: '15–20 kg dumbbell',
    steps: ['Sit on the floor with your upper back (just below the shoulder blades) against the long side of a bench.', 'Put a dumbbell on your hip crease, with a towel for padding.', 'Feet flat, knees bent. Drive through your heels to lift your hips until your body is flat like a table.', 'Tuck your chin, squeeze your glutes for 1 s, lower under control.'],
    mistakes: ['Over-arching the lower back', 'Feet in the wrong place (shins should be vertical at the top)', 'Looking up at the ceiling'],
  },
  leg_curl: {
    name: 'Leg curl machine (or wall sit)', img: 'Lying_Leg_Curls', muscles: 'Hamstrings', start: 'Lightest 1–2 plates',
    steps: ['Adjust the pad so it sits just above your heels.', 'Curl your heels toward your butt, squeeze 1 s.', 'Lower slowly over 2–3 s.', 'No machine? Do a wall sit: back flat on the wall, thighs parallel to the floor, hold 30 s.'],
    mistakes: ['Hips lifting off the pad', 'Swinging the weight'],
  },
  calf_raise: {
    name: 'Standing calf raise', img: 'Standing_Dumbbell_Calf_Raise', muscles: 'Calves', start: 'Bodyweight or 2 × 8 kg',
    steps: ['Stand holding dumbbells (or hold a rack for balance). The balls of your feet can go on a weight plate for extra range.', 'Rise as high as possible onto your toes. Hold 1 s.', 'Lower slowly all the way down for a stretch.'],
    mistakes: ['Bouncing quickly', 'Bending the knees'],
  },

  /* ---- core ---- */
  dead_bug: {
    name: 'Dead bug', img: 'Dead_Bug', muscles: 'Deep core',
    steps: ['Lie on your back, arms pointing at the ceiling, knees above your hips at 90°.', 'Press your lower back FLAT into the floor and keep it there.', 'Slowly lower the opposite arm and leg toward the floor while breathing out.', 'Return and switch sides. That’s 1 rep per side.'],
    mistakes: ['Lower back lifting off the floor', 'Moving fast'],
  },
  plank: {
    name: 'Plank', img: 'Plank', muscles: 'Core · shoulders',
    steps: ['Forearms on the floor, elbows under your shoulders.', 'Legs straight, up on your toes.', 'Squeeze your glutes and stomach so your body is one straight line.', 'Breathe normally and hold.'],
    mistakes: ['Hips sagging', 'Butt piked up high', 'Holding your breath'],
    tip: 'Too hard? Do it from your knees. That still counts.',
  },
  side_plank: {
    name: 'Side plank', img: 'Side_Bridge', muscles: 'Obliques · core',
    steps: ['Lie on your side, elbow under your shoulder, feet stacked (or knees bent for an easier version).', 'Lift your hips until your body is straight.', 'Hold, then switch sides.'],
    mistakes: ['Hips dropping', 'Rolling forward'],
  },
  bird_dog: {
    name: 'Bird dog', img: null, muscles: 'Core · lower back',
    steps: ['On hands and knees: hands under your shoulders, knees under your hips.', 'Reach your RIGHT arm forward and LEFT leg back until both are level with your body.', 'Hold 2 s, return, then switch sides.'],
    mistakes: ['Hips rotating', 'Arching the back'],
  },
  leg_raise: {
    name: 'Lying leg raise', img: 'Flat_Bench_Lying_Leg_Raise', muscles: 'Lower abs',
    steps: ['Lie flat (floor or bench), hands under your hips or gripping the bench behind your head.', 'Keep your lower back pressed down. Raise your legs to vertical.', 'Lower slowly and stop just above the floor.'],
    mistakes: ['Lower back arching', 'Dropping your legs fast'],
    tip: 'Easier version: bend your knees.',
  },
  crunch_machine: {
    name: 'Crunch machine', img: 'Ab_Crunch_Machine', muscles: 'Abs', start: 'Light, 10–20 kg',
    steps: ['Adjust the seat, hold the handles lightly, feet under the pads.', 'Breathe out and crunch your chest toward your hips by curling your spine.', 'Pause 1 s, then return slowly.'],
    mistakes: ['Pulling with your arms', 'Using too much weight'],
  },

  /* ---- upper body ---- */
  bench_press: {
    name: 'Flat bench press', img: 'Barbell_Bench_Press_-_Medium_Grip', muscles: 'Chest · triceps · shoulders', start: 'Empty bar (20 kg) or 2 × 12 kg DB',
    steps: ['Lie down with your eyes under the bar, feet flat on the floor.', 'Grip slightly wider than shoulder-width. Squeeze your shoulder blades together and down.', 'Unrack with straight arms. Lower the bar under control to your mid-chest (nipple line), elbows ~45° from your body.', 'Press back up until your arms are straight.'],
    mistakes: ['Elbows flared out to 90°', 'Bouncing the bar off your chest', 'Butt lifting off the bench'],
    tip: 'ALWAYS ask someone to spot you on barbell bench, or use dumbbells.',
  },
  incline_bench: {
    name: 'Incline bench press', img: 'Barbell_Incline_Bench_Press_-_Medium_Grip', muscles: 'Upper chest · shoulders', start: 'Empty bar or 2 × 10 kg DB',
    steps: ['Set the bench to ~30°. Lie back with the bar over your eyes.', 'Grip slightly wider than your shoulders, shoulder blades pinched.', 'Lower to your upper chest (below the collarbone) under control.', 'Press back up.'],
    mistakes: ['Bench too steep (it becomes a shoulder press)', 'Bouncing'],
    tip: 'Use a spotter for barbell.',
  },
  incline_db_press: {
    name: 'Incline dumbbell press', img: 'Incline_Dumbbell_Press', muscles: 'Upper chest · shoulders', start: '2 × 8–12 kg',
    steps: ['Bench at ~30°. Sit with the dumbbells on your thighs, then kick them up as you lie back.', 'Press up over your upper chest, palms facing forward.', 'Lower to the sides of your upper chest, elbows ~45°.', 'Press back up without clanging the dumbbells.'],
    mistakes: ['Bench too steep', 'Elbows flared wide', 'Dropping the weights fast'],
  },
  chest_machine: {
    name: 'Chest machine press', img: 'Leverage_Chest_Press', muscles: 'Chest · triceps', start: 'Light, learn the path',
    steps: ['Set the seat so the handles line up with your mid-chest.', 'Push the handles forward until your arms are almost straight.', 'Return slowly (2–3 s) until you feel a stretch in your chest.', 'Your gym’s pec-deck (butterfly) works as a swap.'],
    mistakes: ['Seat too low or too high', 'Shoulders rolling forward'],
  },
  lat_pulldown: {
    name: 'Lat pulldown, wide grip', img: 'Wide-Grip_Lat_Pulldown', muscles: 'Lats · upper back · biceps', start: '20–30 kg',
    steps: ['Lock your thighs under the knee pad. Grip the bar wider than your shoulders.', 'Lean back slightly, chest up.', 'Pull the bar to your UPPER chest by driving your elbows down and back.', 'Squeeze your shoulder blades for 1 s, then let the bar rise slowly until your arms are straight.'],
    mistakes: ['Pulling behind your neck', 'Swinging your body', 'Shrugging up to your ears'],
  },
  lat_pulldown_close: {
    name: 'Lat pulldown, close grip', img: 'V-Bar_Pulldown', muscles: 'Lats · mid back', start: '20–30 kg',
    steps: ['Use the V-handle (or a close underhand grip on the straight bar).', 'Lean back slightly, chest up.', 'Pull your elbows down to your ribs and squeeze your back for 1 s.', 'Control it back up.'],
    mistakes: ['Leaning way back', 'Yanking with momentum'],
  },
  db_row: {
    name: 'One-arm dumbbell row', img: 'One-Arm_Dumbbell_Row', muscles: 'Lats · mid back · biceps', start: '10–14 kg',
    steps: ['One knee and the same-side hand on the bench, other foot on the floor.', 'Back flat (parallel to the floor), dumbbell hanging straight down.', 'Pull the dumbbell toward your HIP, keeping your elbow close to your body.', 'Squeeze your back, lower slowly. Finish one side, then switch.'],
    mistakes: ['Twisting your torso', 'Pulling to your chest with the biceps', 'Rounding your back'],
  },
  chest_supported_row: {
    name: 'Chest-supported dumbbell row', img: 'Dumbbell_Incline_Row', muscles: 'Upper & mid back', start: '2 × 8–12 kg',
    steps: ['Set the bench to 30–45°. Lie face down with your chest on the pad.', 'Let the dumbbells hang straight down.', 'Row both up toward your hips, squeezing your shoulder blades together.', 'Lower slowly.'],
    mistakes: ['Lifting your chest off the pad', 'Shrugging'],
  },
  db_shoulder_press: {
    name: 'Seated dumbbell shoulder press', img: 'Seated_Dumbbell_Press', muscles: 'Shoulders · triceps', start: '2 × 6–10 kg',
    steps: ['Bench upright (90°), back flat against the pad.', 'Dumbbells at shoulder height, palms facing forward.', 'Press overhead until your arms are almost straight.', 'Lower to ear level under control.'],
    mistakes: ['Arching the lower back', 'Going too heavy', 'Half reps'],
  },
  arnold_press: {
    name: 'Arnold press', img: 'Arnold_Dumbbell_Press', muscles: 'Shoulders (all heads)', start: '2 × 6–8 kg',
    steps: ['Sit upright, dumbbells at chin height, palms facing YOU.', 'As you press up, rotate your palms to face forward.', 'Reverse the rotation on the way down.'],
    mistakes: ['Rushing the rotation', 'Arching the back'],
  },
  lateral_raise: {
    name: 'Dumbbell lateral raise', img: 'Side_Lateral_Raise', muscles: 'Side shoulders', start: '2 × 3–5 kg',
    steps: ['Stand tall, dumbbells at your sides, a slight bend in your elbows.', 'Raise your arms OUT to the sides up to shoulder height, leading with your elbows.', 'Lower slowly over 2–3 s.'],
    mistakes: ['Swinging the body', 'Shrugging', 'Going above shoulder height'],
    tip: 'Light weight is normal here. 4 kg done well beats 10 kg swung.',
  },
  rear_delt_fly: {
    name: 'Bent-over rear-delt fly', img: 'Seated_Bent-Over_Rear_Delt_Raise', muscles: 'Rear shoulders · upper back', start: '2 × 3–5 kg',
    steps: ['Sit at the end of a bench and lean your chest toward your thighs.', 'Dumbbells under your legs, palms facing each other.', 'Raise your arms out to the sides (slight elbow bend) until level with your body.', 'Squeeze your upper back, lower slowly.'],
    mistakes: ['Using momentum', 'Going too heavy'],
    tip: 'Great for posture after long hours at a desk.',
  },
  biceps_curl: {
    name: 'Dumbbell biceps curl', img: 'Dumbbell_Bicep_Curl', muscles: 'Biceps', start: '2 × 6–8 kg',
    steps: ['Stand tall, palms facing forward, elbows pinned to your sides.', 'Curl the dumbbells up and squeeze.', 'Lower all the way down slowly.'],
    mistakes: ['Swinging your body', 'Elbows drifting forward'],
    tip: 'SUPERSET: go straight into the next exercise, then rest.',
  },
  oh_triceps: {
    name: 'Overhead dumbbell triceps extension', img: 'Standing_Dumbbell_Triceps_Extension', muscles: 'Triceps', start: '1 × 8–10 kg',
    steps: ['Sit or stand tall, holding ONE dumbbell overhead with both hands.', 'Keep your upper arms close to your head.', 'Lower the dumbbell behind your head by bending your elbows.', 'Straighten back up.'],
    mistakes: ['Elbows flaring wide', 'Arching your back'],
  },
  hammer_curl: {
    name: 'Hammer curl', img: 'Hammer_Curls', muscles: 'Biceps · forearms', start: '2 × 6–8 kg',
    steps: ['Stand tall, palms facing each other (like holding a hammer).', 'Curl up, keeping your elbows at your sides.', 'Lower slowly.'],
    mistakes: ['Swinging'],
    tip: 'SUPERSET: go straight into bench dips, then rest.',
  },
  bench_dip: {
    name: 'Bench dips', img: 'Bench_Dips', muscles: 'Triceps', start: 'Bodyweight, knees bent',
    steps: ['Hands on the bench edge behind you, fingers forward.', 'Feet on the floor, knees bent (easier) or legs straight (harder).', 'Lower by bending your elbows to ~90°.', 'Push back up.'],
    mistakes: ['Going too deep (strains the shoulders)', 'Elbows flaring out'],
  },
};

/* ---------- workout building blocks ----------
   x: exercise key, s: sets/rounds, r: reps/time, rest: seconds, kg: log weight */
const WARM_LOWER = { name: 'Warm-up', mins: 10, ex: [
  { x: 'treadmill_walk', s: 1, r: '5 min @ 5–5.5 km/h' },
  { x: 'mobility_lower', s: 1, r: '~5 min' },
] };
const WARM_UPPER = { name: 'Warm-up', mins: 10, ex: [
  { x: 'elliptical_easy', s: 1, r: '5 min, low resistance' },
  { x: 'mobility_upper', s: 1, r: '~5 min' },
] };
const COOL_LOWER = { name: 'Cool-down', mins: 8, ex: [{ x: 'stretch_lower', s: 1, r: '30–40 s each stretch' }] };
const COOL_UPPER = { name: 'Cool-down', mins: 8, ex: [{ x: 'stretch_upper', s: 1, r: '30–40 s each stretch' }] };

/* ============================================================
   MONTHLY PLANS: each assets/plans/YYYY-MM.js pushes one plan here
   ============================================================ */
const PLANS = [];

/* ============================================================
   SHOPPING LIST — everything no-cook
   every: 'month' | 'week' | 'once'  → ticks reset each month / week
   ============================================================ */
const SHOPPING = [
  { group: 'Monthly stock', every: 'month', items: [
    { n: 'Plant protein powder', q: '2 kg', why: 'Pea + brown-rice blend, ≥ 22 g protein per scoop, no added sugar, third-party lab tested for heavy metals. 2 scoops a day ≈ 1.8 kg a month. Chocolate tastes best in milk and oats.' },
    { n: 'Sattu (roasted chana flour)', q: '500 g', why: 'Pre-workout drink on Mon, Tue and Thu. Just mix with water.' },
    { n: 'Roasted chana', q: '1 kg', why: 'Pre-workout, Dinner B, hunger emergencies. ~20 g protein per 100 g.' },
    { n: 'Whole moong (to sprout)', q: '1 kg', why: 'Soak overnight, drain, wrap in a wet cloth for a day = sprouts. Zero cooking. Or buy ready sprouts every 2 days.' },
    { n: 'Soy milk, unsweetened', q: '3 × 1 L', why: 'For Dinner B. Shelf-stable until opened, then finish within 2 days (200 ml packs avoid waste).' },
    { n: 'Roasted makhana (plain)', q: '200 g', why: 'Sunday snack, low-calorie crunch.' },
    { n: 'Chaat masala, black salt, roasted jeera', q: 'top up', why: 'Makes sprouts and sattu taste good.' },
  ] },
  { group: 'Weekly fresh', every: 'week', items: [
    { n: 'Bananas', q: '2–3', why: 'Saturday pre-workout, or any day you feel low on energy before the gym.' },
    { n: 'Cucumber', q: '3', why: 'Sprout chaat, and a good late-night hunger-buster.' },
    { n: 'Onion + tomato', q: '2 + 2', why: 'Sprout chaat.' },
    { n: 'Lemons', q: '4', why: 'Sattu drink, chaat, the mess poha.' },
  ] },
  { group: 'Gear (buy once)', every: 'once', items: [
    { n: 'Shaker bottle', q: '1 × 700 ml', why: 'For protein milk at the mess and shakes in your room.' },
    { n: 'Airtight boxes', q: '2–3', why: 'For chana, makhana and sprouts.' },
    { n: 'Measuring tape', q: '1', why: 'Waist size is the best fat-loss marker. Measure every Monday.' },
    { n: '1 L water bottle', q: '1', why: 'Refill it 3 times a day = 3 L.' },
    { n: 'Digital bathroom scale', q: '1', why: 'Daily morning weigh-ins make the weekly average reliable. Same scale, same spot, every time.' },
  ] },
  { group: 'Optional (only with a mini-fridge)', every: 'week', items: [
    { n: 'High-protein curd / Greek yogurt', q: '3–4 cups', why: '~10 g protein per 100 g. Can replace soy milk.' },
    { n: 'Tofu', q: '200 g', why: 'Eat raw, cubed, with chaat masala + lemon. ~12–15 g protein per 100 g.' },
  ] },
];

const RECIPES = [
  { n: 'Protein milk (at the mess)', how: 'Put 1 scoop in your shaker → pour in the mess’s unsweetened milk (let hot milk cool a minute) → shake 20 s. If the milk is already sweetened, use water or soy milk instead.', mac: '240 kcal · 30 g protein' },
  { n: 'Sattu drink', how: '40 g sattu (4 heaped tbsp) + 300 ml water + ½ lemon + black salt + roasted jeera → shake. Add chopped onion or mint if you like.', mac: '160 kcal · 8 g protein' },
  { n: 'Sprout chaat', how: '150 g sprouts + ½ onion + ½ tomato + ½ cucumber, chopped + lemon + chaat masala + black salt. Optional: 1 tbsp roasted chana for crunch.', mac: '160 kcal · 10 g protein' },
  { n: 'Making sprouts (no cooking)', how: 'Night 1: rinse 100 g whole moong and soak in water. Morning: drain, wrap in a wet cotton cloth or keep in a closed box. By evening of day 2 tails appear and they’re ready. Keeps 2 days.', mac: '' },
  { n: 'Protein oats (Mon/Thu mess)', how: 'Take mess oats without sugar → let it cool 1 min → stir in 1 scoop chocolate plant protein. Tastes like chocolate porridge.', mac: '390 kcal · 36 g protein' },
];

const TARGETS = { kcalLow: 2000, kcalHigh: 2200, proteinLow: 120, proteinHigh: 140, waterGlasses: 12, steps: 9000 };

/* Who the plan is for. Updated at each month-end review. */
const PROFILE = {
  age: 27, sex: 'male', heightCm: 178, startKg: 100, startDate: '2026-11-25', goalKg: 78,
  diet: 'pure veg (no egg), no rice, no tea/coffee, plant protein',
  lastReview: null, // e.g. '2026-11-30' after Claude reviews the month
};
