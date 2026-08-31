import * as THREE from "three";
import { HALLS, TEAM_ARCHIVE, LIANGLU_EXHIBITION, LIANGDAN_EXHIBITION, SAIHANBA_EXHIBITION, TIBET_EXHIBITION } from "./data.js?v=20260831-gallery-pass";
import { buildLobby, updateLobby, buildXianExhibition, updateXianExhibition, buildCompactHall, updateCompactHall } from "./scene.js?v=20260831-gallery-pass";

const container = document.querySelector("#scene");
const loading = document.querySelector("#loading");
const statusText = document.querySelector("#status-text");
const hallList = document.querySelector("#hall-list");
const hallIndex = document.querySelector(".hall-index");
const locationLabel = document.querySelector("#location-label");
const backToLobby = document.querySelector("#back-to-lobby");
const helpPanel = document.querySelector("#help-panel");
const infoPanel = document.querySelector("#info-panel");
const exhibitPanel = document.querySelector("#exhibit-panel");
const exhibitImage = document.querySelector("#exhibit-image");
const exhibitVideo = document.querySelector("#exhibit-video");
const exhibitMediaActions = document.querySelector("#exhibit-media-actions");
const exhibitSpeech = document.querySelector("#exhibit-speech");
const exhibitBehindScenes = document.querySelector("#exhibit-behind-scenes");
const exhibitClose = document.querySelector("#exhibit-close");
const exhibitReturn = document.querySelector("#exhibit-return");
const exhibitLobbyReturn = document.querySelector("#exhibit-lobby-return");
const photoViewer = document.querySelector("#photo-viewer");
const photoViewerImage = document.querySelector("#photo-viewer-image");
const photoViewerCaption = document.querySelector("#photo-viewer-caption");
const photoViewerClose = document.querySelector("#photo-viewer-close");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

HALLS.forEach(hall => {
  const item = document.createElement("li");
  item.dataset.hall = hall.id;
  item.style.setProperty("--hall-color", hall.glow);
  item.textContent = `${hall.index} · ${hall.name}`;
  item.addEventListener("click", () => {
    if (currentSpace !== "lobby") return;
    if (["xian", "saihanba", "tibet", "lianglu", "liangdan"].includes(hall.id)) enterExhibition(hall.id);
    else openInfo(hall);
  });
  hallList.append(item);
});

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x6b3b2d);
scene.fog = new THREE.FogExp2(0x704536, .0115);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, .08, 120);
const initialPosition = new THREE.Vector3(0, 1.72, 10.3);
camera.position.copy(initialPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.24;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.append(renderer.domElement);
renderer.domElement.tabIndex = -1;

const lobby = buildLobby(scene);
const xianExhibition = buildXianExhibition(scene);
const compactHallRegistry = {
  lianglu: {
    ...buildCompactHall(scene, LIANGLU_EXHIBITION, "road"),
    initialPosition: new THREE.Vector3(0, 1.72, -5.7),
    bounds: { x: 6.15, z: 6.45 },
    label: "两路精神展厅"
  },
  liangdan: {
    ...buildCompactHall(scene, LIANGDAN_EXHIBITION, "star"),
    initialPosition: new THREE.Vector3(0, 1.72, -5.7),
    bounds: { x: 6.15, z: 6.45 },
    label: "两弹一星精神展厅"
  },
  saihanba: {
    ...buildCompactHall(scene, SAIHANBA_EXHIBITION, "forest"),
    initialPosition: new THREE.Vector3(0, 1.72, -5.7),
    bounds: { x: 6.15, z: 6.45 },
    label: "塞罕坝精神展厅"
  },
  tibet: {
    ...buildCompactHall(scene, TIBET_EXHIBITION, "snow"),
    initialPosition: new THREE.Vector3(0, 1.72, -5.7),
    bounds: { x: 6.15, z: 6.45 },
    label: "老西藏精神展厅"
  }
};
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const keys = new Set();
const moveVelocity = new THREE.Vector3();
const clickTarget = new THREE.Vector3();
const focusTarget = new THREE.Vector3();
const focusLookAt = new THREE.Vector3();
const focusWaypoints = [];
const clock = new THREE.Clock();
let hasClickTarget = false;
let hasFocusTarget = false;
let yaw = 0;
let pitch = .055;
let isDragging = false;
let dragMoved = false;
let previousPointer = { x: 0, y: 0 };
let hoveredHall = null;
let currentSpace = "lobby";
let activeExhibit = null;
const xianInitialPosition = new THREE.Vector3(0, 1.72, -6.7);

function updateCameraRotation() {
  camera.rotation.order = "YXZ";
  camera.rotation.y = yaw;
  camera.rotation.x = pitch;
}
updateCameraRotation();

function cancelFocusMove() {
  hasFocusTarget = false;
  focusWaypoints.length = 0;
}

function lerpAngle(current, target, amount) {
  const turn = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + turn * amount;
}

function focusCompactTitleWall() {
  const hall = compactHallRegistry[currentSpace];
  if (!hall) return;
  hasClickTarget = false;
  moveVelocity.set(0, 0, 0);
  focusWaypoints.length = 0;

  // The side waypoint keeps the camera clear of the central sculpture before
  // it settles into a centered reading position in front of the title wall.
  const side = Math.abs(camera.position.x) > .75 ? Math.sign(camera.position.x) : (yaw < Math.PI ? 1 : -1);
  if (camera.position.z < 1.25 && Math.abs(camera.position.x) < 2.15) {
    focusWaypoints.push(new THREE.Vector3(side * 2.45, 1.72, .7));
  }
  focusTarget.set(0, 1.72, 4.72);
  focusWaypoints.push(focusTarget.clone());
  focusLookAt.set(0, 2.82, 6.65);
  hasFocusTarget = true;
  statusText.textContent = "正在靠近主题说明 · 按方向键或 WASD 可随时接管";
}

function clampPosition(position) {
  if (currentSpace === "xian") {
    position.x = THREE.MathUtils.clamp(position.x, -7.25, 7.25);
    position.z = THREE.MathUtils.clamp(position.z, -8.15, 8.15);
    position.y = 1.72;
    return;
  }
  if (compactHallRegistry[currentSpace]) {
    const bounds = compactHallRegistry[currentSpace].bounds;
    position.x = THREE.MathUtils.clamp(position.x, -bounds.x, bounds.x);
    position.z = THREE.MathUtils.clamp(position.z, -bounds.z, bounds.z);
    position.y = 1.72;
    return;
  }
  const radius = Math.hypot(position.x, position.z);
  const maxRadius = 12.45;
  if (radius > maxRadius) {
    position.x = position.x / radius * maxRadius;
    position.z = position.z / radius * maxRadius;
  }
  position.y = 1.72;
}

function setHallStatus(hall) {
  hoveredHall = hall;
  document.querySelectorAll("#hall-list li").forEach(item => item.classList.toggle("is-active", hall && item.dataset.hall === hall.id));
  statusText.textContent = hall ? `靠近 ${hall.name} · 单击入口查看` : "拖拽环视 · WASD / 方向键行走 · 点击地面移动";
}

function nearestHall() {
  if (currentSpace !== "lobby") return null;
  let nearest = null;
  let distance = Infinity;
  lobby.halls.forEach(portal => {
    const current = camera.position.distanceTo(portal.position);
    if (current < distance) {
      distance = current;
      nearest = portal.userData.hall;
    }
  });
  return distance < 7 ? nearest : null;
}

function updatePointer(event) {
  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = (event.clientX - rect.left) / rect.width * 2 - 1;
  pointer.y = -(event.clientY - rect.top) / rect.height * 2 + 1;
}

function findIntersection(event, targets) {
  updatePointer(event);
  raycaster.setFromCamera(pointer, camera);
  return raycaster.intersectObjects(targets, true)[0] || null;
}

function openInfo(data, kind = "hall") {
  document.querySelector("#info-kicker").textContent = kind === "team" ? data.kicker : `${data.index} 号展厅 · 中央大厅导览`;
  document.querySelector("#info-title").textContent = data.name;
  document.querySelector("#info-copy").textContent = data.summary;
  const tagRoot = document.querySelector("#info-tags");
  tagRoot.replaceChildren(...data.tags.map(tag => {
    const span = document.createElement("span");
    span.textContent = tag;
    return span;
  }));
  const enterable = kind === "hall" && ["xian", "saihanba", "tibet", "lianglu", "liangdan"].includes(data.id);
  const enterButton = document.querySelector("#panel-enter");
  enterButton.hidden = !enterable;
  if (enterable) {
    enterButton.textContent = `进入${data.name}展厅`;
    enterButton.dataset.hall = data.id;
  }
  infoPanel.hidden = false;
  hasClickTarget = false;
  document.querySelector("#panel-return").focus();
}

function closePanels() {
  infoPanel.hidden = true;
  helpPanel.hidden = true;
  closePhotoViewer();
  closeExhibitPanel();
}

function openPhotoViewer(photo) {
  photoViewerImage.src = photo.image;
  photoViewerImage.alt = photo.caption;
  photoViewerCaption.textContent = photo.caption;
  photoViewer.hidden = false;
  photoViewerClose.focus();
}

function closePhotoViewer() {
  if (!photoViewer.hidden) {
    photoViewer.hidden = true;
    photoViewerImage.removeAttribute("src");
    renderer.domElement.focus?.({ preventScroll: true });
  }
}

function closeExhibitPanel(event) {
  event?.preventDefault?.();
  event?.stopPropagation?.();
  exhibitPanel.hidden = true;
  exhibitVideo.pause();
  exhibitVideo.removeAttribute("src");
  exhibitVideo.load();
  activeExhibit = null;
  hasClickTarget = false;
  cancelFocusMove();
  backToLobby.hidden = currentSpace === "lobby";
  renderer.domElement.focus?.({ preventScroll: true });
}

function setExhibitVideo(source) {
  if (!source) return;
  exhibitImage.hidden = true;
  exhibitVideo.hidden = false;
  exhibitVideo.src = source;
  exhibitVideo.currentTime = 0;
  exhibitVideo.play().catch(() => {});
}

function openExhibit(exhibit) {
  activeExhibit = exhibit;
  document.querySelector("#exhibit-index").textContent = exhibit.label;
  document.querySelector("#exhibit-kicker").textContent = exhibit.kicker;
  document.querySelector("#exhibit-title").textContent = exhibit.title;
  document.querySelector("#exhibit-copy").textContent = exhibit.copy;
  exhibitVideo.pause();
  exhibitVideo.removeAttribute("src");
  exhibitVideo.load();
  exhibitVideo.hidden = true;
  exhibitImage.hidden = false;
  exhibitImage.src = exhibit.image;
  exhibitImage.alt = `${exhibit.label}相关实地照片`;
  exhibitMediaActions.hidden = !exhibit.videoSrc;
  exhibitSpeech.hidden = !exhibit.videoSrc;
  exhibitBehindScenes.hidden = !exhibit.behindScenesSrc;
  document.querySelector("#exhibit-points").replaceChildren(...exhibit.points.map(point => {
    const item = document.createElement("li");
    item.textContent = point;
    return item;
  }));
  exhibitPanel.hidden = false;
  infoPanel.hidden = true;
  hasClickTarget = false;
  backToLobby.hidden = true;
  exhibitClose.focus();
}

function bindExhibitPanelActions() {
  [exhibitClose, exhibitReturn, exhibitLobbyReturn].forEach(button => {
    button.addEventListener("pointerdown", event => event.stopPropagation());
  });
  exhibitClose.addEventListener("click", closeExhibitPanel);
  exhibitReturn.addEventListener("click", closeExhibitPanel);
  exhibitLobbyReturn.addEventListener("click", returnToLobby);
}

function enterExhibition(id) {
  currentSpace = id;
  lobby.root.visible = false;
  xianExhibition.root.visible = id === "xian";
  Object.entries(compactHallRegistry).forEach(([key, hall]) => {
    hall.root.visible = key === id;
  });
  const initial = id === "xian" ? xianInitialPosition : compactHallRegistry[id].initialPosition;
  camera.position.copy(initial);
  yaw = Math.PI;
  pitch = .015;
  moveVelocity.set(0, 0, 0);
  hasClickTarget = false;
  cancelFocusMove();
  hoveredHall = null;
  hallIndex.hidden = true;
  backToLobby.hidden = false;
  locationLabel.textContent = id === "xian" ? "西迁精神展厅" : compactHallRegistry[id].label;
  document.querySelector("#exhibit-return").textContent = id === "xian" ? "返回西迁展厅" : `返回${compactHallRegistry[id].label}`;
  statusText.textContent = "拖拽环视 · WASD / 方向键行走 · 点击展墙查看内容";
  renderer.toneMappingExposure = 1.42;
  updateCameraRotation();
  closePanels();
}

function returnToLobby() {
  currentSpace = "lobby";
  xianExhibition.root.visible = false;
  Object.values(compactHallRegistry).forEach(hall => { hall.root.visible = false; });
  lobby.root.visible = true;
  camera.position.copy(initialPosition);
  yaw = 0;
  pitch = .055;
  moveVelocity.set(0, 0, 0);
  hasClickTarget = false;
  cancelFocusMove();
  hallIndex.hidden = false;
  backToLobby.hidden = true;
  locationLabel.textContent = "中央大厅";
  statusText.textContent = "拖拽环视 · WASD / 方向键行走 · 点击地面移动";
  renderer.toneMappingExposure = 1.24;
  updateCameraRotation();
  closePanels();
}

renderer.domElement.addEventListener("pointerdown", event => {
  if (event.button !== 0) return;
  isDragging = true;
  dragMoved = false;
  previousPointer = { x: event.clientX, y: event.clientY };
  renderer.domElement.setPointerCapture(event.pointerId);
  renderer.domElement.classList.add("is-dragging");
});

renderer.domElement.addEventListener("pointermove", event => {
  if (!isDragging) return;
  const dx = event.clientX - previousPointer.x;
  const dy = event.clientY - previousPointer.y;
  if (Math.abs(dx) + Math.abs(dy) > 2) {
    dragMoved = true;
    cancelFocusMove();
  }
  yaw -= dx * .0031;
  pitch -= dy * .0024;
  pitch = THREE.MathUtils.clamp(pitch, -1.05, .78);
  previousPointer = { x: event.clientX, y: event.clientY };
  updateCameraRotation();
});

renderer.domElement.addEventListener("pointerup", event => {
  isDragging = false;
  renderer.domElement.classList.remove("is-dragging");
  renderer.domElement.releasePointerCapture(event.pointerId);
  if (dragMoved) return;
  const activeInteractives = currentSpace === "lobby"
    ? lobby.interactives
    : currentSpace === "xian" ? xianExhibition.interactives : compactHallRegistry[currentSpace]?.interactives ?? [];
  const interactiveHit = findIntersection(event, activeInteractives);
  if (interactiveHit) {
    let object = interactiveHit.object;
    while (object && !object.userData.interactive) object = object.parent;
    if (object?.userData.interactive === "hall") openInfo(object.userData.hall);
    if (object?.userData.interactive === "team") openInfo(TEAM_ARCHIVE, "team");
    if (object?.userData.interactive === "team-photo") openPhotoViewer(object.userData.photo);
    if (object?.userData.interactive === "xian-exhibit") openExhibit(object.userData.exhibit);
    if (object?.userData.interactive === "centerpiece-focus") focusCompactTitleWall();
    return;
  }
  const activeFloor = currentSpace === "lobby"
    ? lobby.floor
    : currentSpace === "xian" ? xianExhibition.floor : compactHallRegistry[currentSpace]?.floor;
  const floorHit = findIntersection(event, [activeFloor]);
  if (floorHit) {
    clickTarget.copy(floorHit.point);
    clickTarget.y = 1.72;
    clampPosition(clickTarget);
    hasClickTarget = true;
    cancelFocusMove();
  }
});

window.addEventListener("keydown", event => {
  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    keys.add(event.code);
    hasClickTarget = false;
    cancelFocusMove();
    event.preventDefault();
  }
  if (event.code === "Escape") closePanels();
});
window.addEventListener("keyup", event => keys.delete(event.code));

document.querySelector("#reset-view").addEventListener("click", () => {
  if (currentSpace !== "lobby") {
    const initial = currentSpace === "xian" ? xianInitialPosition : compactHallRegistry[currentSpace].initialPosition;
    camera.position.copy(initial);
    yaw = Math.PI;
    pitch = .015;
    moveVelocity.set(0, 0, 0);
    hasClickTarget = false;
    cancelFocusMove();
    updateCameraRotation();
    closePanels();
    return;
  }
  camera.position.copy(initialPosition);
  yaw = 0;
  pitch = .055;
  moveVelocity.set(0, 0, 0);
  hasClickTarget = false;
  cancelFocusMove();
  updateCameraRotation();
  closePanels();
});
document.querySelector("#help-toggle").addEventListener("click", () => {
  helpPanel.hidden = !helpPanel.hidden;
  infoPanel.hidden = true;
});
document.querySelectorAll(".panel-close:not(#exhibit-close)").forEach(button => button.addEventListener("click", event => {
  event.preventDefault();
  event.stopPropagation();
  closePanels();
}));
document.querySelector("#panel-return").addEventListener("click", closePanels);
document.querySelector("#panel-enter").addEventListener("click", event => {
  const hallId = event.currentTarget.dataset.hall;
  if (hallId) enterExhibition(hallId);
});
backToLobby.addEventListener("click", returnToLobby);
bindExhibitPanelActions();
exhibitSpeech.addEventListener("click", () => {
  setExhibitVideo(activeExhibit?.videoSrc);
});
exhibitBehindScenes.addEventListener("click", () => {
  setExhibitVideo(activeExhibit?.behindScenesSrc);
});

function movementInput() {
  const input = new THREE.Vector2();
  if (keys.has("KeyW") || keys.has("ArrowUp")) input.y += 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) input.y -= 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) input.x -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) input.x += 1;
  return input.lengthSq() > 0 ? input.normalize() : input;
}

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), .05);
  const elapsed = clock.elapsedTime;
  const input = movementInput();
  const forward = new THREE.Vector3(-Math.sin(yaw), 0, -Math.cos(yaw));
  const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
  const intended = forward.multiplyScalar(input.y).add(right.multiplyScalar(input.x)).multiplyScalar(4.1);
  moveVelocity.lerp(intended, 1 - Math.exp(-delta * 9));
  camera.position.addScaledVector(moveVelocity, delta);

  if (hasClickTarget) {
    const distance = camera.position.distanceTo(clickTarget);
    if (distance < .09) hasClickTarget = false;
    else camera.position.lerp(clickTarget, 1 - Math.exp(-delta * 2.25));
  }

  if (hasFocusTarget && focusWaypoints.length) {
    const waypoint = focusWaypoints[0];
    const distance = camera.position.distanceTo(waypoint);
    if (distance < .1) {
      camera.position.copy(waypoint);
      focusWaypoints.shift();
      if (!focusWaypoints.length) {
        hasFocusTarget = false;
        statusText.textContent = "主题说明已居中 · 拖拽环视或继续选择展项";
      }
    } else {
      camera.position.lerp(waypoint, 1 - Math.exp(-delta * 2.35));
    }

    const lookDirection = focusLookAt.clone().sub(camera.position);
    const horizontalDistance = Math.hypot(lookDirection.x, lookDirection.z);
    const targetYaw = Math.atan2(-lookDirection.x, -lookDirection.z);
    const targetPitch = Math.atan2(lookDirection.y, horizontalDistance);
    const rotationBlend = 1 - Math.exp(-delta * 3.1);
    yaw = lerpAngle(yaw, targetYaw, rotationBlend);
    pitch = THREE.MathUtils.lerp(pitch, targetPitch, rotationBlend);
    updateCameraRotation();
  }
  clampPosition(camera.position);

  const closeHall = nearestHall();
  if (currentSpace === "lobby" && closeHall?.id !== hoveredHall?.id) setHallStatus(closeHall);
  updateLobby(lobby, elapsed, closeHall, reducedMotion);
  updateXianExhibition(xianExhibition, elapsed, reducedMotion);
  Object.values(compactHallRegistry).forEach(hall => updateCompactHall(hall, elapsed, reducedMotion));
  renderer.render(scene, camera);
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
});

requestAnimationFrame(() => {
  animate();
  loading.hidden = true;
});

// Keep the presentation screen from masking the room if the first WebGL frame is slow.
window.setTimeout(() => { loading.hidden = true; }, 900);

window.__LOBBY_READY__ = true;
document.body.dataset.lobbyReady = "1";
window.addEventListener("codex:enter", event => { if (event.detail?.id) enterExhibition(event.detail.id); });
window.addEventListener("codex:open-section", event => {
  const detail = event.detail || {};
  const source = detail.spaceId === "xian" ? xianExhibition : compactHallRegistry[detail.spaceId];
  const node = source?.exhibits?.[detail.sectionIndex];
  if (node?.userData?.exhibit) openExhibit(node.userData.exhibit);
});
window.addEventListener("codex:back", () => returnToLobby());
window.__LOBBY_DEBUG__ = Object.freeze({
  cameraPosition: () => ({ x: camera.position.x, y: camera.position.y, z: camera.position.z }),
  movementKeys: ["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"],
  // 验收与排障接口：不参与访客 UI，仅用于自动化走查空间与展项。
  enter: (id) => enterExhibition(id),
  back: () => returnToLobby(),
  openSection: (spaceId, sectionIndex) => {
    const source = spaceId === "xian" ? xianExhibition : compactHallRegistry[spaceId];
    const node = source?.exhibits?.[sectionIndex];
    if (node?.userData?.exhibit) openExhibit(node.userData.exhibit);
  }
});

// --- 背景音乐：庄重安静的弦乐，右上角按钮可一键开关 ---
const ambientAudio = document.querySelector("#ambient-audio");
const musicToggle = document.querySelector("#music-toggle");
let audioPrimed = false;
function primeAmbientAudio() {
  if (audioPrimed) return;
  audioPrimed = true;
  ambientAudio.volume = .5;
  ambientAudio.play().catch(() => {});
  window.removeEventListener("pointerdown", primeAmbientAudio);
  window.removeEventListener("keydown", primeAmbientAudio);
}
window.addEventListener("pointerdown", primeAmbientAudio);
window.addEventListener("keydown", primeAmbientAudio);
ambientAudio.play?.().catch(() => {});
musicToggle.addEventListener("click", event => {
  event.stopPropagation();
  const muted = !ambientAudio.muted;
  ambientAudio.muted = muted;
  musicToggle.classList.toggle("is-muted", muted);
  musicToggle.setAttribute("aria-pressed", String(!muted));
  const label = muted ? "开启背景音乐" : "关闭背景音乐";
  musicToggle.setAttribute("aria-label", label);
  musicToggle.title = label;
});
