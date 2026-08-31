import * as THREE from "three";
import { HALLS, XIAN_EXHIBITION } from "./data.js";

const DEG = Math.PI / 180;
const HALL_RADIUS = 14.6;

function canvasTexture(draw, width = 1024, height = 512) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  draw(context, width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

function createReadableTexture(texture, { transparent = false, alphaTest = 0 } = {}) {
  return new THREE.MeshBasicMaterial({
    map: texture,
    transparent,
    alphaTest,
    depthWrite: !transparent,
    toneMapped: false,
    side: THREE.FrontSide
  });
}

function faceReadablePlane(mesh) {
  // Textured planes are authored for the local -Z viewing side. Rotating the
  // mesh is sufficient; changing UVs as well would mirror all Chinese text.
  mesh.rotation.y = Math.PI;
  mesh.userData.readablePlane = true;
  return mesh;
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = 3) {
  const lines = [];
  let line = "";
  for (const character of Array.from(text)) {
    const candidate = line + character;
    if (line && ctx.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = character;
      if (lines.length === maxLines - 1) break;
    } else {
      line = candidate;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

function wrapSubtitleLines(ctx, text, maxWidth, maxLines = 2) {
  // 优先在 “ · ”、顿号处均衡断行，仍放不下则按字回退。
  for (const separator of [" · ", "、"]) {
    const parts = text.split(separator);
    if (parts.length < 2) continue;
    const widths = parts.map(part => ctx.measureText(part).width);
    const separatorWidth = ctx.measureText(separator).width;
    const total = widths.reduce((sum, w) => sum + w, 0) + separatorWidth * (parts.length - 1);
    let best = 1;
    let bestDiff = Infinity;
    for (let split = 1; split < parts.length; split += 1) {
      const left = widths.slice(0, split).reduce((sum, w) => sum + w, 0) + separatorWidth * (split - 1);
      const right = total - left - separatorWidth;
      const diff = Math.abs(left - right);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = split;
      }
    }
    const line1 = parts.slice(0, best).join(separator);
    const line2 = parts.slice(best).join(separator);
    if (ctx.measureText(line1).width <= maxWidth && ctx.measureText(line2).width <= maxWidth) {
      return [line1, line2];
    }
  }
  return wrapCanvasText(ctx, text, maxWidth, maxLines);
}

function surfaceTexture(base, veins, speckles, repeat = [3, 3]) {
  const texture = canvasTexture((ctx, width, height) => {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, base[0]);
    wash.addColorStop(.52, base[1]);
    wash.addColorStop(1, base[2]);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = .24;
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = veins;
    for (let index = 0; index < 16; index += 1) {
      const y = (index / 16) * height + Math.sin(index * 2.3) * 18;
      ctx.beginPath();
      ctx.moveTo(-30, y);
      ctx.bezierCurveTo(width * .24, y - 28, width * .68, y + 24, width + 30, y - 5);
      ctx.stroke();
    }
    ctx.globalAlpha = .16;
    ctx.fillStyle = speckles;
    for (let index = 0; index < 560; index += 1) {
      const size = .4 + Math.random() * 1.5;
      ctx.fillRect(Math.random() * width, Math.random() * height, size, size);
    }
    ctx.globalAlpha = 1;
  }, 512, 512);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  return texture;
}

function labelTexture(hall, options = {}) {
  const { small = "", name = hall.name, fontSize = 104 } = options;
  return canvasTexture((ctx, width, height) => {
    ctx.fillStyle = "#2b1b16";
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = "rgba(183,139,70,.6)";
    ctx.lineWidth = 3;
    ctx.strokeRect(24, 24, width - 48, height - 48);
    ctx.textAlign = "center";
    if (small) {
      ctx.fillStyle = "#dec892";
      ctx.font = "500 52px Songti SC, STSong, serif";
      ctx.fillText(small, width / 2, 128);
    }
    ctx.fillStyle = "#f4e4c1";
    ctx.font = `600 ${fontSize}px Songti SC, STSong, serif`;
    const baseline = small ? 232 : (height + fontSize * .72) / 2;
    ctx.fillText(name, width / 2, baseline);
  }, 1024, 320);
}

function createSegmentedCornice(radius, tube, radialSegments, tubularSegments, material, y, gapAngle = .255) {
  const group = new THREE.Group();
  const hallAngles = HALLS
    .map(hall => ((hall.angle * DEG) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2))
    .sort((a, b) => a - b);

  hallAngles.forEach((angle, index) => {
    const next = index === hallAngles.length - 1 ? hallAngles[0] + Math.PI * 2 : hallAngles[index + 1];
    const start = angle + gapAngle;
    const arc = next - gapAngle - start;
    if (arc <= 0) return;
    const geometry = new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments, arc);
    geometry.rotateZ(start);
    const segment = new THREE.Mesh(geometry, material);
    segment.rotation.x = Math.PI / 2;
    group.add(segment);
  });

  group.position.y = y;
  return group;
}

function archiveTexture(variant = 0) {
  const palettes = [
    ["#8f4a36", "#d6a879", "#2d4a54"],
    ["#385d4a", "#d3bd8c", "#7d372e"],
    ["#485d78", "#d4c7a8", "#9a663a"]
  ];
  return canvasTexture((ctx, width, height) => {
    const p = palettes[variant % palettes.length];
    const sky = ctx.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, p[2]);
    sky.addColorStop(.7, p[0]);
    sky.addColorStop(1, "#281c18");
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(244,226,187,.15)";
    ctx.beginPath();
    ctx.arc(width * .72, height * .24, height * .16, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 13; i += 1) {
      const x = width * (.15 + (i % 7) * .115 + (i > 6 ? .055 : 0));
      const y = height * (i > 6 ? .67 : .52);
      ctx.fillStyle = i % 3 === 0 ? p[1] : i % 3 === 1 ? "#8f2f27" : "#233a43";
      ctx.beginPath();
      ctx.arc(x, y - 40, 25, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillRect(x - 35, y - 15, 70, 90);
    }
    ctx.fillStyle = "rgba(255,241,209,.82)";
    ctx.font = "600 31px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
    ctx.fillText(variant === 0 ? "实践队正式合影 · 素材占位" : "沿途纪实 · 素材占位", 42, height - 40);
    const noise = ctx.getImageData(0, 0, width, height);
    for (let i = 0; i < noise.data.length; i += 16) noise.data[i] += Math.random() * 12;
    ctx.putImageData(noise, 0, 0);
  });
}

function createStoneMaterials() {
  const ivory = surfaceTexture(["#d9c6a4", "#ead9b7", "#cdb58f"], "#9f7a56", "#fff2d2", [3, 4]);
  const paleStone = surfaceTexture(["#eadfc8", "#f4e8ce", "#d8c29e"], "#ad8d68", "#fff7e6", [4, 4]);
  const redStone = surfaceTexture(["#722b25", "#a84836", "#5f241f"], "#d18b64", "#f1b177", [3, 3]);
  const floorStone = surfaceTexture(["#7d5d4b", "#98745a", "#5f4438"], "#c09a77", "#e0b88d", [6, 6]);
  return {
    stone: new THREE.MeshStandardMaterial({ color: 0xe0cba7, map: ivory, roughness: .7, metalness: .02 }),
    stoneDark: new THREE.MeshStandardMaterial({ color: 0x967458, map: floorStone, roughness: .78 }),
    stoneLight: new THREE.MeshStandardMaterial({ color: 0xf0dfbf, map: paleStone, roughness: .6 }),
    redStone: new THREE.MeshStandardMaterial({ color: 0xa13c31, map: redStone, roughness: .56, metalness: .04 }),
    redVelvet: new THREE.MeshStandardMaterial({ color: 0x8f2f28, roughness: .82, emissive: 0x3e100d, emissiveIntensity: .08 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xe3b75a, roughness: .22, metalness: .88, emissive: 0x5d3009, emissiveIntensity: .08 }),
    goldSoft: new THREE.MeshStandardMaterial({ color: 0xf0cb79, roughness: .31, metalness: .72 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xc8953e, roughness: .3, metalness: .78 }),
    bronzeDark: new THREE.MeshStandardMaterial({ color: 0x8c612b, roughness: .39, metalness: .68 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x6f2f27, map: redStone, roughness: .52 }),
    floor: new THREE.MeshStandardMaterial({ color: 0x98745d, map: floorStone, roughness: .57, metalness: .04 }),
    floorInset: new THREE.MeshStandardMaterial({ color: 0x5f3930, roughness: .48, metalness: .08 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xffe5a8, transmission: .36, transparent: true, opacity: .58, roughness: .1, metalness: .03, side: THREE.DoubleSide }),
    black: new THREE.MeshStandardMaterial({ color: 0x241614, roughness: .9 })
  };
}

function createColumnCapital(materials) {
  const group = new THREE.Group();
  const echinus = new THREE.Mesh(new THREE.CylinderGeometry(.62, .43, .23, 32), materials.stoneLight);
  echinus.position.y = .12;
  group.add(echinus);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(.14, .48, 5), index % 2 ? materials.goldSoft : materials.redStone);
    leaf.position.set(Math.cos(angle) * .48, .11, Math.sin(angle) * .48);
    leaf.rotation.z = Math.PI * .43;
    leaf.rotation.y = -angle;
    group.add(leaf);
  }
  const goldBand = new THREE.Mesh(new THREE.CylinderGeometry(.67, .67, .075, 32), materials.gold);
  goldBand.position.y = .29;
  group.add(goldBand);
  const abacusLower = new THREE.Mesh(new THREE.BoxGeometry(1.24, .14, 1.24), materials.stoneLight);
  abacusLower.position.y = .39;
  group.add(abacusLower);
  const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.42, .12, 1.42), materials.redStone);
  abacus.position.y = .52;
  group.add(abacus);
  const top = new THREE.Mesh(new THREE.BoxGeometry(1.56, .095, 1.56), materials.goldSoft);
  top.position.y = .625;
  group.add(top);
  return group;
}

function createWallSconce(materials) {
  const group = new THREE.Group();
  const back = new THREE.Mesh(new THREE.CylinderGeometry(.27, .27, .065, 24), materials.gold);
  back.rotation.x = Math.PI / 2;
  group.add(back);
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(.035, .045, .48, 12), materials.goldSoft);
  stem.position.set(0, -.16, .18);
  stem.rotation.x = -.7;
  group.add(stem);
  const cup = new THREE.Mesh(new THREE.CylinderGeometry(.12, .18, .16, 18), materials.redStone);
  cup.position.set(0, -.36, .37);
  group.add(cup);
  const shade = new THREE.Mesh(new THREE.SphereGeometry(.17, 20, 12), new THREE.MeshStandardMaterial({
    color: 0xffdfa0,
    transparent: true,
    opacity: .88,
    emissive: 0xffb94f,
    emissiveIntensity: 1.7,
    roughness: .18
  }));
  shade.position.set(0, -.22, .38);
  group.add(shade);
  const light = new THREE.PointLight(0xffc46b, 2.4, 5.4, 1.8);
  light.position.set(0, -.2, .55);
  group.add(light);
  group.userData.light = light;
  return group;
}

function createDomeCoffer(materials, index, total) {
  const group = new THREE.Group();
  const phiGap = .018;
  const phiLength = Math.PI * 2 / total - phiGap * 2;
  const phiStart = index / total * Math.PI * 2 + phiGap;
  const panelMaterial = (index % 2 === 0 ? materials.stoneLight : materials.redVelvet).clone();
  panelMaterial.side = THREE.BackSide;
  const panel = new THREE.Mesh(
    new THREE.SphereGeometry(16.91, 16, 8, phiStart, phiLength, .255, 1.205),
    panelMaterial
  );
  group.add(panel);

  const angle = phiStart + phiLength / 2;
  const medallion = new THREE.Mesh(new THREE.CylinderGeometry(.31, .31, .055, 24), materials.goldSoft);
  medallion.position.set(Math.cos(angle) * 12.3, 11.62, Math.sin(angle) * 12.3);
  medallion.lookAt(0, 0, 0);
  medallion.rotateX(Math.PI / 2);
  group.add(medallion);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(.12, 16, 10), materials.redStone);
  jewel.position.copy(medallion.position).multiplyScalar(1.002);
  group.add(jewel);
  return group;
}

function createDomeLantern(materials) {
  const group = new THREE.Group();
  const lower = new THREE.Mesh(new THREE.CylinderGeometry(4.35, 4.65, .34, 64), materials.redStone);
  lower.position.y = 21.72;
  group.add(lower);
  const goldRim = new THREE.Mesh(new THREE.TorusGeometry(4.42, .18, 14, 80), materials.gold);
  goldRim.rotation.x = Math.PI / 2;
  goldRim.position.y = 21.94;
  group.add(goldRim);
  const innerRim = new THREE.Mesh(new THREE.TorusGeometry(3.92, .075, 10, 80), materials.goldSoft);
  innerRim.rotation.x = Math.PI / 2;
  innerRim.position.y = 21.91;
  group.add(innerRim);
  for (let index = 0; index < 16; index += 1) {
    const angle = index / 16 * Math.PI * 2;
    const ray = new THREE.Mesh(new THREE.BoxGeometry(.075, .055, 1.22), materials.goldSoft);
    ray.position.set(Math.sin(angle) * 3.25, 21.9, Math.cos(angle) * 3.25);
    ray.rotation.y = angle;
    group.add(ray);
  }
  const center = new THREE.Mesh(new THREE.CylinderGeometry(.95, .95, .12, 48), materials.redStone);
  center.position.y = 21.88;
  group.add(center);
  const centerGold = new THREE.Mesh(new THREE.CylinderGeometry(.64, .64, .14, 48), materials.gold);
  centerGold.position.y = 21.86;
  group.add(centerGold);
  return group;
}

function addPedestal(parent, x, z, height, materials) {
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.72, .82, .18, 24), materials.stoneDark);
  base.position.set(x, .09, z);
  parent.add(base);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(.45, .52, height, 24), materials.stone);
  column.position.set(x, .18 + height / 2, z);
  parent.add(column);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.68, .55, .16, 24), materials.stoneLight);
  cap.position.set(x, .18 + height + .08, z);
  parent.add(cap);
}

function createCompass(materials) {
  const group = new THREE.Group();
  group.name = "薪火罗盘";
  const darkDisk = new THREE.Mesh(new THREE.CylinderGeometry(3.75, 3.75, .05, 96), materials.floorInset);
  darkDisk.position.y = .045;
  group.add(darkDisk);
  [3.1, 2.2, 1.12].forEach((radius, index) => {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - .035, radius + .035, 96), index === 1 ? materials.bronzeDark : materials.bronze);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .078 + index * .003;
    group.add(ring);
  });
  const starShape = new THREE.Shape();
  for (let i = 0; i < 20; i += 1) {
    const angle = -Math.PI / 2 + i * Math.PI / 10;
    const radius = i % 2 === 0 ? .93 : .34;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (i === 0) starShape.moveTo(x, y); else starShape.lineTo(x, y);
  }
  starShape.closePath();
  const star = new THREE.Mesh(new THREE.ExtrudeGeometry(starShape, { depth: .055, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2 }), materials.bronze);
  star.rotation.x = Math.PI / 2;
  star.position.y = .09;
  group.add(star);
  for (let i = 0; i < 20; i += 1) {
    const angle = i * Math.PI / 10;
    const line = new THREE.Mesh(new THREE.BoxGeometry(.018, .018, i % 2 === 0 ? .52 : .26), materials.bronzeDark);
    line.position.set(Math.sin(angle) * 2.62, .095, Math.cos(angle) * 2.62);
    line.rotation.y = angle;
    group.add(line);
  }
  return group;
}

function createColumn(materials, height = 5.2) {
  const group = new THREE.Group();
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.28, .14, 1.28), materials.redStone);
  plinth.position.y = .07;
  group.add(plinth);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(.56, .68, .22, 32), materials.stoneDark);
  base.position.y = .23;
  group.add(base);
  const baseTop = new THREE.Mesh(new THREE.CylinderGeometry(.48, .56, .18, 32), materials.stoneLight);
  baseTop.position.y = .43;
  group.add(baseTop);
  const lowerGold = new THREE.Mesh(new THREE.CylinderGeometry(.47, .47, .07, 32), materials.goldSoft);
  lowerGold.position.y = .55;
  group.add(lowerGold);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(.37, .43, height - 1.18, 32), materials.stone);
  shaft.position.y = height / 2 - .03;
  group.add(shaft);
  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    const flute = new THREE.Mesh(new THREE.BoxGeometry(.026, height - 1.38, .052), i % 3 === 0 ? materials.goldSoft : materials.stoneLight);
    flute.position.set(Math.cos(angle) * .405, height / 2 - .03, Math.sin(angle) * .405);
    flute.rotation.y = -angle;
    group.add(flute);
  }
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(.48, .38, .16, 32), materials.goldSoft);
  neck.position.y = height - .7;
  group.add(neck);
  const capital = createColumnCapital(materials);
  capital.position.y = height - .66;
  group.add(capital);
  return group;
}

function createArch(materials, hall) {
  const group = new THREE.Group();
  group.userData.hall = hall;
  const hallMaterial = new THREE.MeshStandardMaterial({ color: hall.color, roughness: .62, emissive: hall.color, emissiveIntensity: .08 });
  const portalTone = new THREE.Color(hall.color).lerp(new THREE.Color(0x3a211c), .28);
  const portalInner = new THREE.MeshStandardMaterial({
    color: portalTone,
    roughness: .76,
    emissive: hall.color,
    emissiveIntensity: hall.id === "xian" ? .18 : .11,
    side: THREE.FrontSide
  });
  const pillarGeometry = new THREE.BoxGeometry(.88, 3.76, 1.32);
  for (const x of [-2.25, 2.25]) {
    const pillar = new THREE.Mesh(pillarGeometry, materials.stoneLight);
    pillar.position.set(x, 2.02, 0);
    group.add(pillar);
    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.18, .28, 1.58), materials.redStone);
    plinth.position.set(x, .2, 0);
    group.add(plinth);
    const capital = new THREE.Mesh(new THREE.BoxGeometry(1.32, .25, 1.55), materials.goldSoft);
    capital.position.set(x, 3.88, 0);
    group.add(capital);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(.11, 3.18, 1.37), materials.gold);
    accent.position.set(x + Math.sign(x) * -.25, 2.02, -.02);
    group.add(accent);
    const redInset = new THREE.Mesh(new THREE.BoxGeometry(.38, 2.75, 1.39), materials.redStone);
    redInset.position.set(x + Math.sign(x) * .08, 2.01, .015);
    group.add(redInset);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(2.25, .54, 16, 72, Math.PI), materials.stoneLight);
  arch.rotation.z = 0;
  arch.position.y = 3.83;
  group.add(arch);
  const archRed = new THREE.Mesh(new THREE.TorusGeometry(2.25, .28, 12, 72, Math.PI), materials.redStone);
  archRed.position.set(0, 3.83, -.5);
  group.add(archRed);
  const archAccent = new THREE.Mesh(new THREE.TorusGeometry(2.25, .075, 10, 72, Math.PI), materials.gold);
  archAccent.position.set(0, 3.83, -.8);
  group.add(archAccent);
  const header = new THREE.Mesh(new THREE.BoxGeometry(5.65, .34, 1.55), materials.redStone);
  header.position.set(0, 6.82, .02);
  group.add(header);
  const headerGold = new THREE.Mesh(new THREE.BoxGeometry(5.9, .09, 1.62), materials.gold);
  headerGold.position.set(0, 7.02, .02);
  group.add(headerGold);
  const entablature = new THREE.Mesh(new THREE.BoxGeometry(6.28, .3, 1.74), materials.stoneLight);
  entablature.position.set(0, 7.2, -.06);
  group.add(entablature);
  const entablatureBand = new THREE.Mesh(new THREE.BoxGeometry(6.34, .09, 1.8), materials.goldSoft);
  entablatureBand.position.set(0, 7.4, -.06);
  group.add(entablatureBand);
  const pedimentShape = new THREE.Shape();
  pedimentShape.moveTo(-3.14, 0);
  pedimentShape.lineTo(3.14, 0);
  pedimentShape.lineTo(0, 1.02);
  pedimentShape.closePath();
  const pediment = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedimentShape, { depth: .52, bevelEnabled: true, bevelThickness: .045, bevelSize: .045, bevelSegments: 2 }),
    materials.stoneLight
  );
  pediment.position.set(0, 7.5, -.32);
  group.add(pediment);
  const pedimentInsetShape = new THREE.Shape();
  pedimentInsetShape.moveTo(-2.42, .17);
  pedimentInsetShape.lineTo(2.42, .17);
  pedimentInsetShape.lineTo(0, .84);
  pedimentInsetShape.closePath();
  const pedimentInset = new THREE.Mesh(
    new THREE.ExtrudeGeometry(pedimentInsetShape, { depth: .1, bevelEnabled: false }),
    materials.redStone
  );
  pedimentInset.position.set(0, 7.5, -.1);
  group.add(pedimentInset);
  const corridorDepth = 6.5;
  const corridorCenter = corridorDepth / 2 + .15;
  const farWallDepth = 6.68;
  const corridorFloor = new THREE.Mesh(new THREE.PlaneGeometry(4.3, corridorDepth), hallMaterial);
  corridorFloor.rotation.x = -Math.PI / 2;
  corridorFloor.position.set(0, .035, corridorCenter);
  group.add(corridorFloor);
  const corridorCeiling = corridorFloor.clone();
  corridorCeiling.rotation.x = Math.PI / 2;
  corridorCeiling.position.y = 5.4;
  group.add(corridorCeiling);
  for (const x of [-2.18, 2.18]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.18, 5.4, corridorDepth + .2), hallMaterial);
    wall.position.set(x, 2.7, corridorCenter);
    group.add(wall);
  }
  const farWall = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 5.4), portalInner);
  farWall.position.set(0, 2.7, farWallDepth);
  farWall.rotation.y = Math.PI;
  group.add(farWall);
  group.add(createPortalThemePanel(hall, materials));
  const label = new THREE.Mesh(new THREE.PlaneGeometry(3.02, .94), createReadableTexture(labelTexture(hall, { name: hall.name.replace("精神", "展厅"), fontSize: 104 })));
  label.position.set(0, 5.6, -.78);
  faceReadablePlane(label);
  group.add(label);
  const plaqueBack = new THREE.Mesh(new THREE.BoxGeometry(3.34, 1.04, .12), materials.wood);
  plaqueBack.position.set(0, 5.6, -.68);
  group.add(plaqueBack);
  const point = new THREE.PointLight(hall.glow, 6.2, 9.5, 1.8);
  point.position.set(0, 3.4, 2.5);
  group.add(point);
  group.userData.light = point;
  group.userData.hallMaterial = hallMaterial;
  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(4.3, 6.6, 1.3), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hitbox.position.set(0, 3.1, -.2);
  hitbox.userData.interactive = "hall";
  hitbox.userData.hall = hall;
  group.add(hitbox);
  group.userData.hitbox = hitbox;
  return group;
}

function createPortalThemePanel(hall, materials) {
  const group = new THREE.Group();
  group.name = `${hall.name}入口内嵌展板`;

  const shadow = new THREE.Mesh(new THREE.BoxGeometry(3.76, 2.08, .2), materials.black);
  shadow.position.set(0, 3.2, 6.5);
  group.add(shadow);
  const outerFrame = new THREE.Mesh(new THREE.BoxGeometry(3.56, 1.88, .16), materials.goldSoft);
  outerFrame.position.set(0, 3.2, 6.38);
  group.add(outerFrame);
  const reveal = new THREE.Mesh(new THREE.BoxGeometry(3.3, 1.62, .18), materials.wood);
  reveal.position.set(0, 3.2, 6.25);
  group.add(reveal);
  const themeFrame = new THREE.Mesh(
    new THREE.PlaneGeometry(3.04, .95),
    createReadableTexture(labelTexture(hall, { small: `${hall.index} 号展厅`, fontSize: 104 }))
  );
  themeFrame.position.set(0, 3.24, 6.145);
  faceReadablePlane(themeFrame);
  group.add(themeFrame);

  const sill = new THREE.Mesh(new THREE.BoxGeometry(3.62, .09, .42), materials.gold);
  sill.position.set(0, 2.24, 6.3);
  group.add(sill);
  for (const x of [-1.68, 1.68]) {
    const pin = new THREE.Mesh(new THREE.CylinderGeometry(.055, .055, .2, 14), materials.goldSoft);
    pin.rotation.x = Math.PI / 2;
    pin.position.set(x, 3.2, 6.08);
    group.add(pin);
  }
  return group;
}

function createXianPortalDetail(materials) {
  const group = new THREE.Group();
  group.name = "西迁门头主题装饰";
  const portalRevealDepth = 7.12;
  const portalArtworkDepth = 7.28;
  const artworkFaceDepth = portalArtworkDepth - .09;

  // The shadow reveal, framed surface and relief sit at separate depths so the
  // artwork reads as a lit museum niche rather than a second closed doorway.
  const shadowReveal = new THREE.Mesh(new THREE.BoxGeometry(3.92, 4.48, .12), materials.black);
  shadowReveal.position.set(0, 2.86, portalRevealDepth);
  group.add(shadowReveal);
  const farFrame = new THREE.Mesh(new THREE.BoxGeometry(3.7, 4.24, .14), materials.goldSoft);
  farFrame.position.set(0, 2.86, portalRevealDepth + .08);
  group.add(farFrame);
  const farPanel = new THREE.Mesh(
    new THREE.BoxGeometry(3.44, 3.98, .12),
    new THREE.MeshStandardMaterial({ color: 0x34201b, roughness: .7, metalness: .04, emissive: 0x2a0e0b, emissiveIntensity: .14 })
  );
  farPanel.position.set(0, 2.86, portalArtworkDepth - .02);
  group.add(farPanel);
  const panelInset = new THREE.Mesh(new THREE.BoxGeometry(3.12, 3.12, .06), materials.redVelvet);
  panelInset.position.set(0, 2.66, portalArtworkDepth - .1);
  group.add(panelInset);

  const routeMaterial = new THREE.MeshStandardMaterial({
    color: 0xf1c86b,
    roughness: .22,
    metalness: .86,
    emissive: 0x713708,
    emissiveIntensity: .11
  });
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.18, 1.65, artworkFaceDepth),
    new THREE.Vector3(-.74, 2.02, artworkFaceDepth - .01),
    new THREE.Vector3(-.12, 1.76, artworkFaceDepth - .02),
    new THREE.Vector3(.5, 2.42, artworkFaceDepth - .03),
    new THREE.Vector3(1.18, 2.78, artworkFaceDepth - .04)
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(route, 44, .036, 8, false), routeMaterial));
  const routeEcho = new THREE.CatmullRomCurve3(route.points.map(point => new THREE.Vector3(point.x, point.y + .18, point.z - .025)));
  group.add(new THREE.Mesh(new THREE.TubeGeometry(routeEcho, 44, .016, 8, false), materials.goldSoft));

  for (const [x, y, label] of [[-1.18, 1.65, "上海"], [1.18, 2.78, "西安"]]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(.14, 20, 14), materials.goldSoft);
    node.position.set(x, y, artworkFaceDepth - .1);
    group.add(node);
    const labelMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(.78, .34),
      createReadableTexture(canvasTexture((ctx, width, height) => {
          ctx.fillStyle = "#f3e4c5";
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = "#6e2b24";
          ctx.font = "600 24px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
          ctx.textAlign = "center";
          ctx.fillText(label, width / 2, 30);
        }, 240, 96))
    );
    labelMesh.position.set(x, y - .38, artworkFaceDepth - .12);
    faceReadablePlane(labelMesh);
    group.add(labelMesh);
  }

  const routeTitle = new THREE.Mesh(
    new THREE.PlaneGeometry(2.62, .43),
    createReadableTexture(canvasTexture((ctx, width, height) => {
        ctx.fillStyle = "rgba(47, 21, 18, .9)";
        ctx.fillRect(0, 0, width, height);
        ctx.strokeStyle = "#efc66c";
        ctx.lineWidth = 4;
        ctx.strokeRect(8, 8, width - 16, height - 16);
        ctx.fillStyle = "#f4dfb3";
        ctx.font = "600 25px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
        ctx.textAlign = "center";
        ctx.fillText("上海 → 西安 · 西迁之路", width / 2, 34);
      }, 760, 124))
  );
  routeTitle.position.set(0, 4.35, artworkFaceDepth - .12);
  faceReadablePlane(routeTitle);
  group.add(routeTitle);

  const sideGlowMaterial = new THREE.MeshStandardMaterial({ color: 0xffdf9e, emissive: 0xffb84b, emissiveIntensity: 1.35, roughness: .24 });
  for (const x of [-1.88, 1.88]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.045, 3.86, .04), sideGlowMaterial);
    strip.position.set(x, 2.8, portalRevealDepth - .08);
    group.add(strip);
    const light = new THREE.PointLight(0xffc16a, 2.1, 4.3, 1.8);
    light.position.set(x, 2.86, portalRevealDepth - .42);
    group.add(light);
  }

  const ceilingWash = new THREE.SpotLight(0xffd18a, 8.5, 7.5, .55, .62, 1.6);
  ceilingWash.position.set(0, 5.16, 3.15);
  ceilingWash.target.position.set(0, 2.4, portalArtworkDepth);
  group.add(ceilingWash, ceilingWash.target);
  return group;
}

function createTeamArchive(loader, materials) {
  const group = new THREE.Group();
  group.name = "团队档案墙";
  const wall = new THREE.Mesh(new THREE.BoxGeometry(9.2, 5.6, .46), materials.wood);
  wall.position.y = 2.8;
  group.add(wall);
  const inner = new THREE.Mesh(new THREE.BoxGeometry(8.72, 5.12, .5), materials.stoneDark);
  inner.position.set(0, 2.8, -.08);
  group.add(inner);

  // 队标：更大更醒目，金色圆环衬在图案后方环绕，不遮挡队标本身。
  const logoMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, alphaTest: .08, depthWrite: false, toneMapped: false, side: THREE.FrontSide });
  loader.load("./assets/team/team-emblem.png", texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    logoMaterial.map = texture;
    logoMaterial.needsUpdate = true;
  });
  const logoRim = new THREE.Mesh(new THREE.TorusGeometry(.4, .045, 12, 48), materials.goldSoft);
  logoRim.position.set(-2.72, 4.5, -.43);
  logoRim.rotation.x = Math.PI / 2;
  group.add(logoRim);
  const logo = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 1.05), logoMaterial);
  logo.position.set(-2.72, 4.5, -.395);
  faceReadablePlane(logo);
  group.add(logo);
  const plaque = new THREE.Mesh(new THREE.PlaneGeometry(2.35, .69), new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, w, h) => {
    ctx.fillStyle = "#2c1c17"; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#b78b46"; ctx.lineWidth = 7; ctx.strokeRect(15, 15, w - 30, h - 30);
    ctx.textAlign = "center"; ctx.fillStyle = "#e9d8b5"; ctx.font = "600 55px Songti SC, serif"; ctx.fillText("实践档案", w / 2, 105);
    ctx.fillStyle = "#c9ab72"; ctx.font = "30px PingFang SC, sans-serif"; ctx.fillText("求索红脉薪火实践队", w / 2, 165);
  }, 800, 240), toneMapped: false }));
  plaque.position.set(-2.72, 3.42, -.36);
  faceReadablePlane(plaque);
  group.add(plaque);

  // 带旗合影与新补充的纪实照片，共八张，以更大的双列四行陈列在档案墙右侧。
  const teamPhotos = [
    ["flag-photo-1.png", "带旗合影 · 一", .9, 4.35],
    ["extra-3.jpg", "求索红脉薪火实践队在塞罕坝纪念馆合影", 2.9, 4.35],
    ["flag-photo-3.png", "带旗合影 · 三", .9, 3.22],
    ["extra-4.jpg", "王何灵完成现场宣讲", 2.9, 3.22],
    ["flag-photo-4.png", "带旗合影 · 四", .9, 2.09],
    ["extra-1.jpg", "队员在西迁博物馆参观合影", 2.9, 2.09],
    ["extra-2.jpg", "实践队员合影", .9, .96],
    ["extra-5.jpg", "队员在馆内壁画前整理宣讲线索", 2.9, .96]
  ];
  const photoHitboxes = [];
  teamPhotos.forEach(([file, photoCaption, x, y]) => {
    const photoFrame = createExhibitPhotoFit(loader, `./assets/team/${file}`, 1.7, .95, materials);
    photoFrame.position.set(x, y, -.38);
    faceReadablePlane(photoFrame);
    group.add(photoFrame);
    const photoHitbox = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.15, .12),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
    );
    photoHitbox.position.set(x, y, -.3);
    photoHitbox.userData.interactive = "team-photo";
    photoHitbox.userData.photo = { image: `./assets/team/${file}`, caption: photoCaption };
    group.add(photoHitbox);
    photoHitboxes.push(photoHitbox);
  });

  const hitbox = new THREE.Mesh(new THREE.BoxGeometry(9.3, 5.8, .7), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
  hitbox.position.y = 2.8;
  hitbox.userData.interactive = "team";
  group.add(hitbox);
  group.userData.hitbox = hitbox;
  group.userData.photoHitboxes = photoHitboxes;
  return group;
}

function createRouteRelief(materials) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.28, .82, 32), materials.stoneDark);
  base.position.y = .41;
  group.add(base);
  const top = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, .09, 32), materials.bronzeDark);
  top.position.y = .87;
  group.add(top);
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-.68, .94, .35), new THREE.Vector3(-.32, .96, -.22),
    new THREE.Vector3(.03, .95, .18), new THREE.Vector3(.42, .96, -.32),
    new THREE.Vector3(.72, .95, .18)
  ]);
  const tube = new THREE.Mesh(new THREE.TubeGeometry(route, 40, .035, 8, false), materials.bronze);
  group.add(tube);
  for (const point of route.getPoints(4)) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(.07, 12, 8), materials.bronze);
    node.position.copy(point);
    group.add(node);
  }
  return group;
}

function exhibitTextTexture(title, subtitle, accent = "#b98542", width = 1344, height = 400, options = {}) {
  const { wrapSubtitle = false } = options;
  return canvasTexture((ctx, width, height) => {
    const background = ctx.createLinearGradient(0, 0, width, height);
    background.addColorStop(0, "#3a211b");
    background.addColorStop(.58, "#54251e");
    background.addColorStop(1, "#231614");
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, width, height);
    ctx.strokeStyle = accent;
    const border = Math.max(18, height * .065);
    ctx.lineWidth = Math.max(3, height * .012);
    ctx.strokeRect(border, border, width - border * 2, height - border * 2);
    ctx.strokeStyle = "rgba(255, 226, 166, .25)";
    ctx.lineWidth = 1;
    ctx.strokeRect(border * 1.48, border * 1.48, width - border * 2.96, height - border * 2.96);
    ctx.fillStyle = accent;
    ctx.fillRect(width * .068, height * .19, width * .085, Math.max(4, height * .012));
    ctx.textAlign = "left";
    ctx.fillStyle = "#f7e8c9";
    const titleSize = Math.min(76, height * .23, (width - width * .14) / Math.max(Array.from(title).length, 8));
    ctx.font = `600 ${titleSize}px Songti SC, STSong, serif`;
    ctx.fillText(title, width * .068, wrapSubtitle ? height * .42 : height * .48);
    ctx.fillStyle = "rgba(255, 239, 202, .94)";
    if (wrapSubtitle) {
      const subtitleSize = Math.min(50, height * .16);
      ctx.font = `600 ${subtitleSize}px Kaiti SC, STKaiti, KaiTi, BiauKai, serif`;
      const lines = wrapSubtitleLines(ctx, subtitle, width - width * .14, 2);
      const lineHeight = subtitleSize * 1.3;
      lines.forEach((line, index) => ctx.fillText(line, width * .07, height * .6 + index * lineHeight));
    } else {
      ctx.font = `600 ${Math.min(34, height * .115)}px Kaiti SC, STKaiti, KaiTi, BiauKai, serif`;
      ctx.fillText(subtitle, width * .07, height * .7);
    }
  }, width, height);
}

function createRealisticSurface(colors, lineColor, repeat = [1, 1], seam = 0) {
  const texture = canvasTexture((ctx, width, height) => {
    const wash = ctx.createLinearGradient(0, 0, width, height);
    wash.addColorStop(0, colors[0]);
    wash.addColorStop(.48, colors[1]);
    wash.addColorStop(1, colors[2]);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, width, height);

    const image = ctx.getImageData(0, 0, width, height);
    for (let index = 0; index < image.data.length; index += 4) {
      const grain = (Math.random() - .5) * 7;
      image.data[index] += grain;
      image.data[index + 1] += grain;
      image.data[index + 2] += grain;
    }
    ctx.putImageData(image, 0, 0);

    ctx.strokeStyle = lineColor;
    ctx.globalAlpha = .2;
    ctx.lineWidth = 1;
    for (let index = 0; index < 18; index += 1) {
      const y = index / 18 * height + Math.sin(index * 1.7) * 7;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(width * .28, y - 5, width * .7, y + 6, width, y - 2);
      ctx.stroke();
    }
    if (seam > 0) {
      ctx.globalAlpha = .34;
      ctx.lineWidth = 2;
      for (let x = 0; x <= width; x += width / seam) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y <= height; y += height / seam) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, 512, 512);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(...repeat);
  return texture;
}

function createXianMaterials() {
  const base = createStoneMaterials();
  const plaster = createRealisticSurface(["#bcb6aa", "#d7d1c5", "#a69f94"], "#71695f", [3, 2], 4);
  const terrazzo = createRealisticSurface(["#5b5652", "#77706a", "#4b4643"], "#b1a18e", [5, 6], 5);
  const walnut = createRealisticSurface(["#3b211b", "#633329", "#2d1916"], "#b27852", [2, 5]);
  return {
    ...base,
    xianWall: new THREE.MeshStandardMaterial({ color: 0xe0dbd0, map: plaster, roughness: .82, metalness: 0 }),
    xianFloor: new THREE.MeshStandardMaterial({ color: 0x8a817a, map: terrazzo, roughness: .64, metalness: .04 }),
    xianWood: new THREE.MeshStandardMaterial({ color: 0x75463a, map: walnut, roughness: .5, metalness: .02 }),
    xianRed: new THREE.MeshStandardMaterial({ color: 0x8d3029, roughness: .59, metalness: .02 }),
    xianBrass: new THREE.MeshStandardMaterial({ color: 0xd0a45b, roughness: .28, metalness: .76 }),
    xianMetal: new THREE.MeshStandardMaterial({ color: 0x574c45, roughness: .38, metalness: .68 }),
    xianGlass: new THREE.MeshPhysicalMaterial({ color: 0xe8e4d9, transmission: .42, transparent: true, opacity: .64, roughness: .16, metalness: 0 })
  };
}

function fitTextureCover(texture, imageWidth, imageHeight, frameWidth, frameHeight) {
  const imageAspect = imageWidth / imageHeight;
  const frameAspect = frameWidth / frameHeight;
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
  if (imageAspect > frameAspect) {
    texture.repeat.x = frameAspect / imageAspect;
    texture.offset.x = (1 - texture.repeat.x) / 2;
  } else {
    texture.repeat.y = imageAspect / frameAspect;
    texture.offset.y = (1 - texture.repeat.y) / 2;
  }
}

function fitTextureContain(texture, imageWidth, imageHeight, frameWidth, frameHeight) {
  texture.repeat.set(1, 1);
  texture.offset.set(0, 0);
}

function createXianPhoto(loader, path, width, height, materials) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: .7,
    metalness: .02,
    side: THREE.DoubleSide
  });
  loader.load(path, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    fitTextureCover(texture, texture.image.width, texture.image.height, width, height);
    material.map = texture;
    material.needsUpdate = true;
  });
  const frame = new THREE.Mesh(new THREE.BoxGeometry(width + .15, height + .15, .075), materials.xianMetal || materials.goldSoft);
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(width, height), material);
  photo.position.z = .055;
  frame.add(photo);
  return frame;
}

function createXianCeiling(materials) {
  const group = new THREE.Group();
  const field = new THREE.Mesh(new THREE.BoxGeometry(16.7, .12, 17.7), materials.xianWall);
  field.position.y = 6.47;
  group.add(field);

  for (const x of [-5.55, 0, 5.55]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(.16, .14, 17.1), materials.xianMetal);
    beam.position.set(x, 6.55, 0);
    group.add(beam);
  }
  for (const z of [-5.5, 0, 5.5]) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(16.1, .14, .16), materials.xianMetal);
    beam.position.set(0, 6.55, z);
    group.add(beam);
  }

  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe6b1,
    emissive: 0xffc86f,
    emissiveIntensity: .62,
    roughness: .42
  });
  for (const x of [-2.78, 2.78]) {
    for (const z of [-5.5, 0, 5.5]) {
      const recess = new THREE.Mesh(new THREE.BoxGeometry(1.92, .035, 3.45), lightMaterial);
      recess.position.set(x, 6.58, z);
      group.add(recess);
      const trim = new THREE.Mesh(new THREE.BoxGeometry(2.1, .045, 3.63), materials.xianBrass);
      trim.position.set(x, 6.605, z);
      group.add(trim);
    }
  }

  const centralField = new THREE.Mesh(new THREE.BoxGeometry(3.6, .07, 15.3), materials.xianWood);
  centralField.position.set(0, 6.57, 0);
  group.add(centralField);
  const centralLight = new THREE.Mesh(new THREE.BoxGeometry(2.82, .045, 14.7), lightMaterial);
  centralLight.position.set(0, 6.615, 0);
  group.add(centralLight);

  for (const z of [-7.9, 7.9]) {
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(16.2, .18, .13), materials.xianBrass);
    cornice.position.set(0, 6.48, z);
    group.add(cornice);
  }
  return group;
}

function createXianCoveLighting(materials) {
  const group = new THREE.Group();
  const glow = new THREE.MeshStandardMaterial({
    color: 0xffe8bd,
    emissive: 0xffc56e,
    emissiveIntensity: 1.05,
    roughness: .35
  });

  for (const x of [-7.92, 7.92]) {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(.08, .11, 16.6), materials.xianMetal);
    recess.position.set(x, 5.92, 0);
    group.add(recess);
    const strip = new THREE.Mesh(new THREE.BoxGeometry(.045, .055, 16.25), glow);
    strip.position.set(x - Math.sign(x) * .055, 5.87, 0);
    group.add(strip);
  }

  for (const z of [-7.95, 7.95]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(15.4, .055, .045), glow);
    strip.position.set(0, 5.87, z);
    group.add(strip);
  }

  for (const x of [-6.7, 6.7]) {
    for (const z of [-5.8, -.8, 4.2]) {
      const wash = new THREE.PointLight(0xffd5a0, 5.6, 8.5, 1.7);
      wash.position.set(x, 4.75, z);
      group.add(wash);
    }
  }
  return group;
}

function createXianWallBay(materials, x, z, side) {
  const group = new THREE.Group();
  const direction = side < 0 ? 1 : -1;
  const surface = new THREE.Mesh(new THREE.BoxGeometry(.12, 4.85, 3.84), materials.xianWall);
  surface.position.set(x + direction * .1, 3.02, z);
  group.add(surface);
  const pilaster = new THREE.Mesh(new THREE.BoxGeometry(.22, 5.55, .24), materials.xianBrass);
  pilaster.position.set(x + direction * .2, 3.05, z - 1.94);
  group.add(pilaster);
  const pilasterSecond = pilaster.clone();
  pilasterSecond.position.z = z + 1.94;
  group.add(pilasterSecond);
  const topBand = new THREE.Mesh(new THREE.BoxGeometry(.24, .23, 4.08), materials.xianWood);
  topBand.position.set(x + direction * .19, 5.55, z);
  group.add(topBand);
  const lowerBand = new THREE.Mesh(new THREE.BoxGeometry(.25, 1.02, 4.08), materials.xianWood);
  lowerBand.position.set(x + direction * .19, .72, z);
  group.add(lowerBand);
  const inlay = new THREE.Mesh(new THREE.BoxGeometry(.025, .035, 3.35), materials.xianBrass);
  inlay.position.set(x + direction * .34, 1.27, z);
  group.add(inlay);
  return group;
}

function createMuseumBench(materials) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.85, .22, .62), materials.xianWood);
  seat.position.y = 1.04;
  seat.castShadow = true;
  group.add(seat);
  const seatTop = new THREE.Mesh(new THREE.BoxGeometry(2.7, .055, .56), materials.xianBrass);
  seatTop.position.y = 1.18;
  group.add(seatTop);
  for (const x of [-1.08, 1.08]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(.16, 1.02, .42), materials.xianMetal);
    leg.position.set(x, .5, 0);
    group.add(leg);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.46, .08, .54), materials.xianMetal);
    foot.position.set(x, .07, 0);
    group.add(foot);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(2.72, .68, .12), materials.xianWood);
  back.position.set(0, 1.46, .23);
  group.add(back);
  return group;
}

function createPhotoCaption(text, width = 3.35) {
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, .48),
    new THREE.MeshBasicMaterial({
      map: canvasTexture((ctx, textureWidth, textureHeight) => {
        ctx.fillStyle = "#eee2c9";
        ctx.fillRect(0, 0, textureWidth, textureHeight);
        ctx.fillStyle = "#5a3028";
        ctx.font = "600 25px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
        ctx.textAlign = "center";
        ctx.fillText(text, textureWidth / 2, 33);
      }, 720, 104),
      toneMapped: false
    })
  );
}

function createTrackLight(materials, x, z, targetX, targetZ) {
  const group = new THREE.Group();
  const casing = new THREE.Mesh(new THREE.CylinderGeometry(.105, .13, .24, 18), materials.xianMetal);
  casing.position.y = 6.18;
  casing.rotation.x = Math.PI / 2;
  group.add(casing);
  const lens = new THREE.Mesh(
    new THREE.CircleGeometry(.095, 20),
    new THREE.MeshBasicMaterial({ color: 0xffe0aa, toneMapped: false })
  );
  lens.position.set(0, 6.04, .08);
  lens.rotation.x = Math.PI / 2;
  group.add(lens);
  const light = new THREE.SpotLight(0xffd3a0, 5.8, 11, .42, .6, 1.65);
  light.position.set(0, 6.02, 0);
  light.target.position.set(targetX - x, 2.35, targetZ - z);
  group.add(light, light.target);
  group.position.set(x, 0, z);
  return { group, light };
}

function createPhotoWall(loader, materials, { title, kicker, items, footnote }) {
  const group = new THREE.Group();
  const galleryWidth = 2.28;
  const galleryGap = 2.48;
  const span = (items.length - 1) * galleryGap + galleryWidth;
  const backingWidth = Math.max(8.6, span + .52);
  const backing = new THREE.Mesh(new THREE.BoxGeometry(backingWidth, 4.35, .2), materials.xianWood);
  backing.position.y = 3.02;
  group.add(backing);
  const header = new THREE.Mesh(
    new THREE.PlaneGeometry(4.4, .72),
    new THREE.MeshBasicMaterial({ map: exhibitTextTexture(title, kicker), toneMapped: false })
  );
  header.position.set(-backingWidth / 2 + 2.5, 5.08, .115);
  group.add(header);
  const galleryStart = -(items.length - 1) * galleryGap / 2;
  items.forEach((item, index) => {
    const photo = createXianPhoto(loader, item.image, galleryWidth, 1.78, materials);
    const photoX = galleryStart + index * galleryGap;
    photo.position.set(photoX, 3.05, .15);
    group.add(photo);
    const photoCaption = createPhotoCaption(item.caption, galleryWidth);
    photoCaption.position.set(photoX, 1.56, .155);
    group.add(photoCaption);
  });
  const caption = new THREE.Mesh(
    new THREE.PlaneGeometry(backingWidth - 1.3, .56),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#e7dfd0";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#4a332c";
      ctx.font = "600 29px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      ctx.fillText(footnote, 42, 62);
    }, 1200, 110), toneMapped: false })
  );
  caption.position.set(0, .98, .125);
  group.add(caption);
  return group;
}

function createXianTimelinePlinth(materials, loader) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(5.05, .82, 1.62), materials.xianWood);
  base.position.y = .43;
  base.castShadow = true;
  group.add(base);
  const footing = new THREE.Mesh(new THREE.BoxGeometry(5.3, .12, 1.84), materials.xianBrass);
  footing.position.y = .07;
  group.add(footing);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(5.15, .09, 1.7), materials.xianGlass);
  glass.position.y = .92;
  group.add(glass);
  const route = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-2.0, 1.02, .18),
    new THREE.Vector3(-.95, 1.03, -.28),
    new THREE.Vector3(.15, 1.02, .2),
    new THREE.Vector3(2.0, 1.02, -.12)
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(route, 40, .024, 8, false), materials.xianBrass));
  for (const [x, label] of [[-2.0, "上海"], [2.0, "西安"]]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(.062, 14, 10), materials.xianBrass);
    node.position.set(x, 1.02, x < 0 ? .18 : -.12);
    group.add(node);
  }
  const routeLabel = new THREE.Mesh(
    new THREE.PlaneGeometry(2.9, .44),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#f1e6d0";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#6d2f26";
      ctx.font = "600 28px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      ctx.textAlign = "center";
      ctx.fillText("上海 → 西安 · 1955—1956", width / 2, 33);
    }, 760, 110), toneMapped: false })
  );
  routeLabel.position.set(0, 1.06, .08);
  routeLabel.rotation.x = -Math.PI / 2;
  routeLabel.position.y = 1.06;
  group.add(routeLabel);

  const timeline = new THREE.Mesh(
    new THREE.PlaneGeometry(4.55, 1.08),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#efe0c0";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#6d2f26";
      ctx.textAlign = "center";
      ctx.font = "600 25px Songti SC, STSong, serif";
      ctx.fillText("西迁 · 历史沿革", width / 2, 40);
      ctx.strokeStyle = "#b98a46";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(74, 78);
      ctx.lineTo(width - 74, 78);
      ctx.stroke();
      ctx.fillStyle = "#8a5a3c";
      ctx.font = "600 24px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      ctx.fillText("1896 南洋公学", 128, 118);
      ctx.fillText("1955 中央决策", 438, 118);
      ctx.fillText("1956 师生西迁", 748, 118);
      ctx.fillText("2026 西迁70年", 1058, 118);
      ctx.fillStyle = "#b98a46";
      for (const x of [128, 438, 748, 1058]) {
        ctx.beginPath();
        ctx.arc(x, 74, 6, 0, Math.PI * 2);
        ctx.fill();
      }
    }, 1180, 260), toneMapped: false })
  );
  timeline.position.set(0, .66, -.855);
  faceReadablePlane(timeline);
  group.add(timeline);

  const historyPhoto = createXianPhoto(loader, "./assets/xian/documentary-1.jpg", .94, .66, materials);
  historyPhoto.position.set(-1.85, .78, .835);
  faceReadablePlane(historyPhoto);
  group.add(historyPhoto);
  const archiveSeal = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, .66),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#2c1b16";
      ctx.fillRect(0, 0, width, height);
      ctx.strokeStyle = "#b98a46";
      ctx.lineWidth = 5;
      ctx.strokeRect(12, 12, width - 24, height - 24);
      ctx.textAlign = "center";
      ctx.fillStyle = "#ecd7ad";
      ctx.font = "600 26px Songti SC, serif";
      ctx.fillText("馆藏史料", width / 2, 52);
      ctx.fillStyle = "#c9ab72";
      ctx.font = "600 22px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      ctx.fillText("文物与老照片待补充", width / 2, 88);
    }, 600, 260), toneMapped: false })
  );
  archiveSeal.position.set(1.85, .78, .835);
  faceReadablePlane(archiveSeal);
  group.add(archiveSeal);
  return group;
}

function createXianDisplayPlinth(materials) {
  const group = new THREE.Group();
  const footing = new THREE.Mesh(new THREE.BoxGeometry(5.82, .18, .62), materials.xianBrass);
  footing.position.y = .12;
  group.add(footing);
  const shadowGap = new THREE.Mesh(new THREE.BoxGeometry(5.58, .12, .7), materials.xianMetal);
  shadowGap.position.y = .27;
  group.add(shadowGap);
  const toe = new THREE.Mesh(new THREE.BoxGeometry(5.36, .32, .54), materials.xianWood);
  toe.position.y = .46;
  group.add(toe);
  return group;
}

function createExhibitPhotoFit(loader, path, maxWidth, maxHeight, materials) {
  const frame = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: .7,
    metalness: .02,
    side: THREE.DoubleSide
  });
  const photo = new THREE.Mesh(new THREE.PlaneGeometry(maxWidth, maxHeight), material);
  photo.position.z = .055;
  frame.add(photo);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(maxWidth + .15, maxHeight + .15, .075), materials.xianMetal || materials.goldSoft);
  frame.add(edge);
  loader.load(path, texture => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 16;
    const imageWidth = texture.image.width || 1;
    const imageHeight = texture.image.height || 1;
    const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight);
    const width = imageWidth * scale;
    const height = imageHeight * scale;
    fitTextureContain(texture, imageWidth, imageHeight, width, height);
    material.map = texture;
    material.needsUpdate = true;
    photo.geometry.dispose();
    photo.geometry = new THREE.PlaneGeometry(width, height);
    edge.geometry.dispose();
    edge.geometry = new THREE.BoxGeometry(width + .15, height + .15, .075);
  });
  return frame;
}

function createExhibitNode(exhibit, loader, materials, { photoLift = 0 } = {}) {
  const group = new THREE.Group();
  group.userData.exhibit = exhibit;
  group.userData.photoLift = photoLift;
  group.add(createXianDisplayPlinth(materials));
  const panel = new THREE.Mesh(new THREE.BoxGeometry(5.45, 5.25, .3), materials.xianWood);
  panel.position.y = 2.82;
  panel.castShadow = true;
  group.add(panel);
  const inset = new THREE.Mesh(
    new THREE.PlaneGeometry(4.72, .92),
    new THREE.MeshBasicMaterial({ map: exhibitTextTexture(exhibit.label, exhibit.kicker, "#b98542", 1536, 300), toneMapped: false })
  );
  // Keep the complete title and instruction strip clear of the image frame and plinth.
  inset.position.set(0, .72, -.38);
  faceReadablePlane(inset);
  group.add(inset);
  const lower = new THREE.Mesh(new THREE.BoxGeometry(5.68, .09, .38), materials.xianBrass);
  lower.position.y = .21;
  group.add(lower);
  const photo = createExhibitPhotoFit(loader, exhibit.image, 4.8, 4.0, materials);
  photo.position.set(0, 3.3 + photoLift, -.19);
  faceReadablePlane(photo);
  group.add(photo);
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(5.55, 5.5, .9),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.y = 2.8;
  hitbox.userData.interactive = "xian-exhibit";
  hitbox.userData.exhibit = exhibit;
  group.add(hitbox);
  group.userData.hitbox = hitbox;
  return group;
}

export function buildXianExhibition(scene) {
  const materials = createXianMaterials();
  const loader = new THREE.TextureLoader();
  const root = new THREE.Group();
  root.name = "西迁精神展厅";
  root.visible = false;
  scene.add(root);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(18, 20), materials.xianFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.walkable = true;
  root.add(floor);
  const floorInset = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 17.2), materials.stoneDark);
  floorInset.rotation.x = -Math.PI / 2;
  floorInset.position.y = .012;
  root.add(floorInset);
  for (const x of [-8.5, 8.5]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.42, 6.6, 18), materials.xianWall);
    wall.position.set(x, 3.3, 0);
    wall.receiveShadow = true;
    root.add(wall);
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(17, 6.6, .42), materials.xianWall);
  front.position.set(0, 3.3, -9);
  root.add(front);
  const back = new THREE.Mesh(new THREE.BoxGeometry(17, 6.6, .42), materials.xianRed);
  back.position.set(0, 3.3, 9);
  root.add(back);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(17, 18), materials.xianWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6.55;
  root.add(ceiling);
  root.add(createXianCeiling(materials));
  root.add(createXianCoveLighting(materials));
  for (const x of [-5.4, 0, 5.4]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(.055, .075, 16.4), materials.xianMetal);
    rail.position.set(x, 6.37, 0);
    root.add(rail);
  }
  for (const z of [-4.6, 0, 4.6]) {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(4.15, .035, 1.4), new THREE.MeshStandardMaterial({
      color: 0xffe8bf,
      emissive: 0xffd99b,
      emissiveIntensity: .42,
      roughness: .5
    }));
    recess.position.set(0, 6.39, z);
    root.add(recess);
  }

  for (const x of [-8.28, 8.28]) {
    for (const z of [-6.35, -2.1, 2.1, 6.35]) {
      root.add(createXianWallBay(materials, x, z, Math.sign(x)));
    }
  }

  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(8.8, 2.6),
    new THREE.MeshBasicMaterial({ map: exhibitTextTexture(XIAN_EXHIBITION.subtitle, XIAN_EXHIBITION.quote, "#b98542", 1792, 533, { wrapSubtitle: true }), toneMapped: false, side: THREE.DoubleSide })
  );
  title.position.set(0, 4.42, 8.72);
  faceReadablePlane(title);
  root.add(title);
  const titleLight = new THREE.PointLight(0xffc878, 12, 9, 1.7);
  titleLight.position.set(0, 4.1, 7.4);
  root.add(titleLight);

  const wallCopy = new THREE.Mesh(
    new THREE.PlaneGeometry(6.5, 1.55),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#efe0c0";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#6b2c24";
      ctx.font = "600 42px Songti SC, STSong, serif";
      ctx.fillText("从黄浦江畔到渭水之滨", 44, 80);
      ctx.fillStyle = "#7e5947";
      ctx.font = "600 28px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      const lines = wrapCanvasText(ctx, XIAN_EXHIBITION.lead, width - 96, 3);
      lines.forEach((line, index) => ctx.fillText(line, 46, 132 + index * 42));
    }, 1300, 310), toneMapped: false })
  );
  wallCopy.position.set(0, 2.06, 8.7);
  faceReadablePlane(wallCopy);
  root.add(wallCopy);

  const exhibits = [];
  const positions = [[-8.15, -4.5], [8.15, -4.5], [-8.15, 3.4], [8.15, 3.4]];
  XIAN_EXHIBITION.sections.forEach((exhibit, index) => {
    const node = createExhibitNode(exhibit, loader, materials, { photoLift: .16 });
    node.position.set(positions[index][0], 0, positions[index][1]);
    node.rotation.y = positions[index][0] < 0 ? -Math.PI / 2 : Math.PI / 2;
    root.add(node);
    exhibits.push(node);
  });
  const photoWall = createPhotoWall(loader, materials, {
    title: XIAN_EXHIBITION.galleryTitle,
    kicker: "研学 · 拍摄 · 青年表达",
    items: XIAN_EXHIBITION.gallery.map((image, index) => ({
      image,
      caption: XIAN_EXHIBITION.galleryCaptions[index]
    })),
    footnote: "从研读馆藏到完成宣讲拍摄，青年在历史现场理解西迁选择"
  });
  photoWall.position.set(0, 0, -8.72);
  root.add(photoWall);
  const timelinePlinth = createXianTimelinePlinth(materials, loader);
  timelinePlinth.position.set(0, 0, .7);
  root.add(timelinePlinth);
  const backline = new THREE.Mesh(new THREE.BoxGeometry(15.8, .16, .18), materials.gold);
  backline.position.set(0, .12, 8.63);
  root.add(backline);
  const ambient = new THREE.HemisphereLight(0xfff4e2, 0x66554b, 2.35);
  root.add(ambient);
  const key = new THREE.DirectionalLight(0xffead0, 3.4);
  key.position.set(-4, 9, -6);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  root.add(key);
  const entranceFill = new THREE.SpotLight(0xffe0b5, 18, 22, .72, .72, 1.55);
  entranceFill.position.set(0, 5.8, -7.2);
  entranceFill.target.position.set(0, 1.8, 1.8);
  root.add(entranceFill, entranceFill.target);
  const spots = [];
  for (const [x, z] of positions) {
    const targetX = x < 0 ? -7.9 : 7.9;
    const track = createTrackLight(materials, x < 0 ? -5.35 : 5.35, z, targetX, z);
    root.add(track.group);
    spots.push(track.light);
  }
  const interactives = exhibits.map(node => node.userData.hitbox);
  return { root, floor, exhibits, interactives, titleLight, spots };
}

export function updateXianExhibition(exhibition, elapsed, reducedMotion) {
  if (!exhibition) return;
  const rhythm = reducedMotion ? 0 : elapsed;
  exhibition.titleLight.intensity = 8.5 + Math.sin(rhythm * .7) * .35;
  exhibition.exhibits.forEach((node, index) => {
    node.position.y = Math.sin(rhythm * .18 + index * .7) * .002;
  });
}

function createCompactCeiling(materials, width, depth) {
  const group = new THREE.Group();
  const field = new THREE.Mesh(new THREE.BoxGeometry(width - .6, .12, depth - .6), materials.xianWall);
  field.position.y = 5.9;
  group.add(field);
  const lightMaterial = new THREE.MeshStandardMaterial({
    color: 0xffe6b1,
    emissive: 0xffc86f,
    emissiveIntensity: .58,
    roughness: .42
  });
  for (const x of [-2.7, 2.7]) {
    const recess = new THREE.Mesh(new THREE.BoxGeometry(1.7, .035, depth - 2.4), lightMaterial);
    recess.position.set(x, 5.99, 0);
    group.add(recess);
    const trim = new THREE.Mesh(new THREE.BoxGeometry(1.88, .045, depth - 2.1), materials.xianBrass);
    trim.position.set(x, 6.03, 0);
    group.add(trim);
  }
  const center = new THREE.Mesh(new THREE.BoxGeometry(6.6, .04, 1.4), lightMaterial);
  center.position.set(0, 6.0, 0);
  group.add(center);
  for (const z of [-depth / 2 + .55, depth / 2 - .55]) {
    const cornice = new THREE.Mesh(new THREE.BoxGeometry(width - .8, .16, .13), materials.xianBrass);
    cornice.position.set(0, 5.86, z);
    group.add(cornice);
  }
  return group;
}

function createCompactTitleWall(exhibition, materials) {
  const group = new THREE.Group();
  const title = new THREE.Mesh(
    new THREE.PlaneGeometry(8.4, 2.5),
    new THREE.MeshBasicMaterial({ map: exhibitTextTexture(exhibition.subtitle, exhibition.quote, "#b98542", 1792, 533, { wrapSubtitle: true }), toneMapped: false, side: THREE.DoubleSide })
  );
  title.position.set(0, 4.0, 0);
  faceReadablePlane(title);
  group.add(title);
  const titleLight = new THREE.PointLight(0xffc878, 11, 9, 1.7);
  titleLight.position.set(0, 3.8, -1.1);
  group.add(titleLight);
  const copy = new THREE.Mesh(
    new THREE.PlaneGeometry(6.4, 1.42),
    new THREE.MeshBasicMaterial({ map: canvasTexture((ctx, width, height) => {
      ctx.fillStyle = "#efe0c0";
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = "#6b2c24";
      ctx.font = "600 42px Songti SC, STSong, serif";
      ctx.fillText(exhibition.title, 44, 78);
      ctx.fillStyle = "#6d4939";
      ctx.font = "600 28px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      const lines = wrapCanvasText(ctx, exhibition.lead, width - 96, 3);
      lines.forEach((line, index) => ctx.fillText(line, 46, 132 + index * 43));
    }, 1280, 284), toneMapped: false })
  );
  copy.position.set(0, 1.62, 0);
  faceReadablePlane(copy);
  group.add(copy);
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(8.7, 5.15, .65),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.set(0, 3.18, -.18);
  hitbox.userData.interactive = "centerpiece-focus";
  group.add(hitbox);
  return { group, titleLight, hitbox };
}

function createCenterpiecePlaque(title, subtitle, width = 2.2) {
  const plaqueHeight = width * 148 / 720;
  return new THREE.Mesh(
    new THREE.PlaneGeometry(width, plaqueHeight),
    createReadableTexture(canvasTexture((ctx, textureWidth, textureHeight) => {
      const wash = ctx.createLinearGradient(0, 0, textureWidth, textureHeight);
      wash.addColorStop(0, "#3b211b");
      wash.addColorStop(1, "#5b2921");
      ctx.fillStyle = wash;
      ctx.fillRect(0, 0, textureWidth, textureHeight);
      ctx.strokeStyle = "#d9ad5c";
      ctx.lineWidth = 6;
      ctx.strokeRect(12, 12, textureWidth - 24, textureHeight - 24);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f7e6bd";
      ctx.font = "600 42px Songti SC, STSong, serif";
      ctx.fillText(title, textureWidth / 2, 62);
      ctx.fillStyle = "#dfc28b";
      ctx.font = "600 24px Kaiti SC, STKaiti, KaiTi, BiauKai, serif";
      ctx.fillText(subtitle, textureWidth / 2, 104);
    }, 720, 148))
  );
}

function createRoadRoute(points, color) {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: .2,
    metalness: .72,
    emissive: color,
    emissiveIntensity: .34
  });
  const shadowMaterial = new THREE.MeshStandardMaterial({
    color: 0x2c2420,
    roughness: .76,
    metalness: .08
  });
  const curve = new THREE.CatmullRomCurve3(points.map(([x, y, z]) => new THREE.Vector3(x, y, z)));
  const shadow = new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .082, 10, false), shadowMaterial);
  shadow.position.y = -.035;
  group.add(shadow);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 64, .047, 10, false), material));
  for (const point of [curve.getPoint(.08), curve.getPoint(.92)]) {
    const node = new THREE.Mesh(new THREE.SphereGeometry(.09, 18, 12), material);
    node.position.copy(point);
    group.add(node);
  }
  return group;
}

function createRoadGateway(materials) {
  const group = new THREE.Group();
  group.name = "两路精神道路门架";

  const concrete = new THREE.MeshStandardMaterial({ color: 0xb8aa94, roughness: .72, metalness: .04 });
  const road = new THREE.MeshStandardMaterial({ color: 0x403d3a, roughness: .82, metalness: .02 });
  const stripe = new THREE.MeshStandardMaterial({ color: 0xe7c46e, roughness: .38, emissive: 0x5b3809, emissiveIntensity: .12 });
  const roadway = new THREE.Mesh(new THREE.BoxGeometry(1.62, .08, 2.05), road);
  roadway.position.set(0, 1.22, -.04);
  group.add(roadway);
  const centerLine = new THREE.Mesh(new THREE.BoxGeometry(.045, .025, 1.9), stripe);
  centerLine.position.set(0, 1.275, -.04);
  group.add(centerLine);

  for (const x of [-.72, .72]) {
    const pier = new THREE.Mesh(new THREE.BoxGeometry(.22, 1.12, .28), concrete);
    pier.position.set(x, 1.76, -.58);
    group.add(pier);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(.36, .12, .42), materials.xianBrass);
    foot.position.set(x, 1.24, -.58);
    group.add(foot);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(1.72, .24, .32), concrete);
  beam.position.set(0, 2.28, -.58);
  group.add(beam);
  const beamBand = new THREE.Mesh(new THREE.BoxGeometry(1.82, .07, .36), materials.xianBrass);
  beamBand.position.set(0, 2.43, -.58);
  group.add(beamBand);

  const plaque = createCenterpiecePlaque("川藏 · 青藏", "两条天路通高原", 1.38);
  plaque.position.set(0, 2.29, -.755);
  faceReadablePlane(plaque);
  group.add(plaque);
  return group;
}

function createRoadCenterpiece(materials) {
  const group = new THREE.Group();
  const terrain = new THREE.Mesh(
    new THREE.CylinderGeometry(1.47, 1.58, .22, 48),
    new THREE.MeshStandardMaterial({ color: 0x71685f, roughness: .84, metalness: .06 })
  );
  terrain.scale.z = .84;
  terrain.position.y = 1.08;
  group.add(terrain);
  const ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x908981, roughness: .88 });
  const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf1ece1, roughness: .7 });
  for (const [x, z, radius, height] of [[-.78, .48, .4, .62], [-.13, .7, .54, .82], [.62, .4, .42, .66]]) {
    const ridge = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 7), ridgeMaterial);
    ridge.position.set(x, 1.19 + height / 2, z);
    ridge.rotation.y = .34;
    group.add(ridge);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(radius * .46, height * .3, 7), snowMaterial);
    cap.position.set(x, 1.19 + height * .85, z);
    cap.rotation.y = .34;
    group.add(cap);
  }

  const chuanRoute = createRoadRoute([
    [-1.12, 1.34, -.75], [-.64, 1.42, -.42], [-.18, 1.37, -.08], [.46, 1.43, .18], [1.08, 1.38, .65]
  ], 0xe5ad45);
  const qingRoute = createRoadRoute([
    [1.08, 1.34, -.72], [.58, 1.38, -.34], [.1, 1.34, .05], [-.46, 1.41, .38], [-1.05, 1.36, .72]
  ], 0xb84c3d);
  group.add(chuanRoute, qingRoute);
  group.add(createRoadGateway(materials));

  const routeMarkers = [
    ["川藏线", "成都 → 拉萨", -1.08],
    ["青藏线", "西宁 → 拉萨", 1.08]
  ];
  routeMarkers.forEach(([title, subtitle, x]) => {
    const marker = createCenterpiecePlaque(title, subtitle, 1.02);
    marker.position.set(x, 1.82, -.96);
    faceReadablePlane(marker);
    group.add(marker);
  });

  const mainPlaque = createCenterpiecePlaque("川藏线 · 青藏线", "两条天路，一座精神丰碑", 2.45);
  mainPlaque.position.set(0, .78, -1.28);
  faceReadablePlane(mainPlaque);
  group.add(mainPlaque);
  return group;
}

function createTibetMemorial(materials) {
  const group = new THREE.Group();
  const ridgeMaterial = new THREE.MeshStandardMaterial({ color: 0x657783, roughness: .82 });
  const snowMaterial = new THREE.MeshStandardMaterial({ color: 0xf2eee5, roughness: .64 });
  const ridge = new THREE.Mesh(new THREE.ConeGeometry(1.08, 2.28, 7), ridgeMaterial);
  ridge.position.set(.42, 2.08, .42);
  ridge.rotation.y = .48;
  group.add(ridge);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(.54, .78, 7), snowMaterial);
  cap.position.set(.42, 2.83, .42);
  cap.rotation.y = .48;
  group.add(cap);

  const path = new THREE.CatmullRomCurve3([
    new THREE.Vector3(-1.22, 1.16, -.86),
    new THREE.Vector3(-.68, 1.21, -.46),
    new THREE.Vector3(-.08, 1.18, -.15),
    new THREE.Vector3(.46, 1.25, .2),
    new THREE.Vector3(.95, 1.32, .78)
  ]);
  group.add(new THREE.Mesh(new THREE.TubeGeometry(path, 56, .06, 10, false), materials.xianBrass));

  const footing = new THREE.Mesh(new THREE.BoxGeometry(1.52, .2, .86), materials.xianBrass);
  footing.position.set(-.58, 1.2, -.72);
  group.add(footing);
  const stele = new THREE.Mesh(new THREE.BoxGeometry(.92, 1.72, .42), materials.xianMetal);
  stele.position.set(-.58, 2.04, -.72);
  group.add(stele);
  const crown = createTibetSteleCrown(materials);
  crown.position.set(-.58, 2.91, -.72);
  group.add(crown);
  const plaque = createCenterpiecePlaque("老西藏精神", "缺氧不缺精神 · 艰苦不怕吃苦", 1.66);
  plaque.position.set(-.58, 2.05, -.95);
  faceReadablePlane(plaque);
  group.add(plaque);
  return group;
}

function createTibetSteleCrown(materials) {
  const group = new THREE.Group();
  group.name = "老西藏精神纪念碑冠";
  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.12, .12, .56), materials.xianBrass);
  group.add(lower);
  const redEave = new THREE.Mesh(new THREE.BoxGeometry(.96, .16, .5), materials.xianRed);
  redEave.position.y = .12;
  group.add(redEave);
  const upper = new THREE.Mesh(new THREE.BoxGeometry(.7, .12, .42), materials.xianBrass);
  upper.position.y = .26;
  group.add(upper);
  const finial = new THREE.Mesh(new THREE.CylinderGeometry(.055, .1, .36, 18), materials.xianBrass);
  finial.position.y = .48;
  group.add(finial);
  const jewel = new THREE.Mesh(new THREE.SphereGeometry(.1, 18, 12), materials.xianRed);
  jewel.position.y = .7;
  group.add(jewel);
  return group;
}

function createTibetCenterpiece(materials) {
  return createTibetMemorial(materials);
}

function createCompactCenterpiece(materials, kind) {
  const group = new THREE.Group();
  const plinthRadius = kind === "road" || kind === "snow" ? 1.62 : .92;
  const plinth = new THREE.Mesh(new THREE.CylinderGeometry(plinthRadius * .88, plinthRadius, .28, 40), materials.xianBrass);
  plinth.position.y = .14;
  group.add(plinth);
  const base = new THREE.Mesh(new THREE.CylinderGeometry(plinthRadius * .73, plinthRadius * .83, .78, 40), materials.xianWood);
  base.position.y = .62;
  group.add(base);
  if (kind === "road") {
    group.add(createRoadCenterpiece(materials));
  } else if (kind === "forest") {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(.14, .2, 1.15, 16), materials.xianWood);
    trunk.position.y = 1.25;
    group.add(trunk);
    const greens = [
      [1.05, 1.62, 0x3e5c44],
      [.82, 2.08, 0x486b4c],
      [.58, 2.52, 0x527a52]
    ];
    greens.forEach(([radius, y, color], index) => {
      const tier = new THREE.Mesh(
        new THREE.ConeGeometry(radius, .78, 24),
        new THREE.MeshStandardMaterial({ color, roughness: .72, metalness: .02 })
      );
      tier.position.y = y;
      group.add(tier);
      const band = new THREE.Mesh(new THREE.CylinderGeometry(radius * .92, radius * .92, .05, 24), materials.xianBrass);
      band.position.y = y - .36;
      group.add(band);
    });
  } else if (kind === "snow") {
    group.add(createTibetCenterpiece(materials));
  } else {
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(.42, 32, 24),
      new THREE.MeshStandardMaterial({ color: 0x6d7f9a, roughness: .32, metalness: .55, emissive: 0x172433, emissiveIntensity: .55 })
    );
    core.position.y = 1.55;
    group.add(core);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(.78, .022, 10, 56), materials.xianBrass);
    ring.position.y = 1.55;
    ring.rotation.x = 1.15;
    group.add(ring);
    const ringB = ring.clone();
    ringB.rotation.set(1.15, 0, .7);
    group.add(ringB);
  }
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(kind === "road" || kind === "snow" ? 4.0 : 2.7, 3.35, kind === "road" || kind === "snow" ? 4.0 : 2.7),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false })
  );
  hitbox.position.y = 1.55;
  hitbox.userData.interactive = "centerpiece-focus";
  group.add(hitbox);
  group.userData.hitbox = hitbox;
  return group;
}

export function buildCompactHall(scene, exhibition, kind) {
  const materials = createXianMaterials();
  const loader = new THREE.TextureLoader();
  const root = new THREE.Group();
  root.name = `${exhibition.subtitle}展厅`;
  root.visible = false;
  scene.add(root);

  const width = 13.6;
  const depth = 14.2;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.xianFloor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.walkable = true;
  root.add(floor);
  const floorInset = new THREE.Mesh(new THREE.PlaneGeometry(3.0, depth - 2.2), materials.stoneDark);
  floorInset.rotation.x = -Math.PI / 2;
  floorInset.position.y = .012;
  root.add(floorInset);

  for (const x of [-width / 2, width / 2]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(.42, 6.1, depth), materials.xianWall);
    wall.position.set(x, 3.05, 0);
    wall.receiveShadow = true;
    root.add(wall);
  }
  const front = new THREE.Mesh(new THREE.BoxGeometry(width, 6.1, .42), materials.xianWall);
  front.position.set(0, 3.05, -depth / 2);
  root.add(front);
  const back = new THREE.Mesh(new THREE.BoxGeometry(width, 6.1, .42), materials.xianRed);
  back.position.set(0, 3.05, depth / 2);
  root.add(back);
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), materials.xianWall);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 6.05;
  root.add(ceiling);
  root.add(createCompactCeiling(materials, width, depth));

  const title = createCompactTitleWall(exhibition, materials);
  title.group.position.set(0, 0, depth / 2 - .4);
  root.add(title.group);

  // 入口背后的空腔：为备有影像档案的展馆加挂一面现场影像档案墙。
  if (exhibition.gallery?.length) {
    const archiveWall = createPhotoWall(loader, materials, {
      title: exhibition.galleryTitle,
      kicker: exhibition.galleryKicker || "研学 · 拍摄 · 青年表达",
      items: exhibition.gallery.map((image, index) => ({
        image,
        caption: exhibition.galleryCaptions[index]
      })),
      footnote: exhibition.galleryFootnote || ""
    });
    archiveWall.position.set(0, 0, -depth / 2 + .35);
    root.add(archiveWall);
  }

  const exhibits = [];
  const photoLift = kind === "snow" ? 0 : .16;
  const positions = [
    [-width / 2 + .32, -3.2],
    [-width / 2 + .32, 3.2],
    [width / 2 - .32, -3.2],
    [width / 2 - .32, 3.2]
  ];
  exhibition.sections.forEach((exhibit, index) => {
    const node = createExhibitNode(exhibit, loader, materials, { photoLift });
    node.position.set(positions[index][0], 0, positions[index][1]);
    node.rotation.y = positions[index][0] < 0 ? -Math.PI / 2 : Math.PI / 2;
    root.add(node);
    exhibits.push(node);
  });

  const centerpiece = createCompactCenterpiece(materials, kind);
  centerpiece.position.set(0, 0, 0);
  // 进入展厅时首屏不应被大体量中央装置压迫，除西迁馆外的主题装置统一缩小。
  centerpiece.scale.setScalar(.68);
  root.add(centerpiece);

  const ambient = new THREE.HemisphereLight(0xfff4e2, 0x66554b, 2.3);
  root.add(ambient);
  const key = new THREE.DirectionalLight(0xffead0, 3.2);
  key.position.set(-4, 8, -5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  root.add(key);
  const entranceFill = new THREE.SpotLight(0xffe0b5, 17, 20, .72, .72, 1.55);
  entranceFill.position.set(0, 5.6, -6.2);
  entranceFill.target.position.set(0, 1.8, 1.4);
  root.add(entranceFill, entranceFill.target);
  const spots = [];
  for (const [x, z] of positions) {
    const targetX = x < 0 ? -width / 2 + .55 : width / 2 - .55;
    const track = createTrackLight(materials, x < 0 ? -width / 2 + 1.5 : width / 2 - 1.5, z, targetX, z);
    root.add(track.group);
    spots.push(track.light);
  }

  const interactives = exhibits.map(node => node.userData.hitbox);
  interactives.push(title.hitbox, centerpiece.userData.hitbox);
  return { root, floor, exhibits, interactives, titleLight: title.titleLight, spots, centerpiece };
}

export function updateCompactHall(hall, elapsed, reducedMotion) {
  if (!hall) return;
  const rhythm = reducedMotion ? 0 : elapsed;
  hall.titleLight.intensity = 8.5 + Math.sin(rhythm * .7) * .35;
  hall.exhibits.forEach((node, index) => {
    node.position.y = Math.sin(rhythm * .18 + index * .7) * .002;
  });
}

export function buildLobby(scene) {
  const materials = createStoneMaterials();
  const loader = new THREE.TextureLoader();
  const architecture = new THREE.Group();
  const lobbyLighting = new THREE.Group();
  lobbyLighting.name = "中央大厅灯光";
  architecture.add(lobbyLighting);
  scene.add(architecture);

  const floor = new THREE.Mesh(new THREE.CircleGeometry(18.4, 128), materials.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  floor.userData.walkable = true;
  architecture.add(floor);

  for (const radius of [5.1, 10.9, 17.6]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(radius - .065, radius + .065, 128), radius === 10.9 ? materials.gold : materials.goldSoft);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = .025;
    architecture.add(ring);
  }
  for (let index = 0; index < 20; index += 1) {
    const angle = index / 20 * Math.PI * 2;
    const wedge = new THREE.Mesh(
      new THREE.RingGeometry(5.18, 10.82, 24, 1, angle + .018, Math.PI * 2 / 20 - .036),
      index % 2 === 0 ? materials.stoneDark : materials.floorInset
    );
    wedge.rotation.x = -Math.PI / 2;
    wedge.position.y = .018;
    architecture.add(wedge);
  }
  HALLS.forEach(hall => {
    const angle = hall.angle * DEG;
    const guide = new THREE.Mesh(new THREE.BoxGeometry(.075, .035, 6.45), materials.goldSoft);
    guide.position.set(Math.cos(angle) * 7.6, .055, Math.sin(angle) * 7.6);
    guide.rotation.y = Math.PI / 2 - angle;
    architecture.add(guide);
  });
  architecture.add(createCompass(materials));

  const hallAngles = HALLS.map(hall => hall.angle * DEG);
  for (let index = 0; index < 48; index += 1) {
    const angle = index / 48 * Math.PI * 2;
    const nearEntrance = hallAngles.some(entry => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < .165);
    const nearArchive = Math.abs(Math.atan2(Math.sin(angle - Math.PI / 2), Math.cos(angle - Math.PI / 2))) < .24;
    if (nearEntrance || nearArchive) continue;
    const panel = new THREE.Mesh(new THREE.BoxGeometry(2.25, 5.6, .65), index % 2 ? materials.stone : materials.stoneLight);
    panel.position.set(Math.cos(angle) * 17.55, 2.8, Math.sin(angle) * 17.55);
    panel.rotation.y = -angle + Math.PI / 2;
    panel.receiveShadow = true;
    architecture.add(panel);
    if (index % 2 === 0) {
      const inset = new THREE.Mesh(new THREE.BoxGeometry(1.48, 3.62, .08), materials.redStone);
      inset.position.set(Math.cos(angle) * 17.2, 2.78, Math.sin(angle) * 17.2);
      inset.rotation.y = -angle + Math.PI / 2;
      architecture.add(inset);
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.72, 3.88, .055), materials.goldSoft);
      frame.position.set(Math.cos(angle) * 17.14, 2.78, Math.sin(angle) * 17.14);
      frame.rotation.y = -angle + Math.PI / 2;
      architecture.add(frame);
      const innerFrame = new THREE.Mesh(new THREE.BoxGeometry(1.48, 3.62, .07), materials.redVelvet);
      innerFrame.position.set(Math.cos(angle) * 17.09, 2.78, Math.sin(angle) * 17.09);
      innerFrame.rotation.y = -angle + Math.PI / 2;
      architecture.add(innerFrame);
    }
  }

  const sconces = [];
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2 + Math.PI / 12;
    const nearEntrance = hallAngles.some(entry => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < .24);
    if (nearEntrance) continue;
    const sconce = createWallSconce(materials);
    sconce.position.set(Math.cos(angle) * 16.75, 3.86, Math.sin(angle) * 16.75);
    sconce.rotation.y = -angle - Math.PI / 2;
    architecture.add(sconce);
    sconces.push(sconce);
  }

  for (let i = 0; i < 16; i += 1) {
    const angle = i / 16 * Math.PI * 2 + Math.PI / 16;
    const nearEntrance = hallAngles.some(entry => Math.abs(Math.atan2(Math.sin(angle - entry), Math.cos(angle - entry))) < .2);
    if (nearEntrance) continue;
    const column = createColumn(materials, 5.25);
    column.position.set(Math.cos(angle) * 13.2, 0, Math.sin(angle) * 13.2);
    architecture.add(column);
  }

  architecture.add(createSegmentedCornice(17.2, .38, 14, 128, materials.stoneLight, 5.65));
  architecture.add(createSegmentedCornice(16.78, .2, 12, 128, materials.redStone, 6.02));
  architecture.add(createSegmentedCornice(16.58, .085, 10, 128, materials.gold, 6.26));
  architecture.add(createSegmentedCornice(13.15, .22, 12, 128, materials.goldSoft, 5.38));

  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(17.05, 96, 32, 0, Math.PI * 2, 0, Math.PI / 2 - .11),
    new THREE.MeshStandardMaterial({ color: 0xd8c5a6, roughness: .65, metalness: .02, emissive: 0x714939, emissiveIntensity: .12, side: THREE.BackSide })
  );
  dome.position.y = 5.6;
  architecture.add(dome);

  for (let index = 0; index < 24; index += 1) {
    const coffer = createDomeCoffer(materials, index, 24);
    coffer.position.y = 5.6;
    architecture.add(coffer);
  }

  for (let i = 0; i < 24; i += 1) {
    const angle = i / 24 * Math.PI * 2;
    const outer = new THREE.Vector3(Math.cos(angle) * 16.98, 5.85, Math.sin(angle) * 16.98);
    const inner = new THREE.Vector3(Math.cos(angle) * 4.05, 21.86, Math.sin(angle) * 4.05);
    const control = new THREE.Vector3(Math.cos(angle) * 11.2, 14.7, Math.sin(angle) * 11.2);
    const curve = new THREE.QuadraticBezierCurve3(outer, control, inner);
    const rib = new THREE.Mesh(new THREE.TubeGeometry(curve, 36, .095, 10, false), i % 2 ? materials.gold : materials.goldSoft);
    architecture.add(rib);
  }

  const domeBand = new THREE.Mesh(new THREE.TorusGeometry(10.95, .17, 12, 128), materials.redStone);
  domeBand.rotation.x = Math.PI / 2;
  domeBand.position.y = 15.65;
  architecture.add(domeBand);
  const domeBandGold = new THREE.Mesh(new THREE.TorusGeometry(10.95, .065, 8, 128), materials.gold);
  domeBandGold.rotation.x = Math.PI / 2;
  domeBandGold.position.y = 15.83;
  architecture.add(domeBandGold);
  const domeBandUpper = new THREE.Mesh(new THREE.TorusGeometry(7.55, .11, 10, 128), materials.goldSoft);
  domeBandUpper.rotation.x = Math.PI / 2;
  domeBandUpper.position.y = 19.1;
  architecture.add(domeBandUpper);

  architecture.add(createDomeLantern(materials));
  const oculus = new THREE.Mesh(new THREE.CircleGeometry(4.0, 80), materials.glass);
  oculus.rotation.x = Math.PI / 2;
  oculus.position.y = 21.9;
  architecture.add(oculus);

  const oculusGlow = new THREE.PointLight(0xffdf9c, 38, 21, 1.75);
  oculusGlow.position.set(0, 20.9, 0);
  lobbyLighting.add(oculusGlow);

  const upperLight = new THREE.SpotLight(0xffefd0, 24, 28, .76, .48, 1.4);
  upperLight.position.set(0, 21, 0);
  upperLight.target.position.set(0, 0, 0);
  lobbyLighting.add(upperLight, upperLight.target);

  const halls = [];
  const interactives = [];
  HALLS.forEach(hall => {
    const angle = hall.angle * DEG;
    const portal = createArch(materials, hall);
    portal.position.set(Math.cos(angle) * HALL_RADIUS, 0, Math.sin(angle) * HALL_RADIUS);
    // Each portal's local opening faces -Z; rotate it toward the circular hall center.
    portal.rotation.y = Math.PI / 2 - angle;
    architecture.add(portal);
    halls.push(portal);
    interactives.push(portal.userData.hitbox);
  });

  const archive = createTeamArchive(loader, materials);
  archive.position.set(0, 0, 16.85);
  archive.rotation.y = 0;
  architecture.add(archive);
  interactives.push(archive.userData.hitbox);
  interactives.push(...(archive.userData.photoHitboxes || []));
  addPedestal(architecture, -5.55, 14.6, 1.12, materials);
  const route = createRouteRelief(materials);
  route.position.set(-5.55, 1.3, 14.6);
  architecture.add(route);

  const ambient = new THREE.HemisphereLight(0xffefd2, 0x54251f, 3.35);
  lobbyLighting.add(ambient);
  const sun = new THREE.DirectionalLight(0xffe9bd, 5.4);
  sun.position.set(-6, 20, 7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  lobbyLighting.add(sun);
  const centerLight = new THREE.PointLight(0xffce73, 52, 30, 1.65);
  centerLight.position.set(0, 12.5, 0);
  lobbyLighting.add(centerLight);
  [0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle, index) => {
    const light = new THREE.SpotLight(index % 2 ? 0xffbd68 : 0xffdfac, 20, 26, .68, .52, 1.65);
    light.position.set(Math.cos(angle) * 10, 6.3, Math.sin(angle) * 10);
    light.target.position.set(0, 0, 0);
    lobbyLighting.add(light, light.target);
  });

  const particlesGeometry = new THREE.BufferGeometry();
  const particlePositions = [];
  for (let i = 0; i < 190; i += 1) {
    const radius = 3 + Math.random() * 13;
    const angle = Math.random() * Math.PI * 2;
    particlePositions.push(Math.cos(angle) * radius, .6 + Math.random() * 10, Math.sin(angle) * radius);
  }
  particlesGeometry.setAttribute("position", new THREE.Float32BufferAttribute(particlePositions, 3));
  const particles = new THREE.Points(particlesGeometry, new THREE.PointsMaterial({ color: 0xe4bf7d, size: .024, transparent: true, opacity: .38, depthWrite: false }));
  architecture.add(particles);

  return { root: architecture, floor, halls, archive, interactives, particles, centerLight };
}

export function updateLobby(lobby, elapsed, activeHall, reducedMotion) {
  const rhythm = reducedMotion ? 0 : elapsed;
  lobby.particles.rotation.y = rhythm * .008;
  lobby.particles.position.y = Math.sin(rhythm * .17) * .07;
  lobby.centerLight.intensity = 52 + Math.sin(rhythm * .55) * 2.5;
  lobby.halls.forEach((portal, index) => {
    const active = activeHall && portal.userData.hall.id === activeHall.id;
    const targetIntensity = active ? 12 : 6.2;
    portal.userData.light.intensity += (targetIntensity - portal.userData.light.intensity) * .055;
    const targetEmissive = active ? .34 : .08;
    portal.userData.hallMaterial.emissiveIntensity += (targetEmissive - portal.userData.hallMaterial.emissiveIntensity) * .055;
    portal.position.y = Math.sin(rhythm * .35 + index) * .008;
  });
}
