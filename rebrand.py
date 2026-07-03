#!/usr/bin/env python3
"""
Zog rebrand script.
Replaces Zog / zog / Zog / zog / Zog / zog / zog-watch
branding with Zog / zog-watch across the monorepo.
"""
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent

# Files and directories to ignore
IGNORE_DIRS = {
    'node_modules', '.git', '.venv', 'venv', '.next', 'dist', '.output',
    'lib', 'build', 'coverage', '.turbo', '.cache', 'generated',
}
IGNORE_EXTS = {
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp4', '.mp3', '.webm',
    '.ico', '.icns', '.woff', '.woff2', '.ttf', '.eot', '.zip', '.tar',
    '.gz', '.br', '.wasm', '.pack', '.idx', '.rev', '.DS_Store',
}

# Ordered replacement rules. Earlier rules run first.
REPLACEMENTS = [
    # GitHub org/repo (must run before generic zog)
    (r'github\.com/zog-watch', 'github.com/zog-watch'),
    (r'github\.com/zog', 'github.com/zog-watch'),
    (r'github\.com/zog', 'github.com/zog-watch'),

    # Documentation / homepage domains
    (r'zog\.github\.io', 'zog-watch.github.io'),
    (r'zog\.github\.io', 'zog-watch.github.io'),
    (r'zog\.net', 'zog.watch'),
    (r'zog\.mov', 'zog.watch'),
    (r'zog\.mov', 'zog.watch'),
    (r'zog\.net', 'zog.watch'),

    # Namespaced URLs/identifiers (before generic token replacements)
    (r'@zog/', '@zog/'),
    (r'com\.zog', 'com.zog'),
    (r'Zog Team', 'Zog Team'),
    (r'Zog Docs', 'Zog Docs'),
    (r'Zog extension', 'Zog extension'),
    (r'desktop app for Zog', 'desktop app for Zog'),
    (r'Desktop app for Zog', 'Desktop app for Zog'),
    (r'desktop wrapper for Zog', 'desktop wrapper for Zog'),

    # Token replacements with word-ish boundaries to avoid breaking variables
    # Upper/lower mixed forms
    (r'Zog', 'Zog'),
    (r'zog', 'zog'),
    (r'Zog', 'Zog'),
    (r'zog', 'zog'),

    # Dash forms
    (r'Zog', 'Zog'),
    (r'zog', 'zog'),
    (r'Zog', 'Zog'),
    (r'zog', 'zog'),

    # Snake case forms
    (r'ZOG', 'ZOG'),
    (r'zog', 'zog'),
    (r'ZOG', 'ZOG'),
    (r'zog', 'zog'),

    # User script / file naming helpers
    (r'zog\.user\.js', 'zog.user.js'),
    (r'zog-desktop', 'zog-desktop'),

    # Discord link: leave as-is unless explicitly requested
    # Raw GitHub content URLs handled by github org replacement above

    # Specific leftover project references
    (r'zog-docs', 'zog-docs'),
]


def should_process_file(path: Path) -> bool:
    if path.suffix.lower() in IGNORE_EXTS:
        return False
    if any(part in IGNORE_DIRS for part in path.parts):
        return False
    # Only process text-ish files; skip binaries larger than 2MB
    try:
        stat = path.stat()
    except OSError:
        return False
    if stat.st_size > 2 * 1024 * 1024:
        return False
    return True


def rebrand_text(text: str) -> str:
    for pattern, replacement in REPLACEMENTS:
        text = re.sub(pattern, replacement, text)
    return text


def rebrand_file(path: Path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            original = f.read()
    except UnicodeDecodeError:
        return False
    updated = rebrand_text(original)
    if updated != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(updated)
        return True
    return False


def rebrand_paths():
    """Rename files and directories containing brand tokens."""
    # Collect paths bottom-up so renames don't invalidate parent paths
    paths = []
    for base, dirs, files in os.walk(ROOT):
        # prune ignored dirs
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for d in dirs:
            paths.append(Path(base) / d)
        for f in files:
            paths.append(Path(base) / f)

    # Sort by depth descending
    paths.sort(key=lambda p: len(p.parts), reverse=True)

    for p in paths:
        new_name = rebrand_text(p.name)
        if new_name != p.name:
            new_path = p.with_name(new_name)
            # If target exists, skip (rare collision)
            if new_path.exists():
                print(f"SKIP collision: {p} -> {new_path}")
                continue
            p.rename(new_path)
            print(f"RENAME: {p.name} -> {new_name}")


def rebrand_contents():
    count = 0
    for base, dirs, files in os.walk(ROOT):
        dirs[:] = [d for d in dirs if d not in IGNORE_DIRS]
        for filename in files:
            path = Path(base) / filename
            if not should_process_file(path):
                continue
            if rebrand_file(path):
                count += 1
    print(f"Modified {count} files")


if __name__ == '__main__':
    print("Rebranding file contents...")
    rebrand_contents()
    print("\nRebranding file/directory names...")
    rebrand_paths()
    print("\nDone.")
