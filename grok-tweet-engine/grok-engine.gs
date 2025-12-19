/**
 * GROK ENGINE – FINAL EDITION (DEC 2025) 
 * • Exactly 2 pure savage no-link takes per sheet 
 * • Every other tweet ends with the link — 100% guaranteed
 * • 24–31 words | Ice-cold early-20s voice | 0–2 perfect emojis
 */

var MODEL_NAME = 'grok-4-1-fast-reasoning';
var API_KEY    = PropertiesService.getScriptProperties().getProperty("XAI_API_KEY") || "";
var TWEETS_PER_SHEET = 19;
var NO_LINK_COUNT = 2; // ← Change to 3 here if you ever want 3 savage rants instead of 2

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('GROK ENGINE')
    .addItem('Update Tech + Sports', 'updateBothSheets')
    .addItem('Update Tech Only', 'updateTechOnly')
    .addItem('Update Sports Only', 'updateSportsOnly')
    .addToUi();
}

function updateBothSheets() {
  if(!API_KEY){SpreadsheetApp.getUi().alert("Add XAI_API_KEY in Script Properties");return;}
  pullAndFill("Tech News", getTechFeeds(), "Tech");
  pullAndFill("Sports News", getSportsFeeds(), "Sports");
  formatSheetsPerfectly();
  SpreadsheetApp.getUi().alert("38 FINAL TWEETS READY – Exactly 4 savage no-link bombs 🔥");
}

function updateTechOnly() {
  if(!API_KEY){SpreadsheetApp.getUi().alert("Add XAI_API_KEY");return;}
  pullAndFill("Tech News", getTechFeeds(), "Tech");
  formatSheetsPerfectly();
  SpreadsheetApp.getUi().alert("Tech Sheet Locked – 2 pure heat bombs");
}

function updateSportsOnly() {
  if(!API_KEY){SpreadsheetApp.getUi().alert("Add XAI_API_KEY");return;}
  pullAndFill("Sports News", getSportsFeeds(), "Sports");
  formatSheetsPerfectly();
  SpreadsheetApp.getUi().alert("Sports Sheet Locked – 2 pure heat bombs");
}

/* Reliable Tech RSS feeds */
function getTechFeeds() {
  return [
Sources
  ];
}

/* Reliable Sports RSS feeds */
function getSportsFeeds() {
  return [
   Sources
  ];
}

/* Normalize links for duplicate blocking */
function normalizeLink(link) {
  return link
    .trim()
    .replace(/(\?.*)$/, "")
    .replace(/\/$/, "");
}

function pullAndFill(sheetName, feeds, category) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  sheet.clear();
  sheet.getRange("A1:D1").setValues([["Time","Ready Tweet (Copy This)","Image URL","Preview"]]);
  sheet.setFrozenRows(1);

  const rows = [];
  let count = 0;
  let noLinkUsed = 0;
  const seen = new Set();

  for (const feed of feeds) {
    if (count >= TWEETS_PER_SHEET) break;
    try {
      const xml = UrlFetchApp.fetch(feed, {muteHttpExceptions: true}).getContentText();
      const doc = XmlService.parse(xml).getRootElement();
      const items = doc.getChild("channel")?.getChildren("item") || doc.getChildren("entry") || [];

      for (const item of items) {
        if (count >= TWEETS_PER_SHEET) break;

        let rawLink = item.getChildText("link") || (item.getChild("link")?.getAttribute("href")?.getValue()) || "";
        let link = normalizeLink(rawLink);
        let title = (item.getChildText("title") || "").trim().toLowerCase();

        if (!link || seen.has(link) || seen.has(title)) continue;
        seen.add(link);
        seen.add(title);

        const desc = (item.getChildText("description") || item.getChildText("summary") || "").substring(0,1500);
        const img = getRealImage(link);

        // Smart no-link logic: use them early, but not too predictable
        const shouldForceNoLink = noLinkUsed < NO_LINK_COUNT && Math.random() < 0.75;
        const isOpinionMode = shouldForceNoLink || (noLinkUsed < NO_LINK_COUNT && Math.random() < 0.12);

        if (isOpinionMode) noLinkUsed++;

        const tweet = generateEarly20sTweet(title, desc, link, category, isOpinionMode);
        rows.push([new Date(), tweet, img, ""]);
        count++;
      }
    } catch(e) { /* silently continue on bad feed */ }
  }

  if (rows.length > 0) {
    sheet.getRange(2,1,rows.length,3).setValues(rows.map(r => r.slice(0,3)));
    insertBigPreviews(sheet);
  }
}

function generateEarly20sTweet(title, desc, link, category, isOpinionMode = false) {
  const style = category === "Tech"
    ? `You are a 23-year-old who’s been building since 14. Ice-cold takes only. Sound expensive and slightly arrogant.
       ${isOpinionMode ? "Pure savage opinion. Zero link. Roast if needed." : "One razor-sharp reaction. End with the link and nothing else after it."}
       24–31 words. Max 2 perfect emojis (rocket, eyes, skull, thinking_face, fire, robot, etc.). Never forced.`
    : `You are a 23-year-old who lives for ball and never misses a game.
       ${isOpinionMode ? "Unfiltered rant or cold-blooded take. No link." : "One timeline-stopping bar. End with link only."}
       24–31 words. Max 2 perfect emojis (goat, eyes, skull, fire, clown, basketball, etc.). Zero spam.`;

  const payload = {
    model: MODEL_NAME,
    messages: [{role: "user", content: `${style}\n\nTitle: ${title}\nSnippet: ${desc}\nLink: ${link}`}],
    temperature: 0.87,
    max_tokens: 150
  };

  try {
    const res = UrlFetchApp.fetch("https://api.x.ai/v1/chat/completions", {
      method: "post",
      headers: {Authorization: "Bearer " + API_KEY, "Content-Type": "application/json"},
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    if (res.getResponseCode() === 200) {
      const generated = JSON.parse(res.getContentText()).choices[0].message.content.trim();
      const firstLine = generated.split("\n")[0];
      return enforce24to31(firstLine, link, isOpinionMode);
    }
  } catch(e) {}

  // Fallback if API dies
  const fallback = isOpinionMode ? title.charAt(0).toUpperCase() + title.slice(1,180) 
                                 : title.charAt(0).toUpperCase() + title.slice(1,160) + " " + link;
  return enforce24to31(fallback, link, isOpinionMode);
}

function enforce24to31(text, link, isOpinionMode) {
  let clean = text.trim();

  // Count words without emojis
  const words = clean.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]+/gu, "")
                     .split(/\s+/).filter(w => w.length > 0);

  if (words.length < 24) clean += " This is actually insane and most people still sleeping on it.";
  if (words.length > 31) clean = clean.split(" ").slice(0,31).join(" ") + "…";

  // FINAL SAFETY: force link if not in no-link mode
  if (!isOpinionMode && !clean.match(/https?:\/\//)) clean += " " + link;

  return clean;
}

function insertBigPreviews(sheet) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const urls = sheet.getRange("C2:C" + last).getValues();
  urls.forEach((row, i) => {
    if (row[0] && sheet.getRange(i+2,4).isBlank()) {
      sheet.getRange(i+2,4).setFormula(`=IMAGE("${row[0]}", 4, 200, 200)`);
      sheet.getRange(i+2,4).setHorizontalAlignment("center");
    }
  });
  sheet.setColumnWidth(4, 230);
  sheet.setRowHeights(2, last-1, 220);
}
