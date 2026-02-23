// ==UserScript==
// @name         ICPC Japan Standings Colorizer
// @namespace    https://github.com/riantkb/icpc_standing_colorizer
// @version      0.9.2
// @description  ICPC Japan Standings Colorizer
// @author       riantkb
// @match        https://www.yamagula.ic.i.u-tokyo.ac.jp/*/standings.html
// @match        https://icpc.iisf.or.jp/past-icpc/*/common/guest_standings_ja.php.html
// @match        https://icpcsec.firebaseapp.com/*
// @match        https://icpcasia.firebaseapp.com/*
// @match        https://icpcapac.firebaseapp.com/*
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     style.css https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/tampermonkey_script.css
// @updateURL    https://github.com/riantkb/icpc_standing_colorizer/raw/master/ICPC-Standings-Colorizer.user.js
// ==/UserScript==

// @ts-check

// @ts-ignore
GM_addStyle(GM_getResourceText("style.css"));

const YEAR = 2025;
const YEAR_BEGIN = 2021;

/**
 * @param {string} univ
 * @param {number} year
 */
function isHost(univ, year) {
  if (year < 2023) {
    return univ.includes("Keio University") || univ.includes("慶應義塾大学");
  } else if (year < 2025) {
    return univ.includes("Tokyo Institute of Technology") || univ.includes("東京工業大学");
  } else {
    return univ.includes("Institute of Science Tokyo") || univ.includes("東京科学大学");
  }
}

/**
 * only "Step 1" selection
 *
 * @param {number} pass_count
 * @param {number} rank_in_univ
 * @param {number} year
 */
function isPass(pass_count, rank_in_univ, year) {
  let thretholds;
  if (year < 2023) {
    thretholds = [
      [10, 99],
      [20, 3],
      [30, 2],
      [39, 1],
    ];
  } else {
    thretholds = [
      [10, 99],
      [25, 3],
      [40, 2],
      [49, 1],
    ];
  }

  for (const [pass_lim, univ_lim] of thretholds) {
    if (pass_count < pass_lim && rank_in_univ <= univ_lim) {
      return true;
    }
  }
  return false;
}

/**
 * @param {number} rating
 */
function getColorCode(rating) {
  if (rating <= 0) return "#000000";
  else if (rating < 400) return "#808080";
  else if (rating < 800) return "#804000";
  else if (rating < 1200) return "#008000";
  else if (rating < 1600) return "#00C0C0";
  else if (rating < 2000) return "#0000FF";
  else if (rating < 2400) return "#C0C000";
  else if (rating < 2800) return "#FF8000";
  else return "#FF0000";
}

/**
 * @param {number} rating
 */
function generateTopcoderLikeCircle(rating) {
  if (rating >= 3600) {
    return `<span title="${rating}" style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: rgb(255, 215, 0); background: linear-gradient(to right, rgb(255, 215, 0), white, rgb(255, 215, 0));"></span>`;
  }
  if (rating >= 3200) {
    return `<span title="${rating}" style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: rgb(128, 128, 128); background: linear-gradient(to right, rgb(128, 128, 128), white, rgb(128, 128, 128));"></span>`;
  }
  const ccode = getColorCode(rating);
  const fill_ratio = rating >= 3200 ? 100 : (rating % 400) / 4;
  return `<span title="${rating}" style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: ${ccode}; background: linear-gradient(to top, ${ccode} ${fill_ratio}%, rgba(0,0,0,0) ${fill_ratio}%);"></span>`;
}

/**
 * @param {string} h
 * @param {string} tname
 * @param {{ team_rating: number; members: string[]; }} tinfo
 */
function decorate(h, tname, tinfo) {
  const circle = generateTopcoderLikeCircle(tinfo.team_rating);
  return h.replace(
    tname,
    `${circle} ${tname}<br><div style="display: inline-block; border: none; padding: 0"><small>${tinfo.members.join(
      ", "
    )}</small></div>`
  );
}

function domestic() {
  // console.log("domestic");
  const _lines = document.querySelectorAll("td.main > div > table > tbody > tr");
  if (_lines.length == 0) {
    setTimeout(domestic, 3000);
    return;
  }
  const lines = Array.from(_lines).slice(1);

  let fetchurl = "https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/teams.json";
  let year = YEAR;
  const url = window.location.href;
  for (let y = YEAR_BEGIN; y < YEAR; y++) {
    if (url.includes(`icpc${y}`) || url.includes(`domestic${y}`)) {
      fetchurl = `https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/past/${y}.json`;
      year = y;
    }
  }

  fetch(fetchurl, { cache: "no-store" })
    .then((res) => res.json())
    .then((team_dic) => {
      for (const e of lines) {
        if (e == null) continue;
        const a = /** @type {HTMLElement|null} */ (e.querySelector("td:nth-child(3)"));
        if (a == null) continue;
        const tname = a.innerText.split("\n")[0];
        if (tname in team_dic) {
          a.innerHTML = decorate(a.innerHTML, tname, team_dic[tname]);
        }
      }

      /** @type {Record<string, number>} */
      const all_in_univ = Object.create(null);
      for (const e of lines) {
        if (e == null) continue;
        const a = /** @type {HTMLElement|null} */ (e.querySelector("td:nth-child(4)"));
        if (a == null) continue;
        const uname = a.innerText.split("\n")[0];
        all_in_univ[uname] = (all_in_univ[uname] ?? 0) + 1;
      }

      /** @type {Record<string, number>} */
      const count_in_univ = Object.create(null);
      let pass_count = 0;
      let rem_host = true;
      for (const e of lines) {
        if (e == null) continue;
        const a = /** @type {HTMLElement|null} */ (e.querySelector("td:nth-child(4)"));
        if (a == null) continue;
        const uname = a.innerText.split("\n")[0];
        count_in_univ[uname] = (count_in_univ[uname] ?? 0) + 1;

        const rank_in_univ = count_in_univ[uname];
        a.innerHTML += ` [${rank_in_univ}/${all_in_univ[uname]}]`;

        let pass = 0;
        if (isPass(pass_count, rank_in_univ, year)) {
          pass_count++;
          pass = 1;
        } else if (rem_host && isHost(uname, year)) {
          rem_host = false;
          pass = 2;
        }
        if (pass > 0) {
          const b = /** @type {HTMLElement|null} */ (e.querySelector("td:nth-child(1)"));
          if (b == null) continue;
          b.setAttribute("bgcolor", "#AAE0AA");
          if (pass == 2) {
            b.innerHTML += "*";
          }
        }
      }
    })
    .catch((_e) => {
      setTimeout(domestic, 3000);
    });
}

function firebaseapp() {
  let is_domestic = false;
  const header = /** @type {HTMLElement|null} */ (document.querySelector("a.navbar-brand"));
  if (header != null && (header.innerText.includes("国内予選") || header.innerText.includes("domestic"))) {
    is_domestic = true;
  }

  const lines = /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll("div.team-col.team-name"));
  // for (const e of lines) {
  //   if (e == null) continue;
  //   e.style.overflow = "visible";
  // }

  let fetchurl = "https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/teams.json";
  let year = YEAR;
  for (let y = YEAR_BEGIN; y < YEAR; y++) {
    if (header != null && header.innerText.includes(`${y}`)) {
      fetchurl = `https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/past/${y}.json`;
      year = y;
    }
  }

  fetch(fetchurl, { cache: "no-store" })
    .then((res) => res.json())
    .then((team_dic) => {
      for (const e of lines) {
        if (e == null) continue;
        const tspan = /** @type {HTMLElement|null} */ (e.querySelector("span > span"));
        if (tspan == null) continue;
        const tname = tspan.innerText.trim();
        if (tname in team_dic) {
          tspan.innerHTML = decorate(tspan.innerHTML, tname, team_dic[tname]);
        }
      }

      /** @type {Record<string, number>} */
      const count_in_univ = Object.create(null);
      /** @type {Record<string, number>} */
      const rank_in_univ = Object.create(null);
      /** @type {Record<string, boolean>} */
      const is_pass = Object.create(null);

      let pass_count = 0;
      let rem_host = true;
      for (const e of lines) {
        if (e == null) continue;

        // pass pinned
        if (e.parentElement?.parentElement?.classList.contains("sticky")) continue;

        const tspan = /** @type {HTMLElement|null} */ (e.querySelector("span > span"));
        if (tspan == null) continue;
        const tname = tspan.innerText.trim();
        const uspan = /** @type {HTMLElement|null} */ (e.querySelector("span.university-name"));
        if (uspan == null) continue;
        const uname = uspan.innerText.trim();

        count_in_univ[uname] = (count_in_univ[uname] ?? 0) + 1;
        rank_in_univ[tname] = count_in_univ[uname];

        if (is_domestic) {
          let pass = 0;
          if (isPass(pass_count, rank_in_univ[tname], year)) {
            pass_count++;
            pass = 1;
          } else if (rem_host && isHost(uname, year)) {
            rem_host = false;
            pass = 2;
          }
          is_pass[tname] = pass > 0;
        }
      }
      if (is_domestic) {
        for (const e of lines) {
          if (e == null) continue;
          const tspan = /** @type {HTMLElement|null} */ (e.querySelector("span > span"));
          if (tspan == null) continue;
          const tname = tspan.innerText.trim();
          if (is_pass[tname]) {
            e.style.backgroundColor = "#e3fae3";
          } else {
            e.style.backgroundColor = "";
          }
        }
      }
    })
    .catch((_e) => {});

  setTimeout(main, 4000);
}

function main() {
  // console.log("main");
  const url = window.location.href;
  if (url.includes("yamagula.ic.i.u-tokyo.ac.jp") || url.includes("icpc.iisf.or.jp/past-icpc")) {
    domestic();
  } else if (url.includes("firebaseapp.com/standings")) {
    // regional();
    firebaseapp();
  } else {
    // console.log("no match url");
    setTimeout(main, 1000);
  }
}

(function () {
  "use strict";
  main();
})();
