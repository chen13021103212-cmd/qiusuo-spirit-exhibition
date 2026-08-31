#!/bin/sh
set -eu
ROOT="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
test -f "$ROOT/index.html"
test -f "$ROOT/styles.css"
test -f "$ROOT/src/data.js"
test -f "$ROOT/src/scene.js"
test -f "$ROOT/src/main.js"
grep -q "求索红脉薪火实践队" "$ROOT/index.html"
grep -q "three.module.js" "$ROOT/index.html"
for label in "西迁精神" "塞罕坝精神" "老西藏精神" "两弹一星精神" "两路精神"; do
  grep -q "$label" "$ROOT/src/data.js"
done
grep -q "requestAnimationFrame" "$ROOT/src/main.js"
grep -q "Raycaster" "$ROOT/src/main.js"
for key in "ArrowUp" "ArrowDown" "ArrowLeft" "ArrowRight"; do
  grep -q "$key" "$ROOT/src/main.js"
done
grep -q "WASD / 方向键" "$ROOT/index.html"
grep -q "createDomeCoffer" "$ROOT/src/scene.js"
grep -q "createWallSconce" "$ROOT/src/scene.js"
grep -q "createColumnCapital" "$ROOT/src/scene.js"
grep -q "XIAN_EXHIBITION" "$ROOT/src/data.js"
grep -q "精神内涵" "$ROOT/src/data.js"
grep -q "历史故事" "$ROOT/src/data.js"
grep -q "实践纪实" "$ROOT/src/data.js"
grep -q "宣讲视频" "$ROOT/src/data.js"
grep -q "buildXianExhibition" "$ROOT/src/scene.js"
grep -q "enterExhibition" "$ROOT/src/main.js"
grep -q "createRealisticSurface" "$ROOT/src/scene.js"
grep -q "createTrackLight" "$ROOT/src/scene.js"
grep -q "createPhotoWall" "$ROOT/src/scene.js"
grep -q "fitTextureCover" "$ROOT/src/scene.js"
grep -q "lobbyLighting" "$ROOT/src/scene.js"
grep -q "createPhotoCaption" "$ROOT/src/scene.js"
grep -q "createXianCeiling" "$ROOT/src/scene.js"
grep -q "createXianCoveLighting" "$ROOT/src/scene.js"
grep -q "createXianDisplayPlinth" "$ROOT/src/scene.js"
grep -q "createXianWallBay" "$ROOT/src/scene.js"
grep -q "createMuseumBench" "$ROOT/src/scene.js"
grep -q "organize.jpg" "$ROOT/src/data.js"
grep -q "galleryCaptions" "$ROOT/src/data.js"
grep -q "西迁现场影像" "$ROOT/src/data.js"
grep -q "西迁精神.mp4" "$ROOT/src/data.js"
grep -q "花絮素材" "$ROOT/src/data.js"
grep -q "videoSrc" "$ROOT/src/main.js"
test -f "$ROOT/assets/xian/xian-speech.mp4"
test -f "$ROOT/assets/xian/xian-behind-scenes.mp4"
grep -q "胸怀大局、无私奉献、弘扬传统、艰苦创业" "$ROOT/src/data.js"
grep -q "2026年7月23日至7月27日" "$ROOT/src/data.js"
grep -q "截至1956年9月" "$ROOT/src/data.js"
grep -q "钟兆琳" "$ROOT/src/data.js"
grep -q "陈学俊" "$ROOT/src/data.js"
grep -q "assetSources" "$ROOT/src/data.js"
grep -q "111-70.jpg" "$ROOT/src/data.js"
grep -q "111-70.jpg" "$ROOT/src/data.js"
test -f "$ROOT/assets/xian/cover-1.png"
test -f "$ROOT/assets/xian/documentary-1.jpg"
test -f "$ROOT/assets/xian/documentary-9.jpg"
# --- 本轮修改契约（西迁四项 + 两个新馆）---
grep -q 'aspect: "portrait"' "$ROOT/src/data.js"
grep -q "createXianTimelinePlinth" "$ROOT/src/scene.js"
grep -q "LIANGLU_EXHIBITION" "$ROOT/src/data.js"
grep -q "LIANGDAN_EXHIBITION" "$ROOT/src/data.js"
grep -q "buildCompactHall" "$ROOT/src/scene.js"
grep -q "compactHallRegistry" "$ROOT/src/main.js"
grep -q "function faceReadablePlane" "$ROOT/src/scene.js"
grep -q 'mesh.rotation.y = Math.PI' "$ROOT/src/scene.js"
if grep -q 'mesh.traverse' "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: faceReadablePlane must not mirror UVs" >&2
  exit 1
fi
if grep -q "benchLeft" "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: unexpected benchLeft" >&2
  exit 1
fi
# --- 塞罕坝 / 老西藏馆 ---
grep -q "SAIHANBA_EXHIBITION" "$ROOT/src/data.js"
grep -q "TIBET_EXHIBITION" "$ROOT/src/data.js"
grep -q "塞罕坝精神.mp4" "$ROOT/src/data.js"
grep -q "老西藏精神.mp4" "$ROOT/src/data.js"
grep -q "saihanba-speech.mp4" "$ROOT/src/data.js"
grep -q "tibet-speech.mp4" "$ROOT/src/data.js"
grep -q '"saihanba", "tibet"' "$ROOT/src/main.js"
test -f "$ROOT/assets/saihanba/saihanba-speech.mp4"
test -f "$ROOT/assets/saihanba/saihanba-behind.mp4"
test -f "$ROOT/assets/tibet/tibet-speech.mp4"
test -f "$ROOT/assets/tibet/tibet-behind.mp4"
grep -q "kind === \"forest\"" "$ROOT/src/scene.js"
grep -q "kind === \"snow\"" "$ROOT/src/scene.js"
grep -q "王尚海" "$ROOT/src/data.js"
grep -q "孔繁森" "$ROOT/src/data.js"
grep -q "六女上坝" "$ROOT/src/data.js"
grep -q "五个特别" "$ROOT/src/data.js" || grep -q "特别能吃苦" "$ROOT/src/data.js"
# --- 展项封面图更新契约 ---
grep -q '"./assets/saihanba/meaning.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/saihanba/history.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/saihanba/people.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/tibet/meaning.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/tibet/history.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/tibet/people.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/lianglu/meaning.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/lianglu/history.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/lianglu/people.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/lianglu/legacy.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/liangdan/people.jpg"' "$ROOT/src/data.js"
grep -q '"./assets/liangdan/legacy.jpg"' "$ROOT/src/data.js"
grep -q "fitTextureContain" "$ROOT/src/scene.js"
grep -q "createExhibitPhotoFit" "$ROOT/src/scene.js"
# --- 展墙文字与内容封面可读性契约 ---
grep -q 'photoLift: .16' "$ROOT/src/scene.js"
grep -q 'const photoLift = kind === "snow" ? 0 : .16' "$ROOT/src/scene.js"
grep -q 'inset.position.set(0, .72, -.38)' "$ROOT/src/scene.js"
grep -Eq '\.exhibit-panel__media img.*object-fit: contain' "$ROOT/styles.css"
grep -Eq '\.panel-close.*z-index: 4' "$ROOT/styles.css"
test -f "$ROOT/assets/saihanba/meaning.jpg"
test -f "$ROOT/assets/saihanba/history.jpg"
test -f "$ROOT/assets/saihanba/people.jpg"
test -f "$ROOT/assets/tibet/meaning.jpg"
test -f "$ROOT/assets/tibet/history.jpg"
test -f "$ROOT/assets/tibet/people.jpg"
test -f "$ROOT/assets/lianglu/meaning.jpg"
test -f "$ROOT/assets/lianglu/history.jpg"
test -f "$ROOT/assets/lianglu/people.jpg"
test -f "$ROOT/assets/lianglu/legacy.jpg"
test -f "$ROOT/assets/liangdan/people.jpg"
test -f "$ROOT/assets/liangdan/legacy.jpg"
# --- 本轮排版、中央装置命中与西迁门头精修契约 ---
grep -Eq 'Kaiti SC.*STKaiti.*KaiTi.*BiauKai.*serif' "$ROOT/styles.css"
grep -q 'Kaiti SC, STKaiti, KaiTi, BiauKai, serif' "$ROOT/src/scene.js"
grep -q 'function createXianPortalDetail' "$ROOT/src/scene.js"
grep -q 'hall.id === "xian"' "$ROOT/src/scene.js"
grep -q 'focusTarget' "$ROOT/src/main.js"
grep -q 'centerpiece' "$ROOT/src/main.js"
grep -q '20260831-clarity' "$ROOT/index.html"
# --- 本轮门头、团队档案、标志物与弹窗回归契约 ---
if grep -q 'assets/team/team-photo.jpg' "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: meeting screenshot must be removed from team wall" >&2
  exit 1
fi
grep -q 'assets/team/team-emblem.png' "$ROOT/src/scene.js"
grep -q 'createTeamArchive(loader' "$ROOT/src/scene.js"
grep -q 'function createReadableTexture' "$ROOT/src/scene.js"
grep -q 'faceReadablePlane(label)' "$ROOT/src/scene.js"
grep -q 'faceReadablePlane(photo)' "$ROOT/src/scene.js"
grep -q 'faceReadablePlane(logo)' "$ROOT/src/scene.js"
grep -q 'function closeExhibitPanel' "$ROOT/src/main.js"
grep -q 'document.querySelector("#exhibit-close")' "$ROOT/src/main.js"
grep -q 'id="exhibit-lobby-return"' "$ROOT/index.html"
grep -q 'exhibitLobbyReturn.addEventListener("click", returnToLobby)' "$ROOT/src/main.js"
grep -q 'exhibitTextTexture(exhibit.label, exhibit.kicker, "#b98542", 1536, 300)' "$ROOT/src/scene.js"
grep -q 'const plaqueHeight = width \* 148 / 720' "$ROOT/src/scene.js"
grep -q 'function createRoadRoute' "$ROOT/src/scene.js"
grep -q 'function createTibetMemorial' "$ROOT/src/scene.js"
if grep -q 'marker.scale.set' "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: centerpiece plaque must not be compressed" >&2
  exit 1
fi
grep -q '川藏线' "$ROOT/src/scene.js"
grep -q '青藏线' "$ROOT/src/scene.js"
grep -q '缺氧不缺精神' "$ROOT/src/scene.js"
test -f "$ROOT/assets/team/team-photo.jpg"
test -f "$ROOT/assets/team/team-logo.png"
# --- 镜像、门洞纵深与弹窗可用性回归契约 ---
if sed -n '/function faceReadablePlane/,/^}/p' "$ROOT/src/scene.js" | grep -Eq 'getAttribute\("uv"\)|uv\.setX'; then
  printf '%s\n' "static smoke contract: readable planes must keep original UVs" >&2
  exit 1
fi
grep -q 'const portalRevealDepth = 7.12' "$ROOT/src/scene.js"
grep -q 'const portalArtworkDepth = 7.28' "$ROOT/src/scene.js"
grep -q '20260831-clarity' "$ROOT/index.html"
grep -Eq '\.exhibit-panel > \.panel-close.*width: 46px.*height: 46px' "$ROOT/styles.css"
grep -Eq '\.exhibit-panel__actions \.text-button.*min-height: 46px' "$ROOT/styles.css"
grep -q 'function bindExhibitPanelActions' "$ROOT/src/main.js"
grep -q 'createRoadGateway' "$ROOT/src/scene.js"
grep -q 'createTibetSteleCrown' "$ROOT/src/scene.js"
# --- 本轮收尾契约（提示语、中央装置缩小、门头统一、带旗合影、背景音乐）---
if grep -q "点击展墙，进入内容档案" "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: exhibit hint must be removed" >&2
  exit 1
fi
grep -q 'centerpiece.scale.setScalar(.68)' "$ROOT/src/scene.js"
grep -q 'group.add(createPortalThemePanel(hall, materials));' "$ROOT/src/scene.js"
grep -q 'flag-photo-1.png' "$ROOT/src/scene.js"
grep -q 'hall-ambience.m4a' "$ROOT/index.html"
grep -q 'id="music-toggle"' "$ROOT/index.html"
test -f "$ROOT/assets/audio/hall-ambience.m4a"
test -f "$ROOT/assets/team/flag-photo-1.png"
test -f "$ROOT/assets/team/flag-photo-2.png"
test -f "$ROOT/assets/team/flag-photo-3.png"
test -f "$ROOT/assets/team/flag-photo-4.png"
# --- 本轮图片与档案墙更新契约 ---
grep -q 'assets/xian/history.png' "$ROOT/src/data.js"
grep -q 'assets/xian/yuhuawei.jpg' "$ROOT/src/data.js"
grep -q 'assets/xian/wangheling.jpg' "$ROOT/src/data.js"
grep -q '于华玮完成现场主题宣讲' "$ROOT/src/data.js"
grep -q '王何灵完成现场主题宣讲' "$ROOT/src/data.js"
grep -q '队员整理宣讲线索' "$ROOT/src/data.js"
grep -q 'galleryTitle: "塞罕坝影像档案"' "$ROOT/src/data.js"
grep -q 'galleryTitle: "老西藏影像档案"' "$ROOT/src/data.js"
grep -q 'assets/saihanba/archive-1.png' "$ROOT/src/data.js"
grep -q 'assets/tibet/archive-4.jpg' "$ROOT/src/data.js"
if grep -q '"宣讲稿"' "$ROOT/src/data.js"; then
  printf '%s\n' "static smoke contract: hall tag 宣讲稿 must be removed" >&2
  exit 1
fi
if grep -q '"实地素材"' "$ROOT/src/data.js"; then
  printf '%s\n' "static smoke contract: hall tag 实地素材 must be removed" >&2
  exit 1
fi
grep -q 'interactive = "team-photo"' "$ROOT/src/scene.js"
grep -q 'function openPhotoViewer' "$ROOT/src/main.js"
grep -q 'id="photo-viewer"' "$ROOT/index.html"
grep -q 'class="brand-mark"' "$ROOT/index.html"
grep -q 'galleryFootnote' "$ROOT/src/data.js"
# --- 最后一轮收尾契约（图标还原、照片放大、实践纪实、档案修正）---
grep -q 'assets/xian/fieldwork.png' "$ROOT/src/data.js"
grep -q 'assets/saihanba/archive-4.jpg' "$ROOT/src/data.js"
grep -q '求索红脉薪火实践队在塞罕坝纪念馆合影' "$ROOT/src/data.js"
grep -q '队员在馆内壁画前整理宣讲线索' "$ROOT/src/data.js"
test -f "$ROOT/assets/xian/fieldwork.png"
test -f "$ROOT/assets/saihanba/archive-4.jpg"
test -f "$ROOT/assets/tibet/archive-4.jpg"
if grep -q 'flag-photo-2.png' "$ROOT/src/scene.js"; then
  printf '%s\n' "static smoke contract: 带旗合影二 must be removed" >&2
  exit 1
fi
# --- 手机端与统计契约 ---
grep -q 'pointer: coarse' "$ROOT/src/main.js"
grep -q 'isTouchDevice' "$ROOT/src/main.js"
grep -q 'id="mobile-joystick"' "$ROOT/index.html"
grep -q 'mobile-joystick' "$ROOT/styles.css"
grep -q 'max-width: 919px' "$ROOT/styles.css"
grep -q 'touch-action: none' "$ROOT/styles.css"
grep -q 'orientationchange' "$ROOT/src/main.js"
grep -q 'GOAT_COUNTER_CODE' "$ROOT/index.html"
grep -q 'gc.zgo.at/count.js' "$ROOT/index.html"
grep -q 'id="view-count-toggle"' "$ROOT/index.html"
grep -q 'id="view-count-popup"' "$ROOT/index.html"
grep -q 'GOAT_COUNTER_CODE = "fish"' "$ROOT/index.html"
grep -q 'counter/TOTAL.json' "$ROOT/src/main.js"
# --- 更名、门头小字与内涵排版契约 ---
grep -q '红脉薪火 · 红色精神数字展馆' "$ROOT/index.html"
grep -q 'function labelTexture(hall)' "$ROOT/src/scene.js"
grep -q '600 150px Songti SC' "$ROOT/src/scene.js"
grep -q '1792, 533' "$ROOT/src/scene.js"
grep -q 'function wrapSubtitleLines' "$ROOT/src/scene.js"
grep -q 'wrapSubtitle: true' "$ROOT/src/scene.js"
grep -q 'anisotropy = 16' "$ROOT/src/scene.js"
printf '%s\n' "static smoke contract: pass"
