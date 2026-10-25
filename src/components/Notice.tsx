import { IconInfo } from "./Icons";

export function Notices({ notices, tone = "warn" }: { notices: string[]; tone?: "warn" | "info" }) {
  if (!notices.length) return null;
  return (
    <>
      {notices.map((n) => (
        <div key={n} className={`notice${tone === "info" ? " notice-info" : ""}`} role="note">
          <IconInfo size={18} />
          <p>{n}</p>
        </div>
      ))}
    </>
  );
}
