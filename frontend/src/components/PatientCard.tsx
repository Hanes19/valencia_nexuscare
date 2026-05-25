// frontend/src/components/PatientCard.tsx
import React from 'react';

interface PatientCardProps {
  name: string;
  priority: 'Critical' | 'Urgent' | 'Normal';
  time: string;
}

export default function PatientCard({ name, priority, time }: PatientCardProps) {
  // Color logic based on priority
  const priorityColors = {
    Critical: 'border-red-500 bg-red-50',
    Urgent: 'border-orange-500 bg-orange-50',
    Normal: 'border-blue-500 bg-blue-50',
  };

  return (
    <div className={`p-4 mb-3 border-l-4 rounded shadow-sm ${priorityColors[priority]}`}>
      <h3 className="font-semibold text-gray-800">{name}</h3>
      <div className="flex justify-between items-center mt-2">
        <span className="text-xs font-bold text-gray-600">{priority}</span>
        <span className="text-xs text-gray-400">{time}</span>
      </div>
    </div>
  );
}