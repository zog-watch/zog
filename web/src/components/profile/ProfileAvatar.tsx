import classNames from "classnames";

export interface ProfileAvatarProps {
  color: string;
  size?: number;
  selected?: boolean;
  className?: string;
}

export function ProfileAvatar(props: ProfileAvatarProps) {
  const { color, size = 120, selected = false, className } = props;
  return (
    <div
      className={classNames(
        "relative flex items-center justify-center rounded-md transition-transform duration-150 ease-out",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: color,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        xmlns="http://www.w3.org/2000/svg"
        className="w-3/5 h-3/5"
        aria-hidden="true"
      >
        <path
          d="M 25 15 L 40 15 L 60 60 L 60 15 L 75 15 L 75 85 L 60 85 L 40 40 L 40 85 L 25 85 Z"
          fill="white"
        />
      </svg>
      {selected ? (
        <div
          className="absolute inset-0 rounded-md ring-4 ring-white pointer-events-none"
          aria-hidden="true"
        />
      ) : null}
    </div>
  );
}
