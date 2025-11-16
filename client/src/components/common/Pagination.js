import React from 'react';

export function PaginationControls({ currentPage, totalPages, onPageChange }) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(1)}
          disabled={currentPage === 1}
          className="btn-pagination"
        >
          &lt;&lt; First
        </button>
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="btn-pagination"
        >
          &lt; Prev
        </button>
      </div>
      <span className="text-sm text-gray-600">
        Page {currentPage} / {totalPages}
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="btn-pagination"
        >
          Next &gt;
        </button>
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={currentPage === totalPages}
          className="btn-pagination"
        >
          Last &gt;&gt;
        </button>
      </div>
    </div>
  );
}

export function Pagination({ currentPage, totalPages, onPageChange, startIndex, endIndex, total, itemsPerPage, itemName }) {
  return (
    <>
      <div className="mb-4 text-sm text-gray-600">
        Showing {startIndex + 1}-{Math.min(endIndex, total)} of {total} {itemName} ({itemsPerPage} per page)
      </div>
      {totalPages > 1 && (
        <div className="mb-4">
          <PaginationControls 
            currentPage={currentPage} 
            totalPages={totalPages} 
            onPageChange={onPageChange} 
          />
        </div>
      )}
    </>
  );
}

