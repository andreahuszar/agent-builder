'use client';

interface VendorStatusPillProps {
  active: boolean;
  verified: boolean;
}

export function VendorStatusPill({ active, verified }: VendorStatusPillProps) {
  // Determine the combined status
  const getStatus = () => {
    if (!active) {
      return {
        label: 'Inactive',
        className: 'bg-gray-100 text-gray-800',
      };
    }
    if (!verified) {
      return {
        label: 'Unverified',
        className: 'bg-yellow-100 text-yellow-800',
      };
    }
    return {
      label: 'Active',
      className: 'bg-green-100 text-green-800',
    };
  };

  const status = getStatus();

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${status.className}`}
      >
        {status.label}
      </span>
      {active && verified && (
        <span className="inline-flex rounded-full bg-purple-100 px-2 py-1 text-xs font-medium text-purple-800">
          Verified
        </span>
      )}
    </div>
  );
}