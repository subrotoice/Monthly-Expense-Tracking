'use client';

import React, { use } from 'react';
import ShoppingSessionForm from '@/components/ShoppingSessionForm';

export default function EditSessionPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  return <ShoppingSessionForm sessionId={resolvedParams.id} />;
}
