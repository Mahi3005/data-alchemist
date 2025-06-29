import { useState } from 'react';

export default function HelpTooltip({
  content,
  side = 'right',
}: {
  content: string;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  const [show, setShow] = useState(false);

  const position = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
  };

  return (
    <div className="relative inline-flex ml-2">
      <button
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        onFocus={() => setShow(true)}
        onBlur={() => setShow(false)}
        className="text-gray-400 hover:text-gray-500 focus:outline-none"
        aria-label="Help information"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </button>

      {show && (
        <div
          className={`absolute ${position[side]} z-10 w-48 p-2 text-xs text-white bg-gray-800 rounded shadow-lg`}
          role="tooltip"
        >
          {content}
          <div
            className={`absolute w-3 h-3 bg-gray-800 transform rotate-45 ${
              side === 'top'
                ? 'bottom-0 left-1/2 -mb-1.5 -translate-x-1/2'
                : side === 'right'
                ? 'left-0 top-1/2 -ml-1.5 -translate-y-1/2'
                : side === 'bottom'
                ? 'top-0 left-1/2 -mt-1.5 -translate-x-1/2'
                : 'right-0 top-1/2 -mr-1.5 -translate-y-1/2'
            }`}
          ></div>
        </div>
      )}
    </div>
  );
}
