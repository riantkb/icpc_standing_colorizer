import os
import requests
import pandas as pd
from bs4 import BeautifulSoup
import time
import datetime
import json
import html
import pickle

import rating_utils


YEAR = 2024
YEAR_BEGIN = 2021


valid_chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_"

pickle_path = "atcoder.pickle"

pickle_atcoder = {}
if os.path.isfile(pickle_path):
    with open(pickle_path, "rb") as f:
        pickle_atcoder = pickle.load(f)
        pickle_atcoder = {
            k: v
            for k, v in pickle_atcoder.items()
            if datetime.datetime.now() - v["datetime"] < datetime.timedelta(days=1)
        }


def convert_from_rating_to_span(rating: int):
    if rating <= 0:
        return f'<span class="user-unrated">{rating}</span>'
    elif rating < 400:
        return f'<span class="user-gray">{rating}</span>'
    elif rating < 800:
        return f'<span class="user-brown">{rating}</span>'
    elif rating < 1200:
        return f'<span class="user-green">{rating}</span>'
    elif rating < 1600:
        return f'<span class="user-cyan">{rating}</span>'
    elif rating < 2000:
        return f'<span class="user-blue">{rating}</span>'
    elif rating < 2400:
        return f'<span class="user-yellow">{rating}</span>'
    elif rating < 2800:
        return f'<span class="user-orange">{rating}</span>'
    else:
        return f'<span class="user-red">{rating}</span>'


def fetch_user_page(ulink: str):
    if ulink in pickle_atcoder:
        response = pickle_atcoder[ulink]["response"]
    else:
        time.sleep(2)
        response = requests.get(ulink)
        if response.status_code == requests.codes.ok or response.status_code == requests.codes.not_found:
            pickle_atcoder[ulink] = {"response": response, "datetime": datetime.datetime.now()}

    return response


def get_user_rate(username: str):
    if not username:
        return 0
    reqname = "".join(c for c in username if c in valid_chars)
    if reqname == "":
        return 0

    ulink = f"https://atcoder.jp/users/{reqname}"
    response = fetch_user_page(ulink)
    if response.status_code != requests.codes.ok:
        ok = False
        if "@" in username:
            for s in username.split("@"):
                reqname = "".join(c for c in s if c in valid_chars)
                if reqname != "":
                    ulink = f"https://atcoder.jp/users/{reqname}"
                    response = fetch_user_page(ulink)
                    if response.status_code == requests.codes.ok:
                        ok = True
                        break
        if not ok:
            return 0
    df = pd.read_html(response.text)
    if len(df) < 2:
        # unrated user
        return 0
    rating = str(df[1][df[1][0] == "Rating"].iloc[0, 1])
    if "(Provisional)" in rating:
        rating = rating.replace("(Provisional)", "").replace(" ", "")
    return int(rating)


def get_user_span(username: str, enable_link: bool):
    if not username:
        return ""
    reqname = "".join(c for c in username if c in valid_chars)
    if reqname == "":
        return username

    ulink = f"https://atcoder.jp/users/{reqname}"
    response = fetch_user_page(ulink)
    if response.status_code != requests.codes.ok:
        ok = False
        if "@" in username:
            for s in username.split("@"):
                reqname = "".join(c for c in s if c in valid_chars)
                if reqname != "":
                    ulink = f"https://atcoder.jp/users/{reqname}"
                    response = fetch_user_page(ulink)
                    if response.status_code == requests.codes.ok:
                        ok = True
                        break
        if not ok:
            return username

    soup = BeautifulSoup(response.text, "html.parser")
    uinfo = soup.select_one("a.username")
    assert uinfo is not None
    assert uinfo.previous_sibling is not None
    icon = str(uinfo.previous_sibling.previous_sibling)
    if "//img.atcoder.jp/assets/icon/crown_" in icon:
        icon = icon.replace("//img.atcoder.jp/assets/icon/crown_", "https://img.atcoder.jp/assets/icon/crown_") + " "
    else:
        icon = ""
    if enable_link:
        if icon:
            return f'<span>{icon}<a href="{ulink}">{str(uinfo.span)}</a></span>'
        else:
            return f'{icon}<a href="{ulink}">{str(uinfo.span)}</a>'
    else:
        if icon.endswith(" "):
            icon = icon[:-1]
        if icon:
            return f"<span>{icon}{str(uinfo.span)}</span>"
        else:
            return f"{icon}{str(uinfo.span)}"


url = f"https://jag-icpc.org/?{YEAR}%2FTeams%2FList"
df = pd.read_html(url)[1].fillna("")[5:].reset_index(drop=True)
df = df.rename(columns={"メンバー 1": "メンバー1", "コーチ，ココーチ": "コーチ"})
user_columns = ("メンバー1", "メンバー2", "メンバー3", "コーチ")
df["チームレート"] = 0
df = df.reindex(
    columns=["チーム名", "学校名", "チームレート", "メンバー1", "メンバー2", "メンバー3", "コーチ", "ひとこと等"]
)
for c in ("チーム名", "学校名", "メンバー1", "メンバー2", "メンバー3", "コーチ", "ひとこと等"):
    df[c] = df[c].map(html.escape)

res_dict = {}
for i in range(len(df)):
    ratings = []
    members = []
    for c in user_columns[:-1]:
        username = df[c][i]
        ratings.append(get_user_rate(username))
        members.append(get_user_span(username, False))

    for c in user_columns:
        username = df[c][i]
        df.loc[df.index[i], c] = get_user_span(username, True)

    team_rating = int(rating_utils.aggregate_ratings(ratings))
    df.loc[df.index[i], "チームレート"] = convert_from_rating_to_span(team_rating)
    res_dict[df["チーム名"][i]] = {"team_rating": team_rating, "members": members}

df = df.reindex(
    columns=["チーム名", "学校名", "チームレート", "メンバー1", "メンバー2", "メンバー3", "コーチ", "ひとこと等"]
)

df_html = df.to_html(escape=False)

complete_html = """
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<script type="text/javascript" src="https://ajax.googleapis.com/ajax/libs/jquery/1.12.4/jquery.min.js"></script>
<script type="text/javascript" src="https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.0/js/jquery.tablesorter.min.js"></script>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/jquery.tablesorter/2.31.0/css/theme.default.min.css">
<title>ICPC %d Domestic Teams</title>
<style>
table a {text-decoration: none;}
.username > span {font-weight:bold;}
a:hover.username {text-decoration: none;}
.user-red {color:#FF0000;}
.user-orange {color:#FF8000;}
.user-yellow {color:#C0C000;}
.user-blue {color:#0000FF;}
.user-cyan {color:#00C0C0;}
.user-green {color:#008000;}
.user-brown {color:#804000;}
.user-gray {color:#808080;}
.user-unrated {color:#000000;}
.user-admin {color:#C000C0;}
.crown-gold {color: #fb0;}
.crown-silver {color: #aaa;}
.dataframe {font-size: 16px; }
</style>
<script>
$(document).ready(function() {
    $('.dataframe').tablesorter();
});
</script>
</head>
<body>
<p>This information is from <a href="%s">%s</a> (Last Update: %s).</p>
<p>The team ratings are calculated based on <a href="https://codeforces.com/blog/entry/16986">https://codeforces.com/blog/entry/16986</a>.</p>
<p>GitHub (& userscript): <a href="https://github.com/riantkb/icpc_standing_colorizer">https://github.com/riantkb/icpc_standing_colorizer</a></p>
<p><b>情報の真偽に対する一切の責任を負いません</b></p>
<p>Past years: %s</p>
%s
</body>
</html>
""" % (
    YEAR,
    url,
    url,
    datetime.datetime.now(),
    ", ".join(f'<a href="./past/{i}.html">{i}</a>' for i in range(YEAR - 1, YEAR_BEGIN - 1, -1)),
    df_html,
)

with open("index.html", "w") as f:
    f.write(complete_html)

with open("teams.json", "w") as f:
    json.dump(res_dict, f, indent=4)

with open(pickle_path, "wb") as f:
    pickle.dump(pickle_atcoder, f)
