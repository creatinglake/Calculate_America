"""Regression test against Adam's CPS spreadsheet. Skipped when the file is
absent (CI): it holds IPUMS microdata and is never committed."""
import openpyxl
import pytest

import cps

pytestmark = pytest.mark.skipif(not cps.WORKBOOK.exists(), reason="CPS spreadsheet not present")


@pytest.fixture(scope="module")
def sheets():
    return cps.load("2024"), cps.load("1963")


def spreadsheet_outputs():
    wb = openpyxl.load_workbook(cps.WORKBOOK, read_only=True, data_only=True)
    rows = list(wb["Main"].iter_rows(max_row=11, max_col=5, values_only=True))
    # C3 input, C4 percentile, C5 output, E11 ratio of incomes per earner
    return rows[2][2], rows[3][2], rows[4][2], rows[10][4]


def test_reproduces_spreadsheet_result(sheets):
    today, then = sheets
    income, p_xl, out_xl, ratio_xl = spreadsheet_outputs()
    p, ratio, out = cps.counterfactual(today, then, income)
    assert p == pytest.approx(p_xl, abs=1e-12)
    assert ratio == pytest.approx(ratio_xl, rel=1e-12)
    assert out == pytest.approx(out_xl, rel=1e-12)


def test_headline_values_in_plan(sheets):
    # FAIRSHARE_PLAN.md 3.5: $100,000 -> 83.1st percentile -> $110,370, ratio 17.80
    today, then = sheets
    p, ratio, out = cps.counterfactual(today, then, 100_000)
    assert round(p * 100, 1) == 83.1
    assert round(out) == 110_370
    assert round(ratio, 2) == 17.80
