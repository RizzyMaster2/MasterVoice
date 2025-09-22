'use client';

import { useState, useEffect } from 'react';

export function CurrentYear() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  if (year === null) {
    // Return a placeholder or null to prevent hydration mismatch
    return <>{new Date().getFullYear()}</>; 
  }

  return <>{year}</>;
}
