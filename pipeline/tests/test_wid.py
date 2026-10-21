import numpy as np

import wid
from bins import CODES


def write_fixture(tmp_path):
    rows = ["country;variable;percentile;year;value;age;pop;data_quality"]
    for year, scale in ((2022, 1.0), (2023, 1.0), (2024, 1.1)):
        for i, p in enumerate(CODES):
            rows.append(f"US;sptincj992;{p};{year};{1/127};992;j;")
            rows.append(f"US;aptincj992;{p};{year};{(i + 1) * 100 * scale};992;j;")
            rows.append(f"US;tptincj992;{p};{year};{(i + 0.5) * 100 * scale};992;j;")
    # 2021 is missing one bin and must be dropped
    for p in CODES[:-1]:
        for v in "sat":
            rows.append(f"US;{v}ptincj992;{p};2021;1;992;j;")
    rows.append("US;anninci992;p0p100;2023;500;992;i;")
    (tmp_path / "wid").mkdir()
    (tmp_path / "wid" / "WID_data_US.csv").write_text("\n".join(rows) + "\n")


def test_distribution_keeps_only_complete_years(tmp_path):
    write_fixture(tmp_path)
    df = wid.load("US", tmp_path)
    d = wid.distribution(df, "ptinc")
    assert sorted(d) == [2022, 2023, 2024]
    assert d[2023].avg[0] == 100 and d[2023].thr[-1] == 126.5 * 100
    assert np.isclose(d[2023].share.sum(), 1)


def test_repeated_years_flags_copied_shares(tmp_path):
    write_fixture(tmp_path)
    d = wid.distribution(wid.load("US", tmp_path), "ptinc")
    assert wid.repeated_years(d) == [2023, 2024]


def test_series_reads_one_variable(tmp_path):
    write_fixture(tmp_path)
    s = wid.series(wid.load("US", tmp_path), "anninci992")
    assert s.to_dict() == {2023: 500}
