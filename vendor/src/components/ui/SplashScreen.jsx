import { assets } from "../../assets/assets";

export default function SplashScreen({ fading }) {
  return (
    <div
      className={`fixed inset-0 z-[9999] bg-primary flex flex-col items-center justify-center transition-opacity duration-500 ${
        fading ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
    >
      <img
        src={assets.logo}
        alt="Damini"
        className="splash-zoom w-28 sm:w-40"
      />
    </div>
  );
}
