import React from "react";

interface TwitterProps {
  size: number;
}

const Twitter: React.FC<TwitterProps> = ({ size }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M2.53254 3.33333L12.9827 17.3062L2.46655 28.6667H4.83331L14.0402 18.7204L21.4791 28.6667H29.5332L18.4951 13.9079L28.2835 3.33333H25.9167L17.4376 12.4937L10.5867 3.33333H2.53254ZM6.01304 5.07669H9.71315L26.0522 26.923H22.3521L6.01304 5.07669Z"
        fill="#FAFAFA"
      />
    </svg>
  );
};

export default Twitter;
