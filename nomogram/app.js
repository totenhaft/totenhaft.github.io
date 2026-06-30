(function (root) {
  "use strict";

  const WELLINGTON_SPHERE_BANDS = [
    { min: -1.5, max: -0.25, delta: -0.5, label: "-0.25 to -1.50 DS: add -0.50 DS" },
    { min: -4.75, max: -1.75, delta: 0, label: "-1.75 to -4.75 DS: no change" },
    { min: -5.75, max: -5.0, delta: 0.25, label: "-5.00 to -5.75 DS: subtract 0.25 DS" },
    { min: -6.75, max: -6.0, delta: 0.5, label: "-6.00 to -6.75 DS: subtract 0.50 DS" },
    { min: -7.75, max: -7.0, delta: 0.75, label: "-7.00 to -7.75 DS: subtract 0.75 DS" },
    { min: -8.75, max: -8.0, delta: 1.0, label: "-8.00 to -8.75 DS: subtract 1.00 DS" },
    { min: -9.75, max: -9.0, delta: 1.25, label: "-9.00 to -9.75 DS: subtract 1.25 DS" },
    { min: -10.75, max: -10.0, delta: 1.75, label: "-10.00 to -10.75 DS: subtract 1.75 DS" },
    { min: -11.75, max: -11.0, delta: 2.0, label: "-11.00 to -11.75 DS: subtract 2.00 DS" }
  ];

  const WELLINGTON_CYLINDER_BANDS = [
    { min: -1.5, max: -0.25, delta: 0, label: "-0.25 to -1.50 DC: no change" },
    { min: -3.0, max: -1.75, delta: 0.25, label: "-1.75 to -3.00 DC: subtract 0.25 DC" },
    { min: -3.75, max: -3.25, delta: 0.5, label: "-3.25 to -3.75 DC: subtract 0.50 DC" },
    { min: -5.75, max: -4.0, delta: 0.75, label: "-4.00 to -5.75 DC: subtract 0.75 DC" },
    { min: -7.0, max: -6.0, delta: 1.0, label: "-6.00 to -7.00 DC: subtract 1.00 DC" }
  ];

  const DEFAULT_AGE_TABLE = [
    { label: "18-29", min: 18, max: 29, sphereDelta: -0.25 },
    { label: "30-39", min: 30, max: 39, sphereDelta: 0 },
    { label: "40-44", min: 40, max: 44, sphereDelta: 0 },
    { label: "45-49", min: 45, max: 49, sphereDelta: 0.25 },
    { label: "50+", min: 50, max: 120, sphereDelta: 0.25 }
  ];

  const STORAGE_KEY = "ex500NomogramAgeTable.v2";

  function toNumber(value, fallback = 0) {
    const next = Number(value);
    return Number.isFinite(next) ? next : fallback;
  }

  function roundingStep(value) {
    if (value === "none") return null;
    return toNumber(value, 0.25);
  }

  function roundTo(value, step) {
    if (!step) return value;
    return Math.round((value + Number.EPSILON) / step) * step;
  }

  function formatD(value, options = {}) {
    const fixed = Math.abs(value) < 0.005 ? 0 : value;
    const sign = options.forceSign && fixed > 0 ? "+" : "";
    return `${sign}${fixed.toFixed(2)} D`;
  }

  function formatRx(rx) {
    const sphere = formatD(rx.sphere, { forceSign: true }).replace(" D", "");
    const cylinder = formatD(rx.cylinder, { forceSign: true }).replace(" D", "");
    const axis = normalizeAxis(rx.axis);
    return `${sphere} ${cylinder} x ${axis}`;
  }

  function normalizeAxis(axis) {
    const raw = Math.round(toNumber(axis, 180));
    const mod = ((raw % 180) + 180) % 180;
    return mod === 0 ? 180 : mod;
  }

  function axisDifference(a, b) {
    const diff = Math.abs(normalizeAxis(a) - normalizeAxis(b));
    return Math.min(diff, 180 - diff);
  }

  function sphericalEquivalent(rx) {
    return rx.sphere + rx.cylinder / 2;
  }

  function toMinusCylinder(rx, convention) {
    if (convention !== "plus") {
      return { sphere: rx.sphere, cylinder: rx.cylinder, axis: normalizeAxis(rx.axis) };
    }
    return {
      sphere: rx.sphere + rx.cylinder,
      cylinder: -rx.cylinder,
      axis: normalizeAxis(rx.axis + 90)
    };
  }

  function toPlusCylinder(rx) {
    return {
      sphere: rx.sphere + rx.cylinder,
      cylinder: -rx.cylinder,
      axis: normalizeAxis(rx.axis + 90)
    };
  }

  function classifyRefraction(minusRx) {
    const meridianA = minusRx.sphere;
    const meridianB = minusRx.sphere + minusRx.cylinder;
    if (meridianA <= 0 && meridianB <= 0) return "myopia";
    if (meridianA >= 0 && meridianB >= 0) return "hyperopia";
    return "mixed";
  }

  function findBand(value, bands) {
    return bands.find((band) => value >= band.min && value <= band.max) || null;
  }

  function applyWellingtonSphere(sphere, trace) {
    if (sphere >= 0) {
      trace.push("Wellington myopia sphere table은 음수 sphere에만 적용했습니다.");
      return { value: sphere, delta: 0 };
    }
    const band = findBand(sphere, WELLINGTON_SPHERE_BANDS);
    if (!band) {
      trace.push(`Sphere ${formatD(sphere)}: 사진 표 범위를 벗어나 sphere delta 0.00 D로 두었습니다.`);
      return { value: sphere, delta: 0 };
    }
    trace.push(`Sphere band: ${band.label}.`);
    return { value: sphere + band.delta, delta: band.delta };
  }

  function applyWellingtonCylinder(cylinder, trace) {
    if (Math.abs(cylinder) < 0.125) {
      trace.push("Cylinder가 0에 가까워 cylinder 보정은 적용하지 않았습니다.");
      return { value: 0, delta: -cylinder };
    }
    if (cylinder > 0) {
      trace.push("Wellington cylinder table은 minus cylinder 기준입니다. 입력을 minus cylinder로 변환한 뒤 적용하세요.");
      return { value: cylinder, delta: 0 };
    }
    const band = findBand(cylinder, WELLINGTON_CYLINDER_BANDS);
    if (!band) {
      trace.push(`Cylinder ${formatD(cylinder)}: 사진 표 범위를 벗어나 cylinder delta 0.00 D로 두었습니다.`);
      return { value: cylinder, delta: 0 };
    }
    trace.push(`Cylinder band: ${band.label}.`);
    return { value: cylinder + band.delta, delta: band.delta };
  }

  function ageAdjustment(age, ageTable) {
    const row = ageTable.find((item) => age >= item.min && age <= item.max);
    return row ? { delta: toNumber(row.sphereDelta), label: row.label } : { delta: 0, label: "none" };
  }

  function calculateWellington(input, options) {
    const trace = [];
    const warnings = [];
    const manifestMinus = toMinusCylinder(input.refraction, input.cylinderConvention);
    const type = classifyRefraction(manifestMinus);
    let working = { ...manifestMinus };

    trace.push(`입력값을 minus cylinder 기준으로 정규화: ${formatRx(working)}.`);

    if (type === "myopia") {
      const sphereResult = applyWellingtonSphere(working.sphere, trace);
      const cylinderResult = applyWellingtonCylinder(working.cylinder, trace);
      working.sphere = sphereResult.value;
      working.cylinder = cylinderResult.value;
      if (Math.abs(manifestMinus.cylinder) >= 0.125) {
        working.sphere -= 0.25;
        trace.push("Cylinder가 있는 굴절값: 사진 하단 문구에 따라 sphere component를 -0.25 D 추가했습니다.");
      }
    } else if (type === "hyperopia") {
      const hyper = applyHyperopiaRules(working, options.percentReduction, trace);
      working = hyper;
    } else {
      const mixed = applyMixedPercentageRules(working, options.percentReduction, trace);
      working = mixed;
      warnings.push({
        level: "warn",
        title: "Mixed astigmatism 계산",
        message: "사진 2의 예시 기반 자동 계산입니다. 병원에서 쓰는 mixed sphere nomogram이 따로 있으면 연령/추가 offset으로 보정하세요."
      });
    }

    return finalizeCalculation({
      input,
      options,
      manifestMinus,
      working,
      trace,
      warnings,
      profileLabel: "EX500/Wellington 표"
    });
  }

  function applyHyperopiaRules(minusRx, percentReduction, trace) {
    const plusRx = toPlusCylinder(minusRx);
    let sphere = plusRx.sphere;
    let cylinder = plusRx.cylinder;
    const percent = percentReduction / 100;

    trace.push(`Hyperopia 규칙 적용을 위해 plus cylinder로 변환: ${formatRx(plusRx)}.`);

    if (sphere >= 5 && sphere <= 6) {
      sphere -= 0.25;
      trace.push("Hyperopia sphere +5.00 through +6.00 DS: +0.25 D를 treatment에서 감했습니다.");
    } else {
      trace.push("Hyperopia sphere < +5.00 DS 또는 표 범위 밖: sphere 추가 보정 없음.");
    }

    if (cylinder >= 2.25 && cylinder <= 5) {
      const before = cylinder;
      cylinder = cylinder * (1 - percent);
      trace.push(`Hyperopia cylinder +2.25 through +5.00 DC: ${(percent * 100).toFixed(0)}% 감산 (${formatD(before)} -> ${formatD(cylinder)}).`);
    } else {
      trace.push("Hyperopia cylinder < +2.25 DC 또는 표 범위 밖: cylinder 추가 보정 없음.");
    }

    const plusAdjusted = { sphere, cylinder, axis: plusRx.axis };
    const minusAdjusted = toMinusCylinder(plusAdjusted, "plus");
    trace.push(`계산값을 다시 minus cylinder로 변환: ${formatRx(minusAdjusted)}.`);
    return minusAdjusted;
  }

  function applyMixedPercentageRules(minusRx, percentReduction, trace) {
    const plusRx = toPlusCylinder(minusRx);
    const percent = percentReduction / 100;
    const adjustedCylinder = plusRx.cylinder * (1 - percent);
    let adjustedSphere = plusRx.sphere;

    trace.push(`Mixed astigmatism: plus cylinder로 변환 (${formatRx(plusRx)}).`);
    trace.push(`Mixed cylinder: ${(percent * 100).toFixed(0)}% 감산 (${formatD(plusRx.cylinder)} -> ${formatD(adjustedCylinder)}).`);

    if (adjustedSphere >= -1.5 && adjustedSphere <= -0.25) {
      adjustedSphere -= 0.25;
      trace.push("Mixed 예시의 low-myopia sphere step을 적용해 sphere에 -0.25 D를 추가했습니다.");
    } else {
      const sphereResult = applyWellingtonSphere(adjustedSphere, trace);
      adjustedSphere = sphereResult.value;
      trace.push("Mixed sphere는 Wellington myopia sphere table로 보정했습니다.");
    }

    const plusAdjusted = { sphere: adjustedSphere, cylinder: adjustedCylinder, axis: plusRx.axis };
    const minusAdjusted = toMinusCylinder(plusAdjusted, "plus");
    trace.push(`Mixed 최종값을 minus cylinder로 변환: ${formatRx(minusAdjusted)}.`);
    return minusAdjusted;
  }

  function calculatePercentage(input, options) {
    const trace = [];
    const warnings = [];
    const manifestMinus = toMinusCylinder(input.refraction, input.cylinderConvention);
    const type = classifyRefraction(manifestMinus);
    let working = { ...manifestMinus };
    const percent = options.percentReduction / 100;

    trace.push(`입력값을 minus cylinder 기준으로 정규화: ${formatRx(working)}.`);

    if (type === "myopia") {
      const sphereResult = applyWellingtonSphere(working.sphere, trace);
      working.sphere = sphereResult.value;
      if (Math.abs(working.cylinder) >= 2 && Math.abs(working.cylinder) <= 6) {
        const before = working.cylinder;
        working.cylinder = working.cylinder * (1 - percent);
        trace.push(`Myopia cylinder -2.00 through -6.00 DC: ${(percent * 100).toFixed(0)}% 감산 (${formatD(before)} -> ${formatD(working.cylinder)}).`);
      } else {
        trace.push("Myopia cylinder가 -2.00 through -6.00 DC 밖이라 20-25% cylinder 보정은 적용하지 않았습니다.");
      }
    } else if (type === "hyperopia") {
      working = applyHyperopiaRules(working, options.percentReduction, trace);
    } else {
      working = applyMixedPercentageRules(working, options.percentReduction, trace);
      warnings.push({
        level: "warn",
        title: "Mixed astigmatism",
        message: "사진 2에 보이는 예시를 기준으로 자동 계산했습니다. 실제 병원 nomogram과 일치하는지 검산하세요."
      });
    }

    return finalizeCalculation({
      input,
      options,
      manifestMinus,
      working,
      trace,
      warnings,
      profileLabel: "20-25% cylinder 표"
    });
  }

  function calculateContouraModified(refractionMinus, measuredCylinder, measuredAxis, trace) {
    const refMag = Math.abs(refractionMinus.cylinder);
    const measuredMag = Math.abs(measuredCylinder);
    const diff = Math.abs(refMag - measuredMag);
    const isMyopia = refractionMinus.sphere < 0 || sphericalEquivalent(refractionMinus) < 0;
    let modifiedCylinderMag;
    let modifiedSphere = refractionMinus.sphere;

    if (refMag >= measuredMag) {
      modifiedCylinderMag = measuredMag;
      modifiedSphere += isMyopia ? -(diff / 2) : diff / 2;
      trace.push("Contoura Step 2.a: refraction cylinder magnitude >= measured cylinder magnitude, measured cylinder를 modified cylinder에 입력했습니다.");
      trace.push(`Contoura Step 3.a: sphere를 ${isMyopia ? "더 minus" : "더 plus"} 방향으로 diff/2 보정했습니다.`);
    } else {
      modifiedCylinderMag = refMag + diff / 2;
      modifiedSphere += isMyopia ? diff / 4 : -(diff / 4);
      trace.push("Contoura Step 2.b: measured cylinder가 더 커서 차이의 절반을 refraction cylinder에 더했습니다.");
      trace.push(`Contoura Step 3.b: sphere를 ${isMyopia ? "덜 minus" : "덜 plus"} 방향으로 diff/4 보정했습니다.`);
    }

    const modified = {
      sphere: modifiedSphere,
      cylinder: -modifiedCylinderMag,
      axis: normalizeAxis(measuredAxis)
    };
    trace.push(`Contoura Step 4 검산: manifest SE ${formatD(sphericalEquivalent(refractionMinus))}, modified SE ${formatD(sphericalEquivalent(modified))}.`);
    return modified;
  }

  function calculateContoura(input, options) {
    const trace = [];
    const warnings = [];
    const manifestMinus = toMinusCylinder(input.refraction, input.cylinderConvention);
    const measuredCylinder = input.measuredCylinder;
    const measuredAxis = normalizeAxis(input.measuredAxis);
    let working = { ...manifestMinus };
    let contouraBase = null;

    trace.push(`입력값을 minus cylinder 기준으로 정규화: ${formatRx(working)}.`);

    if (!Number.isFinite(measuredCylinder) || Math.abs(measuredCylinder) < 0.125) {
      warnings.push({
        level: "danger",
        title: "Measured cylinder 필요",
        message: "Contoura modified 계산에는 Topolyzer/Contoura algorithm measured cylinder가 필요합니다."
      });
    } else {
      contouraBase = calculateContouraModified(working, measuredCylinder, measuredAxis, trace);
      working = { ...contouraBase };
    }

    if (contouraBase && input.applySphereNomogram) {
      const before = working.sphere;
      const sphereResult = applyWellingtonSphere(working.sphere, trace);
      working.sphere = sphereResult.value;
      trace.push(`Contoura Step 5: personal nomogram을 sphere only로 적용 (${formatD(before)} -> ${formatD(working.sphere)}).`);
    } else if (contouraBase) {
      trace.push("Contoura Step 5: personal sphere-only nomogram 적용을 끈 상태입니다.");
    }

    addContouraWarnings(manifestMinus, measuredCylinder, measuredAxis, warnings);

    const result = finalizeCalculation({
      input,
      options,
      manifestMinus,
      working,
      trace,
      warnings,
      profileLabel: "Contoura Vision modified"
    });
    result.contouraBase = contouraBase;
    return result;
  }

  function addContouraWarnings(manifestMinus, measuredCylinder, measuredAxis, warnings) {
    const cylDiff = Math.abs(Math.abs(manifestMinus.cylinder) - Math.abs(measuredCylinder));
    const axDiff = axisDifference(manifestMinus.axis, measuredAxis);
    if (cylDiff > 1.25) {
      warnings.push({
        level: "warn",
        title: "WFO 고려 기준",
        message: `Refraction cylinder와 measured cylinder 차이가 ${formatD(cylDiff)}로 1.25 D를 초과합니다. Contoura Training Card의 precalculation consideration에 따라 WFO 전환을 검토하세요.`
      });
    }
    const refCylMag = Math.abs(manifestMinus.cylinder);
    const axisLimit = refCylMag >= 2 ? 5 : 10;
    if (axDiff > axisLimit) {
      warnings.push({
        level: "warn",
        title: "Axis mismatch",
        message: `Refraction axis와 measured axis 차이가 ${axDiff}°입니다. Ref cyl ${formatD(refCylMag)} 기준 허용 검토선 ${axisLimit}°를 초과합니다.`
      });
    }
  }

  function finalizeCalculation(payload) {
    const { input, options, manifestMinus, trace, warnings, profileLabel } = payload;
    let working = { ...payload.working };
    const refractiveType = classifyRefraction(manifestMinus);
    const age = refractiveType === "myopia"
      ? ageAdjustment(input.age, options.ageTable)
      : { delta: 0, label: "not applied" };
    const beforeAge = working.sphere;

    working.sphere += age.delta;
    if (refractiveType !== "myopia") {
      trace.push("연령 preset은 myopia/myopic astigmatism 근거로만 자동 적용하고, hyperopia/mixed astigmatism에는 적용하지 않았습니다.");
    } else if (age.delta !== 0) {
      trace.push(`연령 보정 ${age.label}: sphere ${formatD(beforeAge)} -> ${formatD(working.sphere)}.`);
    } else {
      trace.push(`연령 보정 ${age.label}: 0.00 D.`);
    }

    if (input.manualSphereOffset !== 0) {
      working.sphere += input.manualSphereOffset;
      trace.push(`추가 sphere offset ${formatD(input.manualSphereOffset, { forceSign: true })} 적용.`);
    }
    if (input.manualCylinderOffset !== 0) {
      working.cylinder += input.manualCylinderOffset;
      trace.push(`추가 cylinder offset ${formatD(input.manualCylinderOffset, { forceSign: true })} 적용.`);
    }

    const rounded = {
      sphere: roundTo(working.sphere, options.rounding),
      cylinder: roundTo(working.cylinder, options.rounding),
      axis: normalizeAxis(working.axis)
    };
    trace.push(`최종 반올림 단위: ${options.rounding ? `${options.rounding.toFixed(2)} D` : "없음"}.`);

    addRangeWarnings(input, manifestMinus, rounded, warnings, profileLabel);

    return {
      profileLabel,
      manifestMinus,
      final: rounded,
      unrounded: working,
      ageDelta: age.delta,
      ageLabel: age.label,
      trace,
      warnings
    };
  }

  function addRangeWarnings(input, manifestMinus, finalRx, warnings, profileLabel) {
    const type = classifyRefraction(manifestMinus);
    const se = sphericalEquivalent(manifestMinus);
    const sphereMag = Math.abs(manifestMinus.sphere);
    const cylMag = Math.abs(manifestMinus.cylinder);

    if (input.age < 18) {
      warnings.push({
        level: "danger",
        title: "나이 기준",
        message: "FDA LASIK 라벨 기준 18세 미만은 승인 범위 밖입니다."
      });
    }
    if (type === "mixed" && input.age < 21) {
      warnings.push({
        level: "warn",
        title: "Mixed astigmatism 나이",
        message: "WaveLight mixed astigmatism 라벨 문구에는 21세 이상 기준이 언급됩니다."
      });
    }
    if (Number.isFinite(input.seShift) && input.seShift > 0.5) {
      warnings.push({
        level: "warn",
        title: "굴절 안정성",
        message: `입력한 1년 SE 변화량 ${formatD(input.seShift)}가 0.50 D를 초과합니다.`
      });
    }
    if (input.procedure === "lasek") {
      warnings.push({
        level: "info",
        title: "LASEK/PRK",
        message: "온라인 FDA PMA 문구는 LASIK 중심입니다. 표면절삭 적용 여부는 국내 허가사항과 병원 프로토콜로 확인하세요."
      });
    }

    if (profileLabel.includes("Contoura")) {
      if (type !== "myopia") {
        warnings.push({
          level: "warn",
          title: "Contoura hyperopia/mixed 확인",
          message: "Contoura Training Card에는 hyperopia가 USA에서 available하지 않다는 각주가 있습니다. 국내 허가사항과 병원 프로토콜을 확인하세요."
        });
      }
      if (!input.topographyQuality) {
        warnings.push({
          level: "info",
          title: "Topography quality",
          message: "Topography-guided planning은 충분한 품질의 preoperative topography map을 전제로 합니다."
        });
      }
      if (se < -9 || manifestMinus.sphere < -8 || cylMag > 3) {
        warnings.push({
          level: "warn",
          title: "Topography-guided 범위 확인",
          message: "FDA T-CAT LASIK supplement에는 최대 -9.00 D SE, -8.00 D sphere component, -3.00 D astigmatic component 범위가 언급됩니다."
        });
      }
    } else if (type === "myopia" && (sphereMag > 12 || cylMag > 6)) {
      warnings.push({
        level: "warn",
        title: "Myopia 범위 확인",
        message: "WaveLight original PMA LASIK 문구의 myopia 범위는 sphere -12.00 D, astigmatism -6.00 D까지입니다."
      });
    } else if (type === "hyperopia" && (sphereMag > 6 || cylMag > 5)) {
      warnings.push({
        level: "warn",
        title: "Hyperopia 범위 확인",
        message: "Training Card 라벨 문구에는 hyperopia +6.00 D 및 astigmatism 5.00 D 범위가 언급됩니다."
      });
    } else if (type === "mixed" && cylMag > 6) {
      warnings.push({
        level: "warn",
        title: "Mixed astigmatism 범위 확인",
        message: "Training Card 라벨 문구에는 mixed astigmatism 6.00 D 범위가 언급됩니다."
      });
    }

    if (!input.stableRefractionChecked && !Number.isFinite(input.seShift)) {
      warnings.push({
        level: "info",
        title: "굴절 안정성 체크",
        message: "1년간 manifest SE 변화량이 0.50 D 이하인지 별도 확인하세요."
      });
    }
    if (!input.screenedContra) {
      warnings.push({
        level: "info",
        title: "금기/주의 체크",
        message: "임신/수유, 원추각막 의심, 심한 건성안, 얇은 각막, 관련 약물과 전신질환은 별도 스크리닝이 필요합니다."
      });
    }

    if (Math.abs(finalRx.cylinder) < 0.125) {
      finalRx.cylinder = 0;
    }
  }

  function calculateNomogram(input) {
    const options = {
      percentReduction: Math.min(25, Math.max(20, toNumber(input.percentReduction, 25))),
      rounding: roundingStep(input.rounding),
      ageTable: input.ageTable || DEFAULT_AGE_TABLE
    };
    if (input.profile === "contoura") return calculateContoura(input, options);
    if (input.profile === "percentage") return calculatePercentage(input, options);
    return calculateWellington(input, options);
  }

  function loadAgeTable() {
    try {
      const raw = root.localStorage && root.localStorage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_AGE_TABLE.map((row) => ({ ...row }));
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed) || parsed.length === 0) throw new Error("Invalid age table");
      return parsed.map((row) => ({
        label: String(row.label || `${row.min}-${row.max}`),
        min: toNumber(row.min),
        max: toNumber(row.max),
        sphereDelta: toNumber(row.sphereDelta)
      }));
    } catch (error) {
      return DEFAULT_AGE_TABLE.map((row) => ({ ...row }));
    }
  }

  function saveAgeTable(table) {
    if (root.localStorage) {
      root.localStorage.setItem(STORAGE_KEY, JSON.stringify(table));
    }
  }

  function createAgeTable(container, table, onChange) {
    container.innerHTML = "";
    const header = document.createElement("div");
    header.className = "age-row header";
    header.innerHTML = "<span>구간</span><span>Min</span><span>Max</span><span>Sphere</span>";
    container.appendChild(header);

    table.forEach((row, index) => {
      const element = document.createElement("div");
      element.className = "age-row";
      element.innerHTML = `
        <input aria-label="age label ${index + 1}" value="${row.label}">
        <input aria-label="age min ${index + 1}" type="number" step="1" value="${row.min}">
        <input aria-label="age max ${index + 1}" type="number" step="1" value="${row.max}">
        <input aria-label="age sphere ${index + 1}" type="number" step="0.25" value="${row.sphereDelta.toFixed(2)}">
      `;
      const inputs = element.querySelectorAll("input");
      inputs.forEach((inputEl) => {
        inputEl.addEventListener("input", () => {
          row.label = inputs[0].value;
          row.min = toNumber(inputs[1].value);
          row.max = toNumber(inputs[2].value);
          row.sphereDelta = toNumber(inputs[3].value);
          onChange();
        });
      });
      container.appendChild(element);
    });
  }

  function readInput(ageTable) {
    const get = (id) => document.getElementById(id);
    return {
      profile: get("profile").value,
      procedure: get("procedure").value,
      eye: get("eye").value,
      age: toNumber(get("age").value),
      cylinderConvention: get("cylinderConvention").value,
      rounding: get("rounding").value,
      refraction: {
        sphere: toNumber(get("sphere").value),
        cylinder: toNumber(get("cylinder").value),
        axis: normalizeAxis(get("axis").value)
      },
      measuredCylinder: toNumber(get("measuredCylinder").value, NaN),
      measuredAxis: normalizeAxis(get("measuredAxis").value),
      applySphereNomogram: get("applySphereNomogram").checked,
      percentReduction: toNumber(get("percentReduction").value, 25),
      seShift: get("seShift").value === "" ? NaN : toNumber(get("seShift").value),
      manualSphereOffset: toNumber(get("manualSphereOffset").value),
      manualCylinderOffset: toNumber(get("manualCylinderOffset").value),
      topographyQuality: get("topographyQuality").checked,
      stableRefractionChecked: get("stableRefraction").checked,
      screenedContra: get("screenedContra").checked,
      ageTable
    };
  }

  function renderResult(result, input) {
    const get = (id) => document.getElementById(id);
    get("headerStatus").textContent = `${input.eye} · ${result.profileLabel}`;
    get("finalRx").textContent = formatRx(result.final);
    get("finalMeta").textContent = `SEQ ${formatD(sphericalEquivalent(result.final))}`;
    get("manifestRx").textContent = formatRx(result.manifestMinus);
    get("manifestSeq").textContent = formatD(sphericalEquivalent(result.manifestMinus));
    get("ageAdjustment").textContent = `${formatD(result.ageDelta, { forceSign: true })} (${result.ageLabel})`;
    get("totalOffset").textContent = `S ${formatD(result.final.sphere - result.manifestMinus.sphere, { forceSign: true })} / C ${formatD(result.final.cylinder - result.manifestMinus.cylinder, { forceSign: true })}`;

    const contouraSummary = get("contouraSummary");
    if (result.contouraBase) {
      contouraSummary.classList.add("visible");
      contouraSummary.innerHTML = `<strong>Contoura modified before personal nomogram</strong><span>${formatRx(result.contouraBase)} · SE ${formatD(sphericalEquivalent(result.contouraBase))}</span>`;
    } else {
      contouraSummary.classList.remove("visible");
      contouraSummary.innerHTML = "";
    }

    const notices = get("notices");
    notices.innerHTML = "";
    const baseNotices = [
      {
        level: "info",
        title: "검산",
        message: "자동 계산값은 chart entry 보조값입니다. 수술 전 검사, ablation depth, RSB/PTA, optical zone, nomogram audit로 최종 확인하세요."
      }
    ];
    [...result.warnings, ...baseNotices].forEach((notice) => {
      const item = document.createElement("div");
      item.className = `notice ${notice.level}`;
      item.innerHTML = `<strong>${notice.title}</strong><p>${notice.message}</p>`;
      notices.appendChild(item);
    });

    const traceList = get("traceList");
    traceList.innerHTML = "";
    result.trace.forEach((entry) => {
      const li = document.createElement("li");
      li.textContent = entry;
      traceList.appendChild(li);
    });

    drawAxisPreview(result, input);
  }

  function drawAxisPreview(result, input) {
    const canvas = document.getElementById("axisCanvas");
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = "#fbfcfd";
    ctx.fillRect(0, 0, width, height);

    const cx = 128;
    const cy = 112;
    const radius = 72;
    ctx.strokeStyle = "#d8e0e7";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    [0, 45, 90, 135].forEach((deg) => {
      drawAxisLine(ctx, cx, cy, radius, deg, "#e1e7ed", 1);
    });

    drawAxisLine(ctx, cx, cy, radius, result.manifestMinus.axis, "#244e8f", 4);
    if (input.profile === "contoura") {
      drawAxisLine(ctx, cx, cy, radius - 10, input.measuredAxis, "#9b6400", 3);
    }
    drawAxisLine(ctx, cx, cy, radius - 20, result.final.axis, "#1f7a4c", 5);

    ctx.fillStyle = "#17212b";
    ctx.font = "700 14px Segoe UI, sans-serif";
    ctx.fillText("Axis preview", 232, 44);
    legend(ctx, 232, 72, "#244e8f", `Manifest ${normalizeAxis(result.manifestMinus.axis)}°`);
    if (input.profile === "contoura") {
      legend(ctx, 232, 100, "#9b6400", `Measured ${normalizeAxis(input.measuredAxis)}°`);
      legend(ctx, 232, 128, "#1f7a4c", `Final ${normalizeAxis(result.final.axis)}°`);
    } else {
      legend(ctx, 232, 100, "#1f7a4c", `Final ${normalizeAxis(result.final.axis)}°`);
    }
  }

  function drawAxisLine(ctx, cx, cy, radius, axis, color, width) {
    const angle = ((180 - normalizeAxis(axis)) * Math.PI) / 180;
    const dx = Math.cos(angle) * radius;
    const dy = -Math.sin(angle) * radius;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - dx, cy - dy);
    ctx.lineTo(cx + dx, cy + dy);
    ctx.stroke();
  }

  function legend(ctx, x, y, color, text) {
    ctx.fillStyle = color;
    ctx.fillRect(x, y - 10, 16, 4);
    ctx.fillStyle = "#65717d";
    ctx.font = "600 13px Segoe UI, sans-serif";
    ctx.fillText(text, x + 24, y - 5);
  }

  function attachUi() {
    if (!root.document) return;
    let ageTable = loadAgeTable();
    const ids = [
      "profile", "procedure", "eye", "age", "cylinderConvention", "rounding", "sphere", "cylinder", "axis",
      "measuredCylinder", "measuredAxis", "applySphereNomogram", "percentReduction", "seShift",
      "manualSphereOffset", "manualCylinderOffset", "topographyQuality", "stableRefraction", "screenedContra"
    ];
    const ageContainer = document.getElementById("ageTable");

    function update() {
      const input = readInput(ageTable);
      document.getElementById("contouraFields").classList.toggle("visible", input.profile === "contoura");
      const result = calculateNomogram(input);
      renderResult(result, input);
    }

    createAgeTable(ageContainer, ageTable, update);
    ids.forEach((id) => {
      const element = document.getElementById(id);
      if (element) element.addEventListener("input", update);
      if (element) element.addEventListener("change", update);
    });

    document.getElementById("saveAgeTable").addEventListener("click", () => {
      saveAgeTable(ageTable);
      document.getElementById("headerStatus").textContent = "Age table saved";
      update();
    });

    document.getElementById("resetAgeTable").addEventListener("click", () => {
      ageTable = DEFAULT_AGE_TABLE.map((row) => ({ ...row }));
      saveAgeTable(ageTable);
      createAgeTable(ageContainer, ageTable, update);
      update();
    });

    document.getElementById("sampleButton").addEventListener("click", () => {
      document.getElementById("profile").value = "contoura";
      document.getElementById("sphere").value = "-3.00";
      document.getElementById("cylinder").value = "-1.00";
      document.getElementById("axis").value = "179";
      document.getElementById("measuredCylinder").value = "-2.00";
      document.getElementById("measuredAxis").value = "179";
      document.getElementById("age").value = "32";
      update();
    });

    document.getElementById("copyButton").addEventListener("click", async () => {
      const input = readInput(ageTable);
      const result = calculateNomogram(input);
      const text = `${input.eye} ${result.profileLabel}: ${formatRx(result.final)} (SEQ ${formatD(sphericalEquivalent(result.final))})`;
      try {
        await navigator.clipboard.writeText(text);
        document.getElementById("headerStatus").textContent = "Copied";
      } catch (error) {
        document.getElementById("headerStatus").textContent = text;
      }
    });

    update();
  }

  const api = {
    calculateNomogram,
    calculateContouraModified,
    formatRx,
    sphericalEquivalent,
    normalizeAxis,
    axisDifference,
    toMinusCylinder,
    toPlusCylinder,
    DEFAULT_AGE_TABLE
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  root.NomogramEngine = api;
  attachUi();
})(typeof window !== "undefined" ? window : globalThis);
