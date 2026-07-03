import { useState } from "react";

import { ProfileAvatar } from "@/components/profile/ProfileAvatar";
import { PROFILES, type Profile } from "@/stores/profile";

export interface ProfilePickerProps {
  onSelect(profile: Profile): void;
}

export function ProfilePicker(props: ProfilePickerProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-12 text-center text-white">
      <h1 className="text-3xl sm:text-4xl font-medium tracking-wide">
        Who's watching?
      </h1>

      <div className="flex flex-wrap items-start justify-center gap-8 sm:gap-12">
        {PROFILES.map((profile) => {
          const isHovered = hoveredId === profile.id;
          return (
            <button
              key={profile.id}
              type="button"
              onClick={() => props.onSelect(profile)}
              onMouseEnter={() => setHoveredId(profile.id)}
              onMouseLeave={() =>
                setHoveredId((cur) => (cur === profile.id ? null : cur))
              }
              onFocus={() => setHoveredId(profile.id)}
              onBlur={() =>
                setHoveredId((cur) => (cur === profile.id ? null : cur))
              }
              className="group flex w-28 sm:w-32 flex-col items-center gap-3 outline-none"
            >
              <div
                className={
                  "transition-transform duration-150 ease-out " +
                  (isHovered ? "scale-110" : "scale-100")
                }
              >
                <ProfileAvatar color={profile.color} size={120} />
              </div>
              <span
                className={
                  "text-base sm:text-lg transition-colors " +
                  (isHovered ? "text-white" : "text-white/70")
                }
              >
                {profile.name}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
