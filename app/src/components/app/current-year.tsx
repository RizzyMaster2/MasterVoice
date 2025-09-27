
'use client';

import { useState, useEffect } from 'react';

export function CurrentYear() {
  const [year, setYear] = useState(new Date().getFullYear());

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return <>{year}</>;
}
