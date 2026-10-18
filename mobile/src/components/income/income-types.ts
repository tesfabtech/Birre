
export type IncomeType = 'REGULAR' | 'OCCASIONAL';

export type MoneySource = {
  id: string;
  name: string;
  type: string;
  defaultAmount: string | number | null;
  frequency: string | null;
  isActive: boolean;
};

export type CreatedIncome = {
  id: string;
  amount: string | number;
  type: IncomeType;
  allocations: {
    amount: string | number;
    percentage: string | number | null;
    bucket: {
      name: string;
    };
  }[];
};

export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function formatAmount(
  value: string | number | null,
): string {
  if (value === null || value === '') {
    return '';
  }

  return String(value);
}

export function isValidReceivedDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00Z`);

  return (
    !Number.isNaN(parsedDate.getTime()) &&
    parsedDate.toISOString().slice(0, 10) === value
  );
}

export function formatAllocationSummary(
  allocations: CreatedIncome['allocations'],
): string {
  if (allocations.length === 0) {
    return 'Income recorded successfully.';
  }

  return allocations
    .map(allocation => {
      const value = Number(allocation.amount).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

      return `${allocation.bucket.name}: ${value} ETB`;
    })
    .join('\n');
}
