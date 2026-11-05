// Renders the Cove launcher icon and the TV banner from cove-mark.svg into app/src/main/res.
//   node tools/logo/render.js        (needs Playwright with Chromium)
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..', '..', 'app', 'src', 'main', 'res');
const mark = fs.readFileSync(path.join(__dirname, 'cove-mark.svg'), 'utf8');
const markUri = 'data:image/svg+xml;base64,' + Buffer.from(mark).toString('base64');
const banner = (w, h) => `<html><body style="margin:0"><div style="width:${w}px;height:${h}px;position:relative;overflow:hidden;
  background:linear-gradient(120deg,#151a52 0%,#23338a 48%,#0e8fa8 100%);font-family:'Noto Sans KR','Noto Sans CJK KR',Roboto,sans-serif">
  <div style="position:absolute;inset:0;background:radial-gradient(circle at 18% 10%,rgba(255,255,255,.22),rgba(255,255,255,0) 55%)"></div>
  <div style="position:absolute;right:-${h * .35}px;top:-${h * .4}px;width:${h * 1.1}px;height:${h * 1.1}px;border-radius:50%;background:rgba(255,190,120,.18)"></div>
  <div style="position:absolute;left:0;right:0;bottom:0;height:${h * .3}px;background:linear-gradient(0deg,rgba(8,20,70,.55),rgba(8,20,70,0))"></div>
  <img src="${markUri}" style="position:absolute;left:${h * .14}px;top:${h * .17}px;width:${h * .66}px;height:${h * .66}px;filter:drop-shadow(0 ${h * .03}px ${h * .05}px rgba(0,0,0,.35))">
  <div style="position:absolute;left:${h * .9}px;top:${h * .27}px;color:#fff;white-space:nowrap">
    <div style="font-size:${h * .29}px;font-weight:800;letter-spacing:-.02em;line-height:1">Cove</div>
    <div style="font-size:${h * .085}px;font-weight:500;opacity:.85;margin-top:${h * .05}px">나만의 TV 홈 화면</div>
  </div></div></body></html>`;
(async () => {
  const b = await chromium.launch();
  for (const [dir, px] of [['mipmap-mdpi', 48], ['mipmap-hdpi', 72], ['mipmap-xhdpi', 96], ['mipmap-xxhdpi', 144], ['mipmap-xxxhdpi', 192]]) {
    const p = await b.newPage({ viewport: { width: px, height: px } });
    await p.setContent(`<html><body style="margin:0;background:transparent"><img src="${markUri}" style="width:${px}px;height:${px}px;display:block"></body></html>`);
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    await p.screenshot({ path: path.join(root, dir, 'ic_launcher.png'), omitBackground: true });
    await p.close();
  }
  for (const [dir, w, h] of [['drawable-xhdpi', 320, 180], ['drawable-xxhdpi', 480, 270]]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    await p.setContent(banner(w, h)); await p.waitForTimeout(200);
    fs.mkdirSync(path.join(root, dir), { recursive: true });
    await p.screenshot({ path: path.join(root, dir, 'banner.png') });
    await p.close();
  }
  // a large copy for the README and the phone remote
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.setContent(banner(1280, 720)); await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(__dirname, 'cove-banner-large.png') });
  await b.close();
  console.log('icons and banners written');
})();
