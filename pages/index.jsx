import React, { useState } from 'react';

export default function RacePacingCalculator() {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    raceType: '',
    pacingApproach: '',
    athleteLevel: '', // Recreational, Intermediate, Competitive, Elite
    currentWeight: '',
    raceWeight: '',
    age: '',
    gender: '',
    targetTime: '',
    maxHR: '',
    maxHRKnown: null,
    restingHR: '',
    restingHRKnown: null,
    thresholdHR: '',
    // Running
    thresholdPace: '',
    thresholdPaceKnown: null,
    fastest5K: '',
    thresholdPower: '',
    // Triathlon Swim
    css: '',
    cssKnown: null,
    fastest100y: '',
    // Triathlon Bike
    ftp: '',
    ftpKnown: null,
    max20minWatts: ''
  });
  const [results, setResults] = useState(null);

  const colors = {
    primary: '#D62027',
    charcoal: '#231F20',
    maroon: '#600D0D',
    light: '#F4F4F9'
  };

  const raceTypes = {
    'Sprint Triathlon': { 
      distance: 'Sprint Distance', 
      swim: '0.5 mi (750m)', bike: '12.4 mi (20km)', run: '3.1 mi (5K)',
      type: 'triathlon'
    },
    'Olympic Triathlon': { 
      distance: 'Olympic Distance',
      swim: '0.93 mi (1500m)', bike: '24.8 mi (40km)', run: '6.2 mi (10K)',
      type: 'triathlon'
    },
    'Half Ironman (70.3)': { 
      distance: '70.3 Miles',
      swim: '1.2 mi (1.9km)', bike: '56 mi (90km)', run: '13.1 mi',
      type: 'triathlon'
    },
    'Full Ironman (140.6)': { 
      distance: '140.6 Miles',
      swim: '2.4 mi (3.8km)', bike: '112 mi (180km)', run: '26.2 mi',
      type: 'triathlon'
    },
    '5K Run': { distance: '3.1 miles (5K)', type: 'run' },
    '10K Run': { distance: '6.2 miles (10K)', type: 'run' },
    'Half Marathon': { distance: '13.1 Miles', type: 'run' },
    'Full Marathon': { distance: '26.2 Miles', type: 'run' }
  };

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper functions
  const paceToSeconds = (paceStr) => {
    const parts = paceStr.split(':');
    return parseInt(parts[0]) * 60 + parseInt(parts[1]);
  };

  const secondsToPace = (seconds) => {
    let mins = Math.floor(seconds / 60);
    let secs = Math.round(seconds % 60);
    // Handle edge case where rounding gives 60 seconds
    if (secs === 60) {
      mins += 1;
      secs = 0;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const timeToSeconds = (timeStr) => {
    const parts = timeStr.split(':');
    if (parts.length === 3) {
      return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseInt(parts[2]);
    } else if (parts.length === 2) {
      return parseInt(parts[0]) * 60 + parseInt(parts[1]);
    }
    return 0;
  };

  const secondsToTime = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.round(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const calculateMaxHR = (age, gender, over40) => {
    if (over40) return 208 - (0.7 * age);
    return gender === 'male' ? 211 - (0.64 * age) : 206 - (0.88 * age);
  };

  const calculateThresholdHR = (maxHR, restingHR) => {
    if (restingHR) {
      const hrr = maxHR - restingHR;
      return Math.round(restingHR + (0.80 * hrr));
    }
    return Math.round(maxHR * 0.85);
  };

  // Physics-based bike speed calculation using proper aerodynamic model
  const calculateBikeSpeed = (powerWatts, riderWeightLbs, raceType) => {
    // Convert to metric
    const riderWeightKg = riderWeightLbs / 2.205;
    const bikeWeightKg = 9; // Typical tri bike with gear
    const totalWeightKg = riderWeightKg + bikeWeightKg;
    
    // Physical constants
    const Crr = 0.004; // Coefficient of rolling resistance (good road tires)
    const rho = 1.225; // Air density (kg/m³) at sea level, 20°C
    const dtLoss = 0.02; // Drivetrain loss (2%)
    const grade = 0; // Assume flat for estimation
    const headwind = 0; // No wind for estimation
    
    // CdA values for realistic RACE DAY estimates
    // Accounts for: proper aero position, real-world wind, course variation
    // Elite pros: 0.18-0.20, competitive AG: 0.22-0.24, average AG: 0.26-0.28
    const cdaValues = {
      'Sprint Triathlon': 0.29,      // Shorter duration, less critical aero
      'Olympic Triathlon': 0.28,     // Moderate race-day aero
      'Half Ironman (70.3)': 0.28,   // Sustained aero position
      'Full Ironman (140.6)': 0.28   // Long-course, conservative estimate
    };
    
    const cda = cdaValues[raceType] || 0.25;
    
    // Effective power after drivetrain loss
    const effectivePower = powerWatts * (1 - dtLoss);
    
    // Solve cubic equation: a*v³ + b*v² + c*v + d = 0
    // Based on: Power = (F_gravity + F_rolling + F_drag) × velocity
    
    const a = 0.5 * cda * rho;
    const b = headwind * cda * rho;
    const gradeRadians = Math.atan(grade / 100);
    const c = 9.8067 * totalWeightKg * (Math.sin(gradeRadians) + Crr * Math.cos(gradeRadians));
    const d = -effectivePower;
    
    // Cardano's formula for solving cubic equation
    const Q = (3 * a * c - b * b) / (9 * a * a);
    const R = (9 * a * b * c - 27 * a * a * d - 2 * b * b * b) / (54 * a * a * a);
    const discriminant = Q * Q * Q + R * R;
    
    let speedMs;
    if (discriminant >= 0) {
      const sqrtD = Math.sqrt(discriminant);
      const S = Math.cbrt(R + sqrtD);
      const T = Math.cbrt(R - sqrtD);
      speedMs = S + T - (b / (3 * a));
    } else {
      // Use alternative method for negative discriminant
      const theta = Math.acos(R / Math.sqrt(-Q * Q * Q));
      speedMs = 2 * Math.sqrt(-Q) * Math.cos(theta / 3) - (b / (3 * a));
    }
    
    // Convert m/s to mph
    const speedMph = speedMs * 2.237;
    
    return Math.max(0, speedMph); // Ensure non-negative
  };

  const getRaceStrategy = (raceType) => {
    const strategies = {
      'Sprint Triathlon': {
        mistake: 'Racing like it\'s a 45-60 minute suffer-fest from the gun.',
        swim: 'Calm and controlled. You should exit slightly under redline, not gasping.',
        bike: 'Hard but smooth. Avoid surging out of turns or chasing faster riders.',
        run: 'First half = control on target. Second half = let it all out and race.',
        mindset: 'Sprint rewards fitness, but still punishes stupidity. You can\'t win it on the bike if you destroy the run.'
      },
      'Olympic Triathlon': {
        mistake: 'Treating it like a long sprint.',
        swim: 'First 400m controlled breathing. Build effort gradually, don\'t surge.',
        bike: 'Settle the first 10 minutes, then apply steady pressure to the wattage target. Increase cadence the final 5-10 minutes.',
        run: 'First 2K easy. Lock in rhythm. Final 2K empty the tank.',
        mindset: 'Olympic races are decided by bike discipline and run patience, not bravery.'
      },
      'Half Ironman (70.3)': {
        mistake: 'Riding "just a little too hard" because it feels easy early.',
        swim: 'Very controlled. Find breath rhythm and feet early if possible.',
        bike: 'Conservative first 20-30 minutes. Steady middle. Aim for a negative split. Increase cadence the final 5-10 minutes. Remember your fueling plan!',
        run: 'First 3-4 miles easy. Build to race pace by mile 6.',
        mindset: 'If the bike feels impressive, the run will often be disappointing.'
      },
      'Full Ironman (140.6)': {
        mistake: 'Racing the first half instead of preparing for the second.',
        swim: 'Extremely controlled. Rhythm over position.',
        bike: 'The number 1 key is your hydro/fueling plan! Conservative effort the first hour. Stay within your planned target wattage zones until special needs. Self-evaluation on modifying target wattage up or down in the back half. Increase cadence the final 5-10 minutes.',
        run: 'First 6-8 miles conservative. Hold steady through the middle. Walk the aid stations to maximize hydro/nutrition, and cooling. The back half will be painful; embrace it and finish strong.',
        mindset: 'Ironman is an execution event. You don\'t win it with heroics — you earn it with restraint.'
      },
      '5K Run': {
        mistake: 'Starting faster than goal pace because it feels "easy."',
        strategy: 'Start at goal pace. Hold miles 1-2. Push the final mile.',
        mindset: 'You don\'t race the first mile — you survive it well enough to race the last.'
      },
      '10K Run': {
        mistake: 'Overreaching at mile 2-3 and paying for it late.',
        strategy: 'Controlled start. Hold steady through miles 3-5. Push the final mile.',
        mindset: 'The 10K rewards patience and punishes impatience quietly.'
      },
      'Half Marathon': {
        mistake: 'Banking time early.',
        strategy: 'Conservative first 3 miles. Lock into rhythm mid-race. Negative split miles 10-13.',
        mindset: 'The best half marathons feel boring early and powerful late.'
      },
      'Full Marathon': {
        mistake: 'Letting excitement dictate the first 10 miles.',
        strategy: 'Very conservative first 10 miles. Manage miles 10-20. Grit miles 20-26 only if earned.',
        mindset: 'Marathons aren\'t finished with courage — they\'re managed with discipline.'
      }
    };
    return strategies[raceType];
  };

  const getPacingZones = (raceType) => {
    const zones = {
      'Sprint Triathlon': { swimCSS: 0.97, bikePower: 0.95, bikeHR: 0.88, runHR: 0.93, runPower: 1.10, runPace: 0.97, rpe: '8-9/10' },
      'Olympic Triathlon': { swimCSS: 0.93, bikePower: 0.92, bikeHR: 0.85, runHR: 0.89, runPower: 1.05, runPace: 0.93, rpe: '7-8/10' },
      'Half Ironman (70.3)': { swimCSS: 0.88, bikePower: 0.77, bikeHR: 0.75, runHR: 0.83, runPower: 0.90, runPace: 0.83, rpe: '6-7/10' },
      'Full Ironman (140.6)': { swimCSS: 0.83, bikePower: 0.70, bikeHR: 0.70, runHR: 0.76, runPower: 0.85, runPace: 0.77, rpe: '6/10' },
      '5K Run': { runHR: 0.96, runPower: 1.12, runPace: 1.03, rpe: '9/10' },
      '10K Run': { runHR: 0.93, runPower: 1.07, runPace: 0.98, rpe: '8/10' },
      'Half Marathon': { runHR: 0.89, runPower: 0.97, runPace: 0.90, rpe: '7/10' },
      'Full Marathon': { runHR: 0.86, runPower: 0.92, runPace: 0.87, rpe: '7/10' }
    };
    return zones[raceType];
  };

  const getAthleteThresholdPct = (athleteLevel) => {
    const thresholds = {
      'Recreational': 0.80,
      'Intermediate': 0.85,
      'Competitive': 0.90,
      'Elite': 0.95
    };
    return thresholds[athleteLevel] || 0.85; // Default to intermediate
  };

  const calculatePacing = () => {
    const race = raceTypes[formData.raceType];
    const isTriathlon = race.type === 'triathlon';
    const zones = getPacingZones(formData.raceType);
    const strategy = getRaceStrategy(formData.raceType);
    
    // Get athlete level threshold percentage (for fitness approach)
    const athleteThresholdPct = formData.pacingApproach === 'fitness' ? 
                                 getAthleteThresholdPct(formData.athleteLevel) : 
                                 0.85; // Default for target approach
    
    // Calculate or use provided HR values
    let maxHR = formData.maxHRKnown ? parseInt(formData.maxHR) : 
                calculateMaxHR(parseInt(formData.age), formData.gender, parseInt(formData.age) >= 40);
    
    let thresholdHR = formData.restingHRKnown ? 
                      calculateThresholdHR(maxHR, parseInt(formData.restingHR)) :
                      Math.round(maxHR * athleteThresholdPct);

    let result = {
      approach: formData.pacingApproach,
      raceType: formData.raceType,
      raceDistance: race.distance,
      raceWeight: formData.raceWeight,
      age: formData.age,
      gender: formData.gender,
      maxHR: maxHR,
      restingHR: formData.restingHR || 'Not provided',
      thresholdHR: thresholdHR,
      athleteLevel: formData.athleteLevel, // Store for display
      strategy: strategy,
      zones: zones
    };

    if (formData.pacingApproach === 'fitness') {
      if (isTriathlon) {
        // Calculate CSS using athlete level threshold
        let css = formData.cssKnown ? 
                  paceToSeconds(formData.css) :
                  paceToSeconds(formData.fastest100y) * athleteThresholdPct;
        
        result.css = secondsToPace(css);
        
        // Calculate FTP using athlete level threshold
        let ftp = formData.ftpKnown ?
                  parseInt(formData.ftp) :
                  Math.round(parseInt(formData.max20minWatts) * athleteThresholdPct);
        
        result.ftp = ftp;
        
        // Calculate run threshold using athlete level threshold
        // Threshold should be slower than 5K pace, so divide by threshold %
        let runThresholdPace = formData.thresholdPaceKnown ?
                               paceToSeconds(formData.thresholdPace) :
                               (timeToSeconds(formData.fastest5K) / 3.1) / athleteThresholdPct;
        
        result.runThresholdPace = secondsToPace(runThresholdPace);
        
        // Calculate segment distances
        const swimDistances = {
          'Sprint Triathlon': 0.5,
          'Olympic Triathlon': 0.93,
          'Half Ironman (70.3)': 1.2,
          'Full Ironman (140.6)': 2.4
        };
        const bikeDistances = {
          'Sprint Triathlon': 12.4,
          'Olympic Triathlon': 24.8,
          'Half Ironman (70.3)': 56,
          'Full Ironman (140.6)': 112
        };
        const runDistances = {
          'Sprint Triathlon': 3.1,
          'Olympic Triathlon': 6.2,
          'Half Ironman (70.3)': 13.1,
          'Full Ironman (140.6)': 26.2
        };
        
        // Swim pacing
        const swimPaceSeconds = css / zones.swimCSS;
        const swimDistanceYards = swimDistances[formData.raceType] * 1760; // miles to yards
        const swimTime = (swimDistanceYards / 100) * swimPaceSeconds;
        
        result.swim = {
          targetPace: secondsToPace(swimPaceSeconds),
          estimatedTime: secondsToTime(swimTime),
          effort: zones.swimCSS >= 0.95 ? 'Hard' : zones.swimCSS >= 0.85 ? 'Moderate-Hard' : 'Moderate'
        };
        
        // Bike pacing - physics-based speed calculation
        const bikePower = ftp * zones.bikePower;
        const estimatedBikeSpeed = calculateBikeSpeed(bikePower, parseInt(formData.raceWeight), formData.raceType);
        const bikeTime = (bikeDistances[formData.raceType] / estimatedBikeSpeed) * 3600;
        
        result.bike = {
          targetPower: Math.round(bikePower),
          powerRange: `${Math.round(ftp * (zones.bikePower - 0.02))}-${Math.round(ftp * (zones.bikePower + 0.02))}W`,
          targetHR: Math.round(maxHR * zones.bikeHR),
          hrRange: `${Math.round(maxHR * (zones.bikeHR - 0.02))}-${Math.round(maxHR * (zones.bikeHR + 0.02))} bpm`,
          estimatedSpeed: Math.round(estimatedBikeSpeed * 10) / 10, // Round to 1 decimal
          estimatedTime: secondsToTime(bikeTime),
          effort: zones.bikePower >= 0.90 ? 'Hard' : zones.bikePower >= 0.75 ? 'Moderate-Hard' : 'Moderate'
        };
        
        // Run pacing
        const runPace = runThresholdPace / zones.runPace;
        const runTime = runPace * runDistances[formData.raceType];
        
        result.run = {
          targetHR: Math.round(maxHR * zones.runHR),
          hrRange: `${Math.round(maxHR * (zones.runHR - 0.02))}-${Math.round(maxHR * (zones.runHR + 0.02))} bpm`,
          targetPower: formData.thresholdPower ? Math.round(parseInt(formData.thresholdPower) * zones.runPower) + 'W' : 'N/A',
          estimatedPace: secondsToPace(runPace),
          paceRange: `${secondsToPace(runPace - 5)}-${secondsToPace(runPace + 5)}`,
          estimatedTime: secondsToTime(runTime),
          effort: zones.runHR >= 0.90 ? 'Very Hard' : zones.runHR >= 0.82 ? 'Hard' : 'Moderate-Hard'
        };
        
        // Total time (including ~5 min transitions)
        const transitionTime = formData.raceType === 'Sprint Triathlon' ? 120 : 
                               formData.raceType === 'Olympic Triathlon' ? 180 : 300;
        result.totalTime = secondsToTime(swimTime + bikeTime + runTime + transitionTime);
        
      } else {
        // Running race - threshold should be slower than 5K pace based on athlete level
        let runThresholdPace = formData.thresholdPaceKnown ?
                               paceToSeconds(formData.thresholdPace) :
                               (timeToSeconds(formData.fastest5K) / 3.1) / athleteThresholdPct;
        
        result.runThresholdPace = secondsToPace(runThresholdPace);
        
        const distance = parseFloat(race.distance.match(/[\d.]+/)[0]);
        const targetPace = runThresholdPace / zones.runPace;
        
        result.run = {
          targetHR: Math.round(maxHR * zones.runHR),
          hrRange: `${Math.round(maxHR * (zones.runHR - 0.02))}-${Math.round(maxHR * (zones.runHR + 0.02))} bpm`,
          targetPower: formData.thresholdPower ? Math.round(parseInt(formData.thresholdPower) * zones.runPower) + 'W' : 'N/A',
          targetPace: secondsToPace(targetPace),
          paceRange: `${secondsToPace(targetPace - 5)}-${secondsToPace(targetPace + 5)}`,
          estimatedTime: secondsToTime(targetPace * distance),
          effort: zones.runHR >= 0.95 ? 'Very Hard' : zones.runHR >= 0.88 ? 'Hard' : 'Moderate-Hard'
        };
      }
    } else if (formData.pacingApproach === 'target') {
      // TARGET TIME APPROACH
      const targetTimeSeconds = timeToSeconds(formData.targetTime);
      
      if (isTriathlon) {
        // Calculate segment distances
        const swimDistances = {
          'Sprint Triathlon': 0.5,
          'Olympic Triathlon': 0.93,
          'Half Ironman (70.3)': 1.2,
          'Full Ironman (140.6)': 2.4
        };
        const bikeDistances = {
          'Sprint Triathlon': 12.4,
          'Olympic Triathlon': 24.8,
          'Half Ironman (70.3)': 56,
          'Full Ironman (140.6)': 112
        };
        const runDistances = {
          'Sprint Triathlon': 3.1,
          'Olympic Triathlon': 6.2,
          'Half Ironman (70.3)': 13.1,
          'Full Ironman (140.6)': 26.2
        };
        
        // Estimate transition time
        const transitionTime = formData.raceType === 'Sprint Triathlon' ? 120 : 
                               formData.raceType === 'Olympic Triathlon' ? 180 : 300;
        
        // Available race time (minus transitions)
        const raceTimeSeconds = targetTimeSeconds - transitionTime;
        
        // Typical triathlon splits (as % of total race time)
        const splitPercentages = {
          'Sprint Triathlon': { swim: 0.15, bike: 0.50, run: 0.35 },
          'Olympic Triathlon': { swim: 0.13, bike: 0.52, run: 0.35 },
          'Half Ironman (70.3)': { swim: 0.10, bike: 0.55, run: 0.35 },
          'Full Ironman (140.6)': { swim: 0.09, bike: 0.55, run: 0.36 }
        };
        
        const splits = splitPercentages[formData.raceType];
        
        // Calculate target segment times
        const swimTime = raceTimeSeconds * splits.swim;
        const bikeTime = raceTimeSeconds * splits.bike;
        const runTime = raceTimeSeconds * splits.run;
        const t1Time = transitionTime / 2; // Split transitions evenly
        const t2Time = transitionTime / 2;
        
        // Calculate required paces
        const swimDistanceYards = swimDistances[formData.raceType] * 1760;
        const swimPacePer100y = (swimTime / swimDistanceYards) * 100;
        
        // Bike - calculate required speed
        const requiredBikeSpeedMph = bikeDistances[formData.raceType] / (bikeTime / 3600);
        
        // Run - calculate required pace
        const requiredRunPace = runTime / runDistances[formData.raceType];
        
        // Swim
        result.swim = {
          targetTime: secondsToTime(swimTime),
          targetPace: secondsToPace(swimPacePer100y)
        };
        
        // T1
        result.t1 = {
          targetTime: secondsToTime(t1Time)
        };
        
        // Bike
        result.bike = {
          targetTime: secondsToTime(bikeTime),
          requiredSpeed: Math.round(requiredBikeSpeedMph * 10) / 10 // Round to 1 decimal
        };
        
        // T2
        result.t2 = {
          targetTime: secondsToTime(t2Time)
        };
        
        // Run
        result.run = {
          targetTime: secondsToTime(runTime),
          requiredPace: secondsToPace(requiredRunPace)
        };
        
        // Total time
        result.totalTime = formData.targetTime;
        
      } else {
        // Running race
        const distance = parseFloat(race.distance.match(/[\d.]+/)[0]);
        const requiredPace = targetTimeSeconds / distance;
        
        result.run = {
          targetTime: formData.targetTime,
          requiredPace: secondsToPace(requiredPace)
        };
      }
    }

    setResults(result);
  };

  const nextStep = () => {
    if (step === 2 && formData.pacingApproach === 'target') {
      setStep(4); // Skip to target time input
    } else if (step === 4 && formData.pacingApproach === 'target') {
      calculatePacing();
      setStep(5);
    } else if (step === 4 && formData.pacingApproach === 'fitness') {
      calculatePacing();
      setStep(5);
    } else {
      setStep(step + 1);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const prevStep = () => {
    if (step === 4 && formData.pacingApproach === 'target') {
      setStep(2); // Go back to approach selection
    } else {
      setStep(step - 1);
    }
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  const startOver = () => {
    setStep(1);
    setFormData({
      raceType: '', pacingApproach: '', currentWeight: '', raceWeight: '', age: '', gender: '',
      targetTime: '', maxHR: '', maxHRKnown: null, restingHR: '', restingHRKnown: null, thresholdHR: '',
      thresholdPace: '', thresholdPaceKnown: null, fastest5K: '', thresholdPower: '',
      css: '', cssKnown: null, fastest100y: '', ftp: '', ftpKnown: null, max20minWatts: ''
    });
    setResults(null);
    setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 100);
  };

  return (
    <div style={{ minHeight: '100vh', background: `linear-gradient(135deg, ${colors.maroon} 0%, ${colors.charcoal} 100%)`, fontFamily: 'Inter, sans-serif', padding: '20px 10px' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap');
        * { 
          box-sizing: border-box; 
          margin: 0; 
          padding: 0;
          -webkit-tap-highlight-color: transparent;
        }
        body { 
          overflow-x: hidden; 
          max-width: 100vw;
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
        }
        .card-enter { animation: slideIn 0.5s ease-out; }
        @keyframes slideIn { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        input, select, button { 
          font-family: 'Inter', sans-serif;
          -webkit-appearance: none;
          -moz-appearance: none;
          appearance: none;
          border-radius: 8px;
        }
        input, select {
          font-size: 16px !important; /* Prevents iOS zoom on focus */
          touch-action: manipulation;
        }
        button {
          touch-action: manipulation;
          cursor: pointer;
        }
        
        /* Tablets and small laptops */
        @media (max-width: 768px) {
          h1 { font-size: 28px !important; letter-spacing: 1px !important; }
          h2 { font-size: 20px !important; }
          .logo-text { font-size: 48px !important; letter-spacing: 1px !important; }
          .logo-subtext { font-size: 16px !important; letter-spacing: 4px !important; }
        }
        
        /* Large phones (iPhone 14 Pro Max, large Androids) */
        @media (max-width: 430px) {
          h1 { font-size: 26px !important; }
          h2 { font-size: 19px !important; }
          .logo-text { font-size: 44px !important; }
          .logo-subtext { font-size: 15px !important; letter-spacing: 3px !important; }
          button { font-size: 15px !important; padding: 14px !important; }
        }
        
        /* Standard phones (iPhone 12/13/14, mid Androids) */
        @media (max-width: 390px) {
          h1 { font-size: 24px !important; }
          h2 { font-size: 18px !important; }
          .logo-text { font-size: 40px !important; }
          .logo-subtext { font-size: 14px !important; letter-spacing: 2px !important; }
          button { font-size: 14px !important; padding: 13px !important; }
        }
        
        /* Older/smaller phones (iPhone 6/7/8/SE, small Androids) */
        @media (max-width: 375px) {
          h1 { font-size: 22px !important; }
          h2 { font-size: 17px !important; }
          .logo-text { font-size: 38px !important; }
          .logo-subtext { font-size: 13px !important; letter-spacing: 2px !important; }
          button { font-size: 13px !important; padding: 12px !important; }
        }
        
        /* Very small phones (iPhone 5/SE 1st gen, very small Androids) */
        @media (max-width: 320px) {
          h1 { font-size: 20px !important; }
          h2 { font-size: 16px !important; }
          .logo-text { font-size: 34px !important; }
          .logo-subtext { font-size: 12px !important; letter-spacing: 1px !important; }
          button { font-size: 12px !important; padding: 10px !important; }
        }
      `}</style>

      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '0 10px' }}>
        {/* Header - Mobile Optimized */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <div className="logo-text" style={{ fontSize: '60px', fontWeight: '900', color: colors.primary, letterSpacing: '2px', marginBottom: '8px', textShadow: '0 4px 12px rgba(214, 32, 39, 0.5)', wordBreak: 'break-word' }}>
            KEYSTONE
          </div>
          <div className="logo-subtext" style={{ fontSize: '20px', fontWeight: '300', color: 'white', letterSpacing: '6px', wordBreak: 'break-word' }}>
            ENDURANCE
          </div>
          <div style={{ height: '3px', width: '100px', background: colors.primary, margin: '20px auto' }} />
          <div style={{ fontSize: '28px', fontWeight: '700', color: 'white', marginTop: '20px', lineHeight: '1.3', padding: '0 10px' }}>
            Race Pacing Strategy Calculator
          </div>
          <div style={{ fontSize: '15px', color: 'white', opacity: 0.8, marginTop: '10px', padding: '0 10px' }}>
            Optimize Your Race-Day Execution
          </div>
        </div>

        {/* Step 1: Race Selection - Will continue in next part */}
        {/* Step 1: Race Selection */}
        {step === 1 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h2 style={{ fontSize: '24px', marginBottom: '25px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 1: SELECT YOUR RACE
              </h2>
              <div style={{ display: 'grid', gap: '12px' }}>
                {Object.keys(raceTypes).map(race => (
                  <div
                    key={race}
                    onClick={() => updateFormData('raceType', race)}
                    style={{
                      padding: '18px 15px',
                      border: `3px solid ${formData.raceType === race ? colors.primary : '#ddd'}`,
                      borderRadius: '12px',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: formData.raceType === race ? `${colors.primary}10` : 'white',
                      boxShadow: formData.raceType === race ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div style={{ fontWeight: '700', fontSize: '18px', color: colors.charcoal, marginBottom: '4px' }}>
                      {race}
                    </div>
                    <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.4' }}>
                      {raceTypes[race].distance}
                      {raceTypes[race].type === 'triathlon' && (
                        <span> • {raceTypes[race].swim} / {raceTypes[race].bike} / {raceTypes[race].run}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={nextStep}
                disabled={!formData.raceType}
                style={{
                  width: '100%',
                  marginTop: '25px',
                  padding: '16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  background: formData.raceType ? colors.primary : '#cccccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: formData.raceType ? 'pointer' : 'not-allowed',
                  transition: 'all 0.2s',
                  boxShadow: formData.raceType ? `0 6px 20px ${colors.primary}60` : 'none',
                  letterSpacing: '0.5px'
                }}
              >
                CONTINUE →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Approach Selection */}
        {step === 2 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 2: CHOOSE YOUR APPROACH
              </h2>
              <div style={{ display: 'grid', gap: '15px' }}>
                <div
                  onClick={() => updateFormData('pacingApproach', 'target')}
                  style={{
                    padding: '25px 20px',
                    border: `3px solid ${formData.pacingApproach === 'target' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.pacingApproach === 'target' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.pacingApproach === 'target' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '20px', color: colors.charcoal, marginBottom: '8px' }}>
                    TARGET TIME
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    I have a specific goal time in mind (e.g., BQ attempt, sub-4 hour marathon, Kona qualification)
                  </div>
                </div>
                
                <div
                  onClick={() => updateFormData('pacingApproach', 'fitness')}
                  style={{
                    padding: '25px 20px',
                    border: `3px solid ${formData.pacingApproach === 'fitness' ? colors.primary : '#ddd'}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: formData.pacingApproach === 'fitness' ? `${colors.primary}10` : 'white',
                    boxShadow: formData.pacingApproach === 'fitness' ? `0 4px 12px ${colors.primary}40` : '0 2px 8px rgba(0,0,0,0.1)'
                  }}
                >
                  <div style={{ fontWeight: '700', fontSize: '20px', color: colors.charcoal, marginBottom: '8px' }}>
                    CURRENT FITNESS
                  </div>
                  <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.6' }}>
                    Base it on my current fitness level and metrics (best for realistic, sustainable pacing)
                  </div>
                </div>
              </div>
              
              {/* Athlete Level Selection - Only for Current Fitness */}
              {formData.pacingApproach === 'fitness' && (
                <div style={{ marginTop: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '15px', color: colors.charcoal, fontWeight: '700' }}>
                    YOUR ATHLETE LEVEL
                  </h3>
                  <div style={{ fontSize: '14px', color: '#666', marginBottom: '15px', lineHeight: '1.6' }}>
                    This helps us adjust your threshold calculations to match your training experience
                  </div>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {[
                      { 
                        level: 'Recreational',
                        desc: 'Training 3-6 hours/week, racing for fun and fitness',
                        pct: '80%'
                      },
                      { 
                        level: 'Intermediate',
                        desc: 'Training 6-10 hours/week, focused on improvement',
                        pct: '85%'
                      },
                      { 
                        level: 'Competitive',
                        desc: 'Training 10-15 hours/week, age group podium contender',
                        pct: '90%'
                      },
                      { 
                        level: 'Elite',
                        desc: 'Training 15+ hours/week, pro or top age grouper',
                        pct: '95%'
                      }
                    ].map(({level, desc, pct}) => (
                      <div
                        key={level}
                        onClick={() => updateFormData('athleteLevel', level)}
                        style={{
                          padding: '15px',
                          border: `2px solid ${formData.athleteLevel === level ? colors.primary : '#ddd'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s',
                          background: formData.athleteLevel === level ? 'white' : '#f9f9f9',
                          boxShadow: formData.athleteLevel === level ? `0 2px 8px ${colors.primary}40` : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                          <div style={{ fontWeight: '700', fontSize: '16px', color: colors.charcoal }}>
                            {level}
                          </div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: colors.primary, background: `${colors.primary}15`, padding: '3px 8px', borderRadius: '4px' }}>
                            {pct} threshold
                          </div>
                        </div>
                        <div style={{ fontSize: '13px', color: '#666', lineHeight: '1.5' }}>
                          {desc}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button
                  onClick={prevStep}
                  style={{
                    flex: 1,
                    padding: '16px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    background: 'white',
                    color: colors.charcoal,
                    border: `2px solid ${colors.charcoal}`,
                    borderRadius: '12px',
                    cursor: 'pointer',
                    letterSpacing: '0.5px'
                  }}
                >
                  ← BACK
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.pacingApproach || (formData.pacingApproach === 'fitness' && !formData.athleteLevel)}
                  style={{
                    flex: 2,
                    padding: '16px',
                    fontSize: '18px',
                    fontWeight: 'bold',
                    background: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? colors.primary : '#cccccc',
                    color: 'white',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? 'pointer' : 'not-allowed',
                    boxShadow: (formData.pacingApproach && (formData.pacingApproach === 'target' || formData.athleteLevel)) ? `0 6px 20px ${colors.primary}60` : 'none',
                    letterSpacing: '0.5px'
                  }}
                >
                  CONTINUE →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Body Stats */}
        {step === 3 && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h2 style={{ fontSize: '24px', marginBottom: '25px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 3: BODY STATS
              </h2>
              <div style={{ display: 'grid', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Current Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={formData.currentWeight}
                    onChange={(e) => updateFormData('currentWeight', e.target.value)}
                    placeholder="e.g., 170"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Race Weight (lbs)
                  </label>
                  <input
                    type="number"
                    value={formData.raceWeight}
                    onChange={(e) => updateFormData('raceWeight', e.target.value)}
                    placeholder="e.g., 165"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                    All calculations will be based on race weight
                  </div>
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Age
                  </label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => updateFormData('age', e.target.value)}
                    placeholder="e.g., 35"
                    style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }}
                  />
                </div>
                
                <div>
                  <label style={{ display: 'block', fontSize: '15px', fontWeight: '600', color: colors.charcoal, marginBottom: '8px' }}>
                    Gender
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {['male', 'female'].map(gender => (
                      <div
                        key={gender}
                        onClick={() => updateFormData('gender', gender)}
                        style={{
                          padding: '14px',
                          border: `2px solid ${formData.gender === gender ? colors.primary : '#ddd'}`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '16px',
                          background: formData.gender === gender ? `${colors.primary}10` : 'white',
                          color: colors.charcoal,
                          transition: 'all 0.2s'
                        }}
                      >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.currentWeight || !formData.raceWeight || !formData.age || !formData.gender}
                  style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? colors.primary : '#cccccc', color: 'white', border: 'none', borderRadius: '12px', cursor: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? 'pointer' : 'not-allowed', boxShadow: (formData.currentWeight && formData.raceWeight && formData.age && formData.gender) ? `0 6px 20px ${colors.primary}60` : 'none', letterSpacing: '0.5px' }}
                >
                  CONTINUE →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Target Time Input */}
        {step === 4 && formData.pacingApproach === 'target' && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h2 style={{ fontSize: '24px', marginBottom: '25px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 4: YOUR GOAL TIME
              </h2>
              
              <div style={{ marginBottom: '25px' }}>
                <label style={{ display: 'block', fontSize: '16px', fontWeight: '600', color: colors.charcoal, marginBottom: '12px', textAlign: 'center' }}>
                  What's your target finish time?
                </label>
                <div style={{ textAlign: 'center', marginBottom: '15px' }}>
                  <input
                    type="text"
                    value={formData.targetTime}
                    onChange={(e) => updateFormData('targetTime', e.target.value)}
                    placeholder="HH:MM:SS (e.g., 3:45:00)"
                    style={{ 
                      width: '100%',
                      maxWidth: '300px',
                      padding: '18px',
                      fontSize: '24px',
                      fontWeight: '700',
                      border: `3px solid ${colors.primary}`,
                      borderRadius: '12px',
                      textAlign: 'center',
                      fontFamily: 'monospace'
                    }}
                  />
                </div>
                <div style={{ fontSize: '13px', color: '#666', textAlign: 'center', fontStyle: 'italic' }}>
                  {raceTypes[formData.raceType].type === 'triathlon' ? 
                    'Enter total race time (swim + bike + run + transitions)' :
                    'Enter your goal finish time'
                  }
                </div>
              </div>

              <div style={{ background: `${colors.primary}08`, padding: '20px', borderRadius: '12px', marginBottom: '25px' }}>
                <div style={{ fontWeight: '700', fontSize: '16px', color: colors.charcoal, marginBottom: '8px' }}>
                  Common Goal Times:
                </div>
                <div style={{ fontSize: '14px', color: '#666', lineHeight: '1.8' }}>
                  {formData.raceType === '5K Run' && (
                    <>
                      <div>• Sub-30:00 (recreational)</div>
                      <div>• Sub-25:00 (intermediate)</div>
                      <div>• Sub-20:00 (competitive)</div>
                      <div>• Sub-18:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === '10K Run' && (
                    <>
                      <div>• Sub-1:00:00 (recreational)</div>
                      <div>• Sub-50:00 (intermediate)</div>
                      <div>• Sub-45:00 (competitive)</div>
                      <div>• Sub-40:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === 'Full Marathon' && (
                    <>
                      <div>• Boston Qualifier (varies by age/gender): 2:55:00 - 4:55:00</div>
                      <div>• Sub-4:00:00 (common goal)</div>
                      <div>• Sub-3:30:00 (competitive)</div>
                      <div>• Sub-3:00:00 (elite)</div>
                    </>
                  )}
                  {formData.raceType === 'Half Marathon' && (
                    <>
                      <div>• Sub-2:00:00 (common goal)</div>
                      <div>• Sub-1:45:00 (competitive)</div>
                      <div>• Sub-1:30:00 (advanced)</div>
                    </>
                  )}
                  {formData.raceType === 'Sprint Triathlon' && (
                    <>
                      <div>• Sub-1:30:00 (recreational)</div>
                      <div>• Sub-1:15:00 (intermediate)</div>
                      <div>• Sub-1:05:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Olympic Triathlon' && (
                    <>
                      <div>• Sub-3:00:00 (recreational)</div>
                      <div>• Sub-2:30:00 (intermediate)</div>
                      <div>• Sub-2:15:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Full Ironman (140.6)' && (
                    <>
                      <div>• Kona Qualifier: 8:00:00 - 11:00:00 (varies by age/gender)</div>
                      <div>• Sub-12:00:00 (finish)</div>
                      <div>• Sub-10:00:00 (competitive)</div>
                    </>
                  )}
                  {formData.raceType === 'Half Ironman (70.3)' && (
                    <>
                      <div>• Sub-6:00:00 (common goal)</div>
                      <div>• Sub-5:00:00 (competitive)</div>
                      <div>• Sub-4:30:00 (advanced)</div>
                    </>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={nextStep}
                  disabled={!formData.targetTime}
                  style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: formData.targetTime ? colors.primary : '#cccccc', color: 'white', border: 'none', borderRadius: '12px', cursor: formData.targetTime ? 'pointer' : 'not-allowed', boxShadow: formData.targetTime ? `0 6px 20px ${colors.primary}60` : 'none', letterSpacing: '0.5px' }}
                >
                  GET MY STRATEGY →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Fitness Metrics */}
        {step === 4 && formData.pacingApproach === 'fitness' && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '30px 20px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}`, maxHeight: '80vh', overflowY: 'auto' }}>
              <h2 style={{ fontSize: '24px', marginBottom: '20px', color: colors.charcoal, fontWeight: '700', textAlign: 'center' }}>
                STEP 4: FITNESS METRICS
              </h2>
              
              {/* Max HR */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  Max Heart Rate
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Max HR?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No - Calculate it' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('maxHRKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.maxHRKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.maxHRKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.maxHRKnown === true && (
                  <input type="number" value={formData.maxHR} onChange={(e) => updateFormData('maxHR', e.target.value)} placeholder="e.g., 185" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
                {formData.maxHRKnown === false && (
                  <div style={{ padding: '12px', background: 'white', borderRadius: '8px', fontSize: '14px', color: '#666', marginTop: '8px' }}>
                    Will calculate based on age and gender
                  </div>
                )}
              </div>

              {/* Resting HR */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  Resting Heart Rate (for better threshold calculation)
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Resting HR?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('restingHRKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.restingHRKnown === opt.val ? colors.maroon : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.restingHRKnown === opt.val ? `${colors.maroon}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.restingHRKnown === true && (
                  <input type="number" value={formData.restingHR} onChange={(e) => updateFormData('restingHR', e.target.value)} placeholder="e.g., 55" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px', marginTop: '8px' }} />
                )}
              </div>

              {/* TRIATHLON SPECIFIC */}
              {raceTypes[formData.raceType].type === 'triathlon' && (
                <>
                  {/* Swim CSS */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: '2px solid #e3f2fd' }}>
                    <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                      SWIM: Critical Swim Speed (CSS)
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                        Do you know your CSS?
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                        {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                          <div key={opt.label} onClick={() => updateFormData('cssKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.cssKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.cssKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.cssKnown === true && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>CSS (MM:SS per 100 yards)</label>
                        <input type="text" value={formData.css} onChange={(e) => updateFormData('css', e.target.value)} placeholder="e.g., 1:30" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.cssKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's your fastest 100-yard swim time? (MM:SS)</label>
                        <input type="text" value={formData.fastest100y} onChange={(e) => updateFormData('fastest100y', e.target.value)} placeholder="e.g., 1:45" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                          We'll calculate CSS as 85% of your fastest 100y time
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Bike FTP */}
                  <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px', border: '2px solid #fff3e0' }}>
                    <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                      BIKE: Functional Threshold Power (FTP)
                    </div>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                        Do you know your FTP?
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                        {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                          <div key={opt.label} onClick={() => updateFormData('ftpKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.ftpKnown === opt.val ? colors.maroon : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.ftpKnown === opt.val ? `${colors.maroon}10` : 'white', transition: 'all 0.2s' }}>
                            {opt.label}
                          </div>
                        ))}
                      </div>
                    </div>
                    {formData.ftpKnown === true && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>FTP (watts)</label>
                        <input type="number" value={formData.ftp} onChange={(e) => updateFormData('ftp', e.target.value)} placeholder="e.g., 250" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                      </div>
                    )}
                    {formData.ftpKnown === false && (
                      <div>
                        <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Maximum watts you can hold for 20 minutes</label>
                        <input type="number" value={formData.max20minWatts} onChange={(e) => updateFormData('max20minWatts', e.target.value)} placeholder="e.g., 270" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                        <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                          We'll calculate FTP as 85% of your 20-minute max
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* RUN Threshold Pace (for all) */}
              <div style={{ marginBottom: '25px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: '2px solid #e8f5e9' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '12px' }}>
                  RUN: Threshold Pace
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: colors.charcoal }}>
                    Do you know your Threshold Pace?
                  </label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '8px' }}>
                    {[{ val: true, label: 'Yes' }, { val: false, label: 'No' }].map(opt => (
                      <div key={opt.label} onClick={() => updateFormData('thresholdPaceKnown', opt.val)} style={{ padding: '12px', border: `2px solid ${formData.thresholdPaceKnown === opt.val ? colors.primary : '#ddd'}`, borderRadius: '8px', cursor: 'pointer', textAlign: 'center', fontSize: '14px', fontWeight: '600', background: formData.thresholdPaceKnown === opt.val ? `${colors.primary}10` : 'white', transition: 'all 0.2s' }}>
                        {opt.label}
                      </div>
                    ))}
                  </div>
                </div>
                {formData.thresholdPaceKnown === true && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>Threshold Pace (MM:SS per mile)</label>
                    <input type="text" value={formData.thresholdPace} onChange={(e) => updateFormData('thresholdPace', e.target.value)} placeholder="e.g., 8:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                  </div>
                )}
                {formData.thresholdPaceKnown === false && (
                  <div>
                    <label style={{ display: 'block', fontSize: '14px', color: '#666', marginBottom: '6px' }}>What's the fastest 5K you can run today? (MM:SS)</label>
                    <input type="text" value={formData.fastest5K} onChange={(e) => updateFormData('fastest5K', e.target.value)} placeholder="e.g., 24:00" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
                    <div style={{ fontSize: '12px', color: '#666', marginTop: '6px', fontStyle: 'italic' }}>
                      We'll calculate threshold pace (should be ~10% slower than 5K pace)
                    </div>
                  </div>
                )}
              </div>

              {/* Optional: Run Power */}
              <div style={{ marginBottom: '25px', padding: '20px', background: '#f5f5f5', borderRadius: '12px' }}>
                <div style={{ fontWeight: '700', fontSize: '17px', color: colors.charcoal, marginBottom: '8px' }}>
                  RUN: Threshold Power (Optional - Stryd users)
                </div>
                <input type="number" value={formData.thresholdPower} onChange={(e) => updateFormData('thresholdPower', e.target.value)} placeholder="e.g., 285 (leave blank if no Stryd)" style={{ width: '100%', padding: '14px', fontSize: '16px', border: '2px solid #ddd', borderRadius: '8px' }} />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '25px' }}>
                <button onClick={prevStep} style={{ flex: 1, padding: '16px', fontSize: '16px', fontWeight: 'bold', background: 'white', color: colors.charcoal, border: `2px solid ${colors.charcoal}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                  ← BACK
                </button>
                <button
                  onClick={nextStep}
                  disabled={
                    formData.maxHRKnown === null ||
                    (formData.maxHRKnown && !formData.maxHR) ||
                    formData.restingHRKnown === null ||
                    (raceTypes[formData.raceType].type === 'triathlon' && (
                      formData.cssKnown === null ||
                      (formData.cssKnown && !formData.css) ||
                      (!formData.cssKnown && !formData.fastest100y) ||
                      formData.ftpKnown === null ||
                      (formData.ftpKnown && !formData.ftp) ||
                      (!formData.ftpKnown && !formData.max20minWatts)
                    )) ||
                    formData.thresholdPaceKnown === null ||
                    (formData.thresholdPaceKnown && !formData.thresholdPace) ||
                    (!formData.thresholdPaceKnown && !formData.fastest5K)
                  }
                  style={{ flex: 2, padding: '16px', fontSize: '18px', fontWeight: 'bold', background: colors.primary, color: 'white', border: 'none', borderRadius: '12px', cursor: 'pointer', boxShadow: `0 6px 20px ${colors.primary}60`, letterSpacing: '0.5px' }}
                >
                  GET MY STRATEGY →
                </button>
              </div>
            </div>
          </div>
        )}
        {/* Step 5: Results */}
        {step === 5 && results && (
          <div className="card-enter">
            <div style={{ background: 'white', borderRadius: '16px', padding: '25px 15px', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', border: `3px solid ${colors.primary}` }}>
              <h1 style={{ fontSize: '32px', margin: '0 0 15px 0', color: colors.charcoal, letterSpacing: '0.5px', fontWeight: '800', textAlign: 'center', lineHeight: '1.2' }}>
                YOUR RACE PACING STRATEGY
              </h1>
              <p style={{ fontSize: '18px', color: colors.charcoal, fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
                {results.raceType}
              </p>
              <p style={{ fontSize: '15px', color: '#666', marginBottom: '25px', textAlign: 'center' }}>
                {results.raceDistance}
              </p>

              {/* Athlete Metrics Summary - Only show for FITNESS approach */}
              {results.approach === 'fitness' && (
                <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.charcoal}08`, borderRadius: '12px' }}>
                  <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                    YOUR METRICS
                  </h3>
                  <div style={{ fontSize: '14px', lineHeight: '1.8', color: colors.charcoal }}>
                    <div><strong>Athlete Level:</strong> {results.athleteLevel} ({getAthleteThresholdPct(results.athleteLevel) * 100}% threshold)</div>
                    <div>Race Weight: {results.raceWeight} lbs</div>
                    <div>Age: {results.age} ({results.gender})</div>
                    <div>Max HR: {results.maxHR} bpm</div>
                    <div>Resting HR: {results.restingHR}</div>
                    <div>Threshold HR: {results.thresholdHR} bpm</div>
                    {results.css && <div>CSS: {results.css}/100y</div>}
                    {results.ftp && <div>FTP: {results.ftp}W</div>}
                    {results.runThresholdPace && <div>Run Threshold Pace: {results.runThresholdPace}/mile</div>}
                  </div>
                </div>
              )}

              {/* TRIATHLON RESULTS */}
              {raceTypes[results.raceType].type === 'triathlon' && (
                <>
                  {/* SWIM */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      SWIM {results.approach === 'fitness' ? '- CSS-Based Pacing' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gap: '10px', marginBottom: '15px' }}>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                          {results.approach === 'target' ? 'Target Time' : 'Estimated Time'}
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>
                          {results.approach === 'target' ? results.swim.targetTime : results.swim.estimatedTime}
                        </div>
                      </div>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>
                          {results.approach === 'target' ? 'Required' : 'Target'} Pace
                        </div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.swim.targetPace}/100y</div>
                      </div>
                      {results.approach === 'fitness' && (
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Effort</div>
                          <div style={{ fontSize: '18px', fontWeight: '700', color: colors.charcoal }}>{results.swim.effort}</div>
                        </div>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.swim}
                      </div>
                    )}
                  </div>

                  {/* T1 - Target Time Only */}
                  {results.approach === 'target' && results.t1 && (
                    <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '12px', border: '2px solid #ddd' }}>
                      <h2 style={{ fontSize: '22px', color: colors.charcoal, marginBottom: '15px', fontWeight: '700' }}>
                        TRANSITION 1 (T1)
                      </h2>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.t1.targetTime}</div>
                      </div>
                    </div>
                  )}
                  {/* BIKE */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.maroon}08`, borderRadius: '12px', border: `2px solid ${colors.maroon}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.maroon, marginBottom: '15px', fontWeight: '700' }}>
                      BIKE {results.approach === 'fitness' ? '- POWER PRIMARY' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                      {results.approach === 'fitness' ? (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Power (PRIMARY)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.targetPower}W</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>Range: {results.bike.powerRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (Secondary)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.bike.targetHR} bpm</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.bike.hrRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Speed</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.estimatedSpeed} mph</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.estimatedTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.maroon}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.maroon }}>{results.bike.targetTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Speed</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.bike.requiredSpeed} mph</div>
                          </div>
                        </>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.bike}
                      </div>
                    )}
                  </div>

                  {/* T2 - Target Time Only */}
                  {results.approach === 'target' && results.t2 && (
                    <div style={{ marginBottom: '30px', padding: '20px', background: '#f5f5f5', borderRadius: '12px', border: '2px solid #ddd' }}>
                      <h2 style={{ fontSize: '22px', color: colors.charcoal, marginBottom: '15px', fontWeight: '700' }}>
                        TRANSITION 2 (T2)
                      </h2>
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                        <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                        <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.t2.targetTime}</div>
                      </div>
                    </div>
                  )}
                  {/* RUN */}
                  <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                    <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                      RUN {results.approach === 'fitness' ? '- HR PRIMARY' : '- Target Time'}
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                      {results.approach === 'fitness' ? (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (PRIMARY)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetHR} bpm</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.hrRange}</div>
                          </div>
                          {results.run.targetPower !== 'N/A' && (
                            <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                              <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Power (If Stryd)</div>
                              <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPower}</div>
                            </div>
                          )}
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Est. Pace</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.estimatedPace}/mi</div>
                            <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.paceRange}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Estimated Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.estimatedTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                          </div>
                        </>
                      ) : (
                        <>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Time</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetTime}</div>
                          </div>
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Pace</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.requiredPace}/mi</div>
                          </div>
                        </>
                      )}
                    </div>
                    {results.approach === 'fitness' && (
                      <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                        <strong>Strategy:</strong> {results.strategy.run}
                      </div>
                    )}
                  </div>

                  {/* TOTAL FINISH TIME */}
                  <div style={{ marginBottom: '30px', padding: '25px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white' }}>
                    <h3 style={{ fontSize: '18px', marginBottom: '10px', fontWeight: '700', opacity: 0.9 }}>
                      ESTIMATED TOTAL FINISH TIME
                    </h3>
                    <div style={{ fontSize: '48px', fontWeight: '900', letterSpacing: '2px', textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}>
                      {results.totalTime}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '10px', opacity: 0.8 }}>
                      Includes transitions
                    </div>
                  </div>
                </>
              )}

              {/* RUNNING RACE RESULTS */}
              {raceTypes[results.raceType].type === 'run' && (
                <div style={{ marginBottom: '30px', padding: '20px', background: `${colors.primary}08`, borderRadius: '12px', border: `2px solid ${colors.primary}30` }}>
                  <h2 style={{ fontSize: '22px', color: colors.primary, marginBottom: '15px', fontWeight: '700' }}>
                    {results.approach === 'fitness' ? 'PACING STRATEGY' : 'TARGET TIME BREAKDOWN'}
                  </h2>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '15px' }}>
                    {results.approach === 'fitness' ? (
                      <>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target HR (PRIMARY)</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.primary }}>{results.run.targetHR} bpm</div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.hrRange}</div>
                        </div>
                        {results.run.targetPower !== 'N/A' && (
                          <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Power (If Stryd)</div>
                            <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPower}</div>
                          </div>
                        )}
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Target Pace</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.run.targetPace}/mi</div>
                          <div style={{ fontSize: '11px', color: '#666', marginTop: '3px' }}>{results.run.paceRange}</div>
                        </div>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>RPE</div>
                          <div style={{ fontSize: '24px', fontWeight: '800', color: colors.charcoal }}>{results.zones.rpe}</div>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: `2px solid ${colors.primary}` }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Goal Time</div>
                          <div style={{ fontSize: '32px', fontWeight: '800', color: colors.primary }}>{results.run.targetTime}</div>
                        </div>
                        <div style={{ background: 'white', padding: '15px', borderRadius: '8px', border: '2px solid #ddd' }}>
                          <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px', textTransform: 'uppercase' }}>Required Pace</div>
                          <div style={{ fontSize: '32px', fontWeight: '800', color: colors.charcoal }}>{results.run.requiredPace}/mi</div>
                        </div>
                      </>
                    )}
                  </div>
                  {results.approach === 'fitness' && results.run.estimatedTime && (
                    <div style={{ background: colors.primary, color: 'white', padding: '15px', borderRadius: '8px', textAlign: 'center', marginBottom: '15px' }}>
                      <div style={{ fontSize: '14px', marginBottom: '5px', opacity: 0.9 }}>Estimated Finish Time</div>
                      <div style={{ fontSize: '32px', fontWeight: '800' }}>{results.run.estimatedTime}</div>
                    </div>
                  )}
                  {results.approach === 'fitness' && (
                    <div style={{ background: 'white', padding: '15px', borderRadius: '8px', lineHeight: '1.6', fontSize: '14px', color: colors.charcoal }}>
                      <strong>Strategy:</strong> {results.strategy.strategy}
                    </div>
                  )}
                </div>
              )}

              {/* RACE PHILOSOPHY */}
              <div style={{ marginBottom: '30px', padding: '20px', background: '#fff9e6', borderRadius: '12px', border: '2px solid #ffd54f' }}>
                <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                  PRIMARY MISTAKE
                </h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal, marginBottom: '15px' }}>
                  {results.strategy.mistake}
                </p>
                <h3 style={{ fontSize: '18px', color: colors.charcoal, marginBottom: '12px', fontWeight: '700' }}>
                  KEY MINDSET
                </h3>
                <p style={{ fontSize: '14px', lineHeight: '1.6', color: colors.charcoal, fontStyle: 'italic' }}>
                  {results.strategy.mindset}
                </p>
              </div>

              {/* THE KEYSTONE RULE */}
              <div style={{ marginBottom: '30px', padding: '25px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white' }}>
                <h3 style={{ fontSize: '20px', marginBottom: '12px', fontWeight: '800', letterSpacing: '0.5px' }}>
                  THE KEYSTONE RULE
                </h3>
                <p style={{ fontSize: '18px', lineHeight: '1.6', fontWeight: '600' }}>
                  Restraint early. Discipline in the middle. Execution late.
                </p>
                <p style={{ fontSize: '14px', marginTop: '12px', opacity: 0.9 }}>
                  Most athletes reverse that order — and that's why they plateau.
                </p>
              </div>

              {/* CTA */}
              <div style={{ padding: '30px 20px', background: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.maroon} 100%)`, borderRadius: '12px', textAlign: 'center', color: 'white', marginBottom: '25px' }}>
                <h3 style={{ fontSize: '22px', marginBottom: '12px', fontWeight: '700' }}>
                  WANT PERSONALIZED 1:1 COACHING?
                </h3>
                <p style={{ fontSize: '14px', marginBottom: '20px', lineHeight: '1.6' }}>
                  This calculator provides general pacing guidance. For a truly personalized race strategy tailored to YOUR specific needs, goals, and race-day conditions, consider 1:1 coaching with Keystone Endurance.
                </p>
                <div style={{ marginBottom: '15px', fontSize: '13px', lineHeight: '1.8', textAlign: 'left' }}>
                  <div style={{ marginBottom: '6px' }}>• Custom training plans for swim, bike, run, and strength</div>
                  <div style={{ marginBottom: '6px' }}>• Personalized race-day execution strategies</div>
                  <div style={{ marginBottom: '6px' }}>• Unlimited communication and bi-weekly coaching calls</div>
                  <div>• Access to Keystone Krew Community</div>
                </div>
                <a href="mailto:coach@keystoneendurance.com" style={{ display: 'inline-block', padding: '12px 20px', background: 'white', color: colors.primary, fontWeight: 'bold', fontSize: '13px', borderRadius: '8px', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.2)', letterSpacing: '0.3px', lineHeight: '1.4' }}>
                  <div style={{ fontSize: '11px', marginBottom: '2px' }}>EMAIL US:</div>
                  <div style={{ fontSize: '11px' }}>COACH@KEYSTONEENDURANCE.COM</div>
                </a>
              </div>

              {/* Start Over */}
              <button onClick={startOver} style={{ width: '100%', padding: '16px', fontSize: '18px', fontWeight: 'bold', background: 'white', color: colors.primary, border: `3px solid ${colors.primary}`, borderRadius: '12px', cursor: 'pointer', letterSpacing: '0.5px' }}>
                START OVER
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ maxWidth: '900px', margin: '30px auto 0', textAlign: 'center', fontSize: '13px', color: 'white', opacity: 0.7, paddingBottom: '30px', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '8px' }}>© 2025 Keystone Endurance | Triathlete and Distance Runner Specialists</div>
          <div>This calculator provides general pacing guidance. Always adjust based on race-day conditions and how you feel.</div>
        </div>
      </div>
    </div>
  );
}
