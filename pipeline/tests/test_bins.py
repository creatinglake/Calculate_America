from bins import CODES, GROUPS, P0, P1, WIDTH, group_bins


def test_127_bins_cover_0_to_1():
    assert len(CODES) == 127
    assert P0[0] == 0 and P1[-1] == 1
    assert all(abs(P1[i] - P0[i + 1]) < 1e-12 for i in range(126))
    assert abs(sum(WIDTH) - 1) < 1e-9


def test_codes_match_wid_spelling():
    assert CODES[:2] == ["p0p1", "p1p2"]
    assert CODES[99] == "p99p99.1"
    assert CODES[108] == "p99.9p99.91"
    assert CODES[117] == "p99.99p99.991"
    assert CODES[-1] == "p99.999p100"


def test_groups_partition_bins():
    idx = sorted(i for g in GROUPS for i in group_bins(g))
    assert idx == list(range(127))
    assert len(group_bins("b50")) == 50
    assert len(group_bins("t001")) == 10
