import numpy as np

import build
from bins import WIDTH
from wid import YearDist


def dist(scale=1.0, tilt=1.0):
    thr = (np.arange(127) * 10.0) ** tilt
    avg = thr + 5
    share = np.array(WIDTH) * avg / np.dot(WIDTH, avg)
    return YearDist(share, avg * scale, thr * scale)


def test_top_share_sums_top_bins():
    share = np.array(WIDTH)  # perfect equality
    assert np.isclose(build.top_share(share, 0.99), 0.01)
    assert np.isclose(build.top_share(share, 0.9999), 0.0001)


def test_latest_estimated_skips_carried_forward_year():
    a, b = dist(), dist(tilt=1.1)
    carried = YearDist(b.share.copy(), b.avg * 1.02, b.thr * 1.02)
    assert build.latest_estimated({2021: a, 2022: b, 2023: carried}) == 2022


def test_to_json_shape_and_rebasing():
    out = build.to_json({2020: dist()}, 0.5, {"x": 1})
    y = out["byYear"]["2020"]
    assert out["years"] == [2020] and len(out["bins"]) == 127
    assert len(y["avg"]) == len(y["thr"]) == len(y["share"]) == 127
    assert y["avg"][1] == round((10 + 5) * 0.5)
    assert np.isclose(out["meanPerAdult"]["2020"], np.dot(WIDTH, dist().avg) * 0.5, atol=1)


def test_derive_thresholds_midpoints_and_bottom_rule():
    avg = np.array([50.0, 150.0, 250.0])
    assert list(build.derive_thresholds(avg)) == [0.0, 100.0, 200.0]
    neg = np.array([-100.0, 50.0])
    assert list(build.derive_thresholds(neg)) == [-200.0, -25.0]


def test_gilded_age_groups_sum_to_one_and_split_bottom():
    g = build.gilded_age(0.5, 0.2, 0.1, 0.04, 0.3)
    assert np.isclose(sum(g.values()), 1)
    assert np.isclose(g["b50"], 0.15) and np.isclose(g["m40"], 0.35)
    assert np.isclose(g["t009"], 0.06) and build.per_person_order_ok(g)


def test_per_person_order_rejects_inversion():
    g = build.gilded_age(0.5, 0.2, 0.1, 0.04, 0.9)  # bottom 50% richer per person than middle 40%
    assert not build.per_person_order_ok(g)
