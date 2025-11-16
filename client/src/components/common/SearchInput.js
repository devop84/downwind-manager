import React from 'react';

export function SearchInput({ value, onChange, placeholder }) {
  return (
    <div className="mb-4">
      <div className="relative max-w-md">
        <span className="material-icons absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">search</span>
        <input
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className="input-base pl-10"
        />
      </div>
    </div>
  );
}

