#!/usr/bin/env python3
"""Inactive deterministic scene contract for DIPISTAV fuel artwork v11.

This module defines quantity truth and reusable modules only. It intentionally
does not render or promote fuel artwork before Unit Tile approval.
"""

from __future__ import annotations

import hashlib
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Literal, Mapping, Sequence

from artwork_v11 import CANVAS, SAFE_INSET, SEED


CompositionBasis = Literal["exact", "aggregate-volume", "optical-density"]


@dataclass(frozen=True)
class ContainedEquivalent:
    count: int
    unit: str
    mass_kg: int | None = None


@dataclass(frozen=True)
class FuelBand:
    suffix: str
    minimum: int
    maximum: int | None
    representative_selling_units: int
    rendered_module_counts: Mapping[str, int]
    composition_basis: CompositionBasis
    contained_unit_equivalent: ContainedEquivalent | None = None


@dataclass(frozen=True)
class FuelFamily:
    id: str
    category_id: str
    illustration_variants: Sequence[str]
    unit_tiles: Sequence[str]
    bands: Sequence[FuelBand]
    notes: Sequence[str]


def band(
    suffix: str,
    minimum: int,
    maximum: int | None,
    selling_units: int,
    modules: Mapping[str, int],
    basis: CompositionBasis = "exact",
    equivalent: ContainedEquivalent | None = None,
) -> FuelBand:
    return FuelBand(suffix, minimum, maximum, selling_units, modules, basis, equivalent)


PELLET_BAG_BANDS = (
    band("1", 1, 1, 1, {"pellet-bag-15kg": 1}),
    band("2", 2, 2, 2, {"pellet-bag-15kg": 2}),
    band("3-4", 3, 4, 4, {"pellet-bag-15kg": 4}),
    band("5-9", 5, 9, 7, {"pellet-bag-15kg": 7}),
    band("10-19", 10, 19, 15, {"pellet-bag-15kg": 15}),
    band("20plus", 20, None, 20, {"pellet-bag-15kg": 20}),
)

PELLET_SET_BANDS = tuple(
    band(suffix, minimum, maximum, sets, {"pellet-bag-15kg": bags})
    for suffix, minimum, maximum, sets, bags in (
        ("1", 1, 1, 1, 10),
        ("2", 2, 2, 2, 20),
        ("3-4", 3, 4, 3, 30),
        ("5plus", 5, None, 5, 50),
    )
)

PELLET_PALLET_BANDS = tuple(
    band(
        suffix,
        minimum,
        maximum,
        pallets,
        {"pellet-pallet": pallets, "pellet-bag-15kg": pallets * 40, "pallet": pallets, "wrap": pallets},
        "optical-density",
        ContainedEquivalent(65 * pallets, "pellet-bag-15kg", 975 * pallets),
    )
    for suffix, minimum, maximum, pallets in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3", 3, 3, 3),
        ("4-5", 4, 5, 4),
        ("6plus", 6, None, 6),
    )
)

LOOSE_LOG_COUNTS = (12, 18, 24, 36, 48)
FIREWOOD_BANDS = tuple(
    band(suffix, minimum, maximum, selling_units, {"split-log": logs}, "aggregate-volume")
    for (suffix, minimum, maximum, selling_units), logs in zip(
        (("1", 1, 1, 1), ("2", 2, 2, 2), ("3-4", 3, 4, 3), ("5-8", 5, 8, 6), ("9plus", 9, None, 9)),
        LOOSE_LOG_COUNTS,
        strict=True,
    )
)

BIG_BAG_BANDS = tuple(
    band(suffix, minimum, maximum, bags, {"big-bag": bags, "split-log": bags * 12}, "optical-density")
    for suffix, minimum, maximum, bags in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5-8", 5, 8, 5),
        ("9plus", 9, None, 9),
    )
)

PALLET_BANDS = tuple(
    band(suffix, minimum, maximum, pallets, {"firewood-pallet": pallets, "pallet": pallets})
    for suffix, minimum, maximum, pallets in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5-8", 5, 8, 6),
        ("9plus", 9, None, 9),
    )
)

SLAB_BANDS = tuple(
    band(suffix, minimum, maximum, bundles, {"slab-bundle": bundles, "strap": bundles * 2})
    for suffix, minimum, maximum, bundles in (
        ("1", 1, 1, 1),
        ("2", 2, 2, 2),
        ("3-4", 3, 4, 4),
        ("5plus", 5, None, 5),
    )
)

FUEL_FAMILIES = {
    "pellets-bag": FuelFamily(
        "pellets-bag", "pelety", ("pellets-bag",), ("pellet-bag-15kg",), PELLET_BAG_BANDS,
        ("Preserve the approved v3 tree print and 15 kg only.",),
    ),
    "pellets-set": FuelFamily(
        "pellets-set", "pelety", ("pellets-set",), ("pellet-bag-15kg",), PELLET_SET_BANDS,
        ("One selling set equals ten bags.",),
    ),
    "pellets-pallet": FuelFamily(
        "pellets-pallet", "pelety", ("pellets-pallet",), ("pellet-bag-15kg", "pallet", "wrap"), PELLET_PALLET_BANDS,
        ("Use eight layers of five rendered bags; commercial equivalent is 65 bags / 975 kg.",),
    ),
    "firewood-loose": FuelFamily(
        "firewood-loose", "stipane-drevo", ("firewood-loose",),
        ("split-half-round", "split-quarter", "split-triangular"), FIREWOOD_BANDS,
        ("Bark is allowed only on the outer rounded edge.",),
    ),
    "firewood-bigbag": FuelFamily(
        "firewood-bigbag", "stipane-drevo", ("firewood-bag",),
        ("big-bag", "split-half-round", "split-quarter", "split-triangular"), BIG_BAG_BANDS,
        ("Use fully opaque warm canvas.",),
    ),
    "firewood-pallet-16": FuelFamily(
        "firewood-pallet-16", "stipane-drevo", ("firewood-pallet", "pallet-16"),
        ("pallet", "pallet-frame-16", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Share the same 1.6 prm master across both runtime variants.",),
    ),
    "firewood-pallet-25": FuelFamily(
        "firewood-pallet-25", "drivi-na-paletach", ("pallet-25",),
        ("pallet", "pallet-frame-25", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Parameterize 25 cm log length and denser cut faces.",),
    ),
    "firewood-pallet-33": FuelFamily(
        "firewood-pallet-33", "drivi-na-paletach", ("pallet-33",),
        ("pallet", "pallet-frame-33", "split-half-round", "split-quarter", "split-triangular"), PALLET_BANDS,
        ("Parameterize 33 cm log length; use its 1 prm master for the future homepage icon.",),
    ),
    "slabs": FuelFamily(
        "slabs", "krajinky", ("slabs-2m", "slabs-3m", "slabs-4m"),
        ("slab-a", "slab-b", "slab-c", "strap"), SLAB_BANDS,
        ("Render separate 2/3/4 m geometry without runtime stretching; use two straps per bundle.",),
    ),
}


def validate_family(family: FuelFamily) -> None:
    expected_minimum = 1
    for item in family.bands:
        if item.minimum != expected_minimum:
            raise ValueError(f"Band gap in {family.id}: expected {expected_minimum}, got {item.minimum}")
        if item.representative_selling_units < 1 or any(count < 1 for count in item.rendered_module_counts.values()):
            raise ValueError(f"Invalid representative count in {family.id}:{item.suffix}")
        expected_minimum = (item.maximum + 1) if item.maximum is not None else expected_minimum
    if family.bands[-1].maximum is not None:
        raise ValueError(f"Final band must be open-ended: {family.id}")


def family_plan(family_id: str) -> dict[str, object]:
    family = FUEL_FAMILIES[family_id]
    validate_family(family)
    payload = {
        "styleVersion": "v11",
        "approvalStatus": "planned",
        "runtimeActivation": "blocked-until-explicit-visual-approval",
        "canvas": {"width": CANVAS[0], "height": CANVAS[1]},
        "camera": {"projection": "orthographic", "azimuthDegrees": 40, "elevationDegrees": 27},
        "safeInset": SAFE_INSET,
        "seed": SEED,
        "family": asdict(family),
    }
    encoded = json.dumps(payload, sort_keys=True, separators=(",", ":")).encode("utf-8")
    payload["planSha256"] = hashlib.sha256(encoded).hexdigest()
    return payload


def write_family_plan(family_ids: Sequence[str], output: Path) -> None:
    plans = [family_plan(family_id) for family_id in family_ids]
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps({"families": plans}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

