def __get_win_probability(ra: float, rb: float):
    return 1 / (1 + 6 ** ((rb - ra) / 400))


def aggregate_ratings(teamRatings):
    left, right = 1, 1e4
    for _ in range(50):
        r = (left + right) / 2
        rWinsProbability = 1
        for rat in teamRatings:
            rWinsProbability *= __get_win_probability(r, rat)
        if rWinsProbability < 0.5:
            left = r
        else:
            right = r

    return int((left + right) / 2 + 0.5)
