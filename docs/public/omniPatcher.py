"""
omniPatcher.py - Patch Firefox's omni.ja to disable extension signature verification.

Usage:
    python omniPatcher.py /path/to/omni.ja

What it does:
    Modifies `modules/AppConstants.sys.mjs` inside omni.ja (a ZIP archive) to set
    MOZ_REQUIRE_SIGNING to false, allowing unsigned extensions to be installed
    regardless of the xpinstall.signatures.required about:config preference.

After patching:
    Open about:support and click "Clear startup cache" (top-right button) for the
    change to take effect, then restart Firefox.
"""

import zipfile
import os
import sys


def patch(path):
    with zipfile.ZipFile(path, 'r') as zin:
        temp_zip_path = f"{path}.new"
        with zipfile.ZipFile(temp_zip_path, 'w', compression=zipfile.ZIP_STORED) as zout:
            for item in zin.infolist():
                data = zin.read(item.filename)
                if item.filename == "modules/AppConstants.sys.mjs":
                    text = data.decode("utf-8")
                    text = text.replace("MOZ_REQUIRE_SIGNING: true", "MOZ_REQUIRE_SIGNING: false")
                    data = text.encode("utf-8")

                new_info = zipfile.ZipInfo(item.filename)
                new_info.date_time = item.date_time
                new_info.external_attr = item.external_attr
                zout.writestr(new_info, data)

        os.replace(f"{path}", f"{path}.old")
        os.replace(f"{path}.new", f"{path}")


if len(sys.argv) > 1:
    path = sys.argv[1]
else:
    print(f"Usage: python {sys.argv[0]} /path/to/omni.ja")
    exit()

if not path.endswith("/omni.ja"):
    print("\033[31mPlease specify omni.ja path!\033[0m")
    exit()

try:
    patch(path)
except PermissionError:
    print(
        "\033[31mYou do not have permission to write to the file.\n"
        "Please run with administrator (root) privileges.\033[0m"
    )
    exit()
except FileNotFoundError:
    print("\033[31mPlease specify omni.ja path!\033[0m")
    exit()

print(
    "\033[32mSuccessfully patched omni.ja!\n"
    "You may need to open about:support and remove the startup cache "
    "for the patch to take effect.\033[0m"
)
