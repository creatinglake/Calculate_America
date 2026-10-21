import numpy as np

from bins import WIDTH
from checks import check_headline, check_year


def synthetic():
    w = np.array(WIDTH)
    thr = np.linspace(0, 1000, 127) ** 1.5
    upper = np.append(thr[1:], thr[-1] * 2)
    avg = (thr + upper) / 2
    share = w * avg / (w * avg).sum()
    return share, avg, thr


def test_clean_distribution_passes():
    r = check_year("x", *synthetic())
    assert r.errors == [] and r.warnings == []


def test_bad_share_sum_fails():
    share, avg, thr = synthetic()
    r = check_year("x", share * 1.01, avg, thr)
    assert any("sum" in e for e in r.errors)


def test_decreasing_average_fails():
    share, avg, thr = synthetic()
    avg = avg.copy(); avg[10], avg[11] = avg[11], avg[10]
    r = check_year("x", share, avg, thr)
    assert any("average falls" in e for e in r.errors)


def test_average_outside_thresholds_fails():
    share, avg, thr = synthetic()
    avg = avg.copy(); avg[5] = thr[7]
    r = check_year("x", share, avg, thr)
    assert any("outside" in e for e in r.errors)


def test_negative_bottom_is_warning_only():
    share, avg, thr = synthetic()
    avg = avg.copy(); thr = thr.copy(); avg[0] = -50; thr[0] = -100
    r = check_year("x", share, avg, thr)
    assert r.errors == [] and len(r.warnings) == 1


def test_headline_tolerance():
    assert check_headline("x", 0.1904, 0.1908).errors == []
    assert check_headline("x", 0.1243, 0.13).errors
