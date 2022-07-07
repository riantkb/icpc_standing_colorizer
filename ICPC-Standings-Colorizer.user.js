// ==UserScript==
// @name         ICPC Japan Standings Colorizer
// @namespace    https://github.com/riantkb/icpc_standing_colorizer
// @version      0.5.2
// @description  ICPC Japan Standings Colorizer
// @author       riantkb
// @match        http://www.yamagula.ic.i.u-tokyo.ac.jp/*/standings.html
// @match        https://icpc.iisf.or.jp/past-icpc/*/common/guest_standings_ja.php.html
// @match        https://icpcsec.firebaseapp.com/*
// @grant        GM_getResourceText
// @grant        GM_addStyle
// @resource     style.css https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/tampermonkey_script.css
// @updateURL    https://github.com/riantkb/icpc_standing_colorizer/raw/master/ICPC-Standings-Colorizer.user.js
// ==/UserScript==

var newCSS;
newCSS = GM_getResourceText("style.css");
GM_addStyle(newCSS);

function convertFromRatingToSpan(rating) {
    if (rating <= 0) {
        return `<span class="user-unrated">${rating}</span>`;
    }
    else if (rating < 400) {
        return `<span class="user-gray">${rating}</span>`;
    }
    else if (rating < 800) {
        return `<span class="user-brown">${rating}</span>`;
    }
    else if (rating < 1200) {
        return `<span class="user-green">${rating}</span>`;
    }
    else if (rating < 1600) {
        return `<span class="user-cyan">${rating}</span>`;
    }
    else if (rating < 2000) {
        return `<span class="user-blue">${rating}</span>`;
    }
    else if (rating < 2400) {
        return `<span class="user-yellow">${rating}</span>`;
    }
    else if (rating < 2800) {
        return `<span class="user-orange">${rating}</span>`;
    }
    else {
        return `<span class="user-red">${rating}</span>`;
    }
}

function getColorCode(rating) {
    if (rating <= 0) {
        return "#000000";
    }
    else if (rating < 400) {
        return "#808080";
    }
    else if (rating < 800) {
        return "#804000";
    }
    else if (rating < 1200) {
        return "#008000";
    }
    else if (rating < 1600) {
        return "#00C0C0";
    }
    else if (rating < 2000) {
        return "#0000FF";
    }
    else if (rating < 2400) {
        return "#C0C000";
    }
    else if (rating < 2800) {
        return "#FF8000";
    }
    else {
        return "#FF0000";
    }
}


function generateTopcoderLikeCircle(rating) {
    if (rating >= 3600) {
        return `<span style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: rgb(255, 215, 0); background: linear-gradient(to right, rgb(255, 215, 0), white, rgb(255, 215, 0));"></span>`
    }
    if (rating >= 3200) {
        return `<span style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: rgb(128, 128, 128); background: linear-gradient(to right, rgb(128, 128, 128), white, rgb(128, 128, 128));"></span>`
    }
    var ccode = getColorCode(rating)
    var fill_ratio = rating >= 3200 ? 100 : rating % 400 / 4
    return `<span style="display: inline-block; border-radius: 50%; border-style: solid; border-width: 1px; height: 12px; width: 12px; border-color: ${ccode}; background: linear-gradient(to top, ${ccode} ${fill_ratio}%, rgba(0,0,0,0) ${fill_ratio}%);"></span>`
}


function domestic() {
    // console.log("domestic");
    var lines = document.querySelectorAll("td.main > div > table > tbody > tr");
    if (lines.length == 0) {
        setTimeout(domestic, 500);
        return;
    }

    var fetchurl = "https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/teams.json";
    var url = window.location.href;
    if (url.match(/icpc2021/) != null || url.match(/domestic2021/) != null) {
        fetchurl = "https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/past/2021.json";
    }

    fetch(fetchurl, { cache: "no-store" }).then(res => {
        res.json().then(team_dic => {
            var first = true;
            for (const e of lines) {
                if (first) {
                    first = false;
                    continue;
                }
                if (e == null) continue;
                var a = e.querySelector('td:nth-child(3)');
                if (a == null) continue;
                var tname = a.innerText.split("\n")[0];
                if (tname in team_dic) {
                    var h = a.innerHTML
                    // var team_rating = convertFromRatingToSpan(team_dic[tname]['team_rating'])
                    var circle = generateTopcoderLikeCircle(team_dic[tname]['team_rating'])
                    var circle_span = `<span class='tooltip1'>${circle}<div class='description1'>${team_dic[tname]['team_rating']}</div></span>`;
                    h = h.replace(tname, `${circle_span} ${tname}<br><small><span>${team_dic[tname]['members'].join(', ')}</span></small>`);
                    a.innerHTML = h
                }
            }
            var univ_count = [];
            first = true;
            for (const e of lines) {
                if (first) {
                    first = false;
                    continue;
                }
                if (e == null) continue;
                var a = e.querySelector('td:nth-child(4)');
                if (a == null) continue;
                var uname = a.innerText.split("\n")[0];
                if (uname in univ_count) {
                    univ_count[uname] += 1;
                } else {
                    univ_count[uname] = 1;
                }
            }
            var univ_rank = [];
            var pass_count = 0;
            var host = "Keio University";
            first = true;
            for (const e of lines) {
                if (first) {
                    first = false;
                    continue
                }
                if (e == null) continue;
                var a = e.querySelector('td:nth-child(4)');
                if (a == null) continue;
                var uname = a.innerText.split("\n")[0];
                var urank;
                if (uname in univ_rank) {
                    urank = univ_rank[uname] + 1;
                } else {
                    urank = 1;
                }
                univ_rank[uname] = urank;
                a.innerHTML += ` (${urank}/${univ_count[uname]})`;

                var pass = 0;
                if (pass_count < 10) {
                    pass = 1;
                } else if (pass_count < 20) {
                    if (urank <= 3) pass = 1;
                } else if (pass_count < 30) {
                    if (urank <= 2) pass = 1;
                } else if (pass_count < 39) {
                    if (urank <= 1) pass = 1;
                }
                if (pass == 0 && uname == host) {
                    pass = 2;
                    host = "";
                }
                if (pass > 0) {
                    var b = e.querySelector('td:nth-child(1)');
                    b.setAttribute('bgcolor', '#AAE0AA');
                    if (pass == 1) {
                        pass_count++;
                    }
                    else {
                        b.innerHTML += '*';
                    }
                }
            }
        }).catch(_e => {
            setTimeout(domestic, 3000);
        }).catch(_e => {
            setTimeout(domestic, 3000);
        })
    })
}


function regional() {
    // console.log("regional");
    var lines0 = document.querySelectorAll("div.team-col.team-name");
    for (const e of lines0) {
        if (e == null) continue;
        e.style.overflow = "visible";
    }

    var lines = document.querySelectorAll("div.team-col.team-name > span");
    // if (lines.length == 0) {
    //     setTimeout(regional, 500);
    //     return;
    // }
    var fetchurl = "https://raw.githubusercontent.com/riantkb/icpc_standing_colorizer/master/teams.json";
    fetch(fetchurl, { cache: "no-store" }).then(res => {
        res.json().then(team_dic => {
            for (const e of lines) {
                if (e == null) continue;
                var tname = e.innerText.split("\n")[0];
                if (tname in team_dic) {
                    var h = e.innerHTML
                    // var team_rating = convertFromRatingToSpan(team_dic[tname]['team_rating'])
                    var circle = generateTopcoderLikeCircle(team_dic[tname]['team_rating'])
                    var circle_span = `<span class='tooltip1'>${circle}<div class='description1'>${team_dic[tname]['team_rating']}</div></span>`;
                    h = h.replace(tname, `${circle_span} ${tname}<br><small><span>${team_dic[tname]['members'].join(', ')}</span></small>`);
                    e.innerHTML = h
                }
            }
        }).catch(_e => {
            // setTimeout(regional, 3000);
        }).catch(_e => {
            // setTimeout(regional, 3000);
        })
    })
    setTimeout(main, 4000);
}

function main() {
    // console.log("main");
    var url = window.location.href;
    if (url.match(/www.yamagula.ic.i.u-tokyo.ac.jp/) != null || url.match(/icpc.iisf.or.jp\/past-icpc/) != null) {
        domestic();
    }
    else if (url.match(/icpcsec.firebaseapp.com\/standings/) != null) {
        regional();
    }
    else {
        // console.log("no match url");
        setTimeout(main, 1000);
    }
}

(function () {
    'use strict';
    main();
})();

