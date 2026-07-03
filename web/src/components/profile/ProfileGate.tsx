import { useEffect, useState } from "react";

import { PinPad } from "@/components/profile/PinPad";
import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { ProfilePicker } from "@/components/profile/ProfilePicker";
import { useProfileStore, type Profile } from "@/stores/profile";

type Stage = "picker" | "pin";

export function ProfileGate() {
  const activeProfileId = useProfileStore((s) => s.activeProfileId);
  const unlock = useProfileStore((s) => s.unlock);

  const [stage, setStage] = useState<Stage>("picker");
  const [target, setTarget] = useState<Profile | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (activeProfileId) {
      setStage("picker");
      setTarget(null);
      setError(false);
    }
  }, [activeProfileId]);

  if (activeProfileId) return null;

  function pick(profile: Profile) {
    setTarget(profile);
    setStage("pin");
    setError(false);
  }

  function backToPicker() {
    setStage("picker");
    setTarget(null);
    setError(false);
  }

  function submit(pin: string) {
    if (!target) return;
    setBusy(true);
    const ok = unlock(target.id, pin);
    if (!ok) {
      setError(true);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Profile selection"
    >
      {stage === "picker" ? (
        // eslint-disable-next-line react/jsx-no-bind
        <ProfilePicker onSelect={pick} />
      ) : target ? (
        <div className="flex flex-col items-center gap-8 text-center text-white">
          <ProfileAvatar color={target.color} size={96} />
          <div>
            <h2 className="text-2xl sm:text-3xl font-medium">
              {target.name}
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Enter your PIN to continue
            </p>
          </div>
          <PinPad
            // eslint-disable-next-line react/jsx-no-bind
            onComplete={submit}
            // eslint-disable-next-line react/jsx-no-bind
            onCancel={backToPicker}
            error={error}
            disabled={busy}
          />
          {error ? (
            <p className="text-sm text-red-400" role="alert">
              Wrong PIN. Try again.
            </p>
          ) : (
            <button
              type="button"
              onClick={backToPicker}
              className="text-sm text-white/60 hover:text-white underline underline-offset-4 transition-colors"
            >
              Not {target.name}?
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
