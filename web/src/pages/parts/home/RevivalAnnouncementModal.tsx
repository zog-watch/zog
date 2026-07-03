import { useCallback, useEffect, useState } from "react";
import { IconPatch } from "@/components/buttons/IconPatch";
import { Icons } from "@/components/Icon";
import { useModal } from "@/components/overlays/Modal";
import { OverlayPortal } from "@/components/overlays/OverlayDisplay";
import { Flare } from "@/components/utils/Flare";

const MODAL_ID = "rebrand-notice";

const REBRAND_VERSION = "zog-2026-06-08";
const STORAGE_KEY = "zog::rebrand-seen";

export function RevivalAnnouncementModal() {
  const modal = useModal(MODAL_ID);
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== REBRAND_VERSION) {
        setShouldShow(true);
      }
    } catch {
      
      setShouldShow(true);
    }
  }, []);

  useEffect(() => {
    if (shouldShow) modal.show();
  }, [shouldShow, modal]);

  const handleClose = useCallback(() => {
    try {
      localStorage.setItem(STORAGE_KEY, REBRAND_VERSION);
    } catch {
      // ignore
    }
    setShouldShow(false);
    modal.hide();
  }, [modal]);

  if (!shouldShow) return null;

  return (
    <OverlayPortal darken close={handleClose} show={modal.isShown}>
      <div className="flex absolute inset-0 items-center justify-center p-4 overflow-hidden">
        <div className="overflow-y-auto max-h-[85vh] pointer-events-auto">
          <Flare.Base className="group rounded-3xl bg-background-main transition-colors duration-300 focus:relative focus:z-10 w-full max-w-lg p-6 bg-mediaCard-hoverBackground bg-opacity-60 backdrop-filter backdrop-blur-lg shadow-lg">
            <div className="overflow-y-auto overflow-x-hidden max-h-[85vh]">
              <Flare.Light
                flareSize={300}
                cssColorVar="--colors-mediaCard-hoverAccent"
                backgroundClass="bg-modal-background duration-100"
                className="rounded-3xl bg-background-main group-hover:opacity-100"
              />
              <Flare.Child className="pointer-events-auto relative">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-white">
                    🚀 We have rebranded!
                  </h2>
                  <button
                    type="button"
                    className="text-type-secondary hover:text-white transition-transform hover:scale-95"
                    onClick={handleClose}
                  >
                    <IconPatch icon={Icons.X} />
                  </button>
                </div>
                <div className="space-y-4 text-base text-type-secondary">
                  <p className="text-white font-bold border-l-2 border-blue-400 pl-3">
                    Welcome to Zog
                  </p>
                  <p>
                    Your home for movies and shows is{" "}
                    <strong className="text-white">zog.watch</strong>. Update your bookmarks and
                    you are all set. Your data is all intact, just log in.
                  </p>
                  <a
                    href="https://zog.watch"
                    target="_blank"
                    rel="noreferrer"
                    className="block text-center bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-xl transition-colors"
                  >
                    📌 Visit zog.watch
                  </a>
                  <p className="text-sm text-type-secondary">
                    Enjoy streaming at zog.watch.
                  </p>
                  <button
                    type="button"
                    onClick={handleClose}
                    className="block w-full text-center bg-video-context-light/10 hover:bg-video-context-light/20 text-white py-2 px-4 rounded-xl transition-colors"
                  >
                    Got it, do not show this again
                  </button>
                </div>
              </Flare.Child>
            </div>
          </Flare.Base>
        </div>
      </div>
    </OverlayPortal>
  );
}
