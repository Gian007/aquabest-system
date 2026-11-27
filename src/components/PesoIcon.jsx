// Philippine Peso (₱) SVG icon matching Feather (react-icons/fi) stroke geometry.
// Ensures no USD dollar sign icon appears anywhere in AquaBest.
export default function PesoIcon({ size = 17, className = '', ...props }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      <path d="M7 4v16" />
      <path d="M7 4h6a4.5 4.5 0 0 1 0 9H7" />
      <line x1="4" y1="7.5" x2="17.5" y2="7.5" />
      <line x1="4" y1="10.5" x2="17.5" y2="10.5" />
    </svg>
  );
}
