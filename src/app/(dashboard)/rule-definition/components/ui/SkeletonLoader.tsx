// components/SkeletonLoader.tsx
import React from 'react';

const SkeletonLoader = () => (
  <div className="max-w-6xl mx-auto px-4 py-8">
    {/* Header Skeleton */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
      <div>
        <div className="flex items-center gap-3 mb-3">
          <div className="bg-gray-200 rounded-lg w-10 h-10 animate-pulse"></div>
          <div className="h-8 bg-gray-200 rounded w-64 animate-pulse"></div>
        </div>
        <div className="h-4 bg-gray-200 rounded w-80 max-w-full animate-pulse"></div>
      </div>
      <div className="h-10 bg-gray-200 rounded-lg w-44 animate-pulse"></div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left Column */}
      <div className="space-y-6">
        {/* Rule Builder Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 rounded-full w-5 h-5 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-40 animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                <div className="h-10 bg-gray-200 rounded animate-pulse"></div>
              </div>
            ))}
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse mt-4"></div>
          </div>
        </div>

        {/* Natural Language Input Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 rounded-full w-5 h-5 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          
          <div className="space-y-4">
            <div className="h-24 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
        </div>

        {/* AI Rules Placeholder */}
        <div className="bg-gray-100 rounded-xl border border-gray-200 p-5 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="bg-gray-300 rounded-full w-5 h-5"></div>
            <div className="h-6 bg-gray-300 rounded w-40"></div>
          </div>
          <div className="h-32 bg-gray-300 rounded-lg"></div>
        </div>
      </div>

      {/* Right Column */}
      <div className="space-y-6">
        {/* Active Rules Card */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 rounded-full w-5 h-5 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="bg-gray-200 rounded w-6 h-6 animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-40 animate-pulse mb-2"></div>
                    <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                  </div>
                </div>
                <div className="bg-gray-200 rounded-full w-8 h-8 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Prioritization Panel */}
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="bg-gray-200 rounded-full w-5 h-5 animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-48 animate-pulse"></div>
          </div>
          
          <div className="space-y-5">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-between">
                  <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-10 animate-pulse"></div>
                </div>
                <div className="h-3 bg-gray-200 rounded-full animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>

    {/* Status Bar Skeleton */}
    <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap justify-between gap-3">
      <div className="flex items-center gap-2">
        <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-32 animate-pulse"></div>
      </div>
      <div className="flex gap-4">
        <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
        <div className="h-4 bg-gray-200 rounded w-28 animate-pulse"></div>
      </div>
    </div>
  </div>
);

export default SkeletonLoader;