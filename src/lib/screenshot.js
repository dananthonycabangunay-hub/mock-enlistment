// Draws the schedule onto a canvas and saves it as a PNG.
// Drawing it directly (instead of photographing the page) keeps the image the same on every device.

import {
  DAYS,
  SLOT_COUNT,
  blockLines,
  gridRows,
  slotLabel,
} from "./schedule";

const INK = "#1d2b6f";
const SOFT = "#4a5688";
const LINE = "#c3cdea";
const FONT = "Poppins, system-ui, sans-serif";

// Layout in CSS pixels. The canvas is drawn at 2x so the text stays sharp.
const PAD = 40;
const TIME_W = 90;
const COL_W = 190;
const HEAD_H = 44;
const ROW_H = 38;
const TOP = 124;
const WIDTH = PAD * 2 + TIME_W + COL_W * DAYS.length;
const HEIGHT = TOP + HEAD_H + ROW_H * SLOT_COUNT + PAD;
const SCALE = 2;

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// Break text into lines that fit maxWidth.
function wrap(ctx, text, maxWidth) {
  const lines = [];
  let line = "";
  for (const word of text.split(" ")) {
    const test = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(test).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  return lines;
}

async function loadFonts() {
  try {
    await Promise.all(
      ["400", "500", "600", "700"].map((w) => document.fonts.load(`${w} 15px Poppins`))
    );
  } catch {
    // Falls back to the system font.
  }
}

async function drawSchedule({ program, entries, units }) {
  await loadFonts();

  const canvas = document.createElement("canvas");
  canvas.width = WIDTH * SCALE;
  canvas.height = HEIGHT * SCALE;
  const ctx = canvas.getContext("2d");
  ctx.scale(SCALE, SCALE);

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Title
  ctx.textBaseline = "alphabetic";
  ctx.textAlign = "left";
  ctx.fillStyle = INK;
  ctx.font = `700 34px ${FONT}`;
  ctx.fillText(`${program.name} schedule`, PAD, 62);
  ctx.fillStyle = SOFT;
  ctx.font = `500 18px ${FONT}`;
  ctx.fillText(`${program.term}, ${units} ${units === 1 ? "unit" : "units"}`, PAD, 94);

  const gridX = PAD + TIME_W;
  const gridY = TOP + HEAD_H;
  const gridW = COL_W * DAYS.length;
  const gridH = ROW_H * SLOT_COUNT;

  // Day headers
  ctx.fillStyle = INK;
  ctx.font = `600 16px ${FONT}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  DAYS.forEach((day, i) => {
    ctx.fillText(day, gridX + COL_W * i + COL_W / 2, TOP + HEAD_H / 2);
  });

  // Time labels
  ctx.textAlign = "right";
  ctx.textBaseline = "top";
  ctx.fillStyle = SOFT;
  ctx.font = `400 13px ${FONT}`;
  for (let i = 0; i < SLOT_COUNT; i++) {
    ctx.fillText(slotLabel(i), gridX - 12, gridY + ROW_H * i + 5);
  }

  // Grid lines
  ctx.strokeStyle = LINE;
  ctx.lineWidth = 1;
  for (let r = 0; r <= SLOT_COUNT; r++) {
    const y = Math.round(gridY + ROW_H * r) + 0.5;
    ctx.beginPath();
    ctx.moveTo(gridX, y);
    ctx.lineTo(gridX + gridW, y);
    ctx.stroke();
  }
  for (let c = 0; c <= DAYS.length; c++) {
    const x = Math.round(gridX + COL_W * c) + 0.5;
    ctx.beginPath();
    ctx.moveTo(x, gridY);
    ctx.lineTo(x, gridY + gridH);
    ctx.stroke();
  }

  // Class blocks
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  for (const { subject, section, color } of entries) {
    const { first, span } = gridRows(section);
    const lines = blockLines(subject, section);

    for (const day of section.days) {
      const x = gridX + COL_W * DAYS.indexOf(day) + 3;
      const y = gridY + ROW_H * first + 3;
      const w = COL_W - 6;
      const h = ROW_H * span - 6;

      ctx.save();
      roundRect(ctx, x, y, w, h, 8);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "rgba(29, 43, 111, 0.25)";
      ctx.stroke();
      ctx.clip();

      ctx.fillStyle = INK;
      let textY = y + 22;
      lines.forEach((text, i) => {
        ctx.font = `${i === 0 ? 700 : 400} 14px ${FONT}`;
        for (const part of wrap(ctx, text, w - 20)) {
          ctx.fillText(part, x + 10, textY);
          textY += 18;
        }
      });
      ctx.restore();
    }
  }

  return canvas;
}

// Phones: open the share sheet (Save Image). Everywhere else: download a PNG.
export async function saveScheduleImage(options) {
  const canvas = await drawSchedule(options);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Could not create the image");

  const filename = `${options.program.id}-schedule.png`;
  const file = new File([blob], filename, { type: "image/png" });

  const isTouch = window.matchMedia?.("(pointer: coarse)").matches;
  if (isTouch && navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: "My schedule" });
      return;
    } catch (err) {
      if (err.name === "AbortError") return; // They closed the share sheet.
    }
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}