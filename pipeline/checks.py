"""Build-time validation of 127-bin distributions (FAIRSHARE_PLAN.md 3.6)."""
from __future__ import annotations

from dataclasses import dataclass, field

import numpy as np

from bins import CODES

SHARE_TOLERANCE = 0.002


@dataclass
class Report:
    errors: list[str] = field(default_factory=list)
    warnings: list[str] = field(default_factory=list)

    def extend(self, other: "Report") -> None:
        self.errors += other.errors
        self.warnings += other.warnings


def check_year(label: str, share: np.ndarray, avg: np.ndarray, thr: np.ndarray | None) -> Report:
    """Shares sum to 1, averages and thresholds increase, each average lies
    within its bin's thresholds. Negative bottom bins are warnings."""
    r = Report()
    total = float(share.sum())
    if abs(total - 1) > SHARE_TOLERANCE:
        r.errors.append(f"{label}: shares sum to {total:.4f}")
    for i in np.nonzero(np.diff(avg) < 0)[0]:
        r.errors.append(f"{label}: average falls from {CODES[i]} to {CODES[i + 1]}")
    if thr is not None:
        for i in np.nonzero(np.diff(thr) < 0)[0]:
            r.errors.append(f"{label}: threshold falls from {CODES[i]} to {CODES[i + 1]}")
        upper = np.append(thr[1:], np.inf)
        for i in np.nonzero((avg < thr) | (avg > upper))[0]:
            r.errors.append(f"{label}: {CODES[i]} average {avg[i]:.0f} outside "
                            f"[{thr[i]:.0f}, {upper[i]:.0f}]")
    for i in np.nonzero(avg < 0)[0]:
        r.warnings.append(f"{label}: {CODES[i]} average is negative ({avg[i]:.0f})")
    return r


def check_headline(label: str, got: float, expected: float, tolerance: float = 0.005) -> Report:
    """A group share matches a published figure within tolerance (shares as fractions)."""
    r = Report()
    if abs(got - expected) > tolerance:
        r.errors.append(f"{label}: {got:.4f} vs published {expected:.4f}")
    return r
