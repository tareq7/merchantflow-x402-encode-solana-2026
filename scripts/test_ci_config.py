#!/usr/bin/env python3
"""Semantic Buildkite verification policy, without production deployment (PyYAML)."""
from pathlib import Path
import unittest
import yaml

ROOT = Path(__file__).resolve().parents[1]

class ManagedBuildkite(unittest.TestCase):
    def test_only_source_tests_and_build_on_managed_queue(self):
        config = yaml.safe_load((ROOT / ".buildkite/pipeline.yml").read_text())
        self.assertIsInstance(config["steps"], list)
        self.assertEqual(len(config["steps"]), 1)
        step = config["steps"][0]
        self.assertEqual(step["agents"]["queue"], "default")
        commands = step["command"]
        for expected in ("npm ci", "npm test", "npm run build"):
            self.assertIn(expected, commands)
        for forbidden in ("wrangler deploy", "npm run deploy", "aws ", "kubectl "):
            self.assertNotIn(forbidden, commands)

if __name__ == "__main__":
    unittest.main()
