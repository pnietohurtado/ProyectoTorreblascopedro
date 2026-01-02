const Button = ({ children, onClick, variant = "primary", className = "" }) => {
  const baseStyles = "px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 active:scale-95";

  const variants = {
    primary: "bg-[#7738B0] hover:bg-[#602c8c] text-white shadow-lg shadow-purple-900/40 border border-purple-400/20", // Updated to user requested color
    secondary: "bg-[#0f0f1b] hover:bg-[#1a1a2e] text-white border border-white/10", // Dark button for contrast on purple bg
    outline: "border border-white/20 text-white hover:bg-white/5"
  };

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${variants[variant] || variants.primary} ${className}`}
    >
      {children}
    </button>
  );
};

export default Button;