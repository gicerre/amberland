import { cn } from "@/lib/utils";

/* Due strati di stelle (posizioni fisse, tassellate via background-size):
   bianche e dorate, di dimensioni diverse, per un cielo dark-fantasy. */
const STARS_A =
  "radial-gradient(1px 1px at 20px 30px, rgba(255,255,255,0.85), transparent)," +
  "radial-gradient(1px 1px at 90px 120px, rgba(255,255,255,0.5), transparent)," +
  "radial-gradient(1.5px 1.5px at 160px 60px, rgba(232,201,121,0.7), transparent)," +
  "radial-gradient(1px 1px at 200px 150px, rgba(255,255,255,0.6), transparent)";

const STARS_B =
  "radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.55), transparent)," +
  "radial-gradient(1px 1px at 130px 40px, rgba(200,167,93,0.6), transparent)," +
  "radial-gradient(1px 1px at 230px 100px, rgba(255,255,255,0.45), transparent)";

const NEBULA =
  "radial-gradient(ellipse at 25% 15%, rgba(157,138,201,0.09), transparent 55%)," +
  "radial-gradient(ellipse at 80% 75%, rgba(212,175,55,0.06), transparent 50%)";

/**
 * Campo stellato decorativo con tenue nebulosa arcana e lieve scintillio
 * (riusa il keyframe `flicker`). Da posizionare in un contenitore `relative`,
 * dietro al contenuto. Tutto pointer-events-none.
 */
export function Starfield({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-0 overflow-hidden",
        className
      )}
    >
      {/* Nebulosa arcana tenue */}
      <div className="absolute inset-0" style={{ backgroundImage: NEBULA }} />
      {/* Strato stelle 1 */}
      <div
        className="absolute inset-0 animate-[flicker_6s_ease-in-out_infinite]"
        style={{ backgroundImage: STARS_A, backgroundSize: "220px 220px" }}
      />
      {/* Strato stelle 2 — più lento e sfasato */}
      <div
        className="absolute inset-0 animate-[flicker_9s_ease-in-out_infinite]"
        style={{ backgroundImage: STARS_B, backgroundSize: "280px 280px" }}
      />
    </div>
  );
}
