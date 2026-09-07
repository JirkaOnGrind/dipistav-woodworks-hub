"""The faster renderer mask filter must remain pixel-identical to Pillow."""
import random
import unittest

from PIL import Image, ImageChops, ImageFilter
from artwork_v11 import erode_mask


class MaskErosionTest(unittest.TestCase):
    def test_matches_pillow_including_image_edges(self):
        rng = random.Random(40)
        for width, height in [(17, 19), (50, 31), (100, 100)]:
            for radius in (1, 2, 4, 8):
                for binary in (False, True):
                    with self.subTest(size=(width, height), radius=radius, binary=binary):
                        mask = Image.new("L", (width, height))
                        mask.putdata([
                            rng.choice((0, 255)) if binary else rng.randrange(256)
                            for _ in range(width * height)
                        ])
                        expected = mask.filter(ImageFilter.MinFilter(2 * radius + 1))
                        self.assertIsNone(ImageChops.difference(expected, erode_mask(mask, radius)).getbbox())


if __name__ == "__main__":
    unittest.main()
